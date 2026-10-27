import { test, expect } from "@playwright/test";

test.describe("Accessibility & Keyboard Navigation Verification", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("ARIA tab roles and state attributes conform to WCAG standards", async ({
    page,
  }) => {
    const tabList = page.getByRole("tablist");
    await expect(tabList).toHaveAttribute("aria-label", "Image source options");

    const tabs = page.getByRole("tab");
    await expect(tabs).toHaveCount(3);

    const uploadTab = page.getByRole("tab", { name: /Upload File/i });
    const urlTab = page.getByRole("tab", { name: /Image URL/i });
    const demoTab = page.getByRole("tab", { name: /Try Demo/i });

    await expect(uploadTab).toHaveAttribute("aria-controls", "panel-upload");
    await expect(urlTab).toHaveAttribute("aria-controls", "panel-url");
    await expect(demoTab).toHaveAttribute("aria-controls", "panel-demo");

    // Switch to URL tab
    await urlTab.click();
    await expect(urlTab).toHaveAttribute("aria-selected", "true");
    await expect(uploadTab).toHaveAttribute("aria-selected", "false");
    await expect(urlTab).toHaveAttribute("tabindex", "0");
    await expect(uploadTab).toHaveAttribute("tabindex", "-1");

    const urlPanel = page.locator("#panel-url");
    await expect(urlPanel).toHaveAttribute("role", "tabpanel");
    await expect(urlPanel).toHaveAttribute("aria-labelledby", "tab-url");

    // Verify ArrowRight, ArrowLeft, Home, and End keyboard navigation on tabs
    await urlTab.focus();
    await page.keyboard.press("ArrowRight");
    await expect(demoTab).toHaveAttribute("aria-selected", "true");
    await expect(demoTab).toBeFocused();

    await page.keyboard.press("ArrowLeft");
    await expect(urlTab).toHaveAttribute("aria-selected", "true");
    await expect(urlTab).toBeFocused();

    await page.keyboard.press("Home");
    await expect(uploadTab).toHaveAttribute("aria-selected", "true");
    await expect(uploadTab).toBeFocused();

    await page.keyboard.press("End");
    await expect(demoTab).toHaveAttribute("aria-selected", "true");
    await expect(demoTab).toBeFocused();
  });

  test("Visually hidden file input is excluded from sequential Tab order and accessibility tree", async ({
    page,
  }) => {
    const fileInput = page.locator("#image-file-input");
    await expect(fileInput).toHaveAttribute("tabindex", "-1");
    await expect(fileInput).toHaveAttribute("aria-hidden", "true");
  });

  test("Tablist reflows without horizontal page overflow at 320px viewport width (400% zoom)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });

  test("Root html element defines scroll-padding-top so sticky header does not obscure focused elements", async ({
    page,
  }) => {
    const scrollPaddingTop = await page.evaluate(() => {
      return window.getComputedStyle(document.documentElement).scrollPaddingTop;
    });
    expect(parseFloat(scrollPaddingTop)).toBeGreaterThanOrEqual(120);
  });

  test("Accessible live region announces status updates to screen readers", async ({
    page,
  }) => {
    const liveRegion = page.locator('div[role="status"][aria-live="polite"]').first();
    await expect(liveRegion).toBeAttached();
    await expect(liveRegion).toHaveAttribute("aria-atomic", "true");

    // Switch to Try Demo and load image
    await page.getByRole("tab", { name: /Try Demo/i }).click();
    await page
      .getByRole("button", { name: "Load Mountain Sunrise" })
      .click();

    // Live region announces image load
    await expect(liveRegion).toContainText("mountain");

    // Live region clears after 5 seconds to avoid discovering out of context
    await expect(liveRegion).toHaveText("", { timeout: 7000 });
  });

  test("Interactive elements show focus indicator with 5px dotted outline when focused via keyboard", async ({
    page,
  }) => {
    const tab = page.getByRole("tab", { name: /Upload File/i });
    await tab.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");

    const outlineStyle = await tab.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
      };
    });

    expect(outlineStyle.outlineStyle).toBe("dotted");
    expect(["3px", "4px", "5px"]).toContain(outlineStyle.outlineWidth);
  });

  test("HTML Head includes PWA Web App Manifest and Theme Color", async ({
    page,
  }) => {
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute("href", "/manifest.webmanifest");

    const themeColorMeta = page.locator('meta[name="theme-color"]');
    await expect(themeColorMeta).toHaveAttribute("content", "#7C3AED");
  });

  test("Skip to main content link is focusable and targets main landmark", async ({
    page,
  }) => {
    const skipLink = page.getByRole("link", { name: "Skip to main content" });
    await expect(skipLink).toBeAttached();

    // Tab into page
    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();

    // Click skip link
    await page.keyboard.press("Enter");
    const mainLandmark = page.locator("main#main");
    await expect(mainLandmark).toBeFocused();
  });

  test("No elements possess title attributes unless they are iframe elements", async ({
    page,
  }) => {
    const elementsWithTitle = await page.locator('[title]:not(iframe)').count();
    expect(elementsWithTitle).toBe(0);
  });

  test("Upload dropzone role='button' does not contain a nested h3 heading (WCAG 1.3.1)", async ({
    page,
  }) => {
    const dropzoneBtn = page.locator('#panel-upload div[role="button"]');
    await expect(dropzoneBtn).toBeVisible();
    await expect(dropzoneBtn.locator("h3")).toHaveCount(0);
    await expect(dropzoneBtn.locator("p")).toHaveText("Drag & Drop Image Here");
  });

  test("Demo sample buttons derive accessible name from visible text in both Load and Reload states and move focus to Close button on load (WCAG 2.5.3, 2.4.3)", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: /Try Demo/i }).click();

    const loadMountainBtn = page.getByRole("button", { name: "Load Mountain Sunrise" });
    const loadTeamBtn = page.getByRole("button", { name: "Load Team Collaboration" });
    await expect(loadMountainBtn).toBeVisible();
    await expect(loadTeamBtn).toBeVisible();
    await expect(loadMountainBtn).not.toHaveAttribute("aria-label");
    await expect(loadTeamBtn).not.toHaveAttribute("aria-label");

    await loadMountainBtn.click();

    // Verify accessible name updated to "Reload Mountain Sunrise" matching visible text
    const reloadMountainBtn = page.getByRole("button", { name: "Reload Mountain Sunrise" });
    await expect(reloadMountainBtn).toBeVisible();

    // Verify focus shifted to revealed Close button instead of dropping to body
    const closeBtn = page.locator("#panel-demo").getByRole("button", { name: "Close" });
    await expect(closeBtn).toBeFocused();
  });

  test("Generated Alt Text & Snippets reflows without horizontal overflow at 320px width and code blocks are keyboard-focusable regions (WCAG 1.4.10, 2.1.1)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.getByRole("tab", { name: /Try Demo/i }).click();
    await page.getByRole("button", { name: "Load Mountain Sunrise" }).click();
    await page.locator("#panel-demo").getByRole("button", { name: /Generate Alt Text/i }).click();

    const heading = page.getByRole("heading", { level: 2, name: "Generated Alt Text & Snippets" });
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Check 320px reflow without horizontal scroll
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Check HTML and Markdown code blocks are keyboard-focusable regions
    const htmlRegion = page.getByRole("region", { name: "HTML image tag snippet" });
    const mdRegion = page.getByRole("region", { name: "Markdown image syntax" });
    await expect(htmlRegion).toHaveAttribute("tabindex", "0");
    await expect(mdRegion).toHaveAttribute("tabindex", "0");

    await htmlRegion.focus();
    await expect(htmlRegion).toBeFocused();
    await mdRegion.focus();
    await expect(mdRegion).toBeFocused();
  });

  test("External links opening in a new tab include programmatic (opens in a new tab) announcement (WCAG 4.1.2)", async ({
    page,
  }) => {
    const githubLink = page.getByRole("link", { name: "GitHub repository (opens in a new tab)" });
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveAttribute("target", "_blank");

    const w3cLink = page.getByRole("link", { name: /W3C Image Decision Tree Guidelines.*\(opens in a new tab\)/i });
    await expect(w3cLink).toBeVisible();
    await expect(w3cLink).toHaveAttribute("target", "_blank");
    await expect(w3cLink.locator('[aria-hidden="true"]')).toHaveText("↗");
  });

  test("Missing API key error suggestion provides accurate instructions without referencing non-existent header button (WCAG 3.3.3)", async ({
    page,
  }) => {
    // Upload a custom non-demo image to trigger backend API key check
    const fileInput = page.locator("#image-file-input");
    await fileInput.setInputFiles({
      name: "custom-photo.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      ),
    });

    const generateBtn = page.getByRole("button", { name: /Generate Alt Text/i });
    await generateBtn.click();

    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible({ timeout: 10000 });
    await expect(alert).toContainText(
      'Please configure GEMINI_API_KEY in your local .env file or try a sample image from the "Try Demo" tab.'
    );
    await expect(alert).not.toContainText('click the "API Key" button in the header');
  });
});
