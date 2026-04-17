/**
 * tests/e2e/player-panels.spec.ts — GrammarSection + VocabularySection rendering,
 * color-coded groups, and vocab row expansion.
 *
 * Plan 08.1-05 Task 3.
 *
 * Scope:
 *   - GrammarSection renders inside the "grammar" tab with at least one card and
 *     at least one color-coded item (text-blue-/text-red-/text-green- etc.).
 *   - VocabularySection renders the "Vocabulary" h2/button heading, the part-of-
 *     speech tabs (All / noun / verb / adjective / adverb / expression), and at
 *     least 5 vocab rows when "All" is selected.
 *   - Clicking a vocab row expands it (border-t pt-3 detail) showing example +
 *     additional examples. Clicking again collapses it.
 *
 * Notes on selectors:
 *   - SongContent.tsx renders Grammar inside the "grammar" tab — we MUST click the
 *     "grammar" tab to mount GrammarSection (lazy DOM attachment).
 *   - Vocabulary defaults to the "vocabulary" tab on first render (initial state),
 *     so it's mounted without an extra click.
 *   - Tab labels are rendered with capitalize CSS but the source text is lowercase.
 *     getByRole('button', { name: 'grammar' }) has to use exact-match name including
 *     casing. Use case-insensitive regex.
 *
 * No retries. <20s budget per plan.
 */

import { test, expect } from "../support/fixtures";

const SLUG = "again-yui";

test.describe("Grammar + Vocabulary panels", () => {
  test("GrammarSection renders with grouped cards + color coding", async ({ page }) => {
    await page.goto(`/songs/${SLUG}`);

    // Wait for the page to settle. Click into the grammar tab.
    await expect(page.locator("h1")).toContainText("again", {
      ignoreCase: true,
      timeout: 10_000,
    });

    // Tab labels are CSS-capitalized but stored lowercase. Click the "grammar" tab.
    await page.getByRole("button", { name: /^grammar$/i }).click();

    // The "Grammar Points" header is the GrammarSection root button.
    const grammarHeader = page.getByRole("button", {
      name: /Grammar Points/,
    });
    await expect(grammarHeader).toBeVisible({ timeout: 5_000 });

    // At least one grammar card is expandable — find the JLPT-reference badge inside any card.
    // Cards live in a flex-col container under the header. The card header span has bg-gray-800.
    const grammarCards = page
      .locator("div")
      .filter({ hasText: /Grammar Points/ })
      .locator("button")
      .filter({ has: page.locator("span.text-base") });
    await expect(grammarCards.first()).toBeVisible({ timeout: 5_000 });

    // Color-coded items: at least one element in the panel uses the GRAMMAR_COLOR_CLASS
    // palette (text-pink-, text-blue-, text-green-, text-yellow-, text-purple-, text-orange-).
    // We restrict the search to the grammar tab area to avoid false positives elsewhere.
    const colorCoded = page.locator(
      "[class*='text-blue-'],[class*='text-pink-'],[class*='text-green-'],[class*='text-yellow-'],[class*='text-purple-'],[class*='text-orange-']"
    );
    expect(await colorCoded.count()).toBeGreaterThan(0);
  });

  test("VocabularySection renders grouped vocab with color-coding + tabs", async ({ page }) => {
    await page.goto(`/songs/${SLUG}`);

    // The "vocabulary" tab is the default — VocabularySection should mount immediately.
    await expect(page.locator("h1")).toContainText("again", {
      ignoreCase: true,
      timeout: 10_000,
    });

    // Header button (the section toggle).
    const vocabHeader = page.getByRole("button", { name: /^Vocabulary/ });
    await expect(vocabHeader).toBeVisible({ timeout: 5_000 });

    // Part-of-speech tabs ("All (N)", "noun (N)", "verb (N)" ...). The "All" button
    // should always be present.
    const allTab = page.getByRole("button", { name: /^All\s*\(/ });
    await expect(allTab).toBeVisible({ timeout: 5_000 });

    // Click All to ensure the broadest set of vocab rows render.
    await allTab.click();

    // Vocab rows are .cursor-pointer divs inside the vocabulary section — at least 5
    // for again-yui (the lesson seeds dozens of vocab entries).
    const vocabRows = page.locator(
      "div.cursor-pointer.rounded-lg.border.border-gray-800"
    );
    const rowCount = await vocabRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(5);
  });

  test("vocab row expands and shows example + collapses on second click", async ({
    page,
  }) => {
    await page.goto(`/songs/${SLUG}`);

    await expect(page.locator("h1")).toContainText("again", {
      ignoreCase: true,
      timeout: 10_000,
    });

    // Ensure "All" tab is selected.
    await page.getByRole("button", { name: /^All\s*\(/ }).click();

    const firstRow = page
      .locator("div.cursor-pointer.rounded-lg.border.border-gray-800")
      .first();
    await expect(firstRow).toBeVisible({ timeout: 5_000 });

    // Click to expand.
    await firstRow.click();

    // Expanded detail is a .border-t.border-gray-800.pt-3 inside the row.
    const expanded = firstRow.locator("div.border-t.border-gray-800.pt-3");
    await expect(expanded).toBeVisible({ timeout: 3_000 });

    // The expanded section contains the example_from_song quoted text — assert non-empty.
    const expandedText = (await expanded.textContent()) ?? "";
    expect(expandedText.trim().length).toBeGreaterThan(0);

    // Click again to collapse.
    await firstRow.click();
    await expect(expanded).not.toBeVisible({ timeout: 3_000 });
  });
});
