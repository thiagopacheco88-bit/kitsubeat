/**
 * 06-qa-agent.ts — Verse Coverage Agent (QA)
 *
 * Validates that every song version in the database has complete content coverage:
 * - All required token fields: surface, reading, romaji, grammar, grammar_color, meaning
 * - All required translations: en, pt-BR, es
 * - Verse explanations: literal_meaning, start_time_ms, end_time_ms
 * - Vocabulary fields: part_of_speech, jlpt_level, example_from_song
 * - Song-level: jlpt_level, difficulty_tier
 * - Version-level: youtube_id, timing_data
 * - Schema version: content_schema_version === 1
 * - vocab_item_id integrity: every vocabulary entry maps to a real
 *   vocabulary_items.id row (delegates to checkVocabIdentity in
 *   06-qa-uuid-integrity.ts) — DATA-02
 * - furigana completeness: every token whose surface contains kanji must have a
 *   non-empty reading containing hiragana/katakana
 *
 * TV-pack handling: rows where `song_versions.lesson IS NULL` are skipped and
 * counted separately under "Skipped N TV-pack versions awaiting WhisperX
 * lesson generation." They never count toward gaps. ~60 such rows exist today
 * (per project context).
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
import { songs, songVersions } from "../../src/lib/db/schema.js";
import { eq } from "drizzle-orm";
import type { Lesson, Verse, Token, VocabEntry } from "../types/lesson.js";
import type { Song, SongVersion } from "../../src/lib/db/schema.js";
import { checkVocabIdentity } from "./06-qa-uuid-integrity.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const CURRENT_SCHEMA_VERSION = 1;

type GapType = "missing" | "empty" | "invalid" | "outdated_schema";

interface Gap {
  slug: string;
  version: string;
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
  total_versions: number;
  versions_complete: number;
  versions_with_gaps: number;
  versions_skipped_tv: number;
  skipped_tv_versions: number; // alias kept for downstream tooling per plan 08.1-04
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

/** Kanji ideographs (CJK Unified Ideographs basic block). */
const KANJI_RE = /[\u4e00-\u9fff]/;
/** Hiragana + katakana (incl. half-width kana for safety). */
const KANA_RE = /[\u3040-\u30ff\uff66-\uff9f]/;

/**
 * Returns true when the surface includes any kanji ideograph.
 * Surfaces that are pure kana, romaji, punctuation, or symbols don't need a
 * furigana reading — the surface IS the reading.
 */
function containsKanji(surface: string | undefined | null): boolean {
  return typeof surface === "string" && KANJI_RE.test(surface);
}

/** Returns true when reading contains at least one hiragana/katakana character. */
function readingHasKana(reading: string | undefined | null): boolean {
  return typeof reading === "string" && KANA_RE.test(reading);
}

function validateToken(
  token: Token,
  gaps: Gap[],
  slug: string,
  version: string,
  verseNum: number,
  tokenIdx: number,
): void {
  const prefix = `verse[${verseNum}].tokens[${tokenIdx}]`;

  if (!isNonEmpty(token.surface)) {
    gaps.push({ slug, version, field: `${prefix}.surface`, type: "empty" });
  }
  if (!isNonEmpty(token.reading)) {
    gaps.push({ slug, version, field: `${prefix}.reading`, type: "empty" });
  } else if (containsKanji(token.surface) && !readingHasKana(token.reading)) {
    // Furigana completeness: a surface containing kanji MUST have a reading
    // that includes at least one hiragana/katakana character. A kanji-only or
    // romaji-only "reading" is unusable for furigana display.
    gaps.push({
      slug,
      version,
      field: `${prefix}.reading`,
      type: "invalid",
      detail: `surface=${token.surface}; reading=${token.reading} (no kana)`,
    });
  }
  if (!isNonEmpty(token.romaji)) {
    gaps.push({ slug, version, field: `${prefix}.romaji`, type: "empty" });
  }
  if (!isNonEmpty(token.meaning)) {
    gaps.push({ slug, version, field: `${prefix}.meaning`, type: "empty" });
  }
  if (!VALID_GRAMMAR_TYPES.has(token.grammar)) {
    gaps.push({
      slug, version,
      field: `${prefix}.grammar`,
      type: "invalid",
      detail: `got: ${token.grammar}`,
    });
  }
  if (!VALID_GRAMMAR_COLORS.has(token.grammar_color)) {
    gaps.push({
      slug, version,
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
  version: string,
  verseIdx: number,
): void {
  const vn = verse.verse_number ?? verseIdx + 1;

  // Timing
  if (!(verse.start_time_ms > 0)) {
    gaps.push({
      slug, version,
      field: `verse[${vn}].start_time_ms`,
      type: verse.start_time_ms === 0 ? "empty" : "missing",
    });
  }
  if (!(verse.end_time_ms > 0)) {
    gaps.push({
      slug, version,
      field: `verse[${vn}].end_time_ms`,
      type: verse.end_time_ms === 0 ? "empty" : "missing",
    });
  }

  // Tokens
  if (!isNonEmpty(verse.tokens)) {
    gaps.push({ slug, version, field: `verse[${vn}].tokens`, type: "empty" });
  } else {
    verse.tokens.forEach((token, idx) =>
      validateToken(token, gaps, slug, version, vn, idx)
    );
  }

  // Translations
  for (const lang of REQUIRED_TRANSLATIONS) {
    const translation = verse.translations?.[lang];
    if (!isNonEmpty(translation)) {
      gaps.push({
        slug, version,
        field: `verse[${vn}].translations.${lang}`,
        type: verse.translations?.[lang] === undefined ? "missing" : "empty",
      });
    }
  }

  // Literal meaning
  if (!isNonEmpty(verse.literal_meaning)) {
    gaps.push({ slug, version, field: `verse[${vn}].literal_meaning`, type: "empty" });
  }
}

function validateVocabEntry(
  vocab: VocabEntry,
  gaps: Gap[],
  slug: string,
  version: string,
  idx: number,
): void {
  const prefix = `vocabulary[${idx}]`;

  if (!VALID_POS.has(vocab.part_of_speech)) {
    gaps.push({
      slug, version,
      field: `${prefix}.part_of_speech`,
      type: "invalid",
      detail: `got: ${vocab.part_of_speech}`,
    });
  }
  if (!VALID_JLPT.has(vocab.jlpt_level)) {
    gaps.push({
      slug, version,
      field: `${prefix}.jlpt_level`,
      type: vocab.jlpt_level ? "invalid" : "missing",
      detail: vocab.jlpt_level ? `got: ${vocab.jlpt_level}` : undefined,
    });
  }
  if (!isNonEmpty(vocab.example_from_song)) {
    gaps.push({ slug, version, field: `${prefix}.example_from_song`, type: "empty" });
  }
}

async function validateVersion(
  db: ReturnType<typeof getDb>,
  song: Song,
  ver: SongVersion,
): Promise<Gap[]> {
  const gaps: Gap[] = [];
  const slug = song.slug;
  const version = ver.version_type;

  // Song-level checks
  if (!song.jlpt_level) {
    gaps.push({ slug, version, field: "jlpt_level", type: "missing" });
  }
  if (!song.difficulty_tier) {
    gaps.push({ slug, version, field: "difficulty_tier", type: "missing" });
  }
  if (song.content_schema_version !== CURRENT_SCHEMA_VERSION) {
    gaps.push({
      slug, version,
      field: "content_schema_version",
      type: "outdated_schema",
      detail: `expected: ${CURRENT_SCHEMA_VERSION}, got: ${song.content_schema_version}`,
    });
  }

  // Version-level checks
  if (!isNonEmpty(ver.youtube_id)) {
    gaps.push({ slug, version, field: "youtube_id", type: "empty" });
  }
  if (!ver.timing_data) {
    gaps.push({ slug, version, field: "timing_data", type: "missing" });
  }

  // Lesson-level checks
  const lesson = ver.lesson as Lesson | null;
  if (!lesson) {
    gaps.push({ slug, version, field: "lesson", type: "missing" });
    return gaps;
  }

  if (!isNonEmpty(lesson.verses)) {
    gaps.push({ slug, version, field: "lesson.verses", type: "empty" });
  } else {
    lesson.verses.forEach((verse, idx) => validateVerse(verse, gaps, slug, version, idx));
  }

  if (!isNonEmpty(lesson.vocabulary)) {
    gaps.push({ slug, version, field: "lesson.vocabulary", type: "empty" });
  } else {
    lesson.vocabulary.forEach((vocab, idx) =>
      validateVocabEntry(vocab, gaps, slug, version, idx)
    );

    // vocab_item_id integrity (DATA-02): every vocabulary entry's UUID must
    // resolve to a real vocabulary_items.id row. Imported from the standalone
    // module so the same logic powers `npm run test:qa:uuid`.
    const uuidGaps = await checkVocabIdentity(db, slug, version, lesson);
    for (const ug of uuidGaps) {
      gaps.push({
        slug: ug.slug,
        version: ug.version,
        field: ug.field,
        type: ug.type,
        detail: ug.detail,
      });
    }
  }

  if (!isNonEmpty(lesson.grammar_points)) {
    gaps.push({ slug, version, field: "lesson.grammar_points", type: "empty" });
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
  const allVersions = await db.select().from(songVersions);

  // Build lookup: song_id -> Song
  const songById = new Map<string, Song>();
  for (const s of allSongs) songById.set(s.id, s);

  if (!isJson) {
    console.log(`  Loaded ${allSongs.length} songs, ${allVersions.length} versions from database.\n`);
  }

  if (allVersions.length === 0) {
    const report: CoverageReport = {
      total_songs: allSongs.length,
      total_versions: 0,
      versions_complete: 0,
      versions_with_gaps: 0,
      versions_skipped_tv: 0,
      skipped_tv_versions: 0,
      gaps_count: 0,
      gaps: [],
      timing_status: { auto: 0, manual: 0 },
    };

    if (isJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log("  No song versions in database. Run the content pipeline first.");
    }
    process.exit(0);
  }

  // Timing status tally
  const timingStatus: TimingStatus = { auto: 0, manual: 0 };
  for (const ver of allVersions) {
    if (ver.timing_verified === "manual") timingStatus.manual++;
    else timingStatus.auto++;
  }

  // Validate each version
  const allGaps: Gap[] = [];
  const versionsWithGaps: string[] = [];
  let skippedTv = 0;

  for (const ver of allVersions) {
    const song = songById.get(ver.song_id);
    if (!song) continue;

    const label = `${song.slug}:${ver.version_type}`;

    // TV-pack skip: per project context, ~60 TV-version rows currently have
    // `youtube_id` set but `lesson=NULL` — they are queued for WhisperX
    // batching. Heuristic: `version_type === "tv"` AND `lesson === null`.
    // These rows must NOT count as gaps; they are tracked separately.
    if (ver.version_type === "tv" && ver.lesson === null) {
      skippedTv++;
      if (isVerbose && !isJson) {
        console.log(`  [SKIP] ${label} — TV-pack lesson pending WhisperX`);
      }
      continue;
    }

    const versionGaps = await validateVersion(db, song, ver);
    if (versionGaps.length > 0) {
      versionsWithGaps.push(label);
      allGaps.push(...versionGaps);

      if (isVerbose && !isJson) {
        console.log(`  [GAPS] ${label} — ${versionGaps.length} gap(s):`);
        for (const gap of versionGaps) {
          const detail = gap.detail ? ` (${gap.detail})` : "";
          console.log(`    - [${gap.type}] ${gap.field}${detail}`);
        }
      } else if (!isJson) {
        process.stdout.write(`  [GAPS] ${label}\n`);
      }
    } else if (!isJson && isVerbose) {
      console.log(`  [OK]   ${label}`);
    }
  }

  const report: CoverageReport = {
    total_songs: allSongs.length,
    total_versions: allVersions.length,
    versions_complete:
      allVersions.length - versionsWithGaps.length - skippedTv,
    versions_with_gaps: versionsWithGaps.length,
    versions_skipped_tv: skippedTv,
    skipped_tv_versions: skippedTv,
    gaps_count: allGaps.length,
    gaps: allGaps,
    timing_status: timingStatus,
  };

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log("\n=== Coverage Report ===");
    console.log(`  Total songs:            ${report.total_songs}`);
    console.log(`  Total versions:         ${report.total_versions}`);
    console.log(`  Complete versions:      ${report.versions_complete}`);
    console.log(`  Versions with gaps:     ${report.versions_with_gaps}`);
    console.log(`  Total gaps:             ${report.gaps_count}`);
    console.log(
      `  Timing status:          auto=${timingStatus.auto}, manual=${timingStatus.manual}`
    );
    console.log(
      `  Skipped ${report.versions_skipped_tv} TV-pack versions awaiting WhisperX lesson generation.`
    );

    if (timingStatus.auto > 0) {
      console.log(
        `\n  WARN: ${timingStatus.auto} version(s) have auto-generated timing (not yet reviewed)`
      );
    }

    if (report.versions_with_gaps === 0) {
      console.log("\n  RESULT: All versions complete. Content QA passed.");
    } else {
      console.log(
        `\n  RESULT: ${report.versions_with_gaps} version(s) have incomplete content.`
      );
    }
  }

  process.exit(report.gaps_count > 0 ? 1 : 0);
}

runCoverageAgent().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
