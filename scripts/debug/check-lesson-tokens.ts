import { config } from "dotenv";
config({ path: ".env.local" });
import { getDb } from "../../src/lib/db/index.js";
import { sql } from "drizzle-orm";

const slug = process.argv[2] ?? "the-1-muque";

async function main() {
  const db = getDb();

  // Count all unique tokens across verses that have a vocab_item_id (linked words)
  const tokenRows = await db.execute(sql`
    SELECT
      t->>'text' as text,
      t->>'reading' as reading,
      t->>'vocab_item_id' as vocab_item_id
    FROM song_versions sv
    JOIN songs s ON s.id = sv.song_id,
    jsonb_array_elements(sv.lesson->'verses') verse,
    jsonb_array_elements(verse->'tokens') t
    WHERE s.slug = ${slug}
      AND sv.pipeline_status = 'idle'
      AND t->>'text' IS NOT NULL
  `);

  const rows = tokenRows.rows as { text: string; reading: string | null; vocab_item_id: string | null }[];

  const linked = new Map<string, string>(); // reading -> text
  const unlinked = new Map<string, string>(); // reading -> text

  for (const r of rows) {
    const key = (r.reading ?? r.text).toLowerCase();
    if (r.vocab_item_id && r.vocab_item_id !== 'null') {
      linked.set(key, r.text);
    } else {
      if (!linked.has(key)) unlinked.set(key, r.text);
    }
  }

  console.log(`\nToken analysis for: ${slug}`);
  console.log(`  Total token occurrences: ${rows.length}`);
  console.log(`  Unique tokens linked to vocab: ${linked.size}`);
  console.log(`  Unique tokens NOT linked to vocab: ${unlinked.size}`);
  console.log(`\nUnlinked tokens (words in lyrics with no vocab entry):`);

  const unlinkedList = [...unlinked.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [reading, text] of unlinkedList) {
    console.log(`  ${text}  (${reading})`);
  }
}

main().catch(console.error);
