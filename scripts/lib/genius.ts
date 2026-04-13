/**
 * genius.ts — Genius API client for plain-text lyrics fallback.
 *
 * Genius provides unsynced plain-text lyrics. Used as fallback when LRCLIB
 * has no match. Requires GENIUS_API_KEY environment variable.
 *
 * API docs: https://docs.genius.com/
 */

/** Search Genius for a song and return the first hit's song page URL. */
export async function searchGenius(
  title: string,
  artist: string
): Promise<string | null> {
  const apiKey = process.env.GENIUS_API_KEY;
  if (!apiKey) {
    // No API key — skip Genius silently
    return null;
  }

  const query = `${title} ${artist}`;
  const url = `https://api.genius.com/search?q=${encodeURIComponent(query)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "kitsubeat/0.1.0",
      },
    });
  } catch {
    return null;
  }

  if (!response.ok) return null;

  let data: {
    response?: {
      hits?: Array<{
        type: string;
        result: { url: string; title: string; primary_artist: { name: string } };
      }>;
    };
  };

  try {
    data = await response.json();
  } catch {
    return null;
  }

  const hits = data.response?.hits ?? [];
  const songHit = hits.find((h) => h.type === "song");

  if (!songHit) return null;

  return songHit.result.url;
}

/**
 * Fetch lyrics from a Genius song page URL.
 *
 * Scrapes the HTML page and extracts text from `data-lyrics-container` divs.
 * Returns plain-text lyrics (no timestamps).
 * Returns null if lyrics can't be extracted.
 */
export async function fetchGeniusLyrics(url: string): Promise<string | null> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; kitsubeat-bot/0.1; +https://kitsubeat.app)",
      },
    });
  } catch {
    return null;
  }

  if (!response.ok) return null;

  let html: string;
  try {
    html = await response.text();
  } catch {
    return null;
  }

  // Extract text from all data-lyrics-container divs
  // Match the full div and extract inner text
  const containerPattern =
    /data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/g;
  const lyricsChunks: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = containerPattern.exec(html)) !== null) {
    const innerHtml = match[1];
    // Convert <br> tags to newlines
    const withNewlines = innerHtml
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<br>/gi, "\n");
    // Strip remaining HTML tags
    const plainText = withNewlines
      .replace(/<[^>]+>/g, "")
      // Decode common HTML entities
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .trim();

    if (plainText) {
      lyricsChunks.push(plainText);
    }
  }

  if (lyricsChunks.length === 0) return null;

  return lyricsChunks.join("\n\n").trim();
}
