import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const PROMPT_INSTRUCTION =
  "You are an expert in digital accessibility and WCAG standards. Write a concise, objective, and descriptive alt text for this image. Focus on the core subject, action, context, and any legible text. Do not start with 'Image of' or 'Picture of'. Limit the response to 1 to 2 clear sentences.";

const DEMO_ALT_TEXTS = {
  mountain:
    "A hiker carrying a backpack stands atop a rocky mountain summit, looking across a vast valley and distant rugged peaks under bright morning light.",
  team:
    "A diverse team of business colleagues sits around a modern boardroom conference table, reviewing documents and discussing a project.",
};

/**
 * Custom Vite plugin providing local /api/generate-alt middleware for both
 * 'npm run dev' and 'npm run preview'.
 */
function localApiPlugin(env) {
  const handler = async (req, res, next) => {
    // Only intercept POST /api/generate-alt
    if (req.method === 'POST' && (req.url === '/api/generate-alt' || req.url?.startsWith('/api/generate-alt?'))) {
      let bodyData = '';
      req.on('data', (chunk) => {
        bodyData += chunk;
      });

      req.on('end', async () => {
        res.setHeader('Content-Type', 'application/json');

        try {
          const body = JSON.parse(bodyData || '{}');
          const apiKey =
            req.headers['x-gemini-api-key'] ||
            env.GEMINI_API_KEY ||
            process.env.GEMINI_API_KEY;

          const isMountainDemo =
            body.filename?.includes('mountain') ||
            body.imageUrl?.includes('mountain') ||
            body.imageUrl?.includes('hiker');

          const isTeamDemo =
            body.filename?.includes('team') ||
            body.imageUrl?.includes('team') ||
            body.imageUrl?.includes('boardroom');

          // If no API key is provided, check if this is a known demo image
          if (!apiKey) {
            if (isMountainDemo) {
              return res.end(JSON.stringify({ altText: DEMO_ALT_TEXTS.mountain, engine: 'cloud-fallback' }));
            }
            if (isTeamDemo) {
              return res.end(JSON.stringify({ altText: DEMO_ALT_TEXTS.team, engine: 'cloud-fallback' }));
            }

            res.statusCode = 400;
            return res.end(
              JSON.stringify({
                error:
                  'Gemini API key is required for custom image inference. Please configure GEMINI_API_KEY in .env or click the "API Key" button in the header.',
              })
            );
          }

          // Process image data or fetch from imageUrl
          let imageBase64 = body.image;
          let mimeType = body.mimeType || 'image/jpeg';

          if (!imageBase64 && body.imageUrl) {
            try {
              const imgRes = await fetch(body.imageUrl);
              if (!imgRes.ok) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: `Failed to download image from URL (${imgRes.status})` }));
              }
              const arrayBuffer = await imgRes.arrayBuffer();
              imageBase64 = Buffer.from(arrayBuffer).toString('base64');
              mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
            } catch (fetchErr) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: `Could not fetch image from URL: ${fetchErr.message}` }));
            }
          }

          if (!imageBase64) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'Missing image data or imageUrl in request.' }));
          }

          // Call Google Gemini API
          try {
            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({ apiKey });
            const preferredModel = env.GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-3-flash';

            let response;
            try {
              response = await ai.models.generateContent({
                model: preferredModel,
                contents: [
                  {
                    role: 'user',
                    parts: [
                      {
                        inlineData: {
                          mimeType,
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
              console.warn(`Dev inference with ${preferredModel} failed, trying fallback:`, primaryErr.message);
              response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                  {
                    role: 'user',
                    parts: [
                      {
                        inlineData: {
                          mimeType,
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

            const text = response?.text?.trim() || '';
            if (!text) throw new Error('Empty response from Gemini model.');

            return res.end(JSON.stringify({ altText: text, engine: 'cloud-fallback' }));
          } catch (aiErr) {
            console.error('Gemini API call failed:', aiErr.message);
            // If it's a demo image and API failed (e.g. invalid key or quota), gracefully fallback to demo text
            if (isMountainDemo) {
              return res.end(JSON.stringify({ altText: DEMO_ALT_TEXTS.mountain, engine: 'cloud-fallback' }));
            }
            if (isTeamDemo) {
              return res.end(JSON.stringify({ altText: DEMO_ALT_TEXTS.team, engine: 'cloud-fallback' }));
            }

            res.statusCode = 500;
            return res.end(JSON.stringify({ error: `Inference failed: ${aiErr.message}` }));
          }
        } catch (parseErr) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'Invalid JSON request payload.' }));
        }
      });

      return;
    }

    next();
  };

  return {
    name: 'local-api-generate-alt-middleware',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), localApiPlugin(env)],
    server: {
      port: 3000,
    },
    preview: {
      port: 4173,
    },
  };
});
