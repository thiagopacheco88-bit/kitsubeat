/**
 * 12-qa-enrichment.ts — Vocabulary Enrichment QA Gate
 *
 * Validates that every row in vocabulary_items has been enriched with:
 *   - mnemonic (all three languages: en, pt-BR, es)
 *   - kanji_breakdown (for kanji-bearing words only; null for kana-only words)
 *
 * Gates enforced:
 *   1. Coverage: mnemonic must be non-null for every row
 *   2. Shape:    mnemonic has en/pt-BR/es strings within [MIN_WORDS, MAX_WORDS] words
 *   3. Kanji coverage: kanji-bearing words must have kanji_breakdown non-null
 *   4. Zod shape: kanji_breakdown validates against KanjiBreakdownSchema
 *   5. Count match: characters.length === number of kanji in dictionary_form
 *   6. No-empty-meaning: no character entry has an empty meaning in any language
 *   7. Kana-only-null: kana-only words should have kanji_breakdown === null
 *
 * Exit codes:
 *   0 — all gates pass (PASS)
 *   1 — one or more gaps found, or fatal error
 *
 * Designed to run AFTER `npm run seed:enrich-vocab` completes.
 * Before enrichment, all rows have mnemonic=NULL, so the script exits 1 intentionally.
 *
 * Usage:
 *   npm run test:qa:enrichment
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/12-qa-enrichment.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import { vocabularyItems } from "../../src/lib/db/schema.js";
import { KanjiBreakdownSchema } from "../types/enrich.js";

const KANJI_RE = /[\u4e00-\u9fff]/;
const MIN_WORDS = 5;
const MAX_WORDS = 25;
const LANGS = ["en", "pt-BR", "es"] as const;

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function countKanji(s: string): number {
  return [...s].filter((c) => KANJI_RE.test(c)).length;
}

async function main() {
  const db = getDb();
  const rows = await db.select().from(vocabularyItems);

  const gaps: { id: string; form: string; issue: string }[] = [];

  for (const row of rows) {
    // Gate 1: coverage — mnemonic must be populated for every row
    if (!row.mnemonic) {
      gaps.push({ id: row.id, form: row.dictionary_form, issue: "mnemonic IS NULL" });
      continue;
    }

    // Gate 2: mnemonic shape — must be Localizable with en/pt-BR/es
    const mnemonic = row.mnemonic as Record<string, string>;
    for (const lang of LANGS) {
      if (!mnemonic[lang] || typeof mnemonic[lang] !== "string") {
        gaps.push({ id: row.id, form: row.dictionary_form, issue: `mnemonic.${lang} missing/non-string` });
      } else {
        const wc = wordCount(mnemonic[lang]);
        if (wc < MIN_WORDS || wc > MAX_WORDS) {
          gaps.push({
            id: row.id,
            form: row.dictionary_form,
            issue: `mnemonic.${lang} word count ${wc} outside [${MIN_WORDS}, ${MAX_WORDS}]`,
          });
        }
      }
    }

    // Gate 3: kanji coverage — kanji-bearing words must have kanji_breakdown
    const kanjiCount = countKanji(row.dictionary_form);
    if (kanjiCount > 0) {
      if (!row.kanji_breakdown) {
        gaps.push({ id: row.id, form: row.dictionary_form, issue: "kanji_breakdown IS NULL for kanji-bearing word" });
        continue;
      }

      // Gate 4: shape validation via Zod
      const parsed = KanjiBreakdownSchema.safeParse(row.kanji_breakdown);
      if (!parsed.success) {
        gaps.push({
          id: row.id,
          form: row.dictionary_form,
          issue: `kanji_breakdown shape invalid: ${parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}`,
        });
        continue;
      }

      // Gate 5: character count match
      if (parsed.data.characters.length !== kanjiCount) {
        gaps.push({
          id: row.id,
          form: row.dictionary_form,
          issue: `kanji_breakdown.characters.length=${parsed.data.characters.length} != kanji count ${kanjiCount}`,
        });
      }

      // Gate 6: no empty meanings in character entries
      for (let i = 0; i < parsed.data.characters.length; i++) {
        const ch = parsed.data.characters[i];
        for (const lang of LANGS) {
          if (!ch.meaning[lang] || ch.meaning[lang].trim().length === 0) {
            gaps.push({
              id: row.id,
              form: row.dictionary_form,
              issue: `kanji_breakdown.characters[${i}].meaning.${lang} empty`,
            });
          }
        }
      }
    } else {
      // Gate 7 (informational): kana-only words should have kanji_breakdown NULL
      if (row.kanji_breakdown != null) {
        gaps.push({
          id: row.id,
          form: row.dictionary_form,
          issue: `kanji_breakdown non-null on kana-only word (expected null)`,
        });
      }
    }
  }

  console.log(`[qa-enrich] scanned ${rows.length} rows; ${gaps.length} gaps`);
  if (gaps.length > 0) {
    const preview = gaps.slice(0, 20);
    for (const g of preview) console.log(`  - ${g.form} (${g.id}): ${g.issue}`);
    if (gaps.length > 20) console.log(`  ... and ${gaps.length - 20} more`);
    process.exit(1);
  }
  console.log("[qa-enrich] PASS");
}

main().catch((e) => { console.error(e); process.exit(1); });
