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
