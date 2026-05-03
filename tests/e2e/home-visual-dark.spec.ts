/**
 * Phase 14.2 SPEC AC #2 — / pixel-diff dark theme.
 *
 * Snapshot: home-dark.png (auto-generated on first --update-snapshots run).
 * Reference: _temp/path-redesign/demo-home-CA-hybrid.png (locked design contract).
 * Tolerance: 2% pixel ratio (CONTEXT D-11 carry from 14.1).
 * Mask regions cover ALL dynamic content per CONTEXT D-11.
 *
 * Mirrors tests/e2e/path-visual-dark.spec.ts (PATTERNS.md lines 659-689).
 * First run: use --update-snapshots to generate baseline.
 * Subsequent runs compare against committed baseline at 2% tolerance.
 *
 * W-5 mask discipline (carry from path-visual-dark): mask ONLY the inner count
 * span [data-testid="lantern-streak-count"], NOT the full LanternStreak wrapper.
 * The SVG lantern shape stays in the visual diff gate.
 */
import { test, expect } from "../support/fixtures";

test.describe("/ visual diff (dark theme)", () => {
  test("matches snapshot at 2% tolerance (AC #2)", async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Set dark theme via cookie (V3 verification — kb_theme cookie pattern per 14.2-01-VERIFICATIONS.md §V3)
    await context.addCookies([
      {
        name: "kb_theme",
        value: "dark",
        url: "http://localhost:7000",
        sameSite: "Lax",
      },
    ]);

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot("home-dark.png", {
      maxDiffPixelRatio: 0.02,
      mask: [
        // Hero dynamic content (song title + meta + cover image + JLPT chip)
        page.locator('[data-testid="hero-title-jp"]'),
        page.locator('[data-testid="hero-meta"]'),
        page.locator('[data-testid="hero-cover"]'),
        page.locator('[data-testid="hero-jlpt-chip"]'),
        // ContinueCard dynamic content (titles + cover images + progress fill)
        page.locator('[data-testid^="continue-card-"] [data-testid="continue-card-title-jp"]'),
        page.locator('[data-testid^="continue-card-"] img'),
        page.locator('[data-testid="continue-card-progress-fill"]'),
        // AnimeCard dynamic content (cover images + song count)
        page.locator('[data-testid^="anime-card-"] img'),
        page.locator('[data-testid="anime-card-song-count"]'),
        // CoverCard dynamic content (cover images + title text)
        page.locator('[data-testid^="cover-card-"] img'),
        // Global lantern streak — mask ONLY the inner count span (per revision: do NOT
        // mask the full LanternStreak wrapper which would over-mask the SVG lantern shape;
        // mirrors 14.1 W-5 mask scope for path-visual-dark.spec.ts)
        page.locator('[data-testid="lantern-streak-count"]'),
      ],
    });
  });
});
