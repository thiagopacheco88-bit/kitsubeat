import { db } from "@/lib/db/index.js";
import { sql } from "drizzle-orm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function main() {
  // Check verse tokens for invalid vocab_item_ids
  const rows = await db.execute(sql`
    SELECT
      (verse_elem->>'verse_number')::int AS verse_number,
      tok->>'type' AS type,
      tok->>'surface' AS surface,
      tok->>'vocab_item_id' AS vid
    FROM song_versions sv
    JOIN songs s ON s.id = sv.song_id
    CROSS JOIN LATERAL jsonb_array_elements(sv.lesson->'verses') AS verse_elem
    CROSS JOIN LATERAL jsonb_array_elements(verse_elem->'tokens') AS tok
    WHERE s.slug = 'heart-of-sword-t-m-revolution'
      AND tok->>'type' = 'vocab'
    ORDER BY verse_number, tok->>'surface'
  `);

  let bad = 0;
  for (const r of rows.rows as { verse_number: number; type: string; surface: string; vid: string | null }[]) {
    const ok = r.vid ? UUID_RE.test(r.vid) : true; // null is ok (filtered by IS NOT NULL)
    if (!ok) {
      bad++;
      console.log(`✗ VERSE ${r.verse_number} | ${r.surface} | vid="${r.vid}"`);
    }
  }
  if (bad === 0) {
    console.log(`✓ All ${rows.rows.length} verse tokens look clean`);
  } else {
    console.log(`\nTotal bad: ${bad} / ${rows.rows.length}`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
