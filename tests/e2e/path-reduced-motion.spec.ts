/**
 * Phase 14.1 AC #7 — Reduced-motion: ka-* keyframes resolve to 0ms.
 *
 * Asserts that the three new keyframes introduced in Wave 1 (Plan 01):
 *   ka-flicker  — lantern flame animation (on [data-testid="lantern-flame"])
 *   ka-pulse    — PLAY overlay pulse on current node (on [data-testid="path-node-play-overlay"])
 *   ka-aura     — 3-star aura halo on mastered node (on [data-testid="path-node-aura"])
 *
 * …all collapse to animation-duration: 0s (i.e. "0s") when
 * prefers-reduced-motion: reduce is emulated.
 *
 * Per SPEC Constraints and CONTEXT D-15: all three keyframes honour
 * prefers-reduced-motion via the global @media override in globals.css
 * (belt-and-suspenders pattern authored in Plan 01). This spec validates
 * the end-to-end integration (rendered DOM + CSS).
 *
 * NOTE: ka-pulse and ka-aura appear only when the user has a current / mastered
 * node respectively. If neither is present in the dev-server state, those
 * assertions are logged as optional (skipped with a note) — ka-flicker is the
 * unconditional assertion because LanternStreak always renders in PathHeader.
 */
import { test, expect } from "@playwright/test";

test.describe("/path reduced-motion — ka-* keyframes resolve to 0ms", () => {
  test("ka-flicker, ka-pulse, ka-aura all collapse to 0s under prefers-reduced-motion", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      reducedMotion: "reduce",
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();

    await page.goto("http://localhost:7000/path");
    await page.waitForLoadState("networkidle");

    // ka-flicker on lantern flame — always present (PathHeader always renders)
    const flame = page.locator('[data-testid="lantern-flame"]');
    await expect(flame).toBeVisible({ timeout: 5000 });
    const flameDuration = await flame.evaluate((el) =>
      window.getComputedStyle(el).animationDuration,
    );
    expect(
      flameDuration,
      "ka-flicker [data-testid=lantern-flame] should have animationDuration 0s under prefers-reduced-motion",
    ).toBe("0s");

    // ka-pulse on PLAY overlay — only present when user has a current node
    const play = page.locator('[data-testid="path-node-play-overlay"]');
    if ((await play.count()) > 0) {
      const playDuration = await play.evaluate((el) =>
        window.getComputedStyle(el).animationDuration,
      );
      expect(
        playDuration,
        "ka-pulse [data-testid=path-node-play-overlay] should have animationDuration 0s under prefers-reduced-motion",
      ).toBe("0s");
    } else {
      console.log(
        "[reduced-motion] ka-pulse: no current node visible — assertion skipped (vacuously passing)",
      );
    }

    // ka-aura on mastered-state aura halo — only present when user has mastered songs
    const aura = page.locator('[data-testid="path-node-aura"]');
    if ((await aura.count()) > 0) {
      const auraDuration = await aura.evaluate((el) =>
        window.getComputedStyle(el).animationDuration,
      );
      expect(
        auraDuration,
        "ka-aura [data-testid=path-node-aura] should have animationDuration 0s under prefers-reduced-motion",
      ).toBe("0s");
    } else {
      console.log(
        "[reduced-motion] ka-aura: no mastered node visible — assertion skipped (vacuously passing)",
      );
    }

    await context.close();
  });
});
