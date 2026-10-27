import { test, expect } from '@playwright/test';

test.describe('UI Components & Layout Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Header renders with logo, title, and tagline, and GitHub icon link', async ({ page }) => {
    const heading = page.getByRole('heading', { level: 1, name: 'Alt Text Generator' });
    await expect(heading).toBeVisible();
    await expect(page.getByText('Accessible, objective image descriptions powered by progressive AI')).toBeVisible();

    const githubLink = page.getByRole('link', { name: 'GitHub repository (opens in a new tab)' });
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveAttribute('href', 'https://github.com/svinkle/alt-text-generator');
  });

  test('EngineBadge dialog launcher is commented out in header', async ({ page }) => {
    const engineBtn = page.getByRole('button', { name: /Click for engine details/i });
    await expect(engineBtn).not.toBeAttached();
  });

  test('Footer displays author attribution without GitHub link', async ({ page }) => {
    const footer = page.locator('footer');
    const authorLink = footer.getByRole('link', { name: 'svinkle' });
    await expect(authorLink).toBeVisible();
    await expect(authorLink).toHaveAttribute('href', 'https://scottvinkle.com');

    const githubLink = footer.getByRole('link', { name: 'GitHub' });
    await expect(githubLink).not.toBeAttached();
  });

  test('WCAG Alt Text Standards Enforced section is removed and Clear [X] button removes results', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 3, name: 'WCAG Alt Text Standards Enforced' })).not.toBeAttached();
  });

  test('Clear [X] button removes Generated Alt Text & Snippets and restores focus to active tab', async ({ page }) => {
    const demoTab = page.getByRole('tab', { name: 'Try Demo' });
    await demoTab.click();

    const loadBtn = page.getByRole('button', { name: 'Load Mountain Sunrise' });
    await loadBtn.click();

    const generateBtn = page.getByRole('button', { name: 'Generate Alt Text' });
    await generateBtn.click();

    const resultsHeading = page.getByRole('heading', { level: 2, name: /Generated Alt Text & Snippets/i });
    await expect(resultsHeading).toBeVisible({ timeout: 15000 });
    await expect(resultsHeading).toBeFocused();

    const clearBtn = page.getByRole('button', { name: 'Clear' });
    await expect(clearBtn).toBeVisible();

    await clearBtn.click();

    await expect(resultsHeading).not.toBeVisible();
    await expect(demoTab).toBeFocused();
  });

  test('Clicking Change Image button shifts focus to the active tab', async ({ page }) => {
    const demoTab = page.getByRole('tab', { name: 'Try Demo' });
    await demoTab.click();

    const loadBtn = page.getByRole('button', { name: 'Load Mountain Sunrise' });
    await loadBtn.click();

    const changeBtn = page.getByRole('button', { name: 'Change Image' });
    await expect(changeBtn).toBeVisible();
    await changeBtn.click();

    await expect(demoTab).toBeFocused();
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

