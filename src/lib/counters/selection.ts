/**
 * Counter session selection logic.
 *
 * Pure functions — no React, no Zustand, no DOM.
 * Mirrors the structure of src/lib/kana/selection.ts.
 *
 * Each session question is one of three directions:
 *   "num-to-reading"     show number + counter → pick hiragana form
 *   "reading-to-meaning" show number-kanji + counter → pick what it counts
 *   "example-to-counter" show number + example object → pick which counter to use
 *
 * Direction mix:
 *   1 counter unlocked  → 50/50 between num-to-reading and reading-to-meaning.
 *   ≥2 counters unlocked → 33/33/33 across all three directions.
 *   example-to-counter is the key "which counter?" skill and only makes sense
 *   once there's more than one counter to choose from.
 */

import type { Counter, CounterMasteryMap, CounterQuestion, DrillDirection } from "./types";

/** KANA-05 equivalent: stars → sampling weight. 0 stars = weight 10, 10 stars = weight 1. */
export function weightFor(stars: number): number {
  const s = Math.max(0, Math.min(10, stars));
  if (s <= 0) return 10;
  if (s >= 10) return 1;
  return 10 - s;
}

/** O(n) weighted sample. Pool must be non-empty. */
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
  return pool[pool.length - 1];
}

/** All valid numbers 1–10. */
const ALL_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/**
 * Build a session of `questionCount` (default 20) questions.
 *
 * - Only draws from unlocked counters.
 * - Avoids back-to-back same counter+direction pair.
 * - Empty unlocked set → returns [].
 */
export function buildCounterSession(params: {
  mastery: CounterMasteryMap;
  unlockedIds: Set<string>;
  counters: Counter[];
  questionCount?: number;
  rng?: () => number;
}): CounterQuestion[] {
  const { mastery, unlockedIds, counters, questionCount = 20, rng = Math.random } = params;

  const eligible = counters
    .filter((c) => unlockedIds.has(c.id))
    .map((c) => ({
      counter: c,
      stars: mastery[c.id] ?? 0,
      weight: weightFor(mastery[c.id] ?? 0),
    }));

  if (eligible.length === 0) return [];

  const canMix = eligible.length >= 2;

  const result: CounterQuestion[] = [];
  for (let i = 0; i < questionCount; i++) {
    const prev = i > 0 ? result[i - 1] : null;

    // Pick direction first, then filter out the counter that would create a
    // same-counter + same-direction repeat. Fallback to full pool if needed
    // (e.g. only 1 counter is unlocked).
    const direction = pickDirection(canMix, rng);
    let candidates =
      prev && prev.direction === direction
        ? eligible.filter((e) => e.counter.id !== prev.counter.id)
        : eligible;
    if (candidates.length === 0) candidates = eligible;

    const drawn = pickWeighted(candidates, rng);
    const number = ALL_NUMBERS[Math.floor(rng() * 10)] as CounterQuestion["number"];

    // For example-to-counter, pick one of the counter's concrete examples.
    const example =
      direction === "example-to-counter"
        ? drawn.counter.examples[Math.floor(rng() * drawn.counter.examples.length)]
        : undefined;

    result.push({ counter: drawn.counter, number, direction, weight: drawn.weight, example });
  }
  return result;
}

/**
 * Pick a question direction.
 * - 1 counter unlocked (canMix=false): 50/50 between the two basic directions.
 * - ≥2 counters unlocked (canMix=true): 33/33/33 across all three directions.
 */
function pickDirection(canMix: boolean, rng: () => number): DrillDirection {
  if (!canMix) return rng() < 0.5 ? "num-to-reading" : "reading-to-meaning";
  const r = rng();
  if (r < 1 / 3) return "num-to-reading";
  if (r < 2 / 3) return "reading-to-meaning";
  return "example-to-counter";
}

/**
 * Build `count` wrong-answer options for a question.
 *
 * num-to-reading:    other hiragana forms of the SAME counter (different numbers).
 * reading-to-meaning: other counters' `what` values (from unlocked pool).
 *
 * Never includes the correct answer. Returns up to `count` unique distractors.
 */
export function buildCounterDistractors(params: {
  question: CounterQuestion;
  unlockedIds: Set<string>;
  counters: Counter[];
  count?: number;
  rng?: () => number;
}): string[] {
  const { question, unlockedIds, counters, count = 3, rng = Math.random } = params;

  let pool: string[];

  if (question.direction === "num-to-reading") {
    // Wrong forms of the same counter at different numbers.
    const correct = question.counter.forms[question.number];
    pool = ALL_NUMBERS.filter((n) => n !== question.number)
      .map((n) => question.counter.forms[n])
      .filter((f) => f !== correct);
    // Deduplicate (unlikely but safe).
    pool = [...new Set(pool)];
  } else if (question.direction === "reading-to-meaning") {
    // Wrong counter `what` values.
    const correct = question.counter.what;
    pool = counters
      .filter((c) => unlockedIds.has(c.id) && c.what !== correct)
      .map((c) => c.what);
    pool = [...new Set(pool)];
    // If not enough unlocked, include locked counters too.
    if (pool.length < count) {
      const extra = counters
        .filter((c) => !unlockedIds.has(c.id) && c.what !== correct)
        .map((c) => c.what);
      pool = [...new Set([...pool, ...extra])];
    }
  } else {
    // example-to-counter: wrong counter romaji readings.
    // The learner must pick the right counter word; distractors are other
    // counter base readings from the unlocked pool (falls back to locked).
    const correct = question.counter.reading;
    pool = counters
      .filter((c) => unlockedIds.has(c.id) && c.reading !== correct)
      .map((c) => c.reading);
    pool = [...new Set(pool)];
    if (pool.length < count) {
      const extra = counters
        .filter((c) => !unlockedIds.has(c.id) && c.reading !== correct)
        .map((c) => c.reading);
      pool = [...new Set([...pool, ...extra])];
    }
  }

  // Fisher-Yates shuffle, take first `count`.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
