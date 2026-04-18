/**
 * Phase 08.1-02 — deriveStars unit coverage.
 * Phase 10-01 — extended to 0|1|2|3 (Star 3 gated on Ex 6 Listening Drill ≥80%).
 *
 * Pure-function test of the read-time star derivation. Stars are NEVER stored
 * (per Phase 08-01 decision); they're computed from the three best-accuracy
 * columns on user_song_progress.
 *
 * Encodes the STAR-02 -> STAR-03 -> STAR-04 ordering invariant:
 *   - 3 stars  : ex1_2_3 >= 0.80 AND ex4 >= 0.80 AND ex6 >= 0.80
 *   - 2 stars  : ex1_2_3 >= 0.80 AND ex4 >= 0.80
 *   - 1 star   : ex1_2_3 >= 0.80 AND (ex4 < 0.80 OR null)
 *   - 0 stars  : ex1_2_3 < 0.80 (no matter what ex4/ex6 is — star 2/3 gated on star 1)
 *   - 0 stars  : ex1_2_3 null   (star 1 not earned)
 *
 * Also covers deriveBonusBadge (Phase 10-01): bonus badge earned when
 * both Ex 5 (Grammar Conjugation) AND Ex 7 (Sentence Order) are >= 0.80.
 */

import { describe, it, expect } from "vitest";
import { deriveStars, deriveBonusBadge } from "@/lib/db/schema";

interface Case {
  ex1_2_3: number | null;
  ex4: number | null;
  ex6: number | null;
  expected: 0 | 1 | 2 | 3;
  rationale: string;
}

const CASES: Case[] = [
  // --- Star 3 (Phase 10) ---
  {
    ex1_2_3: 0.9,
    ex4: 0.9,
    ex6: 0.9,
    expected: 3,
    rationale: "all three groups >= 0.80 -> 3 stars (STAR-04)",
  },
  {
    ex1_2_3: 0.80,
    ex4: 0.80,
    ex6: 0.80,
    expected: 3,
    rationale: "all three at exactly the threshold -> 3 stars (>= comparison, not >)",
  },
  {
    ex1_2_3: 0.9,
    ex4: 0.9,
    ex6: 0.5,
    expected: 2,
    rationale: "ex6 below threshold -> Star 3 gated, stays at 2",
  },
  {
    ex1_2_3: 0.9,
    ex4: 0.5,
    ex6: 0.9,
    expected: 1,
    rationale:
      "ex4 below threshold -> cannot skip Star 2 to reach Star 3 (STAR-03 -> STAR-04 ordering invariant)",
  },
  {
    ex1_2_3: 0.9,
    ex4: 0.9,
    ex6: null,
    expected: 2,
    rationale: "ex6 never attempted (null) treated as 0 -> stays at Star 2",
  },
  // --- Star 2 (phase 08) ---
  {
    ex1_2_3: 0.80,
    ex4: 0.80,
    ex6: null,
    expected: 2,
    rationale: "both at exactly the 0.80 threshold, no ex6 -> 2 stars",
  },
  {
    ex1_2_3: 1.0,
    ex4: 1.0,
    ex6: null,
    expected: 2,
    rationale: "perfect accuracy on ex1_2_3 + ex4, no ex6 -> 2 stars",
  },
  // --- Star 1 ---
  {
    ex1_2_3: 0.80,
    ex4: 0.79,
    ex6: null,
    expected: 1,
    rationale: "ex4 just under threshold -> only 1 star",
  },
  {
    ex1_2_3: 0.80,
    ex4: null,
    ex6: null,
    expected: 1,
    rationale: "ex4 not yet attempted -> 1 star (star 1 earned, star 2 gated on ex4)",
  },
  // --- Star 0 (various gates) ---
  {
    ex1_2_3: 0.79,
    ex4: 0.80,
    ex6: 0.95,
    expected: 0,
    rationale:
      "ex1_2_3 below STAR-02 threshold; star 1 not earned, so stars 2 and 3 cannot be earned either",
  },
  {
    ex1_2_3: null,
    ex4: null,
    ex6: null,
    expected: 0,
    rationale: "no attempts yet -> 0 stars",
  },
  {
    ex1_2_3: null,
    ex4: 0.95,
    ex6: 0.95,
    expected: 0,
    rationale:
      "ex1_2_3 null means star 1 not earned; downstream stars are gated on star 1",
  },
  {
    ex1_2_3: 0,
    ex4: 0,
    ex6: 0,
    expected: 0,
    rationale: "all zero -> 0 stars",
  },
];

describe("deriveStars", () => {
  it.each(CASES)(
    "ex1_2_3=$ex1_2_3, ex4=$ex4, ex6=$ex6 -> $expected ($rationale)",
    ({ ex1_2_3, ex4, ex6, expected }) => {
      const result = deriveStars({
        ex1_2_3_best_accuracy: ex1_2_3,
        ex4_best_accuracy: ex4,
        ex6_best_accuracy: ex6,
      });

      // Runtime equality
      expect(result).toBe(expected);

      // Compile-time type assertion: deriveStars returns 0 | 1 | 2 | 3.
      // `satisfies` keeps the literal type narrow without widening.
      const narrow = result satisfies 0 | 1 | 2 | 3;
      expect([0, 1, 2, 3]).toContain(narrow);
    }
  );

  it("legacy callers that omit ex6_best_accuracy still work (backward compat)", () => {
    // Calls that predate Phase 10 pass only ex1_2_3 + ex4 — the signature
    // keeps ex6_best_accuracy optional so those callers continue to compile.
    // Missing ex6 behaves the same as null (treated as 0, Star 3 unreachable).
    const result = deriveStars({
      ex1_2_3_best_accuracy: 0.9,
      ex4_best_accuracy: 0.9,
    });
    expect(result).toBe(2);
  });
});

describe("deriveBonusBadge", () => {
  it("returns true when both ex5 and ex7 are at threshold", () => {
    expect(
      deriveBonusBadge({ ex5_best_accuracy: 0.80, ex7_best_accuracy: 0.80 })
    ).toBe(true);
  });

  it("returns true when both are above threshold", () => {
    expect(
      deriveBonusBadge({ ex5_best_accuracy: 0.95, ex7_best_accuracy: 0.90 })
    ).toBe(true);
  });

  it("returns false when ex5 is below threshold", () => {
    expect(
      deriveBonusBadge({ ex5_best_accuracy: 0.79, ex7_best_accuracy: 0.95 })
    ).toBe(false);
  });

  it("returns false when ex7 is below threshold", () => {
    expect(
      deriveBonusBadge({ ex5_best_accuracy: 0.95, ex7_best_accuracy: 0.79 })
    ).toBe(false);
  });

  it("returns false when ex5 is null (never attempted treated as 0)", () => {
    expect(
      deriveBonusBadge({ ex5_best_accuracy: null, ex7_best_accuracy: 0.95 })
    ).toBe(false);
  });

  it("returns false when ex7 is null (never attempted treated as 0)", () => {
    expect(
      deriveBonusBadge({ ex5_best_accuracy: 0.95, ex7_best_accuracy: null })
    ).toBe(false);
  });

  it("returns false when both are null", () => {
    expect(
      deriveBonusBadge({ ex5_best_accuracy: null, ex7_best_accuracy: null })
    ).toBe(false);
  });
});
