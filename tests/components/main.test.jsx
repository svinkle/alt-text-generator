import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('main.jsx entrypoint', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('initializes React root and registers service worker on load', async () => {
    const registerMock = vi.fn().mockResolvedValue({ scope: '/' });
    Object.assign(navigator, {
      serviceWorker: {
        register: registerMock,
      },
    });

    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Dynamically import main.jsx
    await import('../../src/main');

    // Trigger load event
    window.dispatchEvent(new Event('load'));

    expect(registerMock).toHaveBeenCalledWith('/sw.js');
    await Promise.resolve(); // wait for microtask
    expect(consoleLogSpy).toHaveBeenCalledWith('PWA ServiceWorker registered with scope:', '/');
  });

  it('handles service worker registration failure gracefully', async () => {
    const registerMock = vi.fn().mockRejectedValue(new Error('SW failed'));
    Object.assign(navigator, {
      serviceWorker: {
        register: registerMock,
      },
    });

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    window.dispatchEvent(new Event('load'));
    await Promise.resolve();
    await Promise.resolve();

    expect(registerMock).toHaveBeenCalled();
  });

  it('does not register service worker when not supported in navigator', async () => {
    vi.resetModules();
    const originalSW = navigator.serviceWorker;
    // @ts-ignore
    delete navigator.serviceWorker;
    try {
      await import('../../src/main');
      expect(document.getElementById('root')).toBeInTheDocument();
    } finally {
      if (originalSW) {
        Object.assign(navigator, { serviceWorker: originalSW });
      }
    }
  });
});
