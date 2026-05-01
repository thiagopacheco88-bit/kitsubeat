/**
 * GET /api/admin/songs
 *
 * Admin-scoped song list. Returns one row per (song, version) pair.
 *
 * Per SPEC #3 + SPEC #22: returns ALL songs including flagged
 * (flagged_wrong_song / flagged_unfixable / pipeline rerun_in_progress) — admin
 * needs to see broken songs to fix them.
 *
 * Phase 11.5: enriched with quality_status, pipeline_status, pipeline_step,
 * active_lyrics_version_id, and the song_version_id alias so that both
 * /admin/timing (uses `id`) and /admin/lyrics (uses `song_version_id`) consumers
 * share this endpoint without breaking changes.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { songs, songVersions } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { requireAdminUser, AdminRequiredError } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdminUser();
  } catch (e) {
    if (e instanceof AdminRequiredError) {
      // Should not happen — middleware redirects first. Belt + braces.
      return NextResponse.json({ error: "admin_required" }, { status: 403 });
    }
    throw e;
  }

  try {
    const rows = await db
      .select({
        // Alias used by /admin/lyrics (SongSearch.tsx)
        song_version_id: songVersions.id,
        // `id` alias kept for backward-compat with /admin/timing SongList.tsx
        id: songVersions.id,
        song_id: songs.id,
        slug: songs.slug,
        title: songs.title,
        artist: songs.artist,
        anime: songs.anime,
        season_info: songs.season_info,
        version_type: songVersions.version_type,
        // Phase 11.5: quality + pipeline fields (admin sees all statuses)
        quality_status: songs.quality_status,
        quality_notes: songs.quality_notes,
        pipeline_status: songVersions.pipeline_status,
        pipeline_step: songVersions.pipeline_step,
        active_lyrics_version_id: songVersions.active_lyrics_version_id,
        // Timing editor legacy fields (kept for /admin/timing SongList.tsx compat)
        timing_verified: songVersions.timing_verified,
        timing_youtube_id: songVersions.timing_youtube_id,
      })
      .from(songVersions)
      .innerJoin(songs, eq(songs.id, songVersions.song_id))
      // Admin-specific order: by title (admin cares about alphabetical, not timing status)
      .orderBy(asc(songs.title));

    return NextResponse.json(rows);
  } catch (err) {
    console.error("[api/admin/songs] GET failed:", err);
    return NextResponse.json({ error: "Failed to fetch songs" }, { status: 500 });
  }
}
