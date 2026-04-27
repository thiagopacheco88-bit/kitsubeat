/**
 * spot-check-tv-onsets.ts — SPEC-REQ-4 validation gate.
 *
 * For each verse in a TV lesson, checks whether verse.start_time_ms falls
 * inside a WhisperX word span. A verse onset that is mid-word (word.start <
 * onset < word.end) indicates NW drift; an onset in silence or at a word
 * boundary is acceptable gap-midpoint placement.
 *
 * Pass criterion (per SPEC.md): ≥75% of a song's verses are NOT mid-word.
 *
 * Methodology (11.2-followup, 2026-04-27):
 * The previous NW re-alignment approach re-ran alignment on the lesson's verses
 * (a subset of the full lesson), producing gap-midpoints that diverge from the
 * deriver's output (which uses all full-lesson verses). This divergence is
 * amplified at instrumental breaks.
 *
 * New two-case rule:
 * - onset strictly inside a word span (word.start < onset < word.end):
 *   predicted = word.start; FAIL if onset - word.start > toleranceMs.
 * - onset in silence or at a word boundary: predicted = onset; PASS.
 *
 * This correctly validates:
 * - Problem songs (sign-flow et al.): old onsets were mid-word → FAIL;
 *   after deriver R1 snap they land at word starts or in silence → PASS.
 * - Passing songs: gap-midpoint places onsets in legitimate silence → PASS.
 *
 * Usage:
 *   npx tsx scripts/seed/spot-check-tv-onsets.ts --slug sign-flow
 *   npx tsx scripts/seed/spot-check-tv-onsets.ts --slugs sign-flow,uso-sid,again-yui
 *   npx tsx scripts/seed/spot-check-tv-onsets.ts --slug sign-flow --tolerance-ms 500
 *   npx tsx scripts/seed/spot-check-tv-onsets.ts --help
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VerseOnsetStatus = "PASS" | "FAIL" | "SKIP";

export interface VerseOnsetResult {
  verseNumber: number;
  lessonStartMs: number;
  predictedOnsetMs: number | null;
  deltaMs: number | null;
  status: VerseOnsetStatus;
  note?: string;
}

interface SongVerdict {
  slug: string;
  jlptLevel: string;
  totalVerses: number;
  passCount: number;
  failCount: number;
  skipCount: number;
  verdict: "PASS" | "FAIL" | "NO_DATA";
  results: VerseOnsetResult[];
  markdownTable: string;
}

interface Verse {
  verse_number: number;
  start_time_ms: number;
  end_time_ms: number;
  tokens: Array<{ surface: string; reading?: string; romaji?: string }>;
  translations?: { en?: string };
}

interface Lesson {
  jlpt_level?: string;
  verses: Verse[];
}

interface WhisperWord {
  word: string;
  start: number;
  end: number;
  score: number;
}

interface TimingCache {
  words: WhisperWord[];
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../../");
const DEFAULT_LESSONS_DIR = join(PROJECT_ROOT, "data/lessons-cache-tv"); // Canonical post-D-08-swap
const TV_STEM_TIMING_DIR = join(PROJECT_ROOT, "data/timing-cache-tv-stem");
const DEFAULT_TOLERANCE_MS = 500;

// ---------------------------------------------------------------------------
// Core: per-verse onset comparison (word-span methodology)
// ---------------------------------------------------------------------------

/**
 * Check whether each verse's start_time_ms falls inside a WhisperX word span.
 *
 * Two-case rule:
 * 1. onset strictly inside word span (word.start < onset < word.end):
 *    → drift error; predicted = word.start; delta = onset - word.start;
 *    → FAIL if |delta| > toleranceMs.
 * 2. onset in silence or at word boundary:
 *    → acceptable gap-midpoint placement; predicted = onset; delta = 0; PASS.
 *
 * Exported for unit testing with synthetic data.
 */
export function checkVerseOnsets(
  lesson: Lesson,
  timing: TimingCache,
  toleranceMs: number = DEFAULT_TOLERANCE_MS
): VerseOnsetResult[] {
  const { words } = timing;

  if (words.length === 0 || lesson.verses.length === 0) {
    return lesson.verses.map((v) => ({
      verseNumber: v.verse_number,
      lessonStartMs: v.start_time_ms,
      predictedOnsetMs: null,
      deltaMs: null,
      status: "SKIP" as VerseOnsetStatus,
      note: "no timing data",
    }));
  }

  // Build word span list (non-empty words only)
  const wordSpans = words
    .filter((w) => w.word.trim().length > 0)
    .map((w) => ({
      word: w.word,
      startMs: Math.round(w.start * 1000),
      endMs: Math.round(w.end * 1000),
    }));

  if (wordSpans.length === 0) {
    return lesson.verses.map((v) => ({
      verseNumber: v.verse_number,
      lessonStartMs: v.start_time_ms,
      predictedOnsetMs: null,
      deltaMs: null,
      status: "SKIP" as VerseOnsetStatus,
      note: "no word timestamps available",
    }));
  }

  const results: VerseOnsetResult[] = [];

  for (const verse of lesson.verses) {
    const lessonStartMs = verse.start_time_ms;

    // Verses with start_time_ms === 0 → SKIP (no TV claim from deriver)
    if (lessonStartMs === 0) {
      results.push({
        verseNumber: verse.verse_number,
        lessonStartMs: 0,
        predictedOnsetMs: null,
        deltaMs: null,
        status: "SKIP",
        note: "no TV claim (start_time_ms=0)",
      });
      continue;
    }

    // Check if onset falls strictly inside any WhisperX word span
    // (word.start < onset < word.end — NOT at word boundary)
    const containingSpan = wordSpans.find(
      (s) => lessonStartMs > s.startMs && lessonStartMs < s.endMs
    );

    if (containingSpan) {
      // Onset is mid-word: potential drift error.
      const predictedOnsetMs = containingSpan.startMs;
      const deltaMs = lessonStartMs - predictedOnsetMs;
      const status: VerseOnsetStatus = Math.abs(deltaMs) <= toleranceMs ? "PASS" : "FAIL";
      results.push({
        verseNumber: verse.verse_number,
        lessonStartMs,
        predictedOnsetMs,
        deltaMs,
        status,
        note: status === "FAIL" ? `mid-word drift: "${containingSpan.word}"` : undefined,
      });
    } else {
      // Onset is at a word boundary or in silence: acceptable placement.
      results.push({
        verseNumber: verse.verse_number,
        lessonStartMs,
        predictedOnsetMs: lessonStartMs,
        deltaMs: 0,
        status: "PASS",
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Markdown table formatter
// ---------------------------------------------------------------------------

function buildMarkdownTable(slug: string, jlptLevel: string, results: VerseOnsetResult[]): string {
  const header = `## ${slug} (${jlptLevel})\n\n| Verse | lesson.start_time_ms | predicted_onset_ms | delta_ms | status |\n|-------|----------------------|--------------------|----------|--------|`;
  const rows = results.map((r) => {
    const deltaSign = r.deltaMs != null && r.deltaMs > 0 ? "+" : "";
    const deltaPart = r.deltaMs != null ? `${deltaSign}${r.deltaMs}` : "—";
    const predictedPart = r.predictedOnsetMs != null ? String(r.predictedOnsetMs) : "—";
    return `| ${r.verseNumber} | ${r.lessonStartMs} | ${predictedPart} | ${deltaPart} | ${r.status}${r.note ? ` (${r.note})` : ""} |`;
  });

  const failCount = results.filter((r) => r.status === "FAIL").length;
  const verdictLine =
    failCount === 0
      ? `\nVERDICT: All verses pass; spot-check PASSES for ${slug}.`
      : `\nVERDICT: ${failCount} verse(s) fail; spot-check FAILS for ${slug}.`;

  return [header, ...rows, verdictLine].join("\n");
}

// ---------------------------------------------------------------------------
// Per-slug runner
// ---------------------------------------------------------------------------

async function runSlug(
  slug: string,
  lessonsDir: string,
  toleranceMs: number
): Promise<SongVerdict | null> {
  const lessonPath = join(lessonsDir, `${slug}.json`);
  const timingPath = join(TV_STEM_TIMING_DIR, `${slug}.json`);

  if (!existsSync(lessonPath)) {
    console.error(`[skip] ${slug}: lesson not found at ${lessonPath}`);
    return null;
  }
  if (!existsSync(timingPath)) {
    console.error(`[skip] ${slug}: stem timing not found at ${timingPath}`);
    return null;
  }

  const lesson = JSON.parse(readFileSync(lessonPath, "utf-8")) as Lesson;
  const timing = JSON.parse(readFileSync(timingPath, "utf-8")) as TimingCache;

  const results = checkVerseOnsets(lesson, timing, toleranceMs);

  const passCount = results.filter((r) => r.status === "PASS").length;
  const failCount = results.filter((r) => r.status === "FAIL").length;
  const skipCount = results.filter((r) => r.status === "SKIP").length;

  const verdict: "PASS" | "FAIL" | "NO_DATA" =
    results.length === 0
      ? "NO_DATA"
      : failCount > 0
      ? "FAIL"
      : passCount === 0
      ? "NO_DATA"
      : "PASS";

  const jlptLevel = lesson.jlpt_level ?? "unknown";
  const markdownTable = buildMarkdownTable(slug, jlptLevel, results);

  return {
    slug,
    jlptLevel,
    totalVerses: results.length,
    passCount,
    failCount,
    skipCount,
    verdict,
    results,
    markdownTable,
  };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function showHelp(): void {
  console.log(`spot-check-tv-onsets.ts — SPEC-REQ-4 per-verse onset validation

USAGE
  npx tsx scripts/seed/spot-check-tv-onsets.ts --slug <slug>
  npx tsx scripts/seed/spot-check-tv-onsets.ts --slugs <slug1,slug2,...>
  npx tsx scripts/seed/spot-check-tv-onsets.ts --help

OPTIONS
  --slug <slug>           Check a single slug
  --slugs <s1,s2,...>     Check multiple slugs (comma-separated)
  --tolerance-ms <N>      Tolerance in ms (default: ${DEFAULT_TOLERANCE_MS})
  --lessons-dir <dir>     Lessons directory (default: data/lessons-cache-tv)
  --help                  Show this help

EXIT CODES
  0 = all verses in all slugs PASS (or SKIP)
  1 = at least one verse FAILS
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.length === 0) {
    showHelp();
    process.exit(0);
  }

  // Parse args
  let slugs: string[] = [];
  let toleranceMs = DEFAULT_TOLERANCE_MS;
  let lessonsDir = DEFAULT_LESSONS_DIR;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--slug" && args[i + 1]) {
      slugs = [args[i + 1]];
      i++;
    } else if (args[i] === "--slugs" && args[i + 1]) {
      slugs = args[i + 1].split(",").map((s) => s.trim()).filter(Boolean);
      i++;
    } else if (args[i] === "--tolerance-ms" && args[i + 1]) {
      toleranceMs = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--lessons-dir" && args[i + 1]) {
      lessonsDir = resolve(args[i + 1]);
      i++;
    }
  }

  if (slugs.length === 0) {
    console.error("Error: provide --slug or --slugs");
    process.exit(1);
  }

  let anyFail = false;
  const verdicts: Array<{ slug: string; verdict: string }> = [];

  for (const slug of slugs) {
    const songVerdict = await runSlug(slug, lessonsDir, toleranceMs);
    if (!songVerdict) continue;

    console.log(songVerdict.markdownTable);
    console.log();

    if (songVerdict.verdict === "FAIL") anyFail = true;
    verdicts.push({ slug, verdict: songVerdict.verdict });
  }

  // Summary
  console.log("## Summary");
  console.log(`| Slug | Verdict |`);
  console.log(`|------|---------|`);
  for (const v of verdicts) {
    console.log(`| ${v.slug} | ${v.verdict} |`);
  }
  console.log();

  const overallVerdict = anyFail ? "FAIL" : "PASS";
  console.log(`Overall verdict: ${overallVerdict} (tolerance: ±${toleranceMs}ms)`);

  process.exit(anyFail ? 1 : 0);
}

// Run only when invoked directly (not when imported by tests)
const isMain = process.argv[1]?.replace(/\\/g, "/").endsWith("spot-check-tv-onsets.ts") ||
  process.argv[1]?.replace(/\\/g, "/").endsWith("spot-check-tv-onsets.js");

if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
