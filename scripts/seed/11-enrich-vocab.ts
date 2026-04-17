/**
 * 11-enrich-vocab.ts — Populate mnemonic + kanji_breakdown for vocabulary_items
 * via inline Anthropic Messages API (NOT Batch API — user preference).
 *
 * Idempotency:
 *   - Skip gate: isNull(vocabularyItems.mnemonic) — rows with mnemonic set are skipped.
 *   - Kana-only words get mnemonic populated; kanji_breakdown stays NULL.
 *   - Kanji-bearing words get BOTH fields populated.
 *   - Per-row db.update() before moving to the next row — partial progress persists
 *     across restarts (resume picks up remaining NULL-mnemonic rows).
 *
 * Usage:
 *   npm run seed:enrich-vocab
 *   (requires ANTHROPIC_API_KEY and DATABASE_URL / POSTGRES_URL in .env.local)
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import Anthropic from "@anthropic-ai/sdk";
import pLimit from "p-limit";
import { eq, isNull } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";
import { vocabularyItems } from "../../src/lib/db/schema.js";
import { VocabEnrichmentSchema, ENRICH_JSON_SCHEMA } from "../types/enrich.js";
import { localize, type Localizable } from "../../src/lib/types/lesson.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MODEL = "claude-haiku-4-5"; // cost-efficient; upgrade to sonnet-4-6 if quality check fails
const CONCURRENCY = 5;             // parallel rows; lower to 2-3 if hitting Anthropic 429s
const MAX_TOKENS = 1024;
const KANJI_RE = /[\u4e00-\u9fff]/;

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildPrompt(row: typeof vocabularyItems.$inferSelect, hasKanji: boolean): string {
  const meaningEn = localize(row.meaning as Localizable, "en");
  return `Generate learning aids for this Japanese vocabulary word.

Word: ${row.dictionary_form}
Reading: ${row.reading}
Meaning (EN): ${meaningEn}
Part of speech: ${row.part_of_speech}
${row.jlpt_level ? `JLPT level: ${row.jlpt_level}` : "JLPT level: unlisted"}

Return a JSON object with:

1. "mnemonic": { "en": "...", "pt-BR": "...", "es": "..." }
   - Each language: ONE short sentence, 10-15 words.
   - Tone: playful + visual. Use wordplay, vivid imagery, or sound-alikes to the Japanese reading.
   - NOT etymology. NOT anime references.

2. "kanji_breakdown": ${hasKanji ? `
   {
     "characters": [
       {
         "char": "<single kanji>",
         "meaning": { "en": "...", "pt-BR": "...", "es": "..." },
         "on_yomi": "<kana, empty string if none>",
         "kun_yomi": "<kana, empty string if none>",
         "jlpt_level": "N5" | "N4" | "N3" | "N2" | "N1" | null,
         "radical_hint": { "en": "<short string e.g. 'fire + person'>", "pt-BR": "...", "es": "..." }
       }
     ],
     "compound_note": { "en": "...", "pt-BR": "...", "es": "..." }
   }
   Include compound_note ONLY if the word has 2+ kanji characters — bridge per-character meanings to the whole word.
   Output exactly one character entry per kanji in "${row.dictionary_form}".` : `null (this word has no kanji)`}

Output JSON only. No prose around it.`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[enrich-vocab] ANTHROPIC_API_KEY is not set. Cannot call Claude API.");
    console.error("  Set it in .env.local or export it in your shell before running.");
    process.exit(1);
  }

  const db = getDb();
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxRetries: 3,
  });
  const limit = pLimit(CONCURRENCY);

  // Idempotency skip gate: only rows with mnemonic IS NULL need enrichment.
  // Kana-only words may have kanji_breakdown IS NULL forever — that is correct,
  // so we do NOT use kanji_breakdown as the skip signal.
  const rows = await db
    .select()
    .from(vocabularyItems)
    .where(isNull(vocabularyItems.mnemonic));

  console.log(`[enrich-vocab] ${rows.length} rows pending enrichment`);
  if (rows.length === 0) {
    console.log("[enrich-vocab] Nothing to do. Exiting.");
    return;
  }

  let ok = 0;
  let fail = 0;

  const tasks = rows.map((row) =>
    limit(async () => {
      try {
        const hasKanji = KANJI_RE.test(row.dictionary_form);
        const prompt = buildPrompt(row, hasKanji);

        // Inline Messages API call — NOT Batch API (user preference: avoid Batch spend).
        const response = await client.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          messages: [{ role: "user", content: prompt }],
        });

        const text =
          response.content.find((b) => b.type === "text")?.text ?? "";

        let json: unknown;
        try {
          json = JSON.parse(text);
        } catch {
          console.warn(
            `[fail] ${row.dictionary_form} (${row.id}): LLM returned non-JSON: ${text.slice(0, 120)}`
          );
          fail++;
          return;
        }

        const parsed = VocabEnrichmentSchema.safeParse(json);
        if (!parsed.success) {
          console.warn(
            `[fail] ${row.dictionary_form} (${row.id}): Zod validation failed:`,
            parsed.error.issues
          );
          fail++;
          return;
        }

        // Per-row commit — if the script dies on row 500/705, rerunning resumes
        // from the next NULL-mnemonic row automatically.
        await db
          .update(vocabularyItems)
          .set({
            mnemonic: parsed.data.mnemonic,
            kanji_breakdown: parsed.data.kanji_breakdown, // null for kana-only words
          })
          .where(eq(vocabularyItems.id, row.id));

        ok++;
        if ((ok + fail) % 25 === 0) {
          console.log(
            `[progress] ${ok} ok / ${fail} fail / ${rows.length} total`
          );
        }
      } catch (err) {
        console.warn(
          `[error] ${row.dictionary_form} (${row.id}):`,
          err instanceof Error ? err.message : err
        );
        fail++;
      }
    })
  );

  await Promise.all(tasks);

  console.log(`[done] succeeded=${ok} failed=${fail} total=${rows.length}`);
  if (fail > 0) {
    console.error(
      `[enrich-vocab] ${fail} rows failed. Re-run the script to retry — failed rows still have mnemonic IS NULL.`
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
