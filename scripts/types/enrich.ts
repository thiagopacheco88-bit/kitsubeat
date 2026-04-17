import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

/**
 * Localizable field shape — requires all three supported languages.
 * Kept inline here to avoid cross-boundary import from src/lib/types/lesson.ts.
 * Structurally compatible with the Localizable type used by the Next.js app.
 */
const LocalizableSchema = z.object({
  en: z.string().min(1),
  "pt-BR": z.string().min(1),
  es: z.string().min(1),
});

/**
 * JLPT level for a single kanji character — nullable because some characters
 * (rare kanji, names, etc.) are not assigned to any JLPT level.
 */
const JlptLevelSchema = z.enum(["N5", "N4", "N3", "N2", "N1"]).nullable();

/**
 * A single kanji character entry within a kanji breakdown.
 *
 * - `char`: exactly one Unicode code point. Uses spread iterator to correctly
 *   handle multi-byte CJK characters (c.length gives byte count, not code points).
 * - `on_yomi` / `kun_yomi`: kana strings; empty string ("") permitted when
 *   the reading type genuinely does not exist for this character.
 * - `radical_hint`: short visual cue, e.g. "fire + person".
 */
export const KanjiCharEntrySchema = z.object({
  char: z
    .string()
    .refine((c) => [...c].length === 1, "must be exactly one kanji character"),
  meaning: LocalizableSchema,
  on_yomi: z.string(),
  kun_yomi: z.string(),
  jlpt_level: JlptLevelSchema,
  radical_hint: LocalizableSchema,
});

/**
 * Kanji breakdown for a vocabulary word — one entry per kanji in the word.
 *
 * - `compound_note` is optional: single-kanji words don't require it.
 *   For 2+ kanji, the note bridges per-character meanings to the whole word.
 */
export const KanjiBreakdownSchema = z.object({
  characters: z.array(KanjiCharEntrySchema).min(1),
  compound_note: LocalizableSchema.optional(),
});

/**
 * Top-level enrichment object returned by the LLM.
 *
 * - `mnemonic`: always present (kana-only words still get a mnemonic).
 * - `kanji_breakdown`: null for kana-only words; populated for kanji-bearing words.
 */
export const VocabEnrichmentSchema = z.object({
  mnemonic: LocalizableSchema,
  kanji_breakdown: KanjiBreakdownSchema.nullable(),
});

export type KanjiCharEntry = z.infer<typeof KanjiCharEntrySchema>;
export type KanjiBreakdown = z.infer<typeof KanjiBreakdownSchema>;
export type VocabEnrichment = z.infer<typeof VocabEnrichmentSchema>;

/**
 * JSON Schema derived from VocabEnrichmentSchema — passed to the Anthropic
 * Messages API as structured output config so the model stays on-schema.
 */
export const ENRICH_JSON_SCHEMA = zodToJsonSchema(VocabEnrichmentSchema, {
  name: "VocabEnrichment",
  $refStrategy: "none",
});
