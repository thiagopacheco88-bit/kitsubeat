/**
 * tests/e2e/regression-geo-fallback.spec.ts
 *
 * Plan 08.1-07 Task 2 — Regression guard for graceful YouTube failure.
 *
 * CONTEXT-locked invariant (08.1-CONTEXT > Regression guards):
 *
 *   "Geo-restricted / missing YouTube videos fail gracefully (no infinite
 *    spinner, clear user message)"
 *
 * Strategy: Playwright route-intercept blocks the YouTube iframe URL before
 * navigating. This is deterministic and does NOT depend on a real geo-blocked
 * video being present in the DB (the SEEDED_SLUGS catalog includes one such
 * row, but its availability can drift over time — a route-intercept never
 * drifts). Two failure modes are exercised:
 *
 *   1. ABORTED — the iframe URL request is killed mid-flight (mimics network
 *      filters / corporate firewalls / route-blocked browsers).
 *   2. 404 — the iframe URL returns Not Found (mimics a deleted video or an
 *      invalid video id where YT's server returns 404 to the iframe page).
 *
 * In both cases the assertions are HARD (no .fixme, no test.skip):
 *   - Within 20s, `[data-yt-state="error"]` is visible.
 *   - The error block contains the locked copy: "Video unavailable" + the
 *     "geo-restricted or removed" body text.
 *   - The lesson content (Lyrics + Vocabulary) is still rendered and usable —
 *     the player failure must not gate the rest of the page.
 *   - No `[data-yt-state="loading"]` element remains visible — the spinner
 *     does not spin forever.
 *
 * The 20s ceiling comfortably exceeds the 15s watchdog inside YouTubeEmbed.tsx
 * (WATCHDOG_MS) without being so loose that a real regression hides.
 *
 * Implementation reference:
 *   - src/app/songs/[slug]/components/YouTubeEmbed.tsx (added in plan 08.1-07
 *     Task 2): onError event + 15s watchdog + data-yt-state attribute.
 *
 * Zero retries (enforced at playwright.config.ts).
 */

import { test, expect } from "../support/fixtures";

const SLUG = "again-yui";
const WATCHDOG_CEILING_MS = 20_000; // > YouTubeEmbed.WATCHDOG_MS (15_000)

test.describe("Regression: geo / missing YouTube fallback", () => {
  test("geo-blocked YouTube embed shows clear user message and does not spin forever", async ({
    page,
  }) => {
    // Block every YouTube iframe / API request before we navigate. The
    // wildcard covers both `*.youtube.com/embed/<id>` (the iframe URL) and
    // `www.youtube.com/iframe_api` (the JS that bootstraps the player).
    await page.route("**/*youtube.com/**", (route) => route.abort("blockedbyclient"));

    await page.goto(`/songs/${SLUG}`);

    // Within the watchdog window, the error UI must appear.
    await expect(page.locator('[data-yt-state="error"]')).toBeVisible({
      timeout: WATCHDOG_CEILING_MS,
    });

    // Locked copy — both the heading and the body must be present. Any change
    // to the copy MUST be reflected here so we don't ship a regression where
    // the heading changes but the test still passes against generic text.
    const errorBlock = page.locator('[data-yt-state="error"]');
    await expect(errorBlock).toContainText("Video unavailable");
    await expect(errorBlock).toContainText(/geo-restricted or removed/i);

    // Lesson content is still visible — the player failure must not gate
    // anything below it. LyricsPanel renders an h2 "Lyrics"; VocabularySection
    // renders an h2 "Vocabulary". Use .first() because both texts may appear
    // in mobile/desktop dual layouts via SongLayout.
    await expect(page.getByRole("heading", { name: /lyrics/i }).first())
      .toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: /vocabulary/i }).first()
    ).toBeVisible({ timeout: 10_000 });

    // No spinner remains. We accept either zero `loading` elements OR all of
    // them being hidden — the production component swaps the container out for
    // the error block, so the loading state should be gone entirely.
    const loadingCount = await page
      .locator('[data-yt-state="loading"]')
      .count();
    expect(loadingCount).toBe(0);
  });

  test("404 youtube video (invalid id) also fails gracefully", async ({
    page,
  }) => {
    // Same shape, different failure mode: respond with 404 so the iframe page
    // resolves but with an HTTP error. YouTube's onError event would fire
    // with code 100/101/150 in the real world; the watchdog handles the case
    // where the iframe DOM never wires up at all.
    await page.route("**/*youtube.com/**", (route) =>
      route.fulfill({
        status: 404,
        contentType: "text/html",
        body: "<html><body>404 Not Found</body></html>",
      })
    );

    await page.goto(`/songs/${SLUG}`);

    await expect(page.locator('[data-yt-state="error"]')).toBeVisible({
      timeout: WATCHDOG_CEILING_MS,
    });
    const errorBlock = page.locator('[data-yt-state="error"]');
    await expect(errorBlock).toContainText("Video unavailable");
    await expect(errorBlock).toContainText(/geo-restricted or removed/i);

    // Lesson is still usable.
    await expect(page.getByRole("heading", { name: /lyrics/i }).first())
      .toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: /vocabulary/i }).first()
    ).toBeVisible({ timeout: 10_000 });

    // No loading spinner stuck on screen.
    const loadingCount = await page
      .locator('[data-yt-state="loading"]')
      .count();
    expect(loadingCount).toBe(0);
  });
});
