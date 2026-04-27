/**
 * audit-full-lessons.ts — Regression guard for degenerate full-version lessons.
 *
 * Mirror of audit-tv-lessons.ts (Phase 11.2) ported to full-version cohort.
 * Reads song_versions.lesson WHERE version_type='full' and flags lessons where
 *   (a) verse density < DENSITY_FLOOR
 *   (b) any single verse spans > MAX_VERSE_SPAN_MS
 *   (c) all verses sit at start_time_ms=0 (already covered by audit-zero-verse-timing
 *       but reported here as a soft signal)
 *
 * Thresholds calibrated for full-version catalog reality:
 *   - Full-version songs are 2-4× longer than TV cuts (180-240s vs 80-100s).
 *   - Density: keep TV's 0.03 floor — verses/sec is dimensionless w.r.t. song length.
 *     A 3-min full song with 6 verses sits at density=0.033 (passes); a single
 *     30-verse-equivalent mega-verse sits at <0.01 (flags).
 *   - Max-span: 35s (vs TV's 25s). Full-version verses can hold a chorus refrain
 *     across an instrumental bridge legitimately (e.g., outro choruses with
 *     long held final notes). Below 35s is plausibly real content; above is
 *     a deriver merge or a mistimed boundary.
 *
 * Exit code 0 = clean catalog; non-zero = at least one flagged lesson.
 *
 * Usage:
 *   npx tsx scripts/seed/audit-full-lessons.ts              # DB mode (canonical)
 *   npx tsx scripts/seed/audit-full-lessons.ts --slug X     # single song
 *   npx tsx scripts/seed/audit-full-lessons.ts --verbose    # per-verse details
 *   npx tsx scripts/seed/audit-full-lessons.ts --self-test  # logic regression test
 *   npx tsx scripts/seed/audit-full-lessons.ts --json <p>   # write JSON report
 *   npx tsx scripts/seed/audit-full-lessons.ts --help
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Thresholds — full-version-tuned (see header for rationale)
// ---------------------------------------------------------------------------
const DENSITY_FLOOR = 0.03;
const MAX_VERSE_SPAN_MS = 35_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Verse {
  verse_number: number;
  start_time_ms: number;
  end_time_ms: number;
}

interface Lesson {
  verses: Verse[];
}

type Flag =
  | { slug: string; kind: "density"; density: number; threshold: number; versesCount: number; songDurSec: number }
  | { slug: string; kind: "max-span"; verseNumber: number; span_ms: number; threshold: number }
  | { slug: string; kind: "all-zero" }
  | { slug: string; kind: "no-duration" }
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

  // All-zero detection (soft signal; redundant with audit-zero-verse-timing
  // but surfaced here so a single audit gives the full picture for full-version)
  const allZero = lesson.verses.every((v) => (v.start_time_ms ?? 0) === 0);
  if (allZero) {
    flags.push({ slug, kind: "all-zero" });
    return flags;
  }

  const songDurMs = lesson.verses.at(-1)?.end_time_ms ?? 0;
  const songDurSec = songDurMs / 1000;

  if (songDurSec > 0) {
    const density = lesson.verses.length / songDurSec;
    if (density < DENSITY_FLOOR) {
      flags.push({
        slug,
        kind: "density",
        density,
        threshold: DENSITY_FLOOR,
        versesCount: lesson.verses.length,
        songDurSec,
      });
    }
  } else {
    flags.push({ slug, kind: "no-duration" });
  }

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
// Output
// ---------------------------------------------------------------------------
function printFlag(flag: Flag): void {
  switch (flag.kind) {
    case "density":
      console.log(
        `[FLAG] ${flag.slug}: density=${flag.density.toFixed(4)} (floor=${flag.threshold}) — ${flag.versesCount} verses / ${flag.songDurSec.toFixed(1)}s`
      );
      break;
    case "max-span":
      console.log(
        `[FLAG] ${flag.slug}: verse ${flag.verseNumber} spans ${flag.span_ms}ms (max=${flag.threshold}ms)`
      );
      break;
    case "all-zero":
      console.log(`[FLAG] ${flag.slug}: every verse at start_time_ms=0 (player will fall back to broken state)`);
      break;
    case "no-duration":
      console.log(`[FLAG] ${flag.slug}: no song duration (last verse end_time_ms=0)`);
      break;
    case "no-verses":
      console.log(`[FLAG] ${flag.slug}: lesson has no verses`);
      break;
  }
}

// ---------------------------------------------------------------------------
// Self-test
// ---------------------------------------------------------------------------
function runSelfTest(): void {
  console.log("=== audit-full-lessons self-test ===\n");

  // Mock 1: density flag — 1 verse / 200s = 0.005 < 0.03
  const sparseMock: Lesson = {
    verses: [{ verse_number: 1, start_time_ms: 1000, end_time_ms: 200_000 }],
  };
  const sparseFlags = auditLesson("self-test__sparse", sparseMock);
  const hasDensity = sparseFlags.some((f) => f.kind === "density");
  const hasMaxSpan = sparseFlags.some((f) => f.kind === "max-span");

  console.log("Mock 1 (sparse): 1 verse / 200s, span=199s");
  for (const f of sparseFlags) printFlag(f);
  console.log(hasDensity ? "  PASS density flag" : "  FAIL density flag");
  console.log(hasMaxSpan ? "  PASS max-span flag" : "  FAIL max-span flag");
  console.log();

  // Mock 2: all-zero
  const zeroMock: Lesson = {
    verses: [
      { verse_number: 1, start_time_ms: 0, end_time_ms: 0 },
      { verse_number: 2, start_time_ms: 0, end_time_ms: 0 },
    ],
  };
  const zeroFlags = auditLesson("self-test__zero", zeroMock);
  const hasAllZero = zeroFlags.some((f) => f.kind === "all-zero");
  console.log("Mock 2 (all-zero): 2 verses both start_time_ms=0");
  for (const f of zeroFlags) printFlag(f);
  console.log(hasAllZero ? "  PASS all-zero flag" : "  FAIL all-zero flag");
  console.log();

  // Mock 3: clean — 12 verses / 240s, max span 18s
  const cleanMock: Lesson = {
    verses: Array.from({ length: 12 }, (_, i) => ({
      verse_number: i + 1,
      start_time_ms: i * 18_000 + 1_000,
      end_time_ms: i * 18_000 + 18_000,
    })),
  };
  const cleanFlags = auditLesson("self-test__clean", cleanMock);
  console.log("Mock 3 (clean): 12 verses / ~216s, span=17s");
  console.log(cleanFlags.length === 0 ? "  PASS no flags" : `  FAIL unexpected flags: ${cleanFlags.length}`);
  console.log();

  const allOk = hasDensity && hasMaxSpan && hasAllZero && cleanFlags.length === 0;
  console.log(allOk ? "=== SELF-TEST PASSED ===" : "=== SELF-TEST FAILED ===");
  process.exit(allOk ? 0 : 1);
}

// ---------------------------------------------------------------------------
// DB mode
// ---------------------------------------------------------------------------
async function runDbMode(opts: {
  slug: string | null;
  verbose: boolean;
  jsonOut: string | null;
}): Promise<void> {
  const { getDb } = await import("../../src/lib/db/index.js");
  const { songs, songVersions } = await import("../../src/lib/db/schema.js");
  const { eq, and } = await import("drizzle-orm");

  const db = getDb();

  const where = opts.slug
    ? and(eq(songVersions.version_type, "full"), eq(songs.slug, opts.slug))
    : eq(songVersions.version_type, "full");

  const rows = await db
    .select({ slug: songs.slug, lesson: songVersions.lesson })
    .from(songVersions)
    .innerJoin(songs, eq(songs.id, songVersions.song_id))
    .where(where);

  if (rows.length === 0) {
    console.error(opts.slug ? `[audit] no full row for slug=${opts.slug}` : "[audit] no version_type='full' rows.");
    process.exit(opts.slug ? 1 : 0);
  }

  const allFlags: Flag[] = [];
  let nullLessonCount = 0;

  for (const row of rows) {
    if (!row.lesson) {
      nullLessonCount++;
      continue;
    }
    const lesson = row.lesson as Lesson;

    if (opts.verbose) {
      console.log(`\n--- ${row.slug} (${lesson.verses?.length ?? 0} verses) ---`);
      for (const v of lesson.verses ?? []) {
        const span = v.end_time_ms - v.start_time_ms;
        console.log(`  v${v.verse_number}: ${v.start_time_ms}ms–${v.end_time_ms}ms span=${span}ms`);
      }
    }

    const flags = auditLesson(row.slug, lesson);
    for (const flag of flags) {
      printFlag(flag);
      allFlags.push(flag);
    }
  }

  const flaggedSlugs = new Set(allFlags.map((f) => f.slug));
  console.log(
    `\nAudited ${rows.length} full-version lessons (${nullLessonCount} null); ${flaggedSlugs.size} flagged across ${allFlags.length} dimensions.`
  );

  // Group counts by kind
  const byKind = allFlags.reduce<Record<string, number>>((acc, f) => {
    acc[f.kind] = (acc[f.kind] ?? 0) + 1;
    return acc;
  }, {});
  console.log("Flag counts by kind:", byKind);

  if (opts.jsonOut) {
    const report = {
      generated_at: new Date().toISOString(),
      version: "full",
      thresholds: { density_floor: DENSITY_FLOOR, max_verse_span_ms: MAX_VERSE_SPAN_MS },
      summary: {
        audited: rows.length,
        null_lesson: nullLessonCount,
        flagged_slugs: flaggedSlugs.size,
        total_flags: allFlags.length,
        by_kind: byKind,
      },
      flags: allFlags,
    };
    writeFileSync(resolve(opts.jsonOut), JSON.stringify(report, null, 2));
    console.log(`Report written: ${opts.jsonOut}`);
  }

  process.exit(allFlags.length === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function printHelp(): void {
  console.log(`
audit-full-lessons.ts — Regression guard for degenerate full-version lessons

USAGE
  npx tsx scripts/seed/audit-full-lessons.ts [options]

OPTIONS
  (default)       DB mode — reads song_versions.lesson WHERE version_type='full'
  --slug <slug>   Audit a single song
  --verbose       Per-verse details
  --self-test     Logic regression test
  --json <path>   Write JSON report
  --help          Show this help

THRESHOLDS
  density floor:  ${DENSITY_FLOOR} verses/sec
  max-span:       ${MAX_VERSE_SPAN_MS}ms per verse

EXIT CODES
  0 = clean
  1 = at least one flagged lesson
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
    return;
  }

  const verbose = args.includes("--verbose");
  let slug: string | null = null;
  let jsonOut: string | null = null;

  const slugIdx = args.indexOf("--slug");
  if (slugIdx !== -1 && args[slugIdx + 1]) slug = args[slugIdx + 1];

  const jsonIdx = args.indexOf("--json");
  if (jsonIdx !== -1 && args[jsonIdx + 1]) jsonOut = args[jsonIdx + 1];

  await runDbMode({ slug, verbose, jsonOut });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
