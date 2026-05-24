/**
 * scripts/seed/20-seed-anime-vocab.ts
 *
 * Seeds 760 anime vocabulary words from .planning/anime-vocab/*.json into:
 *   1. vocabulary_items  (ON CONFLICT (dictionary_form, reading) DO UPDATE — idempotent)
 *   2. anime_vocab_catalog (ON CONFLICT DO NOTHING — idempotent)
 *
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/seed/20-seed-anime-vocab.ts
 *
 * JLPT display_order formula: jlptRank * 10000 + positionWithinLevel
 *   N5=0, N4=1, N3=2, N2=3, N1=4, null=5 (anime-specific terms sort last)
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDb } from "../../src/lib/db/index.js";
import { vocabularyItems, animeVocabCatalog } from "../../src/lib/db/schema.js";

// ── JSON file structure ──────────────────────────────────────────────────────

interface AnimeVocabWord {
  surface: string;    // maps to vocabulary_items.dictionary_form
  reading: string;
  romaji: string;
  meanings: { en: string; "pt-BR": string; es: string };
  jlpt_level: string | null;
  category: string;
  context: string;    // maps to anime_vocab_catalog.context_note
}

interface AnimeVocabFile {
  anime: string;   // slug, e.g. "one-piece"
  label: string;   // display name, e.g. "One Piece"
  vocab: AnimeVocabWord[];
}

// ── JLPT sort order ──────────────────────────────────────────────────────────

const JLPT_ORDER: Record<string, number> = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 };
const jlptRank = (level: string | null): number =>
  level ? (JLPT_ORDER[level] ?? 4) : 5;

// ── Slug list ─────────────────────────────────────────────────────────────────

const SLUGS = [
  "one-piece",
  "naruto",
  "bleach",
  "fullmetal-alchemist",
  "attack-on-titan",
  "sword-art-online",
  "demon-slayer",
  "death-note",
  "dragon-ball-z",
  "hunter-x-hunter",
  "tokyo-ghoul",
] as const;

// ── Path to JSON files ───────────────────────────────────────────────────────
// __dirname is scripts/seed/ → go up 2 levels to repo root → .planning/anime-vocab/

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VOCAB_DIR = path.join(__dirname, "..", "..", ".planning", "anime-vocab");

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const db = getDb();

  let totalVocabUpserted = 0;
  let totalCatalogRows = 0;

  for (const slug of SLUGS) {
    const filePath = path.join(VOCAB_DIR, `${slug}.json`);

    if (!fs.existsSync(filePath)) {
      console.warn(`[WARN] Missing file: ${filePath} — skipping`);
      continue;
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const data: AnimeVocabFile = JSON.parse(raw);
    const words = data.vocab;

    console.log(`\n[${slug}] Processing ${words.length} words...`);

    // Sort by JLPT rank first, then by original array index for stable sub-ordering.
    // Compute display_order = jlptRank * 10000 + positionWithinLevel
    const levelCounters: Record<number, number> = {};
    const sorted = words
      .map((word, i) => ({ word, originalIndex: i }))
      .sort((a, b) => {
        const ra = jlptRank(a.word.jlpt_level);
        const rb = jlptRank(b.word.jlpt_level);
        return ra !== rb ? ra - rb : a.originalIndex - b.originalIndex;
      })
      .map(({ word }) => {
        const rank = jlptRank(word.jlpt_level);
        const pos = levelCounters[rank] ?? 0;
        levelCounters[rank] = pos + 1;
        return { word, displayOrder: rank * 10000 + pos };
      });

    for (const { word, displayOrder } of sorted) {
      // 1. Upsert into vocabulary_items
      //    ON CONFLICT (dictionary_form, reading) DO UPDATE refreshes meaning + romaji.
      //    Does NOT overwrite jlpt_level or part_of_speech if already enriched.
      const [vocabRow] = await db
        .insert(vocabularyItems)
        .values({
          dictionary_form: word.surface,
          reading: word.reading,
          romaji: word.romaji,
          part_of_speech: "noun",  // safe default; ~85% correct for anime vocab
          jlpt_level: (word.jlpt_level as "N5" | "N4" | "N3" | "N2" | "N1" | null) ?? null,
          meaning: word.meanings,
          is_katakana_loanword: false,
          admin_flagged: false,
        })
        .onConflictDoUpdate({
          target: [vocabularyItems.dictionary_form, vocabularyItems.reading],
          set: {
            romaji: word.romaji,
            meaning: word.meanings,
          },
        })
        .returning({ id: vocabularyItems.id });

      totalVocabUpserted++;

      // 2. Upsert into anime_vocab_catalog
      //    ON CONFLICT (anime_slug, vocab_item_id) DO UPDATE to keep display_order
      //    and context_note current if re-seeding with revised data.
      await db
        .insert(animeVocabCatalog)
        .values({
          anime_slug: slug,
          vocab_item_id: vocabRow.id,
          category: word.category,
          display_order: displayOrder,
          context_note: word.context,
        })
        .onConflictDoUpdate({
          target: [animeVocabCatalog.anime_slug, animeVocabCatalog.vocab_item_id],
          set: {
            display_order: displayOrder,
            category: word.category,
            context_note: word.context,
          },
        });

      totalCatalogRows++;
    }

    console.log(`[${slug}] Done — ${words.length} words processed`);
  }

  console.log(`\nSeed complete`);
  console.log(`  vocabulary_items upserted: ${totalVocabUpserted}`);
  console.log(`  anime_vocab_catalog rows:  ${totalCatalogRows}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
