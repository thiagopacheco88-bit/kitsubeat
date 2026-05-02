// Phase 11.6 Wave 0 RED stub — implementation lands in 11.6-05 (recordVocabAnswer extension). DO NOT delete the failing assertions.
/**
 * tests/integration/setup-card-kind.ts
 *
 * Shared fixture factory for Phase 11.6 dual-card integration tests.
 *
 * Exports `seedDualCardFixtures(db, userId)` which inserts:
 *   - 1 vocab_item with kanji surface (飲む)
 *   - 1 hiragana-only vocab_item (のむ)
 *   - 1 grammar_point row
 *   - 1 song + 1 song_version with 3 verses:
 *       verse 1: 2 vocab items, no grammar
 *       verse 2: 1 vocab + 1 grammar + 1 kanji-bearing vocab
 *       verse 3: 0 items (auto-pass)
 *
 * The returned IDs are used by downstream integration tests.
 */

import { sql } from "drizzle-orm";
import type { Pool } from "@neondatabase/serverless";
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless";

export type NodeDb = ReturnType<typeof drizzlePool>;

export interface DualCardFixtures {
  songVersionId: string;
  kanjiVocabId: string;     // 飲む — has kanji
  hiraganaVocabId: string;  // のむ — no kanji
  grammarPointId: string;
  verses: Array<{ verse_number: number; vocab_ids: string[]; grammar_ids: string[] }>;
}

function unwrap<T = unknown>(r: unknown): T[] {
  return Array.isArray(r) ? (r as T[]) : ((r as { rows?: T[] }).rows ?? []);
}

function generateSentinel(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function seedDualCardFixtures(
  db: NodeDb,
  userId: string
): Promise<DualCardFixtures> {
  const sentinel = generateSentinel("11_6_W0");

  // 1. Insert kanji-bearing vocab item: 飲む (nomu — to drink)
  const kanjiRows = unwrap<{ id: string }>(await db.execute(sql`
    INSERT INTO vocabulary_items (
      id, dictionary_form, reading, romaji, part_of_speech,
      jlpt_level, is_katakana_loanword, meaning
    ) VALUES (
      gen_random_uuid(),
      ${'飲む_' + sentinel},
      'のむ',
      'nomu',
      'verb',
      'N5',
      false,
      '{"en":"to drink","pt-BR":"beber","es":"beber"}'::jsonb
    )
    RETURNING id
  `));
  const kanjiVocabId = kanjiRows[0].id;

  // 2. Insert hiragana-only vocab item: のむ (no kanji in surface)
  const hiraganaRows = unwrap<{ id: string }>(await db.execute(sql`
    INSERT INTO vocabulary_items (
      id, dictionary_form, reading, romaji, part_of_speech,
      jlpt_level, is_katakana_loanword, meaning
    ) VALUES (
      gen_random_uuid(),
      ${'のむ_' + sentinel},
      'のむ',
      'nomu',
      'verb',
      'N5',
      false,
      '{"en":"to drink (hiragana)","pt-BR":"beber","es":"beber"}'::jsonb
    )
    RETURNING id
  `));
  const hiraganaVocabId = hiraganaRows[0].id;

  // 3. Insert a song
  const songRows = unwrap<{ id: string }>(await db.execute(sql`
    INSERT INTO songs (
      id, slug, title, artist, anime, language
    ) VALUES (
      gen_random_uuid(),
      ${'test-song-' + sentinel},
      ${'Test Song ' + sentinel},
      'Test Artist',
      'Test Anime',
      'ja'
    )
    RETURNING id
  `));
  const songId = songRows[0].id;

  // 4. Build lesson JSONB with 3 verses:
  //    verse 1: kanjiVocabId + hiraganaVocabId (2 vocab, no grammar)
  //    verse 2: kanjiVocabId + 1 grammar point (populated below)
  //    verse 3: no items (auto-pass verse)
  // Grammar point sentinel — we'll insert it into vocabulary_items grammar area below
  // For now we generate an ID and build lesson with it

  // We use a fixed grammar_id placeholder that will be replaced after grammar insert
  // Phase 11.6 grammar lives in the song lesson JSONB. For integration test purposes
  // we use vocabulary_items for vocab and embed grammar inline in lesson JSONB.
  const grammarPointId = `grammar-${sentinel}`;

  const lesson = {
    vocabulary: [
      {
        vocab_item_id: kanjiVocabId,
        surface: "飲む",
        reading: "のむ",
        romaji: "nomu",
        meaning: { en: "to drink" },
        part_of_speech: "verb",
        jlpt_level: "N5",
      },
      {
        vocab_item_id: hiraganaVocabId,
        surface: "のむ",
        reading: "のむ",
        romaji: "nomu",
        meaning: { en: "to drink (hiragana)" },
        part_of_speech: "verb",
        jlpt_level: "N5",
      },
    ],
    grammar_points: [
      {
        id: grammarPointId,
        pattern: "～ます",
        explanation: "Polite present tense verb ending",
        jlpt_level: "N5",
      },
    ],
    verses: [
      {
        verse_number: 1,
        lyrics: "飲む のむ",
        translations: { en: "Drink drink" },
        tokens: [
          { surface: "飲む", vocab_item_id: kanjiVocabId, type: "vocab" },
          { surface: "のむ", vocab_item_id: hiraganaVocabId, type: "vocab" },
        ],
      },
      {
        verse_number: 2,
        lyrics: "飲みます",
        translations: { en: "I drink (polite)" },
        tokens: [
          { surface: "飲む", vocab_item_id: kanjiVocabId, type: "vocab" },
          { surface: "ます", grammar_point_id: grammarPointId, type: "grammar" },
        ],
      },
      {
        verse_number: 3,
        lyrics: "...",
        translations: { en: "..." },
        tokens: [],
      },
    ],
  };

  // 5. Insert song_version
  const svRows = unwrap<{ id: string }>(await db.execute(sql`
    INSERT INTO song_versions (
      id, song_id, youtube_id, version_type, lesson
    ) VALUES (
      gen_random_uuid(),
      ${songId},
      ${'test_yt_' + sentinel},
      'tv',
      ${JSON.stringify(lesson)}::jsonb
    )
    RETURNING id
  `));
  const songVersionId = svRows[0].id;

  const verses: DualCardFixtures["verses"] = [
    { verse_number: 1, vocab_ids: [kanjiVocabId, hiraganaVocabId], grammar_ids: [] },
    { verse_number: 2, vocab_ids: [kanjiVocabId], grammar_ids: [grammarPointId] },
    { verse_number: 3, vocab_ids: [], grammar_ids: [] },
  ];

  return {
    songVersionId,
    kanjiVocabId,
    hiraganaVocabId,
    grammarPointId,
    verses,
  };
}

/**
 * Teardown helper — removes test data seeded by seedDualCardFixtures.
 * Call in afterEach / afterAll.
 */
export async function teardownDualCardFixtures(
  db: NodeDb,
  fixtures: DualCardFixtures
): Promise<void> {
  // Remove in dependency order
  await db.execute(sql`
    DELETE FROM user_verse_domination WHERE song_version_id = ${fixtures.songVersionId}
  `).catch(() => {});
  await db.execute(sql`
    DELETE FROM user_song_progress WHERE song_version_id = ${fixtures.songVersionId}
  `).catch(() => {});
  await db.execute(sql`
    DELETE FROM user_vocab_mastery WHERE vocab_item_id IN (${fixtures.kanjiVocabId}, ${fixtures.hiraganaVocabId})
  `).catch(() => {});
  await db.execute(sql`
    DELETE FROM song_versions WHERE id = ${fixtures.songVersionId}
  `).catch(() => {});
  await db.execute(sql`
    DELETE FROM songs WHERE id = (SELECT song_id FROM song_versions WHERE id = ${fixtures.songVersionId})
  `).catch(() => {});
  await db.execute(sql`
    DELETE FROM vocabulary_items WHERE id IN (${fixtures.kanjiVocabId}, ${fixtures.hiraganaVocabId})
  `).catch(() => {});
}
