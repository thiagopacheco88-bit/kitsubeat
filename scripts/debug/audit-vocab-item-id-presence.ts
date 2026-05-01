import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) process.exit(1);
  const sql = neon(url);

  // Use proper JSONB aggregation — not LIKE-on-text — to find vocab entries
  // that actually carry a vocab_item_id field with a non-null value.
  const totals = await sql`
    SELECT
      COUNT(*) FILTER (WHERE sv.lesson IS NOT NULL) AS lessons_total,
      COUNT(*) FILTER (
        WHERE sv.lesson IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(sv.lesson->'vocabulary') v
            WHERE v ? 'vocab_item_id' AND v->>'vocab_item_id' IS NOT NULL
          )
      ) AS lessons_with_any_vocab_item_id
    FROM song_versions sv
  `;
  console.log("Aggregate:", JSON.stringify(totals, null, 2));

  // For lessons that DO have vocab_item_id on at least one entry: find ones
  // that reference our cat vocab id specifically.
  const VOCAB_ID = "37ddda3a-453d-424c-a7f7-0223b3f16fd2";
  const songsWithCat = await sql`
    SELECT s.slug, s.title, s.artist, sv.version_type
    FROM song_versions sv
    JOIN songs s ON s.id = sv.song_id
    WHERE EXISTS (
      SELECT 1
      FROM jsonb_array_elements(sv.lesson->'vocabulary') v
      WHERE v->>'vocab_item_id' = ${VOCAB_ID}
    )
    LIMIT 10
  `;
  console.log(`Songs with cat (${VOCAB_ID}) referenced via vocab_item_id:`, JSON.stringify(songsWithCat, null, 2));

  // If no cat: find ANY song with a vocab that has both vocab_item_id AND a
  // populated image_url — these are immediately testable in dev.
  const usable = await sql`
    SELECT s.slug, s.title, vi.dictionary_form, vi.reading, vi.image_url
    FROM song_versions sv
    JOIN songs s ON s.id = sv.song_id
    CROSS JOIN LATERAL jsonb_array_elements(sv.lesson->'vocabulary') v
    JOIN vocabulary_items vi ON vi.id = (v->>'vocab_item_id')::uuid
    WHERE vi.image_url IS NOT NULL
    LIMIT 10
  `;
  console.log(`Songs whose lessons reference vocab with non-null image_url:`, JSON.stringify(usable, null, 2));
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
