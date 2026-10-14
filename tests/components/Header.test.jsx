import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Header from '../../src/components/Header';

describe('Header', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders application title, logo, and EngineBadge', () => {
    render(<Header engine="cloud-fallback" label="Cloud Engine" details="Detail" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Alt Text Generator' })).toBeInTheDocument();
    expect(screen.getByText('WCAG 2.2')).toBeInTheDocument();
    expect(screen.getByText('Cloud Engine')).toBeInTheDocument();
  });

  it('handles beforeinstallprompt and install button click', async () => {
    const promptMock = vi.fn();
    const mockPromptEvent = new Event('beforeinstallprompt');
    mockPromptEvent.prompt = promptMock;
    mockPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted' });

    render(<Header engine="on-device" />);

    // Trigger beforeinstallprompt event
    act(() => {
      window.dispatchEvent(mockPromptEvent);
    });

    const installBtn = screen.getByRole('button', { name: /Install Alt Text Generator/i });
    expect(installBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(installBtn);
    });

    expect(promptMock).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Install Alt Text Generator/i })).not.toBeInTheDocument();
  });

  it('handles appinstalled event', () => {
    const mockPromptEvent = new Event('beforeinstallprompt');
    mockPromptEvent.prompt = vi.fn();
    mockPromptEvent.userChoice = Promise.resolve({ outcome: 'dismissed' });

    render(<Header engine="on-device" />);

    act(() => {
      window.dispatchEvent(mockPromptEvent);
    });

    expect(screen.getByRole('button', { name: /Install Alt Text Generator/i })).toBeInTheDocument();

    // Trigger appinstalled event
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(screen.queryByRole('button', { name: /Install Alt Text Generator/i })).not.toBeInTheDocument();
  });

  it('handles user dismissing the install prompt without clearing deferredPrompt', async () => {
    const promptMock = vi.fn();
    const mockPromptEvent = new Event('beforeinstallprompt');
    mockPromptEvent.prompt = promptMock;
    mockPromptEvent.userChoice = Promise.resolve({ outcome: 'dismissed' });

    render(<Header engine="on-device" />);

    act(() => {
      window.dispatchEvent(mockPromptEvent);
    });

    const installBtn = screen.getByRole('button', { name: /Install Alt Text Generator/i });
    await act(async () => {
      fireEvent.click(installBtn);
    });

    expect(promptMock).toHaveBeenCalled();
    // Since outcome was dismissed, the install button remains available
    expect(screen.getByRole('button', { name: /Install Alt Text Generator/i })).toBeInTheDocument();
  });

  it('initializes with hasApiKey true when key is present in localStorage', () => {
    localStorage.setItem('gemini_api_key', 'AIzaKeyStored');
    render(<Header engine="cloud-fallback" />);
    // Verify component mounts cleanly with stored key
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('opens and interacts with ApiKeyModal via onOpenApiKeyModal', async () => {
    let openModalFn;
    render(
      <Header
        engine="cloud-fallback"
        onOpenApiKeyModal={(open) => {
          openModalFn = open;
        }}
      />
    );

    expect(openModalFn).toBeDefined();

    // Open modal
    act(() => {
      openModalFn();
    });

    expect(screen.getByRole('dialog', { name: /Gemini API Key/i })).toBeInTheDocument();

    // Enter key and save
    const input = screen.getByLabelText(/Google AI Studio Key/i);
    fireEvent.change(input, { target: { value: 'AIzaCustomKey123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Key' }));

    expect(screen.getByText('Saved!')).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('handles skip to main content link click by focusing main element', () => {
    const mainEl = document.createElement('main');
    mainEl.id = 'main';
    document.body.appendChild(mainEl);
    const focusSpy = vi.spyOn(mainEl, 'focus');

    render(<Header engine="cloud-fallback" />);
    const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main');

    // Click when main does not have tabindex yet
    fireEvent.click(skipLink);

    expect(mainEl.getAttribute('tabindex')).toBe('-1');
    expect(focusSpy).toHaveBeenCalled();

    // Click again when main already has tabindex
    fireEvent.click(skipLink);
    expect(mainEl.getAttribute('tabindex')).toBe('-1');

    document.body.removeChild(mainEl);
  });

  it('handles skip link click gracefully when main element is not in DOM', () => {
    render(<Header engine="cloud-fallback" />);
    const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
    // Should not throw even when main landmark is missing
    fireEvent.click(skipLink);
  });
});
