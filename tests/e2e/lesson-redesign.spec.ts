import { test, expect } from "../support/fixtures";

test.describe("Phase 14.3 / lesson redesign shell", () => {
  test("gear-shift button opens practice in-page", async ({ page }) => {
    await page.goto("/songs/again-yui", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load").catch(() => {});

    await expect(page.getByTestId("song-player-stage")).toBeVisible();

    const gearShift = page.getByTestId("lesson-practice-gearshift");
    await expect(gearShift).toBeVisible();
    await gearShift.click();

    await expect(gearShift).toHaveText(/Practice is open/i);
    await expect(page.getByTestId("advanced-drills-button")).toBeVisible({
      timeout: 10_000,
    });
  });
});

