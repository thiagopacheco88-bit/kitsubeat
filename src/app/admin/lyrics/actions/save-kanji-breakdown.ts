"use server";

/**
 * Phase 11.5 SPEC #9 (writable cross-song kanji_breakdown editor) + ISSUE-02 revision.
 *
 * UPDATE vocabulary_items.kanji_breakdown for the given vocabId, then revalidate
 * the song-page cache for every song that references this vocab so propagation
 * is observable on the next public read.
 *
 * The client (VerseRow.tsx kanji_breakdown editor) calls this onBlur. The
 * editor surfaces an "edits propagate to N other songs" confirm dialog before
 * the save fires (T-11.5-08 mitigation). The server action does NOT itself
 * gate on that confirm — the gate is the client UX. Both layers exist defensively.
 */

export const runtime = "nodejs";

import { db } from "@/lib/db";
import { sql, eq } from "drizzle-orm";
import { vocabularyItems } from "@/lib/db/schema";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { revalidateSongCache } from "@/app/actions/cache";

export interface SaveKanjiBreakdownInput {
  vocabId: string;
  // Accepts either the array shape or the { characters, compound_note } shape;
  // the action stores whatever the client sent (matches the existing JSONB schema flexibility).
  breakdown: unknown;
}

export interface SaveKanjiBreakdownResult {
  ok: true;
  affectedSlugs: string[];
}

/**
 * Returns the slugs of every song whose lesson.verses[].tokens[].vocab_item_id
 * references the given vocabId. Used both for the confirm-hint count and for
 * post-save cache invalidation.
 */
export async function countAffectedSongs(
  vocabId: string
): Promise<{ count: number; slugs: string[] }> {
  const r = await db.execute<{ slug: string }>(sql`
    WITH ref AS (
      SELECT DISTINCT s.slug AS slug
      FROM song_versions sv
      INNER JOIN songs s ON s.id = sv.song_id,
           LATERAL jsonb_array_elements(sv.lesson->'verses') AS verse,
           LATERAL jsonb_array_elements(verse->'tokens') AS token
      WHERE sv.lesson IS NOT NULL
        AND token->>'vocab_item_id' = ${vocabId}
    )
    SELECT slug FROM ref
  `);
  const rows = Array.isArray(r) ? r : (r.rows ?? []);
  const slugs = rows.map((row) => row.slug);
  return { count: slugs.length, slugs };
}

export async function saveKanjiBreakdown(
  input: SaveKanjiBreakdownInput
): Promise<SaveKanjiBreakdownResult> {
  await requireAdminUser();

  if (!input.vocabId || typeof input.vocabId !== "string") {
    throw new Error("vocabId is required");
  }

  // 1. UPDATE vocabulary_items.kanji_breakdown WHERE id = vocabId
  await db
    .update(vocabularyItems)
    .set({ kanji_breakdown: input.breakdown as never })
    .where(eq(vocabularyItems.id, input.vocabId));

  // 2. Compute affected song slugs and revalidate each so the public catalog
  //    reflects the new breakdown on next read (SPEC #9 cross-song propagation)
  const affected = await countAffectedSongs(input.vocabId);
  for (const slug of affected.slugs) {
    try {
      await revalidateSongCache(slug);
    } catch {
      // revalidate failures are best-effort — do not abort the save
    }
  }

  return { ok: true, affectedSlugs: affected.slugs };
}
