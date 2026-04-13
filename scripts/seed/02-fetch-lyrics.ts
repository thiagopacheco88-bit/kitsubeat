/**
 * 02-fetch-lyrics.ts — Fetch Japanese lyrics for all songs in the manifest
 * and pre-compute furigana readings and romaji transliterations.
 *
 * Fallback chain (locked decision per CONTEXT.md):
 *   1. LRCLIB — free, no API key, LRC-format synced lyrics
 *   2. Genius — plain text, requires GENIUS_API_KEY env var
 *   3. pending_whisper — mark for transcription in Plan 03
 *
 * Output: data/lyrics-cache/{slug}.json per song.
 *
 * Checkpoint/resume: skips songs that already have a cache file.
 *
 * Usage:
 *   npx tsx scripts/seed/02-fetch-lyrics.ts
 *
 * Environment variables (from .env.local):
 *   GENIUS_API_KEY — Genius Developer Portal client access token (optional)
 */

import { config } from "dotenv";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "fs";
import { join } from "path";
import pLimit from "p-limit";
import { SongManifestSchema, type SongManifestEntry } from "../types/manifest.ts";
import { fetchFromLrclib, type LrcLine } from "../lib/lrclib.ts";
import { searchGenius, fetchGeniusLyrics } from "../lib/genius.ts";
import { initKuroshiro, tokenizeLyrics, type LyricsToken } from "../lib/kuroshiro-tokenizer.ts";

// Load environment variables from .env.local
config({ path: ".env.local" });

const MANIFEST_PATH = "data/songs-manifest.json";
const LYRICS_CACHE_DIR = "data/lyrics-cache";

// ──────────────────────────────────────────────────────────────────────────────
// Output schema
// ──────────────────────────────────────────────────────────────────────────────

export type LyricsSource = "lrclib" | "genius" | "pending_whisper";

export interface LyricsCacheEntry {
  slug: string;
  title: string;
  artist: string;
  /** Where lyrics were sourced from */
  source: LyricsSource;
  /** Full plain-text lyrics (empty string if pending_whisper) */
  raw_lyrics: string;
  /** Synced LRC lines if source is "lrclib" and sync was available; null otherwise */
  synced_lrc: LrcLine[] | null;
  /** Pre-computed tokens with hiragana reading and hepburn romaji */
  tokens: LyricsToken[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Main pipeline
// ──────────────────────────────────────────────────────────────────────────────

async function fetchAllLyrics() {
  console.log("=".repeat(60));
  console.log("Kitsubeat Lyrics Fetcher");
  console.log("=".repeat(60));

  // Load songs manifest
  const songs = loadManifest();
  console.log(`\nLoaded ${songs.length} songs from manifest`);

  // Ensure cache directory exists
  mkdirSync(LYRICS_CACHE_DIR, { recursive: true });

  // Initialize kuroshiro once for the whole run
  console.log("\nInitializing kuroshiro tokenizer...");
  await initKuroshiro();
  console.log("kuroshiro ready.\n");

  // Track stats
  let fromLrclib = 0;
  let fromGenius = 0;
  let pendingWhisper = 0;
  let skipped = 0;

  // Process songs with light concurrency (be polite to APIs)
  const limit = pLimit(2);

  const tasks = songs.map((song) =>
    limit(async () => {
      const cachePath = join(LYRICS_CACHE_DIR, `${song.slug}.json`);

      // Checkpoint/resume — skip if already cached
      if (existsSync(cachePath)) {
        skipped++;
        process.stdout.write(".");
        return;
      }

      const result = await fetchLyricsForSong(song);

      // Write cache file immediately
      writeFileSync(cachePath, JSON.stringify(result, null, 2), "utf-8");

      // Update stats
      if (result.source === "lrclib") fromLrclib++;
      else if (result.source === "genius") fromGenius++;
      else pendingWhisper++;

      // Progress indicator
      const icon =
        result.source === "lrclib"
          ? "L"
          : result.source === "genius"
          ? "G"
          : "W";
      process.stdout.write(icon);
    })
  );

  await Promise.all(tasks);

  // Print summary
  const total = fromLrclib + fromGenius + pendingWhisper;
  console.log("\n\n" + "=".repeat(60));
  console.log("Lyrics fetch complete");
  console.log("-".repeat(60));
  console.log(`Songs processed (new): ${total}`);
  console.log(`Songs skipped (cached): ${skipped}`);
  console.log(`  LRCLIB (synced):       ${fromLrclib}`);
  console.log(`  Genius (plain text):   ${fromGenius}`);
  console.log(`  Pending Whisper:       ${pendingWhisper}`);
  console.log("=".repeat(60));

  // Exit with non-zero if all songs are pending_whisper and none cached
  if (songs.length > 0 && pendingWhisper === songs.length && skipped === 0) {
    console.warn(
      "\nWARNING: No lyrics found via LRCLIB or Genius for any song."
    );
    console.warn(
      "Check that titles/artists in songs-manifest.json are accurate."
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Per-song fetcher with fallback chain
// ──────────────────────────────────────────────────────────────────────────────

async function fetchLyricsForSong(
  song: SongManifestEntry
): Promise<LyricsCacheEntry> {
  // Step 1: Try LRCLIB (free, synced LRC format)
  try {
    const lrclibResult = await fetchFromLrclib(song.title, song.artist, song.anime);
    if (lrclibResult) {
      // Tokenize the plain lyrics
      const tokens = await tokenizeLyrics(lrclibResult.plain);
      return {
        slug: song.slug,
        title: song.title,
        artist: song.artist,
        source: "lrclib",
        raw_lyrics: lrclibResult.plain,
        synced_lrc: lrclibResult.synced,
        tokens,
      };
    }
  } catch (err) {
    console.error(`\n[LRCLIB] Error for "${song.title}": ${err instanceof Error ? err.message : err}`);
  }

  // Step 2: Try Genius (plain text, requires API key)
  if (process.env.GENIUS_API_KEY) {
    try {
      const geniusUrl = await searchGenius(song.title, song.artist);
      if (geniusUrl) {
        const lyrics = await fetchGeniusLyrics(geniusUrl);
        if (lyrics) {
          const tokens = await tokenizeLyrics(lyrics);
          return {
            slug: song.slug,
            title: song.title,
            artist: song.artist,
            source: "genius",
            raw_lyrics: lyrics,
            synced_lrc: null,
            tokens,
          };
        }
      }
    } catch (err) {
      console.error(`\n[Genius] Error for "${song.title}": ${err instanceof Error ? err.message : err}`);
    }
  }

  // Step 3: Mark for Whisper transcription (Plan 03 timing pipeline)
  return {
    slug: song.slug,
    title: song.title,
    artist: song.artist,
    source: "pending_whisper",
    raw_lyrics: "",
    synced_lrc: null,
    tokens: [],
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// I/O helpers
// ──────────────────────────────────────────────────────────────────────────────

function loadManifest(): SongManifestEntry[] {
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`ERROR: Manifest not found at ${MANIFEST_PATH}`);
    console.error("Run 01-build-manifest.ts first to generate songs-manifest.json");
    process.exit(1);
  }

  const raw = readFileSync(MANIFEST_PATH, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("ERROR: songs-manifest.json is not valid JSON");
    process.exit(1);
  }

  const result = SongManifestSchema.safeParse(parsed);
  if (!result.success) {
    console.error("ERROR: songs-manifest.json failed schema validation:");
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

// ──────────────────────────────────────────────────────────────────────────────
// Entry point
// ──────────────────────────────────────────────────────────────────────────────

fetchAllLyrics().catch((err) => {
  console.error("\n[Fatal] Lyrics fetcher crashed:", err);
  process.exit(1);
});
