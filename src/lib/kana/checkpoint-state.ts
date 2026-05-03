/**
 * Phase 14.1 kana-checkpoint display-state helper.
 *
 * Derives the rendered state of a /path KanaCheckpointNode from the
 * useKanaProgress mastery map. Per CONTEXT D-04:
 *   - locked       : MasteryMap is empty (no chars touched yet)
 *   - mastered     : >= 90% of basic-row chars at >= 7 stars
 *   - in-progress  : at least one char touched (>0 stars), but mastered ratio not yet met
 *
 * Pure: no React, no DOM, no zustand, no filesystem. Trivially unit-testable.
 * Owner: Phase 14.1 plan 03.
 */

import type { Script, MasteryMap } from "./types";
import { KANA_CHART } from "./chart";

/**
 * Basic-row character sets for each script, derived from KANA_CHART.
 *
 * Source of truth: src/lib/kana/chart.ts, where each KanaChar carries
 * `rowKind: "base" | "dakuten" | "handakuten" | "yoon"`. Filtering for
 * `rowKind === "base"` yields the 46 gojūon characters per script
 * (a-row 5 + ka-row 5 + sa-row 5 + ta-row 5 + na-row 5 + ha-row 5 +
 *  ma-row 5 + ya-row 3 + ra-row 5 + wa-row 2 + n-row 1 = 46).
 *
 * Computed once at module load (small constant work) — no re-derivation per
 * checkpoint render.
 */
const BASIC_HIRAGANA_CHARS: readonly string[] = Object.freeze(
  KANA_CHART.filter((c) => c.rowKind === "base").map((c) => c.hiragana),
);
const BASIC_KATAKANA_CHARS: readonly string[] = Object.freeze(
  KANA_CHART.filter((c) => c.rowKind === "base").map((c) => c.katakana),
);

export const BASIC_HIRAGANA_COUNT = BASIC_HIRAGANA_CHARS.length;
export const BASIC_KATAKANA_COUNT = BASIC_KATAKANA_CHARS.length;

/**
 * Per-char star floor for the "mastered" predicate.
 * Distinct from `ROW_UNLOCK_MIN_STARS` (which is 5) because checkpoint mastery
 * is a stricter milestone — closer to fluent recall than first-pass familiarity.
 */
export const MASTERY_STAR_THRESHOLD = 7;

/**
 * Ratio of basic-row chars that must be at threshold for the checkpoint to flip
 * to "mastered". 0.9 tolerates 5 weak chars in 46 (rounded up via Math.ceil to
 * 42 / 46 chars required) without losing the milestone.
 */
export const MASTERY_RATIO_THRESHOLD = 0.9;

export type CheckpointState = "locked" | "in-progress" | "mastered";

export interface CheckpointStateResult {
  state: CheckpointState;
  /** 0..100 integer — percent of basic-row chars that are at >= MASTERY_STAR_THRESHOLD. */
  progressPercent: number;
  /** Count of basic-row chars at >= MASTERY_STAR_THRESHOLD. */
  masteredCount: number;
  /** Always BASIC_HIRAGANA_COUNT or BASIC_KATAKANA_COUNT. */
  totalCount: number;
}

function getBasicCharSet(script: Script): readonly string[] {
  return script === "hiragana" ? BASIC_HIRAGANA_CHARS : BASIC_KATAKANA_CHARS;
}

export function computeCheckpointState(
  map: MasteryMap,
  script: Script,
): CheckpointStateResult {
  const basicChars = getBasicCharSet(script);
  const totalCount = basicChars.length;

  // Locked: no chars touched at all (empty map OR all-zero map).
  // Note: a map with all zeros also counts as "locked" — there's no observable
  // difference between an empty map and a map full of 0s; both signal "user
  // hasn't engaged yet."
  const touchedAtLeastOnce = Object.values(map).some((stars) => stars > 0);
  if (!touchedAtLeastOnce) {
    return { state: "locked", progressPercent: 0, masteredCount: 0, totalCount };
  }

  // Count chars at >= MASTERY_STAR_THRESHOLD.
  // IMPORTANT: only count chars that belong to the active script. The store
  // mixes hiragana + katakana keys at the top level (separate {hiragana} and
  // {katakana} maps), but if a caller ever passes a merged map, we must not
  // overcount. The basicChars set is script-specific so cross-script keys
  // (e.g., a katakana glyph in a hiragana map) are naturally excluded.
  let masteredCount = 0;
  for (const ch of basicChars) {
    if ((map[ch] ?? 0) >= MASTERY_STAR_THRESHOLD) masteredCount += 1;
  }
  const progressPercent = Math.round((masteredCount / totalCount) * 100);

  // Mastered: >= ceil(0.9 * 46) = 42 chars at threshold.
  const requiredMasteredCount = Math.ceil(
    MASTERY_RATIO_THRESHOLD * totalCount,
  );
  if (masteredCount >= requiredMasteredCount) {
    return { state: "mastered", progressPercent, masteredCount, totalCount };
  }

  return { state: "in-progress", progressPercent, masteredCount, totalCount };
}
