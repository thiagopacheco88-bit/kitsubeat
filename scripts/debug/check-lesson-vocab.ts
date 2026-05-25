import { config } from "dotenv";
config({ path: ".env.local" });
import { getDb } from "../../src/lib/db/index.js";
import { sql } from "drizzle-orm";

const slug = process.argv[2] ?? "the-1-muque";

async function main() {
  const db = getDb();

  const rows = await db.execute(sql`
    SELECT
      sv.version_type,
      sv.pipeline_status,
      s.quality_status,
      jsonb_array_length(sv.lesson->'vocabulary') as vocab_count,
      jsonb_array_length(sv.lesson->'verses') as verse_count,
      (
        SELECT COUNT(*) FROM jsonb_array_elements(sv.lesson->'vocabulary') v
        WHERE v->>'vocab_item_id' IS NOT NULL AND v->>'vocab_item_id' != 'null'
      ) as vocab_with_id,
      (
        SELECT COUNT(*) FROM jsonb_array_elements(sv.lesson->'vocabulary') v
        WHERE v->>'vocab_item_id' IS NULL OR v->>'vocab_item_id' = 'null'
      ) as vocab_missing_id
    FROM song_versions sv
    JOIN songs s ON s.id = sv.song_id
    WHERE s.slug = ${slug}
  `);

  console.log(`\nLesson stats for: ${slug}\n`);
  for (const r of rows.rows as Record<string, unknown>[]) {
    console.log(
      `  [${r.version_type}] status=${r.pipeline_status}/${r.quality_status}` +
      `  vocab=${r.vocab_count} (with_id=${r.vocab_with_id}, missing_id=${r.vocab_missing_id})` +
      `  verses=${r.verse_count}`
    );
  }

  // Show all vocab entries with their ids
  const vocabRows = await db.execute(sql`
    SELECT
      sv.version_type,
      v->>'dictionary_form' as dict_form,
      v->>'reading' as reading,
      v->>'meaning' as meaning,
      v->>'vocab_item_id' as vocab_item_id
    FROM song_versions sv
    JOIN songs s ON s.id = sv.song_id,
    jsonb_array_elements(sv.lesson->'vocabulary') v
    WHERE s.slug = ${slug}
      AND sv.pipeline_status = 'idle'
    ORDER BY sv.version_type
  `);

  console.log(`\nAll vocab entries for ${slug} (idle version):\n`);
  let i = 1;
  for (const r of vocabRows.rows as Record<string, unknown>[]) {
    const hasId = r.vocab_item_id && r.vocab_item_id !== 'null';
    console.log(
      `  ${i++}. ${r.dict_form} (${r.reading}) — ${r.meaning} — id=${hasId ? '✓' : '✗ MISSING'}`
    );
  }
}

main().catch(console.error);
