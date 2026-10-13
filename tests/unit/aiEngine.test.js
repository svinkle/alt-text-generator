import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkAvailableEngine, generateAltText, fileToBase64, PROMPT_INSTRUCTION } from '../../src/utils/aiEngine';

describe('aiEngine', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    delete window.LanguageModel;
    delete window.ai;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('checkAvailableEngine', () => {
    it('returns cloud fallback when no LanguageModel is detected', async () => {
      const result = await checkAvailableEngine();
      expect(result.engine).toBe('cloud-fallback');
      expect(result.label).toContain('Cloud Edge');
    });

    it('returns on-device when LM.availability returns available', async () => {
      window.LanguageModel = {
        availability: vi.fn().mockResolvedValue('available'),
      };
      const result = await checkAvailableEngine();
      expect(result.engine).toBe('on-device');
      expect(result.label).toBe('On-Device (Gemini Nano)');
    });

    it('returns on-device when LM.availability returns readily', async () => {
      window.LanguageModel = {
        availability: vi.fn().mockResolvedValue('readily'),
      };
      const result = await checkAvailableEngine();
      expect(result.engine).toBe('on-device');
    });

    it('returns downloading state when LM.availability returns after-download', async () => {
      window.LanguageModel = {
        availability: vi.fn().mockResolvedValue('after-download'),
      };
      const result = await checkAvailableEngine();
      expect(result.engine).toBe('on-device');
      expect(result.label).toContain('Downloading Model');
    });

    it('supports LM.capabilities returning available', async () => {
      window.ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'available' }),
        },
      };
      const result = await checkAvailableEngine();
      expect(result.engine).toBe('on-device');
    });

    it('handles errors from availability check gracefully', async () => {
      window.LanguageModel = {
        availability: vi.fn().mockRejectedValue(new Error('LM check crash')),
      };
      const result = await checkAvailableEngine();
      expect(result.engine).toBe('cloud-fallback');
    });

    it('returns cloud fallback in non-browser environment', async () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;
      try {
        const result = await checkAvailableEngine();
        expect(result.engine).toBe('cloud-fallback');
        expect(result.details).toContain('Running in non-browser environment');
      } finally {
        global.window = originalWindow;
      }
    });
  });

  describe('fileToBase64', () => {
    it('converts a blob to base64 string', async () => {
      const blob = new Blob(['hello world'], { type: 'text/plain' });
      const base64 = await fileToBase64(blob);
      expect(typeof base64).toBe('string');
      expect(base64.length).toBeGreaterThan(0);
    });

    it('rejects on FileReader error', async () => {
      const originalFileReader = global.FileReader;
      global.FileReader = class MockFileReader {
        readAsDataURL() {
          setTimeout(() => {
            if (this.onerror) this.onerror(new Error('Read error'));
          }, 0);
        }
      };

      await expect(fileToBase64(new Blob(['test']))).rejects.toThrow();
      global.FileReader = originalFileReader;
    });

    it('rejects when reader result is not a string', async () => {
      const originalFileReader = global.FileReader;
      global.FileReader = class MockFileReader {
        readAsDataURL() {
          this.result = null;
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      };

      await expect(fileToBase64(new Blob(['test']))).rejects.toThrow('Unable to parse file into base64 string.');
      global.FileReader = originalFileReader;
    });
  });

  describe('generateAltText', () => {
    it('throws when no image data or URL is provided', async () => {
      await expect(generateAltText({})).rejects.toThrow('No image data or URL provided for inference.');
    });

    it('uses on-device LanguageModel via availability() when available', async () => {
      const promptMock = vi.fn().mockResolvedValue('"A photo of a mountain summit with morning sky."');
      window.LanguageModel = {
        availability: vi.fn().mockResolvedValue('available'),
        create: vi.fn().mockResolvedValue({
          prompt: promptMock,
        }),
      };
      global.createImageBitmap = vi.fn().mockResolvedValue({});

      const file = new File(['dummy'], 'mountain.jpg', { type: 'image/jpeg' });
      const result = await generateAltText(file);

      expect(result.engine).toBe('on-device');
      expect(result.text).toBe('A photo of a mountain summit with morning sky.');
    });

    it('uses on-device LanguageModel via capabilities() when available', async () => {
      const promptMock = vi.fn().mockResolvedValue('A collaborative team in a conference room.');
      window.ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn().mockResolvedValue({
            prompt: promptMock,
          }),
        },
      };
      global.createImageBitmap = vi.fn().mockResolvedValue({});

      const file = new File(['dummy'], 'team.jpg', { type: 'image/jpeg' });
      const result = await generateAltText(file);

      expect(result.engine).toBe('on-device');
      expect(result.text).toBe('A collaborative team in a conference room.');
    });

    it('falls back to cloud when session.prompt returns empty string', async () => {
      window.LanguageModel = {
        availability: vi.fn().mockResolvedValue('available'),
        create: vi.fn().mockResolvedValue({
          prompt: vi.fn().mockResolvedValue('   '),
        }),
      };
      global.createImageBitmap = vi.fn().mockResolvedValue({});

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ altText: 'Cloud generated alt text.' }),
      });

      const file = new File(['dummy'], 'sample.jpg', { type: 'image/jpeg' });
      const result = await generateAltText(file);

      expect(result.engine).toBe('cloud-fallback');
      expect(result.text).toBe('Cloud generated alt text.');
    });

    it('falls back to cloud API when on-device inference fails', async () => {
      window.LanguageModel = {
        availability: vi.fn().mockResolvedValue('available'),
        create: vi.fn().mockRejectedValue(new Error('Model execution failed')),
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ altText: 'Cloud generated alt text.' }),
      });

      const file = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
      const result = await generateAltText(file);

      expect(result.engine).toBe('cloud-fallback');
      expect(result.text).toBe('Cloud generated alt text.');
    });

    it('handles demo mountain image when server returns API key error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({ error: 'Gemini API key is required' }),
      });

      const result = await generateAltText({
        name: 'mountain-sunrise.png',
        url: 'https://burst.shopifycdn.com/photos/hiker-looks-out-over-view-from-mountain-summit.jpg',
      });

      expect(result.engine).toBe('cloud-fallback');
      expect(result.text).toContain('hiker carrying a backpack');
    });

    it('handles demo team image when server returns API key error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({ error: 'Gemini API key is required' }),
      });

      const result = await generateAltText({
        name: 'team-collaboration.png',
        url: 'https://burst.shopifycdn.com/photos/business-team-meeting-boardroom.jpg',
      });

      expect(result.engine).toBe('cloud-fallback');
      expect(result.text).toContain('conference table');
    });

    it('handles non-JSON server error response gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: vi.fn().mockRejectedValue(new Error('Bad gateway HTML')),
      });

      await expect(
        generateAltText({ name: 'custom.jpg', url: 'https://example.com/custom.jpg' })
      ).rejects.toThrow('Server returned status 502');
    });

    it('throws error for non-demo image when API returns error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ error: 'Internal Server Error' }),
      });

      await expect(
        generateAltText({ name: 'custom.jpg', url: 'https://example.com/custom.jpg' })
      ).rejects.toThrow('Internal Server Error');
    });

    it('fetches image URL into blob when possible', async () => {
      const mockBlob = new Blob(['mock image data'], { type: 'image/png' });
      global.fetch = vi.fn()
        // 1st call: fetch imageUrl
        .mockResolvedValueOnce({
          ok: true,
          blob: vi.fn().mockResolvedValue(mockBlob),
        })
        // 2nd call: /api/generate-alt
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ altText: '`Backtick cleaned text`' }),
        });

      const result = await generateAltText('https://example.com/image.png');
      expect(result.text).toBe('Backtick cleaned text');
    });

    it('supports direct Gemini API call when localStorage key is present and server fails', async () => {
      localStorage.setItem('gemini_api_key', 'AIzaSyTest123');

      global.fetch = vi.fn()
        // /api/generate-alt call fails
        .mockRejectedValueOnce(new Error('Network error'))
        // direct gemini call succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            candidates: [{ content: { parts: [{ text: 'Direct AI Studio response' }] } }],
          }),
        });

      const file = new File(['dummy'], 'custom.jpg', { type: 'image/jpeg' });
      const result = await generateAltText(file);

      expect(result.text).toBe('Direct AI Studio response');
      expect(result.engine).toBe('cloud-fallback');
    });

    it('handles direct Gemini API 404 fallback to gemini-flash-latest', async () => {
      localStorage.setItem('gemini_api_key', 'AIzaSyTest123');

      global.fetch = vi.fn()
        // /api/generate-alt fails
        .mockRejectedValueOnce(new Error('Server down'))
        // 1st direct call returns 404
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        // 2nd direct call returns success with fallback model
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            candidates: [{ content: { parts: [{ text: 'Flash fallback direct response' }] } }],
          }),
        });

      const file = new File(['dummy'], 'custom.jpg', { type: 'image/jpeg' });
      const result = await generateAltText(file);
      expect(result.text).toBe('Flash fallback direct response');
    });

    it('handles direct Gemini API missing candidates error and throws error from caller', async () => {
      localStorage.setItem('gemini_api_key', 'AIzaSyTest123');

      global.fetch = vi.fn()
        // /api/generate-alt fails
        .mockRejectedValueOnce(new Error('Server down'))
        // direct call returns empty candidates
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ candidates: [] }),
        });

      const file = new File(['dummy'], 'custom.jpg', { type: 'image/jpeg' });
      await expect(generateAltText(file)).rejects.toThrow('Server down');
    });

    it('handles direct Gemini error response and throws when non-demo', async () => {
      localStorage.setItem('gemini_api_key', 'AIzaSyTest123');

      global.fetch = vi.fn()
        // /api/generate-alt fails
        .mockRejectedValueOnce(new Error('Server down'))
        // direct call fails
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          json: vi.fn().mockResolvedValue({ error: { message: 'Quota exceeded' } }),
        });

      const file = new File(['dummy'], 'custom.jpg', { type: 'image/jpeg' });
      await expect(generateAltText(file)).rejects.toThrow();
    });

    it('handles direct Gemini API non-json error response and throws fallback error', async () => {
      localStorage.setItem('gemini_api_key', 'AIzaSyTest123');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      global.fetch = vi.fn()
        .mockRejectedValueOnce(new Error('Server down'))
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: vi.fn().mockRejectedValue(new Error('HTML 500 page')),
        });

      const file = new File(['dummy'], 'custom.jpg', { type: 'image/jpeg' });
      await expect(generateAltText(file)).rejects.toThrow('Server down');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Direct Gemini API call failed:',
        expect.objectContaining({ message: 'Google AI API error (500)' })
      );
    });

    it('falls back to demo descriptions on network failure without custom key', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

      const result = await generateAltText({ name: 'mountain.jpg', url: 'https://burst.shopifycdn.com/mountain.jpg' });
      expect(result.text).toContain('hiker carrying a backpack');

      const teamResult = await generateAltText({ name: 'team.jpg', url: 'https://burst.shopifycdn.com/team.jpg' });
      expect(teamResult.text).toContain('conference table');
    });

    it('falls back to demo description when server returns ok but empty altText for demo', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ altText: '' }),
      });

      const mountainResult = await generateAltText({
        name: 'mountain-sunrise.png',
        url: 'https://burst.shopifycdn.com/mountain.jpg',
      });
      expect(mountainResult.text).toContain('hiker carrying a backpack');

      const teamResult = await generateAltText({
        name: 'team-collaboration.png',
        url: 'https://burst.shopifycdn.com/team.jpg',
      });
      expect(teamResult.text).toContain('conference table');
    });

    it('throws helpful error when server returns empty altText and not a demo', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ altText: '' }),
      });

      const file = new File(['dummy'], 'random.jpg', { type: 'image/jpeg' });
      await expect(generateAltText(file)).rejects.toThrow('Failed to generate alt text from fallback service');
    });
  });
});
