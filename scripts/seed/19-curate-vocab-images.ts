/**
 * 19-curate-vocab-images.ts — Emit TSV staging file with top-50 frequency-ranked
 * concrete vocab (noun/verb) for operator Unsplash curation.
 *
 * Idempotency:
 *   - Skip gate: vocabularyItems.image_url IS NULL — already-curated rows are skipped.
 *   - Re-running picks up the next 50 in frequency rank.
 *
 * Pitfall 2 mitigation: refreshVocabGlobal() is called once at start to ensure
 * the materialized view reflects current lesson content before frequency ranking.
 *
 * Usage:
 *   tsx --tsconfig tsconfig.scripts.json scripts/seed/19-curate-vocab-images.ts
 *   tsx --tsconfig tsconfig.scripts.json scripts/seed/19-curate-vocab-images.ts --verify
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { getDb } from "../../src/lib/db/index.js";
import { refreshVocabGlobal } from "../../src/lib/db/queries.js";
import { localize, type Localizable } from "../../src/lib/types/lesson.js";

export const TSV_PATH = "data/vocab-images-staging.tsv";
export const URL_PATTERN = /^https:\/\/images\.unsplash\.com\/.+/;

interface FrequencyRow {
  vocab_item_id: string;
  dictionary_form: string;
  reading: string;
  romaji: string;
  meaning: unknown;
  part_of_speech: string;
  jlpt_level: string | null;
  appearance_count: number;
}

function unwrap<T = unknown>(r: unknown): T[] {
  return Array.isArray(r) ? (r as T[]) : ((r as { rows?: T[] }).rows ?? []);
}

export async function runCurate(opts: { limit?: number } = {}): Promise<{ count: number; path: string }> {
  const limit = opts.limit ?? 50;
  const db = getDb();

  // Pitfall 2 mitigation: refresh the materialized view (CONCURRENTLY-safe, <1s on current catalog).
  // Swallow refresh errors: pre-existing duplicate-row issues in vocab_global (catalog-level
  // backlog item, not specific to 11.4) can fail both refresh modes. Curate falls back to
  // whatever the view currently holds — slight staleness is acceptable for a validation set.
  try {
    await refreshVocabGlobal();
  } catch (err) {
    console.warn(
      `[curate] vocab_global refresh failed — using existing view state. Backlog: investigate duplicates. (${(err as Error).message})`
    );
  }

  const rawRows = await db.execute(sql`
    SELECT
      vi.id            AS vocab_item_id,
      vi.dictionary_form,
      vi.reading,
      vi.romaji,
      vi.meaning,
      vi.part_of_speech,
      vi.jlpt_level::text AS jlpt_level,
      COUNT(*)::int    AS appearance_count
    FROM vocab_global vg
    JOIN vocabulary_items vi ON vi.id = vg.vocab_item_id
    WHERE vi.part_of_speech IN ('noun', 'verb')
      AND vi.image_url IS NULL
    GROUP BY vi.id, vi.dictionary_form, vi.reading, vi.romaji, vi.meaning, vi.part_of_speech, vi.jlpt_level
    ORDER BY appearance_count DESC, vi.dictionary_form ASC
    LIMIT ${limit}
  `);
  const rows = unwrap<FrequencyRow>(rawRows);

  const lines: string[] = [
    "# vocab_item_id\tdictionary_form\treading\tmeaning_en\tpart_of_speech\tsuggested_query\timage_url",
  ];
  for (const r of rows) {
    const meaningEn = localize(r.meaning as Localizable, "en");
    const hint = r.part_of_speech === "verb" ? "action" : "object";
    lines.push([
      r.vocab_item_id,
      r.dictionary_form,
      r.reading,
      meaningEn,
      r.part_of_speech,
      `${meaningEn} (${hint})`,
      "", // operator fills this column
    ].join("\t"));
  }
  writeFileSync(TSV_PATH, lines.join("\n") + "\n", "utf-8");
  console.log(`[curate] emitted ${rows.length} rows to ${TSV_PATH}`);
  return { count: rows.length, path: TSV_PATH };
}

export async function runVerify(): Promise<{ ok: boolean; populated: number; missing: number; invalid: number; total: number }> {
  if (!existsSync(TSV_PATH)) {
    console.error(`[verify] ${TSV_PATH} does not exist — run curate first`);
    return { ok: false, populated: 0, missing: 0, invalid: 0, total: 0 };
  }
  const lines = readFileSync(TSV_PATH, "utf-8")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith("#"));

  const db = getDb();
  let populated = 0, missing = 0, invalid = 0;

  for (const line of lines) {
    const cols = line.split("\t");
    const vocabItemId = cols[0];
    const dictForm = cols[1];

    const rawRow = await db.execute(sql`
      SELECT image_url FROM vocabulary_items WHERE id = ${vocabItemId}
    `);
    const dbRows = unwrap<{ image_url: string | null }>(rawRow);
    const dbImageUrl = dbRows[0]?.image_url ?? null;

    if (!dbImageUrl) {
      console.warn(`[verify] missing in DB: ${dictForm} (${vocabItemId})`);
      missing++;
      continue;
    }
    if (!URL_PATTERN.test(dbImageUrl)) {
      console.warn(`[verify] invalid URL in DB: ${dictForm} (${vocabItemId}): ${dbImageUrl}`);
      invalid++;
      continue;
    }
    populated++;
  }

  const total = lines.length;
  const ok = missing === 0 && invalid === 0;
  console.log(`[verify] populated=${populated}/${total}, missing=${missing}, invalid=${invalid}`);
  return { ok, populated, missing, invalid, total };
}

async function main() {
  if (process.argv.includes("--verify")) {
    const result = await runVerify();
    process.exit(result.ok ? 0 : 1);
  } else {
    await runCurate();
  }
}

// Conditional-main pattern: lets the file be imported in tests (where runCurate()
// is called directly) without auto-running main(). Cross-platform path handling
// matters on Windows — process.argv[1] may use backslashes; the endsWith fallback covers it.
if (
  import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, "/") ||
  process.argv[1]?.endsWith("19-curate-vocab-images.ts")
) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
