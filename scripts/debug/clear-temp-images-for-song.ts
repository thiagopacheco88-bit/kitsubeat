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
  console.log(`Targeting ${ids.length} vocab in '${SLUG}'.`);

  const before = await sql`
    SELECT COUNT(*) AS n
    FROM vocabulary_items
    WHERE id = ANY(${ids}::uuid[]) AND image_url = ${TEST_URL}
  `;
  console.log(`Rows still on test URL: ${before[0].n}.`);

  await sql`
    UPDATE vocabulary_items
    SET image_url = NULL
    WHERE id = ANY(${ids}::uuid[])
      AND image_url = ${TEST_URL}
  `;

  const after = await sql`
    SELECT COUNT(*) AS n
    FROM vocabulary_items
    WHERE id = ANY(${ids}::uuid[]) AND image_url IS NULL
  `;
  console.log(`Rows now NULL: ${after[0].n} of ${ids.length}.`);
  console.log("OK — test image URLs cleared. Curate gate (WHERE image_url IS NULL) will pick these up.");
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
