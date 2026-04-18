/**
 * Kana mastery rules — KANA-03 + KANA-06.
 *
 * Pure functions: no React, no DOM, no Zustand, no DB. These rules are the
 * single source of truth for star deltas and row-unlock predicates and are
 * exhaustively covered by `__tests__/mastery.test.ts`.
 *
 * Owner: Phase 09 plan 02.
 */

import type { KanaRow, MasteryMap, Script } from "./types";
import { ROW_UNLOCK_MASTERY_PCT, ROW_UNLOCK_MIN_STARS } from "./chart";

/**
 * KANA-03: Update a per-char star count after a single answer.
 *
 * - correct -> +1
 * - wrong   -> -2
 * - clamped to [0, 10]
 */
export function applyStarDelta(current: number, correct: boolean): number {
  const next = correct ? current + 1 : current - 2;
  return Math.max(0, Math.min(10, next));
}

/**
 * KANA-06 helper: a row is "mastered" when at least
 * `ROW_UNLOCK_MASTERY_PCT` (default 80%) of its chars are at
 * `>= ROW_UNLOCK_MIN_STARS` (default 5) stars.
 *
 * The row's chars are looked up against the active-script key:
 * - `script === "hiragana"` -> `scriptMastery[c.hiragana]`
 * - `script === "katakana"` -> `scriptMastery[c.katakana]`
 *
 * Defensive: an empty row counts as mastered (vacuous truth) so that callers
 * that filter the chart to a subset don't need extra guards.
 */
export function isRowMastered(
  row: KanaRow,
  scriptMastery: MasteryMap,
  script: Script,
): boolean {
  if (row.chars.length === 0) return true;
  const threshold = Math.ceil(row.chars.length * ROW_UNLOCK_MASTERY_PCT);
  let masteredCount = 0;
  for (const c of row.chars) {
    const key = script === "hiragana" ? c.hiragana : c.katakana;
    if ((scriptMastery[key] ?? 0) >= ROW_UNLOCK_MIN_STARS) {
      masteredCount += 1;
    }
  }
  return masteredCount >= threshold;
}

/**
 * KANA-06: Derive the set of unlocked row ids from current mastery.
 *
 * Strictly monotonic + sequential:
 * - The first row in `rows` is ALWAYS unlocked (KANA-04 self-teaching mechanism).
 * - Each subsequent row unlocks ONLY when its predecessor is mastered.
 * - The walk MUST `break` at the first non-mastered row — non-contiguous
 *   mastery does NOT skip ahead to later rows.
 *
 * `rows` is expected sorted by `row.order` (HIRAGANA_ROWS / KATAKANA_ROWS
 * already are).
 */
export function computeUnlockedRows(
  rows: KanaRow[],
  scriptMastery: MasteryMap,
  script: Script,
): Set<string> {
  const unlocked = new Set<string>();
  if (rows.length === 0) return unlocked;
  unlocked.add(rows[0].id);
  for (let i = 0; i < rows.length - 1; i++) {
    if (isRowMastered(rows[i], scriptMastery, script)) {
      unlocked.add(rows[i + 1].id);
    } else {
      break;
    }
  }
  return unlocked;
}
