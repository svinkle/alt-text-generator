import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App, { parseImageFilename, detectAttribution, PHOTO_ATTRIBUTIONS } from '../../src/App';
import * as aiEngine from '../../src/utils/aiEngine';

describe('App Component', () => {
  const originalFetch = global.fetch;
  const originalImage = global.Image;

  beforeEach(() => {
    vi.restoreAllMocks();
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.Image = originalImage;
  });

  it('renders Header, FileDropzone, Guidelines card, and Footer', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(screen.getByRole('heading', { level: 1, name: 'Alt Text Generator' })).toBeInTheDocument();
    expect(screen.getByText('WCAG Alt Text Standards Enforced')).toBeInTheDocument();
    expect(screen.getByText(/Made with/i)).toBeInTheDocument();
  });

  it('loads sample demo image and generates alt text successfully, allowing alt text editing', async () => {
    const mockBlob = new Blob(['image data'], { type: 'image/jpeg' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(mockBlob),
    });

    vi.spyOn(aiEngine, 'generateAltText').mockResolvedValue({
      text: 'A high altitude view of mountains.',
      engine: 'on-device',
    });

    await act(async () => {
      render(<App />);
    });

    // Go to Try Demo tab
    fireEvent.click(screen.getByRole('tab', { name: /Try Demo/i }));

    // Click Load Mountain Sunrise
    const loadBtn = screen.getByRole('button', { name: 'Load Mountain Sunrise demo image' });
    await act(async () => {
      fireEvent.click(loadBtn);
    });

    // Preview rendered
    expect(screen.getByText('Daniel Moroder')).toBeInTheDocument();

    // Click Generate Alt Text
    const generateBtn = screen.getByRole('button', { name: /Generate Alt Text/i });
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    // Output snippet rendered
    expect(screen.getByRole('heading', { level: 2, name: /Generated Alt Text & Snippets/i })).toBeInTheDocument();
    expect(screen.getByText('"A high altitude view of mountains."')).toBeInTheDocument();

    // Test onAltTextChange in OutputSnippet
    fireEvent.click(screen.getByRole('button', { name: 'Edit alt text' }));
    const textarea = screen.getByRole('textbox', { name: 'Edit alt text' });
    fireEvent.change(textarea, { target: { value: 'Updated alt text description.' } });
    expect(screen.getByDisplayValue('Updated alt text description.')).toBeInTheDocument();

    // Re-generate to exercise aborting previous controller, then remove image
    await act(async () => {
      fireEvent.click(generateBtn);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  });

  it('loads team demo image on successful fetch and generates alt text via cloud-fallback engine', async () => {
    const mockBlob = new Blob(['team image data'], { type: '' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(mockBlob),
    });

    vi.spyOn(aiEngine, 'generateAltText').mockResolvedValue({
      text: 'Business colleagues meeting in boardroom.',
      engine: 'cloud-fallback',
    });

    await act(async () => {
      render(<App />);
    });

    fireEvent.click(screen.getByRole('tab', { name: /Try Demo/i }));
    const loadBtn = screen.getByRole('button', { name: 'Load Team Collaboration demo image' });
    await act(async () => {
      fireEvent.click(loadBtn);
    });

    expect(screen.getByText('Matthew Henry')).toBeInTheDocument();

    const generateBtn = screen.getByRole('button', { name: /Generate Alt Text/i });
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    expect(screen.getByText('"Business colleagues meeting in boardroom."')).toBeInTheDocument();
    expect(screen.getByText('Engine: Cloud Edge (Gemini 3.x Flash)')).toBeInTheDocument();
  });

  it('handles demo image fetch failure by falling back to direct URL select', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await act(async () => {
      render(<App />);
    });

    fireEvent.click(screen.getByRole('tab', { name: /Try Demo/i }));
    const loadBtn = screen.getByRole('button', { name: 'Load Team Collaboration demo image' });

    await act(async () => {
      fireEvent.click(loadBtn);
    });

    expect(screen.getByText('Matthew Henry')).toBeInTheDocument();
  });

  it('handles inference error and allows dismissing error alert', async () => {
    const mockBlob = new Blob(['image data'], { type: 'image/jpeg' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(mockBlob),
    });

    vi.spyOn(aiEngine, 'generateAltText').mockRejectedValue(new Error('Inference quota exceeded'));

    await act(async () => {
      render(<App />);
    });

    fireEvent.click(screen.getByRole('tab', { name: /Try Demo/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Load Mountain Sunrise demo image' }));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Generate Alt Text/i }));
    });

    // Error alert displayed
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Inference Error' })).toBeInTheDocument();
    expect(screen.getByText('Inference quota exceeded')).toBeInTheDocument();

    // Verify DOM order: Dismiss button first, then h2 heading, followed by rest of content
    expect(alert.children[0]).toBe(screen.getByRole('button', { name: 'Dismiss' }));
    expect(alert.children[1]).toBe(screen.getByRole('heading', { level: 2, name: 'Inference Error' }));

    // Dismiss alert and verify focus restores to currently selected tab
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('handles inference error without message property by using fallback error text', async () => {
    vi.spyOn(aiEngine, 'generateAltText').mockRejectedValue({});
    await act(async () => {
      render(<App />);
    });
    const file = new File(['1'], 'img.png', { type: 'image/png' });
    const dropZone = screen.getByRole('button', { name: /Drag & Drop Image Here/i });
    await act(async () => {
      fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
    });
    const generateBtn = screen.getByRole('button', { name: /Generate Alt Text/i });
    await act(async () => {
      fireEvent.click(generateBtn);
    });
    expect(screen.getByText('Inference failed. Please check your network connection or API settings.')).toBeInTheDocument();
  });

  it('handles image removal via Change Image or Remove button', async () => {
    const mockBlob = new Blob(['image data'], { type: 'image/jpeg' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(mockBlob),
    });

    await act(async () => {
      render(<App />);
    });

    fireEvent.click(screen.getByRole('tab', { name: /Try Demo/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Load Mountain Sunrise demo image' }));
    });

    expect(screen.getByText('Daniel Moroder')).toBeInTheDocument();

    // Remove
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Daniel Moroder')).not.toBeInTheDocument();
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('handles URL submission with direct fetch success and attribution matching', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(['data'], { type: 'image/png' })),
    });

    await act(async () => {
      render(<App />);
    });

    fireEvent.click(screen.getByRole('tab', { name: /Image URL/i }));
    const input = screen.getByLabelText(/Enter Image URL/i);
    const form = input.closest('form');

    // Test boardroom URL for team attribution
    fireEvent.change(input, { target: { value: 'https://burst.shopifycdn.com/photos/business-team-meeting-boardroom.jpg' } });
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(screen.getByText('business-team-meeting-boardroom.jpg')).toBeInTheDocument();
    expect(screen.getByText('Matthew Henry')).toBeInTheDocument();
  });

  it('handles URL submission with invalid URL format', async () => {
    await act(async () => {
      render(<App />);
    });

    fireEvent.click(screen.getByRole('tab', { name: /Image URL/i }));
    const input = screen.getByLabelText(/Enter Image URL/i);
    const form = input.closest('form');

    fireEvent.change(input, { target: { value: 'not-a-valid-url' } });
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(screen.getByText('Please enter a valid URL (including https://).')).toBeInTheDocument();
  });

  it('handles URL fallback via Image object onload and onerror', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('CORS error'));

    // Mock Image object to simulate onload
    let imageInstances = [];
    global.Image = class MockImage {
      constructor() {
        this.onload = null;
        this.onerror = null;
        imageInstances.push(this);
      }
      set src(value) {
        this._src = value;
      }
      get src() {
        return this._src;
      }
    };

    await act(async () => {
      render(<App />);
    });

    fireEvent.click(screen.getByRole('tab', { name: /Image URL/i }));
    const input = screen.getByLabelText(/Enter Image URL/i);
    const form = input.closest('form');

    // Test onload fallback with hiker attribution
    fireEvent.change(input, { target: { value: 'https://burst.shopifycdn.com/photos/hiker-looks-out-over-view-from-mountain-summit.jpg' } });
    await act(async () => {
      fireEvent.submit(form);
    });

    const firstImg = imageInstances[imageInstances.length - 1];
    expect(firstImg).toBeDefined();
    await act(async () => {
      firstImg.onload();
    });

    expect(screen.getByText('Daniel Moroder')).toBeInTheDocument();

    // Test onerror fallback
    fireEvent.change(input, { target: { value: 'https://example.com/broken-image.jpg' } });
    await act(async () => {
      fireEvent.submit(form);
    });

    const secondImg = imageInstances[imageInstances.length - 1];
    await act(async () => {
      secondImg.onerror();
    });

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText(/Unable to load image from the provided URL/i)).toBeInTheDocument();

    // Verify h2 heading and DOM order
    const heading = screen.getByRole('heading', { level: 2, name: 'Inference Error' });
    expect(heading).toBeInTheDocument();
    const dismissBtn = screen.getByRole('button', { name: 'Dismiss' });
    expect(alert.children[0]).toBe(dismissBtn);
    expect(alert.children[1]).toBe(heading);

    // Verify focus shifted to Dismiss button after error
    expect(document.activeElement).toBe(dismissBtn);

    // Verify clicking Dismiss shifts focus back to currently selected Tab
    await act(async () => {
      fireEvent.click(dismissBtn);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    const urlTab = screen.getByRole('tab', { name: /Image URL/i });
    expect(document.activeElement).toBe(urlTab);
  });

  it('handles standard local file upload in upload tab', async () => {
    await act(async () => {
      render(<App />);
    });

    const file = new File(['content'], 'upload-sample.png', { type: 'image/png' });
    const dropZone = screen.getByRole('button', { name: /Drag & Drop Image Here/i });

    await act(async () => {
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      });
    });

    expect(screen.getByText('upload-sample.png')).toBeInTheDocument();
    expect(screen.getByText('Local File')).toBeInTheDocument();
  });

  it('revokes previous object URL when selecting a replacement file or URL', async () => {
    await act(async () => {
      render(<App />);
    });

    const file1 = new File(['1'], 'first.png', { type: 'image/png' });
    const file2 = new File(['2'], 'second.png', { type: 'image/png' });
    const dropZone = screen.getByRole('button', { name: /Drag & Drop Image Here/i });

    // First upload
    await act(async () => {
      fireEvent.drop(dropZone, { dataTransfer: { files: [file1] } });
    });

    // Second upload (triggers handleFileSelect with existing blob: URL)
    const fileInput = document.getElementById('image-file-input');
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file2] } });
    });
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();

    // Now select via demo with fetch failure (triggers handleUrlSelect with existing blob: URL)
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));
    fireEvent.click(screen.getByRole('tab', { name: /Try Demo/i }));
    const loadBtn = screen.getByRole('button', { name: 'Load Mountain Sunrise demo image' });
    await act(async () => {
      fireEvent.click(loadBtn);
    });
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  describe('URL helper utilities', () => {
    it('parses filenames correctly across various URL formats and fallbacks', () => {
      expect(parseImageFilename('https://example.com/images/hero-landscape.png')).toBe('hero-landscape.png');
      expect(parseImageFilename('https://example.com/path/to/photo.jpg?size=large')).toBe('photo.jpg');
      expect(parseImageFilename('https://example.com/')).toBe('web-image.jpg');
      expect(parseImageFilename('not-a-valid-url')).toBe('web-image.jpg');
    });

    it('detects demo image attributions correctly', () => {
      expect(detectAttribution('https://example.com/mountain-peak.jpg')).toEqual(PHOTO_ATTRIBUTIONS.nature);
      expect(detectAttribution('https://example.com/hiker-backpack.png')).toEqual(PHOTO_ATTRIBUTIONS.nature);
      expect(detectAttribution('https://example.com/business-team-meeting.jpg')).toEqual(PHOTO_ATTRIBUTIONS.team);
      expect(detectAttribution('https://example.com/boardroom-table.jpg')).toEqual(PHOTO_ATTRIBUTIONS.team);
      expect(detectAttribution('https://example.com/random-cat.jpg')).toBeNull();
      expect(detectAttribution(null)).toBeNull();
    });
  });
});
