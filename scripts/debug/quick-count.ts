import { config } from "dotenv";
config({ path: ".env.local" });
import { getDb } from "../../src/lib/db/index.js";
import { sql } from "drizzle-orm";
const db = getDb();
const r = await db.execute(sql`
  SELECT
    jsonb_array_length(sv.lesson->'vocabulary') as vocab_count,
    (SELECT COUNT(*) FROM jsonb_array_elements(sv.lesson->'vocabulary') v
     WHERE v->>'vocab_item_id' IS NOT NULL AND v->>'vocab_item_id' != 'null') as with_id
  FROM song_versions sv JOIN songs s ON s.id = sv.song_id
  WHERE s.slug = 'the-1-muque' AND sv.pipeline_status = 'idle'
`);
console.log(r.rows[0]);
