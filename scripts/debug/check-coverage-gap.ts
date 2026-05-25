import { config } from "dotenv";
config({ path: ".env.local" });
import { getDb } from "../../src/lib/db/index.js";
import { sql } from "drizzle-orm";

const slug = process.argv[2] ?? "the-1-muque";

async function main() {
  const db = getDb();

  // Get all token surfaces from verses
  const tokenRows = await db.execute(sql`
    SELECT DISTINCT
      t->>'surface' as surface,
      t->>'reading' as reading,
      t->>'jlpt_level' as jlpt_level,
      t->>'grammar' as grammar,
      t->'meaning'->>'en' as meaning_en
    FROM song_versions sv
    JOIN songs s ON s.id = sv.song_id,
    jsonb_array_elements(sv.lesson->'verses') verse,
    jsonb_array_elements(verse->'tokens') t
    WHERE s.slug = ${slug}
      AND sv.pipeline_status = 'idle'
      AND t->>'surface' IS NOT NULL
      AND t->>'surface' != ''
    ORDER BY t->>'jlpt_level', t->>'surface'
  `);

  // Get vocab readings (what's taught)
  const vocabRows = await db.execute(sql`
    SELECT
      v->>'reading' as reading,
      v->'meaning'->>'en' as meaning_en
    FROM song_versions sv
    JOIN songs s ON s.id = sv.song_id,
    jsonb_array_elements(sv.lesson->'vocabulary') v
    WHERE s.slug = ${slug}
      AND sv.pipeline_status = 'idle'
  `);

  const taughtReadings = new Set(
    (vocabRows.rows as { reading: string }[]).map((r) => r.reading)
  );

  const tokens = tokenRows.rows as {
    surface: string;
    reading: string;
    jlpt_level: string | null;
    grammar: string;
    meaning_en: string;
  }[];

  const untaught = tokens.filter((t) => !taughtReadings.has(t.reading));

  console.log(`\nVocab coverage for: ${slug}`);
  console.log(`  Unique tokens in lyrics: ${tokens.length}`);
  console.log(`  Vocab items taught: ${taughtReadings.size}`);
  console.log(`  Tokens NOT in vocab list: ${untaught.length}`);

  console.log(`\nTokens in lyrics but NOT taught (by JLPT):`);
  for (const t of untaught) {
    console.log(`  [${t.jlpt_level ?? "??"}] ${t.surface} (${t.reading}) — ${t.meaning_en}`);
  }

  console.log(`\nVocab being taught:`);
  for (const v of vocabRows.rows as { reading: string; meaning_en: string }[]) {
    console.log(`  ${v.reading} — ${v.meaning_en}`);
  }
}

main().catch(console.error);
