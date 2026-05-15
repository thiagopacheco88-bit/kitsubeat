/**
 * fix-stale-grammar-pct.ts — find and reset stale grammar_track_pct = 100
 * rows written by the old auto-pass bug.
 *
 * The bug: grammar_track_pct was set to 100 automatically when the grammar
 * exercise set was empty (song_version_grammar_rules had no rows yet). Once
 * exercises were later generated, the stale 100 remained, making the song
 * card ring show inflated progress versus the lobby's corrected 0%.
 *
 * Detection: grammar_track_pct >= 100 AND (
 *   no grammar_conjugation entries in user_exercise_log  [user never did it]
 *   OR no rows in song_version_grammar_rules              [exercises never existed]
 * )
 *
 * Usage (dry-run — shows affected rows):
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/debug/fix-stale-grammar-pct.ts
 *
 * Usage (apply reset):
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/debug/fix-stale-grammar-pct.ts --apply
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import { sql } from "drizzle-orm";

const apply = process.argv.includes("--apply");

async function main() {
  const db = getDb();

  // Audit: show all affected rows
  const affected = await db.execute(sql`
    SELECT
      s.title,
      s.slug,
      sv.version_type,
      usp.user_id,
      usp.grammar_track_pct::numeric as grammar_track_pct,
      usp.vocab_track_pct::numeric   as vocab_track_pct,
      usp.kanji_track_pct::numeric   as kanji_track_pct,
      CASE
        WHEN NOT EXISTS (
          SELECT 1 FROM user_exercise_log uel
          WHERE uel.user_id = usp.user_id
            AND uel.song_version_id = usp.song_version_id
            AND uel.exercise_type = 'grammar_conjugation'
        ) THEN 'no_log_entries'
        ELSE 'no_grammar_rules'
      END AS stale_reason
    FROM user_song_progress usp
    JOIN song_versions sv ON sv.id = usp.song_version_id
    JOIN songs s ON s.id = sv.song_id
    WHERE usp.grammar_track_pct >= 100
      AND (
        NOT EXISTS (
          SELECT 1 FROM user_exercise_log uel
          WHERE uel.user_id = usp.user_id
            AND uel.song_version_id = usp.song_version_id
            AND uel.exercise_type = 'grammar_conjugation'
        )
        OR NOT EXISTS (
          SELECT 1 FROM song_version_grammar_rules svgr
          WHERE svgr.song_version_id = usp.song_version_id
        )
      )
    ORDER BY s.title, usp.user_id
  `);

  const rows = affected.rows as Array<{
    title: string;
    slug: string;
    version_type: string;
    user_id: string;
    grammar_track_pct: string;
    vocab_track_pct: string;
    kanji_track_pct: string;
    stale_reason: string;
  }>;

  if (rows.length === 0) {
    console.log("No stale grammar_track_pct rows found. All clean.");
    process.exit(0);
  }

  console.log(`Found ${rows.length} stale row(s):\n`);
  for (const r of rows) {
    console.log(
      `  ${r.title} (${r.slug}) [${r.version_type}] user=${r.user_id.slice(0, 8)}…` +
      `  vocab=${r.vocab_track_pct}% grammar=${r.grammar_track_pct}% kanji=${r.kanji_track_pct}%` +
      `  reason=${r.stale_reason}`
    );
  }

  if (!apply) {
    console.log("\nDry-run. Pass --apply to reset grammar_track_pct to 0.");
    process.exit(0);
  }

  // Apply: reset grammar_track_pct to 0 for all stale rows
  const result = await db.execute(sql`
    UPDATE user_song_progress usp
    SET
      grammar_track_pct = 0,
      updated_at = NOW()
    WHERE usp.grammar_track_pct >= 100
      AND (
        NOT EXISTS (
          SELECT 1 FROM user_exercise_log uel
          WHERE uel.user_id = usp.user_id
            AND uel.song_version_id = usp.song_version_id
            AND uel.exercise_type = 'grammar_conjugation'
        )
        OR NOT EXISTS (
          SELECT 1 FROM song_version_grammar_rules svgr
          WHERE svgr.song_version_id = usp.song_version_id
        )
      )
  `);

  console.log(`\nReset ${result.rowCount} row(s). Done.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
