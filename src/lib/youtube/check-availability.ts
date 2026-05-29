/**
 * YouTube video availability checker via the public oEmbed API.
 *
 * oEmbed returns:
 *   200 → video exists and is publicly embeddable
 *   401 → video is private or requires auth
 *   403 → video is blocked / geo-restricted
 *   404 → video has been removed
 *
 * No API key required. Rate-limit: ~300 req/min with default headers.
 */

export type VideoStatus = "available" | "blocked" | "private" | "removed" | "error";

export interface VideoAvailabilityResult {
  youtubeId: string;
  status: VideoStatus;
  httpStatus: number | null;
}

export async function checkVideoAvailability(
  youtubeId: string,
): Promise<VideoAvailabilityResult> {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`;
  try {
    const res = await fetch(url, {
      // Don't follow redirects — 3xx on oEmbed is unusual but we want the raw status
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      return { youtubeId, status: "available", httpStatus: res.status };
    }
    if (res.status === 401) {
      return { youtubeId, status: "private", httpStatus: res.status };
    }
    if (res.status === 403) {
      return { youtubeId, status: "blocked", httpStatus: res.status };
    }
    if (res.status === 404) {
      return { youtubeId, status: "removed", httpStatus: res.status };
    }
    return { youtubeId, status: "error", httpStatus: res.status };
  } catch {
    return { youtubeId, status: "error", httpStatus: null };
  }
}

/** Returns true if the video is publicly playable. */
export function isAvailable(result: VideoAvailabilityResult): boolean {
  return result.status === "available";
}
