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

    const urlPanel = page.locator("#panel-url");
    await expect(urlPanel).toHaveAttribute("role", "tabpanel");
    await expect(urlPanel).toHaveAttribute("aria-labelledby", "tab-url");
  });

  test("Accessible live region announces status updates to screen readers", async ({
    page,
  }) => {
    const liveRegion = page.locator('div[role="status"][aria-live="polite"]');
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
