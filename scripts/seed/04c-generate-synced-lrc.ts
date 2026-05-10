/**
 * 04c-generate-synced-lrc.ts — Backfill synced_lrc for songs that have WhisperX
 * timing but no synced_lrc (Genius-sourced songs and any whisper-source songs
 * missed by 04b).
 *
 * LRCLIB songs already have synced_lrc from step 02. WhisperX-backfilled songs
 * get synced_lrc written by 04b. This script covers Genius songs: they have
 * text lyrics but no line-level timestamps, which prevents restore-verse-order.ts
 * from expanding chorus repetitions.
 *
 * Strategy: derive line-level timestamps from the timing cache using the same
 * adaptive gap logic as 04b. Writes synced_lrc into the existing lyrics-cache
 * entry without changing any other fields.
 *
 * Usage:
 *   npx tsx scripts/seed/04c-generate-synced-lrc.ts
 *   npx tsx scripts/seed/04c-generate-synced-lrc.ts --version tv
 *   npx tsx scripts/seed/04c-generate-synced-lrc.ts --dry-run
 *   npx tsx scripts/seed/04c-generate-synced-lrc.ts --slug=sign-flow
 *   npx tsx scripts/seed/04c-generate-synced-lrc.ts --force   # overwrite existing synced_lrc
 */

import { config } from "dotenv";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import type { WordTiming, TimingResult } from "../lib/run-whisperx.ts";

config({ path: ".env.local" });

// ─────────────────────────────────────────────────────────────────────────────
// Args
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const versionArg = (() => {
  const idx = args.indexOf("--version");
  const raw = idx !== -1 ? args[idx + 1] : null;
  if (raw === "tv" || raw === "full") return raw;
  return "full" as const;
})();
const suffix = versionArg === "tv" ? "-tv" : "";
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const slugArg = args.find((a) => a.startsWith("--slug="))?.split("=")[1];

const LYRICS_CACHE_DIR = `data/lyrics-cache${suffix}`;
const TIMING_STEM_DIR = `data/timing-cache-stem${suffix}`;
const TIMING_CACHE_DIR = `data/timing-cache${suffix}`;

// ─────────────────────────────────────────────────────────────────────────────
// Gap thresholds — same constants as 04b
// ─────────────────────────────────────────────────────────────────────────────

const MIN_SIGNIFICANT_GAP_S = 0.15;
const LINE_GAP_CLAMP_S: [number, number] = [0.3, 0.7];
const VERSE_GAP_CLAMP_S: [number, number] = [1.0, 4.0];
const FALLBACK_LINE_GAP_S = 0.4;
const FALLBACK_VERSE_GAP_S = 1.5;

function clamp(value: number, [lo, hi]: [number, number]): number {
  return Math.min(hi, Math.max(lo, value));
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)));
  return sorted[idx];
}

function deriveThresholds(words: WordTiming[]): { lineGapS: number; verseGapS: number } {
  const gaps: number[] = [];
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end;
    if (gap >= MIN_SIGNIFICANT_GAP_S) gaps.push(gap);
  }
  if (gaps.length < 10) {
    return { lineGapS: FALLBACK_LINE_GAP_S, verseGapS: FALLBACK_VERSE_GAP_S };
  }
  gaps.sort((a, b) => a - b);
  const lineGapS = clamp(percentile(gaps, 0.5), LINE_GAP_CLAMP_S);
  const verseGapS = clamp(
    Math.max(percentile(gaps, 0.8), lineGapS * 2),
    VERSE_GAP_CLAMP_S,
  );
  return { lineGapS, verseGapS };
}

// ─────────────────────────────────────────────────────────────────────────────
// Core: derive synced_lrc from word-level timing
// ─────────────────────────────────────────────────────────────────────────────

function deriveSyncedLrc(
  words: WordTiming[],
): Array<{ startMs: number; text: string }> {
  if (words.length === 0) return [];

  const { lineGapS, verseGapS } = deriveThresholds(words);
  const syncedLines: Array<{ startMs: number; text: string }> = [];
  let prevEnd: number | null = null;
  let lineStartMs: number | null = null;
  const lineWords: string[] = [];

  function flushLine() {
    if (lineStartMs !== null && lineWords.length > 0) {
      syncedLines.push({
        startMs: Math.round(lineStartMs * 1000),
        text: lineWords.join(" ").trim(),
      });
    }
    lineStartMs = null;
    lineWords.length = 0;
  }

  for (const w of words) {
    const wordText = w.word.trim();
    if (!wordText) continue;

    if (prevEnd !== null) {
      const gap = w.start - prevEnd;
      if (gap >= verseGapS || gap >= lineGapS) {
        flushLine();
      }
    }

    if (lineStartMs === null) lineStartMs = w.start;
    lineWords.push(wordText);
    prevEnd = w.end;
  }

  flushLine();
  return syncedLines;
}

// ─────────────────────────────────────────────────────────────────────────────
// IO
// ─────────────────────────────────────────────────────────────────────────────

function readJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return null;
  }
}

function readTimingCache(slug: string): TimingResult | null {
  const stem = readJson<TimingResult>(join(TIMING_STEM_DIR, `${slug}.json`));
  if (stem?.words?.length) return stem;
  return readJson<TimingResult>(join(TIMING_CACHE_DIR, `${slug}.json`));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

interface LyricsCacheEntry {
  slug: string;
  source: string;
  synced_lrc: Array<{ startMs: number; text: string }> | null | unknown;
  [key: string]: unknown;
}

const slugs: string[] = slugArg
  ? [slugArg]
  : readdirSync(LYRICS_CACHE_DIR)
      .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
      .map((f) => f.replace(".json", ""))
      .sort();

console.log(`=== 04c-generate-synced-lrc (version=${versionArg}${dryRun ? " DRY-RUN" : ""}) ===`);
console.log(`  lyrics: ${LYRICS_CACHE_DIR}  stem: ${TIMING_STEM_DIR}\n`);

let updated = 0;
let skipped = 0;
let noTiming = 0;
let alreadyHas = 0;

for (const slug of slugs) {
  const lyricsPath = join(LYRICS_CACHE_DIR, `${slug}.json`);
  const entry = readJson<LyricsCacheEntry>(lyricsPath);
  if (!entry) { skipped++; continue; }

  // Only process songs without synced_lrc (unless --force)
  if (!force && entry.synced_lrc && Array.isArray(entry.synced_lrc) && entry.synced_lrc.length > 0) {
    alreadyHas++;
    continue;
  }

  // Skip LRCLIB — it has official synced_lrc from the source
  if (entry.source === "lrclib") { alreadyHas++; continue; }

  const timing = readTimingCache(slug);
  if (!timing?.words?.length) { noTiming++; continue; }

  const synced_lrc = deriveSyncedLrc(timing.words);
  if (synced_lrc.length === 0) { skipped++; continue; }

  console.log(
    `  [${dryRun ? "dry" : "write"}] ${slug.padEnd(50)} source=${entry.source}  lines=${synced_lrc.length}`
  );

  if (!dryRun) {
    const patched = { ...entry, synced_lrc };
    writeFileSync(lyricsPath, JSON.stringify(patched, null, 2), "utf-8");
  }
  updated++;
}

console.log(`\n=== done: updated=${updated}  already-has=${alreadyHas}  no-timing=${noTiming}  skipped=${skipped} ===`);
if (dryRun && updated > 0) {
  console.log(`  (dry-run — rerun without --dry-run to apply)`);
}
