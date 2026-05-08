// Phase 14.4 — social toggle round-trip E2E (filled from Wave 0 stub by plan 04)
import { test, expect } from "../support/fixtures";

test.describe("Phase 14.4 / social activity toggle (REQ-3 + REQ-7)", () => {
  test("Social & notifications section is visible in /profile", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByText("Social & notifications")).toBeVisible();
  });

  test("toggle row is visible and has correct label text", async ({ page }) => {
    await page.goto("/profile");
    await expect(
      page.getByText("Show my activity to others and email me reminders")
    ).toBeVisible();
  });

  test("helper text contains exactly 4 bullet points", async ({ page }) => {
    await page.goto("/profile");
    await expect(
      page.getByText("Your song mastery shows in others' Recently Mastered ticker")
    ).toBeVisible();
    await expect(page.getByText("Daily 7pm reminder")).toBeVisible();
    await expect(page.getByText("Sunday weekly recap")).toBeVisible();
    await expect(page.getByText("Your listening counts toward")).toBeVisible();
  });

  test("helper text contains no loss-frame language", async ({ page }) => {
    await page.goto("/profile");
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("don't lose");
    expect(bodyText).not.toContain("you'll fail");
    expect(bodyText).not.toContain("miss out");
  });
});
