/**
 * Phase 11.6 session-sequence solver — pure function.
 *
 * No I/O, no network, no DB access. Combines intros + due reviews into a
 * lag-tested, JLPT-sorted, length-capped SequencedItem[] for ExerciseTab sessions.
 *
 * CONTEXT-LOCK (D-17): session pool bounded to <=30 items per song (per-song scope).
 * CONTEXT-LOCK (D-18): intro->test gap >= minIntroToTestGap is STRICT (invariant).
 * CONTEXT-LOCK (D-18): JLPT order is best-effort within constraint envelope.
 * CONTEXT-LOCK (D-19): due reviews placed first; new intros fill remainder.
 * CONTEXT-LOCK (D-20): lengthCap is uniform across tracks (Short=10 / Long=25).
 *
 * Small-pool fallback (RESEARCH Pitfall 4): when reviews.length + intros.length
 * < minIntroToTestGap, lag MAY be violated to keep content complete.
 * Content-complete trumps strict-lag when no fillers are available.
 *
 * Algorithm: greedy interleave with pending-test queue (O(n × m), n=sequence
 * length, m=pendingTests size typically <=5 for pool sizes <=30).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** JLPT proficiency level, or null when unclassified. */
export type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1" | null;

/**
 * Maps JLPT level to a numeric sort key.
 * N5 (beginner) = 1, N1 (advanced) = 5.
 * Not in map (null/undefined) falls back to 99 via jlptKey(), sorting last.
 */
export const JLPT_RANK: Record<string, number> = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };

/** Internal: numeric sort key for a JlptLevel (null → 99, sorts last). */
const jlptKey = (lvl: JlptLevel): number => (lvl ? JLPT_RANK[lvl] : 99);

/**
 * An item in the input session pool.
 * - isNew=true  → emit an "intro" card first, then schedule a "test" at gap >= minIntroToTestGap.
 * - isNew=false → emit as a "review" (lag-immune, already learned).
 */
export interface SessionItem {
  vocabItemId: string;
  jlptLevel: JlptLevel;
  /** true = card has never been seen (new intro + test pair); false = SRS review */
  isNew: boolean;
}

/**
 * An item in the output sequence.
 * - "intro"  — LearnCard for a new word (first exposure)
 * - "test"   — Recall card for a word introduced earlier in this session
 * - "review" — SRS review of a previously learned word
 */
export interface SequencedItem {
  kind: "intro" | "test" | "review";
  item: SessionItem;
}

// ---------------------------------------------------------------------------
// Stable JLPT sort
// ---------------------------------------------------------------------------

/**
 * Stable-sorts an array of items by JLPT level: N5 first, N1 last, nulls last.
 *
 * JS Array.prototype.sort is stable per ECMA-262 (since 2019), so items with
 * the same jlptKey preserve their original insertion order.
 *
 * Returns a new array — the input is not mutated.
 */
export function sortByJlpt<T extends { jlptLevel: JlptLevel }>(items: T[]): T[] {
  return [...items].sort((a, b) => jlptKey(a.jlptLevel) - jlptKey(b.jlptLevel));
}

// ---------------------------------------------------------------------------
// Session sequence solver
// ---------------------------------------------------------------------------

/**
 * Builds an ordered sequence of items for a single exercise session.
 *
 * Input:
 *   - intros: new vocabulary items to introduce (intro + test pair per item)
 *   - reviews: SRS-due vocabulary items to review
 *   - lengthCap: maximum sequence length (Short=10 / Long=25 per D-20)
 *   - minIntroToTestGap: minimum positions between intro and its test (3 per D-18)
 *
 * Algorithm (greedy with pendingTests queue):
 *   1. Prefer to place a ready test (gap satisfied)
 *   2. Else place a due review (lag-immune — D-19: reviews come first)
 *   3. Else introduce a new card (queues a pendingTest)
 *   4. Fallback: only pendingTests remain with unmet lag → emit anyway
 *      (small-pool case per RESEARCH Pitfall 4 — content-complete > strict-lag)
 */
export function buildSessionSequence(input: {
  intros: SessionItem[];
  reviews: SessionItem[];
  lengthCap: number;
  minIntroToTestGap: number;
}): SequencedItem[] {
  // Sort each bucket by JLPT (best-effort soft sort — D-18)
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
    // Step 1: Place a ready test (lag satisfied — gap >= minIntroToTestGap).
    // findIndex so we pick the earliest-queued test that is now ready.
    const readyIdx = pendingTests.findIndex(
      (p) => sequence.length - p.introIdx >= input.minIntroToTestGap
    );
    if (readyIdx >= 0) {
      const ready = pendingTests.splice(readyIdx, 1)[0];
      sequence.push({ kind: "test", item: ready.item });
      continue;
    }

    // Step 2: Place a review (D-19 — reviews precede new intros when no ready test).
    if (reviewQueue.length > 0) {
      const item = reviewQueue.shift()!;
      sequence.push({ kind: "review", item });
      continue;
    }

    // Step 3: Introduce a new card (creates a pendingTest entry).
    if (introQueue.length > 0) {
      const item = introQueue.shift()!;
      const introIdx = sequence.length;
      sequence.push({ kind: "intro", item });
      pendingTests.push({ item, introIdx });
      continue;
    }

    // Step 4: Fallback — only pendingTests remain with unmet lag.
    // Small-pool case: emit them anyway (RESEARCH Pitfall 4).
    // Content-complete trumps strict-lag when no fillers are available.
    if (pendingTests.length > 0) {
      const fallback = pendingTests.shift()!;
      sequence.push({ kind: "test", item: fallback.item });
      continue;
    }

    break;
  }

  return sequence;
}
