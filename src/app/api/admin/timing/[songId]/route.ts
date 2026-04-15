/**
 * GET /api/admin/timing/[songId]
 * Returns full timing_data, timing_youtube_id, timing_verified, title, artist for a song version.
 * songId is the song_versions.id (not songs.id).
 *
 * PUT /api/admin/timing/[songId]
 * Accepts { words: WordTiming[], timing_verified: "auto" | "manual" }
 * Updates timing_data and timing_verified on the song version.
 *
 * TODO: Gate behind admin role in Phase 3.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { songs, songVersions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { WordTiming } from "@/lib/timing-types";
import { refreshVocabGlobal } from "@/lib/db/queries";

// ─────────────────────────────────────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ songId: string }> }
) {
  const { songId } = await params;

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
        timing_data: songVersions.timing_data,
      })
      .from(songVersions)
      .innerJoin(songs, eq(songs.id, songVersions.song_id))
      .where(eq(songVersions.id, songId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "Song version not found" }, { status: 404 });
    }

    return NextResponse.json(row);
  } catch (err) {
    console.error(`[api/admin/timing/${songId}] GET failed:`, err);
    return NextResponse.json(
      { error: "Failed to fetch song version" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT
// ─────────────────────────────────────────────────────────────────────────────

interface PutBody {
  words: WordTiming[];
  timing_verified: "auto" | "manual";
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ songId: string }> }
) {
  const { songId } = await params;

  let body: PutBody;
  try {
    body = (await req.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.words || !Array.isArray(body.words)) {
    return NextResponse.json(
      { error: "words must be an array" },
      { status: 400 }
    );
  }

  if (!["auto", "manual"].includes(body.timing_verified)) {
    return NextResponse.json(
      { error: "timing_verified must be 'auto' or 'manual'" },
      { status: 400 }
    );
  }

  try {
    await db
      .update(songVersions)
      .set({
        timing_data: { words: body.words } as unknown as Record<string, unknown>,
        timing_verified: body.timing_verified,
        updated_at: new Date(),
      })
      .where(eq(songVersions.id, songId));

    // Refresh vocab_global after song version update (best-effort — timing updates
    // don't affect vocabulary, but lesson updates might come through this path later)
    try {
      await refreshVocabGlobal();
    } catch (refreshErr) {
      // Non-fatal — log and continue. View will be stale until next refresh.
      console.warn(`[api/admin/timing/${songId}] vocab_global refresh failed:`, refreshErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[api/admin/timing/${songId}] PUT failed:`, err);
    return NextResponse.json(
      { error: "Failed to save timing data" },
      { status: 500 }
    );
  }
}
