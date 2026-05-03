/**
 * Inspect lesson.grammar_points and song_version_grammar_rules for heart-of-sword.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  const slug = "heart-of-sword-t-m-revolution";

  const result = await db.execute<{
    id: string;
    grammar_points: unknown;
    rule_count: number;
  }>(sql`
    SELECT
      sv.id,
      sv.lesson->'grammar_points' AS grammar_points,
      (SELECT COUNT(*)::int FROM song_version_grammar_rules WHERE song_version_id = sv.id) AS rule_count
    FROM song_versions sv
    JOIN songs s ON s.id = sv.song_id
    WHERE s.slug = ${slug}
  `);
  const rows = Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows ?? [];
  console.log(JSON.stringify(rows, null, 2));
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
