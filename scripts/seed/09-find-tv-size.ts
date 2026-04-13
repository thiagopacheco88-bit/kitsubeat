/**
 * 09-find-tv-size.ts — Find TV-size (~1:30) YouTube videos for anime OP/EDs.
 *
 * Searches YouTube for short/TV-size versions of anime openings and endings,
 * then updates the DB youtube_id_short column.
 *
 * Usage:
 *   npx tsx scripts/seed/09-find-tv-size.ts              # all OP/ED songs
 *   npx tsx scripts/seed/09-find-tv-size.ts --limit 50   # first 50 by popularity
 *   npx tsx scripts/seed/09-find-tv-size.ts --dry-run    # preview queries, no API calls
 *   npx tsx scripts/seed/09-find-tv-size.ts --limit 10 --dry-run
 *
 * Quota: Each YouTube search = 100 units. Daily limit = 10,000 = 100 searches max.
 * Songs are sorted by mal_rank (lower = more popular = searched first).
 *
 * Checkpoint/resume: Songs that already have youtube_id_short in the DB are skipped.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import { songs } from "../../src/lib/db/schema.js";
import { eq, isNotNull } from "drizzle-orm";
import { readFileSync } from "fs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ManifestSong {
  slug: string;
  title: string;
  artist: string;
  anime: string;
  season_info: string;
  youtube_id: string;
  source_rankings: {
    mal_rank: number | null;
    spotify_rank: number | null;
    anidb_rank: number | null;
  };
}

interface YouTubeSearchItem {
  id: { kind: string; videoId?: string };
  snippet: {
    title: string;
    channelTitle: string;
    description: string;
  };
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
  error?: {
    code: number;
    message: string;
    errors: Array<{ reason: string; domain: string }>;
  };
}

interface YouTubeVideoItem {
  id: string;
  contentDetails: {
    duration: string; // ISO 8601 duration, e.g., "PT1M30S"
  };
  snippet: {
    title: string;
    channelTitle: string;
  };
}

interface YouTubeVideosResponse {
  items?: YouTubeVideoItem[];
  error?: {
    code: number;
    message: string;
    errors: Array<{ reason: string; domain: string }>;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const MAX_DURATION_SECONDS = 150; // 2:30
const MIN_DURATION_SECONDS = 60;  // 1:00 — filter out very short clips

/** Preferred channels — these get a score boost */
const PREFERRED_CHANNELS = [
  "crunchyroll",
  "viz",
  "muse asia",
  "aniplex",
  "avex",
  "sony music",
  "toho animation",
  "bandai namco",
  "king amusement",
  "lantis",
  "pony canyon",
];

/** Title keywords that suggest a TV-size or official creditless OP/ED */
const TV_SIZE_KEYWORDS = [
  "opening",
  "ending",
  "tv size",
  "tv-size",
  "creditless",
  "ncop",
  "nced",
  "op",
  "ed",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse ISO 8601 duration (PT1M30S) to seconds */
function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/** Format seconds as m:ss */
function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Build a YouTube search query from season_info.
 * "Naruto Shippuden OP 16" -> "Naruto Shippuden Opening 16"
 * "Attack on Titan ED 2"   -> "Attack on Titan Ending 2"
 */
function buildSearchQuery(seasonInfo: string): string {
  return seasonInfo
    .replace(/\bOP\b/, "Opening")
    .replace(/\bED\b/, "Ending");
}

/**
 * Score a YouTube result for how likely it is to be the right TV-size video.
 * Higher = better match.
 */
function scoreResult(
  video: YouTubeVideoItem,
  durationSec: number,
  anime: string,
  opOrEd: string
): number {
  let score = 0;
  const title = video.snippet.title.toLowerCase();
  const channel = video.snippet.channelTitle.toLowerCase();

  // Duration scoring — ideal is 80-100s (typical TV-size OP/ED)
  if (durationSec >= MIN_DURATION_SECONDS && durationSec <= MAX_DURATION_SECONDS) {
    score += 50; // In range
    // Bonus for being close to typical 1:30
    const distFrom90 = Math.abs(durationSec - 90);
    score += Math.max(0, 30 - distFrom90); // Up to 30 bonus for being near 90s
  } else {
    score -= 100; // Out of range — heavy penalty
  }

  // Preferred channel bonus
  if (PREFERRED_CHANNELS.some((ch) => channel.includes(ch))) {
    score += 40;
  }

  // Title keyword matches
  for (const kw of TV_SIZE_KEYWORDS) {
    if (title.includes(kw)) {
      score += 10;
      break; // Only count once
    }
  }

  // Anime name in title
  if (title.includes(anime.toLowerCase())) {
    score += 20;
  }

  // "OP/ED" type match in title
  if (title.includes(opOrEd.toLowerCase())) {
    score += 15;
  }

  // Penalize if title contains "full", "full version", or "live"
  if (/\bfull\b/.test(title) || /\bfull version\b/.test(title)) {
    score -= 50;
  }
  if (/\blive\b/.test(title)) {
    score -= 30;
  }
  // Penalize covers/remixes
  if (/\bcover\b/.test(title) || /\bremix\b/.test(title)) {
    score -= 60;
  }

  return score;
}

// ---------------------------------------------------------------------------
// YouTube API functions
// ---------------------------------------------------------------------------

/**
 * Search YouTube and return top results with snippets.
 * Cost: 100 quota units.
 */
async function searchYouTube(
  query: string,
  apiKey: string
): Promise<YouTubeSearchItem[]> {
  const params = new URLSearchParams({
    q: query,
    type: "video",
    maxResults: "10",
    key: apiKey,
    part: "id,snippet",
    regionCode: "JP",
    relevanceLanguage: "ja",
    videoDuration: "short", // Under 4 minutes
  });

  const url = `${YOUTUBE_API_BASE}/search?${params}`;
  const res = await fetch(url);
  const data: YouTubeSearchResponse = await res.json();

  if (data.error) {
    console.error(`  [API Error] ${JSON.stringify(data.error)}`);
    if (data.error.errors.some((e) => e.reason === "quotaExceeded")) {
      throw new Error("QUOTA_EXCEEDED");
    }
    throw new Error(`YouTube API error: ${data.error.message}`);
  }

  if (!res.ok) {
    const body = JSON.stringify(data);
    console.error(`  [HTTP ${res.status}] ${body}`);
    throw new Error(`YouTube API HTTP ${res.status}`);
  }

  return data.items?.filter((item) => item.id.kind === "youtube#video") ?? [];
}

/**
 * Fetch video details (duration, etc.) for a list of video IDs.
 * Cost: 1 quota unit per call (regardless of how many IDs).
 */
async function getVideoDetails(
  videoIds: string[],
  apiKey: string
): Promise<YouTubeVideoItem[]> {
  if (videoIds.length === 0) return [];

  const params = new URLSearchParams({
    id: videoIds.join(","),
    part: "contentDetails,snippet",
    key: apiKey,
  });

  const url = `${YOUTUBE_API_BASE}/videos?${params}`;
  const res = await fetch(url);
  const data: YouTubeVideosResponse = await res.json();

  if (data.error) {
    if (data.error.errors.some((e) => e.reason === "quotaExceeded")) {
      throw new Error("QUOTA_EXCEEDED");
    }
    throw new Error(`YouTube API error: ${data.error.message}`);
  }

  return data.items ?? [];
}

/**
 * Find the best TV-size YouTube video for a song.
 * Cost: 100 units (search) + 1 unit (video details) = 101 units.
 */
async function findTvSizeVideo(
  seasonInfo: string,
  anime: string,
  apiKey: string
): Promise<{ videoId: string; title: string; duration: number; channel: string } | null> {
  const query = buildSearchQuery(seasonInfo) + " TV size";
  const results = await searchYouTube(query, apiKey);

  if (results.length === 0) return null;

  // Get video IDs for duration check
  const videoIds = results
    .map((r) => r.id.videoId!)
    .filter(Boolean);

  const videos = await getVideoDetails(videoIds, apiKey);

  // Extract OP/ED type from season_info
  const opEdMatch = seasonInfo.match(/\b(OP|ED)\b/);
  const opOrEd = opEdMatch ? opEdMatch[1] : "";

  // Score each video
  const scored = videos.map((video) => {
    const durationSec = parseDuration(video.contentDetails.duration);
    return {
      videoId: video.id,
      title: video.snippet.title,
      channel: video.snippet.channelTitle,
      duration: durationSec,
      score: scoreResult(video, durationSec, anime, opOrEd),
    };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Return best match if it has a positive score
  const best = scored[0];
  if (!best || best.score < 0) return null;

  return {
    videoId: best.videoId,
    title: best.title,
    duration: best.duration,
    channel: best.channel,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Parse CLI flags
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity;
  const dryRun = args.includes("--dry-run");

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey && !dryRun) {
    console.error("Missing YOUTUBE_API_KEY in .env.local");
    process.exit(1);
  }

  // Load manifest
  const manifest: ManifestSong[] = JSON.parse(
    readFileSync("data/songs-manifest.json", "utf-8")
  );

  // Filter to songs with OP/ED in season_info
  const opEdSongs = manifest.filter(
    (s) => s.season_info && /\b(OP|ED)\b/.test(s.season_info)
  );

  // Sort by popularity (mal_rank ascending, nulls last)
  opEdSongs.sort(
    (a, b) =>
      (a.source_rankings?.mal_rank ?? 999) -
      (b.source_rankings?.mal_rank ?? 999)
  );

  console.log(`=== Find TV-Size YouTube Videos ===`);
  console.log(`  Total OP/ED songs in manifest: ${opEdSongs.length}`);
  console.log(`  Limit: ${limit === Infinity ? "none" : limit}`);
  console.log(`  Dry run: ${dryRun}`);
  console.log();

  // Checkpoint: get songs that already have youtube_id_short in DB
  const db = getDb();
  const existingShorts = new Set<string>();

  if (!dryRun) {
    const rows = await db
      .select({ slug: songs.slug })
      .from(songs)
      .where(isNotNull(songs.youtube_id_short));

    for (const row of rows) {
      existingShorts.add(row.slug);
    }
    console.log(`  Already have youtube_id_short: ${existingShorts.size} songs`);
    console.log();
  }

  // Process songs
  let searched = 0;
  let found = 0;
  let skipped = 0;

  for (const song of opEdSongs) {
    if (searched >= limit) break;

    // Checkpoint: skip if already has youtube_id_short
    if (existingShorts.has(song.slug)) {
      skipped++;
      continue;
    }

    const query = buildSearchQuery(song.season_info) + " TV size";

    if (dryRun) {
      console.log(
        `  [DRY RUN] #${searched + 1} ${song.slug} -> query: "${query}"`
      );
      searched++;
      continue;
    }

    // Search YouTube
    try {
      console.log(
        `  [${searched + 1}/${Math.min(limit, opEdSongs.length - skipped)}] ` +
          `Searching: "${query}" (${song.slug})`
      );

      const result = await findTvSizeVideo(
        song.season_info,
        song.anime,
        apiKey!
      );

      if (result) {
        console.log(
          `    -> Found: "${result.title}" [${formatDuration(result.duration)}] ` +
            `by ${result.channel} (${result.videoId})`
        );

        // Update DB
        await db
          .update(songs)
          .set({ youtube_id_short: result.videoId })
          .where(eq(songs.slug, song.slug));

        found++;
      } else {
        console.log(`    -> No suitable TV-size video found`);
      }

      searched++;

      // Small delay to be nice to the API
      if (searched < limit) {
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch (err) {
      if (err instanceof Error && err.message === "QUOTA_EXCEEDED") {
        console.error(
          `\n  QUOTA EXCEEDED after ${searched} searches. ` +
            `Resume tomorrow — already-found results are saved.`
        );
        break;
      }
      console.warn(`    -> Error: ${err instanceof Error ? err.message : err}`);
      searched++;
    }
  }

  console.log();
  console.log(`=== Summary ===`);
  console.log(`  Searched: ${searched}`);
  console.log(`  Found TV-size: ${found}`);
  console.log(`  Skipped (already had): ${skipped}`);
  console.log(
    `  Estimated quota used: ~${searched * 101} units ` +
      `(${Math.round((searched * 101) / 100)}% of daily limit)`
  );
}

main().catch(console.error);
