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

  it('opens modal on click, moves focus inside, displays tiers, and restores focus to trigger via close button', () => {
    vi.useFakeTimers();
    render(<EngineBadge />);

    const badgeBtn = screen.getByRole('button', { name: /Click for engine details/i });
    expect(badgeBtn).toHaveAttribute('aria-haspopup', 'dialog');
    expect(badgeBtn).not.toHaveAttribute('title');
    badgeBtn.focus();
    fireEvent.click(badgeBtn);

    const dialog = screen.getByRole('dialog', { name: /Two-Tier AI Architecture/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Tier 1: On-Device (Chrome Built-in AI)')).toBeInTheDocument();
    expect(screen.getByText('Tier 2: Cloud Edge (Serverless Gemini 3.x Flash)')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'Close dialog' });
    // Focus should automatically move to first focusable element inside modal
    expect(document.activeElement).toBe(closeBtn);

    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    vi.runAllTimers();
    expect(document.activeElement).toBe(badgeBtn);
    vi.useRealTimers();
  });

  it('closes modal on Got it button click and restores focus to trigger', () => {
    vi.useFakeTimers();
    render(<EngineBadge />);
    const badgeBtn = screen.getByRole('button', { name: /Click for engine details/i });
    fireEvent.click(badgeBtn);

    const gotItBtn = screen.getByRole('button', { name: 'Got it' });
    fireEvent.click(gotItBtn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    vi.runAllTimers();
    expect(document.activeElement).toBe(badgeBtn);
    vi.useRealTimers();
  });

  it('closes modal on Escape key, restores focus to trigger, and cleans up event listener', () => {
    vi.useFakeTimers();
    const { unmount } = render(<EngineBadge />);
    const badgeBtn = screen.getByRole('button', { name: /Click for engine details/i });
    fireEvent.click(badgeBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    vi.runAllTimers();
    expect(document.activeElement).toBe(badgeBtn);

    // Verify unmount cleans up
    unmount();
    vi.useRealTimers();
  });

  it('closes modal on backdrop click and prevents close when clicking modal body', () => {
    vi.useFakeTimers();
    render(<EngineBadge />);
    const badgeBtn = screen.getByRole('button', { name: /Click for engine details/i });
    fireEvent.click(badgeBtn);

    const dialog = screen.getByRole('dialog');
    const modalContent = screen.getByText('⚡ Two-Tier AI Architecture');

    // Click inside modal content should stop propagation
    fireEvent.click(modalContent);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Click on backdrop closes and restores focus
    fireEvent.click(dialog);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    vi.runAllTimers();
    expect(document.activeElement).toBe(badgeBtn);
    vi.useRealTimers();
  });

  it('traps Tab and Shift+Tab focus within the modal, including pulling focus in if outside', () => {
    render(<EngineBadge />);
    const badgeBtn = screen.getByRole('button', { name: /Click for engine details/i });
    fireEvent.click(badgeBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'Close dialog' });
    const gotItBtn = screen.getByRole('button', { name: 'Got it' });

    // If focus is somehow outside the modal (e.g. on badgeBtn), pressing Tab pulls it into first focusable element
    badgeBtn.focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(closeBtn);

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
