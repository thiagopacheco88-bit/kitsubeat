/**
 * GET /api/admin/songs
 *
 * Returns one row per song_version for the timing editor song list.
 * Timing lives on song_versions (each tv/full cut has its own timing).
 * Ordered by timing_verified ASC (auto first — needs review) then title ASC.
 *
 * TODO: Gate behind admin role in Phase 3.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { songs, songVersions } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db
      .select({
        id: songVersions.id,
        version_type: songVersions.version_type,
        slug: songs.slug,
        title: songs.title,
        artist: songs.artist,
        anime: songs.anime,
        timing_verified: songVersions.timing_verified,
        timing_youtube_id: songVersions.timing_youtube_id,
      })
      .from(songVersions)
      .innerJoin(songs, eq(songs.id, songVersions.song_id))
      .orderBy(asc(songVersions.timing_verified), asc(songs.title));

    return NextResponse.json(rows);
  } catch (err) {
    console.error("[api/admin/songs] GET failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch songs" },
      { status: 500 }
    );
  }
}
