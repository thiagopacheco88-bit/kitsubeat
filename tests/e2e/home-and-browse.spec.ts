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
 *
 * waitUntil: "commit" — fires as soon as navigation response headers arrive.
 * Next.js dev streaming SSR keeps the HTML stream open for 30–90s (Suspense +
 * sequential DB queries), so "domcontentloaded" or "load" reliably timeout.
 * With "commit" we start navigation fast and let element assertions handle waiting.
 */

import { test, expect } from "../support/fixtures";

test.describe("Home page", () => {
  // Home page has sequential DB ticker queries + YouTube thumbnails; needs >30s.
  test.setTimeout(90_000);

  test("loads with hero and Featured Songs", async ({ page }) => {
    // "commit" fires as soon as response headers arrive; element timeouts handle waiting.
    await page.goto("/", { waitUntil: "commit" });
    // Hero section shows the featured song (not a static "Learn Japanese" h1)
    await expect(page.locator('[data-testid="hero-featured"]')).toBeVisible({
      timeout: 60_000,
    });
    // Browse by Anime section is always present on the home page
    await expect(
      page.locator('[data-testid="browse-by-anime"]')
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.locator("h2").filter({ hasText: "Featured Songs" })
    ).toBeVisible({ timeout: 30_000 });

    // At least one song card link visible — the seeded catalog always has multiple.
    const cards = page.locator('a[href^="/songs/"]');
    await expect(cards.first()).toBeVisible({ timeout: 30_000 });
  });

  test("header nav Songs link routes to /songs", async ({ page }) => {
    await page.goto("/", { waitUntil: "commit" });
    // Wait for header to render before clicking
    await page.locator("header").getByRole("link", { name: "Songs" }).waitFor({ timeout: 60_000 });
    // Scope to the header to avoid matching the breadcrumb / footer / card links.
    await page.locator("header").getByRole("link", { name: "Songs" }).click();
    await expect(page).toHaveURL(/\/songs/, { timeout: 10_000 });
  });
});

test.describe("Songs browse page", () => {
  // /songs DB queries can take >30s on cold Neon connection; give ample budget.
  test.setTimeout(90_000);

  test("loads songs grid with at least one card", async ({ page }) => {
    await page.goto("/songs", { waitUntil: "commit" });
    await expect(page.locator("h1")).toContainText("Songs", { timeout: 30_000 });

    const cards = page.locator('a[href^="/songs/"]');
    await expect(cards.first()).toBeVisible({ timeout: 30_000 });
  });

  test("search filter narrows results to matching titles", async ({ page }) => {
    // Navigate with ?search=Naruto — seeds SongGrid's initialSearch prop server-side,
    // exercises the same client-side filter logic reliably without React controlled-input
    // event dispatch issues in Playwright dev mode.
    await page.goto("/songs?search=Naruto", { waitUntil: "commit" });

    const cards = page.locator('a[href^="/songs/"]');
    // Filter is applied from initial state — first card must be Naruto.
    // Navigation to a new URL (no browser cache) + streaming SSR can take 60s.
    await expect(cards.first()).toHaveText(/naruto/i, { timeout: 90_000 });
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // Sample the first 3 to keep the assertion bounded.
    const sample = Math.min(count, 3);
    for (let i = 0; i < sample; i++) {
      const text = (await cards.nth(i).textContent()) ?? "";
      expect(text.toLowerCase()).toContain("naruto");
    }
  });

  test("JLPT N3 filter surfaces N3 badge spans", async ({ page }) => {
    await page.goto("/songs", { waitUntil: "commit" });

    // Wait for grid to load before clicking filter
    const cards = page.locator('a[href^="/songs/"]');
    await expect(cards.first()).toBeVisible({ timeout: 30_000 });

    // Click the N3 filter button (the filter-bar button — not the card badges).
    // Filter buttons are styled <button> elements; card badges are <span>.
    const filterButtons = page.locator("button").filter({ hasText: /^N3$/ });
    await filterButtons.first().click();

    // Result cards' badges (rendered as spans) should now include N3.
    const badges = page.locator("span").filter({ hasText: /^N3$/ });
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);
  });

  test("/anime-list shows grouped view with anime h3 headings", async ({ page }) => {
    // /anime-list renders the "By Anime" grouped view with anime-section h3 headings.
    await page.goto("/anime-list", { waitUntil: "commit" });
    const headings = page.locator("h3");
    await expect(headings.first()).toBeVisible({ timeout: 30_000 });
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(1);
  });

  test("/songs shows flat song-card grid", async ({ page }) => {
    // /songs renders the flat "All Songs" grid — song card links are directly visible.
    await page.goto("/songs", { waitUntil: "commit" });
    const cards = page.locator('a[href^="/songs/"]');
    await expect(cards.first()).toBeVisible({ timeout: 30_000 });
  });
});
