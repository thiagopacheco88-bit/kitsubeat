import { resolve, join } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { Client } from "@neondatabase/serverless";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: join(resolve(__dirname, ".."), ".env.local") });

const slug = process.argv[2] ?? "again-yui";
const client = new Client(process.env.DATABASE_URL!);
await client.connect();

const { rows } = await client.query(
  `SELECT s.slug, sv.version_type,
          jsonb_array_length(sv.lesson->'vocabulary') AS vocab_total,
          (SELECT count(*) FROM jsonb_array_elements(sv.lesson->'vocabulary') e
             WHERE e->>'vocab_item_id' IS NOT NULL) AS with_uuid
     FROM songs s
     JOIN song_versions sv ON sv.song_id = s.id
    WHERE s.slug = $1`,
  [slug]
);
console.table(rows);

const { rows: agg } = await client.query(
  `SELECT count(*) AS versions_total,
          count(*) FILTER (WHERE vocab_has_uuid > 0) AS versions_patched
     FROM (
       SELECT sv.id,
              (SELECT count(*) FROM jsonb_array_elements(sv.lesson->'vocabulary') e
                 WHERE e->>'vocab_item_id' IS NOT NULL) AS vocab_has_uuid
         FROM song_versions sv
        WHERE sv.lesson IS NOT NULL
     ) q`
);
console.log("Global:", agg[0]);

await client.end();
