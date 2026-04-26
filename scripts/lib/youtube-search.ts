/**
 * YouTube Data API v3 client for searching video IDs by song title and artist.
 *
 * API docs: https://developers.google.com/youtube/v3/docs/search/list
 *
 * Quota:
 * - Each search request costs 100 units
 * - Default daily quota: 10,000 units = 100 searches/day
 * - For 200 songs, we need 2 days of quota (or request higher quota)
 *
 * The manifest builder handles quota management by saving progress after
 * every 10 YouTube searches.
 */

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

/** YouTube search response */
interface YouTubeSearchResponse {
  items: Array<{
    id: {
      kind: string;
      videoId?: string;
    };
  }>;
  error?: {
    code: number;
    message: string;
    errors: Array<{ reason: string; domain: string }>;
  };
}

/**
 * Search for a YouTube video ID for a given song title and artist.
 *
 * Uses the query format: `"{title} {artist} official"` which typically
 * surfaces the official MV or a high-quality upload.
 *
 * Returns the first video ID found, or null if:
 * - No results found
 * - API quota exceeded
 * - YOUTUBE_API_KEY is not set
 * - Any API error occurs
 *
 * @param title - Song title
 * @param artist - Artist name
 * @returns YouTube video ID (e.g., "dQw4w9WgXcQ") or null
 */
export async function searchYouTubeVideoId(
  title: string,
  artist: string
): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing YOUTUBE_API_KEY environment variable. " +
        "Set it in .env.local. Get a key from Google Cloud Console: " +
        "APIs & Services -> Credentials -> Create API Key -> Enable YouTube Data API v3"
    );
  }

  const query = `${title} ${artist} official`;
  const params = new URLSearchParams({
    q: query,
    type: "video",
    maxResults: "1",
    key: apiKey,
    part: "id",
    // Prefer Japanese region for anime content
    regionCode: "JP",
    relevanceLanguage: "ja",
  });

  const url = `${YOUTUBE_API_BASE}/search?${params}`;

  try {
    const res = await fetch(url);
    const data: YouTubeSearchResponse = await res.json();

    if (data.error) {
      if (data.error.errors.some((e) => e.reason === "quotaExceeded")) {
        throw new YouTubeQuotaExceededError(
          `YouTube API quota exceeded. Daily limit of 10,000 units reached. ` +
            `Run again tomorrow or request a quota increase in Google Cloud Console.`
        );
      }
      console.warn(`[YouTube] API error for "${title} - ${artist}": ${data.error.message}`);
      return null;
    }

    if (!res.ok) {
      console.warn(`[YouTube] Search failed for "${title} - ${artist}": ${res.status}`);
      return null;
    }

    const videoItem = data.items?.find((item) => item.id.kind === "youtube#video");
    return videoItem?.id.videoId ?? null;
  } catch (err) {
    if (err instanceof YouTubeQuotaExceededError) {
      throw err; // Re-throw quota errors — manifest builder handles them
    }
    console.warn(
      `[YouTube] Request error for "${title} - ${artist}": ${err instanceof Error ? err.message : err}`
    );
    return null;
  }
}

/**
 * Thrown when YouTube API quota is exceeded.
 * The manifest builder catches this and saves progress before exiting.
 */
export class YouTubeQuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "YouTubeQuotaExceededError";
  }
}

/**
 * Estimate quota cost for a number of YouTube searches.
 * Each search = 100 units; daily quota = 10,000 units by default.
 */
export function estimateYouTubeQuota(searchCount: number): {
  units: number;
  daysRequired: number;
  percentOfDailyQuota: number;
} {
  const units = searchCount * 100;
  const dailyQuota = 10_000;
  return {
    units,
    daysRequired: Math.ceil(units / dailyQuota),
    percentOfDailyQuota: Math.round((units / dailyQuota) * 100),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Availability probe — videos.list classifier for the geo-audit pipeline.
//
// Used by scripts/seed/06-qa-geo-check.ts and scripts/backfill-geo-check.ts.
// videos.list costs 1 unit per call and accepts up to 50 ids per call, so a
// full-catalog audit is effectively free against the 10k daily quota.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Primary markets the product serves. A video is "americas" (playable) only
 * if none of these regions appear in its regionRestriction.blocked list and,
 * when an allowed list is set, every one of these regions is included.
 */
export const AMERICAS_REGIONS = ["US", "BR", "MX", "AR", "CL", "CO"] as const;

/** Shape returned by fetchVideosMetadata — just the availability-relevant bits. */
export interface VideoMetadata {
  id: string;
  embeddable: boolean;
  privacyStatus: string; // "public" | "unlisted" | "private" (string for forward-compat)
  regionRestriction?: {
    blocked?: string[];
    allowed?: string[];
  };
}

/** Tier returned by classifyAvailability. */
export type AvailabilityTier = "global" | "americas" | "restricted";

/** Internal YouTube videos.list response shape (only the fields we read). */
interface YouTubeVideosListResponse {
  items?: Array<{
    id: string;
    status?: { privacyStatus?: string; embeddable?: boolean };
    contentDetails?: {
      regionRestriction?: { blocked?: string[]; allowed?: string[] };
    };
  }>;
  error?: {
    code: number;
    message: string;
    errors: Array<{ reason: string; domain: string }>;
  };
}

/**
 * Batch-fetch availability metadata for up to 50 YouTube IDs.
 *
 * IDs that YouTube doesn't return (deleted / private / bad id) are simply
 * absent from the output array — callers compare input vs output by id to
 * classify those as GONE.
 *
 * Throws YouTubeQuotaExceededError on quota errors so the geo-audit pipeline
 * can report partial results and exit cleanly.
 */
export async function fetchVideosMetadata(
  ids: string[],
  apiKey: string
): Promise<VideoMetadata[]> {
  if (ids.length === 0) return [];
  if (ids.length > 50) {
    throw new Error(
      `fetchVideosMetadata: max 50 ids per call, got ${ids.length}. Caller should chunk.`
    );
  }

  const params = new URLSearchParams({
    id: ids.join(","),
    part: "status,contentDetails",
    key: apiKey,
  });
  const url = `${YOUTUBE_API_BASE}/videos?${params}`;

  const res = await fetch(url);
  const data = (await res.json()) as YouTubeVideosListResponse;

  if (data.error) {
    if (data.error.errors.some((e) => e.reason === "quotaExceeded")) {
      throw new YouTubeQuotaExceededError(
        `YouTube API quota exceeded during videos.list. Try again tomorrow.`
      );
    }
    throw new Error(`YouTube videos.list error (${data.error.code}): ${data.error.message}`);
  }

  return (data.items ?? []).map((item) => ({
    id: item.id,
    embeddable: item.status?.embeddable ?? false,
    privacyStatus: item.status?.privacyStatus ?? "unknown",
    regionRestriction: item.contentDetails?.regionRestriction,
  }));
}

/**
 * Classify a video's regional availability against a set of target regions.
 *
 *   - "global"     — no regionRestriction at all; playable everywhere
 *   - "americas"   — regionRestriction present, but every target region is
 *                    still playable (not in blocked; in allowed if allowed is set)
 *   - "restricted" — at least one target region cannot play the video
 */
export function classifyAvailability(
  meta: VideoMetadata,
  targetRegions: readonly string[]
): AvailabilityTier {
  const rr = meta.regionRestriction;
  if (!rr || (!rr.blocked?.length && !rr.allowed?.length)) return "global";

  if (rr.blocked?.length) {
    const blocksTarget = rr.blocked.some((r) => targetRegions.includes(r));
    return blocksTarget ? "restricted" : "americas";
  }

  if (rr.allowed?.length) {
    const allAllowed = targetRegions.every((r) => rr.allowed!.includes(r));
    return allAllowed ? "americas" : "restricted";
  }

  return "global";
}
