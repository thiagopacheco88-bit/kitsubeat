export type VerbClass = "godan" | "ichidan" | "irregular";

export type ConjFormId =
  // Polite forms (Tier 1 — always unlocked)
  | "polite_present"        // tabemasu
  | "polite_negative"       // tabemasen
  | "polite_past"           // tabemashita
  | "polite_past_negative"  // tabemasen deshita
  // Plain forms (Tier 2)
  | "plain_present"         // taberu (dictionary form)
  | "plain_negative"        // tabenai
  | "plain_past"            // tabeta
  | "plain_past_negative"   // tabenakatta
  // Extended forms (Tier 2)
  | "te_form"               // tabete
  | "tai_form"              // tabetai (want to)
  // Potential (Tier 3)
  | "potential"             // taberaremasu (can)
  // Grammar patterns (Tier 3)
  | "beki"                  // taberu beki desu (should)
  | "nakereba";             // tabenakerebanarimasen (must)

export type ConjCategory = "polite" | "plain" | "extended" | "grammar_pattern";

export interface ConjFormMeta {
  id: ConjFormId;
  category: ConjCategory;
  label: string;
  /** Which sentence frame to use: "present" or "past" */
  sentenceKey: "present" | "past";
  order: number;
}

export const FORM_META: Record<ConjFormId, ConjFormMeta> = {
  polite_present:        { id: "polite_present",        category: "polite",          label: "Present polite",           sentenceKey: "present", order: 0 },
  polite_negative:       { id: "polite_negative",       category: "polite",          label: "Negative polite",          sentenceKey: "present", order: 1 },
  polite_past:           { id: "polite_past",           category: "polite",          label: "Past polite",              sentenceKey: "past",    order: 2 },
  polite_past_negative:  { id: "polite_past_negative",  category: "polite",          label: "Past negative polite",     sentenceKey: "past",    order: 3 },
  plain_present:         { id: "plain_present",         category: "plain",           label: "Plain present",            sentenceKey: "present", order: 4 },
  plain_negative:        { id: "plain_negative",        category: "plain",           label: "Plain negative",           sentenceKey: "present", order: 5 },
  plain_past:            { id: "plain_past",            category: "plain",           label: "Plain past",               sentenceKey: "past",    order: 6 },
  plain_past_negative:   { id: "plain_past_negative",   category: "plain",           label: "Plain past negative",      sentenceKey: "past",    order: 7 },
  te_form:               { id: "te_form",               category: "extended",        label: "Te-form",                  sentenceKey: "present", order: 8 },
  tai_form:              { id: "tai_form",              category: "extended",        label: "Want to (~tai)",           sentenceKey: "present", order: 9 },
  potential:             { id: "potential",             category: "extended",        label: "Potential (can)",          sentenceKey: "present", order: 10 },
  beki:                  { id: "beki",                  category: "grammar_pattern", label: "Should (~beki)",           sentenceKey: "present", order: 11 },
  nakereba:              { id: "nakereba",              category: "grammar_pattern", label: "Must (~nakereba)",         sentenceKey: "present", order: 12 },
};

/** Form groups shown as mode selector on landing page */
export const FORM_GROUPS: { id: ConjCategory; label: string; forms: ConjFormId[] }[] = [
  {
    id: "polite",
    label: "Polite forms",
    forms: ["polite_present", "polite_negative", "polite_past", "polite_past_negative"],
  },
  {
    id: "plain",
    label: "Plain forms",
    forms: ["plain_present", "plain_negative", "plain_past", "plain_past_negative", "te_form", "tai_form"],
  },
  {
    id: "extended",
    label: "Potential & want",
    forms: ["potential", "tai_form"],
  },
  {
    id: "grammar_pattern",
    label: "Should & must",
    forms: ["beki", "nakereba"],
  },
];

export interface VerbSentence {
  jp_pre: string;  // Japanese before the blank
  jp_post: string; // Japanese after the blank
  en: string;      // English translation with ___ for the verb slot
}

export interface VerbEntry {
  id: string;
  dict: string;         // 食べる
  reading: string;      // たべる (furigana)
  romaji: string;       // taberu
  meaning: string;      // "to eat"
  verbClass: VerbClass;
  jlptLevel: "N5" | "N4";
  order: number;
  presentSentence: VerbSentence;
  pastSentence: VerbSentence;
  vocab_item_id?: string;
}

/** Mastery key: `${verbId}:${formId}` → stars 0..10 */
export type VerbMasteryMap = Record<string, number>;
