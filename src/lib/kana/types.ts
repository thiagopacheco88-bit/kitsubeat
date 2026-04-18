/**
 * Kana subsystem data contracts.
 *
 * These are the data contracts for the kana subsystem. Anything that touches
 * kana (selection, mastery, store, UI) imports from here. Pure type-only
 * declarations — no runtime logic.
 *
 * Owner: Phase 09 plan 01.
 */

export type Script = "hiragana" | "katakana";

export type RowKind = "base" | "dakuten" | "handakuten" | "yoon";

/**
 * Top-level session/UI mode discriminator.
 * - "hiragana" / "katakana": only that script is shown / drilled.
 * - "mixed": both scripts share the same session.
 *
 * Defined here (not in any UI component) so the landing page (plan 09-04)
 * and the session route (plan 09-05) can both import it without depending
 * on each other. Both plans live in wave 3 — keeping this type in
 * `src/lib/kana/types.ts` (owned by plan 09-01) preserves their parallelism.
 */
export type KanaMode = "hiragana" | "katakana" | "mixed";

export interface KanaChar {
  hiragana: string;     // single grapheme for base/dakuten/handakuten; 2-char string for yoon (e.g. "きゃ")
  katakana: string;     // matching katakana glyph
  romaji: string;       // Modified Hepburn — see Notes below
  rowId: string;        // canonical row id: "a", "ka", "sa", "ta", "na", "ha", "ma", "ya", "ra", "wa", "n",
                        //                   "ga", "za", "da", "ba", "pa",
                        //                   "kya", "sha", "cha", "nya", "hya", "mya", "rya",
                        //                   "gya", "ja", "bya", "pya"
  rowKind: RowKind;
  rowOrder: number;     // 0-based unlock order; matches the gojūon → dakuten → handakuten → yōon sequence
}

export interface KanaRow {
  id: string;
  kind: RowKind;
  label: string;        // human label shown in the grid header (e.g. "a-row", "ga-row (dakuten)")
  order: number;        // identical to rowOrder of its members
  chars: KanaChar[];    // ordered for grid layout (e.g. a-row = [a, i, u, e, o])
}

export type MasteryMap = Record<string, number>; // kana char -> stars 0..10
