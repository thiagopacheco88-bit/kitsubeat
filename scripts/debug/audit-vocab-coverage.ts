/**
 * audit-vocab-coverage.ts — find songs where vocab items << lyric tokens
 * Usage: npx tsx --tsconfig tsconfig.scripts.json scripts/debug/audit-vocab-coverage.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { getDb } from "../../src/lib/db/index.js";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();

  const rows = await db.execute(sql`
    SELECT
      s.slug,
      s.title,
      sv.version_type,
      jsonb_array_length(sv.lesson->'vocabulary') as vocab_count,
      (
        SELECT COUNT(DISTINCT t->>'surface')
        FROM jsonb_array_elements(sv.lesson->'verses') verse,
        jsonb_array_elements(verse->'tokens') t
        WHERE t->>'surface' IS NOT NULL AND t->>'surface' != ''
          AND t->>'grammar' NOT IN ('particle', 'auxiliary', 'expression')
      ) as content_token_count
    FROM song_versions sv
    JOIN songs s ON s.id = sv.song_id
    WHERE sv.pipeline_status = 'idle'
      AND s.quality_status = 'active'
      AND s.language = 'ja'
    ORDER BY
      (jsonb_array_length(sv.lesson->'vocabulary')::float /
       NULLIF((
         SELECT COUNT(DISTINCT t->>'surface')
         FROM jsonb_array_elements(sv.lesson->'verses') verse,
         jsonb_array_elements(verse->'tokens') t
         WHERE t->>'surface' IS NOT NULL AND t->>'surface' != ''
           AND t->>'grammar' NOT IN ('particle', 'auxiliary', 'expression')
       ), 0)
      ) ASC
  `);

  type Row = { slug: string; title: string; version_type: string; vocab_count: string; content_token_count: string };
  const data = rows.rows as Row[];

  console.log(`\nVocab coverage audit — ${data.length} active songs\n`);
  console.log(`${"slug".padEnd(45)} ${"vocab".padStart(5)} ${"tokens".padStart(6)} ${"cover".padStart(6)}`);
  console.log("─".repeat(65));

  let sparse = 0;
  for (const r of data) {
    const vocab = parseInt(r.vocab_count);
    const tokens = parseInt(r.content_token_count);
    const pct = tokens > 0 ? Math.round((vocab / tokens) * 100) : 100;
    const flag = pct < 50 ? " ◄ SPARSE" : "";
    if (pct < 50) sparse++;
    console.log(
      `${r.slug.padEnd(45)} ${String(vocab).padStart(5)} ${String(tokens).padStart(6)} ${String(pct + "%").padStart(6)}${flag}`
    );
  }

  console.log("─".repeat(65));
  console.log(`\nSparse songs (<50% coverage): ${sparse} / ${data.length}`);
}

main().catch(console.error);
