/**
 * Dump grammar rules linked to a given song slug, with full explanations.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/debug/dump-rules-for-song.ts <slug>
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

const slug = process.argv[2];
if (!slug) { console.error("Usage: tsx ... <slug>"); process.exit(1); }

async function main() {
  const db = getDb();
  const res = await db.execute(sql`
    SELECT
      gr.id,
      gr.name,
      gr.jlpt_reference,
      gr.explanation
    FROM songs s
    JOIN song_versions sv ON sv.song_id = s.id
    JOIN song_version_grammar_rules svgr ON svgr.song_version_id = sv.id
    JOIN grammar_rules gr ON gr.id = svgr.grammar_rule_id
    WHERE s.slug = ${slug}
    ORDER BY svgr.display_order
  `);
  const rows = (res.rows ?? res) as Array<{
    id: string; name: string; jlpt_reference: string; explanation: { en?: string };
  }>;
  console.log(JSON.stringify(rows, null, 2));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
