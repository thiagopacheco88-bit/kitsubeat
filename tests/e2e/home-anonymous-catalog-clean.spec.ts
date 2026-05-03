/**
 * SPEC AC #14 — anonymous-catalog clean (the comprehensive D-14 contract):
 *   Unauthenticated / does NOT render:
 *     - [data-testid='continue-learning']
 *     - [data-testid='global-lantern-streak']
 *   AND <CoverCard> instances under featured-songs have ZERO descendant
 *     - [data-testid='star-aura']
 *     - [data-testid='song-mastered-banner']
 *     - [data-testid='cover-card-aura']
 *
 * This is the comprehensive D-14 enforcement gate. If any mastery decoration
 * leaks to anonymous visitors, this spec fails.
 */
import { test, expect } from "@playwright/test";

test.describe("/ anonymous-catalog clean (AC #14, D-14)", () => {
  test("unauth / -> no Continue Learning, no LanternStreak, no mastery decorations on Featured Songs", async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await context.addCookies([
      { name: "kb_theme", value: "dark", url: "http://localhost:7000", sameSite: "Lax" },
    ]);
    // Do NOT set Clerk auth — anonymous

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Continue Learning section ABSENT
    await expect(page.locator('[data-testid="continue-learning"]')).toHaveCount(0);

    // Global LanternStreak ABSENT
    await expect(page.locator('[data-testid="global-lantern-streak"]')).toHaveCount(0);

    // No mastery decorations under featured-songs
    const featured = page.locator('[data-testid="featured-songs"]');
    await expect(featured).toBeVisible({ timeout: 10_000 });
    const decorations = featured.locator(
      '[data-testid="star-aura"], [data-testid="song-mastered-banner"], [data-testid="cover-card-aura"]',
    );
    await expect(decorations).toHaveCount(0);

    // Sign in button visible (the unauth right-side slot)
    await expect(page.locator('[data-testid="nav-sign-in"]')).toBeVisible({ timeout: 10_000 });
  });
});
