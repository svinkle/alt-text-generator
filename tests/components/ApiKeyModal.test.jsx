import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ApiKeyModal from '../../src/components/ApiKeyModal';

describe('ApiKeyModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders null when isOpen is false', () => {
    const { container } = render(<ApiKeyModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders dialog and loads existing key from localStorage when open', () => {
    localStorage.setItem('gemini_api_key', 'AIzaExistingKey');

    render(<ApiKeyModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: /Gemini API Key/i })).toBeInTheDocument();

    const input = screen.getByLabelText(/Google AI Studio Key/i);
    expect(input.value).toBe('AIzaExistingKey');
    expect(screen.getByRole('button', { name: 'Clear Key' })).toBeInTheDocument();
  });

  it('saves key to localStorage and calls onKeySaved', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const onKeySaved = vi.fn();

    render(<ApiKeyModal isOpen={true} onClose={onClose} onKeySaved={onKeySaved} />);

    const input = screen.getByLabelText(/Google AI Studio Key/i);
    fireEvent.change(input, { target: { value: '  AIzaNewKey123  ' } });

    const saveBtn = screen.getByRole('button', { name: 'Save Key' });
    fireEvent.click(saveBtn);

    expect(localStorage.getItem('gemini_api_key')).toBe('AIzaNewKey123');
    expect(onKeySaved).toHaveBeenCalledWith('AIzaNewKey123');
    expect(screen.getByText('Saved!')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('clears existing key and calls onKeySaved with empty string', () => {
    localStorage.setItem('gemini_api_key', 'AIzaToDelete');
    const onKeySaved = vi.fn();

    render(<ApiKeyModal isOpen={true} onClose={vi.fn()} onKeySaved={onKeySaved} />);

    const clearBtn = screen.getByRole('button', { name: 'Clear Key' });
    fireEvent.click(clearBtn);

    expect(localStorage.getItem('gemini_api_key')).toBeNull();
    expect(onKeySaved).toHaveBeenCalledWith('');
    expect(screen.getByLabelText(/Google AI Studio Key/i).value).toBe('');
  });

  it('closes dialog via Cancel button, Close icon, Escape key, and backdrop click', () => {
    const onClose = vi.fn();
    const { unmount } = render(<ApiKeyModal isOpen={true} onClose={onClose} />);

    // Cancel button
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    // Close button
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(onClose).toHaveBeenCalledTimes(2);

    // Backdrop click
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(3);

    // Inside click does not close
    const modalBody = screen.getByText(/Provide a Google AI Studio API key/i);
    fireEvent.click(modalBody);
    expect(onClose).toHaveBeenCalledTimes(3);

    // Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(4);

    // Non-Escape key does not close
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(onClose).toHaveBeenCalledTimes(4);

    unmount();
  });

  it('does not save when submitting an empty or whitespace key', () => {
    const onClose = vi.fn();
    render(<ApiKeyModal isOpen={true} onClose={onClose} />);

    const input = screen.getByLabelText(/Google AI Studio Key/i);
    fireEvent.change(input, { target: { value: '   ' } });
    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    expect(localStorage.getItem('gemini_api_key')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('handles save and clear without onKeySaved callback', () => {
    localStorage.setItem('gemini_api_key', 'ExistingKey');
    render(<ApiKeyModal isOpen={true} onClose={vi.fn()} />);

    // Clear without onKeySaved
    fireEvent.click(screen.getByRole('button', { name: 'Clear Key' }));
    expect(localStorage.getItem('gemini_api_key')).toBeNull();

    // Save without onKeySaved
    const input = screen.getByLabelText(/Google AI Studio Key/i);
    fireEvent.change(input, { target: { value: 'NewKey' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Key' }));
    expect(localStorage.getItem('gemini_api_key')).toBe('NewKey');
  });

  it('moves focus into the modal on open, traps Tab and Shift+Tab focus (including from outside), and cleans up timer on early unmount', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { unmount } = render(<ApiKeyModal isOpen={true} onClose={onClose} />);

    const closeBtn = screen.getByRole('button', { name: 'Close dialog' });
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });

    // Focus should automatically move to first focusable element on open
    expect(document.activeElement).toBe(closeBtn);

    // If focus escapes to an outside element, pressing Tab pulls focus back to first focusable element
    const outsideBtn = document.createElement('button');
    document.body.appendChild(outsideBtn);
    outsideBtn.focus();
    expect(document.activeElement).toBe(outsideBtn);
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(closeBtn);
    document.body.removeChild(outsideBtn);

    // Focus first focusable element and press Shift+Tab -> wraps to last enabled focusable element (Cancel button when input is empty)
    closeBtn.focus();
    expect(document.activeElement).toBe(closeBtn);
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(cancelBtn);

    // Focus last focusable element and press Tab -> wraps to first focusable element
    cancelBtn.focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(closeBtn);

    // Trigger save to start closeTimerRef, then unmount before 1000ms
    const input = screen.getByLabelText(/Google AI Studio Key/i);
    fireEvent.change(input, { target: { value: 'TimerCleanupKey' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Key' }));
    unmount();

    vi.advanceTimersByTime(1100);
    expect(onClose).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
