const { onRequest } = require("firebase-functions/v2/https");
const { GoogleGenAI } = require("@google/genai");

const PROMPT_INSTRUCTION =
  "You are an expert in digital accessibility and WCAG standards. Write a concise, objective, and descriptive alt text for this image. Focus on the core subject, action, context, and any legible text. Do not start with 'Image of' or 'Picture of'. Limit the response to 1 to 2 clear sentences.";

/**
 * Cloud Function fallback for alt text generation using Gemini 3.x Flash.
 * Invoked via /api/generate-alt rewrite or direct HTTPS call.
 */
exports.generateAlt = onRequest(
  {
    cors: true,
    maxInstances: 10,
    secrets: ["GEMINI_API_KEY"],
  },
  async (req, res) => {
    // Only accept POST requests
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method Not Allowed. Use POST." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY secret is not set in environment.");
      return res.status(500).json({
        error: "Server configuration error: GEMINI_API_KEY is not configured.",
      });
    }

    let imageBase64 = req.body?.image;
    let imageMimeType = req.body?.mimeType;

    // If an imageUrl is provided instead of base64 data, fetch the image server-side
    if (!imageBase64 && req.body?.imageUrl) {
      try {
        const imageRes = await fetch(req.body.imageUrl);
        if (!imageRes.ok) {
          return res.status(400).json({
            error: `Failed to fetch image from URL: ${imageRes.status} ${imageRes.statusText}`,
          });
        }
        const arrayBuffer = await imageRes.arrayBuffer();
        imageBase64 = Buffer.from(arrayBuffer).toString("base64");
        imageMimeType = imageRes.headers.get("content-type") || "image/jpeg";
      } catch (err) {
        return res.status(400).json({
          error: `Could not download image from provided URL: ${err.message}`,
        });
      }
    }

    if (!imageBase64 || !imageMimeType) {
      return res.status(400).json({
        error: "Missing image data. Provide either 'image' (base64) and 'mimeType', or a valid 'imageUrl'.",
      });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const preferredModel = process.env.GEMINI_MODEL || "gemini-3-flash";

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
        // Fallback to gemini-2.5-flash if 3.x model name differs in user project
        console.warn(`Inference with ${preferredModel} failed, trying fallback:`, primaryErr.message);
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
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
      console.error("Gemini 3.x Flash inference error:", error);
      return res.status(500).json({
        error: error.message || "Alt text inference failed on cloud fallback.",
      });
    }
  }
);
