/**
 * Debug: inspect what user_vocab_mastery and user_song_progress rows exist
 * for the heart-of-sword song across both userId namespaces.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  const songSlug = "heart-of-sword-t-m-revolution";

  const versions = await db.execute<{
    id: string;
    version_type: string;
    vocab_count: number;
  }>(sql`
    SELECT
      sv.id,
      sv.version_type,
      jsonb_array_length(sv.lesson->'vocabulary') AS vocab_count
    FROM song_versions sv
    JOIN songs s ON s.id = sv.song_id
    WHERE s.slug = ${songSlug}
  `);
  const rows = Array.isArray(versions) ? versions : (versions as { rows?: typeof versions }).rows ?? [];
  console.log(`Versions for ${songSlug}:`, rows);

  for (const v of rows) {
    console.log(`\n=== version ${v.version_type} (${v.id}) — ${v.vocab_count} vocab items ===`);

    const progress = await db.execute<{
      user_id: string;
      vocab_track_pct: string | null;
      grammar_track_pct: string | null;
      kanji_track_pct: string | null;
      completion_pct: number | null;
    }>(sql`
      SELECT user_id, vocab_track_pct, grammar_track_pct, kanji_track_pct, completion_pct
      FROM user_song_progress
      WHERE song_version_id = ${v.id}::uuid
    `);
    const progressRows = Array.isArray(progress) ? progress : (progress as { rows?: unknown[] }).rows ?? [];
    console.log(`  user_song_progress rows:`, progressRows);

    const mastery = await db.execute<{
      user_id: string;
      card_kind: string;
      cnt: number;
      avg_state: string | null;
    }>(sql`
      SELECT
        m.user_id,
        m.card_kind,
        COUNT(*)::int AS cnt,
        ROUND(AVG(m.state)::numeric, 2)::text AS avg_state
      FROM user_vocab_mastery m
      JOIN song_versions sv ON sv.id = ${v.id}::uuid
      WHERE m.vocab_item_id IN (
        SELECT (elem->>'vocab_item_id')::uuid
        FROM jsonb_array_elements(sv.lesson->'vocabulary') AS elem
        WHERE elem->>'vocab_item_id' IS NOT NULL
      )
      GROUP BY m.user_id, m.card_kind
      ORDER BY m.user_id, m.card_kind
    `);
    const masteryRows = Array.isArray(mastery) ? mastery : (mastery as { rows?: unknown[] }).rows ?? [];
    console.log(`  user_vocab_mastery rows for song's vocab:`, masteryRows);

    const stateBreakdown = await db.execute<{
      user_id: string;
      card_kind: string;
      state: number;
      cnt: number;
    }>(sql`
      SELECT m.user_id, m.card_kind, m.state, COUNT(*)::int AS cnt
      FROM user_vocab_mastery m
      JOIN song_versions sv ON sv.id = ${v.id}::uuid
      WHERE m.vocab_item_id IN (
        SELECT (elem->>'vocab_item_id')::uuid
        FROM jsonb_array_elements(sv.lesson->'vocabulary') AS elem
        WHERE elem->>'vocab_item_id' IS NOT NULL
      )
      GROUP BY m.user_id, m.card_kind, m.state
      ORDER BY m.user_id, m.card_kind, m.state
    `);
    const sbRows = Array.isArray(stateBreakdown) ? stateBreakdown : (stateBreakdown as { rows?: unknown[] }).rows ?? [];
    console.log(`  state breakdown:`, sbRows);
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
