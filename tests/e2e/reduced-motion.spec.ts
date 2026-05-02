/**
 * Phase 14 / SPEC AC #14 — prefers-reduced-motion suppresses all cataloged animations.
 *
 * Real assertions land in Plan 14-04 (motion catalog).
 */
import { test, expect } from "../support/fixtures";

test.use({ colorScheme: "dark", reducedMotion: "reduce" });

test.describe("Phase 14 / reduced motion", () => {
  test("shell — verify spec is discoverable", async () => {
    expect(true).toBe(true);
  });

  test.fixme("star-shine animation has 0ms duration under reduced-motion", async () => {});
  test.fixme("level-pop animation has 0ms duration under reduced-motion", async () => {});
  test.fixme("modal enter/exit transitions are instant under reduced-motion", async () => {});
  test.fixme("canvas-confetti is suppressed under reduced-motion", async () => {});
});
