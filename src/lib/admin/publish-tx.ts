/**
 * Phase 11.5 D-15 + D-18: atomic publish flow.
 *
 * Per src/app/actions/review.ts header: neon-http has no callback transactions.
 * We use db.batch([...]) which maps to sql.transaction([...]) under neon-http
 * (a single non-interactive HTTP transaction).
 *
 * The batch contains:
 *   (a) INSERT new lyrics_versions row with source='human'|'regen'
 *   (b) GUARDED UPDATE song_versions: active pointer + jsonb_set on lesson.verses
 *   (c) DELETE editor's lyrics_drafts row
 *
 * Stale-publish detection (D-18): pre-batch read compares base_version_id against
 * current active_lyrics_version_id. Mismatch → throw StalePublishError. The guarded
 * UPDATE in (b) catches the (vanishingly small) race window between the read and
 * the batch.
 *
 * jsonb_set preserves siblings (vocabulary, grammar_points, jlpt_level, difficulty_tier)
 * per Pitfall 7 — critical for the public song page read path.
 */

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type { Verse } from "@/lib/types/lesson";

export interface PublishParams {
  songVersionId: string;
  editorId: string;
  baseVersionId: string;
  verses: Verse[];                  // re-tokenized + renumbered already
  source: "human" | "regen";
}

export interface PublishResult {
  newVersionId: string;
  newVersionNumber: number;
}

export class StalePublishError extends Error {
  constructor(public readonly currentActiveId: string | null) {
    super("stale publish: base version no longer matches active");
    this.name = "StalePublishError";
  }
}

export async function publishLyricsVersion(p: PublishParams): Promise<PublishResult> {
  // Step 1: pre-batch stale check + compute next version_number
  const r = await db.execute<{
    active_lyrics_version_id: string | null;
    next_n: number;
  }>(sql`
    SELECT
      sv.active_lyrics_version_id::text AS active_lyrics_version_id,
      COALESCE(MAX(lv.version_number), 0) + 1 AS next_n
    FROM song_versions sv
    LEFT JOIN lyrics_versions lv ON lv.song_version_id = sv.id
    WHERE sv.id = ${p.songVersionId}::uuid
    GROUP BY sv.active_lyrics_version_id
  `);
  const rows = Array.isArray(r) ? r : (r.rows ?? []);
  const current = rows[0];

  if (!current) throw new Error("song_version_not_found");
  if (current.active_lyrics_version_id !== p.baseVersionId) {
    throw new StalePublishError(current.active_lyrics_version_id);
  }

  const newId = crypto.randomUUID();
  const versesJson = JSON.stringify(p.verses);
  const nextN = Number(current.next_n);

  // Step 2: atomic batch (3 statements, single HTTP round-trip)
  await db.batch([
    db.execute(sql`
      INSERT INTO lyrics_versions
        (id, song_version_id, version_number, source, editor_id, verses, parent_version_id, created_at)
      VALUES
        (${newId}::uuid, ${p.songVersionId}::uuid, ${nextN}, ${p.source},
         ${p.editorId}, ${versesJson}::jsonb, ${p.baseVersionId}::uuid, now())
    `),
    db.execute(sql`
      UPDATE song_versions
         SET active_lyrics_version_id = ${newId}::uuid,
             lesson = jsonb_set(
               COALESCE(lesson, '{}'::jsonb),
               '{verses}',
               ${versesJson}::jsonb
             ),
             updated_at = now()
       WHERE id = ${p.songVersionId}::uuid
         AND active_lyrics_version_id = ${p.baseVersionId}::uuid
    `),
    db.execute(sql`
      DELETE FROM lyrics_drafts
       WHERE song_version_id = ${p.songVersionId}::uuid
         AND editor_id = ${p.editorId}
    `),
  ]);

  return { newVersionId: newId, newVersionNumber: nextN };
}
