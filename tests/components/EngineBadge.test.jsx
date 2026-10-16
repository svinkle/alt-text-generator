import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EngineBadge from '../../src/components/EngineBadge';

describe('EngineBadge', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders on-device badge when engine is on-device', () => {
    render(<EngineBadge engine="on-device" />);
    expect(screen.getByText('Engine: On-Device (Gemini Nano)')).toBeInTheDocument();
  });

  it('renders cloud-fallback badge with custom label', () => {
    render(<EngineBadge engine="cloud-fallback" label="Custom Cloud Engine" details="Custom engine detail" />);
    expect(screen.getByText('Custom Cloud Engine')).toBeInTheDocument();
  });

  it('opens modal on click, displays tiers, and closes via close button', () => {
    render(<EngineBadge />);

    const badgeBtn = screen.getByRole('button', { name: /Click for engine details/i });
    fireEvent.click(badgeBtn);

    const dialog = screen.getByRole('dialog', { name: /Two-Tier AI Architecture/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Tier 1: On-Device (Chrome Built-in AI)')).toBeInTheDocument();
    expect(screen.getByText('Tier 2: Cloud Edge (Serverless Gemini 3.x Flash)')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'Close dialog' });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes modal on Got it button click', () => {
    render(<EngineBadge />);
    fireEvent.click(screen.getByRole('button', { name: /Click for engine details/i }));

    const gotItBtn = screen.getByRole('button', { name: 'Got it' });
    fireEvent.click(gotItBtn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes modal on Escape key and cleans up event listener', () => {
    const { unmount } = render(<EngineBadge />);
    fireEvent.click(screen.getByRole('button', { name: /Click for engine details/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Verify unmount cleans up
    unmount();
  });

  it('closes modal on backdrop click and prevents close when clicking modal body', () => {
    render(<EngineBadge />);
    fireEvent.click(screen.getByRole('button', { name: /Click for engine details/i }));

    const dialog = screen.getByRole('dialog');
    const modalContent = screen.getByText('⚡ Two-Tier AI Architecture');

    // Click inside modal content should stop propagation
    fireEvent.click(modalContent);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Click on backdrop closes
    fireEvent.click(dialog);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('traps Tab and Shift+Tab focus within the modal without closing it', () => {
    render(<EngineBadge />);
    fireEvent.click(screen.getByRole('button', { name: /Click for engine details/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'Close dialog' });
    const gotItBtn = screen.getByRole('button', { name: 'Got it' });

    // Shift+Tab on first focusable element wraps to last
    closeBtn.focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(gotItBtn);

    // Tab on last focusable element wraps to first
    gotItBtn.focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(closeBtn);

    // Non-Tab, non-Escape key does nothing
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders default cloud-fallback label when label is not provided', () => {
    render(<EngineBadge engine="cloud-fallback" />);
    expect(screen.getByText('Engine: Cloud Edge (Gemini 3.x Flash)')).toBeInTheDocument();
  });
});
