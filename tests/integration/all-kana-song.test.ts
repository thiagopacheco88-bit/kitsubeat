// Phase 11.6 Wave 0 RED stub — implementation lands in 11.6-05 (recordVocabAnswer extension). DO NOT delete the failing assertions.
/**
 * tests/integration/all-kana-song.test.ts
 *
 * SPEC-REQ-16: All-kana song edge case handling.
 *
 * Tests that for a song where every vocab surface is hiragana-only:
 *   (a) getAdvancedDrillUnlock returns true when only vocab_track_pct ≥ 80 AND grammar_track_pct ≥ 80
 *       (kanji clause auto-passes)
 *   (b) verse_domination triggers without any kanji answers required
 *
 * RED: These tests will fail until:
 *   - drizzle/0017 migration applied (user_verse_domination table + track pct columns)
 *   - getAdvancedDrillUnlock function exists that handles the all-kana auto-pass
 *   - recordVocabAnswer + verse-domination logic skip kanji requirement for hiragana vocab
 *
 * Failure modes expected at this stage:
 *   - Import error: "getAdvancedDrillUnlock" does not exist in exercises
 *   - OR runtime error on user_verse_domination / track pct columns
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless";
import { recordVocabAnswer, getAdvancedDrillUnlock } from "@/app/actions/exercises";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

function unwrap<T = unknown>(r: unknown): T[] {
  return Array.isArray(r) ? (r as T[]) : ((r as { rows?: T[] }).rows ?? []);
}

describeIfTestDb("SPEC-REQ-16: all-kana song (no kanji vocab, kanji clause auto-passes)", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzlePool>;
  let songVersionId: string;
  let songId: string;
  // hiragana-only vocab — surface has no kanji codepoints
  const hiraganaVocabIds: string[] = [];
  const TEST_USER = "test-user-allkana-11-6";
  const SENTINEL = `allkana_${Date.now()}`;

  beforeEach(async () => {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL! });
    db = drizzlePool(pool);
    hiraganaVocabIds.length = 0;

    // Create 5 hiragana-only vocab items (no kanji in surface)
    for (let i = 0; i < 5; i++) {
      const rows = unwrap<{ id: string }>(await db.execute(sql`
        INSERT INTO vocabulary_items (
          id, dictionary_form, reading, romaji, part_of_speech,
          jlpt_level, is_katakana_loanword, meaning
        ) VALUES (
          gen_random_uuid(),
          ${'allkana_' + SENTINEL + '_' + i},
          ${'ひらがな' + i},
          ${'hiragana' + i},
          'noun',
          'N5',
          false,
          '{"en":"kana word"}'::jsonb
        )
        RETURNING id
      `));
      hiraganaVocabIds.push(rows[0].id);
    }

    // Lesson: all vocab surfaces are hiragana-only (no kanji codepoints)
    const lesson = {
      vocabulary: hiraganaVocabIds.map((id, i) => ({
        vocab_item_id: id,
        // surface is hiragana-only — auto-pass for kanji
        surface: `ひらがな${i}`,
        reading: `ひらがな${i}`,
        romaji: `hiragana${i}`,
        meaning: { en: `kana word ${i}` },
        part_of_speech: "noun",
        jlpt_level: "N5",
      })),
      grammar_points: [
        {
          id: `grammar-${SENTINEL}-0`,
          pattern: "～です",
          explanation: "Copula",
          jlpt_level: "N5",
        },
      ],
      verses: [
        {
          verse_number: 1,
          lyrics: "ひらがな0 ひらがな1",
          translations: { en: "hiragana words" },
          tokens: [
            { surface: "ひらがな0", vocab_item_id: hiraganaVocabIds[0], type: "vocab" },
            { surface: "ひらがな1", vocab_item_id: hiraganaVocabIds[1], type: "vocab" },
          ],
        },
      ],
    };

    const songRows = unwrap<{ id: string }>(await db.execute(sql`
      INSERT INTO songs (id, slug, title, artist, anime, language)
      VALUES (gen_random_uuid(), ${'test-allkana-' + SENTINEL}, ${'All Kana Song ' + SENTINEL}, 'Artist', 'Anime', 'ja')
      RETURNING id
    `));
    songId = songRows[0].id;

    const svRows = unwrap<{ id: string }>(await db.execute(sql`
      INSERT INTO song_versions (id, song_id, youtube_id, version_type, lesson)
      VALUES (gen_random_uuid(), ${songId}, ${'yt_allkana_' + SENTINEL}, 'tv', ${JSON.stringify(lesson)}::jsonb)
      RETURNING id
    `));
    songVersionId = svRows[0].id;

    // Clean prior state
    await db.execute(sql`DELETE FROM user_vocab_mastery WHERE user_id = ${TEST_USER}`).catch(() => {});
    await db.execute(sql`DELETE FROM user_song_progress WHERE user_id = ${TEST_USER}`).catch(() => {});
    await db.execute(sql`DELETE FROM user_verse_domination WHERE user_id = ${TEST_USER}`).catch(() => {});
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
      for (const id of hiraganaVocabIds) {
        await db.execute(sql`DELETE FROM vocabulary_items WHERE id = ${id}`).catch(() => {});
      }
      await pool.end();
    }
  });

  it(
    "(a) getAdvancedDrillUnlock returns true when vocab_track_pct ≥ 80 AND grammar_track_pct ≥ 80 — kanji auto-passes because all vocab surfaces are hiragana-only",
    async () => {
      // Answer 5/5 hiragana vocab correctly on romaji_meaning card (100% vocab track)
      for (const id of hiraganaVocabIds) {
        await recordVocabAnswer({
          userId: TEST_USER,
          vocabItemId: id,
          songVersionId,
          exerciseType: "vocab_meaning",
          correct: true,
          revealedReading: false,
          responseTimeMs: 1000,
          cardKind: "romaji_meaning",
        });
      }

      const unlocked = await getAdvancedDrillUnlock(songVersionId, TEST_USER);

      // With all-kana song: vocab=100%, grammar≥80% (auto from fixture), kanji auto-passes
      expect(unlocked).toBe(true);
    }
  );

  it(
    "(b) verse domination triggers for hiragana-only verse without any kanji answers required",
    async () => {
      // Verse 1 has only hiragana vocab (no kanji-bearing items) — dominate after 2 vocab correct answers
      await recordVocabAnswer({
        userId: TEST_USER,
        vocabItemId: hiraganaVocabIds[0],
        songVersionId,
        exerciseType: "vocab_meaning",
        correct: true,
        revealedReading: false,
        responseTimeMs: 1000,
        cardKind: "romaji_meaning",
      });
      const result = await recordVocabAnswer({
        userId: TEST_USER,
        vocabItemId: hiraganaVocabIds[1],
        songVersionId,
        exerciseType: "vocab_meaning",
        correct: true,
        revealedReading: false,
        responseTimeMs: 1000,
        cardKind: "romaji_meaning",
      });

      // Kanji auto-pass: verse 1 should be dominated after only vocab answers (no kanji required)
      expect(result.versesDominatedNow).toBeDefined();
      expect(result.versesDominatedNow).toContain(1);

      // Verify DB row
      const rows = unwrap<{ dominated_at: string }>(
        await db.execute(sql`
          SELECT dominated_at
          FROM user_verse_domination
          WHERE user_id = ${TEST_USER}
            AND song_version_id = ${songVersionId}
            AND verse_number = 1
        `)
      );
      expect(rows).toHaveLength(1);
    }
  );

  it(
    "all vocab surfaces are hiragana-only (no kanji codepoints) — auto-pass assertion",
    () => {
      // Structural check: every surface in our fixture is hiragana-only
      const hasKanji = (s: string) => /[一-龯㐀-䶿]/.test(s);
      // hiragana surfaces used: ひらがな0..4
      const surfaces = hiraganaVocabIds.map((_, i) => `ひらがな${i}`);
      for (const surface of surfaces) {
        expect(hasKanji(surface)).toBe(false);
      }
    }
  );
});
