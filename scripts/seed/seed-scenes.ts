/**
 * seed-scenes.ts — Insert/upsert scenes from data/scenes-manifest.json into Neon.
 *
 * Unlike songs, scenes:
 *   - Use content_type = 'scene' on the songs row
 *   - Have a single version (version_type = 'full')
 *   - Use raw WhisperX timing — no Demucs stem separation
 *   - Store character name in the `artist` field
 *
 * Prerequisites per scene:
 *   - data/timing-cache/{slug}.json     WhisperX output (required for synced_lrc)
 *   - data/lessons-cache/{slug}.json    Claude-generated lesson (required for lesson JSONB)
 *
 * Usage:
 *   npx tsx scripts/seed/seed-scenes.ts             # all scenes in manifest
 *   npx tsx scripts/seed/seed-scenes.ts --slug=erwin-final-charge-aot
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import { fileURLToPath } from "url";
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import { songs, songVersions } from "../../src/lib/db/schema.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../../");

const MANIFEST_PATH = join(ROOT, "data/scenes-manifest.json");
const LESSONS_DIR = join(ROOT, "data/lessons-cache");
const TIMING_DIR = join(ROOT, "data/timing-cache");

interface SceneManifestEntry {
  slug: string;
  added_at: string;
  title: string;
  character: string;
  anime: string;
  season_info: string;
  youtube_id: string;
  genre_tags: string[];
  mood_tags: string[];
}

interface TimingWord {
  word: string;
  start: number;
  end: number;
  score: number;
}

interface TimingCache {
  slug: string;
  youtube_id?: string;
  words?: TimingWord[];
  segments?: Array<{ start: number; end: number; text: string }>;
}

interface Token {
  surface: string;
  reading?: string;
  romaji?: string;
  grammar?: string;
  part_of_speech?: string;
  meaning?: { en: string; es?: string; "pt-BR"?: string } | string;
  jlpt_level?: string;
}

interface Verse {
  verse_number: number;
  tokens: Array<Token>;
}

const EXCLUDED_GRAMMAR = new Set(["particle", "other"]);
const EXCLUDE_SURFACES = new Set([
  "だ", "です", "ます", "ません", "ました", "でした",
  "ている", "ていても", "んですか", "のか", "のだ", "んだ", "のに",
  "ですか", "ですよね", "ですよ", "でしょう",
  "ということですか", "ということだ", "そうだ", "そうです", "いや",
]);

/**
 * Rebuild lesson.vocabulary from verse tokens so every content word in the
 * dialogue is represented. The original lesson-generation prompt capped vocab
 * at ~10 "key words" — this extracts all unique content words from the tokens
 * which already have surface/reading/romaji/meaning/jlpt_level.
 */
function buildVocabFromVerses(verses: Verse[]) {
  const seen = new Set<string>();
  const vocab = [];
  for (const verse of verses) {
    const verseText = verse.tokens.map((t) => t.surface).join("");
    for (const token of verse.tokens) {
      if (seen.has(token.surface)) continue;
      if (EXCLUDED_GRAMMAR.has(token.grammar ?? "")) continue;
      if (EXCLUDE_SURFACES.has(token.surface)) continue;
      if (!token.surface.trim()) continue;
      if (/^[ぁ-ゖ]$/.test(token.surface)) continue;
      seen.add(token.surface);
      const meaning =
        typeof token.meaning === "string" ? { en: token.meaning } : token.meaning;
      vocab.push({
        surface: token.surface,
        reading: token.reading ?? token.surface,
        romaji: token.romaji ?? "",
        meaning: meaning ?? { en: "" },
        jlpt_level: token.jlpt_level ?? null,
        part_of_speech: token.part_of_speech ?? token.grammar ?? null,
        example_from_song: verseText,
        additional_examples: [],
      });
    }
  }
  return vocab;
}

function normalize(s: string): string {
  return s.replace(/[\s　、。！？・「」『』（）\-,.!?()"'…]/g, "").toLowerCase();
}

/**
 * Build synced_lrc with one entry per lesson verse, using WhisperX word-level
 * timing. This is what LyricsPanel.buildVerseTiming needs for auto-scroll.
 * The naive word-grouping approach (grouping by silence gaps) produced too few
 * lines and broke verse highlighting — always use this verse-aware approach.
 */
function buildSyncedLrcFromVerses(
  words: TimingWord[],
  verses: Verse[]
): { startMs: number; text: string }[] {
  if (!words.length || !verses.length) return [];

  const allChars: Array<{ char: string; wordIdx: number }> = [];
  for (let wi = 0; wi < words.length; wi++) {
    for (const ch of words[wi].word) {
      allChars.push({ char: ch, wordIdx: wi });
    }
  }
  const allText = normalize(allChars.map((c) => c.char).join(""));
  const result: { startMs: number; text: string }[] = [];
  let searchPos = 0;

  for (const verse of verses) {
    const verseText = normalize(verse.tokens.map((t) => t.surface).join(""));
    if (!verseText) continue;

    let matchPos = -1;
    for (let i = searchPos; i < allText.length; i++) {
      if (allText.startsWith(verseText.slice(0, Math.ceil(verseText.length * 0.5)), i)) {
        matchPos = i;
        break;
      }
    }
    if (matchPos === -1) {
      for (let i = 0; i < allText.length; i++) {
        if (allText.startsWith(verseText.slice(0, Math.min(3, verseText.length)), i)) {
          matchPos = i;
          break;
        }
      }
    }

    const rawText = verse.tokens.map((t) => t.surface).join("");
    if (matchPos !== -1 && allChars[matchPos]) {
      const startMs = Math.round(words[allChars[matchPos].wordIdx].start * 1000);
      result.push({ startMs, text: rawText });
      searchPos = matchPos + Math.floor(verseText.length * 0.8);
    } else {
      const lastMs = result.length > 0 ? result[result.length - 1].startMs + 3000 : 0;
      result.push({ startMs: lastMs, text: rawText });
    }
  }
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const slugArg = args.find((a) => a.startsWith("--slug="))?.split("=")[1];
  const slugFilter = slugArg ? new Set(slugArg.split(",")) : null;

  const manifest: SceneManifestEntry[] = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
  const entries = slugFilter ? manifest.filter((e) => slugFilter.has(e.slug)) : manifest;

  if (entries.length === 0) {
    console.error("No matching entries found.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzlePool({ client: pool });

  let inserted = 0;
  let skipped = 0;

  for (const entry of entries) {
    const lessonPath = join(LESSONS_DIR, `${entry.slug}.json`);
    const timingPath = join(TIMING_DIR, `${entry.slug}.json`);

    if (!existsSync(lessonPath)) {
      console.warn(`[SKIP] ${entry.slug} — no lesson cache (run lesson generation first)`);
      skipped++;
      continue;
    }

    const lesson = JSON.parse(readFileSync(lessonPath, "utf-8"));

    // Rebuild vocabulary from verse tokens — the lesson cache only has ~10 "key"
    // words from the generation prompt. Replace with all unique content words.
    if (Array.isArray(lesson.verses)) {
      lesson.vocabulary = buildVocabFromVerses(lesson.verses);
    }

    let syncedLrc: { startMs: number; text: string }[] | null = null;
    if (existsSync(timingPath)) {
      const timing: TimingCache = JSON.parse(readFileSync(timingPath, "utf-8"));
      const verses: Verse[] = lesson.verses ?? [];
      if (timing.words?.length && verses.length) {
        // Build one synced_lrc line per lesson verse — verse-level timing
        // for LyricsPanel auto-scroll. Do NOT use coarse word-gap grouping,
        // which produces too few lines and breaks verse highlighting.
        const built = buildSyncedLrcFromVerses(timing.words, verses);
        syncedLrc = built.length > 0 ? built : null;
      }
    }

    // Upsert the songs row
    const [songRow] = await db
      .insert(songs)
      .values({
        slug: entry.slug,
        title: entry.title,
        artist: entry.character,
        anime: entry.anime,
        season_info: entry.season_info,
        language: "ja",
        content_type: "scene",
        genre_tags: entry.genre_tags,
        mood_tags: entry.mood_tags,
        jlpt_level: lesson.jlpt_level ?? null,
        difficulty_tier: lesson.difficulty_tier ?? null,
        quality_status: "active",
        is_available: true,
      })
      .onConflictDoUpdate({
        target: songs.slug,
        set: {
          title: entry.title,
          artist: entry.character,
          anime: entry.anime,
          season_info: entry.season_info,
          content_type: "scene",
          genre_tags: entry.genre_tags,
          mood_tags: entry.mood_tags,
          jlpt_level: lesson.jlpt_level ?? null,
          difficulty_tier: lesson.difficulty_tier ?? null,
          updated_at: sql`now()`,
        },
      })
      .returning({ id: songs.id });

    const songId = songRow.id;

    // Upsert the song_versions row (single 'full' version per scene)
    await db
      .insert(songVersions)
      .values({
        song_id: songId,
        version_type: "full",
        youtube_id: entry.youtube_id,
        lesson: lesson,
        synced_lrc: syncedLrc,
        lyrics_offset_ms: 0,
        lyrics_source: "whisper_transcription",
        pipeline_status: "idle",
      })
      .onConflictDoUpdate({
        target: [songVersions.song_id, songVersions.version_type],
        set: {
          youtube_id: entry.youtube_id,
          lesson: lesson,
          synced_lrc: syncedLrc,
          pipeline_status: "idle",
        },
      });

    console.log(`[OK] ${entry.slug} — ${entry.title}`);
    inserted++;
  }

  console.log(`\nDone: ${inserted} upserted, ${skipped} skipped (no lesson cache).`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
