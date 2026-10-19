import { test, expect } from '@playwright/test';

test.describe('UI Components & Layout Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Header renders with logo, title, and tagline', async ({ page }) => {
    const heading = page.getByRole('heading', { level: 1, name: 'Alt Text Generator' });
    await expect(heading).toBeVisible();
    await expect(page.getByText('Accessible, objective image descriptions powered by progressive AI')).toBeVisible();
  });

  test('EngineBadge displays status, moves focus into dialog on open, and restores focus on close', async ({ page }) => {
    const engineBtn = page.getByRole('button', { name: /Click for engine details/i });
    await expect(engineBtn).toBeVisible();
    await expect(engineBtn).toHaveAttribute('aria-haspopup', 'dialog');

    // Click EngineBadge to open modal
    await engineBtn.click();

    const dialog = page.getByRole('dialog', { name: /Two-Tier AI Architecture/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('⚡ Two-Tier AI Architecture')).toBeVisible();
    await expect(dialog.getByText('Tier 1: On-Device (Chrome Built-in AI)')).toBeVisible();
    await expect(dialog.getByText('Tier 2: Cloud Edge (Serverless Gemini 3.x Flash)')).toBeVisible();

    // Close button inside modal receives initial focus
    const closeBtn = dialog.getByRole('button', { name: 'Close dialog' });
    await expect(closeBtn).toBeFocused();

    // Close via close button and verify focus returns to trigger button
    await closeBtn.click();
    await expect(dialog).not.toBeVisible();
    await expect(engineBtn).toBeFocused();

    // Open again and close via Escape key, verifying focus returns to trigger button
    await engineBtn.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(engineBtn).toBeFocused();
  });

  test('Footer displays author attribution and GitHub link', async ({ page }) => {
    const authorLink = page.getByRole('link', { name: 'svinkle' });
    await expect(authorLink).toBeVisible();
    await expect(authorLink).toHaveAttribute('href', 'https://scottvinkle.com');

    const githubLink = page.getByRole('link', { name: 'GitHub' });
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveAttribute('href', 'https://github.com/svinkle/alt-text-generator');
  });

  test('Accessibility standards card displays all 3 WCAG guidelines', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 3, name: 'WCAG Alt Text Standards Enforced' })).toBeVisible();
    await expect(page.getByText('1. Objective & Concise')).toBeVisible();
    await expect(page.getByText('2. No Redundant Phrases')).toBeVisible();
    await expect(page.getByText('3. Transcribes Text')).toBeVisible();
  });

  test('Theme toggle button defaults to OS settings, toggles dark mode class on html, and persists preference', async ({ page }) => {
    const html = page.locator('html');
    const toggleBtn = page.getByRole('button', { name: /Switch to (light|dark) mode/i });
    await expect(toggleBtn).toBeVisible();

    const initialLabel = await toggleBtn.getAttribute('aria-label');
    const isInitiallyDark = initialLabel === 'Switch to light mode';

    if (isInitiallyDark) {
      await expect(html).toHaveClass(/dark/);
      await expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#101010');
      await toggleBtn.click();
      await expect(html).not.toHaveClass(/dark/);
      await expect(toggleBtn).toHaveAttribute('aria-label', 'Switch to dark mode');
      await expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
      await toggleBtn.click();
      await expect(html).toHaveClass(/dark/);
      await expect(toggleBtn).toHaveAttribute('aria-label', 'Switch to light mode');
      await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#101010');
    } else {
      await expect(html).not.toHaveClass(/dark/);
      await expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
      await toggleBtn.click();
      await expect(html).toHaveClass(/dark/);
      await expect(toggleBtn).toHaveAttribute('aria-label', 'Switch to light mode');
      await expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#101010');
      const bodyBg = await page.locator('body').evaluate((el) => window.getComputedStyle(el).backgroundColor);
      expect(bodyBg).toBe('rgb(16, 16, 16)');
      await toggleBtn.click();
      await expect(html).not.toHaveClass(/dark/);
      await expect(toggleBtn).toHaveAttribute('aria-label', 'Switch to dark mode');
    }
  });
});

