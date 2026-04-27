/**
 * spot-check-full-onsets.ts — Per-verse onset validation for full-version lessons.
 *
 * Mirror of spot-check-tv-onsets.ts (Phase 11.2) ported to full-version cohort.
 * Reads song_versions.lesson WHERE version_type='full' (DB canonical) and
 * compares each verse.start_time_ms against WhisperX word spans from
 * data/timing-cache-stem/{slug}.json (Demucs+WhisperX, full-version stem).
 *
 * Methodology (word-span rule, same as TV gate):
 *   - onset strictly inside a word span (word.start < onset < word.end):
 *     predicted = word.start; FAIL if onset - word.start > toleranceMs.
 *   - onset in silence or at a word boundary: predicted = onset; PASS.
 *
 * Pass criterion: ≥75% of a song's verses are NOT mid-word past tolerance.
 *
 * Why full-version needed this gate:
 *   The full-version pipeline never had an objective onset-accuracy check.
 *   audit-zero-verse-timing covers the "all-zero" failure mode; validate-retime
 *   covers per-window kanji coverage; this script closes the gap on the
 *   "verse drifted past the actual vocal entry" failure mode that TV already
 *   gates against.
 *
 * Usage:
 *   npx tsx scripts/seed/spot-check-full-onsets.ts --slug <slug>
 *   npx tsx scripts/seed/spot-check-full-onsets.ts --slugs s1,s2,s3
 *   npx tsx scripts/seed/spot-check-full-onsets.ts --all
 *   npx tsx scripts/seed/spot-check-full-onsets.ts --all --tolerance-ms 500
 *   npx tsx scripts/seed/spot-check-full-onsets.ts --all --json data/full-onset-report.json
 *   npx tsx scripts/seed/spot-check-full-onsets.ts --help
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { existsSync, readFileSync, writeFileSync } from "node:fs";
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
  passRate: number;
  meets75: boolean;
  verdict: "PASS" | "FAIL" | "NO_DATA";
  results: VerseOnsetResult[];
}

interface Verse {
  verse_number: number;
  start_time_ms: number;
  end_time_ms: number;
  tokens?: Array<{ surface: string }>;
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
const FULL_STEM_TIMING_DIR = join(PROJECT_ROOT, "data/timing-cache-stem");
const FULL_RAW_TIMING_DIR = join(PROJECT_ROOT, "data/timing-cache");
const DEFAULT_TOLERANCE_MS = 500;
const PASS_RATE_THRESHOLD = 0.75;

// ---------------------------------------------------------------------------
// Word-span methodology — identical to TV gate (Phase 11.2-followup)
// ---------------------------------------------------------------------------

export function checkVerseOnsets(
  lesson: Lesson,
  timing: TimingCache,
  toleranceMs: number = DEFAULT_TOLERANCE_MS
): VerseOnsetResult[] {
  const { words } = timing;

  if (!words || words.length === 0 || lesson.verses.length === 0) {
    return lesson.verses.map((v) => ({
      verseNumber: v.verse_number,
      lessonStartMs: v.start_time_ms,
      predictedOnsetMs: null,
      deltaMs: null,
      status: "SKIP" as VerseOnsetStatus,
      note: "no timing data",
    }));
  }

  const wordSpans = words
    .filter((w) => w.word && w.word.trim().length > 0)
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

    if (lessonStartMs === 0) {
      results.push({
        verseNumber: verse.verse_number,
        lessonStartMs: 0,
        predictedOnsetMs: null,
        deltaMs: null,
        status: "SKIP",
        note: "no claim (start_time_ms=0)",
      });
      continue;
    }

    const containingSpan = wordSpans.find(
      (s) => lessonStartMs > s.startMs && lessonStartMs < s.endMs
    );

    if (containingSpan) {
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
// Per-slug runner — DB lesson + stem timing (with raw fallback)
// ---------------------------------------------------------------------------

async function runSlug(
  slug: string,
  lesson: Lesson,
  toleranceMs: number
): Promise<SongVerdict | null> {
  const stemPath = join(FULL_STEM_TIMING_DIR, `${slug}.json`);
  const rawPath = join(FULL_RAW_TIMING_DIR, `${slug}.json`);

  let timingPath: string | null = null;
  let timingSource: "stem" | "raw" = "stem";

  if (existsSync(stemPath)) {
    timingPath = stemPath;
    timingSource = "stem";
  } else if (existsSync(rawPath)) {
    timingPath = rawPath;
    timingSource = "raw";
  }

  if (!timingPath) {
    return {
      slug,
      jlptLevel: lesson.jlpt_level ?? "unknown",
      totalVerses: lesson.verses.length,
      passCount: 0,
      failCount: 0,
      skipCount: lesson.verses.length,
      passRate: 0,
      meets75: false,
      verdict: "NO_DATA",
      results: lesson.verses.map((v) => ({
        verseNumber: v.verse_number,
        lessonStartMs: v.start_time_ms,
        predictedOnsetMs: null,
        deltaMs: null,
        status: "SKIP" as VerseOnsetStatus,
        note: "no timing-cache file",
      })),
    };
  }

  const timing = JSON.parse(readFileSync(timingPath, "utf-8")) as TimingCache;
  const results = checkVerseOnsets(lesson, timing, toleranceMs);

  const passCount = results.filter((r) => r.status === "PASS").length;
  const failCount = results.filter((r) => r.status === "FAIL").length;
  const skipCount = results.filter((r) => r.status === "SKIP").length;
  const judged = passCount + failCount;
  const passRate = judged > 0 ? passCount / judged : 0;
  const meets75 = judged > 0 && passRate >= PASS_RATE_THRESHOLD;

  const verdict: SongVerdict["verdict"] =
    judged === 0 ? "NO_DATA" : meets75 ? "PASS" : "FAIL";

  return {
    slug,
    jlptLevel: lesson.jlpt_level ?? "unknown",
    totalVerses: results.length,
    passCount,
    failCount,
    skipCount,
    passRate,
    meets75,
    verdict,
    results: results.map((r) =>
      timingSource === "raw" && r.note == null
        ? { ...r, note: "raw-audio timing (no stem)" }
        : r
    ),
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function showHelp(): void {
  console.log(`spot-check-full-onsets.ts — Per-verse onset validation for full-version lessons

USAGE
  npx tsx scripts/seed/spot-check-full-onsets.ts --slug <slug>
  npx tsx scripts/seed/spot-check-full-onsets.ts --slugs <s1,s2,...>
  npx tsx scripts/seed/spot-check-full-onsets.ts --all
  npx tsx scripts/seed/spot-check-full-onsets.ts --help

OPTIONS
  --slug <slug>           Check a single slug
  --slugs <s1,s2,...>     Check multiple slugs (comma-separated)
  --all                   Audit every full-version row with timing-cache
  --tolerance-ms <N>      Tolerance in ms (default: ${DEFAULT_TOLERANCE_MS})
  --json <path>           Write per-song verdict JSON report
  --verbose               Print per-verse table for every flagged song
  --help                  Show this help

EXIT CODES
  0 = all judged songs PASS at >=${(PASS_RATE_THRESHOLD * 100).toFixed(0)}%
  1 = at least one song FAILS the pass-rate threshold
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.length === 0) {
    showHelp();
    process.exit(0);
  }

  let slugs: string[] = [];
  let runAll = false;
  let toleranceMs = DEFAULT_TOLERANCE_MS;
  let jsonOut: string | null = null;
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--slug" && args[i + 1]) {
      slugs = [args[i + 1]];
      i++;
    } else if (args[i] === "--slugs" && args[i + 1]) {
      slugs = args[i + 1].split(",").map((s) => s.trim()).filter(Boolean);
      i++;
    } else if (args[i] === "--all") {
      runAll = true;
    } else if (args[i] === "--tolerance-ms" && args[i + 1]) {
      toleranceMs = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--json" && args[i + 1]) {
      jsonOut = args[i + 1];
      i++;
    } else if (args[i] === "--verbose") {
      verbose = true;
    }
  }

  if (!runAll && slugs.length === 0) {
    console.error("Error: provide --slug, --slugs, or --all");
    process.exit(1);
  }

  // For --all mode: only audit slugs that have at least one timing-cache file.
  // Saves a large DB transfer for slugs we'd skip anyway.
  let candidateSlugs: string[] | null = null;
  if (runAll) {
    const { readdirSync, existsSync } = await import("node:fs");
    const stemSet = existsSync(FULL_STEM_TIMING_DIR)
      ? new Set(readdirSync(FULL_STEM_TIMING_DIR).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")))
      : new Set<string>();
    const rawSet = existsSync(FULL_RAW_TIMING_DIR)
      ? new Set(readdirSync(FULL_RAW_TIMING_DIR).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")))
      : new Set<string>();
    candidateSlugs = Array.from(new Set([...stemSet, ...rawSet])).sort();
    console.log(`[spot-check] --all → ${candidateSlugs.length} slugs with timing-cache files`);
  }

  // Pull lessons from DB
  const { getDb } = await import("../../src/lib/db/index.js");
  const { songs, songVersions } = await import("../../src/lib/db/schema.js");
  const { and, eq, inArray, isNotNull } = await import("drizzle-orm");

  const db = getDb();

  const slugFilter = candidateSlugs ?? slugs;
  const where = and(
    eq(songVersions.version_type, "full"),
    isNotNull(songVersions.lesson),
    inArray(songs.slug, slugFilter)
  );

  console.log(`[spot-check] querying DB for ${slugFilter.length} slugs ...`);
  const tStart = Date.now();
  const rows = await db
    .select({ slug: songs.slug, lesson: songVersions.lesson })
    .from(songVersions)
    .innerJoin(songs, eq(songs.id, songVersions.song_id))
    .where(where);
  console.log(`[spot-check] DB returned ${rows.length} rows in ${Date.now() - tStart}ms`);

  if (rows.length === 0) {
    console.error("[spot-check] no rows matched.");
    process.exit(1);
  }

  const verdicts: SongVerdict[] = [];
  let processed = 0;
  for (const r of rows) {
    if (!r.lesson) continue;
    const lesson = r.lesson as Lesson;
    const v = await runSlug(r.slug, lesson, toleranceMs);
    if (v) verdicts.push(v);
    processed++;
    if (processed % 25 === 0) console.log(`[spot-check] ${processed}/${rows.length} processed`);
  }

  // Sort: failures first (lowest pass rate), then no-data, then passes
  verdicts.sort((a, b) => {
    const order = { FAIL: 0, NO_DATA: 1, PASS: 2 };
    if (order[a.verdict] !== order[b.verdict]) return order[a.verdict] - order[b.verdict];
    return a.passRate - b.passRate;
  });

  // Summary table
  const failCount = verdicts.filter((v) => v.verdict === "FAIL").length;
  const noDataCount = verdicts.filter((v) => v.verdict === "NO_DATA").length;
  const passCount = verdicts.filter((v) => v.verdict === "PASS").length;

  console.log(`\n## spot-check-full-onsets — Summary (tolerance: ±${toleranceMs}ms, threshold: >=${(PASS_RATE_THRESHOLD * 100).toFixed(0)}%)\n`);
  console.log(`Audited: ${verdicts.length} | PASS: ${passCount} | FAIL: ${failCount} | NO_DATA: ${noDataCount}\n`);

  if (failCount > 0) {
    console.log(`### Failures (${failCount})\n`);
    console.log(`| Slug | Verses | PASS | FAIL | SKIP | Pass% |`);
    console.log(`|------|--------|------|------|------|-------|`);
    for (const v of verdicts.filter((x) => x.verdict === "FAIL")) {
      console.log(
        `| ${v.slug} | ${v.totalVerses} | ${v.passCount} | ${v.failCount} | ${v.skipCount} | ${(v.passRate * 100).toFixed(1)}% |`
      );
    }
    console.log();
  }

  if (noDataCount > 0 && verbose) {
    console.log(`### No-data (${noDataCount} — missing timing-cache)\n`);
    for (const v of verdicts.filter((x) => x.verdict === "NO_DATA")) {
      console.log(`  ${v.slug}`);
    }
    console.log();
  }

  if (verbose && failCount > 0) {
    for (const v of verdicts.filter((x) => x.verdict === "FAIL")) {
      console.log(`#### ${v.slug} (${v.jlptLevel})`);
      console.log(`| Verse | start_time_ms | predicted | delta_ms | status |`);
      console.log(`|-------|---------------|-----------|----------|--------|`);
      for (const r of v.results) {
        const sign = r.deltaMs != null && r.deltaMs > 0 ? "+" : "";
        const delta = r.deltaMs != null ? `${sign}${r.deltaMs}` : "—";
        const pred = r.predictedOnsetMs != null ? String(r.predictedOnsetMs) : "—";
        console.log(`| ${r.verseNumber} | ${r.lessonStartMs} | ${pred} | ${delta} | ${r.status}${r.note ? ` (${r.note})` : ""} |`);
      }
      console.log();
    }
  }

  if (jsonOut) {
    const report = {
      generated_at: new Date().toISOString(),
      version: "full",
      tolerance_ms: toleranceMs,
      pass_rate_threshold: PASS_RATE_THRESHOLD,
      summary: { audited: verdicts.length, pass: passCount, fail: failCount, no_data: noDataCount },
      verdicts: verdicts.map((v) => ({
        slug: v.slug,
        jlpt_level: v.jlptLevel,
        total_verses: v.totalVerses,
        pass: v.passCount,
        fail: v.failCount,
        skip: v.skipCount,
        pass_rate: Number(v.passRate.toFixed(4)),
        verdict: v.verdict,
        failed_verses: v.results
          .filter((r) => r.status === "FAIL")
          .map((r) => ({
            verse_number: r.verseNumber,
            lesson_start_ms: r.lessonStartMs,
            predicted_onset_ms: r.predictedOnsetMs,
            delta_ms: r.deltaMs,
            note: r.note,
          })),
      })),
    };
    writeFileSync(resolve(jsonOut), JSON.stringify(report, null, 2));
    console.log(`Report written: ${jsonOut}`);
  }

  process.exit(failCount > 0 ? 1 : 0);
}

const isMain = process.argv[1]?.replace(/\\/g, "/").endsWith("spot-check-full-onsets.ts") ||
  process.argv[1]?.replace(/\\/g, "/").endsWith("spot-check-full-onsets.js");

if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
