/**
 * Find probable-duplicate grammar rules — same underlying pattern with
 * different names due to lesson-generation drift. Two heuristics:
 *   1. Same kana pattern at the start of the name (rules that begin with
 *      a Japanese particle/auxiliary like 〜ば, 〜のに, 〜ても).
 *   2. Same JLPT reference + first 4 chars of the name match another rule.
 *
 * This is a quick survey, not a clustering algorithm. The catalog rewrite
 * job will need a more rigorous LLM-based dedupe pass.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/debug/find-duplicate-grammar-rules.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

async function main() {
  const db = getDb();

  // Pull all rules + their song-link counts.
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

  // Group by JLPT + first kana cluster (anything before the first space or paren).
  const buckets = new Map<string, typeof rules>();
  for (const r of rules) {
    // Strip leading 〜 and take everything up to first space/paren as the key
    const head = r.name.replace(/^〜/, "").split(/[\s(（]/)[0].slice(0, 6);
    const key = `${r.jlpt_reference}::${head}`;
    const arr = buckets.get(key) ?? [];
    arr.push(r);
    buckets.set(key, arr);
  }

  // Find clusters of size ≥2 — these are likely duplicates.
  const clusters = [...buckets.entries()]
    .filter(([, arr]) => arr.length >= 2)
    .sort((a, b) => b[1].length - a[1].length);

  let totalDuplicateRules = 0;
  let totalSongsAffected = 0;
  for (const [key, arr] of clusters.slice(0, 30)) {
    console.log(`\n[${key}]  ${arr.length} possible variants:`);
    for (const r of arr) {
      console.log(`  - ${r.song_count}x  ${r.name}`);
      totalDuplicateRules++;
      totalSongsAffected += r.song_count;
    }
  }

  if (clusters.length > 30) {
    console.log(`\n... and ${clusters.length - 30} more clusters`);
  }

  console.log(`\n--- summary ---`);
  console.log(`total rules: ${rules.length}`);
  console.log(`clusters with ≥2 variants: ${clusters.length}`);
  console.log(`rules in clusters (head30 sample): ${totalDuplicateRules}`);
  const totalRulesInClusters = clusters.reduce((s, [, arr]) => s + arr.length, 0);
  console.log(`rules in clusters (all): ${totalRulesInClusters}`);
  const canonicalEstimate = clusters.length + (rules.length - totalRulesInClusters);
  console.log(`estimated canonical rule count after dedupe: ~${canonicalEstimate}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
