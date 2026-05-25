#!/usr/bin/env npx tsx
/**
 * Reads all videos/word-banks/<series>.json files and upserts the `quiz_distractors`
 * field on matching vocabulary_items rows (matched by romaji).
 *
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/seed/populate-quiz-distractors.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { getDb } from "../../src/lib/db/index.js";
import { vocabularyItems } from "../../src/lib/db/schema.js";
import { eq } from "drizzle-orm";

interface WrongAnswer { r: string; e: string; }
interface WordBankWord {
  id: string; romaji: string; en: string; jp: string;
  wrong: WrongAnswer[];
}
interface WordBankPart { part: number; theme: string; words: WordBankWord[]; }
interface WordBank { series: string; label: string; parts: WordBankPart[]; }

const WORD_BANKS_DIR = join(process.cwd(), "videos", "word-banks");

async function main() {
  const db = getDb();
  const files = readdirSync(WORD_BANKS_DIR).filter(f => f.endsWith(".json"));
  console.log(`Found ${files.length} word-bank files`);

  let updated = 0; let notFound = 0;

  for (const file of files) {
    const bank: WordBank = JSON.parse(readFileSync(join(WORD_BANKS_DIR, file), "utf-8"));
    console.log(`\n📖 ${bank.label} (${bank.parts.length} parts)`);

    for (const part of bank.parts) {
      for (const word of part.words) {
        const rows = await db
          .select({ id: vocabularyItems.id, romaji: vocabularyItems.romaji })
          .from(vocabularyItems)
          .where(eq(vocabularyItems.romaji, word.romaji))
          .limit(1);

        if (rows.length === 0) {
          console.log(`  ⚠ Not in DB: ${word.romaji} (${word.en})`);
          notFound++;
          continue;
        }

        await db
          .update(vocabularyItems)
          .set({ quiz_distractors: word.wrong })
          .where(eq(vocabularyItems.id, rows[0].id));

        console.log(`  ✓ ${word.romaji} → [${word.wrong.map(w => w.r).join(", ")}]`);
        updated++;
      }
    }
  }

  console.log(`\n✅ Done. Updated: ${updated} | Not in DB: ${notFound}`);
}

main().catch(err => { console.error(err); process.exit(1); });
