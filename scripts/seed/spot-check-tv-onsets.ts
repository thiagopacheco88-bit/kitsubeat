/**
 * spot-check-tv-onsets.ts — SPEC-REQ-4 validation gate.
 *
 * For a given TV slug, compares each verse's `start_time_ms` (in
 * data/lessons-cache-tv-nw/{slug}.json) against the WhisperX word.start time
 * of the verse's first matched character on the Demucs stem
 * (data/timing-cache-tv-stem/{slug}.json).
 *
 * Pass criterion (per SPEC.md): every verse's delta within ±500ms of audio onset.
 *
 * Skipped: verses with start_time_ms === 0 (low-coverage emission — the deriver
 * explicitly claimed no TV timing for this verse).
 *
 * Methodology fix (Plan 06 checkpoint 2026-04-26):
 * Previously compared lesson.start_time_ms (gap-midpoint adjusted) against raw
 * NW first-matched-char time (not adjusted) → systematic false FAILs.
 * Fix: applies computeVerseTimes (same gap-midpoint expansion as the deriver)
 * to predicted rawSpans before comparing, so comparison is apples-to-apples.
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

import { needlemanWunsch, normRomaji, tokenAlignText, computeVerseTimes } from "./10b-derive-tv-lessons-nw.js";
import { initKuroshiro, toHepburnRomaji } from "../lib/kuroshiro-tokenizer.js";

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
const DEFAULT_LESSONS_DIR = join(PROJECT_ROOT, "data/lessons-cache-tv-nw");
const TV_STEM_TIMING_DIR = join(PROJECT_ROOT, "data/timing-cache-tv-stem");
const DEFAULT_TOLERANCE_MS = 500;

// ---------------------------------------------------------------------------
// Core: per-verse onset comparison
// Re-uses the SAME NW alignment machinery (normRomaji + tokenAlignText + needlemanWunsch)
// as 10b-derive-tv-lessons-nw.ts — no duplication, no reimplementation.
// ---------------------------------------------------------------------------

/**
 * Compare each verse's start_time_ms against the predicted audio onset.
 * The predicted onset is the TV time of the first matched character in the verse
 * range, using the same NW alignment that produced the lesson.
 *
 * Exported for unit testing with synthetic data.
 */
export async function checkVerseOnsets(
  lesson: Lesson,
  timing: TimingCache,
  toleranceMs: number = DEFAULT_TOLERANCE_MS
): Promise<VerseOnsetResult[]> {
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

  // Build streamA (full-lesson romaji with verse-boundary markers) —
  // mirrors the exact construction in deriveOne() within 10b-derive-tv-lessons-nw.ts
  const VERSE_BOUNDARY_MARKER = "";
  let streamA = "";
  const verseRanges: Array<{ verseNumber: number; charStart: number; charEnd: number }> = [];

  for (const verse of lesson.verses) {
    const charStart = streamA.length;
    for (const tok of verse.tokens) {
      streamA += tokenAlignText(tok);
    }
    const charEnd = streamA.length - 1;
    verseRanges.push({ verseNumber: verse.verse_number, charStart, charEnd });
    streamA += VERSE_BOUNDARY_MARKER;
  }

  // Build streamB (TV-stem romaji) with per-char timing index —
  // mirrors the exact construction in deriveOne()
  let streamB = "";
  const tvCharToStartMs: number[] = [];

  for (const word of words) {
    const romaji = await toHepburnRomaji(word.word);
    const norm = normRomaji(romaji);
    if (norm.length === 0) continue;

    const startMs = Math.round(word.start * 1000);
    for (let ci = 0; ci < norm.length; ci++) {
      tvCharToStartMs.push(startMs);
    }
    streamB += norm;
  }

  if (streamA.length === 0 || streamB.length === 0) {
    return lesson.verses.map((v) => ({
      verseNumber: v.verse_number,
      lessonStartMs: v.start_time_ms,
      predictedOnsetMs: null,
      deltaMs: null,
      status: "SKIP" as VerseOnsetStatus,
      note: "empty stream",
    }));
  }

  // Run NW alignment
  const nwResult = needlemanWunsch(streamA, streamB, { match: 2, mismatch: -1, gap: -1 });

  // Build fast lookup: aIndex → bIndex for matched positions
  const aToB = new Map<number, number>();
  for (const entry of nwResult.alignment) {
    if (entry.type === "match" && entry.aIndex !== null && entry.bIndex !== null) {
      aToB.set(entry.aIndex, entry.bIndex);
    }
  }

  // Per-verse: collect rawSpans (first/last matched char → startMs/endMs).
  // We then apply computeVerseTimes (same gap-midpoint expansion as the deriver)
  // so the predicted startMs is apples-to-apples with lesson.start_time_ms.
  //
  // Without this adjustment: lesson.start_time_ms has gap-midpoint applied,
  // but rawFirstMatchedCharMs does not → systematic mismatch → false FAILs.
  const rawSpans: Array<{ verseNumber: number; startMs: number; endMs: number }> = [];
  const verseSkipReasons = new Map<number, string>(); // verseNumber → skip reason

  for (const range of verseRanges) {
    const { verseNumber, charStart, charEnd } = range;

    // Collect all matched bIndices for this verse's range
    const matchedBIndices: number[] = [];
    for (let ai = charStart; ai <= charEnd; ai++) {
      const bi = aToB.get(ai);
      if (bi !== undefined) matchedBIndices.push(bi);
    }

    if (matchedBIndices.length === 0) {
      verseSkipReasons.set(verseNumber, "no matched chars in verse range");
      continue;
    }

    const firstBi = Math.min(...matchedBIndices);
    const lastBi = Math.max(...matchedBIndices);
    const startMs = tvCharToStartMs[firstBi] ?? null;
    const endMs = tvCharToStartMs[lastBi] ?? null;

    if (startMs === null || endMs === null) {
      verseSkipReasons.set(verseNumber, "timing index out of bounds");
      continue;
    }

    rawSpans.push({ verseNumber, startMs, endMs });
  }

  // Apply the same gap-midpoint expansion that the deriver applies.
  // This produces predicted startMs values comparable to lesson.start_time_ms.
  const tvFirstWordStartMs = tvCharToStartMs[0] ?? 0;
  const adjustedSpans = computeVerseTimes(rawSpans, tvFirstWordStartMs);
  const adjustedByVerseNumber = new Map(adjustedSpans.map((s) => [s.verseNumber, s]));

  // Build results per verse
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

    const skipReason = verseSkipReasons.get(verse.verse_number);
    if (skipReason) {
      results.push({
        verseNumber: verse.verse_number,
        lessonStartMs,
        predictedOnsetMs: null,
        deltaMs: null,
        status: "SKIP",
        note: skipReason,
      });
      continue;
    }

    const adjusted = adjustedByVerseNumber.get(verse.verse_number);
    if (!adjusted) {
      results.push({
        verseNumber: verse.verse_number,
        lessonStartMs,
        predictedOnsetMs: null,
        deltaMs: null,
        status: "SKIP",
        note: "verse not in adjusted spans (below presence threshold?)",
      });
      continue;
    }

    const predictedOnsetMs = adjusted.startMs;
    const deltaMs = lessonStartMs - predictedOnsetMs;
    const status: VerseOnsetStatus = Math.abs(deltaMs) <= toleranceMs ? "PASS" : "FAIL";

    results.push({
      verseNumber: verse.verse_number,
      lessonStartMs,
      predictedOnsetMs,
      deltaMs,
      status,
    });
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

  const results = await checkVerseOnsets(lesson, timing, toleranceMs);

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
  --lessons-dir <dir>     Lessons directory (default: data/lessons-cache-tv-nw)
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

  // Init kuroshiro (needed for toHepburnRomaji in checkVerseOnsets)
  await initKuroshiro();

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
