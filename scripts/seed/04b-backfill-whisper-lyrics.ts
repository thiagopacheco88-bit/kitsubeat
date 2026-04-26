/**
 * 04b-backfill-whisper-lyrics.ts — Reconstruct raw_lyrics and re-tokenize
 * songs that have `source: "pending_whisper"` in their lyrics-cache files.
 *
 * Context:
 *   Plan 02 marks songs as `source: "pending_whisper"` when LRCLIB and
 *   Genius both fail to return lyrics. Plan 03 runs WhisperX to produce
 *   word-level timing data in data/timing-cache/{slug}.json. This script
 *   bridges Plans 02 and 03: it reads the WhisperX word output, reconstructs
 *   plain-text `raw_lyrics`, re-tokenizes via kuroshiro, and writes back to
 *   data/lyrics-cache/{slug}.json so Plan 04 (content generation) always has
 *   non-empty lyrics + tokens for every song.
 *
 * Prerequisites:
 *   - data/songs-manifest.json must exist (built by Plan 01)
 *   - data/lyrics-cache/{slug}.json must exist per song (built by Plan 02)
 *   - data/timing-cache/{slug}.json must exist for pending_whisper songs (built by Plan 03)
 *
 * Idempotent: skips songs that are already backfilled (source !== "pending_whisper"
 * OR raw_lyrics is non-empty).
 *
 * Usage:
 *   npx tsx scripts/seed/04b-backfill-whisper-lyrics.ts
 *   npx tsx scripts/seed/04b-backfill-whisper-lyrics.ts --version tv
 */

import { config } from "dotenv";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { z } from "zod";
import { initKuroshiro, tokenizeLyrics, type LyricsToken } from "../lib/kuroshiro-tokenizer.ts";

// Only `slug` is used in this script; tv and full manifests both include it.
const ManifestSlugsSchema = z.array(z.object({ slug: z.string() }).passthrough());
import type { TimingResult, WordTiming } from "../lib/run-whisperx.ts";

// Load environment variables from .env.local
config({ path: ".env.local" });

// ─────────────────────────────────────────────────────────────────────────────
// Arg parsing — --version tv|full (default: full)
// ─────────────────────────────────────────────────────────────────────────────

const versionArg = (() => {
  const flagIdx = process.argv.indexOf("--version");
  const raw = flagIdx !== -1 ? process.argv[flagIdx + 1] : null;
  if (raw === "tv" || raw === "full") return raw;
  if (raw !== null) {
    console.error(`[error] --version must be 'tv' or 'full', got: ${raw}`);
    process.exit(1);
  }
  return "full" as const;
})();
const suffix = versionArg === "tv" ? "-tv" : "";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MANIFEST_PATH = `data/songs-manifest${suffix}.json`;
const LYRICS_CACHE_DIR = `data/lyrics-cache${suffix}`;
const TIMING_CACHE_DIR = `data/timing-cache${suffix}`;
const TIMING_STEM_DIR = `data/timing-cache-stem${suffix}`;
const BEAT_CACHE_DIR = `data/beat-cache`;

/** Minimum gap size (seconds) to even consider significant. Smaller gaps are
 *  normal inter-word spacing within a sung phrase. */
const MIN_SIGNIFICANT_GAP_S = 0.15;

/** Clamp ranges for the adaptive thresholds — prevent pathological songs
 *  (few words, or uniform spacing) from producing nonsensical splits. */
const LINE_GAP_CLAMP_S: [number, number] = [0.3, 0.7];
const VERSE_GAP_CLAMP_S: [number, number] = [1.0, 4.0];

/** Fallback fixed thresholds used when the song has too few gaps to derive
 *  an adaptive threshold from. */
const FALLBACK_LINE_GAP_S = 0.4;
const FALLBACK_VERSE_GAP_S = 1.5;

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirrors 02-fetch-lyrics.ts LyricsCacheEntry
// ─────────────────────────────────────────────────────────────────────────────

type LyricsSource = "lrclib" | "genius" | "pending_whisper" | "whisper";

interface LyricsCacheEntry {
  slug: string;
  title: string;
  artist: string;
  source: LyricsSource;
  raw_lyrics: string;
  synced_lrc: unknown | null;
  tokens: LyricsToken[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Raw lyrics reconstruction from WhisperX words
// ─────────────────────────────────────────────────────────────────────────────

/** Percentile helper for a pre-sorted-ascending array. */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)));
  return sorted[idx];
}

function clamp(value: number, [lo, hi]: [number, number]): number {
  return Math.min(hi, Math.max(lo, value));
}

interface BeatCache {
  song_slug: string;
  tempo_bpm: number;
  beats_s: number[];
}

function readBeatCache(slug: string): BeatCache | null {
  const path = join(BEAT_CACHE_DIR, `${slug}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as BeatCache;
  } catch {
    return null;
  }
}

/** Snap a value in `values` to the nearest `grid` entry. O(log n) via binary
 *  search — used to anchor adaptive thresholds to beat boundaries. */
function snapToNearest(value: number, grid: number[]): number {
  if (grid.length === 0) return value;
  let lo = 0;
  let hi = grid.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (grid[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  const candidates = [grid[Math.max(0, lo - 1)], grid[lo]];
  return candidates.reduce((best, g) =>
    Math.abs(g - value) < Math.abs(best - value) ? g : best
  );
}

/** Derive per-song line and verse gap thresholds.
 *
 *  Two strategies, picked in order:
 *  1. If a beat-cache exists for the song, derive thresholds from tempo:
 *       line_gap  = 1 beat  (≥ one beat of silence = within-phrase break)
 *       verse_gap = 4 beats (≥ one full 4/4 bar of silence = verse break)
 *     Tempo-grounded thresholds beat pure-percentile thresholds because they
 *     encode the song's actual musical structure — a 150 BPM song truly has
 *     tighter natural spacing than a 70 BPM ballad, and the same 500ms gap
 *     means different things in each context.
 *  2. Otherwise, fall back to percentile of the song's own gap distribution:
 *       line_gap  = median of significant gaps
 *       verse_gap = 80th percentile
 *
 *  Both paths clamp to sanity ranges (LINE_GAP_CLAMP_S, VERSE_GAP_CLAMP_S) so
 *  a pathological tempo estimate or a song with uniform spacing can't emit
 *  garbage thresholds. */
function deriveAdaptiveThresholds(
  words: WordTiming[],
  beats: BeatCache | null
): { lineGapS: number; verseGapS: number; source: "beat" | "adaptive" | "fallback" } {
  if (beats && beats.tempo_bpm > 0) {
    const beatDurationS = 60 / beats.tempo_bpm;
    const lineGapS = clamp(beatDurationS, LINE_GAP_CLAMP_S);
    const verseGapS = clamp(beatDurationS * 4, VERSE_GAP_CLAMP_S);
    return { lineGapS, verseGapS, source: "beat" };
  }

  const gaps: number[] = [];
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end;
    if (gap >= MIN_SIGNIFICANT_GAP_S) gaps.push(gap);
  }
  if (gaps.length < 10) {
    return {
      lineGapS: FALLBACK_LINE_GAP_S,
      verseGapS: FALLBACK_VERSE_GAP_S,
      source: "fallback",
    };
  }
  gaps.sort((a, b) => a - b);
  const lineGapS = clamp(percentile(gaps, 0.5), LINE_GAP_CLAMP_S);
  const verseGapS = clamp(percentile(gaps, 0.8), VERSE_GAP_CLAMP_S);
  const adjustedVerse = Math.max(verseGapS, lineGapS * 2);
  return { lineGapS, verseGapS: adjustedVerse, source: "adaptive" };
}

/**
 * Reconstruct plain-text lyrics from WhisperX word-level timestamps.
 *
 * Two-tier gap classification (replaces the old single 500ms rule):
 *   gap < lineGapS           → word separator (same line)
 *   lineGapS ≤ gap < verseGapS → line break ("\n")
 *   gap ≥ verseGapS          → verse break ("\n\n" — blank line separator)
 *
 * When a beat-cache is present, the break POSITION is additionally snapped
 * to the nearest beat boundary: the break is only inserted if the following
 * word's start time is within half a beat of an actual beat. This prevents
 * a singer's breath pause mid-phrase from creating a line break, because
 * mid-phrase breaths don't land on beats.
 */
function reconstructLyricsFromWords(words: WordTiming[], beats: BeatCache | null): string {
  if (words.length === 0) return "";

  const { lineGapS, verseGapS, source } = deriveAdaptiveThresholds(words, beats);
  const beatGrid = beats?.beats_s ?? [];
  const beatDurationS = beats && beats.tempo_bpm > 0 ? 60 / beats.tempo_bpm : 0;

  console.log(
    `  [thresholds] line=${(lineGapS * 1000).toFixed(0)}ms verse=${(verseGapS * 1000).toFixed(0)}ms (${source})` +
      (beats ? ` tempo=${beats.tempo_bpm}bpm beats=${beatGrid.length}` : "")
  );

  const parts: string[] = [];
  let prevEnd: number | null = null;

  for (const w of words) {
    const wordText = w.word.trim();
    if (!wordText) continue;

    if (prevEnd !== null) {
      const gapSeconds = w.start - prevEnd;

      // When beats are available, only honour a break if the upcoming word's
      // start is within half a beat of an actual detected beat. Prevents
      // breath-pause false positives.
      let breakAllowed = true;
      if (beatGrid.length > 0 && beatDurationS > 0) {
        const nearestBeat = snapToNearest(w.start, beatGrid);
        breakAllowed = Math.abs(w.start - nearestBeat) <= beatDurationS / 2;
      }

      if (breakAllowed && gapSeconds >= verseGapS) {
        parts.push("\n\n");
      } else if (breakAllowed && gapSeconds >= lineGapS) {
        parts.push("\n");
      } else {
        parts.push(" ");
      }
    }

    parts.push(wordText);
    prevEnd = w.end;
  }

  // Normalize runs of >2 newlines down to exactly 2 (single blank line).
  return parts.join("").replace(/\n{3,}/g, "\n\n").trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// IO helpers
// ─────────────────────────────────────────────────────────────────────────────

function readLyricsCache(slug: string): LyricsCacheEntry | null {
  const path = join(LYRICS_CACHE_DIR, `${slug}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as LyricsCacheEntry;
  } catch {
    return null;
  }
}

/** Reads WhisperX timing for a slug. Prefers Demucs+stem output when present
 *  (mean kCov +0.24 over raw audio, per ab-repass-report.json) and falls back
 *  to raw-audio timing when the stem version isn't on disk yet. */
function readTimingCache(slug: string): { result: TimingResult; source: "stem" | "orig" } | null {
  const stemPath = join(TIMING_STEM_DIR, `${slug}.json`);
  if (existsSync(stemPath)) {
    try {
      return { result: JSON.parse(readFileSync(stemPath, "utf-8")) as TimingResult, source: "stem" };
    } catch {
      /* fall through to orig */
    }
  }
  const origPath = join(TIMING_CACHE_DIR, `${slug}.json`);
  if (!existsSync(origPath)) return null;
  try {
    return { result: JSON.parse(readFileSync(origPath, "utf-8")) as TimingResult, source: "orig" };
  } catch {
    return null;
  }
}

function writeLyricsCache(slug: string, entry: LyricsCacheEntry): void {
  const path = join(LYRICS_CACHE_DIR, `${slug}.json`);
  writeFileSync(path, JSON.stringify(entry, null, 2), "utf-8");
}

// ─────────────────────────────────────────────────────────────────────────────
// Main pipeline
// ─────────────────────────────────────────────────────────────────────────────

async function backfillWhisperLyrics(): Promise<void> {
  console.log("=".repeat(60));
  console.log(`Kitsubeat — WhisperX Lyrics Backfill (version=${versionArg})`);
  console.log(`  manifest:      ${MANIFEST_PATH}`);
  console.log(`  lyrics-cache:  ${LYRICS_CACHE_DIR}`);
  console.log(`  timing-cache:  ${TIMING_CACHE_DIR}`);
  console.log("=".repeat(60));

  // Load manifest
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`[error] Manifest not found: ${MANIFEST_PATH}`);
    console.error("Run scripts/seed/01-build-manifest.ts first.");
    process.exit(1);
  }

  const rawManifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
  const parseResult = ManifestSlugsSchema.safeParse(rawManifest);
  if (!parseResult.success) {
    console.error("[error] Manifest failed schema validation:", parseResult.error.message);
    process.exit(1);
  }
  const songs = parseResult.data;
  console.log(`\nLoaded ${songs.length} songs from manifest`);

  // Initialize kuroshiro once
  console.log("\nInitializing kuroshiro tokenizer...");
  await initKuroshiro();
  console.log("kuroshiro ready.\n");

  let backfilled = 0;
  let skipped = 0;
  let missingTimingCache = 0;
  let errors = 0;

  for (const song of songs) {
    const { slug } = song;

    // Read lyrics cache
    const lyricsEntry = readLyricsCache(slug);

    if (!lyricsEntry) {
      // lyrics-cache file missing entirely — not a pending_whisper concern here
      skipped++;
      continue;
    }

    // Only backfill songs marked as pending_whisper with empty raw_lyrics
    if (lyricsEntry.source !== "pending_whisper" || lyricsEntry.raw_lyrics.trim() !== "") {
      skipped++;
      continue;
    }

    console.log(`[backfill] ${slug} (source=pending_whisper) — processing...`);

    // Read timing cache (prefers Demucs+stem output, falls back to raw audio)
    const timingHit = readTimingCache(slug);
    if (!timingHit) {
      console.warn(
        `  [warn] ${slug} — no timing cache (looked at ${TIMING_STEM_DIR} and ${TIMING_CACHE_DIR}). ` +
          `Run Plan 03 WhisperX extraction first.`
      );
      missingTimingCache++;
      continue;
    }
    const { result: timingEntry, source: timingSource } = timingHit;

    if (timingEntry.words.length === 0) {
      console.warn(`  [warn] ${slug} — timing cache has 0 words. Skipping.`);
      missingTimingCache++;
      continue;
    }

    try {
      // Reconstruct raw_lyrics from WhisperX words (uses beat-cache when present)
      const beats = readBeatCache(slug);
      console.log(`  [timing-source] ${timingSource}`);
      const raw_lyrics = reconstructLyricsFromWords(timingEntry.words, beats);
      console.log(
        `  [reconstruct] ${timingEntry.words.length} words → ` +
          `${raw_lyrics.split("\n").length} lines, ${raw_lyrics.length} chars`
      );

      // Re-tokenize via kuroshiro
      const tokens = await tokenizeLyrics(raw_lyrics);
      console.log(`  [tokenize] ${tokens.length} tokens generated`);

      // Write updated lyrics-cache
      const updated: LyricsCacheEntry = {
        ...lyricsEntry,
        source: "whisper",
        raw_lyrics,
        tokens,
      };
      writeLyricsCache(slug, updated);
      console.log(`  [write] Updated ${join(LYRICS_CACHE_DIR, slug + ".json")}`);

      backfilled++;
    } catch (err) {
      console.error(
        `  [error] ${slug} backfill failed:`,
        err instanceof Error ? err.message : err
      );
      errors++;
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log(`Backfill complete:`);
  console.log(`  Backfilled:             ${backfilled} songs`);
  console.log(`  Skipped (already ok):   ${skipped} songs`);
  console.log(`  Missing timing cache:   ${missingTimingCache} songs`);
  console.log(`  Errors:                 ${errors} songs`);
  console.log("=".repeat(60));

  if (missingTimingCache > 0) {
    console.log(
      `\n[note] ${missingTimingCache} songs need WhisperX extraction first.` +
        ` Run: python scripts/seed/04-extract-timing.py --batch ${MANIFEST_PATH}`
    );
  }

  if (errors > 0) {
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

backfillWhisperLyrics().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
