/**
 * GET /api/admin/song/[id]/pipeline-status
 *
 * Returns pipeline_status, pipeline_step, pipeline_started_at, quality_status,
 * quality_notes for a given song_versions.id.
 *
 * Used by PipelineStatusPoller (D-10, D-22) to show rerun progress.
 * Guarded by requireAdminUser so only admins can poll pipeline state.
 *
 * [id] = song_versions.id (UUID)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { songs, songVersions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  requireAdminUser,
  AdminRequiredError,
} from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Admin gate — returns 403 if not admin
  try {
    await requireAdminUser();
  } catch (e) {
    if (e instanceof AdminRequiredError) {
      return NextResponse.json({ error: "admin_required" }, { status: 403 });
    }
    throw e;
  }

  const { id } = await params;

  try {
    const rows = await db
      .select({
        pipeline_status: songVersions.pipeline_status,
        pipeline_step: songVersions.pipeline_step,
        pipeline_started_at: songVersions.pipeline_started_at,
        quality_status: songs.quality_status,
        quality_notes: songs.quality_notes,
      })
      .from(songVersions)
      .innerJoin(songs, eq(songs.id, songVersions.song_id))
      .where(eq(songVersions.id, id))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Song version not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error(`[api/admin/song/${id}/pipeline-status] GET failed:`, err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
