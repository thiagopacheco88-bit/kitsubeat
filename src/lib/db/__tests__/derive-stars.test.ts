/**
 * Phase 08.1-02 — deriveStars unit coverage.
 *
 * Pure-function test of the read-time star derivation. Stars are NEVER stored
 * (per Phase 08-01 decision); they're computed from the two best-accuracy
 * columns on user_song_progress.
 *
 * Encodes the STAR-02 -> STAR-03 ordering invariant:
 *   - 2 stars  : ex1_2_3 >= 0.80 AND ex4 >= 0.80
 *   - 1 star   : ex1_2_3 >= 0.80 AND (ex4 < 0.80 OR null)
 *   - 0 stars  : ex1_2_3 < 0.80 (no matter what ex4 is — star 2 is gated on star 1)
 *   - 0 stars  : ex1_2_3 null   (star 1 not earned)
 */

import { describe, it, expect } from "vitest";
import { deriveStars } from "@/lib/db/schema";

interface Case {
  ex1_2_3: number | null;
  ex4: number | null;
  expected: 0 | 1 | 2;
  rationale: string;
}

const CASES: Case[] = [
  {
    ex1_2_3: 0.80,
    ex4: 0.80,
    expected: 2,
    rationale: "both at exactly the 0.80 threshold -> 2 stars (>= comparison, not >)",
  },
  {
    ex1_2_3: 1.0,
    ex4: 1.0,
    expected: 2,
    rationale: "perfect accuracy -> 2 stars",
  },
  {
    ex1_2_3: 0.80,
    ex4: 0.79,
    expected: 1,
    rationale: "ex4 just under threshold -> only 1 star",
  },
  {
    ex1_2_3: 0.80,
    ex4: null,
    expected: 1,
    rationale: "ex4 not yet attempted -> 1 star (star 1 earned, star 2 gated on ex4)",
  },
  {
    ex1_2_3: 0.79,
    ex4: 0.80,
    expected: 0,
    rationale:
      "ex1_2_3 below STAR-02 threshold; star 1 not earned, so star 2 cannot be earned either (STAR-02 -> STAR-03 ordering invariant)",
  },
  {
    ex1_2_3: null,
    ex4: null,
    expected: 0,
    rationale: "no attempts yet -> 0 stars",
  },
  {
    ex1_2_3: null,
    ex4: 0.95,
    expected: 0,
    rationale:
      "ex1_2_3 null means star 1 not earned; STAR-03's star 2 is gated on star 1 (STAR-02 -> STAR-03 ordering invariant)",
  },
  {
    ex1_2_3: 0,
    ex4: 0,
    expected: 0,
    rationale: "all zero -> 0 stars",
  },
];

describe("deriveStars", () => {
  it.each(CASES)(
    "ex1_2_3=$ex1_2_3, ex4=$ex4 -> $expected ($rationale)",
    ({ ex1_2_3, ex4, expected }) => {
      const result = deriveStars({
        ex1_2_3_best_accuracy: ex1_2_3,
        ex4_best_accuracy: ex4,
      });

      // Runtime equality
      expect(result).toBe(expected);

      // Compile-time type assertion: deriveStars returns 0 | 1 | 2.
      // `satisfies` keeps the literal type narrow without widening.
      const narrow = result satisfies 0 | 1 | 2;
      expect([0, 1, 2]).toContain(narrow);
    }
  );
});
