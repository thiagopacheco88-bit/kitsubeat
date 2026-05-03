/**
 * One-time backfill: for every user_song_progress row with NULL track pcts,
 * recompute via the same CTE recordVocabAnswer uses, then write.
 *
 * Use after fixing the `vi.surface` column bug in the live CTE — earlier
 * answers wrote user_vocab_mastery rows but never updated track pcts because
 * the CTE threw `column vi.surface does not exist` and the caller swallowed
 * the error.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  // Find every (user_id, song_version_id) pair that has any user_vocab_mastery
  // row but NULL track pcts on user_song_progress (or no progress row at all).
  const targets = await db.execute<{
    user_id: string;
    song_version_id: string;
  }>(sql`
    SELECT DISTINCT m.user_id, sv.id AS song_version_id
    FROM user_vocab_mastery m
    JOIN song_versions sv ON TRUE
    WHERE EXISTS (
      SELECT 1 FROM jsonb_array_elements(sv.lesson->'vocabulary') AS elem
      WHERE (elem->>'vocab_item_id')::uuid = m.vocab_item_id
    )
  `);
  const targetRows = Array.isArray(targets) ? targets : (targets as { rows?: unknown[] }).rows ?? [];
  console.log(`Found ${targetRows.length} (user, song_version) pairs to recompute`);

  for (const t of targetRows as Array<{ user_id: string; song_version_id: string }>) {
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
        WHERE sv.id = ${t.song_version_id}::uuid
          AND elem->>'vocab_item_id' IS NOT NULL
      ),
      vocab_correct AS (
        SELECT COUNT(*) FILTER (WHERE m.state >= 1) AS c, COUNT(*) AS t
        FROM song_vocab_items si
        LEFT JOIN user_vocab_mastery m
          ON m.vocab_item_id = si.vocab_item_id
          AND m.user_id = ${t.user_id}
          AND m.card_kind = 'romaji_meaning'
      ),
      kanji_pool AS (
        SELECT vocab_item_id FROM song_vocab_items WHERE surface ~ '[一-鿿㐀-䶿]'
      ),
      kanji_correct AS (
        SELECT COUNT(*) FILTER (WHERE m.state >= 1) AS c, COUNT(*) AS t
        FROM kanji_pool kp
        LEFT JOIN user_vocab_mastery m
          ON m.vocab_item_id = kp.vocab_item_id
          AND m.user_id = ${t.user_id}
          AND m.card_kind = 'kanji_kana'
      ),
      grammar_correct AS (
        SELECT
          COUNT(DISTINCT log.id) FILTER (WHERE log.exercise_type = 'grammar_conjugation' AND log.rating >= 3) AS c,
          (SELECT COUNT(*) FROM song_version_grammar_rules WHERE song_version_id = ${t.song_version_id}::uuid) AS t
        FROM user_exercise_log log
        WHERE log.user_id = ${t.user_id}
          AND log.song_version_id = ${t.song_version_id}::uuid
          AND log.exercise_type = 'grammar_conjugation'
      )
      SELECT
        ROUND((vc.c::numeric / NULLIF(vc.t, 0) * 100), 2)::text AS vocab,
        ROUND((gc.c::numeric / NULLIF(gc.t, 0) * 100), 2)::text AS grammar,
        ROUND((kc.c::numeric / NULLIF(kc.t, 0) * 100), 2)::text AS kanji
      FROM vocab_correct vc, grammar_correct gc, kanji_correct kc
    `);

    const rows = Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows ?? [];
    const r = rows[0] as { vocab: string | null; grammar: string | null; kanji: string | null } | undefined;
    if (!r) continue;

    const vocabPct = r.vocab != null ? parseFloat(r.vocab) : 100;
    const grammarPct = r.grammar != null ? parseFloat(r.grammar) : 100;
    const kanjiPct = r.kanji != null ? parseFloat(r.kanji) : 100;

    if (vocabPct === 0 && grammarPct === 100 && kanjiPct === 100) continue;

    await db.execute(sql`
      INSERT INTO user_song_progress (user_id, song_version_id, vocab_track_pct, grammar_track_pct, kanji_track_pct, advanced_drills_unlocked_at)
      VALUES (
        ${t.user_id}, ${t.song_version_id}::uuid,
        ${vocabPct}::numeric, ${grammarPct}::numeric, ${kanjiPct}::numeric,
        CASE WHEN ${vocabPct}::numeric >= 80 AND ${grammarPct}::numeric >= 80 AND ${kanjiPct}::numeric >= 80 THEN NOW() ELSE NULL END
      )
      ON CONFLICT (user_id, song_version_id) DO UPDATE SET
        vocab_track_pct = EXCLUDED.vocab_track_pct,
        grammar_track_pct = EXCLUDED.grammar_track_pct,
        kanji_track_pct = EXCLUDED.kanji_track_pct,
        advanced_drills_unlocked_at = CASE
          WHEN EXCLUDED.vocab_track_pct >= 80 AND EXCLUDED.grammar_track_pct >= 80 AND EXCLUDED.kanji_track_pct >= 80
            THEN COALESCE(user_song_progress.advanced_drills_unlocked_at, NOW())
          ELSE NULL
        END
    `);

    console.log(`  ${t.user_id} / ${t.song_version_id} → vocab=${vocabPct} grammar=${grammarPct} kanji=${kanjiPct}`);
  }

  console.log("Done.");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
