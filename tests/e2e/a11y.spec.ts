/**
 * Phase 14 / SPEC AC #13 — axe-core accessibility, both themes.
 *
 * NIGHTLY-ONLY (per planner correction 6 + RESEARCH Open Question #3):
 * 22 routes x 2 themes ~= 60-110 seconds. Self-gated via RUN_A11Y env var.
 * - PR-checks: `playwright test` runs WITHOUT RUN_A11Y → entire describe self-skips.
 * - Nightly: `RUN_A11Y=1 playwright test a11y.spec.ts` (set in qa-suite.yml schedule job).
 * - Local: `npm run test:e2e:a11y` (script sets RUN_A11Y=1 and targets a11y.spec.ts).
 */
// AxeBuilder import verifies @axe-core/playwright is installed (Task 1 dep check).
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- imported for dep verification + Wave 2+ usage
import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "../support/fixtures";

test.describe("Phase 14 / a11y (axe-core, both themes)", () => {
  test.skip(!process.env.RUN_A11Y, "a11y suite gated to nightly only — set RUN_A11Y=1 to enable");

  test("shell — verify spec is discoverable", async () => {
    expect(true).toBe(true);
  });

  // Wave 2+ fills these. Each: setCookie(kb_theme=theme) -> goto(route) -> waitForLoadState('networkidle')
  // -> AxeBuilder.withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze() -> filter serious/critical -> expect(blocking).toHaveLength(0)
  test.fixme("/ (dark) — zero serious/critical axe violations", async () => {});
  test.fixme("/ (light) — zero serious/critical axe violations", async () => {});
  // ... 20 more route x theme combinations (added in Plan 14-09 Task 2)
});
