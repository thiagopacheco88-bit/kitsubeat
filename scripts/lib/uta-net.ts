/**
 * uta-net.ts — Uta-Net (歌ネット) lyrics scraper.
 *
 * Uta-Net is Japan's largest lyrics database with near-complete coverage of
 * J-pop and anime songs. No official API exists; this scraper uses the public
 * search endpoint and parses the resulting HTML.
 *
 * Returns plain-text Japanese lyrics only (no timestamps — Uta-Net does not
 * provide synced/LRC format). Intended as a fallback after LRCLIB fails and
 * before Genius in the lyrics fetch chain.
 *
 * Rate limiting: 1 request per second is conservative and respectful.
 */

const BASE_URL = "https://www.uta-net.com";
const SEARCH_URL = `${BASE_URL}/search/`;
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; kitsubeat-lyrics-fetcher/1.0; educational use)",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "ja,en;q=0.9",
};

export interface UtaNetResult {
  plain: string;
  song_url: string;
}

/**
 * Search Uta-Net for a song and return its plain-text lyrics.
 * Tries title+artist, then title-only as fallback.
 */
export async function fetchFromUtaNet(
  title: string,
  artist: string
): Promise<UtaNetResult | null> {
  // Strategy 1: search title + artist
  const result = await trySearch(title, artist);
  if (result) return result;

  // Strategy 2: title only (catches cases where artist name differs)
  return await trySearch(title, "");
}

async function trySearch(
  title: string,
  artist: string
): Promise<UtaNetResult | null> {
  // Uta-Net search: Keyword= is the search term, search_target= is "title"|"artist"
  // When artist is provided, search by artist name first to narrow results.
  const keyword = artist ? `${title} ${artist}` : title;
  const params = new URLSearchParams({
    Keyword: keyword,
    search_target: "title",
  });

  const searchUrl = `${SEARCH_URL}?${params}`;
  let html: string;

  try {
    const res = await fetch(searchUrl, { headers: HEADERS });
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  }

  const songPath = extractFirstSongPath(html);
  if (!songPath) return null;

  return await fetchLyricsPage(`${BASE_URL}${songPath}`);
}

/** Extract the first song page path from search results HTML. */
function extractFirstSongPath(html: string): string | null {
  // Uta-Net search results list song links as /song/<id>/
  const match = html.match(/href="(\/song\/\d+\/)"/);
  return match ? match[1] : null;
}

/** Fetch a song page and extract the lyrics text. */
async function fetchLyricsPage(url: string): Promise<UtaNetResult | null> {
  let html: string;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  }

  const lyrics = extractLyrics(html);
  if (!lyrics) return null;

  return { plain: lyrics, song_url: url };
}

/**
 * Extract lyrics from a Uta-Net song page.
 * Lyrics live in <div id="kashi_area"> with <br> tags for line breaks.
 */
function extractLyrics(html: string): string | null {
  // Match the kashi_area div content
  const divMatch = html.match(/<div[^>]+id="kashi_area"[^>]*>([\s\S]*?)<\/div>/);
  if (!divMatch) return null;

  const inner = divMatch[1]
    .replace(/<br\s*\/?>/gi, "\n")   // <br> → newline
    .replace(/<[^>]+>/g, "")         // strip remaining tags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    .trim();

  if (!inner || inner.length < 20) return null;

  // Normalise multiple blank lines to single blank lines
  return inner.replace(/\n{3,}/g, "\n\n").trim();
}

/** 1-second rate limit helper. */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
