/**
 * Phase 14.1 AC #8 — M1 invariant: every node clickable.
 *
 * Verifies three truths across all reachable PathNode + KanaCheckpointNode states:
 *   1. Every PathNode root has an href to /songs/{slug} — no disabled attr, no
 *      inline pointer-events: none on the link itself.
 *   2. Locked-state PathNode mist overlays have pointer-events: none (so the
 *      underlying link still receives taps).
 *   3. Every KanaCheckpointNode root has an href to /kana?script=... — no
 *      disabled attr.
 *
 * Per SPEC-REQ-5 and D-18: M1 invariant is non-negotiable. Visual-only locked
 * treatment must not block tap interactions.
 */
import { test, expect } from "../support/fixtures";

test.describe("/path M1 invariant — every node clickable", () => {
  test("PathNode states have no disabled attr / no pointer-events:none on link", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/path");
    await page.waitForLoadState("networkidle");

    const pathNodes = page.locator('[data-testid^="path-node-"][data-state]');
    const count = await pathNodes.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const node = pathNodes.nth(i);

      // No disabled attribute
      await expect(node).not.toHaveAttribute("disabled", /.*/);

      // No inline pointer-events: none on the link itself (mist overlay is separate)
      const style = (await node.getAttribute("style")) ?? "";
      expect(style).not.toMatch(/pointer-events\s*:\s*none/);

      // href is set (M1 — always clickable)
      const href = await node.getAttribute("href");
      expect(href).toMatch(/^\/songs\//);
    }
  });

  test("PathNode locked-state mist overlay has pointer-events: none", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/path");
    await page.waitForLoadState("networkidle");

    const mistOverlays = page.locator('[data-testid="path-node-mist"]');
    const count = await mistOverlays.count();

    if (count > 0) {
      // Each mist overlay must have pointer-events: none so taps fall through
      for (let i = 0; i < count; i++) {
        const mist = mistOverlays.nth(i);
        // The mist overlay uses `pointerEvents: "none"` style prop in React
        const style = (await mist.getAttribute("style")) ?? "";
        expect(style).toMatch(/pointer-events\s*:\s*none/i);
      }
    }
    // Note: if 0 path nodes happen to be in locked state, the test passes
    // vacuously. Plan 09 Vitest covers per-state unit behavior; this
    // Playwright test covers integration when locked nodes exist.
  });

  test("KanaCheckpointNode states all have clickable roots (>=2 checkpoints)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/path");
    await page.waitForLoadState("networkidle");

    // Select the checkpoint root <a> elements by testid prefix, excluding
    // skeleton, mist-hiragana, and mist-katakana sub-elements
    const checkpoints = page.locator(
      '[data-testid="kana-checkpoint-hiragana"], [data-testid="kana-checkpoint-katakana"]',
    );
    const count = await checkpoints.count();
    expect(count).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < count; i++) {
      const cp = checkpoints.nth(i);

      // No disabled attribute
      await expect(cp).not.toHaveAttribute("disabled", /.*/);

      // href links to /kana?script=(hiragana|katakana)
      const href = await cp.getAttribute("href");
      expect(href).toMatch(/^\/kana\?script=(hiragana|katakana)$/);
    }
  });
});
