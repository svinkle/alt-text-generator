import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { PROMPT_INSTRUCTION, DEMO_ALT_TEXTS } from './src/utils/aiEngine.js';

const MAX_BODY_BYTES = 15 * 1024 * 1024; // 15MB max JSON request payload
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB max binary image size
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Custom Vite plugin providing local /api/generate-alt middleware for both
 * 'npm run dev' and 'npm run preview'.
 */
function localApiPlugin(env) {
  const handler = async (req, res, next) => {
    // Only intercept POST /api/generate-alt
    if (req.method === 'POST' && (req.url === '/api/generate-alt' || req.url?.startsWith('/api/generate-alt?'))) {
      let bodyData = '';
      let bodyBytes = 0;
      let abortedForSize = false;

      req.on('data', (chunk) => {
        bodyBytes += chunk.length;
        if (bodyBytes > MAX_BODY_BYTES) {
          abortedForSize = true;
          res.statusCode = 413;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Request payload exceeds the 10MB image size limit.' }));
          req.destroy();
          return;
        }
        bodyData += chunk;
      });

      req.on('end', async () => {
        if (abortedForSize) return;
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
              const parsedUrl = new URL(body.imageUrl);
              if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'Only HTTP/HTTPS image URLs are allowed.' }));
              }
              const imgRes = await fetch(parsedUrl.toString(), {
                signal: AbortSignal.timeout(8000),
                redirect: 'error',
              });
              if (!imgRes.ok) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: `Failed to download image from URL (${imgRes.status})` }));
              }
              const detectedMime = (imgRes.headers.get('content-type') || 'image/jpeg').split(';')[0].trim().toLowerCase();
              if (!ALLOWED_MIME_TYPES.has(detectedMime)) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: `Unsupported image MIME type: ${detectedMime}` }));
              }
              const arrayBuffer = await imgRes.arrayBuffer();
              if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
                res.statusCode = 413;
                return res.end(JSON.stringify({ error: 'Remote image exceeds the 10MB limit.' }));
              }
              imageBase64 = Buffer.from(arrayBuffer).toString('base64');
              mimeType = detectedMime;
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
            const preferredModel = env.GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-3.8-flash';

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
                model: 'gemini-flash-latest',
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
