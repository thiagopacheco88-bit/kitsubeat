import { config } from "dotenv";
config({ path: ".env.local" });
import { getDb } from "../../src/lib/db/index.js";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  const rows = await db.execute(sql`
    SELECT
      sv.lesson->'verses'->0 as first_verse,
      jsonb_array_length(sv.lesson->'verses') as verse_count
    FROM song_versions sv
    JOIN songs s ON s.id = sv.song_id
    WHERE s.slug = 'the-1-muque'
      AND sv.pipeline_status = 'idle'
  `);
  const r = rows.rows[0] as { first_verse: unknown; verse_count: number };
  console.log("verse_count:", r.verse_count);
  console.log("first_verse keys:", Object.keys(r.first_verse as Record<string, unknown>));
  console.log("first_verse:", JSON.stringify(r.first_verse, null, 2).slice(0, 800));
}
main().catch(console.error);
