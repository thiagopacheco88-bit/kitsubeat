/**
 * Dump top-N grammar rules by song frequency, with their full explanations,
 * for inline authoring of v2 rewrites.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

const N = Number(process.argv[2] ?? 50);
const SKIP_V2 = process.argv.includes("--skip-v2");

async function main() {
  const db = getDb();
  const filter = SKIP_V2
    ? sql`WHERE explanation->>'en' NOT LIKE '%<!-- v2-romaji-primary -->%'`
    : sql``;
  const res = await db.execute(sql`
    SELECT
      gr.id, gr.name, gr.jlpt_reference, gr.explanation,
      COUNT(svgr.song_version_id)::int AS song_count
    FROM grammar_rules gr
    LEFT JOIN song_version_grammar_rules svgr ON svgr.grammar_rule_id = gr.id
    ${filter}
    GROUP BY gr.id, gr.name, gr.jlpt_reference, gr.explanation
    ORDER BY song_count DESC, gr.name ASC
    LIMIT ${N}
  `);
  const rows = (res.rows ?? res) as Array<{
    id: string; name: string; jlpt_reference: string;
    explanation: { en: string }; song_count: number;
  }>;

  writeFileSync("_temp/top-rules-with-explanations.json", JSON.stringify(rows, null, 2));
  console.log(`dumped ${rows.length} rules (skip-v2: ${SKIP_V2})`);
  for (const r of rows) {
    console.log(`  ${String(r.song_count).padStart(3)}x  [${r.jlpt_reference}]  ${r.name}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
