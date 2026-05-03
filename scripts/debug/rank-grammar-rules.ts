/**
 * Rank grammar rules by song-version frequency to identify the catalog head.
 *
 * Outputs the top N rules + a histogram of song count per rule, so we can
 * decide where the long tail begins (i.e., how few songs reference each
 * remaining rule once we strip the head).
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/debug/rank-grammar-rules.ts [N=200]
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

const N = Number(process.argv[2] ?? 200);

async function main() {
  const db = getDb();

  const rankRes = await db.execute(sql`
    SELECT
      gr.id,
      gr.name,
      gr.jlpt_reference,
      COUNT(svgr.song_version_id)::int AS song_count
    FROM grammar_rules gr
    LEFT JOIN song_version_grammar_rules svgr ON svgr.grammar_rule_id = gr.id
    GROUP BY gr.id, gr.name, gr.jlpt_reference
    ORDER BY song_count DESC, gr.name ASC
  `);
  const rows = (rankRes.rows ?? rankRes) as Array<{
    id: string;
    name: string;
    jlpt_reference: string;
    song_count: number;
  }>;

  console.log(`\nTotal grammar_rules rows: ${rows.length}`);

  // Histogram bucket: how many rules appear in 1, 2, 3, ... songs
  const histogram = new Map<number, number>();
  for (const r of rows) {
    histogram.set(r.song_count, (histogram.get(r.song_count) ?? 0) + 1);
  }
  console.log("\nDistribution of song-counts per rule:");
  console.log("  songs_per_rule | rule_count | cumulative_songs_covered");
  let cumulativeSongs = 0;
  let cumulativeRules = 0;
  const sortedBuckets = [...histogram.entries()].sort((a, b) => b[0] - a[0]);
  for (const [songCount, ruleCount] of sortedBuckets) {
    cumulativeSongs += songCount * ruleCount;
    cumulativeRules += ruleCount;
    console.log(
      `  ${String(songCount).padStart(14)} | ${String(ruleCount).padStart(10)} | ${String(cumulativeSongs).padStart(10)}  (top ${cumulativeRules} rules)`,
    );
  }

  // Coverage @ N: what % of the 1486 song-rule links are covered by top-N rules
  const linksTotal = rows.reduce((s, r) => s + r.song_count, 0);
  const topN = rows.slice(0, N);
  const linksCovered = topN.reduce((s, r) => s + r.song_count, 0);
  const pct = linksTotal === 0 ? 0 : (100 * linksCovered) / linksTotal;
  console.log(
    `\nTop ${N} rules cover ${linksCovered} / ${linksTotal} song-rule links (${pct.toFixed(1)}%).`,
  );

  console.log(`\nTop 30 rules by song frequency:`);
  for (const r of rows.slice(0, 30)) {
    console.log(
      `  ${String(r.song_count).padStart(4)}x  ${r.jlpt_reference.padEnd(8)}  ${r.name}`,
    );
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
