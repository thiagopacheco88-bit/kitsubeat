// Phase 11.6 Wave 0 RED stub — implementation lands later in this plan (Task 2/3). DO NOT delete the failing assertions.

import { describe, it, expect } from "vitest";
import { sortByJlpt, JLPT_RANK, type JlptLevel } from "../scheduler";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

interface Item {
  id: string;
  jlptLevel: JlptLevel;
}

function makeItem(id: string, jlptLevel: JlptLevel): Item {
  return { id, jlptLevel };
}

// ---------------------------------------------------------------------------
// SPEC-REQ-5: JLPT stable sort
// ---------------------------------------------------------------------------

describe("sortByJlpt — JLPT stable-sort (SPEC-REQ-5)", () => {
  it("stable-sort N5 to N1, nulls last", () => {
    const input: Item[] = [
      makeItem("a", "N3"),
      makeItem("b", "N5"),
      makeItem("c", null),
      makeItem("d", "N1"),
      makeItem("e", "N4"),
      makeItem("f", null),
      makeItem("g", "N2"),
    ];

    const result = sortByJlpt(input);

    // Expected order: N5, N4, N3, N2, N1, null, null
    const levels = result.map((r) => r.jlptLevel);
    expect(levels[0]).toBe("N5");
    expect(levels[1]).toBe("N4");
    expect(levels[2]).toBe("N3");
    expect(levels[3]).toBe("N2");
    expect(levels[4]).toBe("N1");
    expect(levels[5]).toBeNull();
    expect(levels[6]).toBeNull();

    // Verify monotonically non-decreasing JLPT_RANK for non-null entries
    const nonNullRanks = result
      .filter((r) => r.jlptLevel !== null)
      .map((r) => JLPT_RANK[r.jlptLevel as string]);
    for (let i = 1; i < nonNullRanks.length; i++) {
      expect(nonNullRanks[i]).toBeGreaterThanOrEqual(nonNullRanks[i - 1]);
    }
  });

  it("stable preserves insertion order within same JLPT level", () => {
    // Both N5 — assert relative order matches insertion order (stable sort)
    const input: Item[] = [
      makeItem("first-N5", "N5"),
      makeItem("second-N5", "N5"),
    ];

    const result = sortByJlpt(input);

    expect(result[0].id).toBe("first-N5");
    expect(result[1].id).toBe("second-N5");
  });

  it("all-null input: output equals input order (nulls stay in original order)", () => {
    const input: Item[] = [
      makeItem("x", null),
      makeItem("y", null),
      makeItem("z", null),
    ];

    const result = sortByJlpt(input);

    // Nulls should preserve insertion order (stable sort — all have the same rank 99)
    expect(result[0].id).toBe("x");
    expect(result[1].id).toBe("y");
    expect(result[2].id).toBe("z");
  });

  it("JLPT_RANK constant has the correct numeric ranking", () => {
    // N5 is beginner (1), N1 is advanced (5)
    expect(JLPT_RANK["N5"]).toBe(1);
    expect(JLPT_RANK["N4"]).toBe(2);
    expect(JLPT_RANK["N3"]).toBe(3);
    expect(JLPT_RANK["N2"]).toBe(4);
    expect(JLPT_RANK["N1"]).toBe(5);
  });
});
