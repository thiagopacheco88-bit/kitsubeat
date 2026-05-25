/**
 * src/lib/counters/__tests__/selection.test.ts
 *
 * Unit tests for buildCounterSession and buildCounterDistractors.
 * All tests use a seeded deterministic rng so results are stable.
 *
 * Key invariants under test:
 *   1. "example-to-counter" never appears when only 1 counter is unlocked.
 *   2. "example-to-counter" CAN appear when ≥2 counters are unlocked.
 *   3. example-to-counter questions always carry a non-empty `example` string.
 *   4. Distractors for example-to-counter are other counter readings (not the correct one).
 *   5. Distractors for num-to-reading are other hiragana forms of the same counter.
 *   6. Distractors for reading-to-meaning are other counter `what` values.
 *   7. Distractors never contain the correct answer.
 *   8. Session length matches questionCount.
 *   9. No back-to-back identical counter + direction pair.
 */

import { describe, it, expect } from "vitest";
import { buildCounterSession, buildCounterDistractors } from "../selection";
import { COUNTERS_ORDERED } from "../chart";
import type { CounterMasteryMap } from "../types";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Simple deterministic RNG (LCG). Returns values in [0, 1). */
function makeRng(seed = 42): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0x100000000;
  };
}

/** Mastery map where all listed ids have the given stars, rest = 0. */
function mastery(pairs: [string, number][]): CounterMasteryMap {
  return Object.fromEntries(pairs);
}

// First two counters by unlock order.
const [HON, MAI] = COUNTERS_ORDERED;

// ── buildCounterSession ────────────────────────────────────────────────────────

describe("buildCounterSession", () => {
  it("returns empty array when no counters are unlocked", () => {
    // With 0 mastery only hon (order 0) is unlocked, but mastery map is empty
    // — computeUnlockedCounters always unlocks order=0. Pass an empty counter
    // list to simulate the edge case instead.
    const session = buildCounterSession({
      mastery: {},
      unlockedIds: new Set(),
      counters: [],
      questionCount: 20,
      rng: makeRng(),
    });
    expect(session).toHaveLength(0);
  });

  it("returns exactly questionCount questions", () => {
    const session = buildCounterSession({
      mastery: {},
      unlockedIds: new Set([HON.id]),
      counters: COUNTERS_ORDERED,
      questionCount: 20,
      rng: makeRng(),
    });
    expect(session).toHaveLength(20);
  });

  it("never includes example-to-counter when only 1 counter is unlocked", () => {
    // Run a large session so the absence is statistically robust.
    const session = buildCounterSession({
      mastery: {},
      unlockedIds: new Set([HON.id]),
      counters: COUNTERS_ORDERED,
      questionCount: 100,
      rng: makeRng(),
    });
    const dirs = session.map((q) => q.direction);
    expect(dirs).not.toContain("example-to-counter");
  });

  it("can include example-to-counter when ≥2 counters are unlocked", () => {
    // With 2 counters and 100 questions, at ~33% rate we'd expect ~33 hits.
    // Even a stubborn RNG should produce at least 1 out of 100 draws.
    const session = buildCounterSession({
      mastery: mastery([[HON.id, 5]]),
      unlockedIds: new Set([HON.id, MAI.id]),
      counters: COUNTERS_ORDERED,
      questionCount: 100,
      rng: makeRng(),
    });
    const hasExampleQ = session.some((q) => q.direction === "example-to-counter");
    expect(hasExampleQ).toBe(true);
  });

  it("example-to-counter questions always carry a non-empty example string", () => {
    const session = buildCounterSession({
      mastery: mastery([[HON.id, 5]]),
      unlockedIds: new Set([HON.id, MAI.id]),
      counters: COUNTERS_ORDERED,
      questionCount: 60,
      rng: makeRng(),
    });
    const exampleQs = session.filter((q) => q.direction === "example-to-counter");
    expect(exampleQs.length).toBeGreaterThan(0);
    for (const q of exampleQs) {
      expect(typeof q.example).toBe("string");
      expect(q.example!.length).toBeGreaterThan(0);
    }
  });

  it("example from the drawn counter is one of counter.examples", () => {
    const session = buildCounterSession({
      mastery: mastery([[HON.id, 5]]),
      unlockedIds: new Set([HON.id, MAI.id]),
      counters: COUNTERS_ORDERED,
      questionCount: 60,
      rng: makeRng(),
    });
    for (const q of session.filter((q) => q.direction === "example-to-counter")) {
      expect(q.counter.examples).toContain(q.example);
    }
  });

  it("no back-to-back identical counter+direction pair when ≥2 counters unlocked", () => {
    // With ≥2 counters the algorithm picks direction first then filters out the
    // counter that would create a repeat, so 0 repeats are expected.
    const session = buildCounterSession({
      mastery: mastery([[HON.id, 5]]),
      unlockedIds: new Set([HON.id, MAI.id]),
      counters: COUNTERS_ORDERED,
      questionCount: 60,
      rng: makeRng(),
    });
    const repeats = session.filter(
      (q, idx) =>
        idx > 0 &&
        session[idx - 1].counter.id === q.counter.id &&
        session[idx - 1].direction === q.direction,
    ).length;
    expect(repeats).toBe(0);
  });
});

// ── buildCounterDistractors ───────────────────────────────────────────────────

describe("buildCounterDistractors — example-to-counter", () => {
  it("returns `count` distractors", () => {
    const q = {
      counter: HON,
      number: 3 as const,
      direction: "example-to-counter" as const,
      example: "pen",
      weight: 1,
    };
    const result = buildCounterDistractors({
      question: q,
      unlockedIds: new Set([HON.id, MAI.id]),
      counters: COUNTERS_ORDERED,
      count: 3,
      rng: makeRng(),
    });
    expect(result).toHaveLength(3);
  });

  it("never includes the correct counter reading in distractors", () => {
    const q = {
      counter: HON,
      number: 1 as const,
      direction: "example-to-counter" as const,
      example: "pen",
      weight: 1,
    };
    for (let seed = 0; seed < 20; seed++) {
      const result = buildCounterDistractors({
        question: q,
        unlockedIds: new Set([HON.id, MAI.id]),
        counters: COUNTERS_ORDERED,
        count: 3,
        rng: makeRng(seed),
      });
      expect(result).not.toContain(HON.reading);
    }
  });

  it("distractors are valid counter readings from the catalogue", () => {
    const allReadings = new Set(COUNTERS_ORDERED.map((c) => c.reading));
    const q = {
      counter: HON,
      number: 2 as const,
      direction: "example-to-counter" as const,
      example: "bottle",
      weight: 1,
    };
    const result = buildCounterDistractors({
      question: q,
      unlockedIds: new Set([HON.id, MAI.id]),
      counters: COUNTERS_ORDERED,
      count: 3,
      rng: makeRng(),
    });
    for (const d of result) {
      expect(allReadings.has(d)).toBe(true);
    }
  });

  it("falls back to locked counters when unlocked pool is too thin", () => {
    // Only HON is unlocked; all distractors must come from locked counters.
    const q = {
      counter: HON,
      number: 1 as const,
      direction: "example-to-counter" as const,
      example: "pen",
      weight: 1,
    };
    const result = buildCounterDistractors({
      question: q,
      unlockedIds: new Set([HON.id]),
      counters: COUNTERS_ORDERED,
      count: 3,
      rng: makeRng(),
    });
    // Should still return 3 — pulled from the full catalogue.
    expect(result).toHaveLength(3);
    expect(result).not.toContain(HON.reading);
  });
});

describe("buildCounterDistractors — num-to-reading", () => {
  it("returns other hiragana forms of the same counter", () => {
    const q = {
      counter: HON,
      number: 3 as const,
      direction: "num-to-reading" as const,
      weight: 1,
    };
    const result = buildCounterDistractors({
      question: q,
      unlockedIds: new Set([HON.id]),
      counters: COUNTERS_ORDERED,
      count: 3,
      rng: makeRng(),
    });
    expect(result).toHaveLength(3);
    // All distractors must be hiragana forms of HON.
    const honForms = new Set(Object.values(HON.forms));
    for (const d of result) {
      expect(honForms.has(d)).toBe(true);
    }
    expect(result).not.toContain(HON.forms[3]);
  });
});

describe("buildCounterDistractors — reading-to-meaning", () => {
  it("returns other counter `what` values, never the correct one", () => {
    const q = {
      counter: HON,
      number: 1 as const,
      direction: "reading-to-meaning" as const,
      weight: 1,
    };
    const result = buildCounterDistractors({
      question: q,
      unlockedIds: new Set([HON.id, MAI.id]),
      counters: COUNTERS_ORDERED,
      count: 3,
      rng: makeRng(),
    });
    expect(result).toHaveLength(3);
    expect(result).not.toContain(HON.what);
  });
});
