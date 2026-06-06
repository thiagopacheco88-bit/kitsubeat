import { db } from "@/lib/db/index.js";
import { sql } from "drizzle-orm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function main() {
  // Check ALL verse tokens (no type filter) for non-null non-UUID vocab_item_ids
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
      AND tok->>'vocab_item_id' IS NOT NULL
    LIMIT 20
  `);

  console.log(`Tokens with non-null vocab_item_id: ${rows.rows.length}`);
  for (const r of rows.rows as any[]) {
    const ok = UUID_RE.test(r.vid ?? '');
    console.log(ok ? '✓' : '✗ BAD', `v${r.verse_number}`, r.surface, '|', r.vid, '| type:', r.type);
  }

  // Also check the songVersionId used in exercises
  const svRows = await db.execute(sql`
    SELECT sv.id FROM song_versions sv
    JOIN songs s ON s.id = sv.song_id
    WHERE s.slug = 'heart-of-sword-t-m-revolution'
  `);
  console.log('\nsong_version_id:', (svRows.rows[0] as any)?.id);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
