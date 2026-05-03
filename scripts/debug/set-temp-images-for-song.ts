import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const SLUG = "hitotsu-yane-no-shita-uno-sachiko";
const TEST_URL =
  "https://images.unsplash.com/photo-1502740479091-635887520276?w=400";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) process.exit(1);
  const sql = neon(url);

  // Pull every vocab_item_id present in the song's lesson(s) (any version).
  const vocabRefs = await sql`
    SELECT DISTINCT (v->>'vocab_item_id')::uuid AS vocab_item_id
    FROM song_versions sv
    JOIN songs s ON s.id = sv.song_id
    CROSS JOIN LATERAL jsonb_array_elements(sv.lesson->'vocabulary') v
    WHERE s.slug = ${SLUG}
      AND v ? 'vocab_item_id'
      AND v->>'vocab_item_id' IS NOT NULL
  `;
  const ids = vocabRefs.map((r) => r.vocab_item_id as string);
  console.log(`Found ${ids.length} unique vocab_item_ids in '${SLUG}' lesson.`);

  if (ids.length === 0) {
    console.error("No vocab refs found — backfill may not have run.");
    process.exit(2);
  }

  const beforeCount = await sql`
    SELECT COUNT(*) AS n
    FROM vocabulary_items
    WHERE id = ANY(${ids}::uuid[]) AND image_url IS NOT NULL
  `;
  console.log(`Before update: ${beforeCount[0].n} of ${ids.length} have image_url already set.`);

  const result = await sql`
    UPDATE vocabulary_items
    SET image_url = ${TEST_URL}
    WHERE id = ANY(${ids}::uuid[])
  `;
  console.log("Update done.");

  const afterCount = await sql`
    SELECT COUNT(*) AS n
    FROM vocabulary_items
    WHERE id = ANY(${ids}::uuid[]) AND image_url = ${TEST_URL}
  `;
  console.log(`After update: ${afterCount[0].n} of ${ids.length} now have the test image_url.`);

  // Sample 5 rows for sanity check.
  const sample = await sql`
    SELECT dictionary_form, reading, image_url
    FROM vocabulary_items
    WHERE id = ANY(${ids}::uuid[])
    ORDER BY dictionary_form
    LIMIT 5
  `;
  console.log("Sample rows:", JSON.stringify(sample, null, 2));

  console.log(`\n--- CLEANUP SQL (paste to undo) ---`);
  console.log(
    `UPDATE vocabulary_items SET image_url = NULL WHERE id = ANY(ARRAY[${ids
      .map((id) => `'${id}'`)
      .join(",")}]::uuid[]);`
  );
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
