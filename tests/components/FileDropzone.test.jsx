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

  it('renders tab options and initial upload dropzone', () => {
    render(<FileDropzone {...defaultProps} />);

    expect(screen.getByRole('tab', { name: /Upload File/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Image URL/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Try Demo/i })).toBeInTheDocument();
    expect(screen.getByText('Drag & Drop Image Here')).toBeInTheDocument();
  });

  it('switches between tabs cleanly, including returning to Upload File tab', () => {
    render(<FileDropzone {...defaultProps} />);

    // Switch to URL tab
    fireEvent.click(screen.getByRole('tab', { name: /Image URL/i }));
    expect(screen.getByLabelText(/Enter Image URL/i)).toBeInTheDocument();

    // Switch to Demo tab
    fireEvent.click(screen.getByRole('tab', { name: /Try Demo/i }));
    expect(screen.getByText('Try a Demo Image')).toBeInTheDocument();
    expect(screen.getByText('Mountain Sunrise')).toBeInTheDocument();
    expect(screen.getByText('Team Collaboration')).toBeInTheDocument();

    // Switch back to Upload tab
    fireEvent.click(screen.getByRole('tab', { name: /Upload File/i }));
    expect(screen.getByText('Drag & Drop Image Here')).toBeInTheDocument();
  });

  it('handles drag and drop interactions and file input triggers', () => {
    const onFileSelect = vi.fn();
    render(<FileDropzone {...defaultProps} onFileSelect={onFileSelect} />);

    const dropZone = screen.getByRole('button', { name: /Upload image drop zone/i });

    // Drag enter, over, leave
    fireEvent.dragEnter(dropZone);
    fireEvent.dragOver(dropZone);
    fireEvent.dragLeave(dropZone);

    // Drop valid image
    const file = new File(['content'], 'test.png', { type: 'image/png' });
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });
    expect(onFileSelect).toHaveBeenCalledWith(file);

    // Drop unsupported file alerts
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const txtFile = new File(['text'], 'test.txt', { type: 'text/plain' });
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [txtFile],
      },
    });
    expect(alertMock).toHaveBeenCalledWith('Please drop a supported image file (PNG, JPEG, or WebP).');

    // Drop oversized file (> 10MB) alerts
    const largeFile = new File(['x'], 'huge.png', { type: 'image/png' });
    Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [largeFile],
      },
    });
    expect(alertMock).toHaveBeenCalledWith('File size exceeds the 10MB maximum limit.');

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

  it('validates URL input on form submit including protocol restriction', () => {
    const onUrlSubmit = vi.fn();
    render(<FileDropzone {...defaultProps} onUrlSubmit={onUrlSubmit} />);

    // Switch to URL tab
    fireEvent.click(screen.getByRole('tab', { name: /Image URL/i }));
    const form = screen.getByLabelText(/Enter Image URL/i).closest('form');
    const input = screen.getByLabelText(/Enter Image URL/i);

    // Submit empty
    fireEvent.submit(form);
    expect(screen.getByText('Please enter an image URL.')).toBeInTheDocument();

    // Submit invalid URL
    fireEvent.change(input, { target: { value: 'not-a-valid-url' } });
    fireEvent.submit(form);
    expect(screen.getByText('Please enter a valid URL (including https://).')).toBeInTheDocument();

    // Submit disallowed protocol (javascript:)
    fireEvent.change(input, { target: { value: 'javascript:alert(1)' } });
    fireEvent.submit(form);
    expect(screen.getByText('Please enter a valid URL (including https://).')).toBeInTheDocument();

    // Submit valid URL
    fireEvent.change(input, { target: { value: 'https://example.com/test.jpg' } });
    fireEvent.submit(form);
    expect(onUrlSubmit).toHaveBeenCalledWith('https://example.com/test.jpg');
    expect(screen.queryByText(/Please enter a valid URL/i)).not.toBeInTheDocument();
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

  it('restores focus to Mountain Sunrise demo launcher button when Close or Change Image is clicked', () => {
    vi.useFakeTimers();
    const onFileRemove = vi.fn();
    const selectedFile = {
      name: 'hiker.jpg',
      source: 'demo',
      size: 1024,
      type: 'image/jpeg',
      attribution: { photographerName: 'Daniel Moroder', profileUrl: 'https://burst.shopify.com/@daniel_moroder' }
    };

    const { rerender } = render(
      <FileDropzone
        {...defaultProps}
        selectedFile={selectedFile}
        previewUrl="blob:preview"
        onFileRemove={onFileRemove}
      />
    );

    // Switch to demo tab
    fireEvent.click(screen.getByRole('tab', { name: /Try Demo/i }));

    const natureBtn = screen.getByRole('button', { name: 'Load Mountain Sunrise demo image' });
    const closeBtn = screen.getByRole('button', { name: 'Close' });

    fireEvent.click(closeBtn);
    expect(onFileRemove).toHaveBeenCalled();

    act(() => {
      vi.runAllTimers();
    });
    expect(document.activeElement).toBe(natureBtn);

    // Test Change Image button as well
    const changeImgBtn = screen.getByRole('button', { name: 'Change Image' });
    fireEvent.click(changeImgBtn);

    act(() => {
      vi.runAllTimers();
    });
    expect(document.activeElement).toBe(natureBtn);

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
    expect(screen.getByTitle('File loaded')).toBeInTheDocument();

    rerender(
      <FileDropzone
        {...defaultProps}
        selectedFile={{ name: 'web.png', source: 'url', isUrl: true }}
        previewUrl="https://example.com/web.png"
      />
    );
    expect(screen.getByTitle('URL image loaded')).toBeInTheDocument();

    rerender(
      <FileDropzone
        {...defaultProps}
        selectedFile={{ name: 'demo.png', source: 'demo', isDemo: true }}
        previewUrl="https://example.com/demo.png"
      />
    );
    expect(screen.getByTitle('Demo loaded')).toBeInTheDocument();
  });

  it('sets dropzone tabIndex to -1 when isLoading is true and no file is selected', () => {
    render(<FileDropzone {...defaultProps} isLoading={true} />);
    const dropZone = screen.getByRole('button', { name: /Upload image drop zone/i });
    expect(dropZone).toHaveAttribute('tabIndex', '-1');
  });

  it('ignores dragLeave when moving to a child element inside drop zone', () => {
    render(<FileDropzone {...defaultProps} />);
    const dropZone = screen.getByRole('button', { name: /Upload image drop zone/i });
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
    const dropZone = screen.getByRole('button', { name: /Upload image drop zone/i });
    fireEvent.drop(dropZone, { dataTransfer: { files: [] } });
    expect(onFileSelect).not.toHaveBeenCalled();
  });
});
