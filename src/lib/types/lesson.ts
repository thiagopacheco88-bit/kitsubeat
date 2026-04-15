export type GrammarType =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "particle"
  | "expression"
  | "other";

export type GrammarColor = "blue" | "red" | "green" | "orange" | "grey" | "none";

export type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1" | "unknown";

export type DifficultyTier = "basic" | "intermediate" | "advanced";

/** A field that can be either a plain string (legacy English-only) or a per-language map. */
export type Localizable = string | Record<string, string>;

/**
 * Extract the localized string for the given language, falling back to English
 * and then to the raw string value for legacy data.
 */
export function localize(value: Localizable, lang: string): string {
  if (typeof value === "string") return value;
  return value[lang] ?? value["en"] ?? Object.values(value)[0] ?? "";
}

export interface Token {
  surface: string;
  reading: string;
  romaji: string;
  grammar: GrammarType;
  grammar_color: GrammarColor;
  meaning: Localizable;
  jlpt_level: JlptLevel;
}

export interface Verse {
  verse_number: number;
  start_time_ms: number;
  end_time_ms: number;
  tokens: Token[];
  translations: Record<string, string>;
  literal_meaning: Localizable;
  cultural_context?: Localizable;
}

export interface VocabEntry {
  surface: string;
  reading: string;
  romaji: string;
  part_of_speech: "noun" | "verb" | "adjective" | "adverb" | "particle" | "expression";
  jlpt_level: JlptLevel;
  meaning: Localizable;
  example_from_song: string;
  additional_examples: string[];
  /** UUID FK to vocabulary_items table, added by backfill script (Phase 7 Plan 02) */
  vocab_item_id?: string;
}

export interface GrammarPoint {
  name: string;
  jlpt_reference: string;
  explanation: Localizable;
  conjugation_path?: string;
}

export interface Lesson {
  jlpt_level: "N5" | "N4" | "N3" | "N2" | "N1";
  difficulty_tier: DifficultyTier;
  verses: Verse[];
  vocabulary: VocabEntry[];
  grammar_points: GrammarPoint[];
}

export const GRAMMAR_COLOR_CLASS: Record<GrammarType, string> = {
  noun: "text-grammar-noun",
  verb: "text-grammar-verb",
  adjective: "text-grammar-adjective",
  adverb: "text-grammar-adverb",
  particle: "text-grammar-particle",
  expression: "text-grammar-expression",
  other: "text-grammar-other",
};

export const JLPT_COLOR_CLASS: Record<string, string> = {
  N5: "bg-jlpt-n5",
  N4: "bg-jlpt-n4",
  N3: "bg-jlpt-n3",
  N2: "bg-jlpt-n2",
  N1: "bg-jlpt-n1",
};
