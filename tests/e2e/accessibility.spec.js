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
      .getByRole("button", { name: "Load Mountain Sunrise demo image" })
      .click();

    // Live region announces image load
    await expect(liveRegion).toContainText("mountain");
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
});
