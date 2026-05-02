/**
 * Phase 11.6 session-sequence solver — pure function.
 *
 * No I/O, no network, no DB access. Combines intros + due reviews into a
 * lag-tested, JLPT-sorted, length-capped Question[] for ExerciseTab sessions.
 *
 * CONTEXT-LOCK (D-17): intro->test gap is the core lag-test invariant.
 * CONTEXT-LOCK (D-18): intro->test gap >= minIntroToTestGap is STRICT (invariant).
 * CONTEXT-LOCK (D-18): JLPT order is best-effort within constraint envelope.
 * CONTEXT-LOCK (D-19): due reviews placed first; new intros fill remainder.
 * CONTEXT-LOCK (D-20): lengthCap is uniform across tracks (Short=10 / Long=25).
 *
 * Small-pool fallback (RESEARCH Pitfall 4): when reviews.length + intros.length
 * < minIntroToTestGap, lag MAY be violated to keep content complete.
 */

export type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1" | null;
export const JLPT_RANK: Record<string, number> = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };
const jlptKey = (lvl: JlptLevel): number => (lvl ? (JLPT_RANK[lvl] ?? 99) : 99);

export interface SessionItem {
  vocabItemId: string;
  jlptLevel: JlptLevel;
  isNew: boolean; // true => emit LearnCard then test (lag >=3)
}

export interface SequencedItem {
  kind: "intro" | "test" | "review";
  item: SessionItem;
}

export function sortByJlpt<T extends { jlptLevel: JlptLevel }>(items: T[]): T[] {
  // Stable-sort: items with same jlptKey preserve insertion order.
  // JS native sort IS stable per ECMA-262 (since 2019).
  return [...items].sort((a, b) => jlptKey(a.jlptLevel) - jlptKey(b.jlptLevel));
}

export function buildSessionSequence(input: {
  intros: SessionItem[];
  reviews: SessionItem[];
  lengthCap: number;
  minIntroToTestGap: number; // 3 per CONTEXT D-18
}): SequencedItem[] {
  const intros = sortByJlpt(input.intros);
  const reviews = sortByJlpt(input.reviews);
  const sequence: SequencedItem[] = [];
  const introQueue = [...intros];
  const reviewQueue = [...reviews];
  const pendingTests: Array<{ item: SessionItem; introIdx: number }> = [];

  while (
    sequence.length < input.lengthCap &&
    (introQueue.length > 0 || reviewQueue.length > 0 || pendingTests.length > 0)
  ) {
    // 1. Place a ready test (lag satisfied)
    const readyIdx = pendingTests.findIndex(
      (p) => sequence.length - p.introIdx >= input.minIntroToTestGap
    );
    if (readyIdx >= 0) {
      const ready = pendingTests.splice(readyIdx, 1)[0];
      sequence.push({ kind: "test", item: ready.item });
      continue;
    }
    // 2. Place a review (lag-immune, D-19: reviews go first)
    if (reviewQueue.length > 0) {
      const item = reviewQueue.shift()!;
      sequence.push({ kind: "review", item });
      continue;
    }
    // 3. Introduce a new card
    if (introQueue.length > 0) {
      const item = introQueue.shift()!;
      const introIdx = sequence.length;
      sequence.push({ kind: "intro", item });
      pendingTests.push({ item, introIdx });
      continue;
    }
    // 4. Fallback: only pendingTests remain with unmet lag (small-pool case).
    //    Emit them anyway — content-complete trumps strict-lag (Pitfall 4).
    if (pendingTests.length > 0) {
      const fallback = pendingTests.shift()!;
      sequence.push({ kind: "test", item: fallback.item });
      continue;
    }
    break;
  }
  return sequence;
}
