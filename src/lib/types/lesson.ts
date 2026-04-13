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

export interface Token {
  surface: string;
  reading: string;
  romaji: string;
  grammar: GrammarType;
  grammar_color: GrammarColor;
  meaning: string;
  jlpt_level: JlptLevel;
}

export interface Verse {
  verse_number: number;
  start_time_ms: number;
  end_time_ms: number;
  tokens: Token[];
  translations: Record<string, string>;
  literal_meaning: string;
  cultural_context?: string;
}

export interface VocabEntry {
  surface: string;
  reading: string;
  romaji: string;
  part_of_speech: "noun" | "verb" | "adjective" | "adverb" | "particle" | "expression";
  jlpt_level: JlptLevel;
  meaning: string;
  example_from_song: string;
  additional_examples: string[];
}

export interface GrammarPoint {
  name: string;
  jlpt_reference: string;
  explanation: string;
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
