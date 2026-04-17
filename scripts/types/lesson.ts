import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

/**
 * Grammar type enum — maps to color-coding system in the UI.
 */
const GrammarTypeEnum = z.enum([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "particle",
  "expression",
  "other",
]);

/**
 * Color coding for grammar types in the lesson panel.
 */
const GrammarColorEnum = z.enum(["blue", "red", "green", "orange", "grey", "none"]);

/**
 * JLPT level enum — N5 (beginner) through N1 (advanced), plus unknown.
 */
const JlptLevelEnum = z.enum(["N5", "N4", "N3", "N2", "N1", "unknown"]);

/**
 * Localizable field: multilingual object with en/pt-BR/es keys.
 */
const LocalizableSchema = z.record(z.string(), z.string()).describe(
  'Multilingual text keyed by language code: {"en": "...", "pt-BR": "...", "es": "..."}'
);

/**
 * TokenSchema: a single word token within a verse.
 * Stores kanji surface form, furigana reading, romaji, grammar info, and JLPT level.
 */
export const TokenSchema = z.object({
  surface: z.string().describe("The kanji/kana as written in the lyrics"),
  reading: z.string().describe("Hiragana reading (from kuroshiro)"),
  romaji: z.string().describe("Hepburn romaji transliteration (from kuroshiro)"),
  grammar: GrammarTypeEnum.describe("Grammatical category for color-coding"),
  grammar_color: GrammarColorEnum.describe("UI color assigned to this grammar type"),
  meaning: LocalizableSchema.describe("Multilingual meaning/gloss for this word"),
  jlpt_level: JlptLevelEnum.describe("JLPT level assigned to this token"),
});

export type Token = z.infer<typeof TokenSchema>;

/**
 * VerseSchema: one verse of the song.
 * Contains tokens (word-level breakdown), timestamps, translations, and explanations.
 */
export const VerseSchema = z.object({
  verse_number: z.number().int().min(1).describe("1-based verse index"),
  start_time_ms: z
    .number()
    .describe("Verse start time in milliseconds (from WhisperX timing pipeline)"),
  end_time_ms: z
    .number()
    .describe("Verse end time in milliseconds (from WhisperX timing pipeline)"),
  tokens: z.array(TokenSchema).describe("Word-level tokens for this verse"),
  translations: z
    .record(z.string(), z.string())
    .describe(
      'Translations keyed by language code, e.g., { "en": "...", "pt-BR": "...", "es": "..." }'
    ),
  literal_meaning: LocalizableSchema.describe(
    "Multilingual word-for-word literal breakdown of the verse"
  ),
  cultural_context: LocalizableSchema.optional().describe(
    "Multilingual cultural or emotional context note for this verse"
  ),
});

export type Verse = z.infer<typeof VerseSchema>;

/**
 * Enrichment sub-schemas — mirror shapes from scripts/types/enrich.ts but inlined here
 * to avoid cross-module imports at generation time. Used only by VocabEntrySchema.
 */
const EnrichLocalizableSchema = z.object({
  en: z.string().min(1),
  "pt-BR": z.string().min(1),
  es: z.string().min(1),
});

const EnrichKanjiCharSchema = z.object({
  char: z.string().refine((c) => [...c].length === 1, {
    message: "char must be exactly one character",
  }),
  meaning: EnrichLocalizableSchema,
  on_yomi: z.string(),
  kun_yomi: z.string(),
  jlpt_level: z.enum(["N5", "N4", "N3", "N2", "N1"]).nullable(),
  radical_hint: EnrichLocalizableSchema,
});

const EnrichKanjiBreakdownSchema = z.object({
  characters: z.array(EnrichKanjiCharSchema).min(1),
  compound_note: EnrichLocalizableSchema.optional(),
});

/**
 * VocabEntrySchema: a vocabulary word extracted from the song.
 */
export const VocabEntrySchema = z.object({
  surface: z.string().describe("The word as written in the lyrics"),
  reading: z.string().describe("Hiragana reading"),
  romaji: z.string().describe("Hepburn romaji"),
  part_of_speech: z
    .enum(["noun", "verb", "adjective", "adverb", "particle", "expression"])
    .describe("Grammatical part of speech"),
  jlpt_level: JlptLevelEnum.describe("JLPT level for this vocabulary entry"),
  meaning: LocalizableSchema.describe("Multilingual meaning"),
  example_from_song: z
    .string()
    .describe("Quoted verse text where this word appears"),
  additional_examples: z
    .array(z.string())
    .max(3)
    .describe("Up to 3 additional example sentences at lower visual prominence"),
  vocab_item_id: z
    .string()
    .uuid()
    .optional()
    .describe("UUID FK to vocabulary_items table, added by backfill script"),
  mnemonic: EnrichLocalizableSchema.optional().describe(
    "Short memory-aid sentence per language (en/pt-BR/es) — emitted by generation prompt; optional so existing lessons without enrichment still validate"
  ),
  kanji_breakdown: EnrichKanjiBreakdownSchema.nullable()
    .optional()
    .describe(
      "Per-kanji character breakdown; null when surface is kana-only; undefined when field was not emitted by the model"
    ),
});

export type VocabEntry = z.infer<typeof VocabEntrySchema>;

/**
 * GrammarPointSchema: a grammar pattern identified in the song.
 */
export const GrammarPointSchema = z.object({
  name: z.string().describe('Grammar point name, e.g., "〜ている (te-iru form)"'),
  jlpt_reference: z
    .string()
    .describe('JLPT reference level, e.g., "JLPT N4"'),
  explanation: LocalizableSchema.describe("Multilingual explanation of this grammar pattern"),
  conjugation_path: z
    .string()
    .optional()
    .describe(
      'Full conjugation path, e.g., "dictionary form → te-form → te-iru"'
    ),
});

export type GrammarPoint = z.infer<typeof GrammarPointSchema>;

/**
 * LessonSchema: the complete lesson for one song.
 * This is the structure stored in the `lesson` JSONB column in Neon Postgres.
 */
export const LessonSchema = z.object({
  jlpt_level: z
    .enum(["N5", "N4", "N3", "N2", "N1"])
    .describe("Overall JLPT level of this song — assigned by Claude during generation"),
  difficulty_tier: z
    .enum(["basic", "intermediate", "advanced"])
    .describe("UI-facing difficulty tier"),
  verses: z.array(VerseSchema).describe("All verses of the song with word-level breakdowns"),
  vocabulary: z
    .array(VocabEntrySchema)
    .describe("Key vocabulary entries extracted from the song"),
  grammar_points: z
    .array(GrammarPointSchema)
    .describe("Grammar patterns identified in the song"),
});

export type Lesson = z.infer<typeof LessonSchema>;

/**
 * JSON Schema derived from LessonSchema — used as output_config.format.schema
 * in the Anthropic Batch API call for structured output generation.
 *
 * $refStrategy: "none" inlines all $ref definitions for compatibility with Claude's
 * JSON schema validator which does not resolve external $ref pointers.
 */
export const LESSON_JSON_SCHEMA = zodToJsonSchema(LessonSchema, {
  $refStrategy: "none",
  name: "Lesson",
});

// Allow direct execution for type-check verification
// Usage: npx tsx scripts/types/lesson.ts
const _verifySchemaExport = () => {
  const testLesson: Lesson = {
    jlpt_level: "N3",
    difficulty_tier: "intermediate",
    verses: [],
    vocabulary: [],
    grammar_points: [],
  };
  const parsed = LessonSchema.safeParse(testLesson);
  if (!parsed.success) {
    throw new Error(`LessonSchema validation failed: ${parsed.error.message}`);
  }
  console.log("Lesson schema OK");
  console.log(
    `LESSON_JSON_SCHEMA has ${Object.keys(LESSON_JSON_SCHEMA).length} top-level keys`
  );
};

_verifySchemaExport();
