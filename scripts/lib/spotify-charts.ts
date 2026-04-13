/**
 * Spotify Web API client for fetching anime song playlists.
 *
 * Uses the Client Credentials OAuth flow — no user auth required.
 * Locked decision: Spotify is a required source for song ranking.
 *
 * API docs: https://developer.spotify.com/documentation/web-api
 */

import pLimit from "p-limit";

// Spotify allows 30 req/s; use p-limit(5) to be polite and avoid burst limits
const limit = pLimit(5);

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

/** Cached access token with expiry */
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get a Spotify access token using Client Credentials flow.
 * Caches the token for its full TTL to minimize token requests.
 */
export async function getSpotifyAccessToken(): Promise<string> {
  const now = Date.now();

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && now < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET environment variables. " +
        "Set them in .env.local before running the manifest builder."
    );
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(
      `Spotify token request failed: ${res.status} ${res.statusText}`
    );
  }

  const data: { access_token: string; expires_in: number } = await res.json();

  cachedToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return cachedToken.token;
}

/** Spotify track object (subset of fields we need) */
interface SpotifyTrack {
  name: string;
  artists: Array<{ name: string }>;
  popularity: number;
}

/** Spotify playlist item */
interface SpotifyPlaylistItem {
  track: SpotifyTrack | null;
}

/** Result from fetchSpotifyAnimeThemes */
export interface SpotifyAnimeTheme {
  title: string;
  artist: string;
  spotify_rank: number; // Lower = more popular (1-based rank by popularity score)
}

/** Search queries for finding anime theme playlists on Spotify */
const ANIME_PLAYLIST_QUERIES = [
  "anime openings",
  "anime OP ED themes",
  "best anime songs",
  "anime op collection",
  "anime ending songs",
];

/**
 * Fetch anime theme songs from Spotify playlists.
 *
 * Strategy:
 * 1. Search for well-known anime theme playlists using multiple queries
 * 2. Fetch tracks from each top playlist result
 * 3. Deduplicate by title + artist
 * 4. Sort by Spotify popularity score (higher = more popular)
 * 5. Return ranked array with spotify_rank assigned
 */
export async function fetchSpotifyAnimeThemes(): Promise<SpotifyAnimeTheme[]> {
  const token = await getSpotifyAccessToken();

  // Step 1: Search for anime theme playlists
  const playlistIds = await searchAnimePlaylists(token);
  console.log(`[Spotify] Found ${playlistIds.length} anime playlists to scan`);

  // Step 2: Fetch tracks from each playlist (limited to avoid quota exhaustion)
  const tracksByPlaylist = await Promise.all(
    playlistIds.slice(0, 8).map((id) => fetchPlaylistTracks(token, id))
  );

  // Step 3: Flatten and deduplicate tracks
  const allTracks = tracksByPlaylist.flat();
  const deduped = deduplicateTracks(allTracks);

  // Step 4: Sort by popularity descending (Spotify 0-100 score)
  deduped.sort((a, b) => b.popularity - a.popularity);

  // Step 5: Assign rank (1 = most popular)
  return deduped.map((track, i) => ({
    title: track.name,
    artist: track.artists[0]?.name ?? "Unknown Artist",
    spotify_rank: i + 1,
  }));
}

/**
 * Search Spotify for anime theme playlists.
 * Returns up to 5 playlist IDs per query (5 queries * 5 playlists = 25 max).
 */
async function searchAnimePlaylists(token: string): Promise<string[]> {
  const ids: string[] = [];

  for (const query of ANIME_PLAYLIST_QUERIES) {
    const playlistIds = await limit(async () => {
      const url = `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(query)}&type=playlist&limit=5`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.warn(`[Spotify] Playlist search failed for "${query}": ${res.status}`);
        return [];
      }

      const data: {
        playlists: { items: Array<{ id: string; name: string }> };
      } = await res.json();

      return data.playlists.items.map((p) => p.id);
    });

    ids.push(...playlistIds);
  }

  // Deduplicate playlist IDs
  return [...new Set(ids)];
}

/**
 * Fetch tracks from a Spotify playlist (up to 100 tracks per request).
 * Handles pagination to get all tracks.
 */
async function fetchPlaylistTracks(
  token: string,
  playlistId: string
): Promise<SpotifyTrack[]> {
  return limit(async () => {
    const tracks: SpotifyTrack[] = [];
    let url: string | null =
      `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks?limit=100&fields=items(track(name,artists,popularity)),next`;

    while (url) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.warn(`[Spotify] Playlist ${playlistId} tracks failed: ${res.status}`);
        break;
      }

      const data: {
        items: SpotifyPlaylistItem[];
        next: string | null;
      } = await res.json();

      for (const item of data.items) {
        if (item.track && item.track.name) {
          tracks.push(item.track);
        }
      }

      url = data.next;

      // Safety: don't fetch more than 5 pages per playlist
      if (tracks.length >= 500) break;
    }

    return tracks;
  });
}

/**
 * Deduplicate tracks by normalized title + primary artist.
 * Keeps the version with the highest popularity score.
 */
function deduplicateTracks(tracks: SpotifyTrack[]): SpotifyTrack[] {
  const seen = new Map<string, SpotifyTrack>();

  for (const track of tracks) {
    const key = normalizeKey(track.name, track.artists[0]?.name ?? "");
    const existing = seen.get(key);
    if (!existing || track.popularity > existing.popularity) {
      seen.set(key, track);
    }
  }

  return Array.from(seen.values());
}

/**
 * Normalize a title + artist pair to a deduplication key.
 * Strips parentheticals, lowercases, removes non-alphanumeric characters.
 */
export function normalizeKey(title: string, artist: string): string {
  const normalizeStr = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFC")
      .replace(/\(.*?\)/g, "") // remove parentheticals
      .replace(/\[.*?\]/g, "") // remove brackets
      .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/g, "") // keep alphanum + CJK
      .trim();

  return `${normalizeStr(title)}__${normalizeStr(artist)}`;
}
