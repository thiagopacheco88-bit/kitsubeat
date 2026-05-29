"use server";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { songs, songVersions } from "@/lib/db/schema";
import { checkVideoAvailability, isAvailable } from "@/lib/youtube/check-availability";

/** Require admin — throws if not authenticated as admin. */
async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const admins = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim());
  if (!admins.includes(userId)) throw new Error("Forbidden");
}

/** Toggle is_available flag for a single song. */
export async function toggleSongAvailability(
  songId: string,
  available: boolean,
): Promise<void> {
  await requireAdmin();
  await db
    .update(songs)
    .set({ is_available: available })
    .where(eq(songs.id, songId));
}

/** Re-check a single song's YouTube videos via oEmbed and update the DB. */
export async function recheckSongAvailability(
  songId: string,
): Promise<{ available: boolean; statuses: string[] }> {
  await requireAdmin();

  const versions = await db
    .select({ youtube_id: songVersions.youtube_id })
    .from(songVersions)
    .where(eq(songVersions.song_id, songId));

  const youtubeIds = versions
    .map((v) => v.youtube_id)
    .filter((id): id is string => id != null);

  if (youtubeIds.length === 0) {
    await db
      .update(songs)
      .set({ is_available: false })
      .where(eq(songs.id, songId));
    return { available: false, statuses: ["no video"] };
  }

  const results = await Promise.all(youtubeIds.map(checkVideoAvailability));
  const available = results.some(isAvailable);
  const statuses = results.map((r) => `${r.youtubeId}: ${r.status}`);

  await db
    .update(songs)
    .set({ is_available: available })
    .where(eq(songs.id, songId));

  return { available, statuses };
}
