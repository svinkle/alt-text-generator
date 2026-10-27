import { test, expect } from '@playwright/test';

test.describe('Tab Navigation & Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Tab bar remains permanently visible on initial page load', async ({ page }) => {
    const tabList = page.getByRole('tablist', { name: 'Image source options' });
    await expect(tabList).toBeVisible();

    const uploadTab = page.getByRole('tab', { name: /Upload File/i });
    const urlTab = page.getByRole('tab', { name: /Image URL/i });
    const demoTab = page.getByRole('tab', { name: /Try Demo/i });

    await expect(uploadTab).toBeVisible();
    await expect(urlTab).toBeVisible();
    await expect(demoTab).toBeVisible();
    await expect(uploadTab).toHaveAttribute('aria-selected', 'true');
  });

  test('Switching tabs keeps the tablist visible', async ({ page }) => {
    const tabList = page.getByRole('tablist', { name: 'Image source options' });
    const urlTab = page.getByRole('tab', { name: /Image URL/i });
    const demoTab = page.getByRole('tab', { name: /Try Demo/i });
    const uploadTab = page.getByRole('tab', { name: /Upload File/i });

    // Click Image URL tab
    await urlTab.click();
    await expect(tabList).toBeVisible();
    await expect(urlTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#image-url-input')).toBeVisible();

    // Click Try Demo tab
    await demoTab.click();
    await expect(tabList).toBeVisible();
    await expect(demoTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: 'Try a Demo Image' })).toBeVisible();

    // Click back to Upload File tab
    await uploadTab.click();
    await expect(tabList).toBeVisible();
    await expect(uploadTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Drag & Drop Image Here')).toBeVisible();
  });

  test('REGRESSION: Clicking demo loads preview inside Try Demo panel and keeps tabs visible', async ({ page }) => {
    const tabList = page.getByRole('tablist', { name: 'Image source options' });
    const demoTab = page.getByRole('tab', { name: /Try Demo/i });

    await demoTab.click();
    await expect(tabList).toBeVisible();

    // Click Mountain Sunrise demo
    const loadMountainBtn = page.getByRole('button', { name: 'Load Mountain Sunrise' });
    await expect(loadMountainBtn).toBeVisible();
    await loadMountainBtn.click();

    // CRITICAL REGRESSION CHECK: Tabs MUST NOT disappear
    await expect(tabList).toBeVisible();
    await expect(demoTab).toHaveAttribute('aria-selected', 'true');

    // Demo panel contains preview card and attribution
    const demoPanel = page.locator('#panel-demo');
    await expect(demoPanel).toBeVisible();
    await expect(demoPanel.getByText('Photo by')).toBeVisible();
    await expect(demoPanel.getByRole('link', { name: 'Daniel Moroder' })).toBeVisible();
    await expect(demoPanel.getByRole('link', { name: 'Burst' })).toBeVisible();

    // Action button inside Try Demo panel
    const generateBtn = demoPanel.getByRole('button', { name: /Generate Alt Text/i });
    await expect(generateBtn).toBeVisible();

    // Mountain Sunrise card shows loaded status and accessible name matches visible text "Reload Mountain Sunrise"
    await expect(demoPanel.getByText('Loaded').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reload Mountain Sunrise' })).toBeVisible();

    // Switch to Team Collaboration demo
    const loadTeamBtn = page.getByRole('button', { name: 'Load Team Collaboration' });
    await loadTeamBtn.click();

    // Tabs remain visible!
    await expect(tabList).toBeVisible();
    await expect(demoPanel.getByRole('link', { name: 'Matthew Henry' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reload Team Collaboration' })).toBeVisible();

    // Click Change Image to remove selected demo
    const changeImgBtn = demoPanel.getByRole('button', { name: 'Change Image' }).first();
    await changeImgBtn.click();

    // Tabs remain visible, loaded preview disappears, sample buttons reset
    await expect(tabList).toBeVisible();
    await expect(demoPanel.getByText('Photo by')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Load Mountain Sunrise' })).toHaveText('Load Mountain Sunrise');
  });
});
