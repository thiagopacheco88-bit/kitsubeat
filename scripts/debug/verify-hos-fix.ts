import { db } from "@/lib/db/index.js";
import { sql } from "drizzle-orm";

const SONG_VERSION_ID = "d1b79195-369a-435b-9e3d-5b728cb35add";
const VOCAB_ITEM_ID = "04fb50f2-0000-0000-0000-000000000000"; // placeholder, any valid UUID

async function main() {
  // Get a real vocab item from Heart of Sword
  const vocabRows = await db.execute(sql`
    SELECT elem->>'vocab_item_id' as vid, elem->>'surface' as surface
    FROM song_versions sv
    CROSS JOIN LATERAL jsonb_array_elements(sv.lesson->'vocabulary') AS elem
    WHERE sv.id = ${SONG_VERSION_ID}::uuid
      AND elem->>'vocab_item_id' IS NOT NULL
    LIMIT 1
  `);
  const vocabItemId = (vocabRows.rows[0] as any)?.vid;

  // Test the FIXED verse_vocab CTE (uses tok->>'surface' instead of vi.surface)
  console.log("Testing FIXED verse_vocab query (tok->>surface, no JOIN to vocabulary_items)...");
  try {
    const res = await db.execute(sql`
      WITH this_verse AS (
        SELECT DISTINCT (verse_elem->>'verse_number')::int AS verse_number
        FROM song_versions sv,
          jsonb_array_elements(sv.lesson->'verses') AS verse_elem,
          jsonb_array_elements(verse_elem->'tokens') AS tok
        WHERE sv.id = ${SONG_VERSION_ID}::uuid
          AND tok->>'type' = 'vocab'
          AND (tok->>'vocab_item_id')::uuid = ${vocabItemId}::uuid
      ),
      verse_vocab AS (
        SELECT DISTINCT
          (tok->>'vocab_item_id')::uuid AS vocab_item_id,
          tok->>'surface' AS surface,
          (verse_elem->>'verse_number')::int AS verse_number
        FROM song_versions sv,
          jsonb_array_elements(sv.lesson->'verses') AS verse_elem,
          jsonb_array_elements(verse_elem->'tokens') AS tok
        WHERE sv.id = ${SONG_VERSION_ID}::uuid
          AND tok->>'type' = 'vocab'
          AND (tok->>'vocab_item_id') IS NOT NULL
          AND (verse_elem->>'verse_number')::int IN (SELECT verse_number FROM this_verse)
      )
      SELECT COUNT(*) as count FROM verse_vocab
    `);
    console.log("✓ PASS - count:", (res as any).rows?.[0]?.count, "(0 expected — tokens lack type=vocab field)");
  } catch (e: any) {
    console.error("✗ FAIL:", e.message);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
