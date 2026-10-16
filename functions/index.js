const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { GoogleGenAI } = require("@google/genai");
const dns = require("node:dns").promises;
const net = require("node:net");

const PROMPT_INSTRUCTION =
  "You are an expert in digital accessibility and WCAG standards. Write a concise, objective, and descriptive alt text for this image. Focus on the core subject, action, context, and any legible text. Do not start with 'Image of' or 'Picture of'. Limit the response to 1 to 2 clear sentences.";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB binary limit
const MAX_BASE64_LENGTH = Math.ceil((MAX_IMAGE_BYTES * 4) / 3); // ~13.98 MB base64 limit
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_ORIGINS = [
  "https://alt-text-generator-app.web.app",
  "https://alt-text-generator-app.firebaseapp.com",
  "https://alt-text-generator-9f352.web.app",
  "https://alt-text-generator-9f352.firebaseapp.com",
  /^http:\/\/localhost:\d+$/,
];

// Per-instance sliding window rate limiter (30 requests per minute per IP)
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const ipRequestMap = new Map();

function isRateLimited(clientIp) {
  const now = Date.now();
  const entry = ipRequestMap.get(clientIp);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    ipRequestMap.set(clientIp, { windowStart: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

function isPrivateIP(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  if (net.isIPv6(ip)) {
    const norm = ip.toLowerCase();
    return (
      norm === "::1" ||
      norm === "::" ||
      norm.startsWith("fc") ||
      norm.startsWith("fd") ||
      norm.startsWith("fe80") ||
      norm.startsWith("::ffff:127.") ||
      norm.startsWith("::ffff:10.") ||
      norm.startsWith("::ffff:192.168.") ||
      norm.startsWith("::ffff:169.254.")
    );
  }
  return true;
}

/**
 * Safely fetches a remote image URL with SSRF mitigations, timeout, MIME validation, and size cap.
 * @param {string} rawUrl
 * @returns {Promise<{ base64: string, mimeType: string }>}
 */
async function fetchSafeImage(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid imageUrl format.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Only HTTPS image URLs are allowed.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local")
  ) {
    throw new Error("Restricted image URL hostname.");
  }

  const records = await dns.lookup(hostname, { all: true });
  if (!records.length || records.some((r) => isPrivateIP(r.address))) {
    throw new Error("Image URL resolves to a restricted network address.");
  }

  const imageRes = await fetch(parsed.toString(), {
    signal: AbortSignal.timeout(8000),
    redirect: "error",
  });

  if (!imageRes.ok) {
    throw new Error(`Failed to fetch image from URL: HTTP ${imageRes.status}`);
  }

  const rawContentType = (imageRes.headers.get("content-type") || "image/jpeg")
    .split(";")[0]
    .trim()
    .toLowerCase();

  if (!ALLOWED_MIME_TYPES.has(rawContentType)) {
    throw new Error(
      `Unsupported image MIME type (${rawContentType}). Allowed types: JPEG, PNG, WebP.`
    );
  }

  const contentLength = Number(imageRes.headers.get("content-length") || 0);
  if (contentLength > MAX_IMAGE_BYTES) {
    throw new Error("Remote image exceeds the 10MB maximum size limit.");
  }

  const arrayBuffer = await imageRes.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Remote image exceeds the 10MB maximum size limit.");
  }

  return {
    base64: Buffer.from(arrayBuffer).toString("base64"),
    mimeType: rawContentType,
  };
}

/**
 * Cloud Function fallback for alt text generation using Gemini 3.x Flash.
 * Invoked via /api/generate-alt rewrite or direct HTTPS call.
 */
exports.generateAlt = onRequest(
  {
    cors: ALLOWED_ORIGINS,
    maxInstances: 10,
    timeoutSeconds: 30,
    memory: "256MiB",
    secrets: ["GEMINI_API_KEY"],
  },
  async (req, res) => {
    // Only accept POST requests
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method Not Allowed. Use POST." });
    }

    const clientIp =
      req.headers["fastly-client-ip"] ||
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.ip ||
      "unknown";

    if (isRateLimited(clientIp)) {
      return res.status(429).json({
        error: "Rate limit exceeded. Please wait a moment before trying again.",
      });
    }

    const apiKey = req.headers["x-gemini-api-key"] || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error("GEMINI_API_KEY secret is not set in environment.");
      return res.status(500).json({
        error: "Server configuration error: GEMINI_API_KEY is not configured.",
      });
    }

    let imageBase64 = typeof req.body?.image === "string" ? req.body.image : null;
    let imageMimeType = typeof req.body?.mimeType === "string" ? req.body.mimeType : null;

    if (imageBase64 && imageBase64.length > MAX_BASE64_LENGTH) {
      return res.status(413).json({
        error: "Image payload exceeds the 10MB maximum limit.",
      });
    }

    if (imageMimeType && !ALLOWED_MIME_TYPES.has(imageMimeType)) {
      return res.status(400).json({
        error: "Unsupported image format. Please provide JPEG, PNG, or WebP.",
      });
    }

    // If an imageUrl is provided instead of base64 data, fetch the image server-side safely
    if (!imageBase64 && typeof req.body?.imageUrl === "string") {
      try {
        const fetched = await fetchSafeImage(req.body.imageUrl);
        imageBase64 = fetched.base64;
        imageMimeType = fetched.mimeType;
      } catch (err) {
        logger.warn("Blocked or failed server-side imageUrl fetch:", {
          error: err.message,
        });
        return res.status(400).json({
          error: `Could not download image from provided URL: ${err.message}`,
        });
      }
    }

    if (!imageBase64 || !imageMimeType) {
      return res.status(400).json({
        error:
          "Missing image data. Provide either 'image' (base64) and 'mimeType', or a valid HTTPS 'imageUrl'.",
      });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const preferredModel = process.env.GEMINI_MODEL || "gemini-3.8-flash";

      let response;
      try {
        response = await ai.models.generateContent({
          model: preferredModel,
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: imageMimeType,
                    data: imageBase64,
                  },
                },
                {
                  text: PROMPT_INSTRUCTION,
                },
              ],
            },
          ],
        });
      } catch (primaryErr) {
        logger.warn(`Inference with ${preferredModel} failed, trying fallback:`, {
          message: primaryErr.message,
        });
        response = await ai.models.generateContent({
          model: "gemini-flash-latest",
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: imageMimeType,
                    data: imageBase64,
                  },
                },
                {
                  text: PROMPT_INSTRUCTION,
                },
              ],
            },
          ],
        });
      }

      const text = response?.text?.trim() || "";
      if (!text) {
        throw new Error("Empty response received from Gemini model.");
      }

      return res.status(200).json({ altText: text });
    } catch (error) {
      logger.error("Gemini 3.x Flash inference error:", {
        message: error.message,
      });
      return res.status(500).json({
        error: "Alt text inference failed on cloud fallback. Please try again later.",
      });
    }
  }
);
