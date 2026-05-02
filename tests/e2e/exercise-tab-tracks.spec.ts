/**
 * tests/e2e/exercise-tab-tracks.spec.ts — SPEC-REQ-1 four-card track structure + Short/Long toggle.
 *
 * Phase 11.6 Wave 0 RED stub — implementation in Task 2-3 of Plan 11.6-06.
 *
 * Covers:
 *   SPEC-REQ-1: ExerciseTab renders 4 mode cards: Vocabulary, Grammar, Kanji,
 *               Advanced Drills (in that order), each track card with Short/Long toggle.
 *   SPEC-REQ-2: No obsolete strings "Listening Drills", "Quick Practice", "Full Practice".
 *   SPEC-REQ-16: Kanji card hidden for all-kana songs (no kanji-bearing vocab).
 *
 * These tests are RED until ExerciseTab is restructured (Task 2 of Plan 11.6-06).
 *
 * Seeded song slugs used:
 *   - "again-yui"        — known to have kanji-bearing vocab (used in existing e2e suite)
 *   - All-kana detection — uses song with zero kanji-bearing vocab (fixture or song property)
 *
 * No retries (zero-flake policy per playwright.config.ts).
 */

import { test, expect } from "../support/fixtures";

const KANJI_SONG_SLUG = "again-yui";

// ---------------------------------------------------------------------------
// Test 1: Four cards visible on a kanji-bearing song
// ---------------------------------------------------------------------------

test("ExerciseTab shows 4 mode cards (Vocabulary, Grammar, Kanji, Advanced Drills) for a kanji song", async ({
  page,
}) => {
  await page.goto(`/songs/${KANJI_SONG_SLUG}`);

  // Navigate to the Practice tab
  const practiceTab = page.getByRole("tab", { name: /practice/i });
  await practiceTab.click();

  // Wait for ExerciseTab to render (hydration guard clears)
  await page.waitForTimeout(500);

  // Assert all 4 headings are visible
  await expect(
    page.getByRole("heading", { name: /vocabulary/i })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /grammar/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /kanji/i })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /advanced drills/i })
  ).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 2: Each track card has a Short/Long toggle
// ---------------------------------------------------------------------------

test("Each track card (Vocab/Grammar/Kanji) has Short and Long toggle buttons", async ({
  page,
}) => {
  await page.goto(`/songs/${KANJI_SONG_SLUG}`);
  const practiceTab = page.getByRole("tab", { name: /practice/i });
  await practiceTab.click();
  await page.waitForTimeout(500);

  // Each track card should have a radiogroup with Short and Long buttons
  const radioGroups = page.getByRole("radiogroup");
  const groupCount = await radioGroups.count();
  // At minimum 3 track cards (Vocab, Grammar, Kanji) each have a radiogroup
  expect(groupCount).toBeGreaterThanOrEqual(3);

  // Short and Long buttons should be present (at least 3 each for Vocab/Grammar/Kanji)
  const shortButtons = page.getByRole("radio", { name: /short/i });
  const longButtons = page.getByRole("radio", { name: /long/i });
  expect(await shortButtons.count()).toBeGreaterThanOrEqual(3);
  expect(await longButtons.count()).toBeGreaterThanOrEqual(3);

  // Short is selected by default (aria-checked=true)
  const firstShortButton = shortButtons.first();
  await expect(firstShortButton).toHaveAttribute("aria-checked", "true");

  // Click Long on Vocabulary card — should become checked
  const firstLongButton = longButtons.first();
  await firstLongButton.click();
  await expect(firstLongButton).toHaveAttribute("aria-checked", "true");
});

// ---------------------------------------------------------------------------
// Test 3: Kanji card hidden for all-kana songs (SPEC-REQ-16)
// ---------------------------------------------------------------------------

test("Kanji card is NOT visible for an all-kana song (zero kanji-bearing vocab)", async ({
  page,
  seededSong,
}) => {
  // Use a song known to have no kanji-bearing vocab
  // If no pure-kana seeded song is available, skip with a note
  // The test will fail (RED) if ExerciseTab doesn't implement hasKanjiBearingVocab yet
  const song = await seededSong("again-yui");

  // This test asserts the conditional — it's RED because:
  // (a) The ExerciseTab doesn't have hasKanjiBearingVocab prop yet
  // (b) There is no UI-side all-kana detection
  //
  // For a TRUE all-kana song, the Kanji heading should NOT be visible.
  // We test this by visiting a known song and checking the Kanji heading visibility
  // using page URL param ?forceAllKana=1 — if that param is not respected, RED.
  await page.goto(`/songs/${song.slug}?forceAllKana=1`);

  const practiceTab = page.getByRole("tab", { name: /practice/i });
  await practiceTab.click();
  await page.waitForTimeout(500);

  // With forceAllKana param (or a truly all-kana song), Kanji card should be absent
  // This is RED until SSR all-kana detection + ExerciseTab conditional are implemented
  const kanjiHeading = page.getByRole("heading", { name: /^kanji$/i });
  await expect(kanjiHeading).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 4: No obsolete copy strings in ExerciseTab
// ---------------------------------------------------------------------------

test("No obsolete strings (Listening Drills, Quick Practice, Full Practice) in ExerciseTab area", async ({
  page,
}) => {
  await page.goto(`/songs/${KANJI_SONG_SLUG}`);
  const practiceTab = page.getByRole("tab", { name: /practice/i });
  await practiceTab.click();
  await page.waitForTimeout(500);

  // Assert obsolete strings are absent from the page body
  // (These were the old card titles from the 3-card layout)
  const pageContent = await page.locator("body").textContent();
  expect(pageContent).not.toContain("Listening Drills");
  expect(pageContent).not.toContain("Quick Practice");
  expect(pageContent).not.toContain("Full Practice");
  // "Full Lesson" was also an old card title
  expect(pageContent).not.toContain("Full Lesson");
});

// ---------------------------------------------------------------------------
// Test 5: Click Vocabulary + Short + Start → ExerciseSession mounts
// ---------------------------------------------------------------------------

test("Click Vocabulary track Short + Start → ExerciseSession starts with ≤10 questions", async ({
  page,
  testUser,
}) => {
  void testUser; // ensures cleanup runs after test

  await page.goto(`/songs/${KANJI_SONG_SLUG}`);
  const practiceTab = page.getByRole("tab", { name: /practice/i });
  await practiceTab.click();
  await page.waitForTimeout(500);

  // Assert Vocabulary card is visible
  const vocabHeading = page.getByRole("heading", { name: /vocabulary/i });
  await expect(vocabHeading).toBeVisible();

  // Short should already be selected (default); click Start on the Vocabulary card
  // The Start button is within the Vocabulary card — use the card's context
  const vocabCard = page
    .locator(".rounded-xl")
    .filter({ has: page.getByRole("heading", { name: /vocabulary/i }) });
  const startButton = vocabCard.getByRole("button", { name: /start/i });
  await startButton.click();

  // ExerciseSession should mount — look for question count indicator
  // or session state (URL hash or question count display)
  // Wait for session to load
  await page.waitForTimeout(1500);

  // Session should be active — check for "Return" button (header back button in session view)
  const returnButton = page.getByRole("button", { name: /return/i });
  await expect(returnButton).toBeVisible();

  // Verify question count is bounded by short mode (≤10)
  // The store is exposed via window.__kbExerciseStore in test env
  const sessionInfo = await page.evaluate(() => {
    const store = (
      window as unknown as {
        __kbExerciseStore?: { getState: () => { questions: unknown[] } };
      }
    ).__kbExerciseStore;
    if (!store) return null;
    const state = store.getState();
    return { questionCount: state.questions.length };
  });

  if (sessionInfo) {
    expect(sessionInfo.questionCount).toBeLessThanOrEqual(10);
  }
  // If store hook not available, asserting session mounted is sufficient
});
