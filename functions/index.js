const { onRequest } = require("firebase-functions/v2/https");
const { GoogleGenAI } = require("@google/genai");

const PROMPT_INSTRUCTION =
  "You are an expert in digital accessibility and WCAG standards. Write a concise, objective, and descriptive alt text for this image. Focus on the core subject, action, context, and any legible text. Do not start with 'Image of' or 'Picture of'. Limit the response to 1 to 2 clear sentences.";

/**
 * Cloud Function fallback for alt text generation using Gemini 2.0 Flash.
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

    const { image, mimeType } = req.body || {};
    if (!image || !mimeType) {
      return res.status(400).json({
        error: "Missing image data. Both 'image' (base64) and 'mimeType' are required.",
      });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: image,
                },
              },
              {
                text: PROMPT_INSTRUCTION,
              },
            ],
          },
        ],
      });

      const text = response?.text?.trim() || "";
      if (!text) {
        throw new Error("Empty response received from Gemini model.");
      }

      return res.status(200).json({ altText: text });
    } catch (error) {
      console.error("Gemini 2.0 Flash inference error:", error);
      return res.status(500).json({
        error: error.message || "Alt text inference failed on cloud fallback.",
      });
    }
  }
);
