/**
 * Probe: run the recordVocabAnswer track-pct CTE directly for the user/song
 * combo to see what it returns.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  const songSlug = "heart-of-sword-t-m-revolution";
  const userId = "user_3D9nKup2ZmAFL9br7iscO4MCLtE";

  const versions = await db.execute<{ id: string }>(sql`
    SELECT sv.id
    FROM song_versions sv
    JOIN songs s ON s.id = sv.song_id
    WHERE s.slug = ${songSlug}
  `);
  const versionRows = Array.isArray(versions) ? versions : (versions as { rows?: typeof versions }).rows ?? [];
  const songVersionId = (versionRows[0] as { id: string } | undefined)?.id;
  console.log(`song_version_id = ${songVersionId}`);

  // The exact CTE from recordVocabAnswer
  const result = await db.execute<{
    vocab: string | null;
    grammar: string | null;
    kanji: string | null;
  }>(sql`
    WITH song_vocab_items AS (
      SELECT
        (elem->>'vocab_item_id')::uuid AS vocab_item_id,
        (elem->>'surface')::text       AS surface
      FROM song_versions sv,
        jsonb_array_elements(sv.lesson->'vocabulary') AS elem
      WHERE sv.id = ${songVersionId}::uuid
        AND elem->>'vocab_item_id' IS NOT NULL
    ),
    vocab_correct AS (
      SELECT
        COUNT(*) FILTER (WHERE m.state >= 1) AS c,
        COUNT(*) AS t
      FROM song_vocab_items si
      LEFT JOIN user_vocab_mastery m
        ON m.vocab_item_id = si.vocab_item_id
        AND m.user_id = ${userId}
        AND m.card_kind = 'romaji_meaning'
    ),
    kanji_pool AS (
      SELECT vocab_item_id
      FROM song_vocab_items
      WHERE surface ~ '[一-鿿㐀-䶿]'
    ),
    kanji_correct AS (
      SELECT
        COUNT(*) FILTER (WHERE m.state >= 1) AS c,
        COUNT(*) AS t
      FROM kanji_pool kp
      LEFT JOIN user_vocab_mastery m
        ON m.vocab_item_id = kp.vocab_item_id
        AND m.user_id = ${userId}
        AND m.card_kind = 'kanji_kana'
    ),
    grammar_correct AS (
      SELECT
        COUNT(DISTINCT log.id) FILTER (
          WHERE log.exercise_type = 'grammar_conjugation' AND log.rating >= 3
        ) AS c,
        (SELECT COUNT(*) FROM song_version_grammar_rules WHERE song_version_id = ${songVersionId}::uuid) AS t
      FROM user_exercise_log log
      WHERE log.user_id = ${userId}
        AND log.song_version_id = ${songVersionId}::uuid
        AND log.exercise_type = 'grammar_conjugation'
    )
    SELECT
      ROUND((vc.c::numeric / NULLIF(vc.t, 0) * 100), 2)::text AS vocab,
      ROUND((gc.c::numeric / NULLIF(gc.t, 0) * 100), 2)::text AS grammar,
      ROUND((kc.c::numeric / NULLIF(kc.t, 0) * 100), 2)::text AS kanji,
      vc.c AS vocab_c, vc.t AS vocab_t,
      gc.c AS grammar_c, gc.t AS grammar_t,
      kc.c AS kanji_c, kc.t AS kanji_t
    FROM vocab_correct vc, grammar_correct gc, kanji_correct kc
  `);

  const rows = Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows ?? [];
  console.log("CTE result:", rows);

  // Also check the user_song_progress row
  const usp = await db.execute(sql`
    SELECT user_id, vocab_track_pct, grammar_track_pct, kanji_track_pct, completion_pct, updated_at
    FROM user_song_progress
    WHERE user_id = ${userId} AND song_version_id = ${songVersionId}::uuid
  `);
  const uspRows = Array.isArray(usp) ? usp : (usp as { rows?: unknown[] }).rows ?? [];
  console.log("user_song_progress row:", uspRows);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
