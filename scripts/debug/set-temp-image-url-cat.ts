import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const TEST_URL =
  "https://images.unsplash.com/photo-1502740479091-635887520276?w=400";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const sql = neon(url);

  const matches = await sql`
    SELECT id, dictionary_form, reading, image_url
    FROM vocabulary_items
    WHERE dictionary_form = ${"猫"}
    ORDER BY id
  `;
  console.log(
    `Found ${matches.length} row(s) with dictionary_form='猫':`,
    JSON.stringify(matches, null, 2)
  );

  if (matches.length === 0) {
    console.error("FAIL: no '猫' row in vocabulary_items — pick another vocab.");
    process.exit(2);
  }

  const target = matches[0];
  await sql`
    UPDATE vocabulary_items
    SET image_url = ${TEST_URL}
    WHERE id = ${target.id}
  `;

  const after = await sql`
    SELECT id, dictionary_form, reading, image_url
    FROM vocabulary_items
    WHERE id = ${target.id}
  `;
  console.log("Updated row:", JSON.stringify(after, null, 2));

  const songs = await sql`
    SELECT DISTINCT s.slug, s.title_romaji, s.title_jp
    FROM song_versions sv
    JOIN songs s ON s.id = sv.song_id
    WHERE sv.lesson::text LIKE ${"%" + target.id + "%"}
    LIMIT 10
  `;
  console.log(
    `Songs whose lesson references vocab_item_id=${target.id}:`,
    JSON.stringify(songs, null, 2)
  );

  console.log("OK — Tap LearnCard for '猫' on any listed song to verify.");
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
