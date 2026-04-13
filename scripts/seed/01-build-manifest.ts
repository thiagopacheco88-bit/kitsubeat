/**
 * 01-build-manifest.ts — Build the 200-song anime manifest.
 *
 * Multi-source ranking (locked decision): pulls from three sources:
 *   1. MyAnimeList (via Jikan API) — popularity-ranked anime, extracts OP/ED themes
 *   2. Spotify — anime theme playlists, ranked by Spotify popularity score
 *   3. AniDB (via anisongdb.com) — AniDB-linked theme database
 *
 * Each source contributes source_rankings.{mal_rank, spotify_rank, anidb_rank}.
 * Songs appearing in multiple sources rank higher via weighted combined score.
 *
 * Checkpoint/resume: script saves progress to data/songs-manifest.json after
 * every 10 YouTube searches. Re-running skips songs already in the manifest.
 *
 * Usage:
 *   npx tsx scripts/seed/01-build-manifest.ts           # Full run
 *   npx tsx scripts/seed/01-build-manifest.ts --dry-run  # Skip YouTube, print candidates
 *
 * Environment variables (from .env.local):
 *   YOUTUBE_API_KEY     — YouTube Data API v3 key
 *   SPOTIFY_CLIENT_ID   — Spotify app client ID
 *   SPOTIFY_CLIENT_SECRET — Spotify app client secret
 */

import { config } from "dotenv";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import {
  fetchTopAnimeByPopularity,
  fetchAnimeThemes,
  parseThemeString,
} from "../lib/jikan.ts";
import {
  fetchSpotifyAnimeThemes,
  normalizeKey as spotifyNormalize,
} from "../lib/spotify-charts.ts";
import { fetchAnidbThemes, normalizeAnidbKey } from "../lib/anidb-themes.ts";
import {
  searchYouTubeVideoId,
  YouTubeQuotaExceededError,
  estimateYouTubeQuota,
} from "../lib/youtube-search.ts";
import type { SongManifestEntry } from "../types/manifest.ts";
import { SongManifestSchema } from "../types/manifest.ts";

// Load environment variables from .env.local
config({ path: ".env.local" });

const MANIFEST_PATH = "data/songs-manifest.json";
const TARGET_SONG_COUNT = 200;
const CHECKPOINT_INTERVAL = 10; // Save after every N YouTube searches

// ──────────────────────────────────────────────────────────────────────────────
// Main entry point
// ──────────────────────────────────────────────────────────────────────────────

async function buildManifest() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("=".repeat(60));
  console.log("Kitsubeat Manifest Builder");
  console.log(`Mode: ${isDryRun ? "DRY RUN (skip YouTube search)" : "FULL RUN"}`);
  console.log("=".repeat(60));

  // ── Step 1: Load existing manifest for checkpoint/resume ──────────────────
  const existingManifest = loadExistingManifest();
  const existingSlugs = new Set(existingManifest.map((s) => s.slug));
  console.log(`\n[Resume] ${existingManifest.length} songs already in manifest`);

  // ── Step 2: Fetch from all three sources ──────────────────────────────────
  console.log("\n[Phase 1/4] Fetching MAL/Jikan themes...");
  const malSongs = await fetchMalSongs();
  console.log(`[MAL] Collected ${malSongs.length} unique theme songs`);

  console.log("\n[Phase 2/4] Fetching Spotify anime themes...");
  let spotifySongs: Awaited<ReturnType<typeof fetchSpotifyAnimeThemes>> = [];
  try {
    spotifySongs = await fetchSpotifyAnimeThemes();
    console.log(`[Spotify] Collected ${spotifySongs.length} unique theme songs`);
  } catch (err) {
    console.warn(`[Spotify] Fetch failed (continuing without Spotify data): ${err instanceof Error ? err.message : err}`);
  }

  console.log("\n[Phase 3/4] Fetching AniDB/anisongdb themes...");
  const anidbSongs = await fetchAnidbThemes();
  console.log(`[AniDB] Collected ${anidbSongs.length} unique theme songs`);

  // ── Step 3: Merge and rank all three sources ───────────────────────────────
  console.log("\n[Phase 4/4] Merging and ranking songs from all sources...");
  const rankedCandidates = mergeAndRankSources(malSongs, spotifySongs, anidbSongs);
  console.log(`\nMerge result: ${rankedCandidates.length} unique candidates from all sources`);

  // ── Step 4: Print dry-run preview ─────────────────────────────────────────
  if (isDryRun) {
    printDryRunReport(rankedCandidates, existingManifest);
    return;
  }

  // ── Step 5: Enrich with YouTube video IDs ────────────────────────────────
  const quotaEstimate = estimateYouTubeQuota(
    Math.max(0, TARGET_SONG_COUNT - existingManifest.length)
  );
  console.log(
    `\n[YouTube] Need to search for ${Math.max(0, TARGET_SONG_COUNT - existingManifest.length)} songs`
  );
  console.log(
    `[YouTube] Estimated quota: ${quotaEstimate.units} units (${quotaEstimate.percentOfDailyQuota}% of daily limit)`
  );
  if (quotaEstimate.daysRequired > 1) {
    console.log(
      `[YouTube] NOTE: This will require ${quotaEstimate.daysRequired} days of quota. Script checkpoints every ${CHECKPOINT_INTERVAL} songs.`
    );
  }

  // Merge existing manifest with new candidates
  const manifest: SongManifestEntry[] = [...existingManifest];
  let youtubeSearchCount = 0;

  for (const candidate of rankedCandidates) {
    if (manifest.length >= TARGET_SONG_COUNT) break;
    if (existingSlugs.has(candidate.slug)) continue;

    let youtubeId: string | null = null;
    try {
      console.log(
        `[YouTube] Searching: ${candidate.title} - ${candidate.artist} (${manifest.length + 1}/${TARGET_SONG_COUNT})`
      );
      youtubeId = await searchYouTubeVideoId(candidate.title, candidate.artist);
      youtubeSearchCount++;

      // Checkpoint save every N searches
      if (youtubeSearchCount % CHECKPOINT_INTERVAL === 0) {
        saveManifest([...manifest, { ...candidate, youtube_id: youtubeId }]);
        console.log(`[Checkpoint] Saved ${manifest.length + 1} songs to manifest`);
      }
    } catch (err) {
      if (err instanceof YouTubeQuotaExceededError) {
        console.error(`\n[YouTube] QUOTA EXCEEDED — saving progress and stopping.`);
        console.error(err.message);
        saveManifest(manifest);
        console.log(`\nProgress saved: ${manifest.length} songs in manifest.`);
        console.log(`Run again tomorrow to continue from where we left off.`);
        process.exit(0);
      }
      console.warn(`[YouTube] Search error for "${candidate.title}": ${err instanceof Error ? err.message : err}`);
    }

    manifest.push({ ...candidate, youtube_id: youtubeId });
    existingSlugs.add(candidate.slug);
  }

  // ── Step 6: Validate and save final manifest ──────────────────────────────
  console.log(`\n[Validate] Validating ${manifest.length} songs against SongManifestSchema...`);
  const validation = SongManifestSchema.safeParse(manifest);

  if (!validation.success) {
    console.error("[Validate] Schema validation FAILED:");
    console.error(validation.error.format());
    // Save anyway for inspection
    saveManifest(manifest);
    process.exit(1);
  }

  saveManifest(validation.data);

  console.log("\n" + "=".repeat(60));
  console.log(`Manifest complete: ${manifest.length} songs saved to ${MANIFEST_PATH}`);
  if (manifest.length < TARGET_SONG_COUNT) {
    console.log(
      `NOTE: Only ${manifest.length}/${TARGET_SONG_COUNT} songs collected. ` +
        `Run again to continue — script will resume from checkpoint.`
    );
  }
  console.log("=".repeat(60));
}

// ──────────────────────────────────────────────────────────────────────────────
// Source fetchers
// ──────────────────────────────────────────────────────────────────────────────

interface MalSong {
  title: string;
  artist: string;
  anime: string;
  season_info: string;
  mal_rank: number; // based on anime popularity rank
  year_launched: number | null;
}

/**
 * Fetch top 50 anime from MAL/Jikan and extract all OP/ED theme songs.
 * Assigns mal_rank based on the anime's popularity position.
 */
async function fetchMalSongs(): Promise<MalSong[]> {
  const songs: MalSong[] = [];
  const seenKeys = new Set<string>();
  let animeRank = 1;

  // Fetch 2 pages of 25 anime each = 50 anime total
  for (let page = 1; page <= 2; page++) {
    console.log(`[MAL] Fetching page ${page}/2 of top anime...`);
    let animeList;
    try {
      animeList = await fetchTopAnimeByPopularity(page);
    } catch (err) {
      console.warn(`[MAL] Page ${page} failed: ${err instanceof Error ? err.message : err}`);
      continue;
    }

    for (const anime of animeList) {
      let themes;
      try {
        themes = await fetchAnimeThemes(anime.mal_id);
      } catch {
        console.warn(`[MAL] Themes failed for ${anime.title} (${anime.mal_id})`);
        themes = { openings: [], endings: [] };
      }

      const allThemes = [
        ...themes.openings.map((t, i) => ({ raw: t, type: "OP", num: i + 1 })),
        ...themes.endings.map((t, i) => ({ raw: t, type: "ED", num: i + 1 })),
      ];

      for (const { raw, type, num } of allThemes) {
        const parsed = parseThemeString(raw);
        if (!parsed) {
          console.warn(`[MAL] Unparseable theme: "${raw}"`);
          continue;
        }

        const key = `${parsed.title.toLowerCase()}__${parsed.artist.toLowerCase()}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        const animeName = anime.title_english ?? anime.title;
        songs.push({
          title: parsed.title,
          artist: parsed.artist,
          anime: animeName,
          season_info: `${animeName} ${type} ${num > 1 ? num : ""}`.trim(),
          mal_rank: animeRank,
          year_launched: null, // Jikan doesn't return year in this endpoint
        });
      }

      animeRank++;
    }
  }

  return songs;
}

// ──────────────────────────────────────────────────────────────────────────────
// Multi-source merging and ranking
// ──────────────────────────────────────────────────────────────────────────────

interface MergedSong {
  title: string;
  artist: string;
  anime: string;
  season_info: string;
  slug: string;
  year_launched: number;
  genre_tags: string[];
  mood_tags: string[];
  youtube_id: null;
  source_rankings: {
    mal_rank: number | null;
    spotify_rank: number | null;
    anidb_rank: number | null;
  };
  combined_score: number;
}

/**
 * Merge songs from MAL, Spotify, and AniDB.
 *
 * Matching strategy:
 * - Normalize title + artist (lowercase, strip parentheticals, strip non-alphanumeric)
 * - Match across sources using normalized key
 * - Songs appearing in multiple sources score lower (more popular) in combined ranking
 *
 * Weighted formula:
 *   combined = (mal_norm * 0.4) + (spotify_norm * 0.35) + (anidb_norm * 0.25)
 *   where _norm = 0–1 (lower is more popular; missing source gets penalty 1.0)
 */
function mergeAndRankSources(
  malSongs: MalSong[],
  spotifySongs: Array<{ title: string; artist: string; spotify_rank: number }>,
  anidbSongs: Array<{ title: string; artist: string; anime: string; anidb_rank: number }>
): MergedSong[] {
  // Build lookup maps keyed by normalized title+artist
  const malByKey = new Map<string, MalSong>();
  for (const song of malSongs) {
    malByKey.set(normalizeKey(song.title, song.artist), song);
  }

  const spotifyByKey = new Map<string, (typeof spotifySongs)[0]>();
  for (const song of spotifySongs) {
    spotifyByKey.set(spotifyNormalize(song.title, song.artist), song);
  }

  const anidbByKey = new Map<string, (typeof anidbSongs)[0]>();
  for (const song of anidbSongs) {
    anidbByKey.set(normalizeAnidbKey(song.title, song.artist), song);
  }

  // Max ranks for normalization
  const maxMalRank = Math.max(1, ...malSongs.map((s) => s.mal_rank));
  const maxSpotifyRank = Math.max(1, ...spotifySongs.map((s) => s.spotify_rank));
  const maxAnidbRank = Math.max(1, ...anidbSongs.map((s) => s.anidb_rank));

  // Collect all unique songs across all sources
  const allKeys = new Set<string>();
  for (const song of malSongs) allKeys.add(normalizeKey(song.title, song.artist));
  for (const song of spotifySongs) allKeys.add(spotifyNormalize(song.title, song.artist));
  for (const song of anidbSongs) allKeys.add(normalizeAnidbKey(song.title, song.artist));

  const merged: MergedSong[] = [];

  for (const key of allKeys) {
    const malEntry = malByKey.get(key);
    const spotifyEntry = spotifyByKey.get(key);
    const anidbEntry = anidbByKey.get(key);

    // Use the best available metadata (prefer MAL for anime context)
    const title = (malEntry ?? spotifyEntry ?? anidbEntry)!.title;
    const artist = (malEntry ?? spotifyEntry ?? anidbEntry)!.artist;
    const anime =
      malEntry?.anime ??
      anidbEntry?.anime ??
      inferAnimeFromTitle(title);
    const seasonInfo = malEntry?.season_info ?? anime;

    // Source rankings
    const malRank = malEntry?.mal_rank ?? null;
    const spotifyRank = spotifyEntry?.spotify_rank ?? null;
    const anidbRank = anidbEntry?.anidb_rank ?? null;

    // Normalize ranks to 0-1 (lower = more popular; missing = penalty 1.0)
    const malNorm = malRank !== null ? malRank / maxMalRank : 1.0;
    const spotifyNorm = spotifyRank !== null ? spotifyRank / maxSpotifyRank : 1.0;
    const anidbNorm = anidbRank !== null ? anidbRank / maxAnidbRank : 1.0;

    // Weighted combined score
    const combined = malNorm * 0.4 + spotifyNorm * 0.35 + anidbNorm * 0.25;

    merged.push({
      title,
      artist,
      anime,
      season_info: seasonInfo,
      slug: buildSlug(title, artist),
      year_launched: malEntry?.year_launched ?? guessYearFromContext(title) ?? 2020,
      genre_tags: [],
      mood_tags: [],
      youtube_id: null,
      source_rankings: {
        mal_rank: malRank,
        spotify_rank: spotifyRank,
        anidb_rank: anidbRank,
      },
      combined_score: combined,
    });
  }

  // Sort by combined score ascending (lower = more popular)
  merged.sort((a, b) => a.combined_score - b.combined_score);

  // Deduplicate slugs (different normalizations may produce same slug)
  const seenSlugs = new Set<string>();
  const deduped: MergedSong[] = [];
  for (const song of merged) {
    if (!seenSlugs.has(song.slug)) {
      seenSlugs.add(song.slug);
      deduped.push(song);
    }
  }

  return deduped;
}

// ──────────────────────────────────────────────────────────────────────────────
// Utility functions
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Normalize a title + artist pair for cross-source matching.
 * More aggressive normalization than the per-source keys to allow fuzzy matching.
 */
function normalizeKey(title: string, artist: string): string {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFC")
      .replace(/\(.*?\)/g, "") // strip parentheticals
      .replace(/\[.*?\]/g, "") // strip brackets
      .replace(/feat\..*$/i, "") // strip feat. credits
      .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/g, "")
      .trim();
  return `${normalize(title)}__${normalize(artist)}`;
}

/**
 * Build a URL-safe kebab-case slug from title and artist.
 * Format: {title-kebab}-{artist-kebab}
 * Uses ASCII transliteration for Japanese characters.
 */
function buildSlug(title: string, artist: string): string {
  const toKebab = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "") // remove diacritics
      .replace(/[^\w\s-]/g, "") // remove non-word chars
      .replace(/\s+/g, "-") // spaces to hyphens
      .replace(/-+/g, "-") // collapse hyphens
      .replace(/^-|-$/g, "") // trim leading/trailing hyphens
      .slice(0, 40); // max 40 chars per segment

  const titleSlug = toKebab(title) || "song";
  const artistSlug = toKebab(artist) || "artist";

  return `${titleSlug}-${artistSlug}`.slice(0, 80);
}

/** Infer anime name from song title (fallback when no anime context available) */
function inferAnimeFromTitle(title: string): string {
  // Can't reliably infer — use a placeholder that will be reviewed
  return "Unknown Anime";
}

/** Guess year from context (returns null if we can't determine) */
function guessYearFromContext(_title: string): number | null {
  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// I/O helpers
// ──────────────────────────────────────────────────────────────────────────────

function loadExistingManifest(): SongManifestEntry[] {
  if (!existsSync(MANIFEST_PATH)) return [];

  try {
    const raw = readFileSync(MANIFEST_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    const result = SongManifestSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    console.warn(
      `[Resume] Existing manifest failed validation — starting fresh. ` +
        `Errors: ${result.error.message}`
    );
    return [];
  } catch {
    console.warn(`[Resume] Could not parse existing manifest — starting fresh`);
    return [];
  }
}

function saveManifest(songs: SongManifestEntry[]) {
  mkdirSync("data", { recursive: true });
  writeFileSync(MANIFEST_PATH, JSON.stringify(songs, null, 2), "utf-8");
}

// ──────────────────────────────────────────────────────────────────────────────
// Dry-run report
// ──────────────────────────────────────────────────────────────────────────────

function printDryRunReport(
  candidates: MergedSong[],
  existing: SongManifestEntry[]
) {
  console.log("\n" + "=".repeat(60));
  console.log("DRY RUN REPORT — Candidate Songs");
  console.log("=".repeat(60));
  console.log(`Total candidates: ${candidates.length}`);
  console.log(`Already in manifest: ${existing.length}`);
  console.log(
    `New songs to add: ${Math.max(0, TARGET_SONG_COUNT - existing.length)}`
  );

  const quotaEstimate = estimateYouTubeQuota(
    Math.max(0, TARGET_SONG_COUNT - existing.length)
  );
  console.log(
    `\nYouTube quota estimate: ${quotaEstimate.units} units (${quotaEstimate.daysRequired} day(s))`
  );

  // Source coverage statistics
  const withMal = candidates.filter((s) => s.source_rankings.mal_rank !== null).length;
  const withSpotify = candidates.filter((s) => s.source_rankings.spotify_rank !== null).length;
  const withAnidb = candidates.filter((s) => s.source_rankings.anidb_rank !== null).length;
  const multiSource = candidates.filter(
    (s) =>
      [s.source_rankings.mal_rank, s.source_rankings.spotify_rank, s.source_rankings.anidb_rank]
        .filter((r) => r !== null).length >= 2
  ).length;

  console.log("\nSource coverage:");
  console.log(`  MAL/Jikan:  ${withMal} songs`);
  console.log(`  Spotify:    ${withSpotify} songs`);
  console.log(`  AniDB:      ${withAnidb} songs`);
  console.log(`  Multi-source (2+ sources): ${multiSource} songs`);

  console.log("\nTop 30 candidates (by combined popularity score):");
  console.log("-".repeat(60));

  for (const song of candidates.slice(0, 30)) {
    const sources = [
      song.source_rankings.mal_rank !== null ? `MAL:${song.source_rankings.mal_rank}` : null,
      song.source_rankings.spotify_rank !== null ? `SP:${song.source_rankings.spotify_rank}` : null,
      song.source_rankings.anidb_rank !== null ? `ADB:${song.source_rankings.anidb_rank}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    console.log(`  ${song.title} - ${song.artist}`);
    console.log(`    Anime: ${song.anime}`);
    console.log(`    Sources: [${sources}]  Score: ${song.combined_score.toFixed(3)}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("Run without --dry-run to search YouTube for video IDs and build manifest.");
  console.log("=".repeat(60));
}

// ──────────────────────────────────────────────────────────────────────────────
// Entry point
// ──────────────────────────────────────────────────────────────────────────────

buildManifest().catch((err) => {
  console.error("[Fatal] Manifest builder crashed:", err);
  process.exit(1);
});
