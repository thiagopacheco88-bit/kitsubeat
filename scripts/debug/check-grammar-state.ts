/**
 * Check the state of the Phase-13 grammar pipeline for a given song slug:
 *   1. Are there song_version_grammar_rules rows? (i.e., has 12-backfill been run?)
 *   2. Are there grammar_exercises rows for those rules?
 *   3. What levels are populated?
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/debug/check-grammar-state.ts heart-of-sword-t-m-revolution
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: tsx scripts/debug/check-grammar-state.ts <song-slug>");
  process.exit(1);
}

async function main() {
  const db = getDb();

  const versions = await db.execute(sql`
    SELECT sv.id AS song_version_id, s.slug
    FROM song_versions sv
    JOIN songs s ON s.id = sv.song_id
    WHERE s.slug = ${slug}
  `);
  const rows = (versions.rows ?? versions) as Array<{ song_version_id: string; slug: string }>;
  if (rows.length === 0) {
    console.log(`No song_versions row for slug=${slug}`);
    return;
  }

  for (const v of rows) {
    console.log(`\n=== ${slug} → song_version_id=${v.song_version_id} ===`);

    const rulesRes = await db.execute(sql`
      SELECT gr.id, gr.name, gr.jlpt_reference
      FROM song_version_grammar_rules svgr
      JOIN grammar_rules gr ON gr.id = svgr.grammar_rule_id
      WHERE svgr.song_version_id = ${v.song_version_id}::uuid
      ORDER BY svgr.display_order
    `);
    const rules = (rulesRes.rows ?? rulesRes) as Array<{ id: string; name: string; jlpt_reference: string }>;
    console.log(`song_version_grammar_rules: ${rules.length} rule(s) linked`);
    for (const r of rules) {
      console.log(`  - ${r.id} :: ${r.jlpt_reference} :: ${r.name}`);
    }

    if (rules.length === 0) {
      console.log(`>> Run: npx tsx --tsconfig tsconfig.scripts.json scripts/seed/12-backfill-grammar-rules.ts`);
      continue;
    }

    const ruleIds = rules.map((r) => r.id);
    const idList = ruleIds.map((id) => `'${id}'::uuid`).join(",");
    const exRes = await db.execute(sql.raw(`
      SELECT grammar_rule_id, level, COUNT(*)::int AS n
      FROM grammar_exercises
      WHERE grammar_rule_id IN (${idList})
      GROUP BY grammar_rule_id, level
      ORDER BY grammar_rule_id, level
    `));
    const ex = (exRes.rows ?? exRes) as Array<{ grammar_rule_id: string; level: string; n: number }>;
    console.log(`grammar_exercises rows for these rules: ${ex.reduce((s, r) => s + Number(r.n), 0)} total`);
    if (ex.length === 0) {
      console.log(`>> No exercises in bank. Either:`);
      console.log(`     a. Hand-author exercises and run scripts/seed/seed-grammar-exercises-from-json.ts`);
      console.log(`     b. Let startGrammarSession's generateOneGrammarExercise fallback fire (uses Anthropic API).`);
    } else {
      for (const r of ex) {
        console.log(`  ${r.grammar_rule_id} :: ${r.level} :: ${r.n} exercise(s)`);
      }
    }
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
