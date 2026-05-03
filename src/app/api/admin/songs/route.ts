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
import { songs, songVersions, lyricsVersions } from "@/lib/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { requireAdminUser, AdminRequiredError } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Display name resolver — Clerk Users have firstName/lastName/username/emailAddresses.
// Prefer the human-readable name; fall back through the chain so editors never show
// as a raw Clerk ID even when their profile is sparse.
function clerkDisplayName(u: {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  emailAddresses: { emailAddress: string }[];
}): string {
  const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  if (u.username) return u.username;
  return u.emailAddresses[0]?.emailAddress.split("@")[0] ?? "unknown";
}

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

    // Last-human-review per song_version — query in created_at DESC order and
    // keep the first row encountered per song_version_id. Cheaper than a window
    // function and works fine for the row counts we have.
    const humanRows = await db
      .select({
        song_version_id: lyricsVersions.song_version_id,
        editor_id: lyricsVersions.editor_id,
        created_at: lyricsVersions.created_at,
      })
      .from(lyricsVersions)
      .where(eq(lyricsVersions.source, "human"))
      .orderBy(desc(lyricsVersions.created_at));

    const lastHumanByVersionId = new Map<
      string,
      { editor_id: string | null; created_at: Date }
    >();
    for (const r of humanRows) {
      if (!lastHumanByVersionId.has(r.song_version_id)) {
        lastHumanByVersionId.set(r.song_version_id, {
          editor_id: r.editor_id,
          created_at: r.created_at,
        });
      }
    }

    // Resolve editor_id → display name via Clerk. Batch one call for all
    // distinct ids; if Clerk is unreachable, fall back to the raw id so the
    // column still has *something* useful instead of going blank.
    const editorIds = Array.from(
      new Set(
        Array.from(lastHumanByVersionId.values())
          .map((v) => v.editor_id)
          .filter((id): id is string => Boolean(id) && id !== "anonymous")
      )
    );
    const namesById = new Map<string, string>();
    if (editorIds.length > 0) {
      try {
        const client = await clerkClient();
        const list = await client.users.getUserList({ userId: editorIds });
        for (const u of list.data) {
          namesById.set(u.id, clerkDisplayName(u));
        }
      } catch (err) {
        console.warn("[api/admin/songs] Clerk lookup failed:", err);
      }
    }

    const enriched = rows.map((row) => {
      const last = lastHumanByVersionId.get(row.song_version_id);
      return {
        ...row,
        last_human_revision_at: last ? last.created_at.toISOString() : null,
        last_human_reviewer: last
          ? last.editor_id
            ? namesById.get(last.editor_id) ?? last.editor_id
            : "anonymous"
          : null,
      };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("[api/admin/songs] GET failed:", err);
    return NextResponse.json({ error: "Failed to fetch songs" }, { status: 500 });
  }
}
