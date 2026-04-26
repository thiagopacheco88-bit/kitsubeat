"use server";

import { db } from "@/lib/db/index";
import { songPlays } from "@/lib/db/schema";

/**
 * Record a song play. Called once per mount per song from YouTubeEmbed on the
 * first YT PLAYING transition. Idempotent via (song_version_id, session_key)
 * unique constraint: repeated calls from the same mount silently no-op.
 *
 * userId is optional; "anonymous" sentinel or missing maps to NULL so that
 * distinct-user counts ("X learners") can filter real users via
 * WHERE user_id IS NOT NULL while total play volume still includes anon.
 */
// TODO(clerk): once auth() is wired, also skip recording when userId matches
// the admin Clerk ID (env: ADMIN_USER_ID). Server-side gate is more robust
// than the client-side localStorage flag — works across every browser/device
// the admin uses without per-browser setup.
export async function recordSongPlay(
  songVersionId: string,
  sessionKey: string,
  userId?: string | null,
): Promise<void> {
  if (!songVersionId || !sessionKey) return;
  const resolvedUserId =
    userId && userId !== "anonymous" ? userId : null;
  await db
    .insert(songPlays)
    .values({
      song_version_id: songVersionId,
      session_key: sessionKey,
      user_id: resolvedUserId,
    })
    .onConflictDoNothing();
}
