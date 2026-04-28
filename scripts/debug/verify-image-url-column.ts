import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const sql = neon(url);

  const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'vocabulary_items' AND column_name = 'image_url'
  `;
  console.log("Column metadata:", JSON.stringify(cols, null, 2));

  if (cols.length === 0) {
    console.error("FAIL: image_url column does not exist on vocabulary_items");
    process.exit(2);
  }

  const probe = await sql`SELECT image_url FROM vocabulary_items LIMIT 1`;
  console.log("SELECT image_url succeeded. Sample row:", JSON.stringify(probe, null, 2));

  console.log("OK");
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
