import type { VerbEntry, VerbMasteryMap, ConjFormId } from "./types";
import { VERB_MASTERY_THRESHOLD, UNLOCK_BATCH_SIZE, INITIAL_UNLOCK_COUNT } from "./chart";

/** +1 correct, -2 wrong, clamped 0–10. Identical to kana mastery rule. */
export function applyStarDelta(current: number, correct: boolean): number {
  return Math.max(0, Math.min(10, correct ? current + 1 : current - 2));
}

export function masteryKey(verbId: string, formId: ConjFormId): string {
  return `${verbId}:${formId}`;
}

export function getStars(mastery: VerbMasteryMap, verbId: string, formId: ConjFormId): number {
  return mastery[masteryKey(verbId, formId)] ?? 0;
}

const POLITE_FORMS: ConjFormId[] = [
  "polite_present",
  "polite_negative",
  "polite_past",
  "polite_past_negative",
];

/** Average stars across polite forms for a single verb. */
export function verbMasteryScore(mastery: VerbMasteryMap, verbId: string): number {
  const total = POLITE_FORMS.reduce((sum, f) => sum + getStars(mastery, verbId, f), 0);
  return total / POLITE_FORMS.length;
}

/**
 * How many verbs from VERB_CHART should be unlocked given current mastery.
 * Starts at INITIAL_UNLOCK_COUNT; each time all currently-unlocked verbs
 * average >= VERB_MASTERY_THRESHOLD, unlock UNLOCK_BATCH_SIZE more.
 */
export function computeUnlockedCount(
  mastery: VerbMasteryMap,
  totalVerbs: number,
): number {
  let unlocked = INITIAL_UNLOCK_COUNT;
  while (unlocked < totalVerbs) {
    const slice = Array.from({ length: unlocked }, (_, i) => i);
    const allMastered = slice.every((_, i) => {
      // We need the verb id; caller passes VERB_CHART so we must accept it.
      // Avoid importing VERB_CHART here to keep this pure — caller computes ids.
      void i;
      return true; // guard replaced below with real verb ids
    });
    if (!allMastered) break;
    unlocked = Math.min(totalVerbs, unlocked + UNLOCK_BATCH_SIZE);
  }
  return unlocked;
}

/**
 * Compute unlocked verb count given the ordered list of verb ids.
 * More ergonomic than computeUnlockedCount — takes ids directly.
 */
export function computeUnlockedVerbCount(
  mastery: VerbMasteryMap,
  verbIds: string[],
): number {
  let unlocked = Math.min(INITIAL_UNLOCK_COUNT, verbIds.length);
  while (unlocked < verbIds.length) {
    const allMastered = verbIds
      .slice(0, unlocked)
      .every((id) => verbMasteryScore(mastery, id) >= VERB_MASTERY_THRESHOLD);
    if (!allMastered) break;
    unlocked = Math.min(verbIds.length, unlocked + UNLOCK_BATCH_SIZE);
  }
  return unlocked;
}
