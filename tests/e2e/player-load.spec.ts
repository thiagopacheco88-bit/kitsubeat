/**
 * tests/e2e/player-load.spec.ts — Song page load + YouTube embed mount.
 *
 * Plan 08.1-05 Task 1.
 *
 * Scope:
 *   - /songs/again-yui loads the song header within 10s
 *   - YouTube iframe is attached to the DOM within 10s
 *   - First verse is visible (lyrics rendered)
 *   - Unknown slug returns the Next.js notFound() 404 surface
 *
 * No retries (zero-flake policy enforced at playwright.config.ts).
 * No test.retry() / test.describe.configure({retries}) — both are grep-audited in plan 08.1-08.
 *
 * Uses fixtures from ../support/fixtures so testUser cleanup remains a no-op for
 * pure read-only tests but the import path stays consistent with other player specs
 * (mirrors plans 02-07 conventions).
 */

import { test, expect } from "../support/fixtures";

const SLUG = "again-yui";

test.describe("Song player page load", () => {
  test("song page loads header + iframe within 10s", async ({ page }) => {
    // Navigate. Song pages are SSR + dynamic — no need to wait for hydration before the h1 check.
    await page.goto(`/songs/${SLUG}`);

    // Header — h1 contains the song title. The dev DB seeds "again" by YUI; the title
    // should contain "again" (case-insensitive). 10s budget covers cold-start dev compile.
    await expect(page.locator("h1")).toContainText("again", {
      ignoreCase: true,
      timeout: 10_000,
    });

    // YouTube iframe is mounted by YouTubeEmbed.tsx after the IFrame API loads.
    // We wait for the iframe element with a youtube.com src — proves the player initialized.
    await page.waitForSelector('iframe[src*="youtube.com"]', { timeout: 10_000 });

    // First verse is rendered by LyricsPanel.tsx. Use .first() because the "Verse 1"
    // string may appear in word-by-word breakdowns or future tooltips.
    await expect(page.locator("text=Verse 1").first()).toBeVisible({ timeout: 10_000 });
  });

  test("404 surface for unknown slug", async ({ page }) => {
    // Next.js notFound() throws a 404. The default not-found page renders the text
    // "404" and "page not found" (Next.js 15 default). We assert HTTP 404 OR visible
    // text — covers both default and custom not-found pages without coupling to either.
    const response = await page.goto("/songs/this-slug-does-not-exist");

    // Either the response is 404, OR the page body contains a "not found" message.
    // Both behaviors are acceptable (Next renders 200 for client-side notFound branches
    // in some configurations); the test fails only if neither holds.
    const status = response?.status() ?? 0;
    if (status !== 404) {
      // Fall back to text assertion if status came back as 200 (Next 15 server components
      // sometimes render the not-found.tsx page with status 200 in dev).
      await expect(page.locator("body")).toContainText(/not found|404/i, {
        timeout: 5_000,
      });
    } else {
      expect(status).toBe(404);
    }
  });
});
