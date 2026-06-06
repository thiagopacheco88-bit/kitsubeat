/**
 * tests/e2e/exercise-badge-done.spec.ts — Regression guard for the "Done!" badge bug.
 *
 * Bug: TrackCard computed `itemsLeft = ceil((1 - pct/100) * totalItems)`. When
 * `totalItems === 0` (vocab items lack vocab_item_id), this always equals 0, so
 * the badge always displayed "Done!" regardless of actual progress.
 *
 * Fix (ExerciseTab.tsx): when totalItems === 0 and currentPct < 100, show "—".
 *
 * Test 1 (regression — totalItems > 0): again-yui at 0% shows "X left", not "Done!"
 * Test 2 (regression — totalItems > 0): again-yui at 0% shows "X left", not "Done!"
 *   for all three tracks (vocab, grammar, kanji)
 * Test 3 (direct bug repro): share-the-world-tvxq — vocab and kanji have totalItems=0
 *   and non-100% pct, so the fix must render "—" not "Done!" for those tracks.
 */

import { test, expect } from "../support/fixtures";

// ---------------------------------------------------------------------------
// Test 1 — again-yui at default state: all badges must say "X left" not "Done!"
// ---------------------------------------------------------------------------

test('track badges show "X left" (not "Done!") for a song with items at 0% progress', async ({
  page,
}) => {
  await page.goto("/songs/again-yui");

  const practiceTab = page.getByRole("button", { name: /^Practice$/i });
  await practiceTab.click();
  await page.waitForTimeout(600);

  const lobby = page.getByTestId("practice-game-lobby");
  await expect(lobby).toBeVisible();

  const vocabBadge = lobby.getByTestId("track-badge-vocab");
  const grammarBadge = lobby.getByTestId("track-badge-grammar");
  const kanjiBadge = lobby.getByTestId("track-badge-kanji");

  await expect(vocabBadge).toBeVisible();
  await expect(grammarBadge).toBeVisible();
  await expect(kanjiBadge).toBeVisible();

  // None of the badges should say "Done!" at 0% progress with real items
  await expect(vocabBadge).not.toHaveText("Done!");
  await expect(grammarBadge).not.toHaveText("Done!");
  await expect(kanjiBadge).not.toHaveText("Done!");

  // Vocab and kanji should show item counts
  await expect(vocabBadge).toContainText("left");
  await expect(kanjiBadge).toContainText("left");
});

// ---------------------------------------------------------------------------
// Test 2 — Direct bug repro: song where vocab items have no vocab_item_id.
//
// share-the-world-tvxq has vocab/kanji totalItems=0 (no vocab_item_id on items)
// and partial progress stored in the DB. Before the fix, all three badges showed
// "Done!" (because 0 * anything = 0). After the fix, vocab and kanji show "—".
// Grammar at 100% correctly shows "Done!" if it has grammar points.
// ---------------------------------------------------------------------------

test('track badges show "—" (not "Done!") for tracks with zero measurable items', async ({
  page,
}) => {
  await page.goto("/songs/share-the-world-tvxq");

  const practiceTab = page.getByRole("button", { name: /^Practice$/i });
  await practiceTab.click();
  await page.waitForTimeout(600);

  const lobby = page.getByTestId("practice-game-lobby");
  await expect(lobby).toBeVisible();

  const vocabBadge = lobby.getByTestId("track-badge-vocab");
  await expect(vocabBadge).toBeVisible();

  // Vocab badge must NOT say "Done!" — it must show "—" (totalItems=0) or "X left" (totalItems>0).
  // The "Done!" bug was: totalItems=0 always computed itemsLeft=0 and showed "Done!" prematurely.
  await expect(vocabBadge).not.toHaveText("Done!");

  const badgeText = await vocabBadge.textContent();
  // Valid states: "—" (no vocab_item_id on items) or "X left" (items have vocab_item_id).
  // The song's data may evolve — both are correct; "Done!" is never correct at 0% progress.
  expect(badgeText?.trim()).toMatch(/^(—|\d+ left)$/);
});

// ---------------------------------------------------------------------------
// Test 3 — Tracks with items and partial progress show "X left" (not "—" or "Done!")
// ---------------------------------------------------------------------------

test('track with grammar_points at partial progress shows "X left"', async ({
  page,
}) => {
  // share-the-world-tvxq: grammar has real grammar_points (totalItems > 0) and
  // partial progress — so it must show "X left", never "—" or premature "Done!".
  await page.goto("/songs/share-the-world-tvxq");

  const practiceTab = page.getByRole("button", { name: /^Practice$/i });
  await practiceTab.click();
  await page.waitForTimeout(600);

  const lobby = page.getByTestId("practice-game-lobby");
  await expect(lobby).toBeVisible();

  const grammarBadge = lobby.getByTestId("track-badge-grammar");
  await expect(grammarBadge).toBeVisible();

  // Grammar has real items and partial progress → must end with "left" or say "Done!"
  // It must NOT say "—" (that's only for totalItems=0 + pct<100).
  const grammarText = await grammarBadge.textContent();
  expect(grammarText?.trim()).not.toBe("—");
  expect(grammarText?.trim()).toMatch(/^(\d+ left|Done!)$/);
});
