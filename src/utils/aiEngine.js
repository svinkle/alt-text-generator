export const PROMPT_INSTRUCTION =
  "You are an expert in digital accessibility and WCAG standards. Write a concise, objective, and descriptive alt text for this image. Focus on the core subject, action, context, and any legible text. Do not start with 'Image of' or 'Picture of'. Limit the response to 1 to 2 clear sentences.";

/**
 * Detects whether Chrome's built-in AI (Prompt API / Gemini Nano) is available locally.
 * Supports both window.LanguageModel and window.ai.languageModel, handling API variations.
 * @returns {Promise<{ engine: 'on-device' | 'cloud-fallback', label: string, details: string }>}
 */
export async function checkAvailableEngine() {
  if (typeof window === "undefined") {
    return {
      engine: "cloud-fallback",
      label: "Cloud Edge (Gemini Flash)",
      details: "Running in non-browser environment.",
    };
  }

  const LM = window.LanguageModel || window.ai?.languageModel;
  if (!LM) {
    return {
      engine: "cloud-fallback",
      label: "Cloud Edge (Gemini Flash)",
      details: "Chrome Prompt API not detected in this browser.",
    };
  }

  try {
    let status = null;
    if (typeof LM.availability === "function") {
      status = await LM.availability();
    } else if (typeof LM.capabilities === "function") {
      const caps = await LM.capabilities();
      status = caps.available;
    }

    if (status === "available" || status === "readily") {
      return {
        engine: "on-device",
        label: "On-Device (Gemini Nano)",
        details: "Chrome Built-in AI active with zero network latency.",
      };
    } else if (status === "after-download") {
      return {
        engine: "on-device",
        label: "On-Device (Downloading Model)",
        details: "Gemini Nano model is downloading locally.",
      };
    }
  } catch (err) {
    console.warn("Could not query on-device AI capabilities:", err);
  }

  return {
    engine: "cloud-fallback",
    label: "Cloud Edge (Gemini Flash)",
    details: "Using serverless Gemini 2.0 Flash fallback.",
  };
}

/**
 * Main inference router implementing progressive enhancement:
 * 1. Attempts On-Device inference via Chrome Built-in AI (Gemini Nano).
 * 2. Seamlessly falls back to Serverless Gemini 2.0 Flash (/api/generate-alt).
 *
 * @param {File} file - Selected image file
 * @returns {Promise<{ text: string, engine: 'on-device' | 'cloud-fallback' }>}
 */
export async function generateAltText(imageInput) {
  let file = imageInput instanceof File || imageInput instanceof Blob ? imageInput : imageInput?.file;
  const imageUrl = typeof imageInput === "string" ? imageInput : imageInput?.url;
  const filename = imageInput?.filename || imageInput?.name || (file ? file.name : "image.jpg");

  // If input is an imageUrl and we don't have a File/Blob yet, try fetching it as a Blob so we can use Tier 1 (On-Device AI)
  if (!file && imageUrl) {
    try {
      const response = await fetch(imageUrl);
      if (response.ok) {
        const blob = await response.blob();
        file = new File([blob], filename, { type: blob.type || "image/jpeg" });
      }
    } catch (err) {
      console.warn("Client-side direct fetch failed (possibly CORS restricted). Delegating to Cloud Fallback.", err);
    }
  }

  // Step 1: Check for Chrome Built-in AI Prompt API
  if (file) {
    const LM = window.LanguageModel || window.ai?.languageModel;
    if (typeof window !== "undefined" && LM) {
      try {
        let isAvailable = false;
        if (typeof LM.availability === "function") {
          const availability = await LM.availability();
          isAvailable = availability === "available" || availability === "readily";
        } else if (typeof LM.capabilities === "function") {
          const caps = await LM.capabilities();
          isAvailable = caps.available === "readily" || caps.available === "after-download";
        }

        if (isAvailable) {
          const session = await LM.create({
            expectedInputs: [{ type: "image" }],
          });

          const imageBitmap = await createImageBitmap(file);

          const response = await session.prompt([
            PROMPT_INSTRUCTION,
            { type: "image", content: imageBitmap },
          ]);

          if (response && response.trim()) {
            return { text: cleanAltResponse(response.trim()), engine: "on-device" };
          }
        }
      } catch (err) {
        console.warn("On-device AI failed or unsupported, falling back to API.", err);
      }
    }
  }

  // Step 2: Fallback to Serverless Endpoint
  let payload;
  if (file) {
    const base64Data = await fileToBase64(file);
    payload = {
      image: base64Data,
      mimeType: file.type || "image/jpeg",
      filename: filename,
    };
  } else if (imageUrl) {
    payload = {
      imageUrl: imageUrl,
      filename: filename,
    };
  } else {
    throw new Error("No image data or URL provided for inference.");
  }

  const res = await fetch("/api/generate-alt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Server returned error (${res.status}): Failed to generate alt text.`);
  }

  const data = await res.json();
  if (!data.altText) {
    throw new Error("No alt text returned from inference service.");
  }

  return { text: cleanAltResponse(data.altText), engine: "cloud-fallback" };
}

/**
 * Sanitizes alt text by removing unnecessary quotes or accidental prefixes.
 * @param {string} text
 * @returns {string}
 */
function cleanAltResponse(text) {
  let cleaned = text.trim();
  // Strip surrounding double quotes if present
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  // Strip markdown formatting if any was wrapped
  cleaned = cleaned.replace(/^`+|`+$/g, "").trim();
  return cleaned;
}

/**
 * Converts a File object into a base64 encoded data string without data URL prefix.
 * @param {File} file
 * @returns {Promise<string>}
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const base64 = result.split(",")[1];
        resolve(base64);
      } else {
        reject(new Error("Unable to parse file into base64 string."));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
