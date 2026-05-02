/**
 * Phase 14 / SPEC AC #15 / Plan 14-04 — __dev/states route renders all 24 states.
 *
 * Two real assertions replacing the Plan 14-00 .fixme shells:
 *  1. /__dev/states returns 200 and renders the heading in test env
 *  2. /__dev/states contains exactly 24 cards (one per [data-state-card])
 *
 * Production-env 404 gate is unit-tested at
 *   src/app/__dev/states/__tests__/gate.test.ts (Plan 14-04 Task 2).
 */
import { test, expect } from "../support/fixtures";

test.describe("Phase 14 / __dev/states catalog", () => {
  test("/__dev/states renders without error in test env", async ({ page }) => {
    const resp = await page.goto("/__dev/states");
    expect(resp?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: /states catalog/i }),
    ).toBeVisible();
  });

  test("/__dev/states contains all 24 state cards", async ({ page }) => {
    await page.goto("/__dev/states");
    await page.waitForLoadState("networkidle");
    const cards = await page.locator("[data-state-card]").count();
    expect(cards).toBe(24);
  });
});
