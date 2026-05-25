/**
 * Check how many of the missing verse tokens for a song already have
 * matching vocabulary_items rows (by reading match).
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { getDb } from "../../src/lib/db/index.js";
import { sql } from "drizzle-orm";

const slug = process.argv[2] ?? "the-1-muque";
const SKIP_GRAMMAR = new Set(["particle", "auxiliary", "expression"]);

async function main() {
  const db = getDb();

  // Get all verse tokens
  const verseRows = await db.execute(sql`
    SELECT DISTINCT
      t->>'surface' as surface,
      t->>'reading' as reading,
      t->>'grammar' as grammar,
      t->>'jlpt_level' as jlpt_level,
      t->'meaning'->>'en' as meaning_en,
      t->'meaning'->>'pt-BR' as meaning_pt,
      t->'meaning'->>'es' as meaning_es,
      t->>'romaji' as romaji
    FROM song_versions sv
    JOIN songs s ON s.id = sv.song_id,
    jsonb_array_elements(sv.lesson->'verses') verse,
    jsonb_array_elements(verse->'tokens') t
    WHERE s.slug = ${slug}
      AND sv.pipeline_status = 'idle'
      AND t->>'surface' IS NOT NULL AND t->>'surface' != ''
  `);

  // Get existing vocabulary readings in the lesson
  const existingVocabRows = await db.execute(sql`
    SELECT v->>'reading' as reading
    FROM song_versions sv
    JOIN songs s ON s.id = sv.song_id,
    jsonb_array_elements(sv.lesson->'vocabulary') v
    WHERE s.slug = ${slug} AND sv.pipeline_status = 'idle'
  `);

  const taughtReadings = new Set(
    (existingVocabRows.rows as { reading: string }[]).map((r) => r.reading)
  );

  type TokenRow = { surface: string; reading: string; grammar: string; jlpt_level: string; meaning_en: string; meaning_pt: string; meaning_es: string; romaji: string };
  const allTokens = verseRows.rows as TokenRow[];

  // Filter to content words not already taught
  const candidates = allTokens.filter((t) =>
    !SKIP_GRAMMAR.has(t.grammar) &&
    !taughtReadings.has(t.reading) &&
    t.surface && t.reading
  );

  // Dedupe by reading
  const seen = new Set<string>();
  const uniqueCandidates = candidates.filter((t) => {
    if (seen.has(t.reading)) return false;
    seen.add(t.reading);
    return true;
  });

  console.log(`\nCandidate tokens for ${slug}: ${uniqueCandidates.length}\n`);

  // Check each against vocabulary_items table
  const readings = uniqueCandidates.map((c) => c.reading);

  const viRows = await db.execute(sql`
    SELECT id, reading, dictionary_form, jlpt_level
    FROM vocabulary_items
    WHERE reading = ANY(ARRAY[${sql.join(readings.map(r => sql`${r}`), sql`, `)}])
  `);

  const viMap = new Map(
    (viRows.rows as { id: string; reading: string; dictionary_form: string; jlpt_level: string }[])
      .map((r) => [r.reading, r])
  );

  let matched = 0;
  let unmatched = 0;

  for (const c of uniqueCandidates) {
    const vi = viMap.get(c.reading);
    if (vi) {
      matched++;
      console.log(`  ✓ MATCHED  [${c.jlpt_level ?? "??"}] ${c.surface} (${c.reading}) → vocab_item_id=${vi.id.slice(0, 8)}…`);
    } else {
      unmatched++;
      console.log(`  ✗ NO MATCH [${c.jlpt_level ?? "??"}] ${c.surface} (${c.reading})`);
    }
  }

  console.log(`\nMatched: ${matched}/${uniqueCandidates.length} tokens have existing vocabulary_items`);
  console.log(`Unmatched: ${unmatched} would need new vocabulary_items entries`);
}

main().catch(console.error);
