/**
 * lrclib.ts — LRCLIB API client with LRC format parser.
 *
 * LRCLIB is a free, community-contributed lyrics database with LRC-format
 * synced lyrics. No API key required. No rate limiting needed for 200 calls.
 *
 * API docs: https://lrclib.net/docs
 */

export interface LrcLine {
  startMs: number;
  text: string;
}

export interface LrclibResult {
  synced: LrcLine[] | null;
  plain: string;
}

/**
 * Fetch lyrics from LRCLIB for a given track.
 *
 * Searches by track name and artist name. Anime title is passed as album_name
 * but a fallback request without album_name is attempted when it returns 404
 * (LRCLIB stores the original album name, not the anime title).
 *
 * Returns synced LRC lines (if available) and plain text lyrics.
 * Returns null if no match is found.
 */
export async function fetchFromLrclib(
  title: string,
  artist: string,
  anime: string
): Promise<LrclibResult | null> {
  const LRCLIB_HEADERS = {
    "User-Agent": "kitsubeat/0.1.0 (https://github.com/kitsubeat)",
  };

  // Strategy 1: Try with album_name = anime title (exact match preferred)
  const urlWithAlbum = new URL("https://lrclib.net/api/get");
  urlWithAlbum.searchParams.set("track_name", title);
  urlWithAlbum.searchParams.set("artist_name", artist);
  urlWithAlbum.searchParams.set("album_name", anime);

  const result = await tryFetchLrclib(urlWithAlbum.toString(), LRCLIB_HEADERS);
  if (result) return result;

  // Strategy 2: Try without album_name — LRCLIB album may differ from anime title
  // (e.g., "Gurenge" single name vs "Kimetsu no Yaiba" anime title)
  const urlWithoutAlbum = new URL("https://lrclib.net/api/get");
  urlWithoutAlbum.searchParams.set("track_name", title);
  urlWithoutAlbum.searchParams.set("artist_name", artist);

  return await tryFetchLrclib(urlWithoutAlbum.toString(), LRCLIB_HEADERS);
}

/** Internal helper: make one LRCLIB GET request, return parsed result or null */
async function tryFetchLrclib(
  url: string,
  headers: Record<string, string>
): Promise<LrclibResult | null> {
  let response: Response;
  try {
    response = await fetch(url, { headers });
  } catch {
    // Network error
    return null;
  }

  if (!response.ok) {
    // 404 = no match, 400 = bad params; both treated as no match
    return null;
  }

  let data: {
    syncedLyrics?: string | null;
    plainLyrics?: string | null;
  };

  try {
    data = await response.json();
  } catch {
    return null;
  }

  const plainLyrics = data.plainLyrics?.trim() ?? "";

  // Require at least some plain lyrics
  if (!plainLyrics) {
    return null;
  }

  const synced = data.syncedLyrics ? parseLrc(data.syncedLyrics) : null;

  return {
    synced: synced && synced.length > 0 ? synced : null,
    plain: plainLyrics,
  };
}

/**
 * Parse an LRC-format string into an array of timed lines.
 *
 * LRC timestamp format: [mm:ss.xx] or [mm:ss.xxx]
 * Examples: [01:23.45] or [01:23.456]
 *
 * Lines without valid timestamps are ignored.
 * Empty lines are included with empty text (they mark verse breaks).
 */
export function parseLrc(lrc: string): LrcLine[] {
  // Regex: [mm:ss.xx] or [mm:ss.xxx] — supports both 2 and 3 digit centiseconds
  const lineRegex = /^\[(\d{1,2}):(\d{2})\.(\d{2,3})\](.*)/;

  const lines: LrcLine[] = [];

  for (const rawLine of lrc.split("\n")) {
    const trimmed = rawLine.trim();
    const match = trimmed.match(lineRegex);
    if (!match) continue;

    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const centisecStr = match[3];
    const text = match[4].trim();

    // Normalize to milliseconds
    // 2-digit centiseconds: "45" → 450ms; 3-digit: "456" → 456ms
    let ms: number;
    if (centisecStr.length === 2) {
      ms = parseInt(centisecStr, 10) * 10;
    } else {
      ms = parseInt(centisecStr, 10);
    }

    const startMs = minutes * 60 * 1000 + seconds * 1000 + ms;

    lines.push({ startMs, text });
  }

  return lines;
}
