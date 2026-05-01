"use server";

/**
 * Phase 11.5 SPEC #15 + D-16: saveDraft server action.
 *
 * Upserts a row in lyrics_drafts keyed on (song_version_id, editor_id).
 * Per D-17: client also writes localStorage in lockstep (effect-level — outside this action).
 *
 * Per D-18: base_version_id is captured at first load and remains stable until publish.
 *   Stale-publish detection happens in Plan 07's publishLyricsVersion, not here.
 *
 * Notes (per src/app/actions/review.ts header):
 * - No db.transaction() — neon-http has no callback transactions.
 * - Single statement → no batch needed. Uses onConflictDoUpdate.
 */

export const runtime = "nodejs"; // required for Clerk currentUser

import { db } from "@/lib/db";
import { lyricsDrafts } from "@/lib/db/schema";
import { requireAdminUser } from "@/lib/admin/require-admin";
import type { Verse } from "@/lib/types/lesson";

export interface SaveDraftInput {
  songVersionId: string;
  baseVersionId: string;
  verses: Verse[];
  dirtyVerseNumbers: number[];
}

export interface SaveDraftResult {
  ok: true;
  updatedAt: string;
  editorId: string;
}

export async function saveDraft(input: SaveDraftInput): Promise<SaveDraftResult> {
  const admin = await requireAdminUser(); // throws AdminRequiredError on non-admin

  const updatedAt = new Date();

  await db
    .insert(lyricsDrafts)
    .values({
      song_version_id: input.songVersionId,
      editor_id: admin.id,
      base_version_id: input.baseVersionId,
      verses: input.verses,
      dirty_verse_numbers: input.dirtyVerseNumbers,
      updated_at: updatedAt,
    })
    .onConflictDoUpdate({
      target: [lyricsDrafts.song_version_id, lyricsDrafts.editor_id],
      set: {
        verses: input.verses,
        dirty_verse_numbers: input.dirtyVerseNumbers,
        // base_version_id is NOT updated on each save — it's pinned at load time
        // and only changes when admin reloads after a publish (D-17/D-18 contract).
        updated_at: updatedAt,
      },
    });

  return {
    ok: true,
    updatedAt: updatedAt.toISOString(),
    editorId: admin.id,
  };
}
