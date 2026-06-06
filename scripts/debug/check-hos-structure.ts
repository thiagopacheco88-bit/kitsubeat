import { db } from "@/lib/db/index.js";
import { sql } from "drizzle-orm";

async function main() {
  const rows = await db.execute(sql`
    SELECT
      sv.id,
      jsonb_typeof(sv.lesson->'verses') AS verses_type,
      jsonb_array_length(sv.lesson->'verses') AS verse_count,
      jsonb_typeof(sv.lesson->'vocabulary') AS vocab_type,
      jsonb_array_length(sv.lesson->'vocabulary') AS vocab_count,
      (sv.lesson->'verses'->0) AS first_verse
    FROM song_versions sv
    JOIN songs s ON s.id = sv.song_id
    WHERE s.slug = 'heart-of-sword-t-m-revolution'
  `);

  for (const r of rows.rows as any[]) {
    console.log('song_version_id:', r.id);
    console.log('verses_type:', r.verses_type, 'count:', r.verse_count);
    console.log('vocab_type:', r.vocab_type, 'count:', r.vocab_count);
    if (r.first_verse) {
      const verse = typeof r.first_verse === 'string' ? JSON.parse(r.first_verse) : r.first_verse;
      console.log('first verse keys:', Object.keys(verse));
      if (verse.tokens) {
        console.log('first verse tokens[0]:', JSON.stringify(verse.tokens[0]));
        console.log('first verse tokens sample type values:', verse.tokens.slice(0,5).map((t: any) => t.type));
      }
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
