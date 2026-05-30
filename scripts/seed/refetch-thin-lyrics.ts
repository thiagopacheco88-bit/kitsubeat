/**
 * refetch-thin-lyrics.ts — Re-fetch lyrics from lrclib for songs that have
 * thin/broken Whisper transcriptions (fewer than 10 synced_lrc entries).
 *
 * For each candidate song:
 *   1. Calls lrclib by title + artist + anime
 *   2. If lrclib returns synced lyrics, updates the cache:
 *      - source = 'lrclib'
 *      - raw_lyrics = lrclib plain text
 *      - synced_lrc = lrclib synced lines
 *      - tokens field is left unchanged (re-tokenizing requires kuroshiro)
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/refetch-thin-lyrics.ts
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { fetchFromLrclib } from "../lib/lrclib.ts";

const ROOT = resolve(process.cwd());
const MANIFEST_PATH = resolve(ROOT, "data/songs-manifest.json");
const CACHE_DIR = resolve(ROOT, "data/lyrics-cache");
const THIN_THRESHOLD = 10;

interface SongEntry {
  slug: string;
  title: string;
  artist: string;
  anime: string;
}

interface LyricsCache {
  slug: string;
  title: string;
  artist: string;
  source: string;
  raw_lyrics: string;
  synced_lrc: Array<{ startMs: number; text: string }>;
  tokens?: unknown;
}

const manifest: SongEntry[] = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));

// Collect candidates: whisper source with fewer than THIN_THRESHOLD synced lines
const candidates: SongEntry[] = [];

for (const song of manifest) {
  const cachePath = resolve(CACHE_DIR, `${song.slug}.json`);
  if (!existsSync(cachePath)) continue;

  const cache: LyricsCache = JSON.parse(readFileSync(cachePath, "utf-8"));
  if (
    cache.source === "whisper" &&
    (cache.synced_lrc ?? []).length < THIN_THRESHOLD
  ) {
    candidates.push(song);
  }
}

console.log(`Found ${candidates.length} candidates (whisper + < ${THIN_THRESHOLD} synced lines)\n`);

const fixed: string[] = [];
const unfixed: string[] = [];

for (const song of candidates) {
  const cachePath = resolve(CACHE_DIR, `${song.slug}.json`);
  const cache: LyricsCache = JSON.parse(readFileSync(cachePath, "utf-8"));
  const currentLines = (cache.synced_lrc ?? []).length;

  process.stdout.write(`  [${song.slug}] (${currentLines} lines) — fetching lrclib... `);

  const result = await fetchFromLrclib(song.title, song.artist, song.anime);

  if (result && result.synced && result.synced.length > 0) {
    cache.source = "lrclib";
    cache.raw_lyrics = result.plain;
    cache.synced_lrc = result.synced;
    writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf-8");
    console.log(`fixed (${result.synced.length} lines)`);
    fixed.push(song.slug);
  } else {
    const reason = result ? "no synced lines" : "no match";
    console.log(`no fix (${reason})`);
    unfixed.push(song.slug);
  }
}

console.log(`\n--- Report ---`);
console.log(`Candidates: ${candidates.length}`);
console.log(`Fixed by lrclib: ${fixed.length}`);
console.log(`Still need attention: ${unfixed.length}`);

if (unfixed.length > 0) {
  console.log(`\nUnfixed slugs:`);
  for (const slug of unfixed) {
    console.log(`  - ${slug}`);
  }
}
