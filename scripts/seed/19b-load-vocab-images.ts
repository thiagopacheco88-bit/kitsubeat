/**
 * 19b-load-vocab-images.ts — Idempotent loader. Reads data/vocab-images-staging.tsv,
 * validates each row's image_url against the Unsplash CDN regex (D-12),
 * and UPDATEs vocabulary_items.image_url per row.
 *
 * Idempotency:
 *   - Per-row commit (NO transaction wrapper) — partial progress survives crashes.
 *   - Skip empty image_url cells (operator deferred them).
 *   - Re-runs are no-ops for rows where DB matches TSV (Postgres no-op for identical UPDATE).
 *
 * Threat T-11.4-01 mitigation: URL_PATTERN regex is the only DB-write gate.
 * Imported from 19-curate-vocab-images.ts to keep regex single-source-of-truth.
 *
 * Usage:
 *   tsx --tsconfig tsconfig.scripts.json scripts/seed/19b-load-vocab-images.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { vocabularyItems } from "../../src/lib/db/schema.js";
import { getDb } from "../../src/lib/db/index.js";
import { URL_PATTERN, TSV_PATH } from "./19-curate-vocab-images.js";

interface TsvRow {
  vocab_item_id: string;
  dictionary_form: string;
  image_url: string;
}

export function parseTsv(content: string): TsvRow[] {
  const lines = content
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith("#"));
  return lines.map((line) => {
    const cols = line.split("\t");
    return {
      vocab_item_id: cols[0] ?? "",
      dictionary_form: cols[1] ?? "",
      image_url: (cols[6] ?? "").trim(),
    };
  });
}

export async function runLoad(opts: { tsvPath?: string } = {}): Promise<{ loaded: number; skipped: number; invalid: number; total: number }> {
  const path = opts.tsvPath ?? TSV_PATH;
  const content = readFileSync(path, "utf-8");
  const rows = parseTsv(content);

  const db = getDb();
  let loaded = 0;
  let skipped = 0;
  let invalid = 0;

  for (const row of rows) {
    if (!row.image_url) {
      skipped++;
      continue;
    }
    if (!URL_PATTERN.test(row.image_url)) {
      console.warn(
        `[invalid] ${row.dictionary_form} (${row.vocab_item_id}): URL does not match Unsplash CDN pattern: ${row.image_url}`
      );
      invalid++;
      continue;
    }
    // Per-row commit — partial progress survives crashes (matches 11-enrich-vocab.ts:152-158)
    await db
      .update(vocabularyItems)
      .set({ image_url: row.image_url })
      .where(eq(vocabularyItems.id, row.vocab_item_id));
    loaded++;
  }

  console.log(`[done] loaded=${loaded} skipped=${skipped} invalid=${invalid} total=${rows.length}`);
  return { loaded, skipped, invalid, total: rows.length };
}

async function main() {
  await runLoad();
}

if (process.argv[1]?.endsWith("19b-load-vocab-images.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
