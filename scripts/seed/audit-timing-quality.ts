/**
 * Two catalog-wide timing audits:
 *
 * 1. DRIFT: a single lyrics_offset_ms can correct intro pre-roll but can't
 *    correct tempo mismatch between LRCLIB master and the YouTube cut. Detect
 *    by comparing Whisper word timestamps to expected LRC-line timestamps at
 *    multiple sample points across the song. Residual = whisper_t - (lrc_t +
 *    offset). If residual GROWS over the song, tempo drift exists.
 *
 * 2. MISSING_INTRO: lessons where Whisper detects confident vocal content
 *    significantly before the first verse's effective start (start_time_ms +
 *    offset). The lesson skipped intro lyrics that exist in the audio.
 *
 * Sample points for drift: pick 4 LRC lines spaced through the song (10%,
 * 35%, 65%, 90%) and find the closest Whisper word. Compute residual at each.
 * If max residual - min residual > DRIFT_THRESHOLD_MS, flag as drift.
 *
 * For missing-intro: take the first Whisper word with score >= 0.4 (filters
 * noise) and compare its start to (verse[0].start_time_ms + offset).
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

const DRIFT_THRESHOLD_MS = 1500;
const MISSING_INTRO_THRESHOLD_MS = 4000;
const PROBE_LEN = 6;
const TIMING_CACHE_DIR = path.resolve(import.meta.dirname, "../../data/timing-cache");
const args = process.argv.slice(2);
const slugFilter = args.includes("--slug") ? args[args.indexOf("--slug") + 1] : null;

const db = getDb();
const baseQuery = db
  .select({ song: songs, ver: songVersions })
  .from(songVersions)
  .innerJoin(songs, eq(songVersions.song_id, songs.id));
const rows = slugFilter
  ? await baseQuery.where(eq(songs.slug, slugFilter))
  : await baseQuery;

interface DriftHit { slug: string; offset: number; residuals: Array<{ atLrcS: number; whisperS: number; residualMs: number }>; spreadMs: number; maxAbsMs: number }
interface IntroHit { slug: string; offset: number; firstWhisperMs: number; firstVerseEffectiveMs: number; gapMs: number }

const drift: DriftHit[] = [];
const intros: IntroHit[] = [];
let scanned = 0;
let skippedNoSync = 0;
let skippedNoCache = 0;

for (const r of rows) {
  scanned++;
  const lesson = r.ver.lesson as Lesson | null;
  const synced = (r.ver.synced_lrc as SyncedLine[] | null) ?? null;
  const offsetMs = r.ver.lyrics_offset_ms ?? 0;
  if (!lesson?.verses?.length) continue;
  if (!synced?.length) { skippedNoSync++; continue; }

  const cachePath = path.join(TIMING_CACHE_DIR, `${r.song.slug}.json`);
  if (!fs.existsSync(cachePath)) { skippedNoCache++; continue; }
  const tc = JSON.parse(fs.readFileSync(cachePath, "utf8")) as TimingCache;
  const words = tc.words ?? [];
  if (words.length === 0) continue;

  // ---- DRIFT detection ----
  // Only sample LRC lines whose first PROBE_LEN normalized chars are UNIQUE
  // across the song. Chorus repeats (e.g. "ChAngE なびかない 流されないよ"
  // appearing at 0:01 and 1:00) would otherwise cause the Whisper search to
  // return the FIRST occurrence regardless of which sample we wanted, giving
  // wildly wrong residuals (200+ second spreads in v1 of the audit).
  const probeFreq = new Map<string, number>();
  for (const l of synced) {
    const p = normalizeForMatch(l.text).slice(0, PROBE_LEN);
    if (p.length < 4) continue;
    probeFreq.set(p, (probeFreq.get(p) ?? 0) + 1);
  }
  const uniqueLines = synced.filter((l) => {
    const p = normalizeForMatch(l.text).slice(0, PROBE_LEN);
    return p.length >= 4 && probeFreq.get(p) === 1;
  });
  if (uniqueLines.length < 3) {
    // Not enough unique lines to draw a reliable drift conclusion.
  } else {
    // Sample 4 evenly-spaced lines from the unique-lines pool.
    const samples = [0.10, 0.35, 0.65, 0.90]
      .map((p) => uniqueLines[Math.floor(uniqueLines.length * p)])
      .filter(Boolean);
    const residuals: Array<{ atLrcS: number; whisperS: number; residualMs: number }> = [];
    for (const lrcLine of samples) {
      const probe = normalizeForMatch(lrcLine.text).slice(0, PROBE_LEN);
      let acc = "", runStart = -1, foundAt = -1;
      for (let i = 0; i < words.length; i++) {
        const w = normalizeForMatch(words[i].word);
        if (!w) continue;
        if (runStart === -1) runStart = i;
        acc += w;
        if (acc.includes(probe)) { foundAt = words[runStart].start; break; }
        if (acc.length > probe.length * 5) { runStart = -1; acc = ""; }
      }
      if (foundAt < 0) continue;
      const expectedYoutubeMs = lrcLine.startMs + offsetMs;
      const residualMs = Math.round(foundAt * 1000 - expectedYoutubeMs);
      residuals.push({ atLrcS: lrcLine.startMs / 1000, whisperS: foundAt, residualMs });
    }
    if (residuals.length >= 3) {
      const min = Math.min(...residuals.map((r) => r.residualMs));
      const max = Math.max(...residuals.map((r) => r.residualMs));
      const spread = max - min;
      if (spread > DRIFT_THRESHOLD_MS) {
        const maxAbs = Math.max(...residuals.map((r) => Math.abs(r.residualMs)));
        drift.push({ slug: r.song.slug, offset: offsetMs, residuals, spreadMs: spread, maxAbsMs: maxAbs });
      }
    }
  }

  // ---- MISSING_INTRO detection ----
  const firstConfidentWhisper = words.find((w) => (w.score ?? 0) >= 0.4 && (w.start ?? 0) > 0);
  if (firstConfidentWhisper && lesson.verses[0]?.start_time_ms !== undefined) {
    const firstVerseEffectiveMs = lesson.verses[0].start_time_ms + offsetMs;
    const firstWhisperMs = Math.round(firstConfidentWhisper.start * 1000);
    const gap = firstVerseEffectiveMs - firstWhisperMs;
    if (gap > MISSING_INTRO_THRESHOLD_MS) {
      intros.push({ slug: r.song.slug, offset: offsetMs, firstWhisperMs, firstVerseEffectiveMs, gapMs: gap });
    }
  }
}

console.log(`scanned=${scanned}  skippedNoSync=${skippedNoSync}  skippedNoCache=${skippedNoCache}`);

drift.sort((a, b) => b.spreadMs - a.spreadMs);
console.log(`\n=== DRIFT (residual spread > ${DRIFT_THRESHOLD_MS}ms across song) — ${drift.length} songs ===`);
for (const d of drift.slice(0, 30)) {
  const summary = d.residuals.map((r) => `@${r.atLrcS.toFixed(0)}s=${r.residualMs > 0 ? "+" : ""}${r.residualMs}`).join("  ");
  console.log(`  ${d.slug.padEnd(50)} spread=${d.spreadMs}ms  | ${summary}`);
}

intros.sort((a, b) => b.gapMs - a.gapMs);
console.log(`\n=== MISSING_INTRO (first whisper word > ${MISSING_INTRO_THRESHOLD_MS}ms before first verse) — ${intros.length} songs ===`);
for (const i of intros.slice(0, 30)) {
  console.log(`  ${i.slug.padEnd(50)} gap=${(i.gapMs/1000).toFixed(1)}s  whisperFirst=${(i.firstWhisperMs/1000).toFixed(2)}s  v1@yt=${(i.firstVerseEffectiveMs/1000).toFixed(2)}s`);
}

process.exit(0);
