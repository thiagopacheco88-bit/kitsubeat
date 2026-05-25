/**
 * Counters subsystem data contracts.
 *
 * Pure type-only declarations — no runtime logic.
 * Mirrors the structure of src/lib/kana/types.ts.
 */

export type CounterCategory = "objects" | "living" | "vessels-machines" | "occurrences";

/**
 * Direction of a drill question.
 * - "num-to-reading":     show (number + counter kanji) → pick hiragana form
 * - "reading-to-meaning": show (number-kanji + counter kanji) → pick what it counts
 * - "example-to-counter": show (number + example object) → pick which counter to use
 *   Only drawn when ≥2 counters are unlocked; trains the key skill of choosing
 *   the right counter rather than just reciting its reading or meaning.
 */
export type DrillDirection = "num-to-reading" | "reading-to-meaning" | "example-to-counter";

/** Hiragana readings for 1–10 of a single counter. All 10 are required. */
export type CounterForms = Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10, string>;

export interface Counter {
  id: string;             // e.g. "hon", "mai"
  kanji: string;          // e.g. "本"
  reading: string;        // base reading shown in tile e.g. "hon"
  what: string;           // short English gloss e.g. "long/thin objects"
  examples: string[];     // 2–3 concrete examples e.g. ["pen", "bottle"]
  category: CounterCategory;
  order: number;          // 0-based unlock order
  forms: CounterForms;    // hiragana for 1–10
  formRomaji: CounterForms; // romaji for 1–10 (shown as primary in MCQ options)
}

/** One drill item drawn for a session. */
export interface CounterQuestion {
  counter: Counter;
  number: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  direction: DrillDirection;
  weight: number;         // sampling weight at draw time
  /** Populated only when direction === "example-to-counter". */
  example?: string;
}

/** counter.id → stars 0..10 */
export type CounterMasteryMap = Record<string, number>;
