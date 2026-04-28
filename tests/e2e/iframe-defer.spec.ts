/**
 * Phase 13 R2 / SPEC AC #4, #5 — YouTube iframe lazy-mount contract.
 *
 * Asserts the iframe is ABSENT on initial DOM and PRESENT after the player
 * container enters viewport (via scrollIntoViewIfNeeded — IO rootMargin: 200px
 * triggers slightly before the placeholder fully reaches viewport).
 *
 * The test environment normally short-circuits the IO gate (D-20) so existing
 * specs like player-load.spec.ts pass without scroll wiring. This spec sets a
 * per-test override via the `?disableTestForceMount=1` query parameter, which
 * YouTubeEmbed reads to skip the test-env short-circuit and actually exercise
 * the IntersectionObserver path.
 */
import { test, expect } from "../support/fixtures";

const SLUG = "again-yui"; // SEEDED_SLUGS[0] — matches Phase 08.1 test corpus

test.describe("Phase 13 / iframe defer (R2)", () => {
  test("initial DOM has 0 youtube iframes; placeholder renders", async ({ page }) => {
    // Override the test-env IO short-circuit so we actually exercise the
    // IntersectionObserver gate. Without this, NEXT_PUBLIC_APP_ENV === "test"
    // makes YouTubeEmbed setShouldMount(true) on first render.
    await page.goto(`/songs/${SLUG}?disableTestForceMount=1`);

    // Placeholder must be present (proves the component rendered).
    await expect(page.locator('[data-yt-state="placeholder"]')).toBeVisible({
      timeout: 10_000,
    });

    // SPEC AC #4 — initial DOM has 0 youtube iframes.
    expect(await page.locator('iframe[src*="youtube"]').count()).toBe(0);
  });

  test("post-scroll DOM has 1 youtube iframe within bounded wait", async ({ page }) => {
    await page.goto(`/songs/${SLUG}?disableTestForceMount=1`);
    await expect(page.locator('[data-yt-state="placeholder"]')).toBeVisible({
      timeout: 10_000,
    });

    // Scroll the placeholder into view — IO rootMargin: 200px will trigger
    // mount slightly before the placeholder fully reaches viewport.
    await page.locator('[data-yt-state="placeholder"]').scrollIntoViewIfNeeded();

    // SPEC AC #5 — iframe present after scroll, bounded wait.
    await page.waitForSelector('iframe[src*="youtube"]', { timeout: 10_000 });
    expect(await page.locator('iframe[src*="youtube"]').count()).toBe(1);
  });

  test("Practice tab force-mounts iframe without scrolling (D-08)", async ({ page }) => {
    await page.goto(`/songs/${SLUG}?disableTestForceMount=1`);
    await expect(page.locator('[data-yt-state="placeholder"]')).toBeVisible({
      timeout: 10_000,
    });

    // Click Practice tab WITHOUT scrolling first.
    await page.getByRole("button", { name: /practice/i }).click();

    // D-08 force-mount path: iframe mounts even though the player container
    // is not in viewport yet. Use a bounded wait — Practice tab activation
    // dispatches setForceMount(true), which short-circuits the IO setup
    // and runs setShouldMount(true) on the next render.
    await page.waitForSelector('iframe[src*="youtube"]', { timeout: 10_000 });
    expect(await page.locator('iframe[src*="youtube"]').count()).toBe(1);
  });
});
