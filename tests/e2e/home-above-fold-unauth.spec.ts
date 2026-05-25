/**
 * SPEC AC #7 — above-fold UNAUTH at 390×844:
 * 4 selectors all visible (top >= 0 && bottom <= 844):
 *   - hero cover image
 *   - Japanese hero title
 *   - Try Free Lesson CTA button
 *   - KitsuBeat wordmark in global header
 *
 * Anonymous visitors see the brand-defining first impression without scrolling.
 */
import { test, expect } from "@playwright/test";

test.describe("/ above-fold UNAUTH (AC #7)", () => {
  // Home page DB queries + external images can take >30s; give test ample budget.
  test.setTimeout(90_000);

  test("4 signals visible above the fold for anonymous visitor", async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await context.addCookies([
      { name: "kb_theme", value: "dark", url: "http://localhost:7000", sameSite: "Lax" },
    ]);
    // Do NOT set Clerk auth cookie — anonymous

    // Use domcontentloaded — home page has YouTube thumbnails and Suspense streams
    // that keep the load event pending well past 30s. All assertions use SSR elements
    // (hero, CTA, wordmark) present in the initial HTML before hydration.
    await page.goto("/", { waitUntil: "commit" });

    // (a) hero cover image visible
    const heroCover = page.locator('[data-testid="hero-featured"] img[src*="youtube.com"]');
    await expect(heroCover).toBeVisible({ timeout: 10_000 });

    // (b) Japanese hero title visible with var(--font-jp)
    const heroTitleJp = page.locator('[data-testid="hero-title-jp"]');
    await expect(heroTitleJp).toBeVisible({ timeout: 10_000 });
    const fontFamily = await heroTitleJp.evaluate((el) =>
      window.getComputedStyle(el).fontFamily,
    );
    // The computed value resolves the var; Noto Sans JP should appear in the resolved family
    expect(fontFamily.toLowerCase()).toMatch(/noto sans jp|var.*font-jp/);

    // (c) Try Free Lesson CTA visible (unauth source)
    const cta = page.locator('[data-testid="hero-cta"]');
    await expect(cta).toBeVisible({ timeout: 10_000 });
    await expect(cta).toContainText("Try Free Lesson");

    // (d) KitsuBeat wordmark visible in global header
    const wordmark = page.locator('[data-testid="brand-wordmark"]');
    await expect(wordmark).toBeVisible({ timeout: 10_000 });
    await expect(wordmark).toContainText("KitsuBeat");

    // All 4 within 844px viewport
    for (const loc of [heroCover, heroTitleJp, cta, wordmark]) {
      const box = await loc.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(844);
    }
  });
});
