/**
 * Rebuilds lesson.vocabulary for all scenes from their verse tokens.
 * The original seed used a hardcoded "key vocabulary" list of ~10 words.
 * Tokens already have surface/reading/romaji/meaning/jlpt_level/grammar,
 * so we can build a complete vocab list without calling Claude.
 */

import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

const EXCLUDED_GRAMMAR = new Set(["particle", "other"]);

// Surfaces that are grammatical function words, not vocabulary
const EXCLUDE_SURFACES = new Set([
  "だ", "です", "ます", "ません", "ました", "でした",
  "ている", "ていても", "ていても", "ている",
  "んですか", "のか", "のだ", "んだ", "のに",
  "ですか", "ですよね", "ですよ", "でしょう",
  "ということですか", "ということだ",
  "そうだ", "そうです",
  "いや", "いや、",
]);

interface Token {
  surface: string;
  reading: string;
  romaji: string;
  grammar: string;
  meaning: { en: string; es?: string; "pt-BR"?: string } | string;
  jlpt_level?: string;
  part_of_speech?: string;
}

interface Verse {
  tokens: Token[];
  text?: string;
}

function buildVocabFromVerses(verses: Verse[]) {
  const seen = new Set<string>();
  const vocab = [];

  for (const verse of verses) {
    // Reconstruct verse text from tokens for example_from_song
    const verseText = verse.tokens.map((t) => t.surface).join("");

    for (const token of verse.tokens) {
      const key = token.surface;
      if (seen.has(key)) continue;
      if (EXCLUDED_GRAMMAR.has(token.grammar)) continue;
      if (EXCLUDE_SURFACES.has(token.surface)) continue;
      if (!token.surface.trim()) continue;
      // Skip pure hiragana single characters (usually grammatical)
      if (/^[ぁ-ゖ]$/.test(token.surface)) continue;

      seen.add(key);

      const meaning =
        typeof token.meaning === "string"
          ? { en: token.meaning }
          : token.meaning;

      vocab.push({
        surface: token.surface,
        reading: token.reading,
        romaji: token.romaji,
        meaning,
        jlpt_level: token.jlpt_level ?? null,
        part_of_speech: token.part_of_speech ?? token.grammar ?? null,
        example_from_song: verseText,
        additional_examples: [],
      });
    }
  }

  return vocab;
}

async function main() {
  const rows = await sql`
    SELECT s.id as song_id, s.slug, sv.id as version_id, sv.lesson
    FROM songs s
    JOIN song_versions sv ON sv.song_id = s.id
    WHERE s.content_type = 'scene'
    ORDER BY s.slug
  `;

  console.log(`Found ${rows.length} scenes to update\n`);

  for (const row of rows) {
    const lesson = row.lesson as { verses: Verse[]; vocabulary: unknown[] };
    const verses: Verse[] = lesson.verses ?? [];
    const oldCount = (lesson.vocabulary ?? []).length;

    const newVocab = buildVocabFromVerses(verses);

    await sql`
      UPDATE song_versions
      SET lesson = lesson || jsonb_build_object('vocabulary', ${JSON.stringify(newVocab)}::jsonb)
      WHERE id = ${row.version_id}
    `;

    console.log(
      `${row.slug}: ${oldCount} → ${newVocab.length} vocab words`
    );
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
