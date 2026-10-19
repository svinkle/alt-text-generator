import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import OutputSnippet from '../../src/components/OutputSnippet';
import * as clipboardModule from '../../src/utils/copyToClipboard';

describe('OutputSnippet', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders title, snippets, and fallback filename when filename is not passed', () => {
    render(<OutputSnippet altText="Sample description" onAltTextChange={vi.fn()} />);

    expect(screen.getByRole('heading', { level: 2, name: /Generated Alt Text & Snippets/i })).toBeInTheDocument();
    expect(screen.getByText('"Sample description"')).toBeInTheDocument();
    expect(screen.getByText('<img src="image.jpg" alt="Sample description" />')).toBeInTheDocument();
    expect(screen.getByText('![Sample description](image.jpg)')).toBeInTheDocument();
  });

  it('renders on-device engine badge when engineUsed is on-device', () => {
    render(
      <OutputSnippet
        altText="Description"
        filename="photo.png"
        engineUsed="on-device"
        onAltTextChange={vi.fn()}
      />
    );
    expect(screen.getByText(/Generated On-Device/i)).toBeInTheDocument();
  });

  it('does not render cloud fallback banner when engineUsed is cloud-fallback', () => {
    render(
      <OutputSnippet
        altText="Description"
        filename="photo.png"
        engineUsed="cloud-fallback"
        onAltTextChange={vi.fn()}
      />
    );
    expect(screen.queryByText(/Generated via Cloud Edge Fallback/i)).not.toBeInTheDocument();
  });

  it('copies raw alt text to clipboard, shows Copied! state, and announces status via polite live region', async () => {
    vi.useFakeTimers();
    vi.spyOn(clipboardModule, 'copyToClipboard').mockResolvedValue(true);

    render(<OutputSnippet altText="Copy me" onAltTextChange={vi.fn()} filename="test.jpg" />);

    const copyRawBtn = screen.getByRole('button', { name: /Copy Text.*raw alt text to clipboard/i });
    await act(async () => {
      fireEvent.click(copyRawBtn);
    });

    expect(clipboardModule.copyToClipboard).toHaveBeenCalledWith('Copy me');
    expect(screen.getByRole('button', { name: /Copied!.*raw alt text to clipboard/i })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Copied raw alt text to clipboard.');

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('does not display Copied! when copyToClipboard fails', async () => {
    vi.spyOn(clipboardModule, 'copyToClipboard').mockResolvedValue(false);

    render(<OutputSnippet altText="Copy me" onAltTextChange={vi.fn()} filename="test.jpg" />);

    const copyRawBtn = screen.getByRole('button', { name: /Copy Text.*raw alt text to clipboard/i });
    await act(async () => {
      fireEvent.click(copyRawBtn);
    });

    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
  });

  it('copies HTML snippet to clipboard and announces status via polite live region', async () => {
    vi.spyOn(clipboardModule, 'copyToClipboard').mockResolvedValue(true);

    render(<OutputSnippet altText="Alt" onAltTextChange={vi.fn()} filename="img.png" />);

    const copyHtmlBtn = screen.getByRole('button', { name: /Copy HTML.*image tag snippet to clipboard/i });
    await act(async () => {
      fireEvent.click(copyHtmlBtn);
    });

    expect(clipboardModule.copyToClipboard).toHaveBeenCalledWith('<img src="img.png" alt="Alt" />');
    expect(screen.getByRole('button', { name: /Copied!.*HTML image tag snippet to clipboard/i })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Copied HTML snippet to clipboard.');
  });

  it('copies Markdown snippet to clipboard, uses high-contrast bg-mint text-ink classes, and announces status via polite live region', async () => {
    vi.spyOn(clipboardModule, 'copyToClipboard').mockResolvedValue(true);

    render(<OutputSnippet altText="Alt" onAltTextChange={vi.fn()} filename="img.png" />);

    const copyMdBtn = screen.getByRole('button', { name: /Copy Markdown.*image syntax to clipboard/i });
    expect(copyMdBtn.className).toContain('bg-mint');
    expect(copyMdBtn.className).toContain('text-ink');

    await act(async () => {
      fireEvent.click(copyMdBtn);
    });

    expect(clipboardModule.copyToClipboard).toHaveBeenCalledWith('![Alt](img.png)');
    expect(screen.getByRole('button', { name: /Copied!.*Markdown image syntax to clipboard/i })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Copied Markdown syntax to clipboard.');
  });

  it('toggles edit mode, moves focus to textarea, links helper text via aria-describedby, and allows changing alt text', () => {
    vi.useFakeTimers();
    const onAltTextChange = vi.fn();
    render(<OutputSnippet altText="Original text" onAltTextChange={onAltTextChange} filename="test.png" />);

    const editBtn = screen.getByRole('button', { name: 'Edit alt text' });
    fireEvent.click(editBtn);

    const textarea = screen.getByRole('textbox', { name: 'Edit alt text' });
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toBe('Original text');
    expect(textarea).toHaveAttribute('aria-describedby', 'edit-alt-text-help');

    vi.runAllTimers();
    expect(document.activeElement).toBe(textarea);

    fireEvent.change(textarea, { target: { value: 'New text' } });
    expect(onAltTextChange).toHaveBeenCalledWith('New text');

    // Click Done editing
    const doneBtn = screen.getByRole('button', { name: 'Done editing alt text' });
    fireEvent.click(doneBtn);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('escapes HTML attribute characters and Markdown delimiters in generated snippets', () => {
    render(
      <OutputSnippet
        altText='A "quoted" <tag> & [brackets]'
        filename='photo"onerror="alert(1).jpg'
        onAltTextChange={vi.fn()}
      />
    );

    expect(
      screen.getByText(
        '<img src="photo&quot;onerror=&quot;alert(1).jpg" alt="A &quot;quoted&quot; &lt;tag&gt; &amp; [brackets]" />'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('![A "quoted" <tag> & \\[brackets\\]](photo"onerror="alert\\(1\\).jpg)')
    ).toBeInTheDocument();
  });

  it('renders Clear [X] button next to heading and triggers onClear when clicked', () => {
    const handleClear = vi.fn();
    render(
      <OutputSnippet
        altText="Sample description"
        filename="test.jpg"
        onAltTextChange={vi.fn()}
        onClear={handleClear}
      />
    );

    const clearBtn = screen.getByRole('button', { name: 'Clear' });
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });
});
