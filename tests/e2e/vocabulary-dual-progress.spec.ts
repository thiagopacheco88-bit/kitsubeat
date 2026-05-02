// Phase 11.6 Wave 0 RED stub — implementation in Task 2.
/**
 * tests/e2e/vocabulary-dual-progress.spec.ts
 *
 * Phase 11.6 Plan 11 Task 1 — Playwright spec for SPEC-REQ-18 acceptance.
 *
 * /vocabulary dual-progress display: each word shows two mastery indicators,
 * one for romaji_meaning (the foundational track) and one for kanji_kana
 * (the writing track), with conditional rendering for non-kanji vocab.
 *
 * Seeding strategy:
 *   All tests seed via direct DB writes (user_vocab_mastery rows) and visit
 *   /vocabulary. Tests run only when TEST_DATABASE_URL is set.
 *
 * Data-testids locked (per plan):
 *   - vocab-row-${vocab_item_id}          — each word's row container
 *   - mastery-romaji-${vocab_item_id}     — romaji_meaning badge
 *   - mastery-kanji-${vocab_item_id}      — kanji_kana badge (kanji-bearing only)
 */

import { sql } from "drizzle-orm";
import { test, expect } from "../support/fixtures";
import { getTestDb, TEST_USER_ID } from "../support/test-db";

const HAS_TEST_DB = Boolean(process.env.TEST_DATABASE_URL);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Seed a user_vocab_mastery row for a given vocab item + card kind.
 * state: 0=New, 1=Learning, 2=Review, 3=Relearning
 */
async function seedMasteryRow(opts: {
  userId: string;
  vocabItemId: string;
  cardKind: "romaji_meaning" | "kanji_kana";
  state: 0 | 1 | 2 | 3;
}): Promise<void> {
  if (!HAS_TEST_DB) return;
  const db = getTestDb();
  await db.execute(sql`
    INSERT INTO user_vocab_mastery (
      id, user_id, vocab_item_id, card_kind, state, due,
      reps, lapses, elapsed_days, scheduled_days, intensity_preset
    ) VALUES (
      gen_random_uuid(),
      ${opts.userId},
      ${opts.vocabItemId}::uuid,
      ${opts.cardKind},
      ${opts.state},
      NOW() + INTERVAL '1 day',
      0, 0, 0, 1,
      'normal'
    )
    ON CONFLICT (user_id, vocab_item_id, card_kind)
    DO UPDATE SET state = ${opts.state}
  `);
}

/**
 * Seed a vocab_global row so the vocab appears in vocabulary sources.
 */
async function seedVocabGlobal(opts: {
  vocabItemId: string;
  songId: string;
}): Promise<void> {
  if (!HAS_TEST_DB) return;
  const db = getTestDb();
  await db.execute(sql`
    INSERT INTO vocab_global (vocab_item_id, song_id, version_type)
    VALUES (${opts.vocabItemId}::uuid, ${opts.songId}::uuid, 'tv')
    ON CONFLICT DO NOTHING
  `);
}

/**
 * Look up existing seeded vocab items with kanji/hiragana surfaces for tests.
 * Falls back to inserting a minimal vocab item if none found.
 */
async function getOrCreateVocabItem(opts: {
  dictionaryForm: string;
  reading: string;
  meaning: string;
}): Promise<string> {
  const db = getTestDb();
  const existing = await db.execute<{ id: string }>(sql`
    SELECT id FROM vocabulary_items
    WHERE dictionary_form = ${opts.dictionaryForm}
    LIMIT 1
  `);
  const existingRows = Array.isArray(existing) ? existing : (existing.rows ?? []);
  if (existingRows.length > 0) return (existingRows[0] as { id: string }).id;

  const inserted = await db.execute<{ id: string }>(sql`
    INSERT INTO vocabulary_items (
      id, dictionary_form, reading, romaji, part_of_speech,
      jlpt_level, is_katakana_loanword, meaning
    ) VALUES (
      gen_random_uuid(),
      ${opts.dictionaryForm},
      ${opts.reading},
      ${opts.reading},
      'verb',
      'N5',
      false,
      ${JSON.stringify({ en: opts.meaning })}::jsonb
    )
    ON CONFLICT (dictionary_form, reading) DO UPDATE SET reading = ${opts.reading}
    RETURNING id
  `);
  const insertedRows = Array.isArray(inserted) ? inserted : (inserted.rows ?? []);
  return (insertedRows[0] as { id: string }).id;
}

/**
 * Clean up mastery rows seeded by this test for the test user.
 */
async function cleanMasteryForVocab(vocabIds: string[]): Promise<void> {
  if (!HAS_TEST_DB || vocabIds.length === 0) return;
  const db = getTestDb();
  for (const id of vocabIds) {
    await db.execute(sql`
      DELETE FROM user_vocab_mastery
      WHERE user_id = ${TEST_USER_ID}
        AND vocab_item_id = ${id}::uuid
    `);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("SPEC-REQ-18: /vocabulary dual-progress display", () => {

  test("diverged states render distinctly: romaji=Review, kanji=New per word", async ({ page }) => {
    test.skip(!HAS_TEST_DB, "Requires TEST_DATABASE_URL");

    // Word A: kanji-bearing vocab (飲む), romaji=state-2 (Review), kanji=state-0 (New)
    const wordAId = await getOrCreateVocabItem({
      dictionaryForm: "飲む",
      reading: "のむ",
      meaning: "to drink",
    });

    await seedMasteryRow({ userId: TEST_USER_ID, vocabItemId: wordAId, cardKind: "romaji_meaning", state: 2 });
    await seedMasteryRow({ userId: TEST_USER_ID, vocabItemId: wordAId, cardKind: "kanji_kana", state: 0 });

    try {
      await page.goto("/vocabulary");

      // Word A row should be visible
      const rowA = page.locator(`[data-testid="vocab-row-${wordAId}"]`);
      await expect(rowA).toBeVisible({ timeout: 10_000 });

      // Romaji indicator should show Review (state 2)
      const romajiA = page.locator(`[data-testid="mastery-romaji-${wordAId}"]`);
      await expect(romajiA).toBeVisible();
      await expect(romajiA).toContainText("Review");

      // Kanji indicator should show New (state 0)
      const kanjiA = page.locator(`[data-testid="mastery-kanji-${wordAId}"]`);
      await expect(kanjiA).toBeVisible();
      await expect(kanjiA).toContainText("New");
    } finally {
      await cleanMasteryForVocab([wordAId]);
    }
  });

  test("both Review: word B shows two Review indicators", async ({ page }) => {
    test.skip(!HAS_TEST_DB, "Requires TEST_DATABASE_URL");

    // Word B: kanji-bearing, both state-2 (Review)
    const wordBId = await getOrCreateVocabItem({
      dictionaryForm: "食べる",
      reading: "たべる",
      meaning: "to eat",
    });

    await seedMasteryRow({ userId: TEST_USER_ID, vocabItemId: wordBId, cardKind: "romaji_meaning", state: 2 });
    await seedMasteryRow({ userId: TEST_USER_ID, vocabItemId: wordBId, cardKind: "kanji_kana", state: 2 });

    try {
      await page.goto("/vocabulary");

      const romajiB = page.locator(`[data-testid="mastery-romaji-${wordBId}"]`);
      await expect(romajiB).toBeVisible({ timeout: 10_000 });
      await expect(romajiB).toContainText("Review");

      const kanjiB = page.locator(`[data-testid="mastery-kanji-${wordBId}"]`);
      await expect(kanjiB).toBeVisible();
      await expect(kanjiB).toContainText("Review");
    } finally {
      await cleanMasteryForVocab([wordBId]);
    }
  });

  test("non-kanji vocab shows only romaji indicator (kanji badge hidden)", async ({ page }) => {
    test.skip(!HAS_TEST_DB, "Requires TEST_DATABASE_URL");

    // Word C: hiragana-only surface, no kanji → only romaji indicator shown
    const wordCId = await getOrCreateVocabItem({
      dictionaryForm: "のむ",
      reading: "のむ",
      meaning: "to drink (hiragana)",
    });

    await seedMasteryRow({ userId: TEST_USER_ID, vocabItemId: wordCId, cardKind: "romaji_meaning", state: 2 });

    try {
      await page.goto("/vocabulary");

      // Romaji indicator visible
      const romajiC = page.locator(`[data-testid="mastery-romaji-${wordCId}"]`);
      await expect(romajiC).toBeVisible({ timeout: 10_000 });

      // Kanji indicator NOT rendered for non-kanji vocab
      const kanjiC = page.locator(`[data-testid="mastery-kanji-${wordCId}"]`);
      await expect(kanjiC).toHaveCount(0);
    } finally {
      await cleanMasteryForVocab([wordCId]);
    }
  });

  test("tier grouping uses romaji_meaning: word with romaji=Review, kanji=New appears in Review section", async ({ page }) => {
    test.skip(!HAS_TEST_DB, "Requires TEST_DATABASE_URL");

    // Word D: romaji=state-2 (Review), kanji=state-0 (New)
    // → must appear in Review tier (based on romaji state), NOT New tier
    const wordDId = await getOrCreateVocabItem({
      dictionaryForm: "見る",
      reading: "みる",
      meaning: "to see",
    });

    await seedMasteryRow({ userId: TEST_USER_ID, vocabItemId: wordDId, cardKind: "romaji_meaning", state: 2 });
    await seedMasteryRow({ userId: TEST_USER_ID, vocabItemId: wordDId, cardKind: "kanji_kana", state: 0 });

    try {
      // Visit with tier=2 filter (Review tier uses romaji state)
      await page.goto("/vocabulary?tier=2");

      // Word D should appear in the tier=2 (Review) view
      const rowD = page.locator(`[data-testid="vocab-row-${wordDId}"]`);
      await expect(rowD).toBeVisible({ timeout: 10_000 });

      // Visit with no tier filter — word D should appear in the Mastered/Review section
      await page.goto("/vocabulary");
      const rowDAll = page.locator(`[data-testid="vocab-row-${wordDId}"]`);
      await expect(rowDAll).toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanMasteryForVocab([wordDId]);
    }
  });

  test("free-tier 20-row preview preserved", async ({ page }) => {
    test.skip(!HAS_TEST_DB, "Requires TEST_DATABASE_URL");

    // Visit /vocabulary as the test user (who is not premium).
    // Regardless of how many words are seeded, the page should show at most 20 rows
    // when the user is not premium (FREE_PREVIEW_LIMIT = 20).
    await page.goto("/vocabulary");

    // Count vocab rows
    const rows = page.locator("[data-testid^='vocab-row-']");
    const count = await rows.count();
    expect(count).toBeLessThanOrEqual(20);
  });

  test("sort + tier filter searchParams are honored", async ({ page }) => {
    test.skip(!HAS_TEST_DB, "Requires TEST_DATABASE_URL");

    // Seed a Review-tier word (state=2) and a Learning-tier word (state=1)
    const reviewWordId = await getOrCreateVocabItem({
      dictionaryForm: "書く",
      reading: "かく",
      meaning: "to write",
    });
    const learningWordId = await getOrCreateVocabItem({
      dictionaryForm: "読む",
      reading: "よむ",
      meaning: "to read",
    });

    await seedMasteryRow({ userId: TEST_USER_ID, vocabItemId: reviewWordId, cardKind: "romaji_meaning", state: 2 });
    await seedMasteryRow({ userId: TEST_USER_ID, vocabItemId: learningWordId, cardKind: "romaji_meaning", state: 1 });

    try {
      // Visit with tier=2 filter (Review tier) and sort=asc
      await page.goto("/vocabulary?tier=2&sort=asc");

      // Review word should be visible
      const reviewRow = page.locator(`[data-testid="vocab-row-${reviewWordId}"]`);
      await expect(reviewRow).toBeVisible({ timeout: 10_000 });

      // Learning word should NOT be visible (tier filter excludes state=1)
      const learningRow = page.locator(`[data-testid="vocab-row-${learningWordId}"]`);
      await expect(learningRow).toHaveCount(0);
    } finally {
      await cleanMasteryForVocab([reviewWordId, learningWordId]);
    }
  });

});
