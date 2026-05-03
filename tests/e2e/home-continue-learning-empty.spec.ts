/**
 * SPEC AC #9 — Continue Learning empty-state:
 *   Authenticated user with zero in-progress songs renders / WITHOUT
 *   [data-testid="continue-learning"] in the DOM (section omitted, NOT
 *   rendered as empty placeholder).
 *
 * Per revision: authenticated spec uses authenticatedTest (Plan 14.2-01b bypass).
 */
import { authenticatedTest as test, expect } from "../support/auth-fixtures";
import { resetTestProgress } from "../support/test-db";

test.describe("/ Continue Learning empty-state (AC #9)", () => {
  test.beforeEach(async ({ authedUserId }) => {
    await resetTestProgress(authedUserId);
  });

  test("zero in-progress songs -> [data-testid='continue-learning'] absent from DOM", async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await context.addCookies([
      { name: "kb_theme", value: "dark", url: "http://localhost:7000", sameSite: "Lax" },
    ]);

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const continueSection = page.locator('[data-testid="continue-learning"]');
    await expect(continueSection).toHaveCount(0);
  });
});
