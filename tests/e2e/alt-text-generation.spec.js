import { test, expect } from '@playwright/test';

test.describe('Alt Text Generation & Output Snippet Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Generates alt text from Mountain Sunrise demo and enables copying and editing', async ({ page }) => {
    // Navigate to demo tab
    await page.getByRole('tab', { name: /Try Demo/i }).click();

    // Load demo
    await page.getByRole('button', { name: 'Load Mountain Sunrise' }).click();

    // Click Generate Alt Text inside demo panel
    const generateBtn = page.locator('#panel-demo').getByRole('button', { name: /Generate Alt Text/i });
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();

    // Verify Generated Alt Text section appears
    const heading = page.getByRole('heading', { level: 2, name: 'Generated Alt Text & Snippets' });
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Verify generated text is visible
    const rawCard = page.getByText(/hiker carrying a backpack/i).first();
    await expect(rawCard).toBeVisible();

    // Click Edit button to open textarea and verify focus moves to textarea
    const editBtn = page.getByRole('button', { name: 'Edit alt text' });
    await editBtn.click();

    const textarea = page.locator('#edit-alt-text');
    await expect(textarea).toBeVisible();
    await expect(textarea).toBeFocused();
    await expect(textarea).toHaveAttribute('aria-describedby', 'edit-alt-text-help');

    // Test editing textarea
    await textarea.fill('Custom edited alt text for mountain summit.');
    await expect(textarea).toHaveValue('Custom edited alt text for mountain summit.');

    // Click Done editing
    const doneBtn = page.getByRole('button', { name: 'Done editing alt text' });
    await doneBtn.click();

    // Test Copy Alt Text button
    await page.evaluate(() => {
      window.__copiedText = '';
      navigator.clipboard.writeText = async (text) => {
        window.__copiedText = text;
      };
    });

    const copyBtn = page.getByRole('button', { name: /Copy Text.*raw alt text to clipboard/i });
    await copyBtn.click();
    await expect(page.getByText('Copied!').first()).toBeVisible();

    const copied = await page.evaluate(() => window.__copiedText);
    expect(copied).toBe('Custom edited alt text for mountain summit.');

    // Test HTML Snippet copy
    const copyHtmlBtn = page.getByRole('button', { name: /Copy HTML.*image tag snippet to clipboard/i });
    await expect(copyHtmlBtn).toBeVisible();
    await copyHtmlBtn.click();
  });

  test('Image URL form validates input correctly and associates error message programmatically', async ({ page }) => {
    // Navigate to Image URL tab
    await page.getByRole('tab', { name: /Image URL/i }).click();

    const urlInput = page.locator('#image-url-input');
    await expect(urlInput).toBeVisible();
    await expect(urlInput).toHaveAttribute('aria-describedby', 'image-url-hint');

    // Submit invalid URL
    await urlInput.fill('not-a-valid-url');
    const submitBtn = page.getByRole('button', { name: 'Load Image' });
    await submitBtn.click();

    // Error message displayed with role="alert" and associated via aria-describedby
    const errorAlert = page.locator('#image-url-error[role="alert"]');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toHaveText('Please enter a valid URL (including https://).');
    await expect(urlInput).toHaveAttribute('aria-invalid', 'true');
    await expect(urlInput).toHaveAttribute('aria-describedby', 'image-url-hint image-url-error');

    // Enter valid demo image URL
    await urlInput.fill('https://burst.shopifycdn.com/photos/hiker-looks-out-over-view-from-mountain-summit.jpg?width=600');
    await submitBtn.click();

    // 1. Wait for image to load and verify focus shifts to revealed Close control
    await expect(page.locator('#panel-url').getByText('Ready to Analyze')).toBeVisible({ timeout: 10000 });
    const closeBtn = page.locator('#panel-url').getByRole('button', { name: 'Close' });
    await expect(closeBtn).toBeVisible();
    await expect(closeBtn).toBeFocused();

    // 2. Click Close control and verify focus shifts back to Load image button
    await closeBtn.click();
    const loadImgBtn = page.locator('#panel-url').getByRole('button', { name: 'Load Image' });
    await expect(loadImgBtn).toBeVisible();
    await expect(loadImgBtn).toBeFocused();

    // 3. Trigger load error and verify focus shifts to Dismiss button
    await page.locator('#image-url-input').fill('https://example.com/non-existent-broken-image.jpg');
    await loadImgBtn.click();

    const alertBanner = page.getByRole('alert');
    await expect(alertBanner).toBeVisible({ timeout: 10000 });

    // 5. Verify Inference Error is an h2
    const errorHeading = alertBanner.getByRole('heading', { level: 2, name: 'Inference Error' });
    await expect(errorHeading).toBeVisible();

    // 6. Verify DOM order: Dismiss button first, then h2 heading
    const firstTag = await alertBanner.locator('> *').nth(0).evaluate(el => el.tagName.toLowerCase());
    const secondTag = await alertBanner.locator('> *').nth(1).evaluate(el => el.tagName.toLowerCase());
    expect(firstTag).toBe('button');
    expect(secondTag).toBe('h2');

    // 3. Verify focus shifted to Dismiss button
    const dismissBtn = alertBanner.getByRole('button', { name: 'Dismiss' });
    await expect(dismissBtn).toBeFocused();

    // 4. Click Dismiss and verify focus shifts to currently selected Tab
    await dismissBtn.click();
    await expect(alertBanner).not.toBeVisible();
    const selectedTab = page.getByRole('tab', { name: /Image URL/i });
    await expect(selectedTab).toBeFocused();
  });

  test('Upload file tab displays drag & drop zone and file input', async ({ page }) => {
    const uploadTab = page.getByRole('tab', { name: /Upload File/i });
    await uploadTab.click();

    await expect(page.getByText('Drag & Drop Image Here')).toBeVisible();
    await expect(page.getByText('browse files')).toBeVisible();
    await expect(page.getByText('PNG, JPEG, or WEBP up to 10MB')).toBeVisible();

    // File input is present in DOM
    const fileInput = page.locator('#image-file-input');
    await expect(fileInput).toBeAttached();
  });
});
