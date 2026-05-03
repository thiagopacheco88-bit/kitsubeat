/**
 * Delete grammar_exercises rows for all rules linked to a song version. Used
 * during testing when re-authoring the seed JSON and the dedup-on-prompt
 * skip needs to be bypassed cleanly.
 *
 * Also wipes user_grammar_exercise_log entries that reference deleted
 * exercises (FK CASCADE in schema would handle this, but explicit is safer).
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/debug/delete-grammar-exercises-for-song.ts <slug>
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

const slug = process.argv[2];
if (!slug) { console.error("Usage: tsx ... <slug>"); process.exit(1); }

async function main() {
  const db = getDb();

  const ruleRes = await db.execute(sql`
    SELECT DISTINCT svgr.grammar_rule_id AS id
    FROM songs s
    JOIN song_versions sv ON sv.song_id = s.id
    JOIN song_version_grammar_rules svgr ON svgr.song_version_id = sv.id
    WHERE s.slug = ${slug}
  `);
  const rules = (ruleRes.rows ?? ruleRes) as Array<{ id: string }>;
  if (rules.length === 0) { console.log(`no rules linked to ${slug}`); return; }

  const idList = rules.map((r) => `'${r.id}'::uuid`).join(",");

  const exRes = await db.execute(sql.raw(`
    SELECT COUNT(*)::int AS n FROM grammar_exercises
    WHERE grammar_rule_id IN (${idList})
  `));
  const before = ((exRes.rows ?? exRes) as Array<{ n: number }>)[0].n;

  await db.execute(sql.raw(`
    DELETE FROM user_grammar_exercise_log
    WHERE grammar_exercise_id IN (
      SELECT id FROM grammar_exercises WHERE grammar_rule_id IN (${idList})
    )
  `));
  await db.execute(sql.raw(`
    DELETE FROM grammar_exercises WHERE grammar_rule_id IN (${idList})
  `));

  console.log(`deleted ${before} grammar_exercises rows for ${slug} (${rules.length} rules)`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
