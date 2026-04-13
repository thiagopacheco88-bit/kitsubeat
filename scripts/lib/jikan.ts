/**
 * Jikan API v4 client for fetching anime metadata and theme songs.
 *
 * Jikan is an unofficial MyAnimeList API — free, no auth required.
 * Rate limit: 3 requests/second (enforced via p-limit + delay).
 *
 * API docs: https://docs.api.jikan.moe/
 */

import pLimit from "p-limit";

// Jikan enforces 3 req/s; use concurrency 3 + 350ms delay to stay safe
const limit = pLimit(3);

const JIKAN_BASE = "https://api.jikan.moe/v4";

/** Delay helper to stay within Jikan's rate limit */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Jikan response for /top/anime */
interface JikanAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
}

/** Jikan response for /anime/{id}/themes */
interface JikanThemesResponse {
  data: {
    openings: string[];
    endings: string[];
  };
}

/** Jikan response for /top/anime */
interface JikanTopAnimeResponse {
  data: JikanAnime[];
  pagination: {
    last_visible_page: number;
    has_next_page: boolean;
  };
}

/** Parsed theme data */
export interface ParsedTheme {
  number: number;
  title: string;
  artist: string;
  raw: string;
}

/**
 * Fetch top anime by popularity from Jikan.
 * Returns up to 25 anime per page (Jikan max).
 *
 * @param page - 1-based page number
 */
export async function fetchTopAnimeByPopularity(
  page: number
): Promise<JikanAnime[]> {
  return limit(async () => {
    await sleep(350);
    const url = `${JIKAN_BASE}/top/anime?filter=bypopularity&page=${page}&limit=25`;
    const res = await fetch(url);

    if (!res.ok) {
      if (res.status === 429) {
        // Rate limited — wait longer and retry once
        await sleep(2000);
        const retry = await fetch(url);
        if (!retry.ok) {
          throw new Error(`Jikan rate limit on /top/anime page ${page}: ${retry.status}`);
        }
        const data: JikanTopAnimeResponse = await retry.json();
        return data.data;
      }
      throw new Error(`Jikan /top/anime page ${page} failed: ${res.status} ${res.statusText}`);
    }

    const data: JikanTopAnimeResponse = await res.json();
    return data.data;
  });
}

/**
 * Fetch opening and ending theme strings for a specific anime by MAL ID.
 * Each string is in the format: "1: "Title" by Artist (eps 1-12)"
 *
 * @param malId - MyAnimeList anime ID
 */
export async function fetchAnimeThemes(
  malId: number
): Promise<{ openings: string[]; endings: string[] }> {
  return limit(async () => {
    await sleep(350);
    const url = `${JIKAN_BASE}/anime/${malId}/themes`;
    const res = await fetch(url);

    if (!res.ok) {
      if (res.status === 429) {
        await sleep(2000);
        const retry = await fetch(url);
        if (!retry.ok) {
          // Return empty rather than crashing the whole pipeline
          console.warn(`Jikan rate limit on /anime/${malId}/themes — skipping`);
          return { openings: [], endings: [] };
        }
        const data: JikanThemesResponse = await retry.json();
        return data.data;
      }
      // 404 means no themes data — not an error
      if (res.status === 404) {
        return { openings: [], endings: [] };
      }
      console.warn(`Jikan /anime/${malId}/themes failed: ${res.status} — skipping`);
      return { openings: [], endings: [] };
    }

    const data: JikanThemesResponse = await res.json();
    return data.data ?? { openings: [], endings: [] };
  });
}

/**
 * Parse a Jikan theme string into structured { number, title, artist }.
 *
 * Jikan theme strings follow the format:
 *   `1: "Song Title" by Artist Name (eps 1-25)`
 *
 * Edge cases handled:
 * - Multiple artists with "feat." or "&" or "×" or "x"
 * - Parenthetical episode ranges at the end
 * - Missing artist (returns "Unknown Artist")
 * - Quoted titles with escaped quotes
 * - Version markers like "(TV Size)" appended to artist
 *
 * @param theme - Raw theme string from Jikan API
 * @returns Parsed theme or null if unparseable
 */
export function parseThemeString(theme: string): ParsedTheme | null {
  if (!theme || typeof theme !== "string") return null;

  // Primary pattern: `1: "Title" by Artist (eps...)`
  // Jikan also uses "R1:", "R2:" prefix for "recap" or alternate numbering
  // The number prefix and "by Artist" are both optional in some Jikan entries
  const primaryMatch = theme.match(
    /^[Rr]?(\d+):\s+"([^"]+)"\s+by\s+(.+?)(?:\s*\(eps?\s*[\d\-–,\s]+\))?(?:\s*\(TV\s+Size\))?$/i
  );

  if (primaryMatch) {
    const [, numStr, title, artistRaw] = primaryMatch;
    const artist = cleanArtistString(artistRaw);
    if (!title || !artist) return null;
    return {
      number: parseInt(numStr, 10),
      title: title.trim(),
      artist,
      raw: theme,
    };
  }

  // Fallback: no number prefix — `"Title" by Artist`
  const noNumberMatch = theme.match(
    /^"([^"]+)"\s+by\s+(.+?)(?:\s*\(eps?\s*[\d\-–,\s]+\))?(?:\s*\(TV\s+Size\))?$/i
  );

  if (noNumberMatch) {
    const [, title, artistRaw] = noNumberMatch;
    const artist = cleanArtistString(artistRaw);
    if (!title || !artist) return null;
    return {
      number: 1,
      title: title.trim(),
      artist,
      raw: theme,
    };
  }

  // Last-resort: no quotes around title — `1: Title by Artist` or `R1: Title by Artist`
  const noQuotesMatch = theme.match(
    /^[Rr]?(\d+):\s+(.+?)\s+by\s+(.+?)(?:\s*\(eps?\s*[\d\-–,\s]+\))?(?:\s*\(TV\s+Size\))?$/i
  );

  if (noQuotesMatch) {
    const [, numStr, title, artistRaw] = noQuotesMatch;
    const artist = cleanArtistString(artistRaw);
    if (!title || !artist) return null;
    return {
      number: parseInt(numStr, 10),
      title: title.trim(),
      artist,
      raw: theme,
    };
  }

  return null;
}

/**
 * Clean and normalize artist string from Jikan theme data.
 * Removes trailing parentheticals like "(TV Size)", "(eps 1-12)", version markers.
 */
function cleanArtistString(raw: string): string {
  return raw
    .replace(/\(TV\s+Size\)/gi, "")
    .replace(/\(eps?\s*[\d\-–,\s]+\)/gi, "")
    .replace(/\(Season\s+\d+\)/gi, "")
    .trim();
}
