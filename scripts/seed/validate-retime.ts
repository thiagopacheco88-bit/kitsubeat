/**
 * validate-retime.ts — Post-retime sanity validator.
 *
 * Runs three read-only checks against every song that has both a lesson file
 * and a timing-cache file, and writes a report for human triage. Makes NO
 * changes to lesson or timing data.
 *
 * Checks:
 *   1. intro_padding  — first WhisperX word starts > 3s into the video. Means
 *                       the video has a non-musical intro (title card, pre-roll)
 *                       and any timing expected to start at 0 will drift.
 *   2. per_verse_drift — absolute: verse actual duration vs. expected duration
 *                        based on char count × song avg ms/char. Flags verses
 *                        running 2x longer or shorter than their char count
 *                        predicts (likely a guitar solo, bridge, or the retime
 *                        cursor skipped past the real verse).
 *                        relative: if synced_lrc exists, compare the gap
 *                        between consecutive verses to the synced_lrc gap for
 *                        the same pair. Large delta = extra instrumental
 *                        section in this audio vs. the reference.
 *   3. cursor_skip     — for each verse, count how many of its distinctive
 *                        kanji actually appear in the WhisperX word stream
 *                        WITHIN that verse's start/end window. If coverage is
 *                        under 60%, the verse is likely mistimed: the retime
 *                        cursor jumped past the real singing of those kanji.
 *
 * Output:
 *   data/retime-validation-report.json — per-song flags and per-verse detail.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/validate-retime.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/validate-retime.ts --version tv
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/validate-retime.ts --slug <slug>
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

// ─────────────────────────────────────────────────────────────────────────────
// Thresholds — tuned conservatively; revisit after first report pass.
// ─────────────────────────────────────────────────────────────────────────────

const INTRO_PADDING_THRESHOLD_S = 3.0;
/** Verse is flagged if actual_ms / expected_ms outside [0.5, 2.0]. */
const DRIFT_FACTOR_MIN = 0.5;
const DRIFT_FACTOR_MAX = 2.0;
/** Gap between verses is flagged if |actual - reference| > 2000ms. */
const RELATIVE_GAP_DELTA_MS = 2000;
/** Verse kanji coverage within its own window must be >= this to pass. */
const CURSOR_COVERAGE_MIN = 0.6;

// ─────────────────────────────────────────────────────────────────────────────
// Args
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const versionArg = (() => {
  const idx = args.indexOf("--version");
  const raw = idx !== -1 ? args[idx + 1] : null;
  if (raw === "tv" || raw === "full") return raw;
  if (raw !== null) {
    console.error(`[error] --version must be 'tv' or 'full', got: ${raw}`);
    process.exit(1);
  }
  return "full" as const;
})();
const slugFilter = (() => {
  const idx = args.indexOf("--slug");
  return idx !== -1 ? args[idx + 1] ?? null : null;
})();

const suffix = versionArg === "tv" ? "-tv" : "";
const LESSONS_DIR = `data/lessons-cache${suffix}`;
const TIMING_DIR = `data/timing-cache${suffix}`;
const LYRICS_DIR = `data/lyrics-cache${suffix}`;
const REPORT_PATH = `data/retime-validation-report${suffix}.json`;

// ─────────────────────────────────────────────────────────────────────────────
// Types (local — don't depend on lesson schema to keep this validator portable)
// ─────────────────────────────────────────────────────────────────────────────

type Token = { surface: string };
type Verse = {
  verse_number: number;
  start_time_ms?: number | null;
  end_time_ms?: number | null;
  tokens: Token[];
};
type Lesson = { verses: Verse[] };

type Word = { word: string; start: number; end: number; score?: number };
type Timing = { words: Word[] };

type SyncedLine = { startMs: number; text: string };
type LyricsCache = { synced_lrc?: SyncedLine[] | null };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const KANJI_RE = /[\u4E00-\u9FFF\u3400-\u4DBF]/;

function isKanji(ch: string): boolean {
  return KANJI_RE.test(ch);
}

function verseChars(v: Verse): string[] {
  return v.tokens
    .map((t) => t.surface ?? "")
    .join("")
    .split("")
    .filter((c) => c.trim().length > 0);
}

function verseKanjiSet(v: Verse): Set<string> {
  return new Set(verseChars(v).filter(isKanji));
}

function wordsInWindow(words: Word[], startMs: number, endMs: number): Word[] {
  const s = startMs / 1000;
  const e = endMs / 1000;
  return words.filter((w) => w.end >= s && w.start <= e);
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual checks
// ─────────────────────────────────────────────────────────────────────────────

interface IntroFlag {
  flagged: boolean;
  first_word_start_s: number;
}

function checkIntroPadding(timing: Timing): IntroFlag {
  const first = timing.words[0];
  if (!first) return { flagged: false, first_word_start_s: 0 };
  return {
    flagged: first.start > INTRO_PADDING_THRESHOLD_S,
    first_word_start_s: Number(first.start.toFixed(2)),
  };
}

interface VerseDriftDetail {
  verse_number: number;
  actual_ms: number;
  expected_ms: number;
  factor: number;
  flagged: boolean;
}

function checkAbsoluteDrift(lesson: Lesson): {
  flagged_count: number;
  verses: VerseDriftDetail[];
  song_ms_per_char: number;
} {
  // Establish a per-song ms/char baseline from verses that have timing.
  let totalMs = 0;
  let totalChars = 0;
  for (const v of lesson.verses) {
    const s = v.start_time_ms ?? 0;
    const e = v.end_time_ms ?? 0;
    const chars = verseChars(v).length;
    if (e > s && chars > 0) {
      totalMs += e - s;
      totalChars += chars;
    }
  }
  const msPerChar = totalChars > 0 ? totalMs / totalChars : 0;

  const details: VerseDriftDetail[] = [];
  let flaggedCount = 0;
  for (const v of lesson.verses) {
    const actual = (v.end_time_ms ?? 0) - (v.start_time_ms ?? 0);
    const chars = verseChars(v).length;
    const expected = chars * msPerChar;
    const factor = expected > 0 ? actual / expected : 0;
    const flagged =
      actual > 0 && expected > 0 && (factor < DRIFT_FACTOR_MIN || factor > DRIFT_FACTOR_MAX);
    if (flagged) flaggedCount++;
    details.push({
      verse_number: v.verse_number,
      actual_ms: Math.round(actual),
      expected_ms: Math.round(expected),
      factor: Number(factor.toFixed(2)),
      flagged,
    });
  }
  return { flagged_count: flaggedCount, verses: details, song_ms_per_char: Math.round(msPerChar) };
}

interface GapDelta {
  between: [number, number];
  actual_gap_ms: number;
  reference_gap_ms: number;
  delta_ms: number;
  flagged: boolean;
}

function checkRelativeDrift(lesson: Lesson, lyrics: LyricsCache | null): {
  flagged_count: number;
  gaps: GapDelta[];
  have_reference: boolean;
} {
  const synced = lyrics?.synced_lrc;
  if (!synced || !Array.isArray(synced) || synced.length < 2) {
    return { flagged_count: 0, gaps: [], have_reference: false };
  }
  // Reference: use gap between first sync line of each verse — we don't have
  // a verse→synced_lrc map, so approximate with evenly-spaced line indices.
  // If verse count matches sync line count we pair 1:1; otherwise we skip.
  const verses = lesson.verses;
  if (verses.length < 2 || verses.length > synced.length) {
    return { flagged_count: 0, gaps: [], have_reference: false };
  }
  // Sample reference sync lines at verse-proportional positions
  const refStarts: number[] = [];
  for (let i = 0; i < verses.length; i++) {
    const idx = Math.round((i / Math.max(1, verses.length - 1)) * (synced.length - 1));
    refStarts.push(synced[idx].startMs);
  }

  const gaps: GapDelta[] = [];
  let flagged = 0;
  for (let i = 0; i < verses.length - 1; i++) {
    const a = verses[i];
    const b = verses[i + 1];
    const actualGap = (b.start_time_ms ?? 0) - (a.start_time_ms ?? 0);
    const refGap = refStarts[i + 1] - refStarts[i];
    const delta = actualGap - refGap;
    const isFlagged = Math.abs(delta) > RELATIVE_GAP_DELTA_MS;
    if (isFlagged) flagged++;
    gaps.push({
      between: [a.verse_number, b.verse_number],
      actual_gap_ms: actualGap,
      reference_gap_ms: refGap,
      delta_ms: delta,
      flagged: isFlagged,
    });
  }
  return { flagged_count: flagged, gaps, have_reference: true };
}

interface CursorDetail {
  verse_number: number;
  kanji_total: number;
  kanji_found: number;
  coverage: number;
  flagged: boolean;
}

function checkCursorSkip(lesson: Lesson, timing: Timing): {
  flagged_count: number;
  verses: CursorDetail[];
} {
  const details: CursorDetail[] = [];
  let flagged = 0;

  for (const v of lesson.verses) {
    const kanji = verseKanjiSet(v);
    if (kanji.size === 0) {
      details.push({
        verse_number: v.verse_number,
        kanji_total: 0,
        kanji_found: 0,
        coverage: 1,
        flagged: false,
      });
      continue;
    }
    const start = v.start_time_ms ?? 0;
    const end = v.end_time_ms ?? 0;
    if (end <= start) {
      details.push({
        verse_number: v.verse_number,
        kanji_total: kanji.size,
        kanji_found: 0,
        coverage: 0,
        flagged: true,
      });
      flagged++;
      continue;
    }
    const windowWords = wordsInWindow(timing.words, start, end);
    const windowChars = new Set<string>();
    for (const w of windowWords) {
      for (const c of w.word) if (isKanji(c)) windowChars.add(c);
    }
    let found = 0;
    for (const k of kanji) if (windowChars.has(k)) found++;
    const coverage = found / kanji.size;
    const isFlagged = coverage < CURSOR_COVERAGE_MIN;
    if (isFlagged) flagged++;
    details.push({
      verse_number: v.verse_number,
      kanji_total: kanji.size,
      kanji_found: found,
      coverage: Number(coverage.toFixed(2)),
      flagged: isFlagged,
    });
  }

  return { flagged_count: flagged, verses: details };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

interface SongReport {
  slug: string;
  intro_padding: IntroFlag;
  absolute_drift: ReturnType<typeof checkAbsoluteDrift>;
  relative_drift: ReturnType<typeof checkRelativeDrift>;
  cursor_skip: ReturnType<typeof checkCursorSkip>;
  any_flag: boolean;
}

function readJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return null;
  }
}

function main(): void {
  console.log("=".repeat(70));
  console.log(`retime-validator (version=${versionArg})`);
  console.log(`  lessons:  ${LESSONS_DIR}`);
  console.log(`  timing:   ${TIMING_DIR}`);
  console.log(`  lyrics:   ${LYRICS_DIR} (for relative drift reference)`);
  console.log("=".repeat(70));

  if (!existsSync(LESSONS_DIR)) {
    console.error(`[error] ${LESSONS_DIR} does not exist`);
    process.exit(1);
  }

  const lessonFiles = readdirSync(LESSONS_DIR)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".bak"))
    .filter((f) => (slugFilter ? f === `${slugFilter}.json` : true));

  const reports: SongReport[] = [];
  let withTiming = 0;

  for (const file of lessonFiles) {
    const slug = file.replace(/\.json$/, "");
    const lesson = readJson<Lesson>(join(LESSONS_DIR, file));
    const timing = readJson<Timing>(join(TIMING_DIR, file));
    const lyrics = readJson<LyricsCache>(join(LYRICS_DIR, file));

    if (!lesson || !timing) continue;
    if (!Array.isArray(lesson.verses) || !Array.isArray(timing.words)) continue;
    if (timing.words.length === 0) continue;

    withTiming++;

    const intro = checkIntroPadding(timing);
    const abs = checkAbsoluteDrift(lesson);
    const rel = checkRelativeDrift(lesson, lyrics);
    const cur = checkCursorSkip(lesson, timing);

    const any =
      intro.flagged || abs.flagged_count > 0 || rel.flagged_count > 0 || cur.flagged_count > 0;

    reports.push({
      slug,
      intro_padding: intro,
      absolute_drift: abs,
      relative_drift: rel,
      cursor_skip: cur,
      any_flag: any,
    });
  }

  reports.sort((a, b) => {
    if (a.any_flag !== b.any_flag) return a.any_flag ? -1 : 1;
    return a.slug.localeCompare(b.slug);
  });

  const summary = {
    lessons_scanned: lessonFiles.length,
    songs_with_timing: withTiming,
    any_flag: reports.filter((r) => r.any_flag).length,
    intro_padding_flags: reports.filter((r) => r.intro_padding.flagged).length,
    absolute_drift_flags: reports.filter((r) => r.absolute_drift.flagged_count > 0).length,
    relative_drift_flags: reports.filter((r) => r.relative_drift.flagged_count > 0).length,
    cursor_skip_flags: reports.filter((r) => r.cursor_skip.flagged_count > 0).length,
  };

  writeFileSync(
    REPORT_PATH,
    JSON.stringify({ generated_at: new Date().toISOString(), summary, songs: reports }, null, 2),
    "utf-8"
  );

  console.log("\n".repeat(1) + "─".repeat(70));
  console.log("Summary");
  console.log("─".repeat(70));
  console.log(`  Lessons scanned:        ${summary.lessons_scanned}`);
  console.log(`  Songs with timing:      ${summary.songs_with_timing}`);
  console.log(`  Any flag:               ${summary.any_flag}`);
  console.log(`    intro_padding:        ${summary.intro_padding_flags}`);
  console.log(`    absolute_drift:       ${summary.absolute_drift_flags}`);
  console.log(`    relative_drift:       ${summary.relative_drift_flags}`);
  console.log(`    cursor_skip:          ${summary.cursor_skip_flags}`);
  console.log(`\nReport written: ${REPORT_PATH}`);
}

main();
