/**
 * Dump the top-N grammar rules with full explanation, JLPT, and song frequency
 * — feeds the inline-Claude exercise generation workflow.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/debug/dump-top-rules.ts [N=5]
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

const N = Number(process.argv[2] ?? 5);

async function main() {
  const db = getDb();
  const res = await db.execute(sql`
    SELECT
      gr.id,
      gr.name,
      gr.jlpt_reference,
      gr.explanation,
      gr.canonical_conjugation_template,
      COUNT(svgr.song_version_id)::int AS song_count
    FROM grammar_rules gr
    LEFT JOIN song_version_grammar_rules svgr ON svgr.grammar_rule_id = gr.id
    GROUP BY gr.id, gr.name, gr.jlpt_reference, gr.explanation, gr.canonical_conjugation_template
    ORDER BY song_count DESC, gr.name ASC
    LIMIT ${N}
  `);
  const rows = (res.rows ?? res) as Array<{
    id: string;
    name: string;
    jlpt_reference: string;
    explanation: { en?: string } | string;
    canonical_conjugation_template: string | null;
    song_count: number;
  }>;
  console.log(JSON.stringify(rows, null, 2));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
