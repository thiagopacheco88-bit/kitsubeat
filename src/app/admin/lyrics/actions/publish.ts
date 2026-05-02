"use server";

/**
 * Phase 11.5 SPEC #15-#18 + D-15/D-18/D-19: publish server action.
 *
 * Orchestrates: re-tokenize edited verses (kuromoji) → renumber → publishLyricsVersion (db.batch)
 *               → revalidate public cache.
 *
 * Stale-publish (D-18): publishLyricsVersion throws StalePublishError; we surface it as
 * a structured error code so the editor opens the reload modal.
 *
 * Re-tokenization (D-19, SPEC #18): for verses in dirtyVerseNumbers, run tokenizeLyrics
 * from kuroshiro-tokenizer.ts with an explicit dictPath to avoid Pitfall 2. Produces
 * LyricsToken[] (surface, reading, romaji, pos, basic_form). These are mapped to Token[]
 * using the kuromoji pos → GrammarType mapping and looked up/created in vocabulary_items
 * by (dictionary_form=basic_form, reading). Grammar meaning/jlpt_level are preserved from
 * existing tokens where available; new tokens get "other" grammar and empty meaning.
 *
 * Note: Token re-segmentation only applies when the verse has surface text reconstructable
 * from its token surfaces (most cases). The existing verse.tokens array is the source —
 * re-tokenization runs on the concatenated surface string of all tokens in the verse.
 */

import path from "node:path";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { publishLyricsVersion, StalePublishError } from "@/lib/admin/publish-tx";
import { renumberVerses } from "@/lib/admin/verse-renumber";
import { revalidateSongCache } from "@/app/actions/cache";
import { initKuroshiro, tokenizeLyrics } from "@/../scripts/lib/kuroshiro-tokenizer";
import type { Verse, Token, GrammarType, GrammarColor } from "@/lib/types/lesson";

export interface PublishInput {
  songVersionId: string;
  slug: string;                      // for cache invalidation
  baseVersionId: string;
  verses: Verse[];                   // current draft verses
  dirtyVerseNumbers: number[];       // which verses changed surface text → re-tokenize
}

export type PublishOutput =
  | { ok: true; newVersionId: string; newVersionNumber: number }
  | { ok: false; error: "stale_publish"; currentActiveId: string | null }
  | { ok: false; error: string };

export async function publish(input: PublishInput): Promise<PublishOutput> {
  const admin = await requireAdminUser();

  // Step 1: re-tokenize verses whose verse_number is in dirtyVerseNumbers
  let processedVerses = input.verses;
  if (input.dirtyVerseNumbers.length > 0) {
    try {
      processedVerses = await retokenizeVerses(input.verses, input.dirtyVerseNumbers);
    } catch (err) {
      // Re-tokenization failure is non-fatal: publish with existing tokens
      // This follows SPEC #18 intent — "best effort" re-link; never block publish
      console.error("[publish] retokenize error (continuing with existing tokens):", err);
    }
  }

  // Step 2: renumber verses 1..N contiguously by start_time_ms (covers insert/delete)
  processedVerses = renumberVerses(processedVerses);

  // Step 3: atomic publish
  try {
    const result = await publishLyricsVersion({
      songVersionId: input.songVersionId,
      editorId: admin.id,
      baseVersionId: input.baseVersionId,
      verses: processedVerses,
      source: "human",
    });

    // Step 4: invalidate public cache
    await revalidateSongCache(input.slug);

    return {
      ok: true,
      newVersionId: result.newVersionId,
      newVersionNumber: result.newVersionNumber,
    };
  } catch (err) {
    if (err instanceof StalePublishError) {
      return {
        ok: false,
        error: "stale_publish",
        currentActiveId: err.currentActiveId,
      };
    }
    const msg = err instanceof Error ? err.message : "unknown";
    return { ok: false, error: msg.slice(0, 200) };
  }
}

// ---------------------------------------------------------------------------
// Internal: re-tokenize dirty verses via kuroshiro + re-link vocab_item_id
// ---------------------------------------------------------------------------

async function retokenizeVerses(
  verses: Verse[],
  dirtyNumbers: number[]
): Promise<Verse[]> {
  const dictPath = path.resolve(
    process.cwd(),
    "node_modules/@sglkc/kuromoji/dict"
  );
  await initKuroshiro({ dictPath });

  const out: Verse[] = [];
  for (const v of verses) {
    if (!dirtyNumbers.includes(v.verse_number)) {
      out.push(v);
      continue;
    }

    // Build surface text from existing tokens (reliable if tokens haven't been re-ordered)
    const surfaceText = v.tokens.map((t) => t.surface).join("");
    if (!surfaceText.trim()) {
      out.push(v);
      continue;
    }

    // Re-tokenize via kuromoji
    const rawTokens = await tokenizeLyrics(surfaceText);

    // Map kuromoji POS → GrammarType
    const newTokens: Token[] = [];
    for (const rt of rawTokens) {
      const grammar = posToGrammarType(rt.pos);
      const grammarColor = grammarTypeToColor(grammar);

      // Look up vocabulary_items by (dictionary_form=basic_form, reading)
      const vocabItemId = await lookupOrCreateVocabId(
        rt.basic_form,
        rt.reading,
        rt.romaji
      );

      // Find the existing token for this surface (if any) to preserve meaning/jlpt_level
      const existingToken = v.tokens.find((t) => t.surface === rt.surface);

      newTokens.push({
        surface: rt.surface,
        reading: rt.reading,
        romaji: rt.romaji,
        grammar,
        grammar_color: grammarColor,
        meaning: existingToken?.meaning ?? { en: "" },
        jlpt_level: existingToken?.jlpt_level ?? "unknown",
        // vocab_item_id is on VocabEntry not Token — stored at lesson.vocabulary level
        // token-level lookup is used for cross-song progress; attach as optional field
        ...(vocabItemId ? ({ vocab_item_id: vocabItemId } as unknown as object) : {}),
      } as Token);
    }

    out.push({ ...v, tokens: newTokens });
  }
  return out;
}

/**
 * Map kuromoji Japanese POS tag to GrammarType.
 * kuromoji POS values: 名詞, 動詞, 形容詞, 副詞, 助詞, 感動詞, 接続詞, 記号, etc.
 */
function posToGrammarType(pos: string): GrammarType {
  if (pos === "名詞") return "noun";
  if (pos === "動詞") return "verb";
  if (pos === "形容詞" || pos === "形容動詞") return "adjective";
  if (pos === "副詞") return "adverb";
  if (pos === "助詞") return "particle";
  if (pos === "接続詞" || pos === "感動詞") return "expression";
  return "other";
}

function grammarTypeToColor(g: GrammarType): GrammarColor {
  const map: Record<GrammarType, GrammarColor> = {
    noun: "blue",
    verb: "red",
    adjective: "green",
    adverb: "orange",
    particle: "grey",
    expression: "orange",
    other: "none",
  };
  return map[g];
}

/**
 * Look up a vocabulary_items row by (dictionary_form, reading).
 * On miss: create a new row with available data. Returns the row id or null on error.
 *
 * Rule 1 fix: vocabulary_items requires romaji + part_of_speech (NOT NULL columns);
 * include them in the insert to avoid constraint violations.
 */
async function lookupOrCreateVocabId(
  dictionaryForm: string,
  reading: string,
  romaji: string
): Promise<string | null> {
  try {
    const r = await db.execute<{ id: string }>(sql`
      SELECT id::text AS id FROM vocabulary_items
      WHERE dictionary_form = ${dictionaryForm} AND reading = ${reading}
      LIMIT 1
    `);
    const rows = Array.isArray(r) ? r : (r.rows ?? []);
    if (rows[0]?.id) return rows[0].id;

    // Miss: create new vocabulary_items row
    // Include romaji + part_of_speech (NOT NULL) + meaning (NOT NULL jsonb)
    const newId = crypto.randomUUID();
    await db.execute(sql`
      INSERT INTO vocabulary_items
        (id, dictionary_form, reading, romaji, part_of_speech, meaning, created_at)
      VALUES
        (${newId}::uuid, ${dictionaryForm}, ${reading}, ${romaji},
         'other', '{"en":""}'::jsonb, now())
      ON CONFLICT (dictionary_form, reading) DO NOTHING
    `);

    // Re-read in case ON CONFLICT skipped (another concurrent insert won):
    const r2 = await db.execute<{ id: string }>(sql`
      SELECT id::text AS id FROM vocabulary_items
      WHERE dictionary_form = ${dictionaryForm} AND reading = ${reading}
      LIMIT 1
    `);
    const rows2 = Array.isArray(r2) ? r2 : (r2.rows ?? []);
    return rows2[0]?.id ?? null;
  } catch {
    // vocab lookup is best-effort — never block publish
    return null;
  }
}
