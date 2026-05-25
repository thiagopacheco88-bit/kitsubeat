import { resolve, join } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { Client } from "@neondatabase/serverless";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: join(resolve(__dirname, ".."), ".env.local") });

const client = new Client(process.env.DATABASE_URL!);
await client.connect();

const { rows: totals } = await client.query(`
  SELECT
    count(*) AS total,
    count(*) FILTER (WHERE e->>'reading' IS NULL)               AS reading_null,
    count(*) FILTER (WHERE e->>'reading' = '')                  AS reading_empty,
    count(*) FILTER (WHERE e->>'reading' = e->>'surface')       AS reading_eq_surface,
    count(*) FILTER (WHERE e->>'reading' IS NOT NULL
                       AND e->>'reading' <> ''
                       AND e->>'reading' <> e->>'surface')      AS reading_distinct
  FROM song_versions sv,
       jsonb_array_elements(sv.lesson->'vocabulary') AS e
`);
console.log("\nVocab reading coverage across ALL song_versions:");
console.table(totals);

const { rows: sample } = await client.query(`
  SELECT s.slug, sv.version_type,
         e->>'surface' AS surface,
         e->>'reading' AS reading
  FROM songs s
  JOIN song_versions sv ON sv.song_id = s.id,
       jsonb_array_elements(sv.lesson->'vocabulary') AS e
  WHERE e->>'reading' = e->>'surface'
    AND e->>'surface' ~ '[\\u4E00-\\u9FFF]'
  LIMIT 10
`);
console.log("\nSample: kanji-containing vocab where reading == surface (these won't show a reading hint):");
console.table(sample);

await client.end();
