import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import FileDropzone from '../../src/components/FileDropzone';

describe('FileDropzone', () => {
  const defaultProps = {
    selectedFile: null,
    previewUrl: null,
    onFileSelect: vi.fn(),
    onUrlSubmit: vi.fn(),
    onLoadSample: vi.fn(),
    onFileRemove: vi.fn(),
    onSubmit: vi.fn(),
    isLoading: false,
    statusMessage: 'Ready for image',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders tab options with roving tabindex, hidden file input removed from tab order, and initial upload dropzone', () => {
    render(<FileDropzone {...defaultProps} />);

    const uploadTab = screen.getByRole('tab', { name: /Upload File/i });
    const urlTab = screen.getByRole('tab', { name: /Image URL/i });
    const demoTab = screen.getByRole('tab', { name: /Try Demo/i });

    expect(uploadTab).toHaveAttribute('tabIndex', '0');
    expect(urlTab).toHaveAttribute('tabIndex', '-1');
    expect(demoTab).toHaveAttribute('tabIndex', '-1');

    const hiddenFileInput = document.getElementById('image-file-input');
    expect(hiddenFileInput).toHaveAttribute('tabIndex', '-1');
    expect(hiddenFileInput).toHaveAttribute('aria-hidden', 'true');

    expect(screen.getByText('Drag & Drop Image Here')).toBeInTheDocument();
  });

  it('switches between tabs cleanly via click and supports ArrowRight, ArrowLeft, Home, and End keyboard navigation', () => {
    render(<FileDropzone {...defaultProps} />);

    const tablist = screen.getByRole('tablist', { name: 'Image source options' });
    const uploadTab = screen.getByRole('tab', { name: /Upload File/i });
    const urlTab = screen.getByRole('tab', { name: /Image URL/i });
    const demoTab = screen.getByRole('tab', { name: /Try Demo/i });

    // ArrowRight from Upload -> URL
    uploadTab.focus();
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(urlTab).toHaveAttribute('aria-selected', 'true');
    expect(urlTab).toHaveAttribute('tabIndex', '0');
    expect(uploadTab).toHaveAttribute('tabIndex', '-1');
    expect(document.activeElement).toBe(urlTab);

    // ArrowRight from URL -> Demo
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(demoTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(demoTab);

    // ArrowRight from Demo wraps around -> Upload
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(uploadTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(uploadTab);

    // ArrowLeft from Upload wraps around -> Demo
    fireEvent.keyDown(tablist, { key: 'ArrowLeft' });
    expect(demoTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(demoTab);

    // Home moves to first tab (Upload)
    fireEvent.keyDown(tablist, { key: 'Home' });
    expect(uploadTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(uploadTab);

    // End moves to last tab (Demo)
    fireEvent.keyDown(tablist, { key: 'End' });
    expect(demoTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(demoTab);

    // Unhandled key does not change tab
    fireEvent.keyDown(tablist, { key: 'Tab' });
    expect(demoTab).toHaveAttribute('aria-selected', 'true');

    // Switch via click to URL tab, Demo tab, and back to Upload tab
    fireEvent.click(urlTab);
    expect(screen.getByLabelText(/Enter Image URL/i)).toBeInTheDocument();

    fireEvent.click(demoTab);
    expect(screen.getByText('Try a Demo Image')).toBeInTheDocument();
    expect(screen.getByText('Mountain Sunrise')).toBeInTheDocument();
    expect(screen.getByText('Team Collaboration')).toBeInTheDocument();

    fireEvent.click(uploadTab);
    expect(screen.getByText('Drag & Drop Image Here')).toBeInTheDocument();
  });

  it('handles drag and drop interactions, inline accessible file validation errors, and file input triggers', () => {
    const onFileSelect = vi.fn();
    render(<FileDropzone {...defaultProps} onFileSelect={onFileSelect} />);

    const dropZone = screen.getByRole('button', { name: /Drag & Drop Image Here/i });
    expect(dropZone).toHaveAttribute('aria-describedby', 'file-upload-help');

    // Drag enter, over, leave
    fireEvent.dragEnter(dropZone);
    fireEvent.dragOver(dropZone);
    fireEvent.dragLeave(dropZone);

    // Drop unsupported file displays persistent inline role="alert" error instead of window.alert
    const txtFile = new File(['text'], 'test.txt', { type: 'text/plain' });
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [txtFile],
      },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Unsupported file format. Please upload a PNG, JPEG, or WebP image.'
    );
    expect(dropZone).toHaveAttribute('aria-describedby', 'file-upload-help file-upload-error');

    // Drop oversized file (> 10MB) displays persistent inline role="alert" error
    const largeFile = new File(['x'], 'huge.png', { type: 'image/png' });
    Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [largeFile],
      },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'File size exceeds the 10MB maximum limit. Please choose a smaller image.'
    );

    // Drop valid image clears inline error and calls onFileSelect
    const file = new File(['content'], 'test.png', { type: 'image/png' });
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onFileSelect).toHaveBeenCalledWith(file);

    // KeyDown Enter & Space triggers file input click
    fireEvent.keyDown(dropZone, { key: 'Enter' });
    fireEvent.keyDown(dropZone, { key: ' ' });

    // Other key ignored
    fireEvent.keyDown(dropZone, { key: 'Escape' });

    // Input change event
    const input = document.getElementById('image-file-input');
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFileSelect).toHaveBeenCalledTimes(2);
  });

  it('validates URL input on form submit and associates error and hint with input via aria-describedby and aria-invalid', () => {
    const onUrlSubmit = vi.fn();
    render(<FileDropzone {...defaultProps} onUrlSubmit={onUrlSubmit} />);

    // Switch to URL tab
    fireEvent.click(screen.getByRole('tab', { name: /Image URL/i }));
    const form = screen.getByLabelText(/Enter Image URL/i).closest('form');
    const input = screen.getByLabelText(/Enter Image URL/i);

    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(input).toHaveAttribute('aria-describedby', 'image-url-hint');

    // Submit empty
    fireEvent.submit(form);
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter an image URL.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'image-url-hint image-url-error');

    // Submit invalid URL
    fireEvent.change(input, { target: { value: 'not-a-valid-url' } });
    fireEvent.submit(form);
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid URL (including https://).');
    expect(input).toHaveAttribute('aria-invalid', 'true');

    // Submit disallowed protocol (javascript:)
    fireEvent.change(input, { target: { value: 'javascript:alert(1)' } });
    fireEvent.submit(form);
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid URL (including https://).');

    // Submit valid URL
    fireEvent.change(input, { target: { value: 'https://example.com/test.jpg' } });
    fireEvent.submit(form);
    expect(onUrlSubmit).toHaveBeenCalledWith('https://example.com/test.jpg');
    expect(screen.queryByText(/Please enter a valid URL/i)).not.toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(input).toHaveAttribute('aria-describedby', 'image-url-hint');
  });

  it('renders preview card in Upload tab when upload file is selected', () => {
    const selectedFile = {
      name: 'local-test.jpg',
      source: 'upload',
      size: 1024,
      type: 'image/jpeg',
    };

    render(
      <FileDropzone
        {...defaultProps}
        selectedFile={selectedFile}
        previewUrl="blob:local-preview"
      />
    );

    expect(screen.getByText('local-test.jpg')).toBeInTheDocument();
    expect(screen.getByText('1 KB')).toBeInTheDocument();
    expect(screen.getByText('Local File')).toBeInTheDocument();
  });

  it('renders preview card with Close button first in DOM order, followed by heading, followed by image preview', () => {
    const selectedFile = {
      name: 'local-test.jpg',
      size: 1024,
      type: 'image/jpeg',
    };

    render(
      <FileDropzone
        {...defaultProps}
        selectedFile={selectedFile}
        previewUrl="blob:local-preview"
      />
    );

    const closeBtn = screen.getByRole('button', { name: 'Remove selected image' });
    const heading = screen.getByRole('heading', { level: 3, name: 'local-test.jpg' });
    const img = screen.getByRole('img', { name: 'Preview of selected image local-test.jpg' });

    expect(closeBtn.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(heading.compareDocumentPosition(img) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders preview card in URL tab when URL image is selected', () => {
    const selectedFile = {
      name: 'web-test.jpg',
      source: 'url',
      isUrl: true,
      size: null,
      type: 'image/jpeg',
    };

    render(
      <FileDropzone
        {...defaultProps}
        selectedFile={selectedFile}
        previewUrl="https://example.com/web-test.jpg"
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: /Image URL/i }));
    expect(screen.getByText('web-test.jpg')).toBeInTheDocument();
    expect(screen.getByText('Web URL')).toBeInTheDocument();
    expect(screen.getByText('Web Image')).toBeInTheDocument();
  });

  it('renders demo preview inside demo panel when a demo image is loaded', () => {
    const onLoadSample = vi.fn();
    const onFileRemove = vi.fn();
    const onSubmit = vi.fn();

    const selectedFile = {
      name: 'mountain-sunrise.png',
      source: 'demo',
      isDemo: true,
      size: 1048576, // 1MB
      type: 'image/jpeg',
      attribution: {
        photographerName: 'Daniel Moroder',
        photographerUrl: 'https://burst.shopifycdn.com/daniel_moroder',
        sourceName: 'Burst',
        sourceUrl: 'https://burst.shopifycdn.com',
      },
    };

    render(
      <FileDropzone
        {...defaultProps}
        selectedFile={selectedFile}
        previewUrl="blob:preview"
        onLoadSample={onLoadSample}
        onFileRemove={onFileRemove}
        onSubmit={onSubmit}
      />
    );

    // Switch to Demo tab
    fireEvent.click(screen.getByRole('tab', { name: /Try Demo/i }));

    // Preview card rendered inside demo panel
    expect(screen.getByText('Daniel Moroder')).toBeInTheDocument();
    expect(screen.getByText('1 MB')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate Alt Text/i })).toBeInTheDocument();

    // Reload demo click
    const reloadBtn = screen.getByRole('button', { name: 'Load Mountain Sunrise demo image' });
    fireEvent.click(reloadBtn);
    expect(onLoadSample).toHaveBeenCalledWith('nature');

    // Load team demo click
    const teamBtn = screen.getByRole('button', { name: 'Load Team Collaboration demo image' });
    fireEvent.click(teamBtn);
    expect(onLoadSample).toHaveBeenCalledWith('team');

    // Remove file click (labeled Close for demo)
    const removeBtn = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(removeBtn);
    expect(onFileRemove).toHaveBeenCalled();

    // Submit click
    const generateBtn = screen.getByRole('button', { name: /Generate Alt Text/i });
    fireEvent.click(generateBtn);
    expect(onSubmit).toHaveBeenCalled();
  });

  it('restores focus to Mountain Sunrise demo launcher button when Close is clicked, and shifts focus to active tab when Change Image is clicked', () => {
    vi.useFakeTimers();
    const onFileRemove = vi.fn();
    const selectedFile = {
      name: 'hiker.jpg',
      source: 'demo',
      size: 1024,
      type: 'image/jpeg',
      attribution: { photographerName: 'Daniel Moroder', profileUrl: 'https://burst.shopify.com/@daniel_moroder' }
    };

    render(
      <FileDropzone
        {...defaultProps}
        selectedFile={selectedFile}
        previewUrl="blob:preview"
        onFileRemove={onFileRemove}
      />
    );

    // Switch to demo tab
    const demoTab = screen.getByRole('tab', { name: /Try Demo/i });
    fireEvent.click(demoTab);

    const natureBtn = screen.getByRole('button', { name: 'Load Mountain Sunrise demo image' });
    const closeBtn = screen.getByRole('button', { name: 'Close' });

    fireEvent.click(closeBtn);
    expect(onFileRemove).toHaveBeenCalled();

    act(() => {
      vi.runAllTimers();
    });
    expect(document.activeElement).toBe(natureBtn);

    // Test Change Image button shifts focus to the active tab
    const changeImgBtn = screen.getByRole('button', { name: 'Change Image' });
    fireEvent.click(changeImgBtn);

    act(() => {
      vi.runAllTimers();
    });
    expect(document.activeElement).toBe(demoTab);

    vi.useRealTimers();
  });

  it('shifts focus to Remove selected image button when local image is uploaded, and shifts focus to active tab on removal', () => {
    vi.useFakeTimers();
    const onFileRemove = vi.fn();
    const { rerender } = render(
      <FileDropzone
        {...defaultProps}
        selectedFile={null}
        previewUrl={null}
        onFileRemove={onFileRemove}
      />
    );

    const uploadTab = screen.getByRole('tab', { name: /Upload File/i });

    // Local file uploaded
    const localFile = {
      name: 'test-upload.jpg',
      size: 2048,
      type: 'image/jpeg',
    };

    rerender(
      <FileDropzone
        {...defaultProps}
        selectedFile={localFile}
        previewUrl="blob:test-upload"
        onFileRemove={onFileRemove}
      />
    );

    act(() => {
      vi.runAllTimers();
    });

    const removeBtn = screen.getByRole('button', { name: 'Remove selected image' });
    expect(document.activeElement).toBe(removeBtn);

    // Clicking Remove selected image shifts focus to the active tab
    fireEvent.click(removeBtn);
    expect(onFileRemove).toHaveBeenCalled();

    act(() => {
      vi.runAllTimers();
    });

    expect(document.activeElement).toBe(uploadTab);
    vi.useRealTimers();
  });

  it('restores focus to Team Collaboration demo launcher button when Close is clicked', () => {
    vi.useFakeTimers();
    const onFileRemove = vi.fn();
    const selectedFile = {
      name: 'boardroom.jpg',
      source: 'demo',
      size: 2048,
      type: 'image/jpeg',
      attribution: { photographerName: 'Matthew Henry', profileUrl: 'https://burst.shopify.com/@matthew_henry' }
    };

    render(
      <FileDropzone
        {...defaultProps}
        selectedFile={selectedFile}
        previewUrl="blob:preview"
        onFileRemove={onFileRemove}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: /Try Demo/i }));

    const teamBtn = screen.getByRole('button', { name: 'Load Team Collaboration demo image' });
    const closeBtn = screen.getByRole('button', { name: 'Close' });

    fireEvent.click(closeBtn);
    expect(onFileRemove).toHaveBeenCalled();

    act(() => {
      vi.runAllTimers();
    });
    expect(document.activeElement).toBe(teamBtn);

    vi.useRealTimers();
  });

  it('renders loading states when isLoading is true', () => {
    const selectedFile = {
      name: 'test.jpg',
      source: 'upload',
      size: 2048,
      type: 'image/jpeg',
    };

    render(
      <FileDropzone
        {...defaultProps}
        selectedFile={selectedFile}
        previewUrl="blob:preview"
        isLoading={true}
      />
    );

    expect(screen.getByText('Analyzing Image...')).toBeInTheDocument();
    expect(screen.getByText(/Applying WCAG digital accessibility standards/i)).toBeInTheDocument();
  });

  it('renders loading states on demo buttons when isLoading is true and demo is active', () => {
    const natureDemo = {
      name: 'mountain-sunrise.png',
      source: 'demo',
      attribution: { photographerName: 'Daniel Moroder' },
    };

    const { rerender } = render(
      <FileDropzone
        {...defaultProps}
        selectedFile={natureDemo}
        previewUrl="https://example.com/mountain.jpg"
        isLoading={true}
      />
    );

    // In demo tab:
    fireEvent.click(screen.getByRole('tab', { name: /Try Demo/i }));
    expect(screen.getByRole('button', { name: 'Load Mountain Sunrise demo image' })).toHaveTextContent('Loading...');

    // Now test team demo
    const teamDemo = {
      name: 'team-collaboration.png',
      source: 'demo',
      attribution: { photographerName: 'Matthew Henry' },
    };
    rerender(
      <FileDropzone
        {...defaultProps}
        selectedFile={teamDemo}
        previewUrl="https://example.com/team.jpg"
        isLoading={true}
      />
    );
    expect(screen.getByRole('button', { name: 'Load Team Collaboration demo image' })).toHaveTextContent('Loading...');
  });

  it('displays tab indicator dots when files are loaded in different sources', () => {
    const { rerender } = render(
      <FileDropzone
        {...defaultProps}
        selectedFile={{ name: 'local.png', source: 'upload' }}
        previewUrl="blob:local"
      />
    );
    expect(screen.getByTestId('file-loaded-indicator')).toBeInTheDocument();

    rerender(
      <FileDropzone
        {...defaultProps}
        selectedFile={{ name: 'web.png', source: 'url', isUrl: true }}
        previewUrl="https://example.com/web.png"
      />
    );
    expect(screen.getByTestId('url-loaded-indicator')).toBeInTheDocument();

    rerender(
      <FileDropzone
        {...defaultProps}
        selectedFile={{ name: 'demo.png', source: 'demo', isDemo: true }}
        previewUrl="https://example.com/demo.png"
      />
    );
    expect(screen.getByTestId('demo-loaded-indicator')).toBeInTheDocument();
  });

  it('sets dropzone tabIndex to -1 when isLoading is true and no file is selected', () => {
    render(<FileDropzone {...defaultProps} isLoading={true} />);
    const dropZone = screen.getByRole('button', { name: /Drag & Drop Image Here/i });
    expect(dropZone).toHaveAttribute('tabIndex', '-1');
  });

  it('ignores dragLeave when moving to a child element inside drop zone', () => {
    render(<FileDropzone {...defaultProps} />);
    const dropZone = screen.getByRole('button', { name: /Drag & Drop Image Here/i });
    fireEvent.dragEnter(dropZone);
    const child = dropZone.firstElementChild;
    const leaveEvent = new MouseEvent('dragleave', { bubbles: true, cancelable: true });
    Object.defineProperty(leaveEvent, 'relatedTarget', { value: child });
    fireEvent(dropZone, leaveEvent);
    expect(dropZone.className).toContain('bg-amber-100');
  });

  it('handles file input change with empty files array (cancelled dialog)', () => {
    const onFileSelect = vi.fn();
    render(<FileDropzone {...defaultProps} onFileSelect={onFileSelect} />);
    const input = document.getElementById('image-file-input');
    fireEvent.change(input, { target: { files: [] } });
    expect(onFileSelect).not.toHaveBeenCalled();
  });

  it('handles drop without files gracefully', () => {
    const onFileSelect = vi.fn();
    render(<FileDropzone {...defaultProps} onFileSelect={onFileSelect} />);
    const dropZone = screen.getByRole('button', { name: /Drag & Drop Image Here/i });
    fireEvent.drop(dropZone, { dataTransfer: { files: [] } });
    expect(onFileSelect).not.toHaveBeenCalled();
  });

  it('shifts focus to Close control on URL image load and restores focus to Load image button when Close is clicked', () => {
    vi.useFakeTimers();
    const onFileRemove = vi.fn();
    const { rerender } = render(<FileDropzone {...defaultProps} onFileRemove={onFileRemove} />);

    // Switch to URL tab and enter a URL
    fireEvent.click(screen.getByRole('tab', { name: /Image URL/i }));
    fireEvent.change(screen.getByLabelText(/Enter Image URL/i), {
      target: { value: 'https://example.com/photo.jpg' },
    });

    const urlFile = {
      name: 'photo.jpg',
      source: 'url',
      isUrl: true,
      type: 'image/jpeg',
      size: 1024,
    };

    // Simulate image loaded from URL
    rerender(
      <FileDropzone
        {...defaultProps}
        selectedFile={urlFile}
        previewUrl="https://example.com/photo.jpg"
        onFileRemove={onFileRemove}
      />
    );

    act(() => {
      vi.runAllTimers();
    });

    const closeBtn = screen.getByRole('button', { name: 'Close' });
    expect(document.activeElement).toBe(closeBtn);

    // Click Close button
    fireEvent.click(closeBtn);
    expect(onFileRemove).toHaveBeenCalled();

    // After removing, parent clears selectedFile
    rerender(
      <FileDropzone
        {...defaultProps}
        selectedFile={null}
        previewUrl={null}
        onFileRemove={onFileRemove}
      />
    );

    act(() => {
      vi.runAllTimers();
    });

    const loadBtn = screen.getByRole('button', { name: 'Load Image' });
    expect(document.activeElement).toBe(loadBtn);

    vi.useRealTimers();
  });

  it('renders Drag & Drop Image Here and Enter Image URL as h3 headings without title attributes', () => {
    const { rerender } = render(<FileDropzone {...defaultProps} />);

    // Verify Upload panel has h3 heading
    const uploadHeading = screen.getByRole('heading', { level: 3, name: 'Drag & Drop Image Here' });
    expect(uploadHeading).toBeInTheDocument();

    // Switch to URL panel and verify h3 heading
    fireEvent.click(screen.getByRole('tab', { name: /Image URL/i }));
    const urlHeading = screen.getByRole('heading', { level: 3, name: 'Enter Image URL' });
    expect(urlHeading).toBeInTheDocument();

    // Verify close button does not have title attribute
    rerender(
      <FileDropzone
        {...defaultProps}
        selectedFile={{ name: 'web.jpg', source: 'url', isUrl: true }}
        previewUrl="https://example.com/web.jpg"
      />
    );
    const closeBtn = screen.getByRole('button', { name: 'Close' });
    expect(closeBtn).not.toHaveAttribute('title');
  });

  it('clears live region announcement after 5 seconds', () => {
    vi.useFakeTimers();
    render(<FileDropzone {...defaultProps} statusMessage="Image uploaded successfully." />);

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveTextContent('Image uploaded successfully.');

    // Advance 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(liveRegion).toHaveTextContent('');
    vi.useRealTimers();
  });
});


