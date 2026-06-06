import { db } from "@/lib/db/index.js";
import { sql } from "drizzle-orm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function main() {
  const rows = await db.execute(sql`
    SELECT
      elem->>'surface' as surface,
      elem->>'vocab_item_id' as vid
    FROM song_versions sv
    JOIN songs s ON s.id = sv.song_id
    CROSS JOIN LATERAL jsonb_array_elements((sv.lesson->'vocabulary')) AS elem
    WHERE s.slug = 'heart-of-sword-t-m-revolution'
    ORDER BY (elem->>'surface')
  `);
  let bad = 0;
  for (const r of rows.rows as { surface: string; vid: string | null }[]) {
    const ok = r.vid ? UUID_RE.test(r.vid) : false;
    if (!ok) { bad++; console.log("✗ BAD", r.surface, "|", r.vid ?? "null"); }
    else console.log("✓", r.surface, "|", r.vid?.slice(0, 8));
  }
  console.log(`\nTotal: ${rows.rows.length}, Bad: ${bad}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
