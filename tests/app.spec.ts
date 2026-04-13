import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("loads with hero and featured songs", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Learn Japanese");
    await expect(page.getByRole("link", { name: "Browse by Anime" })).toBeVisible();
    await expect(page.locator("h2").filter({ hasText: "Featured Songs" })).toBeVisible();
    const cards = page.locator('a[href^="/songs/"]');
    await expect(cards.first()).toBeVisible();
  });

  test("nav links work", async ({ page }) => {
    await page.goto("/");
    // Use the nav header link specifically
    await page.locator("header").getByRole("link", { name: "Songs" }).click();
    await expect(page).toHaveURL(/\/songs/);
  });
});

test.describe("Songs Browse Page", () => {
  test("loads songs grid", async ({ page }) => {
    await page.goto("/songs");
    await expect(page.locator("h1")).toContainText("Songs");
    const cards = page.locator('a[href^="/songs/"]');
    await expect(cards.first()).toBeVisible();
  });

  test("search filter works", async ({ page }) => {
    await page.goto("/songs");
    const input = page.getByPlaceholder("Search songs");
    await input.fill("Naruto");
    const cards = page.locator('a[href^="/songs/"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(count, 3); i++) {
      const text = await cards.nth(i).textContent();
      expect(text?.toLowerCase()).toContain("naruto");
    }
  });

  test("JLPT filter works", async ({ page }) => {
    await page.goto("/songs");
    // Click the N3 filter button (in the filter bar, not in cards)
    const filterButtons = page.locator("button").filter({ hasText: /^N3$/ });
    await filterButtons.first().click();
    const badges = page.locator("span").filter({ hasText: /^N3$/ });
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);
  });

  test("By Anime is default view with carousels", async ({ page }) => {
    await page.goto("/songs");
    // By Anime should be active by default — headings visible immediately
    const headings = page.locator("h3");
    await expect(headings.first()).toBeVisible();
    const count = await headings.count();
    expect(count).toBeGreaterThan(1);
    // Switch to All Songs grid
    await page.getByRole("button", { name: "All Songs" }).click();
    const cards = page.locator('a[href^="/songs/"]');
    await expect(cards.first()).toBeVisible();
  });
});

test.describe("Song Player Page", () => {
  test("loads song with all sections", async ({ page }) => {
    await page.goto("/songs/again-yui");
    // Header
    await expect(page.locator("h1")).toContainText("again");
    // YouTube area
    await expect(page.locator("[class*='aspect-video']").first()).toBeVisible();
    // Controls — use .first() since grammar section also has romaji toggle
    await expect(page.getByRole("button", { name: /Furigana/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Romaji/ }).first()).toBeVisible();
    // Lyrics section
    await expect(page.locator("h2").filter({ hasText: "Lyrics" })).toBeVisible();
    await expect(page.locator("text=Verse 1").first()).toBeVisible();
    // Vocabulary section
    await expect(page.locator("h2").filter({ hasText: "Vocabulary" })).toBeVisible();
    // Grammar section
    await expect(page.locator("h2").filter({ hasText: "Grammar Points" })).toBeVisible();
  });

  test("furigana toggle works", async ({ page }) => {
    await page.goto("/songs/again-yui");
    const rubyElements = page.locator("ruby");
    const initialCount = await rubyElements.count();
    expect(initialCount).toBeGreaterThan(0);
    // Toggle furigana off (use first button — in player controls)
    await page.getByRole("button", { name: /Furigana/ }).first().click();
    const afterCount = await rubyElements.count();
    expect(afterCount).toBe(0);
  });

  test("romaji is ON by default", async ({ page }) => {
    await page.goto("/songs/again-yui");
    // The first Romaji button (player controls) should show ON
    const romajiBtn = page.getByRole("button", { name: /Romaji ON/ }).first();
    await expect(romajiBtn).toBeVisible();
  });

  test("language toggle works", async ({ page }) => {
    await page.goto("/songs/again-yui");
    await page.getByRole("button", { name: "Portugues" }).click();
    // Translation text should still be visible in verses
    const verseText = page.locator("[class*='text-gray-300']");
    await expect(verseText.first()).toBeVisible();
  });

  test("token popup appears on click", async ({ page }) => {
    await page.goto("/songs/again-yui");
    // Click a token span that has grammar color class
    const token = page.locator("ruby").first();
    await token.click();
    // Popup should appear — look for the popup container with meaning text
    const popup = page.locator("[class*='z-50'][class*='rounded-lg']");
    await expect(popup.first()).toBeVisible({ timeout: 3000 });
  });

  test("vocabulary rows expand on click", async ({ page }) => {
    await page.goto("/songs/again-yui");
    // Scroll to vocabulary section
    await page.locator("h2").filter({ hasText: "Vocabulary" }).scrollIntoViewIfNeeded();
    // Click the "All" tab to make sure we see vocab
    const allTab = page.getByRole("button", { name: /^All/ });
    await allTab.click();
    // Click a vocab row — they are divs with cursor-pointer inside the vocab section
    const vocabRows = page.locator("h2").filter({ hasText: "Vocabulary" }).locator("..").locator("[class*='cursor-pointer']");
    await vocabRows.first().click();
    // Should show additional content (the expanded section)
    const expandedContent = page.locator("[class*='border-t'][class*='border-gray-800']");
    await expect(expandedContent.first()).toBeVisible({ timeout: 3000 });
  });
});
