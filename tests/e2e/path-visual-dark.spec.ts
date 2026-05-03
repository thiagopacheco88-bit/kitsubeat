/**
 * Phase 14.1 AC #2 — /path visual diff dark theme.
 *
 * Captures /path at 390x844 dark theme, compares against the locked
 * Playwright snapshot (path-dark.png) at 2% pixel-diff tolerance.
 *
 * W-5 mask discipline: mask [data-testid="lantern-streak-count"] (count span
 * ONLY) so the SVG lantern shape stays in the visual gate. Do NOT mask
 * [data-testid="lantern-streak"] (the whole component).
 *
 * First run: use --update-snapshots ONLY after the W-2 pre-baseline gate
 * (scripts/debug/path-baseline-pixeldiff.mjs) has passed with exit 0.
 *
 * Per PLAN D-10: mask dynamic regions — "now-learning-title",
 * "next-reward-chip", kana in-progress % pills, song JP titles in path nodes,
 * and the streak count span.
 */
import { test, expect } from "../support/fixtures";

test.describe("/path visual diff (dark theme)", () => {
  test("matches snapshot at 2% tolerance (AC #2)", async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Set dark theme via cookie (matches SSR theme-cookie pattern from theme-toggle.spec.ts)
    await context.addCookies([
      {
        name: "kb_theme",
        value: "dark",
        url: "http://localhost:7000",
        sameSite: "Lax",
      },
    ]);

    await page.goto("/path");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot("path-dark.png", {
      maxDiffPixelRatio: 0.02,
      mask: [
        page.locator('[data-testid="now-learning-title"]'),
        page.locator('[data-testid="next-reward-chip"]'),
        // Mask kana percent pills (in-progress state — dynamic %)
        page.locator(
          '[data-testid^="kana-checkpoint-"][data-state="in-progress"]',
        ),
        // Mask all song titles in path nodes (dynamic catalog content)
        page.locator('[data-testid="path-node-jp-title"]'),
        // W-5 fix: mask ONLY the streak COUNT span, not the entire lantern SVG.
        // The SVG lantern shape stays in the visual diff gate.
        page.locator('[data-testid="lantern-streak-count"]'),
      ],
    });
  });
});
