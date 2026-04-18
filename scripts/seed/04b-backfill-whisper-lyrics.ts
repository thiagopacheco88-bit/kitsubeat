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

/** Silence gap (in seconds) that triggers a newline between segments */
const NEWLINE_SILENCE_THRESHOLD_MS = 0.5; // 500ms

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

/**
 * Reconstruct plain-text lyrics from WhisperX word-level timestamps.
 *
 * Words are joined with spaces. When a silence gap >= 500ms occurs between
 * two consecutive words, a newline is inserted (approximating line breaks
 * in Japanese lyrics).
 *
 * @param words  Array of WordTiming objects from timing cache
 * @returns      Plain-text reconstructed lyrics string
 */
function reconstructLyricsFromWords(words: WordTiming[]): string {
  if (words.length === 0) return "";

  const parts: string[] = [];
  let prevEnd: number | null = null;

  for (const w of words) {
    const wordText = w.word.trim();
    if (!wordText) continue;

    if (prevEnd !== null) {
      const gapSeconds = w.start - prevEnd;
      if (gapSeconds >= NEWLINE_SILENCE_THRESHOLD_MS) {
        // Silence > 500ms — treat as line break
        parts.push("\n");
      } else {
        // Within a line — space between words
        parts.push(" ");
      }
    }

    parts.push(wordText);
    prevEnd = w.end;
  }

  // Normalize multiple newlines to single newlines and trim
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

function readTimingCache(slug: string): TimingResult | null {
  const path = join(TIMING_CACHE_DIR, `${slug}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as TimingResult;
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

    // Read timing cache (must exist after Plan 03)
    const timingEntry = readTimingCache(slug);
    if (!timingEntry) {
      console.warn(
        `  [warn] ${slug} — timing cache not found at ${join(TIMING_CACHE_DIR, slug + ".json")}. ` +
          `Run Plan 03 WhisperX extraction first.`
      );
      missingTimingCache++;
      continue;
    }

    if (timingEntry.words.length === 0) {
      console.warn(`  [warn] ${slug} — timing cache has 0 words. Skipping.`);
      missingTimingCache++;
      continue;
    }

    try {
      // Reconstruct raw_lyrics from WhisperX words
      const raw_lyrics = reconstructLyricsFromWords(timingEntry.words);
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
