/**
 * Dump all grammar_rules with id, name, jlpt, and song_count to a JSON file.
 * Input for the inline-Claude consolidation pass.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/debug/dump-all-grammar-rules.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

async function main() {
  const db = getDb();
  const res = await db.execute(sql`
    SELECT
      gr.id,
      gr.name,
      gr.jlpt_reference,
      COUNT(svgr.song_version_id)::int AS song_count
    FROM grammar_rules gr
    LEFT JOIN song_version_grammar_rules svgr ON svgr.grammar_rule_id = gr.id
    GROUP BY gr.id, gr.name, gr.jlpt_reference
    ORDER BY gr.jlpt_reference ASC, gr.name ASC
  `);
  const rules = (res.rows ?? res) as Array<{
    id: string; name: string; jlpt_reference: string; song_count: number;
  }>;

  writeFileSync("_temp/all-grammar-rules.json", JSON.stringify(rules, null, 2));
  console.log(`dumped ${rules.length} rules to _temp/all-grammar-rules.json`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
