/**
 * GET /api/admin/songs
 *
 * Returns all songs with timing metadata for the timing editor song list.
 * Ordered by timing_verified ASC (auto first — needs review) then title ASC.
 *
 * TODO: Gate behind admin role in Phase 3.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { songs } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db
      .select({
        id: songs.id,
        slug: songs.slug,
        title: songs.title,
        artist: songs.artist,
        anime: songs.anime,
        timing_verified: songs.timing_verified,
        timing_youtube_id: songs.timing_youtube_id,
      })
      .from(songs)
      .orderBy(asc(songs.timing_verified), asc(songs.title));

    return NextResponse.json(rows);
  } catch (err) {
    console.error("[api/admin/songs] GET failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch songs" },
      { status: 500 }
    );
  }
}
