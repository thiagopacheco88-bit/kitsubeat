/**
 * Kana selection logic — KANA-05 weight table, KANA-07 session builder,
 * + the distractor picker for multiple-choice questions.
 *
 * Pure functions: no React, no DOM, no Zustand, no DB. Exhaustively covered
 * by `__tests__/selection.test.ts`.
 *
 * Owner: Phase 09 plan 02.
 */

import type { KanaChar, MasteryMap, Script } from "./types";

/**
 * One eligible draw — a kana char paired with the active script + the
 * mastery snapshot that produced its sampling weight.
 */
export interface EligibleChar {
  char: KanaChar;
  stars: number;
  weight: number;
  /** Which glyph the UI should render (relevant for `mixed`-mode sessions). */
  script: Script;
}

/**
 * KANA-05: stars -> sampling weight.
 *
 * Anchor points:
 * - weightFor(0)  === 10  (heaviest — learning-mode bias)
 * - weightFor(5)  === 5
 * - weightFor(10) === 1   (mastered floor; 1/5 of weightFor(5))
 *
 * Out-of-range inputs are clamped: -1 -> 0 (weight 10), 11 -> 10 (weight 1).
 */
export function weightFor(stars: number): number {
  const s = Math.max(0, Math.min(10, stars));
  if (s <= 0) return 10;
  if (s >= 10) return 1;
  return 10 - s;
}

/**
 * O(n) prefix-sum weighted sample.
 *
 * Caller invariant: `pool.length >= 1`. (For the 0-element case, callers in
 * this module short-circuit BEFORE calling pickWeighted — see
 * `buildKanaSession` returning [] on empty pool.)
 *
 * `rng` defaults to `Math.random` so production paths need no setup; tests
 * inject a deterministic `rng` to lock specific selections.
 */
export function pickWeighted<T extends { weight: number }>(
  pool: T[],
  rng: () => number = Math.random,
): T {
  const total = pool.reduce((s, x) => s + x.weight, 0);
  let r = rng() * total;
  for (const x of pool) {
    r -= x.weight;
    if (r <= 0) return x;
  }
  return pool[pool.length - 1]; // floating-point safety net
}

/**
 * KANA-07: Build a session of `questionCount` (default 20) eligible draws.
 *
 * Eligibility filter:
 * - `script: "hiragana"` -> only chars whose `rowId` is in `unlockedRows.hiragana`
 * - `script: "katakana"` -> only chars whose `rowId` is in `unlockedRows.katakana`
 * - `script: "mixed"`    -> union of both, with each appearance carrying the
 *   right `script` so the UI knows which glyph to render
 *
 * Mastery is read via the script-correct key (`c.hiragana` vs `c.katakana`).
 *
 * Empty pool -> returns []. The caller is responsible for ensuring at least
 * one row is unlocked before invoking this.
 *
 * Duplicates within a session ARE allowed by design — this is a weighted
 * with-replacement draw so that low-mastery chars surface repeatedly.
 */
export function buildKanaSession(params: {
  script: Script | "mixed";
  mastery: { hiragana: MasteryMap; katakana: MasteryMap };
  unlockedRows: { hiragana: Set<string>; katakana: Set<string> };
  chart: KanaChar[];
  questionCount?: number;
  rng?: () => number;
}): EligibleChar[] {
  const {
    script,
    mastery,
    unlockedRows,
    chart,
    questionCount = 20,
    rng = Math.random,
  } = params;

  const pool: EligibleChar[] = [];
  for (const c of chart) {
    if (
      (script === "hiragana" || script === "mixed") &&
      unlockedRows.hiragana.has(c.rowId)
    ) {
      const stars = mastery.hiragana[c.hiragana] ?? 0;
      pool.push({ char: c, stars, weight: weightFor(stars), script: "hiragana" });
    }
    if (
      (script === "katakana" || script === "mixed") &&
      unlockedRows.katakana.has(c.rowId)
    ) {
      const stars = mastery.katakana[c.katakana] ?? 0;
      pool.push({ char: c, stars, weight: weightFor(stars), script: "katakana" });
    }
  }
  if (pool.length === 0) return [];
  return Array.from({ length: questionCount }, () => pickWeighted(pool, rng));
}

/**
 * Build a list of `count` (default 3) wrong-answer romaji for a multiple-
 * choice question.
 *
 * Guarantees:
 * - never includes `correctRomaji`
 * - all entries are unique (homophones like ぢ/じ -> "ji" dedupe)
 * - drawn only from `unlockedRows` (UI never shows romaji from locked rows)
 * - if pool size < `count`, returns whatever's available (caller renders fewer
 *   options) — by design; never throws
 *
 * `script` is currently unused in selection logic (distractors are romaji
 * strings, and `unlockedRows` already encodes the script choice). Reserved on
 * the signature so future variants (e.g. cross-script confusables) stay
 * source-compatible.
 */
export function buildDistractors(params: {
  correctRomaji: string;
  script: Script;
  unlockedRows: Set<string>;
  chart: KanaChar[];
  count?: number;
  rng?: () => number;
}): string[] {
  const {
    correctRomaji,
    script,
    unlockedRows,
    chart,
    count = 3,
    rng = Math.random,
  } = params;
  void script; // reserved — see JSDoc above

  const romajiSet = new Set<string>();
  for (const c of chart) {
    if (unlockedRows.has(c.rowId) && c.romaji !== correctRomaji) {
      romajiSet.add(c.romaji);
    }
  }

  // Fisher-Yates shuffle, then take the first `count`.
  const pool = [...romajiSet];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
