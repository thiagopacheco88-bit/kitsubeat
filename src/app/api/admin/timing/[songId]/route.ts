/**
 * GET /api/admin/timing/[songId]
 * Returns full timing_data, timing_youtube_id, timing_verified, title, artist for a song.
 *
 * PUT /api/admin/timing/[songId]
 * Accepts { words: WordTiming[], timing_verified: "auto" | "manual" }
 * Updates timing_data and timing_verified, sets updated_at = now().
 *
 * TODO: Gate behind admin role in Phase 3.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { songs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { WordTiming } from "@/lib/timing-types";

// ─────────────────────────────────────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ songId: string }> }
) {
  const { songId } = await params;

  try {
    const [song] = await db
      .select({
        id: songs.id,
        slug: songs.slug,
        title: songs.title,
        artist: songs.artist,
        anime: songs.anime,
        timing_verified: songs.timing_verified,
        timing_youtube_id: songs.timing_youtube_id,
        timing_data: songs.timing_data,
      })
      .from(songs)
      .where(eq(songs.id, songId))
      .limit(1);

    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    return NextResponse.json(song);
  } catch (err) {
    console.error(`[api/admin/timing/${songId}] GET failed:`, err);
    return NextResponse.json(
      { error: "Failed to fetch song" },
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
      .update(songs)
      .set({
        timing_data: { words: body.words } as unknown as Record<string, unknown>,
        timing_verified: body.timing_verified,
        updated_at: new Date(),
      })
      .where(eq(songs.id, songId));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[api/admin/timing/${songId}] PUT failed:`, err);
    return NextResponse.json(
      { error: "Failed to save timing data" },
      { status: 500 }
    );
  }
}
