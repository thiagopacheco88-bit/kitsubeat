/**
 * Reproduce the TypeError in recordVocabAnswer for Heart of Sword.
 * songVersionId: d1b79195-369a-435b-9e3d-5b728cb35add
 * vocabItemId for 遠い: 04fb50f2-... (partial, need full)
 */
import { db } from "@/lib/db/index.js";
import { sql } from "drizzle-orm";

const SONG_VERSION_ID = "d1b79195-369a-435b-9e3d-5b728cb35add";
const TEST_USER_ID = "test-user-repro";

async function main() {
  // Get one vocab item from Heart of Sword
  const vocabRows = await db.execute(sql`
    SELECT elem->>'vocab_item_id' as vid, elem->>'surface' as surface
    FROM song_versions sv
    CROSS JOIN LATERAL jsonb_array_elements(sv.lesson->'vocabulary') AS elem
    WHERE sv.id = ${SONG_VERSION_ID}::uuid
      AND elem->>'vocab_item_id' IS NOT NULL
    LIMIT 1
  `);
  const vocabItemId = (vocabRows.rows[0] as any)?.vid;
  console.log("Testing with vocabItemId:", vocabItemId, "surface:", (vocabRows.rows[0] as any)?.surface);

  // Test 1: Pre-fetch mastery row (same as recordVocabAnswer)
  console.log("\n1. Testing existingRows query...");
  try {
    const existingRows = await db.execute(sql`
      SELECT * FROM user_vocab_mastery
      WHERE user_id = ${TEST_USER_ID}
        AND vocab_item_id = ${vocabItemId}::uuid
        AND card_kind = 'romaji_meaning'
      LIMIT 1
    `);
    console.log("   OK - existingRows:", (existingRows as any).rows?.length ?? 0);
  } catch (e: any) {
    console.error("   FAIL:", e.message);
  }

  // Test 2: Track pct CTE (the big one)
  console.log("\n2. Testing track pct CTE...");
  try {
    const res = await db.execute(sql`
      WITH song_vocab_items AS (
        SELECT
          (elem->>'vocab_item_id')::uuid AS vocab_item_id,
          (elem->>'surface')::text AS surface
        FROM song_versions sv,
          jsonb_array_elements(sv.lesson->'vocabulary') AS elem
        WHERE sv.id = ${SONG_VERSION_ID}::uuid
          AND elem->>'vocab_item_id' IS NOT NULL
      )
      SELECT COUNT(*) as total FROM song_vocab_items
    `);
    console.log("   OK - vocab count:", (res as any).rows?.[0]?.total);
  } catch (e: any) {
    console.error("   FAIL:", e.message);
  }

  // Test 3: Verse domination query (the most complex one)
  console.log("\n3. Testing verse domination query...");
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
      )
      SELECT COUNT(*) as count FROM this_verse
    `);
    console.log("   OK - this_verse count:", (res as any).rows?.[0]?.count);
  } catch (e: any) {
    console.error("   FAIL:", e.message);
  }

  // Test 4: The full verse_vocab CTE with JOIN to vocabulary_items
  console.log("\n4. Testing verse_vocab JOIN query...");
  try {
    const res = await db.execute(sql`
      WITH verse_vocab AS (
        SELECT DISTINCT
          (tok->>'vocab_item_id')::uuid AS vocab_item_id,
          vi.surface,
          (verse_elem->>'verse_number')::int AS verse_number
        FROM song_versions sv,
          jsonb_array_elements(sv.lesson->'verses') AS verse_elem,
          jsonb_array_elements(verse_elem->'tokens') AS tok
          JOIN vocabulary_items vi ON vi.id = (tok->>'vocab_item_id')::uuid
        WHERE sv.id = ${SONG_VERSION_ID}::uuid
          AND tok->>'type' = 'vocab'
          AND (verse_elem->>'verse_number')::int IN (1, 2, 3)
      )
      SELECT COUNT(*) as count FROM verse_vocab
    `);
    console.log("   OK - verse_vocab count:", (res as any).rows?.[0]?.count);
  } catch (e: any) {
    console.error("   FAIL:", e.message);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error("UNCAUGHT:", e); process.exit(1); });
