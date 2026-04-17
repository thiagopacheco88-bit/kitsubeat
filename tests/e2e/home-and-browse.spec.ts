/**
 * tests/e2e/home-and-browse.spec.ts — Home + Songs catalog browse scenarios.
 *
 * Plan 08.1-08 Task 1.
 *
 * Scope (ported from the legacy tests/app.spec.ts before that file was retired):
 *   Home page:
 *     - Renders hero, "Browse by Anime" CTA, and "Featured Songs" h2 with at least
 *       one song card link.
 *     - Header nav "Songs" link routes to /songs.
 *
 *   Songs browse page:
 *     - /songs renders the Songs h1 with at least one song card link visible.
 *     - Search filter narrows the visible cards by query string ("Naruto").
 *     - JLPT N3 filter button surfaces N3 badge spans on the visible results.
 *     - "By Anime" is the default tab and renders carousels (multiple h3 anime headings).
 *       Switching to the "All Songs" tab swaps to a flat song-card grid.
 *
 * The four player-load scenarios from app.spec.ts (loads-with-all-sections, furigana
 * toggle, romaji default, language toggle, token popup, vocab row expansion) are NOT
 * re-ported here — they already live in:
 *   tests/e2e/player-load.spec.ts (load + sections)
 *   tests/e2e/player-lesson-toggles.spec.ts (furigana/romaji/lang/token popup)
 *   tests/e2e/player-panels.spec.ts (vocab row expansion)
 *
 * No retries (zero-flake policy enforced at playwright.config.ts).
 * Uses `../support/fixtures` for the same import path convention as plans 02-07.
 */

import { test, expect } from "../support/fixtures";

test.describe("Home page", () => {
  test("loads with hero and Featured Songs", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Learn Japanese", {
      timeout: 10_000,
    });
    await expect(
      page.getByRole("link", { name: "Browse by Anime" })
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.locator("h2").filter({ hasText: "Featured Songs" })
    ).toBeVisible({ timeout: 5_000 });

    // At least one song card link visible — the seeded catalog always has multiple.
    const cards = page.locator('a[href^="/songs/"]');
    await expect(cards.first()).toBeVisible({ timeout: 5_000 });
  });

  test("header nav Songs link routes to /songs", async ({ page }) => {
    await page.goto("/");
    // Scope to the header to avoid matching the breadcrumb / footer / card links.
    await page.locator("header").getByRole("link", { name: "Songs" }).click();
    await expect(page).toHaveURL(/\/songs/, { timeout: 5_000 });
  });
});

test.describe("Songs browse page", () => {
  test("loads songs grid with at least one card", async ({ page }) => {
    await page.goto("/songs");
    await expect(page.locator("h1")).toContainText("Songs", { timeout: 10_000 });

    const cards = page.locator('a[href^="/songs/"]');
    await expect(cards.first()).toBeVisible({ timeout: 5_000 });
  });

  test("search filter narrows results to matching titles", async ({ page }) => {
    await page.goto("/songs");

    const input = page.getByPlaceholder("Search songs");
    await input.fill("Naruto");

    // After filter applies, at least one card remains and the visible cards
    // mention "naruto" (case-insensitive). Sample the first 3 to keep the
    // assertion bounded — full scan would be O(N) on every catalog change.
    const cards = page.locator('a[href^="/songs/"]');
    await expect(cards.first()).toBeVisible({ timeout: 5_000 });
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    const sample = Math.min(count, 3);
    for (let i = 0; i < sample; i++) {
      const text = (await cards.nth(i).textContent()) ?? "";
      expect(text.toLowerCase()).toContain("naruto");
    }
  });

  test("JLPT N3 filter surfaces N3 badge spans", async ({ page }) => {
    await page.goto("/songs");

    // Click the N3 filter button (the filter-bar button — not the card badges).
    // Filter buttons are styled <button> elements; card badges are <span>.
    const filterButtons = page.locator("button").filter({ hasText: /^N3$/ });
    await filterButtons.first().click();

    // Result cards' badges (rendered as spans) should now include N3.
    const badges = page.locator("span").filter({ hasText: /^N3$/ });
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);
  });

  test("By Anime is default view; All Songs swaps to flat grid", async ({ page }) => {
    await page.goto("/songs");

    // By Anime is selected by default — anime-section h3 headings should be visible.
    const headings = page.locator("h3");
    await expect(headings.first()).toBeVisible({ timeout: 10_000 });
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(1);

    // Switch to flat "All Songs" grid — the cards should still render.
    await page.getByRole("button", { name: "All Songs" }).click();
    const cards = page.locator('a[href^="/songs/"]');
    await expect(cards.first()).toBeVisible({ timeout: 5_000 });
  });
});
