/**
 * backfill-vocab-identity.ts — Idempotent vocabulary identity backfill.
 *
 * Extracts vocabulary from all song_versions lesson JSONB, deduplicates into
 * vocabulary_items by (dictionary_form, reading), patches vocab_item_id UUIDs
 * back into the JSONB, audits grammar conjugation paths, and refreshes the
 * vocab_global materialized view.
 *
 * Idempotency guarantees:
 * - onConflictDoNothing on vocabulary_items inserts — safe to re-run
 * - JSONB patching overwrites vocab_item_id — re-applying the same UUID is a no-op
 * - Materialized view refresh is always safe to re-run
 *
 * Usage:
 *   npm run backfill:vocab              # live run
 *   npm run backfill:vocab -- --dry-run # dry-run (no DB writes)
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, sql } from "drizzle-orm";
import { getDb } from "../src/lib/db/index.js";
import {
  vocabularyItems,
  songVersions,
  vocabGlobal,
} from "../src/lib/db/schema.js";
import { LessonSchema, type VocabEntry } from "./types/lesson.js";
import {
  parseConjugationPath,
  auditConjugationPaths,
} from "./lib/conjugation-audit.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DRY_RUN = process.argv.includes("--dry-run");
const INSERT_CHUNK_SIZE = 50;
const UPDATE_BATCH_SIZE = 15;

// Regex: detect if a string contains any kanji (CJK unified ideographs)
const KANJI_RE = /[\u4E00-\u9FFF]/;
// Regex: detect if a string is all katakana + prolonged sound mark
const KATAKANA_ONLY_RE = /^[\u30A0-\u30FF\u30FC]+$/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalize the dictionary_form for deduplication.
 *
 * Script variant merge rule (locked decision):
 * - If surface contains kanji → use surface as dictionary_form
 * - If surface is hiragana-only or katakana-only (no kanji) → use reading as dictionary_form
 *
 * This ensures that 食べる (surface) and たべる (surface, no kanji) with the same
 * reading both resolve to 食べる as dictionary_form, sharing a single UUID.
 */
function normalizeDictionaryForm(surface: string, reading: string): string {
  return KANJI_RE.test(surface) ? surface : reading;
}

/**
 * Build the dedup key used to identify unique vocabulary items.
 */
function dedupKey(dictionary_form: string, reading: string): string {
  return `${dictionary_form}|${reading}`;
}

/**
 * Chunk an array into subarrays of at most `size` elements.
 */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`=== Vocabulary Backfill${DRY_RUN ? " (DRY RUN)" : ""} ===\n`);

  const db = getDb();

  // -------------------------------------------------------------------------
  // Step 0: Load all song_versions with lessons
  // -------------------------------------------------------------------------

  const rows = await db
    .select()
    .from(songVersions)
    .where(sql`lesson IS NOT NULL`);

  console.log(`Song versions with lessons: ${rows.length}`);

  // -------------------------------------------------------------------------
  // Phase 1: Extract and deduplicate vocabulary → vocabulary_items table
  // -------------------------------------------------------------------------

  let skippedRows = 0;
  let katakanaCount = 0;

  // Map: dedupKey → { vocab entry data, first seen from surface }
  const vocabMap = new Map<
    string,
    {
      dictionary_form: string;
      reading: string;
      romaji: string;
      part_of_speech: string;
      jlpt_level: string | null;
      is_katakana_loanword: boolean;
      meaning: Record<string, string>;
    }
  >();

  // Collect all grammar points across all lessons for conjugation audit
  const allGrammarPoints: Array<{ name: string; conjugation_path?: string }> = [];

  // Parse all lessons first — collect vocab and grammar
  const parsedRows: Array<{
    id: string;
    lesson: ReturnType<typeof LessonSchema.parse>;
  }> = [];

  for (const row of rows) {
    const parseResult = LessonSchema.safeParse(row.lesson);
    if (!parseResult.success) {
      skippedRows++;
      console.warn(`  Skipping row ${row.id}: invalid lesson schema`);
      continue;
    }

    const lesson = parseResult.data;
    parsedRows.push({ id: row.id, lesson });

    // Collect grammar points
    for (const gp of lesson.grammar_points) {
      allGrammarPoints.push({ name: gp.name, conjugation_path: gp.conjugation_path });
    }

    // Collect vocabulary entries
    for (const entry of lesson.vocabulary) {
      const dictionary_form = normalizeDictionaryForm(entry.surface, entry.reading);
      const is_katakana_loanword = KATAKANA_ONLY_RE.test(entry.surface);
      const key = dedupKey(dictionary_form, entry.reading);

      if (!vocabMap.has(key)) {
        const jlpt = entry.jlpt_level === "unknown" ? null : entry.jlpt_level;
        vocabMap.set(key, {
          dictionary_form,
          reading: entry.reading,
          romaji: entry.romaji,
          part_of_speech: entry.part_of_speech,
          jlpt_level: jlpt,
          is_katakana_loanword,
          meaning: entry.meaning,
        });
        if (is_katakana_loanword) katakanaCount++;
      }
    }
  }

  console.log(`\nPhase 1: Vocabulary extraction`);
  console.log(`  Unique vocab entries found: ${vocabMap.size}`);
  console.log(`  Rows skipped (invalid schema): ${skippedRows}`);
  console.log(`  Katakana loanwords: ${katakanaCount}`);

  // Build insert batch from vocabMap
  const vocabBatch = Array.from(vocabMap.values());

  // UUID lookup map: dedupKey → UUID
  const uuidMap = new Map<string, string>();

  let newCount = 0;
  let existingCount = 0;

  if (!DRY_RUN && vocabBatch.length > 0) {
    // Insert in chunks, then resolve UUIDs for all entries
    const batches = chunk(vocabBatch, INSERT_CHUNK_SIZE);
    for (const batch of batches) {
      await db
        .insert(vocabularyItems)
        .values(
          batch.map((v) => ({
            dictionary_form: v.dictionary_form,
            reading: v.reading,
            romaji: v.romaji,
            part_of_speech: v.part_of_speech,
            jlpt_level: v.jlpt_level as "N5" | "N4" | "N3" | "N2" | "N1" | null,
            is_katakana_loanword: v.is_katakana_loanword,
            meaning: v.meaning,
          }))
        )
        .onConflictDoNothing();
    }

    // Resolve UUIDs: fetch all existing vocabulary_items and build the lookup map.
    // Using a full table scan rather than a parameterized IN query to avoid
    // large parameter lists when the vocab set grows.
    const allExisting = await db
      .select({
        id: vocabularyItems.id,
        dictionary_form: vocabularyItems.dictionary_form,
        reading: vocabularyItems.reading,
      })
      .from(vocabularyItems);

    for (const item of allExisting) {
      const key = dedupKey(item.dictionary_form, item.reading);
      if (vocabMap.has(key)) {
        uuidMap.set(key, item.id);
      }
    }

    existingCount = uuidMap.size;
    newCount = vocabBatch.length - existingCount;

    console.log(`  Inserted (new): ~${vocabBatch.length - uuidMap.size}`);
    console.log(`  Resolved UUIDs: ${uuidMap.size}`);
  } else if (DRY_RUN) {
    console.log(`  [DRY RUN] Would insert ${vocabBatch.length} vocabulary items`);
  }

  // -------------------------------------------------------------------------
  // Phase 2: Patch JSONB with vocab_item_id
  // -------------------------------------------------------------------------

  console.log(`\nPhase 2: JSONB patching`);

  let patchedRows = 0;
  let patchedEntries = 0;
  let missingUuids = 0;

  if (!DRY_RUN && uuidMap.size > 0) {
    const rowBatches = chunk(parsedRows, UPDATE_BATCH_SIZE);

    for (const batch of rowBatches) {
      for (const { id, lesson } of batch) {
        let rowPatched = false;
        let entriesInRow = 0;

        const patchedVocab: VocabEntry[] = lesson.vocabulary.map((entry) => {
          const dictionary_form = normalizeDictionaryForm(entry.surface, entry.reading);
          const key = dedupKey(dictionary_form, entry.reading);
          const uuid = uuidMap.get(key);

          if (uuid) {
            entriesInRow++;
            return { ...entry, vocab_item_id: uuid };
          } else {
            missingUuids++;
            return entry;
          }
        });

        if (entriesInRow > 0) {
          rowPatched = true;
          patchedEntries += entriesInRow;
        }

        const patchedLesson = { ...lesson, vocabulary: patchedVocab };

        await db
          .update(songVersions)
          .set({ lesson: patchedLesson, updated_at: new Date() })
          .where(eq(songVersions.id, id));

        if (rowPatched) patchedRows++;
      }
    }

    console.log(`  Rows patched: ${patchedRows}`);
    console.log(`  Vocab entries patched: ${patchedEntries}`);
    if (missingUuids > 0) {
      console.warn(`  WARNING: ${missingUuids} entries had no UUID resolved`);
    }
  } else if (DRY_RUN) {
    // Simulate counts
    let simulatedEntries = 0;
    for (const { lesson } of parsedRows) {
      simulatedEntries += lesson.vocabulary.length;
    }
    patchedRows = parsedRows.length;
    patchedEntries = simulatedEntries;
    console.log(`  [DRY RUN] Would patch ${patchedRows} rows, ${patchedEntries} vocab entries`);
  }

  // -------------------------------------------------------------------------
  // Phase 3: Audit grammar conjugation paths
  // -------------------------------------------------------------------------

  console.log(`\nPhase 3: Conjugation audit`);

  const auditResult = auditConjugationPaths(allGrammarPoints);
  const withPath = allGrammarPoints.filter((gp) => gp.conjugation_path).length;
  const parsedPct = withPath > 0
    ? Math.round((auditResult.parsed.length / withPath) * 100)
    : 0;
  const skippedPct = withPath > 0
    ? Math.round((auditResult.skipped.length / withPath) * 100)
    : 0;

  // -------------------------------------------------------------------------
  // Phase 4: Refresh materialized view
  // -------------------------------------------------------------------------

  let viewRefreshed = false;

  if (!DRY_RUN) {
    console.log(`\nPhase 4: Refreshing vocab_global materialized view...`);
    try {
      // Use non-concurrent refresh (view may be empty on first run)
      await db.refreshMaterializedView(vocabGlobal);
      viewRefreshed = true;
      console.log(`  vocab_global refreshed successfully`);
    } catch (err) {
      console.error(`  ERROR refreshing materialized view:`, err);
    }
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  console.log(`
=== Vocabulary Backfill Summary ===
Song versions processed: ${parsedRows.length}
Song versions skipped (invalid lesson): ${skippedRows}
Unique vocabulary items: ${vocabBatch.length} (~${newCount} new, ~${existingCount} existing)
Katakana loanwords flagged: ${katakanaCount}
JSONB rows patched with vocab_item_id: ${patchedRows}

=== Conjugation Audit Summary ===
Total grammar points: ${auditResult.total}
Grammar points with conjugation_path: ${withPath}
Parseable (structured): ${auditResult.parsed.length} (${parsedPct}%)
Skipped (unstructured): ${auditResult.skipped.length} (${skippedPct}%)
${
  auditResult.skipped.length > 0
    ? `\nExamples of skipped entries:\n${auditResult.skipped
        .slice(0, 5)
        .map((s) => `  - "${s}"`)
        .join("\n")}`
    : ""
}

Materialized view refreshed: ${viewRefreshed ? "yes" : DRY_RUN ? "no (dry-run)" : "no (see error above)"}
`);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
