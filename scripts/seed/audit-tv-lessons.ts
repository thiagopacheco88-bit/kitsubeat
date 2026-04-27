/**
 * audit-tv-lessons.ts — Regression guard for degenerate TV lessons.
 *
 * Reads song_versions.lesson for all version_type='tv' rows and flags lessons
 * where (a) verse density < 0.08 verses/sec or (b) any single verse spans > 15s.
 * Per D-07 (CONTEXT.md): DB mode is canonical (flags what users actually see).
 *
 * Exit code 0 = clean catalog; non-zero = at least one flagged lesson.
 *
 * Sign-flow pre-rework reference: 5 verses / 85s ≈ 0.059 density → would flag at old 0.08 threshold.
 * Thresholds relaxed per Plan 06 checkpoint (2026-04-26): density 0.08→0.03, max-span 15s→25s.
 * Typical anime OP: 8 verses / 90s ≈ 0.089 density → passes.
 * Degenerate reference: 1 verse / 100s → density 0.01 → flags.
 *
 * Usage:
 *   npx tsx scripts/seed/audit-tv-lessons.ts              # DB mode (canonical)
 *   npx tsx scripts/seed/audit-tv-lessons.ts --slug X     # single song by slug
 *   npx tsx scripts/seed/audit-tv-lessons.ts --from-disk  # disk mode (data/lessons-cache-tv-nw/)
 *   npx tsx scripts/seed/audit-tv-lessons.ts --self-test  # verify audit logic with mock data
 *   npx tsx scripts/seed/audit-tv-lessons.ts --verbose    # per-verse details for flagged lessons
 *   npx tsx scripts/seed/audit-tv-lessons.ts --help       # usage
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// D-07 Thresholds — updated per Plan 06 checkpoint decision (2026-04-26)
//
// DENSITY_FLOOR: 0.08 → 0.03
//   Rationale: 0.08 was too aggressive for legitimate sparse anime TV cuts.
//   Empirical evidence: real lessons like "kara-no-kokoro-anly" have only 3 verses
//   over 100s (density=0.03) — the song is genuinely sparse, not degenerate.
//   0.03 is the empirical lower bound for real content; below that is truly
//   degenerate (e.g., a single mega-verse covering the whole song).
//
// MAX_VERSE_SPAN_MS: 15000 → 25000
//   Rationale: 15s was too tight for real anime verses with held notes.
//   Empirical evidence: crossing-field-lisa v3 = 17.7s of "いくつもの空を描いた..."
//   is a legitimate single verse, not a degenerate merge. Real anime verses
//   run 5-22s with held notes; 25s+ are genuinely degenerate.
//   Degenerates like again-yui = 1 verse / 46.3s collapse to single-phrase
//   mega-verses that clearly exceed 30s. 25s is the correct boundary.
//
// SELF-TEST MOCK update (same comment block):
//   The mock was "5 verses / 85s, verse 3 spans 38s". After threshold relaxation:
//   - density = 5/85 = 0.0588 > 0.03 (new DENSITY_FLOOR) → would NOT fire density flag
//   - span = 38s > 25s (new MAX_VERSE_SPAN_MS=25000) → still fires max-span
//   Mock adjusted to: "1 verse / 100s, verse 1 spans 50s"
//   - density = 1/100 = 0.01 < 0.03 → fires density flag ✓
//   - span = 50s > 25s → fires max-span flag ✓
// ---------------------------------------------------------------------------
const DENSITY_FLOOR = 0.03;       // verses per TV-second; < 0.03 flags (relaxed from 0.08 per Plan 06)
const MAX_VERSE_SPAN_MS = 25_000; // any single verse > 25s flags (relaxed from 15s per Plan 06)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Verse {
  verse_number: number;
  start_time_ms: number;
  end_time_ms: number;
  tokens?: Array<{ surface: string }>;
  translations?: { en?: string };
}

interface Lesson {
  verses: Verse[];
}

type Flag =
  | { slug: string; kind: "density"; density: number; threshold: number; versesCount: number; tvDurSec: number }
  | { slug: string; kind: "max-span"; verseNumber: number; span_ms: number; threshold: number }
  | { slug: string; kind: "no-tv-duration" }
  | { slug: string; kind: "no-verses" };

// ---------------------------------------------------------------------------
// Core audit function
// ---------------------------------------------------------------------------
function auditLesson(slug: string, lesson: Lesson): Flag[] {
  const flags: Flag[] = [];

  if (!lesson.verses || lesson.verses.length === 0) {
    flags.push({ slug, kind: "no-verses" });
    return flags;
  }

  // TV duration: last verse's end_time_ms (per D-07 — simpler, no extra IO)
  // Covers 95%+ of the catalog; stem-timing fallback not needed for audit checks.
  const tvDurMs = lesson.verses.at(-1)?.end_time_ms ?? 0;
  const tvDurSec = tvDurMs / 1000;

  if (tvDurSec > 0) {
    const density = lesson.verses.length / tvDurSec;
    if (density < DENSITY_FLOOR) {
      flags.push({
        slug,
        kind: "density",
        density,
        threshold: DENSITY_FLOOR,
        versesCount: lesson.verses.length,
        tvDurSec,
      });
    }
  } else {
    flags.push({ slug, kind: "no-tv-duration" });
  }

  // Max-span check: any single verse > 15s is degenerate
  for (const v of lesson.verses) {
    const span = v.end_time_ms - v.start_time_ms;
    if (span > MAX_VERSE_SPAN_MS) {
      flags.push({
        slug,
        kind: "max-span",
        verseNumber: v.verse_number,
        span_ms: span,
        threshold: MAX_VERSE_SPAN_MS,
      });
    }
  }

  return flags;
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------
function printFlag(flag: Flag, verbose: boolean): void {
  switch (flag.kind) {
    case "density":
      console.log(
        `[FLAG] ${flag.slug}: density=${flag.density.toFixed(4)} (floor=${flag.threshold}) — ${flag.versesCount} verses / ${flag.tvDurSec.toFixed(1)}s`
      );
      break;
    case "max-span":
      if (verbose) {
        console.log(
          `[FLAG] ${flag.slug}: verse ${flag.verseNumber} spans ${flag.span_ms}ms (max=${flag.threshold}ms)`
        );
      } else {
        console.log(
          `[FLAG] ${flag.slug}: verse ${flag.verseNumber} spans ${flag.span_ms}ms (max=${flag.threshold}ms)`
        );
      }
      break;
    case "no-tv-duration":
      console.log(`[FLAG] ${flag.slug}: no TV duration (last verse end_time_ms=0)`);
      break;
    case "no-verses":
      console.log(`[FLAG] ${flag.slug}: lesson has no verses`);
      break;
  }
}

// ---------------------------------------------------------------------------
// Self-test: verify the audit correctly flags sign-flow's pre-rework shape
// ---------------------------------------------------------------------------
function runSelfTest(): void {
  console.log("=== audit-tv-lessons self-test ===\n");

  // Mock lesson adjusted for relaxed thresholds (Plan 06 checkpoint, 2026-04-26):
  //
  // Original mock was: 5 verses / 85s, verse 3 spans 38s
  //   - density = 5/85 = 0.0588 > 0.03 (new DENSITY_FLOOR) → would NOT fire after relaxation
  //   - span 38s > 25s (new MAX_VERSE_SPAN_MS) → still fires
  //
  // Adjusted to: 1 verse / ~101s, verse 1 spans 100s
  //   - density = 1/101 ≈ 0.0099 < 0.03 → fires density flag ✓
  //   - span = 101000 - 1000 = 100000ms = 100s > 25000ms (25s) → fires max-span flag ✓
  //
  // Both flags still assert correctly with the relaxed thresholds.
  const mockLesson: Lesson = {
    verses: [
      { verse_number: 1, start_time_ms: 1000, end_time_ms: 102000 }, // span=101s > 25s; TV dur=102s → density=1/102≈0.0098 < 0.03
    ],
  };

  const flags = auditLesson("sign-flow__self-test", mockLesson);

  const hasDensityFlag = flags.some((f) => f.kind === "density");
  const hasMaxSpanFlag = flags.some((f) => f.kind === "max-span");

  console.log("Mock lesson: 1 verse, ~102s TV duration, verse 1 spans 101s");
  console.log(`  Expected: density flag (density=${(1/102).toFixed(4)} < ${DENSITY_FLOOR})`);
  console.log(`  Expected: max-span flag (101000ms > ${MAX_VERSE_SPAN_MS}ms)`);
  console.log();

  for (const flag of flags) {
    printFlag(flag, true);
  }

  console.log();

  let selfTestPassed = true;

  if (!hasDensityFlag) {
    console.error("FAIL: density flag not raised — audit logic is broken");
    selfTestPassed = false;
  } else {
    console.log("PASS: density flag raised correctly");
  }

  if (!hasMaxSpanFlag) {
    console.error("FAIL: max-span flag not raised — audit logic is broken");
    selfTestPassed = false;
  } else {
    console.log("PASS: max-span flag raised correctly");
  }

  console.log();

  if (!selfTestPassed) {
    console.error("=== SELF-TEST FAILED ===");
    process.exit(1);
  }

  console.log("=== SELF-TEST PASSED ===");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Disk mode: read from data/lessons-cache-tv-nw/ (Plan 06 spot-check gate)
// ---------------------------------------------------------------------------
async function runDiskMode(opts: { slug: string | null; verbose: boolean }): Promise<void> {
  const __dirname = fileURLToPath(new URL(".", import.meta.url));
  const root = resolve(__dirname, "../../");
  const diskDir = join(root, "data/lessons-cache-tv-nw");

  if (!existsSync(diskDir)) {
    console.error(`[audit] disk dir not found: ${diskDir}`);
    console.error(`[audit] Run 10b-derive-tv-lessons-nw.ts --all first to produce the NW lessons.`);
    process.exit(1);
  }

  const files = readdirSync(diskDir)
    .filter((f) => f.endsWith(".json"))
    .filter((f) => !opts.slug || f === `${opts.slug}.json`);

  if (files.length === 0) {
    if (opts.slug) {
      console.error(`[audit] no file found for slug: ${opts.slug} in ${diskDir}`);
    } else {
      console.error(`[audit] no .json files found in ${diskDir}`);
    }
    process.exit(1);
  }

  const allFlags: Flag[] = [];

  for (const f of files) {
    const slug = f.replace(/\.json$/, "");
    const raw = JSON.parse(readFileSync(join(diskDir, f), "utf-8"));
    const lesson = raw as Lesson;
    const flags = auditLesson(slug, lesson);
    for (const flag of flags) {
      printFlag(flag, opts.verbose);
      allFlags.push(flag);
    }
  }

  const flaggedSlugs = new Set(allFlags.map((f) => f.slug));
  console.log(
    `\nAudited ${files.length} TV lessons (disk); ${flaggedSlugs.size} flagged across ${allFlags.length} dimensions.`
  );

  process.exit(allFlags.length === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// DB mode (canonical): read from song_versions.lesson WHERE version_type='tv'
// ---------------------------------------------------------------------------
async function runDbMode(opts: { slug: string | null; verbose: boolean }): Promise<void> {
  // Late import — DB not needed for --self-test or --from-disk
  const { getDb } = await import("../../src/lib/db/index.js");
  const { songs, songVersions } = await import("../../src/lib/db/schema.js");
  const { eq, and } = await import("drizzle-orm");

  const db = getDb();

  const whereClause = opts.slug
    ? and(eq(songVersions.version_type, "tv"), eq(songs.slug, opts.slug))
    : eq(songVersions.version_type, "tv");

  const rows = await db
    .select({
      slug: songs.slug,
      lesson: songVersions.lesson,
    })
    .from(songVersions)
    .innerJoin(songs, eq(songs.id, songVersions.song_id))
    .where(whereClause);

  if (rows.length === 0) {
    if (opts.slug) {
      console.error(`[audit] no TV row found for slug: ${opts.slug}`);
    } else {
      console.log("[audit] no version_type='tv' rows in DB — nothing to audit.");
    }
    process.exit(0);
  }

  const allFlags: Flag[] = [];

  for (const row of rows) {
    if (!row.lesson) {
      console.log(`[SKIP] ${row.slug}: lesson is null`);
      continue;
    }

    const lesson = row.lesson as Lesson;

    if (opts.verbose) {
      console.log(`\n--- ${row.slug} (${lesson.verses?.length ?? 0} verses) ---`);
      for (const v of lesson.verses ?? []) {
        const span = v.end_time_ms - v.start_time_ms;
        console.log(
          `  v${v.verse_number}: ${v.start_time_ms}ms–${v.end_time_ms}ms span=${span}ms`
        );
      }
    }

    const flags = auditLesson(row.slug, lesson);
    for (const flag of flags) {
      printFlag(flag, opts.verbose);
      allFlags.push(flag);
    }
  }

  const flaggedSlugs = new Set(allFlags.map((f) => f.slug));
  console.log(
    `\nAudited ${rows.length} TV lessons; ${flaggedSlugs.size} flagged across ${allFlags.length} dimensions.`
  );

  process.exit(allFlags.length === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// Argument parsing + help
// ---------------------------------------------------------------------------
function printHelp(): void {
  console.log(`
audit-tv-lessons.ts — Regression guard for degenerate TV lessons

USAGE
  npx tsx scripts/seed/audit-tv-lessons.ts [options]

OPTIONS
  (default)       DB mode — reads song_versions.lesson WHERE version_type='tv' (canonical)
  --from-disk     Disk mode — reads data/lessons-cache-tv-nw/*.json (Plan 06 spot-check)
  --slug <slug>   Audit a single song by slug (works in both DB and disk modes)
  --verbose       Print per-verse details for each flagged lesson
  --self-test     Run built-in regression test with mock sign-flow pre-rework lesson
  --help          Show this help message

THRESHOLDS (D-07, relaxed per Plan 06 checkpoint 2026-04-26)
  density floor:  ${DENSITY_FLOOR} verses/sec  (< ${DENSITY_FLOOR} flags the lesson)
  max-span:       ${MAX_VERSE_SPAN_MS}ms per verse  (> ${MAX_VERSE_SPAN_MS}ms flags the lesson)

EXIT CODES
  0  = clean (zero flags)
  1  = at least one flagged lesson (or self-test failure)
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  if (args.includes("--self-test")) {
    runSelfTest();
    return; // process.exit() called inside
  }

  const fromDisk = args.includes("--from-disk");
  const verbose = args.includes("--verbose");

  let slug: string | null = null;
  const slugIdx = args.indexOf("--slug");
  if (slugIdx !== -1 && args[slugIdx + 1]) {
    slug = args[slugIdx + 1];
  }

  if (fromDisk) {
    await runDiskMode({ slug, verbose });
  } else {
    await runDbMode({ slug, verbose });
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
