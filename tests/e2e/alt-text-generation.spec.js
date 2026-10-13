import { test, expect } from '@playwright/test';

test.describe('Alt Text Generation & Output Snippet Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Generates alt text from Mountain Sunrise demo and enables copying and editing', async ({ page }) => {
    // Navigate to demo tab
    await page.getByRole('tab', { name: /Try Demo/i }).click();

    // Load demo
    await page.getByRole('button', { name: 'Load Mountain Sunrise demo image' }).click();

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

    // Click Edit button to open textarea
    const editBtn = page.getByRole('button', { name: 'Edit alt text' });
    await editBtn.click();

    const textarea = page.locator('#edit-alt-text');
    await expect(textarea).toBeVisible();

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

    const copyBtn = page.getByRole('button', { name: 'Copy raw alt text to clipboard' });
    await copyBtn.click();
    await expect(page.getByText('Copied!').first()).toBeVisible();

    const copied = await page.evaluate(() => window.__copiedText);
    expect(copied).toBe('Custom edited alt text for mountain summit.');

    // Test HTML Snippet copy
    const copyHtmlBtn = page.getByRole('button', { name: 'Copy HTML image tag snippet to clipboard' });
    await expect(copyHtmlBtn).toBeVisible();
    await copyHtmlBtn.click();
  });

  test('Image URL form validates input correctly', async ({ page }) => {
    // Navigate to Image URL tab
    await page.getByRole('tab', { name: /Image URL/i }).click();

    const urlInput = page.locator('#image-url-input');
    await expect(urlInput).toBeVisible();

    // Submit invalid URL
    await urlInput.fill('not-a-valid-url');
    const submitBtn = page.getByRole('button', { name: 'Load Image' });
    await submitBtn.click();

    // Error message displayed
    await expect(page.getByText('Please enter a valid URL (including https://).')).toBeVisible();

    // Enter valid demo image URL
    await urlInput.fill('https://burst.shopifycdn.com/photos/hiker-looks-out-over-view-from-mountain-summit.jpg?width=600');
    await submitBtn.click();

    // Wait for image to load and preview card to appear
    await expect(page.locator('#panel-url').getByText('Ready to Analyze')).toBeVisible({ timeout: 10000 });
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
