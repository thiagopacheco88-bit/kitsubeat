// Phase 14.4 — now-playing chip E2E (filled from Wave 0 stub by plan 04)
import { test, expect } from "../support/fixtures";

test.describe("Phase 14.4 / now-playing chip (REQ-1)", () => {
  test("chip is absent on /songs catalog when not injected", async ({ page }) => {
    await page.goto("/songs");
    await expect(page.getByText("listening now")).not.toBeVisible();
  });

  test("chip is absent on /songs/[slug]", async ({ page }) => {
    // Use the first available song slug
    await page.goto("/songs");
    const firstLink = page.locator("a[href^='/songs/']").first();
    const href = await firstLink.getAttribute("href");
    if (href) {
      await page.goto(href);
      await expect(page.getByText("listening now")).not.toBeVisible();
    }
  });

  // Note: testing >=3 renders requires seeding song_plays in test DB.
  // This is covered by the integration test (now-playing-counts.test.ts).
  // E2E smoke test only checks absence on non-home routes.
  test("home page renders without error", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBeLessThan(400);
    // Chip may or may not appear depending on test DB state — just verify no crash
    await expect(page.locator("body")).toBeVisible();
  });
});
