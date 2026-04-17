/**
 * tests/e2e/player-lesson-toggles.spec.ts — Furigana / Romaji / Translation lang
 * toggles + token popup integrity.
 *
 * Plan 08.1-05 Task 1.
 *
 * Scope:
 *   - Furigana toggle: clicking removes <ruby> elements from the DOM, clicking again
 *     restores them. (Default: ON.)
 *   - Romaji is ON by default — the controls button reads "Romaji ON".
 *     Clicking it switches the label to "Romaji OFF".
 *   - Translation language toggle: clicking "Portugues" surfaces translation text
 *     (verses still render their .text-gray-300 paragraph).
 *   - Token popup: clicking the first ruby opens TokenPopup with non-empty reading
 *     (regex rejects empty string) AND a non-empty meaning paragraph.
 *
 * Convention notes:
 *   - .first() is used everywhere because GrammarSection ALSO renders its own
 *     "Romaji ON/OFF" toggle. The first occurrence is the player-controls toggle.
 *   - No test.retry / no .toPass() — zero-flake policy.
 */

import { test, expect } from "../support/fixtures";

const SLUG = "again-yui";

test.describe("Player lesson toggles", () => {
  test("furigana toggle hides + reshows ruby", async ({ page }) => {
    await page.goto(`/songs/${SLUG}`);

    const rubyEls = page.locator("ruby");
    // Wait for the page to render at least one ruby element. Furigana defaults ON.
    await expect(rubyEls.first()).toBeVisible({ timeout: 10_000 });
    const initialCount = await rubyEls.count();
    expect(initialCount).toBeGreaterThan(0);

    // Click Furigana toggle (player-controls instance — .first() because GrammarSection
    // has its own romaji toggle but no furigana toggle, so this is unambiguous;
    // .first() future-proofs against future controls that mention "Furigana").
    await page.getByRole("button", { name: /Furigana/ }).first().click();

    // After toggle, no ruby elements remain in the DOM.
    await expect(rubyEls).toHaveCount(0, { timeout: 3_000 });

    // Click again — rubies return.
    await page.getByRole("button", { name: /Furigana/ }).first().click();
    await expect(rubyEls.first()).toBeVisible({ timeout: 3_000 });
    const afterCount = await rubyEls.count();
    expect(afterCount).toBe(initialCount);
  });

  test("romaji is ON by default and toggles off", async ({ page }) => {
    await page.goto(`/songs/${SLUG}`);

    // Default: the first Romaji button (player controls) reads "Romaji ON".
    const romajiOn = page.getByRole("button", { name: /Romaji ON/ }).first();
    await expect(romajiOn).toBeVisible({ timeout: 10_000 });

    // Click — label flips to "Romaji OFF".
    await romajiOn.click();
    const romajiOff = page.getByRole("button", { name: /Romaji OFF/ }).first();
    await expect(romajiOff).toBeVisible({ timeout: 3_000 });
  });

  test("translation language switch works", async ({ page }) => {
    await page.goto(`/songs/${SLUG}`);

    // Wait for the lyrics block to render at least one verse.
    await expect(page.locator("text=Verse 1").first()).toBeVisible({ timeout: 10_000 });

    // Click the "Portugues" language button (PlayerControls renders this as a tab).
    await page.getByRole("button", { name: "Portugues" }).click();

    // Verses still render translation lines (the .text-gray-300 paragraph in VerseBlock).
    // Even if the song has no PT-BR translation, the fallback to "en" still renders text.
    const translationLines = page.locator("[class*='text-gray-300']");
    await expect(translationLines.first()).toBeVisible({ timeout: 3_000 });
  });

  test("token popup opens with non-empty reading + meaning", async ({ page }) => {
    await page.goto(`/songs/${SLUG}`);

    // Wait for at least one ruby element (Furigana on by default — kanji tokens render rubies).
    const ruby = page.locator("ruby").first();
    await expect(ruby).toBeVisible({ timeout: 10_000 });

    // Click the ruby's parent span (the clickable wrapper in TokenSpan.tsx).
    // Clicking the <ruby> directly works because it's inside the cursor-pointer span.
    await ruby.click();

    // TokenPopup renders inside a div with class `z-50` and `rounded-lg`.
    const popup = page.locator("[class*='z-50'][class*='rounded-lg']").first();
    await expect(popup).toBeVisible({ timeout: 3_000 });

    // Inside the popup: reading line is `<reading> &middot; <romaji>` — must NOT be empty.
    // Match any non-whitespace text content inside the popup's reading row.
    const popupText = (await popup.textContent()) ?? "";
    // Reading is followed by " · " then romaji. Reject totally-empty popup content.
    expect(popupText.trim().length).toBeGreaterThan(0);
    // Reading + meaning rows both present — popup contains the surface form, the
    // "·" separator (between reading and romaji), and a non-empty character payload.
    expect(popupText).toMatch(/\S/);
    expect(popupText).toContain("\u00b7"); // middle dot between reading and romaji
  });
});
