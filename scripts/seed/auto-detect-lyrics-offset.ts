/**
 * Auto-detect lyrics_offset_ms for every song_version where:
 *   - synced_lrc exists (so the player uses LRCLIB timing)
 *   - data/timing-cache/{slug}.json exists (vocal-stem WhisperX output)
 *
 * Algorithm:
 *   1. whisperStart = first WhisperX word's start * 1000. Vocal stems strip
 *      instruments + intro-card speech, so the first word IS the song start —
 *      we trust the timestamp even when the transcribed word is wrong (e.g.
 *      change-miwa: Whisper heard "眩か" instead of "なびか" but the timing
 *      is correct).
 *   2. lrcStart = first non-empty LRCLIB line's startMs.
 *   3. offset = whisperStart - lrcStart.
 *   4. Sanity gate (catches wrong-video): take all verse-token text from the
 *      lesson, all whisper text from the cache, count how many unique Japanese
 *      chars from the lesson appear in the whisper. If <30%, flag MISMATCH —
 *      the YouTube audio doesn't match the lesson lyrics.
 *
 * Dry-run by default. Pass --apply to write to song_versions.lyrics_offset_ms.
 * Pass --slug X to limit to one song.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";
import { getDb } from "../../src/lib/db/index.js";
import { songs, songVersions } from "../../src/lib/db/schema.js";
import { eq } from "drizzle-orm";
import { normalizeForMatch, type SyncedLine } from "../../src/lib/verse-timing.js";
import type { Verse } from "../../src/lib/types/lesson.js";

interface WhisperWord { word: string; start: number; end: number; score?: number; low_confidence?: boolean }
interface TimingCache { song_slug: string; words: WhisperWord[] }
interface Lesson { verses: Verse[] }

interface Result {
  slug: string;
  song_version_id: string;
  status: "OK" | "MISMATCH" | "NO_TIMING_CACHE" | "NO_SYNCED_LRC" | "EMPTY_VERSE" | "SUSPICIOUS_OFFSET";
  current: number;
  proposed: number | null;
  delta: number | null;
  whisper_start_ms?: number;
  lrc_start_ms?: number;
  overlap?: number;
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const slugFilter = args.includes("--slug") ? args[args.indexOf("--slug") + 1] : null;
const minOverlapArg = args.includes("--min-overlap") ? parseFloat(args[args.indexOf("--min-overlap") + 1]) : null;
const SUSPICIOUS_OFFSET_MS = 60_000;
const MISMATCH_THRESHOLD = 0.3;
const APPLY_MIN_OVERLAP = minOverlapArg ?? MISMATCH_THRESHOLD;
const TIMING_CACHE_DIR = path.resolve(import.meta.dirname, "../../data/timing-cache");

function firstWhisperWordStartMs(words: WhisperWord[]): number | null {
  for (const w of words) {
    if (typeof w.start === "number" && w.start > 0) return Math.round(w.start * 1000);
  }
  return null;
}

function firstNonEmptyLrcStartMs(lines: SyncedLine[]): number | null {
  for (const l of lines) {
    if (normalizeForMatch(l.text).length > 0) return l.startMs;
  }
  return null;
}

const KANA_KANJI_RE = /[぀-ゟ゠-ヿ一-鿿]/g;

/**
 * Bulk content-overlap check: how many of the lesson's unique Japanese chars
 * also appear anywhere in the whisper transcription. Returns 0..1. Below
 * ~0.3 implies the YouTube audio doesn't match the lesson (wrong video).
 */
function lessonWhisperOverlap(lessonText: string, whisperText: string): number {
  const lessonChars = new Set(lessonText.match(KANA_KANJI_RE) ?? []);
  if (lessonChars.size === 0) return 1; // can't judge — give the benefit of the doubt
  let hits = 0;
  for (const c of lessonChars) {
    if (whisperText.includes(c)) hits++;
  }
  return hits / lessonChars.size;
}

const db = getDb();

const baseQuery = db
  .select({ song: songs, ver: songVersions })
  .from(songVersions)
  .innerJoin(songs, eq(songVersions.song_id, songs.id));

const rows = slugFilter
  ? await baseQuery.where(eq(songs.slug, slugFilter))
  : await baseQuery;

const results: Result[] = [];

for (const r of rows) {
  const slug = r.song.slug;
  const lesson = r.ver.lesson as Lesson | null;
  const synced = (r.ver.synced_lrc as SyncedLine[] | null) ?? null;
  const current = r.ver.lyrics_offset_ms ?? 0;

  if (!synced?.length) {
    results.push({ slug, song_version_id: r.ver.id, status: "NO_SYNCED_LRC", current, proposed: null, delta: null });
    continue;
  }
  if (!lesson?.verses?.length) {
    results.push({ slug, song_version_id: r.ver.id, status: "EMPTY_VERSE", current, proposed: null, delta: null });
    continue;
  }

  const cachePath = path.join(TIMING_CACHE_DIR, `${slug}.json`);
  if (!fs.existsSync(cachePath)) {
    results.push({ slug, song_version_id: r.ver.id, status: "NO_TIMING_CACHE", current, proposed: null, delta: null });
    continue;
  }
  const timing = JSON.parse(fs.readFileSync(cachePath, "utf8")) as TimingCache;

  const lessonText = lesson.verses.map((v) => v.tokens.map((t) => t.surface).join("")).join("");
  if (lessonText.length === 0) {
    results.push({ slug, song_version_id: r.ver.id, status: "EMPTY_VERSE", current, proposed: null, delta: null });
    continue;
  }

  const whisperText = timing.words.map((w) => w.word).join("");
  const overlap = lessonWhisperOverlap(lessonText, whisperText);

  const whisperStart = firstWhisperWordStartMs(timing.words);
  const lrcStart = firstNonEmptyLrcStartMs(synced);

  if (overlap < MISMATCH_THRESHOLD || whisperStart === null || lrcStart === null) {
    results.push({
      slug,
      song_version_id: r.ver.id,
      status: "MISMATCH",
      current,
      proposed: null,
      delta: null,
      overlap,
      whisper_start_ms: whisperStart ?? undefined,
      lrc_start_ms: lrcStart ?? undefined,
    });
    continue;
  }

  const offset = whisperStart - lrcStart;
  const status = Math.abs(offset) > SUSPICIOUS_OFFSET_MS ? "SUSPICIOUS_OFFSET" : "OK";

  results.push({
    slug,
    song_version_id: r.ver.id,
    status,
    current,
    proposed: offset,
    delta: offset - current,
    whisper_start_ms: whisperStart,
    lrc_start_ms: lrcStart,
    overlap,
  });
}

const byStatus = new Map<string, Result[]>();
for (const r of results) {
  if (!byStatus.has(r.status)) byStatus.set(r.status, []);
  byStatus.get(r.status)!.push(r);
}

console.log("=== summary ===");
for (const [status, list] of byStatus) {
  console.log(`  ${status.padEnd(20)} ${list.length}`);
}

const oks = byStatus.get("OK") ?? [];
oks.sort((a, b) => Math.abs(b.proposed!) - Math.abs(a.proposed!));
console.log("\n=== OK songs (by absolute offset, top 30) ===");
for (const r of oks.slice(0, 30)) {
  console.log(
    `  ${r.slug.padEnd(50)} current=${String(r.current).padStart(6)} → proposed=${String(r.proposed).padStart(6)}ms (overlap=${(r.overlap! * 100).toFixed(0)}%)`
  );
}

const mismatches = byStatus.get("MISMATCH") ?? [];
if (mismatches.length) {
  mismatches.sort((a, b) => (a.overlap ?? 1) - (b.overlap ?? 1));
  console.log(`\n=== MISMATCH songs (${mismatches.length}) — overlap < ${MISMATCH_THRESHOLD * 100}% (wrong video / non-Japanese / outro card) ===`);
  for (const r of mismatches.slice(0, 30)) {
    console.log(
      `  ${r.slug.padEnd(50)} overlap=${r.overlap !== undefined ? (r.overlap * 100).toFixed(0) + "%" : "n/a"}  whisperFirst=${r.whisper_start_ms ?? "—"}ms  lrcFirst=${r.lrc_start_ms ?? "—"}ms`
    );
  }
}

const susp = byStatus.get("SUSPICIOUS_OFFSET") ?? [];
if (susp.length) {
  console.log(`\n=== SUSPICIOUS_OFFSET (>60s) ===`);
  for (const r of susp) {
    console.log(`  ${r.slug.padEnd(50)} proposed=${r.proposed}ms (overlap=${(r.overlap! * 100).toFixed(0)}%)`);
  }
}

if (apply) {
  const targets = oks.filter((r) => r.delta !== 0 && (r.overlap ?? 0) >= APPLY_MIN_OVERLAP);
  const skippedLowConf = oks.filter((r) => r.delta !== 0 && (r.overlap ?? 0) < APPLY_MIN_OVERLAP).length;
  console.log(`\nApplying ${targets.length} updates (min-overlap=${APPLY_MIN_OVERLAP}; skipping ${skippedLowConf} low-confidence rows)…`);

  let applied = 0, failed: string[] = [];
  const BATCH = 8;
  for (let i = 0; i < targets.length; i += BATCH) {
    const slice = targets.slice(i, i + BATCH);
    const settled = await Promise.allSettled(slice.map((r) =>
      db.update(songVersions)
        .set({ lyrics_offset_ms: r.proposed! })
        .where(eq(songVersions.id, r.song_version_id))
    ));
    settled.forEach((s, j) => {
      if (s.status === "fulfilled") applied++;
      else failed.push(slice[j].slug);
    });
    process.stdout.write(`\r  ${applied}/${targets.length} applied  ${failed.length} failed`);
  }
  console.log();
  if (failed.length) {
    console.log(`\nfailed slugs (retry by re-running): ${failed.join(", ")}`);
  }
} else {
  console.log(`\n(dry-run — pass --apply to write to DB; --min-overlap N defaults to ${MISMATCH_THRESHOLD})`);
}

process.exit(0);
