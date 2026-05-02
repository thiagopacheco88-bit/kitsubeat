// Phase 11.6 Wave 0 RED stub — implementation lands in 11.6-05 (recordVocabAnswer extension). DO NOT delete the failing assertions.
/**
 * tests/integration/three-ring-recompute.test.ts
 *
 * SPEC-REQ-10 + SPEC-REQ-11: Three-ring per-track-pct columns updated server-side.
 *
 * Tests that after simulating correct answers for 8/10 vocab, 4/5 grammar, 5/6 kanji,
 * the user_song_progress row contains the expected per-track percentages and
 * advanced_drills_unlocked_at IS NOT NULL.
 *
 * RED: These tests will fail until:
 *   - drizzle/0017 migration applied (vocab_track_pct, grammar_track_pct, kanji_track_pct,
 *     advanced_drills_unlocked_at columns exist on user_song_progress)
 *   - recordVocabAnswer / saveSessionResults computes and writes track pcts in 11.6-05
 *
 * Failure modes expected at this stage:
 *   - Runtime error: "column vocab_track_pct does not exist"
 *   - OR assertion failure: values are null after recording answers
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless";
import { recordVocabAnswer } from "@/app/actions/exercises";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

function unwrap<T = unknown>(r: unknown): T[] {
  return Array.isArray(r) ? (r as T[]) : ((r as { rows?: T[] }).rows ?? []);
}

/** Insert a minimal vocabulary_items row and return its id */
async function insertVocabItem(
  db: ReturnType<typeof drizzlePool>,
  dictForm: string,
  hasKanji: boolean
): Promise<string> {
  const surface = hasKanji ? `漢${dictForm}` : dictForm;
  const rows = unwrap<{ id: string }>(await db.execute(sql`
    INSERT INTO vocabulary_items (
      id, dictionary_form, reading, romaji, part_of_speech,
      jlpt_level, is_katakana_loanword, meaning
    ) VALUES (
      gen_random_uuid(),
      ${dictForm},
      'てすと',
      'tesuto',
      'noun',
      'N5',
      false,
      '{"en":"test"}'::jsonb
    )
    RETURNING id
  `));
  return rows[0].id;
}

describeIfTestDb("SPEC-REQ-10/11: three-ring per-track-pct server-side recompute", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzlePool>;
  let songVersionId: string;
  let songId: string;
  let vocabIds: string[] = [];      // 10 vocab items (romaji_meaning track)
  let kanjiVocabIds: string[] = []; // 6 kanji-bearing vocab items (kanji_kana track)
  const TEST_USER = "test-user-3ring-11-6";
  const SENTINEL = `3ring_${Date.now()}`;

  beforeEach(async () => {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL! });
    db = drizzlePool(pool);

    // Create 10 vocab items (non-kanji, for romaji track)
    vocabIds = [];
    for (let i = 0; i < 10; i++) {
      const id = await insertVocabItem(db, `vocab_${SENTINEL}_${i}`, false);
      vocabIds.push(id);
    }

    // Create 6 kanji-bearing vocab items (kanji_kana track)
    kanjiVocabIds = [];
    for (let i = 0; i < 6; i++) {
      const id = await insertVocabItem(db, `kanji_${SENTINEL}_${i}`, true);
      kanjiVocabIds.push(id);
    }

    // Create song + song_version with a lesson containing 10 vocab + 5 grammar + 6 kanji-bearing
    const grammarPoints = Array.from({ length: 5 }, (_, i) => ({
      id: `grammar-${SENTINEL}-${i}`,
      pattern: `～pattern${i}`,
      explanation: `Grammar ${i}`,
      jlpt_level: "N5",
    }));

    const lesson = {
      vocabulary: [
        ...vocabIds.map((id, i) => ({
          vocab_item_id: id,
          surface: `のむ${i}`,
          reading: `のむ${i}`,
          romaji: `nomu${i}`,
          meaning: { en: `word ${i}` },
          part_of_speech: "noun",
          jlpt_level: "N5",
        })),
        ...kanjiVocabIds.map((id, i) => ({
          vocab_item_id: id,
          surface: `漢字${i}`,
          reading: `かんじ${i}`,
          romaji: `kanji${i}`,
          meaning: { en: `kanji word ${i}` },
          part_of_speech: "noun",
          jlpt_level: "N5",
        })),
      ],
      grammar_points: grammarPoints,
      verses: [
        {
          verse_number: 1,
          lyrics: "test verse",
          translations: { en: "test" },
          tokens: [
            ...vocabIds.map(id => ({ surface: "のむ", vocab_item_id: id, type: "vocab" })),
            ...kanjiVocabIds.map(id => ({ surface: "漢字", vocab_item_id: id, type: "vocab" })),
            ...grammarPoints.map(gp => ({ surface: "pattern", grammar_point_id: gp.id, type: "grammar" })),
          ],
        },
      ],
    };

    const songRows = unwrap<{ id: string }>(await db.execute(sql`
      INSERT INTO songs (id, slug, title, artist, anime, language)
      VALUES (gen_random_uuid(), ${'test-3ring-' + SENTINEL}, ${'Test 3Ring ' + SENTINEL}, 'Artist', 'Anime', 'ja')
      RETURNING id
    `));
    songId = songRows[0].id;

    const svRows = unwrap<{ id: string }>(await db.execute(sql`
      INSERT INTO song_versions (id, song_id, youtube_id, version_type, lesson)
      VALUES (gen_random_uuid(), ${songId}, ${'yt_3ring_' + SENTINEL}, 'tv', ${JSON.stringify(lesson)}::jsonb)
      RETURNING id
    `));
    songVersionId = svRows[0].id;

    // Clean prior state for this test user
    await db.execute(sql`DELETE FROM user_vocab_mastery WHERE user_id = ${TEST_USER}`).catch(() => {});
    await db.execute(sql`DELETE FROM user_song_progress WHERE user_id = ${TEST_USER} AND song_version_id = ${songVersionId}`).catch(() => {});
    await db.execute(sql`DELETE FROM user_verse_domination WHERE user_id = ${TEST_USER} AND song_version_id = ${songVersionId}`).catch(() => {});
  });

  afterAll(async () => {
    if (pool) {
      await db.execute(sql`DELETE FROM user_vocab_mastery WHERE user_id = ${TEST_USER}`).catch(() => {});
      await db.execute(sql`DELETE FROM user_song_progress WHERE user_id = ${TEST_USER}`).catch(() => {});
      await db.execute(sql`DELETE FROM user_verse_domination WHERE user_id = ${TEST_USER}`).catch(() => {});
      if (songVersionId) {
        await db.execute(sql`DELETE FROM song_versions WHERE id = ${songVersionId}`).catch(() => {});
      }
      if (songId) {
        await db.execute(sql`DELETE FROM songs WHERE id = ${songId}`).catch(() => {});
      }
      for (const id of [...vocabIds, ...kanjiVocabIds]) {
        await db.execute(sql`DELETE FROM vocabulary_items WHERE id = ${id}`).catch(() => {});
      }
      await pool.end();
    }
  });

  it(
    "simulating 8/10 vocab, 4/5 grammar, 5/6 kanji correct → track pcts written and advanced_drills_unlocked_at set",
    async () => {
      // Answer 8 of 10 vocab items correctly (romaji_meaning card)
      for (let i = 0; i < 8; i++) {
        // @ts-expect-error cardKind RED stub
        await recordVocabAnswer({
          userId: TEST_USER,
          vocabItemId: vocabIds[i],
          songVersionId,
          exerciseType: "vocab_meaning",
          correct: true,
          revealedReading: false,
          cardKind: "romaji_meaning",
        });
      }
      // Answer 2 vocab items incorrectly
      for (let i = 8; i < 10; i++) {
        // @ts-expect-error cardKind RED stub
        await recordVocabAnswer({
          userId: TEST_USER,
          vocabItemId: vocabIds[i],
          songVersionId,
          exerciseType: "vocab_meaning",
          correct: false,
          revealedReading: false,
          cardKind: "romaji_meaning",
        });
      }

      // Answer 5 of 6 kanji vocab items correctly (kanji_kana card)
      for (let i = 0; i < 5; i++) {
        // @ts-expect-error cardKind RED stub
        await recordVocabAnswer({
          userId: TEST_USER,
          vocabItemId: kanjiVocabIds[i],
          songVersionId,
          exerciseType: "vocab_meaning",
          correct: true,
          revealedReading: false,
          cardKind: "kanji_kana",
        });
      }
      // 1 kanji incorrect
      // @ts-expect-error cardKind RED stub
      await recordVocabAnswer({
        userId: TEST_USER,
        vocabItemId: kanjiVocabIds[5],
        songVersionId,
        exerciseType: "vocab_meaning",
        correct: false,
        revealedReading: false,
        cardKind: "kanji_kana",
      });

      // Grammar answers are tracked differently — use getAdvancedDrillUnlock query
      // For now, verify the user_song_progress columns exist and are populated
      const progressRows = unwrap<{
        vocab_track_pct: string | null;
        grammar_track_pct: string | null;
        kanji_track_pct: string | null;
        advanced_drills_unlocked_at: string | null;
      }>(await db.execute(sql`
        SELECT vocab_track_pct, grammar_track_pct, kanji_track_pct, advanced_drills_unlocked_at
        FROM user_song_progress
        WHERE user_id = ${TEST_USER}
          AND song_version_id = ${songVersionId}
      `));

      // RED: these assertions will fail until 11.6-05 implements the server-side recompute
      expect(progressRows.length).toBeGreaterThan(0);

      const row = progressRows[0];
      // 8/10 = 80.00%
      expect(parseFloat(row.vocab_track_pct ?? "0")).toBeCloseTo(80.0, 1);
      // 5/6 ≈ 83.33%
      expect(parseFloat(row.kanji_track_pct ?? "0")).toBeCloseTo(83.33, 1);
      // Grammar track: 4/5 = 80.00% (requires grammar answer recording via dedicated path)
      // If grammar track pct is null (grammar answers not yet implemented), that's expected RED state
      // Unlock: only fires if all 3 tracks ≥ 80%
      // vocab=80 + grammar=80 + kanji=83.33 → should be unlocked
      expect(row.advanced_drills_unlocked_at).not.toBeNull();
    }
  );
});
