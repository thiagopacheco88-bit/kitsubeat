/**
 * retime-batch.ts — Batch retime all full-version lessons flagged by audit-full-lessons.
 *
 * Reads data/full-lessons-audit.json for "all-zero" and "no-duration" slugs,
 * retimes each using WhisperX word timing (stem preferred over raw), writes
 * updated lessons to data/lessons-cache/, then bulk-upserts to DB via
 * 05-insert-db's upsert logic.
 *
 * Safe to re-run: lessons that gain fewer than MIN_ALIGNED_VERSES aligned verses
 * are skipped (written to disk but excluded from the DB push) to avoid replacing
 * functional LRC-derived player timing with a worse estimate.
 *
 * Usage:
 *   npx tsx scripts/seed/retime-batch.ts               # dry-run (no disk writes)
 *   npx tsx scripts/seed/retime-batch.ts --apply       # write disk + push to DB
 *   npx tsx scripts/seed/retime-batch.ts --apply --kind all-zero   # only all-zero
 *   npx tsx scripts/seed/retime-batch.ts --apply --kind no-duration
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve, join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../../");

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const AUDIT_PATH     = join(ROOT, "data/full-lessons-audit.json");
const LESSONS_DIR    = join(ROOT, "data/lessons-cache");
const STEM_DIR       = join(ROOT, "data/timing-cache-stem");
const RAW_DIR        = join(ROOT, "data/timing-cache");

// A retime result must have at least this many whisperx-lcs aligned verses
// to be considered trustworthy enough to push to DB.
const MIN_ALIGNED_VERSES = 2;

// ─────────────────────────────────────────────────────────────────────────────
// CLI args
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const kindFilter = args.includes("--kind") ? args[args.indexOf("--kind") + 1] : null;

// ─────────────────────────────────────────────────────────────────────────────
// Types (mirrors retime-lesson-from-whisperx.ts)
// ─────────────────────────────────────────────────────────────────────────────

interface CharTime { ch: string; startMs: number; endMs: number; }
interface WhisperWord { word: string; start: number; end: number; }
interface Verse { verse_number: number; start_time_ms: number; end_time_ms: number; tokens: Array<{ surface: string }>; [k: string]: unknown; }
interface Lesson { verses: Verse[]; [k: string]: unknown; }

// ─────────────────────────────────────────────────────────────────────────────
// Core retime logic (identical to retime-lesson-from-whisperx.ts)
// ─────────────────────────────────────────────────────────────────────────────

function toWhisperChars(words: WhisperWord[]): CharTime[] {
  const out: CharTime[] = [];
  for (const w of words) {
    const chars = [...w.word].filter((c) => c.trim());
    if (!chars.length) continue;
    const dur = (w.end - w.start) / chars.length;
    chars.forEach((ch, i) => {
      out.push({
        ch,
        startMs: Math.round((w.start + dur * i) * 1000),
        endMs:   Math.round((w.start + dur * (i + 1)) * 1000),
      });
    });
  }
  return out;
}

function verseChars(v: Verse): string[] {
  return [...v.tokens.map((t) => t.surface).join("")].filter((c) => c.trim());
}

interface TimingResult {
  verse_number: number;
  start_time_ms: number | null;
  end_time_ms:   number | null;
  source: string;
}

function retimeLesson(lesson: Lesson, whisperChars: CharTime[]): { timings: TimingResult[]; alignedCount: number } {
  const verseAlignments: Array<{ verse: Verse; firstIdx: number; lastIdx: number }> = [];
  let cursor = 0;

  for (const v of lesson.verses) {
    const vChars = verseChars(v);
    if (!vChars.length) { verseAlignments.push({ verse: v, firstIdx: -1, lastIdx: -1 }); continue; }

    const windowLen = Math.min(whisperChars.length - cursor, Math.max(20, Math.round(vChars.length * 1.5)));
    if (windowLen <= 0) { verseAlignments.push({ verse: v, firstIdx: -1, lastIdx: -1 }); continue; }

    const vSet = new Set(vChars);
    let bestStart = -1, bestScore = -1, bestEnd = -1;
    const tryStarts = Math.min(50, whisperChars.length - cursor);
    for (let s = 0; s < tryStarts; s++) {
      const wStart = cursor + s;
      const wEnd = Math.min(whisperChars.length, wStart + windowLen);
      let score = 0;
      for (let i = wStart; i < wEnd; i++) if (vSet.has(whisperChars[i].ch)) score++;
      if (score > bestScore) { bestScore = score; bestStart = wStart; bestEnd = wEnd; }
    }

    if (bestScore >= Math.max(2, Math.floor(vChars.length * 0.3))) {
      let firstMatch = -1, lastMatch = -1;
      for (let i = bestStart; i < bestEnd; i++) {
        if (vSet.has(whisperChars[i].ch)) {
          if (firstMatch === -1) firstMatch = i;
          lastMatch = i;
        }
      }
      verseAlignments.push({ verse: v, firstIdx: firstMatch, lastIdx: lastMatch });
      cursor = lastMatch + 1;
    } else {
      verseAlignments.push({ verse: v, firstIdx: -1, lastIdx: -1 });
    }
  }

  const timings: TimingResult[] = verseAlignments.map(({ verse, firstIdx, lastIdx }) => {
    if (firstIdx === -1) return { verse_number: verse.verse_number, start_time_ms: null, end_time_ms: null, source: "unaligned" };
    return {
      verse_number: verse.verse_number,
      start_time_ms: whisperChars[firstIdx].startMs,
      end_time_ms:   whisperChars[lastIdx].endMs,
      source: "whisperx-lcs",
    };
  });

  const aligned = timings.filter((t) => t.start_time_ms !== null);
  if (aligned.length >= 2) {
    const totalAlignedChars = lesson.verses
      .filter((_, i) => timings[i].start_time_ms !== null)
      .reduce((sum, v) => sum + verseChars(v).length, 0);
    const totalAlignedMs = aligned[aligned.length - 1].end_time_ms! - aligned[0].start_time_ms!;
    const msPerChar = totalAlignedMs / Math.max(totalAlignedChars, 1);

    for (let i = 0; i < timings.length; i++) {
      if (timings[i].start_time_ms !== null) continue;
      const vLen = verseChars(lesson.verses[i]).length;
      let prevAligned = i - 1;
      while (prevAligned >= 0 && timings[prevAligned].start_time_ms === null) prevAligned--;
      let nextAligned = i + 1;
      while (nextAligned < timings.length && timings[nextAligned].start_time_ms === null) nextAligned++;
      if (prevAligned >= 0) {
        const start = timings[prevAligned].end_time_ms! + 100;
        timings[i].start_time_ms = start;
        timings[i].end_time_ms   = Math.round(start + vLen * msPerChar);
        timings[i].source        = "extrapolated-forward";
      } else if (nextAligned < timings.length) {
        const end   = timings[nextAligned].start_time_ms! - 100;
        const start = Math.max(0, Math.round(end - vLen * msPerChar));
        timings[i].start_time_ms = start;
        timings[i].end_time_ms   = end;
        timings[i].source        = "extrapolated-backward";
      }
    }
  }

  return { timings, alignedCount: aligned.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// Load timing (prefer stem over raw)
// ─────────────────────────────────────────────────────────────────────────────

function loadTiming(slug: string): { words: WhisperWord[]; source: "stem" | "raw" } | null {
  const stemPath = join(STEM_DIR, `${slug}.json`);
  const rawPath  = join(RAW_DIR,  `${slug}.json`);
  if (existsSync(stemPath)) {
    const data = JSON.parse(readFileSync(stemPath, "utf-8"));
    return { words: data.words ?? [], source: "stem" };
  }
  if (existsSync(rawPath)) {
    const data = JSON.parse(readFileSync(rawPath, "utf-8"));
    return { words: data.words ?? [], source: "raw" };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

if (!existsSync(AUDIT_PATH)) {
  console.error(`[retime-batch] audit file not found: ${AUDIT_PATH}`);
  console.error("Run: npx tsx scripts/seed/audit-full-lessons.ts --json data/full-lessons-audit.json");
  process.exit(1);
}

const audit = JSON.parse(readFileSync(AUDIT_PATH, "utf-8"));
const allFlags: Array<{ slug: string; kind: string }> = audit.flags ?? [];

// Collect unique broken slugs for the requested kind(s)
const targetKinds = kindFilter ? [kindFilter] : ["all-zero", "no-duration"];
const brokenSlugs = [...new Set(
  allFlags
    .filter((f) => targetKinds.includes(f.kind))
    .map((f) => f.slug)
)];

console.log(`=== retime-batch ===`);
console.log(`  mode:       ${apply ? "APPLY" : "DRY-RUN"}`);
console.log(`  kinds:      ${targetKinds.join(", ")}`);
console.log(`  broken:     ${brokenSlugs.length} songs`);
console.log();

type Result = { slug: string; status: "ok" | "skip" | "error"; alignedVerses?: number; totalVerses?: number; timingSource?: string; reason?: string };
const results: Result[] = [];

for (const slug of brokenSlugs) {
  const lessonPath = join(LESSONS_DIR, `${slug}.json`);
  if (!existsSync(lessonPath)) {
    results.push({ slug, status: "skip", reason: "no lesson-cache file" });
    continue;
  }

  const timing = loadTiming(slug);
  if (!timing) {
    results.push({ slug, status: "skip", reason: "no timing cache" });
    continue;
  }

  if (timing.words.length === 0) {
    results.push({ slug, status: "skip", reason: "timing cache empty (0 words)" });
    continue;
  }

  try {
    const lesson: Lesson = JSON.parse(readFileSync(lessonPath, "utf-8"));
    const whisperChars = toWhisperChars(timing.words);
    const { timings, alignedCount } = retimeLesson(lesson, whisperChars);

    if (alignedCount < MIN_ALIGNED_VERSES) {
      results.push({ slug, status: "skip", reason: `only ${alignedCount} verses aligned (min ${MIN_ALIGNED_VERSES})`, alignedVerses: alignedCount, totalVerses: lesson.verses.length });
      continue;
    }

    if (apply) {
      for (let i = 0; i < lesson.verses.length; i++) {
        const t = timings[i];
        if (t.start_time_ms !== null) {
          lesson.verses[i].start_time_ms = t.start_time_ms;
          lesson.verses[i].end_time_ms   = t.end_time_ms!;
        }
      }
      writeFileSync(lessonPath, JSON.stringify(lesson, null, 2), "utf-8");
    }

    results.push({ slug, status: "ok", alignedVerses: alignedCount, totalVerses: lesson.verses.length, timingSource: timing.source });
  } catch (err) {
    results.push({ slug, status: "error", reason: (err as Error).message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Report
// ─────────────────────────────────────────────────────────────────────────────

const ok    = results.filter((r) => r.status === "ok");
const skip  = results.filter((r) => r.status === "skip");
const error = results.filter((r) => r.status === "error");

console.log(`Results:`);
console.log(`  ok (will push):   ${ok.length}`);
console.log(`  skipped:          ${skip.length}`);
console.log(`  errors:           ${error.length}`);

if (skip.length) {
  console.log(`\nSkipped:`);
  for (const r of skip) console.log(`  ${r.slug}: ${r.reason}`);
}
if (error.length) {
  console.log(`\nErrors:`);
  for (const r of error) console.log(`  ${r.slug}: ${r.reason}`);
}

if (!apply) {
  console.log(`\n(dry-run — re-run with --apply to write disk + push DB)`);
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk DB push for successfully retimed lessons
// ─────────────────────────────────────────────────────────────────────────────

if (ok.length === 0) {
  console.log("\nNothing to push.");
  process.exit(0);
}

console.log(`\nPushing ${ok.length} retimed lessons to DB...`);
const { getDb } = await import("../../src/lib/db/index.js");
const { songs, songVersions } = await import("../../src/lib/db/schema.js");
const { eq, and, inArray } = await import("drizzle-orm");

const db = getDb();
const okSlugs = ok.map((r) => r.slug);

const songRows = await db
  .select({ id: songs.id, slug: songs.slug })
  .from(songs)
  .where(inArray(songs.slug, okSlugs));

const slugToId = new Map(songRows.map((r) => [r.slug, r.id]));

let pushed = 0;
let pushErrors = 0;

for (const result of ok) {
  const songId = slugToId.get(result.slug);
  if (!songId) { console.warn(`  [skip] ${result.slug} — not found in songs table`); continue; }

  const lessonPath = join(LESSONS_DIR, `${result.slug}.json`);
  const lesson = JSON.parse(readFileSync(lessonPath, "utf-8"));

  try {
    await db
      .update(songVersions)
      .set({ lesson, updated_at: new Date() })
      .where(and(eq(songVersions.song_id, songId), eq(songVersions.version_type, "full")));

    try {
      const { revalidateSongCache } = await import("../../src/app/actions/cache.js");
      await revalidateSongCache(result.slug);
    } catch { /* expected outside Next.js runtime */ }

    pushed++;
    process.stdout.write(`  [ok] ${result.slug} (${result.alignedVerses}/${result.totalVerses} aligned, ${result.timingSource})\n`);
  } catch (err) {
    console.error(`  [err] ${result.slug}: ${(err as Error).message}`);
    pushErrors++;
  }
}

console.log(`\nDB push: ${pushed} pushed, ${pushErrors} errors.`);
console.log("Done.");
