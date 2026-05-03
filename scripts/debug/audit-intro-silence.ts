/**
 * SEED-002 trigger audit — scans the catalog for song_versions whose first verse
 * starts long after t=0 in the YouTube video (band setup, spoken intros, ad bumpers,
 * silent leader). The output answers: is again-yui a one-off, or do N songs need
 * a playback-start offset?
 *
 * Effective intro delay = first_verse.start_time_ms + lyrics_offset_ms
 *   (lyrics_offset_ms shifts highlight relative to video, so the video-time of the
 *    first lyric is the sum, not the raw lesson timestamp.)
 *
 * Read-only. Prints buckets + a flat list sorted by effective delay.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import { sql } from "drizzle-orm";

const BUCKETS = [
  { label: ">= 40s (severe — again-yui territory)", min: 40000 },
  { label: ">= 20s (definite)",                     min: 20000 },
  { label: ">= 10s (candidate)",                    min: 10000 },
  { label: ">=  5s (borderline)",                   min: 5000  },
];

const db = getDb();

const raw = (await db.execute(sql`
  SELECT
    s.slug,
    sv.version_type AS type,
    sv.youtube_id,
    sv.lyrics_offset_ms,
    jsonb_array_length(sv.lesson->'verses') AS verse_count,
    (
      SELECT COALESCE((v->>'start_time_ms')::int, 0)
      FROM jsonb_array_elements(sv.lesson->'verses') WITH ORDINALITY arr(v, idx)
      WHERE idx = 1
    ) AS first_verse_ms
  FROM song_versions sv
  JOIN songs s ON s.id = sv.song_id
  WHERE sv.lesson IS NOT NULL
    AND jsonb_typeof(sv.lesson->'verses') = 'array'
    AND jsonb_array_length(sv.lesson->'verses') > 0
`)) as unknown as
  | Array<{ slug: string; type: string; youtube_id: string | null; lyrics_offset_ms: number; verse_count: number; first_verse_ms: number }>
  | { rows: Array<{ slug: string; type: string; youtube_id: string | null; lyrics_offset_ms: number; verse_count: number; first_verse_ms: number }> };

const rows = Array.isArray(raw) ? raw : (raw.rows ?? []);

type Hit = {
  slug: string;
  type: string;
  youtube_id: string | null;
  raw_ms: number;
  offset_ms: number;
  effective_ms: number;
  verse_count: number;
};

const hits: Hit[] = [];
for (const r of rows) {
  const raw_ms     = Number(r.first_verse_ms);
  const offset_ms  = Number(r.lyrics_offset_ms);
  const effective  = raw_ms + offset_ms;
  if (effective >= 5000) {
    hits.push({
      slug: r.slug,
      type: r.type,
      youtube_id: r.youtube_id,
      raw_ms,
      offset_ms,
      effective_ms: effective,
      verse_count: Number(r.verse_count),
    });
  }
}

hits.sort((a, b) => b.effective_ms - a.effective_ms);

console.log(`Total song_versions with verses scanned: ${rows.length}`);
console.log(`Hits (effective >= 5000ms): ${hits.length}\n`);

for (const b of BUCKETS) {
  const count = hits.filter(h => h.effective_ms >= b.min).length;
  console.log(`  ${b.label.padEnd(48)} ${count}`);
}

console.log("\n=== Hits sorted by effective delay (desc) ===");
console.log("slug:type                                          eff_ms   raw_ms   off_ms   verses   yt_id");
for (const h of hits) {
  const tag = `${h.slug}:${h.type}`.padEnd(48);
  const eff = String(h.effective_ms).padStart(7);
  const rawMs = String(h.raw_ms).padStart(7);
  const off = String(h.offset_ms).padStart(7);
  const vc = String(h.verse_count).padStart(7);
  console.log(`  ${tag} ${eff}  ${rawMs}  ${off}  ${vc}   ${h.youtube_id ?? "(null)"}`);
}

process.exit(0);
