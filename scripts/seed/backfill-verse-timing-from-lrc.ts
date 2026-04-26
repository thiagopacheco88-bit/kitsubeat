/**
 * Backfill lesson.verses[i].start_time_ms / end_time_ms for every song_version
 * where every verse currently has start_time_ms = end_time_ms = 0.
 *
 * Rationale: many lessons were ingested without per-verse timing (CONTEXT.md
 * "162 zero-timed lessons"). The runtime player computes timing on the fly
 * from synced_lrc + buildVerseTiming, but downstream tooling (15-split-
 * oversized-verses.ts in particular) treats verse.start_time_ms as the source
 * of truth and gives up on zero-timed verses.
 *
 * Algorithm per song_version:
 *   1. Skip if synced_lrc is missing.
 *   2. Run buildVerseTiming (shared module — same matcher the UI uses) to
 *      compute LRC-frame {startMs, endMs} per verse_number.
 *   3. For each individual verse currently at start=end=0, write the matched
 *      timing back to lesson JSONB. Verses with existing non-zero timing are
 *      preserved as-is. Verses the matcher can't align stay at 0/0.
 *
 * Frame: synced_lrc lines are in the LRC reference (no lyrics_offset_ms
 * applied). restore-verse-order.ts uses the same convention. The player
 * adds offsetMs at render time.
 *
 * Dry-run by default; pass --apply to persist. --slug X to limit scope.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import { songs, songVersions } from "../../src/lib/db/schema.js";
import { eq } from "drizzle-orm";
import { buildVerseTiming, normalizeForMatch, type SyncedLine } from "../../src/lib/verse-timing.js";
import type { Verse } from "../../src/lib/types/lesson.js";

interface Lesson { verses: Verse[] }

const LOCAL_PROBE_LEN = 6;
const LOCAL_PROBE_MIN = 4;

/**
 * Per-verse local search for verses the linear matcher silently skipped.
 * Linear matcher advances lrcIdx as it consumes lines, so a verse whose LRC
 * counterpart appears EARLIER than the previous verse's match (or further
 * down past a long lookahead window the linear matcher gave up on) gets no
 * timing entry. This fallback scans the whole LRC for the verse's first ~6
 * normalized chars and uses the first containing line as the verse's start.
 */
function localSearchForVerse(verseText: string, synced: SyncedLine[]): { startMs: number; endMs: number } | null {
  const probe = verseText.slice(0, Math.min(LOCAL_PROBE_LEN, verseText.length));
  if (probe.length < LOCAL_PROBE_MIN) return null;
  const idx = synced.findIndex((l) => normalizeForMatch(l.text).includes(probe));
  if (idx < 0) return null;
  const endMs = idx + 1 < synced.length ? synced[idx + 1].startMs : synced[idx].startMs + 5000;
  return { startMs: synced[idx].startMs, endMs };
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const slugFilter = args.includes("--slug") ? args[args.indexOf("--slug") + 1] : null;

const db = getDb();
const baseQuery = db
  .select({ song: songs, ver: songVersions })
  .from(songVersions)
  .innerJoin(songs, eq(songVersions.song_id, songs.id));
const rows = slugFilter
  ? await baseQuery.where(eq(songs.slug, slugFilter))
  : await baseQuery;

let scanned = 0;
let noSynced = 0;
let emptyLesson = 0;
let totalZeroed = 0;
let backfilled: Array<{ slug: string; song_version_id: string; updated: number; zeroed: number; total: number; lesson: Lesson }> = [];

for (const r of rows) {
  scanned++;
  const lesson = r.ver.lesson as Lesson | null;
  const synced = (r.ver.synced_lrc as SyncedLine[] | null) ?? null;

  if (!lesson?.verses?.length) { emptyLesson++; continue; }
  if (!synced?.length) { noSynced++; continue; }

  const zeroed = lesson.verses.filter((v) => v.start_time_ms === 0 && v.end_time_ms === 0).length;
  if (zeroed === 0) continue;
  totalZeroed += zeroed;

  const timings = buildVerseTiming(lesson.verses, synced);

  const cloned: Lesson = { ...lesson, verses: lesson.verses.map((v) => ({ ...v })) };
  let updated = 0;
  for (const v of cloned.verses) {
    if (v.start_time_ms !== 0 || v.end_time_ms !== 0) continue;
    let t = timings.get(v.verse_number);
    if (!t) {
      const verseText = normalizeForMatch(v.tokens.map((tok) => tok.surface).join(""));
      t = localSearchForVerse(verseText, synced) ?? undefined;
    }
    if (t) {
      v.start_time_ms = t.startMs;
      v.end_time_ms = t.endMs;
      updated++;
    }
  }
  if (updated > 0) {
    backfilled.push({ slug: r.song.slug, song_version_id: r.ver.id, updated, zeroed, total: cloned.verses.length, lesson: cloned });
  }
}

console.log(`scanned=${scanned}  noSynced=${noSynced}  emptyLesson=${emptyLesson}  zeroedVerses=${totalZeroed}  toBackfill=${backfilled.length} songs`);
backfilled.sort((a, b) => b.updated - a.updated);
console.log("\nbackfill targets (top 30 by verses fixed):");
for (const b of backfilled.slice(0, 30)) {
  console.log(`  ${b.slug.padEnd(50)} fixed ${b.updated}/${b.zeroed} zeroed  (${b.total} total verses)`);
}
if (backfilled.length > 30) console.log(`  … ${backfilled.length - 30} more`);

if (apply) {
  console.log(`\nApplying ${backfilled.length} updates…`);
  let applied = 0, failed: string[] = [];
  const BATCH = 8;
  for (let i = 0; i < backfilled.length; i += BATCH) {
    const slice = backfilled.slice(i, i + BATCH);
    const settled = await Promise.allSettled(slice.map((b) =>
      db.update(songVersions)
        .set({ lesson: b.lesson as unknown as Record<string, unknown> })
        .where(eq(songVersions.id, b.song_version_id))
    ));
    settled.forEach((s, j) => {
      if (s.status === "fulfilled") applied++;
      else failed.push(slice[j].slug);
    });
    process.stdout.write(`\r  ${applied}/${backfilled.length} applied  ${failed.length} failed`);
  }
  console.log();
  if (failed.length) console.log(`failed slugs: ${failed.join(", ")}`);
} else {
  console.log("\n(dry-run — pass --apply to write to DB)");
}
process.exit(0);
