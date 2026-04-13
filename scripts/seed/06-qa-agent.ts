/**
 * 06-qa-agent.ts — Verse Coverage Agent (QA)
 *
 * Validates that every song in the database has complete content coverage:
 * - All required token fields: surface, reading, romaji, grammar, grammar_color, meaning
 * - All required translations: en, pt-BR, es
 * - Verse explanations: literal_meaning, start_time_ms, end_time_ms
 * - Vocabulary fields: part_of_speech, jlpt_level, example_from_song
 * - Song-level: jlpt_level, difficulty_tier, youtube_id, timing_data
 * - Schema version: content_schema_version === 1
 *
 * Exits with code 0 if zero gaps found; code 1 if any gaps exist.
 *
 * Flags:
 *   --verbose   Print per-song gap details to stdout
 *   --json      Output raw JSON report only (suppresses all other output)
 *
 * Usage:
 *   npx tsx scripts/seed/06-qa-agent.ts
 *   npx tsx scripts/seed/06-qa-agent.ts --verbose
 *   npx tsx scripts/seed/06-qa-agent.ts --json
 */

import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

// Load .env.local FIRST — before any DB imports
const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../../.env.local") });

import { getDb } from "../../src/lib/db/index.js";
import { songs } from "../../src/lib/db/schema.js";
import type { Lesson, Verse, Token, VocabEntry } from "../types/lesson.js";
import type { Song } from "../../src/lib/db/schema.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const CURRENT_SCHEMA_VERSION = 1;

type GapType = "missing" | "empty" | "invalid" | "outdated_schema";

interface Gap {
  slug: string;
  field: string;
  type: GapType;
  detail?: string;
}

interface TimingStatus {
  auto: number;
  manual: number;
}

interface CoverageReport {
  total_songs: number;
  songs_complete: number;
  songs_with_gaps: number;
  gaps_count: number;
  gaps: Gap[];
  timing_status: TimingStatus;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const REQUIRED_TRANSLATIONS = ["en", "pt-BR", "es"] as const;

const VALID_GRAMMAR_TYPES = new Set([
  "noun", "verb", "adjective", "adverb", "particle", "expression", "other",
]);

const VALID_GRAMMAR_COLORS = new Set([
  "blue", "red", "green", "orange", "grey", "none",
]);

const VALID_POS = new Set([
  "noun", "verb", "adjective", "adverb", "particle", "expression",
]);

const VALID_JLPT = new Set(["N5", "N4", "N3", "N2", "N1"]);

function isNonEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function validateToken(
  token: Token,
  gaps: Gap[],
  slug: string,
  verseNum: number,
  tokenIdx: number,
): void {
  const prefix = `verse[${verseNum}].tokens[${tokenIdx}]`;

  if (!isNonEmpty(token.surface)) {
    gaps.push({ slug, field: `${prefix}.surface`, type: "empty" });
  }
  if (!isNonEmpty(token.reading)) {
    gaps.push({ slug, field: `${prefix}.reading`, type: "empty" });
  }
  if (!isNonEmpty(token.romaji)) {
    gaps.push({ slug, field: `${prefix}.romaji`, type: "empty" });
  }
  if (!isNonEmpty(token.meaning)) {
    gaps.push({ slug, field: `${prefix}.meaning`, type: "empty" });
  }
  if (!VALID_GRAMMAR_TYPES.has(token.grammar)) {
    gaps.push({
      slug,
      field: `${prefix}.grammar`,
      type: "invalid",
      detail: `got: ${token.grammar}`,
    });
  }
  if (!VALID_GRAMMAR_COLORS.has(token.grammar_color)) {
    gaps.push({
      slug,
      field: `${prefix}.grammar_color`,
      type: "invalid",
      detail: `got: ${token.grammar_color}`,
    });
  }
}

function validateVerse(
  verse: Verse,
  gaps: Gap[],
  slug: string,
  verseIdx: number,
): void {
  const vn = verse.verse_number ?? verseIdx + 1;

  // Timing
  if (!(verse.start_time_ms > 0)) {
    gaps.push({
      slug,
      field: `verse[${vn}].start_time_ms`,
      type: verse.start_time_ms === 0 ? "empty" : "missing",
    });
  }
  if (!(verse.end_time_ms > 0)) {
    gaps.push({
      slug,
      field: `verse[${vn}].end_time_ms`,
      type: verse.end_time_ms === 0 ? "empty" : "missing",
    });
  }

  // Tokens
  if (!isNonEmpty(verse.tokens)) {
    gaps.push({ slug, field: `verse[${vn}].tokens`, type: "empty" });
  } else {
    verse.tokens.forEach((token, idx) =>
      validateToken(token, gaps, slug, vn, idx)
    );
  }

  // Translations
  for (const lang of REQUIRED_TRANSLATIONS) {
    const translation = verse.translations?.[lang];
    if (!isNonEmpty(translation)) {
      gaps.push({
        slug,
        field: `verse[${vn}].translations.${lang}`,
        type: verse.translations?.[lang] === undefined ? "missing" : "empty",
      });
    }
  }

  // Literal meaning
  if (!isNonEmpty(verse.literal_meaning)) {
    gaps.push({ slug, field: `verse[${vn}].literal_meaning`, type: "empty" });
  }
}

function validateVocabEntry(
  vocab: VocabEntry,
  gaps: Gap[],
  slug: string,
  idx: number,
): void {
  const prefix = `vocabulary[${idx}]`;

  if (!VALID_POS.has(vocab.part_of_speech)) {
    gaps.push({
      slug,
      field: `${prefix}.part_of_speech`,
      type: "invalid",
      detail: `got: ${vocab.part_of_speech}`,
    });
  }
  if (!VALID_JLPT.has(vocab.jlpt_level)) {
    gaps.push({
      slug,
      field: `${prefix}.jlpt_level`,
      type: vocab.jlpt_level ? "invalid" : "missing",
      detail: vocab.jlpt_level ? `got: ${vocab.jlpt_level}` : undefined,
    });
  }
  if (!isNonEmpty(vocab.example_from_song)) {
    gaps.push({ slug, field: `${prefix}.example_from_song`, type: "empty" });
  }
}

function validateSong(song: Song): Gap[] {
  const gaps: Gap[] = [];
  const slug = song.slug;

  // Song-level checks
  if (!song.jlpt_level) {
    gaps.push({ slug, field: "jlpt_level", type: "missing" });
  }
  if (!song.difficulty_tier) {
    gaps.push({ slug, field: "difficulty_tier", type: "missing" });
  }
  if (!isNonEmpty(song.youtube_id)) {
    gaps.push({ slug, field: "youtube_id", type: "empty" });
  }
  if (!song.timing_data) {
    gaps.push({ slug, field: "timing_data", type: "missing" });
  }
  if (song.content_schema_version !== CURRENT_SCHEMA_VERSION) {
    gaps.push({
      slug,
      field: "content_schema_version",
      type: "outdated_schema",
      detail: `expected: ${CURRENT_SCHEMA_VERSION}, got: ${song.content_schema_version}`,
    });
  }

  // Lesson-level checks
  const lesson = song.lesson as Lesson | null;
  if (!lesson) {
    gaps.push({ slug, field: "lesson", type: "missing" });
    return gaps; // can't validate sub-fields without lesson
  }

  if (!isNonEmpty(lesson.verses)) {
    gaps.push({ slug, field: "lesson.verses", type: "empty" });
  } else {
    lesson.verses.forEach((verse, idx) => validateVerse(verse, gaps, slug, idx));
  }

  if (!isNonEmpty(lesson.vocabulary)) {
    gaps.push({ slug, field: "lesson.vocabulary", type: "empty" });
  } else {
    lesson.vocabulary.forEach((vocab, idx) =>
      validateVocabEntry(vocab, gaps, slug, idx)
    );
  }

  if (!isNonEmpty(lesson.grammar_points)) {
    gaps.push({ slug, field: "lesson.grammar_points", type: "empty" });
  }

  return gaps;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function runCoverageAgent(): Promise<void> {
  const args = process.argv.slice(2);
  const isVerbose = args.includes("--verbose");
  const isJson = args.includes("--json");

  if (!isJson) {
    console.log("=== Verse Coverage Agent ===\n");
  }

  const db = getDb();
  const allSongs = await db.select().from(songs);

  if (!isJson) {
    console.log(`  Loaded ${allSongs.length} songs from database.\n`);
  }

  if (allSongs.length === 0) {
    const report: CoverageReport = {
      total_songs: 0,
      songs_complete: 0,
      songs_with_gaps: 0,
      gaps_count: 0,
      gaps: [],
      timing_status: { auto: 0, manual: 0 },
    };

    if (isJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log("  No songs in database. Run the content pipeline first.");
      console.log("  (scripts/seed/01-build-manifest.ts through 05-insert-db.ts)");
    }
    process.exit(0);
  }

  // Timing status tally
  const timingStatus: TimingStatus = { auto: 0, manual: 0 };
  for (const song of allSongs) {
    if (song.timing_verified === "manual") timingStatus.manual++;
    else timingStatus.auto++;
  }

  // Validate each song
  const allGaps: Gap[] = [];
  const songsWithGaps: string[] = [];

  for (const song of allSongs) {
    const songGaps = validateSong(song);
    if (songGaps.length > 0) {
      songsWithGaps.push(song.slug);
      allGaps.push(...songGaps);

      if (isVerbose && !isJson) {
        console.log(`  [GAPS] ${song.slug} — ${songGaps.length} gap(s):`);
        for (const gap of songGaps) {
          const detail = gap.detail ? ` (${gap.detail})` : "";
          console.log(`    - [${gap.type}] ${gap.field}${detail}`);
        }
      } else if (!isJson) {
        process.stdout.write(`  [GAPS] ${song.slug}\n`);
      }
    } else if (!isJson) {
      if (isVerbose) {
        console.log(`  [OK]   ${song.slug}`);
      }
    }
  }

  const report: CoverageReport = {
    total_songs: allSongs.length,
    songs_complete: allSongs.length - songsWithGaps.length,
    songs_with_gaps: songsWithGaps.length,
    gaps_count: allGaps.length,
    gaps: allGaps,
    timing_status: timingStatus,
  };

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log("\n=== Coverage Report ===");
    console.log(`  Total songs:       ${report.total_songs}`);
    console.log(`  Complete songs:    ${report.songs_complete}`);
    console.log(`  Songs with gaps:   ${report.songs_with_gaps}`);
    console.log(`  Total gaps:        ${report.gaps_count}`);
    console.log(
      `  Timing status:     auto=${timingStatus.auto}, manual=${timingStatus.manual}`
    );

    if (timingStatus.auto > 0) {
      console.log(
        `\n  WARN: ${timingStatus.auto} song(s) have auto-generated timing (not yet reviewed)`
      );
    }

    if (report.songs_with_gaps === 0) {
      console.log("\n  RESULT: All songs complete. Phase 1 content QA passed.");
    } else {
      console.log(
        `\n  RESULT: ${report.songs_with_gaps} song(s) have incomplete content. Fix gaps before Phase 1 is complete.`
      );
    }
  }

  process.exit(report.gaps_count > 0 ? 1 : 0);
}

runCoverageAgent().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
