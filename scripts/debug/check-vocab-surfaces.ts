import { config } from "dotenv";
config({ path: ".env.local" });
import { getDb } from "../../src/lib/db/index.js";
import { sql } from "drizzle-orm";
const db = getDb();
const r = await db.execute(sql`
  SELECT
    v->>'surface' as surface,
    v->>'reading' as reading,
    v->>'vocab_item_id' as vocab_item_id
  FROM song_versions sv JOIN songs s ON s.id = sv.song_id,
  jsonb_array_elements(sv.lesson->'vocabulary') v
  WHERE s.slug = 'the-1-muque' AND sv.pipeline_status = 'idle'
  LIMIT 5
`);
console.log(r.rows);
