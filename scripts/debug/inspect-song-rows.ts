import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import { sql } from "drizzle-orm";

const slugs = process.argv.slice(2);
if (!slugs.length) { console.log("usage: inspect-song-rows.ts slug [slug ...]"); process.exit(1); }

const db = getDb();
const slugList = sql.join(slugs.map((s) => sql`${s}`), sql`, `);
const raw = (await db.execute(sql`
  SELECT
    s.slug,
    s.id AS song_id,
    s.title AS song_title,
    s.artist AS song_artist,
    s.created_at AS song_created,
    sv.id AS version_id,
    sv.version_type,
    sv.youtube_id,
    sv.lyrics_offset_ms,
    (sv.synced_lrc IS NOT NULL) AS has_lrc,
    jsonb_array_length(COALESCE(sv.synced_lrc, '[]'::jsonb)) AS lrc_lines,
    (sv.lesson IS NOT NULL) AS has_lesson,
    jsonb_array_length(COALESCE(sv.lesson->'verses', '[]'::jsonb)) AS verse_count,
    (
      SELECT count(*) FROM jsonb_array_elements(COALESCE(sv.lesson->'verses', '[]'::jsonb)) v
      WHERE COALESCE((v->>'start_time_ms')::int, 0) = 0
    ) AS zero_verses
  FROM songs s
  LEFT JOIN song_versions sv ON sv.song_id = s.id
  WHERE s.slug IN (${slugList})
  ORDER BY s.slug, sv.version_type
`)) as unknown as { rows?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;

const rows = Array.isArray(raw) ? raw : (raw.rows ?? []);
console.log(JSON.stringify(rows, null, 2));
process.exit(0);
