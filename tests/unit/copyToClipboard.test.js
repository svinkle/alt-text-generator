import { describe, it, expect, vi, beforeEach } from 'vitest';
import { copyToClipboard } from '../../src/utils/copyToClipboard';

describe('copyToClipboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when text is empty or falsy', async () => {
    expect(await copyToClipboard('')).toBe(false);
    expect(await copyToClipboard(null)).toBe(false);
    expect(await copyToClipboard(undefined)).toBe(false);
  });

  it('copies text using navigator.clipboard when available', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const result = await copyToClipboard('test copy');
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('test copy');
  });

  it('falls back to execCommand when navigator.clipboard throws', async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error('Permission denied'));
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const execCommandMock = vi.spyOn(document, 'execCommand').mockReturnValue(true);

    const result = await copyToClipboard('fallback copy');
    expect(result).toBe(true);
    expect(execCommandMock).toHaveBeenCalledWith('copy');
  });

  it('falls back to execCommand when navigator.clipboard is undefined', async () => {
    Object.assign(navigator, {
      clipboard: undefined,
    });

    const execCommandMock = vi.spyOn(document, 'execCommand').mockReturnValue(true);

    const result = await copyToClipboard('no clipboard api');
    expect(result).toBe(true);
    expect(execCommandMock).toHaveBeenCalledWith('copy');
  });

  it('returns false when fallback execCommand fails or throws', async () => {
    Object.assign(navigator, {
      clipboard: undefined,
    });

    vi.spyOn(document, 'execCommand').mockImplementation(() => {
      throw new Error('execCommand failure');
    });

    const result = await copyToClipboard('fail copy');
    expect(result).toBe(false);
  });
});
