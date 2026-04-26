import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import { sql } from "drizzle-orm";

const db = getDb();

const raw = (await db.execute(sql`
  SELECT
    s.slug,
    sv.version_type AS type,
    jsonb_array_length(sv.lesson->'verses') AS verse_count,
    (
      SELECT count(*) FROM jsonb_array_elements(sv.lesson->'verses') v
      WHERE COALESCE((v->>'start_time_ms')::int, 0) = 0
    ) AS zero_count,
    (sv.synced_lrc IS NOT NULL) AS has_lrc
  FROM song_versions sv
  JOIN songs s ON s.id = sv.song_id
  WHERE sv.lesson IS NOT NULL
    AND jsonb_typeof(sv.lesson->'verses') = 'array'
`)) as unknown as Array<{ slug: string; type: string; verse_count: number; zero_count: number; has_lrc: boolean }> | { rows: Array<{ slug: string; type: string; verse_count: number; zero_count: number; has_lrc: boolean }> };

const rows = Array.isArray(raw) ? raw : (raw.rows ?? []);

const allZero: string[] = [];
const someZero: string[] = [];
const ok: string[] = [];

for (const r of rows) {
  const tag = `${r.slug}:${r.type}${r.has_lrc ? " (lrc)" : ""}`;
  const vc = Number(r.verse_count);
  const zc = Number(r.zero_count);
  if (vc === 0) continue;
  if (zc === vc) allZero.push(tag);
  else if (zc > 0) someZero.push(`${tag} (${zc}/${vc} zero)`);
  else ok.push(tag);
}

console.log(`Total song_versions with verses: ${rows.length}`);
console.log(`  all verses at start=0:       ${allZero.length}`);
console.log(`  some verses at start=0:      ${someZero.length}`);
console.log(`  all verses with start>0:     ${ok.length}`);

if (allZero.length) {
  console.log(`\n=== ALL-ZERO timing (${allZero.length}) ===`);
  for (const s of allZero.sort()) console.log(`  ${s}`);
}
if (someZero.length) {
  console.log(`\n=== SOME-ZERO timing (${someZero.length}) ===`);
  for (const s of someZero.sort().slice(0, 30)) console.log(`  ${s}`);
  if (someZero.length > 30) console.log(`  ... and ${someZero.length - 30} more`);
}
process.exit(0);
