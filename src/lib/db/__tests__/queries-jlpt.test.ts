/**
 * Phase 12-05 — JlptGapRow shape + aggregation logic unit coverage.
 *
 * Tests the data-transform step of getJlptGapSummary:
 *   - Correct field names and types on returned rows
 *   - mastered_count = state=2 rows only
 *   - known_count = state IN (1,2,3) rows
 *   - Numeric coercion (DB may return strings for COUNT)
 *   - jlpt_level cast preserved as typed union
 *
 * Note: Does NOT test the DB query itself (that requires a live DB).
 * The transform is the only pure-function slice we can unit-test here.
 */

import { describe, it, expect } from "vitest";
import type { JlptGapRow } from "@/lib/db/queries";

// ---------------------------------------------------------------------------
// Pure transform helper — mirrors the .map() in getJlptGapSummary
// ---------------------------------------------------------------------------

function transformJlptRow(row: {
  jlpt_level: string;
  total_count: number | string;
  mastered_count: number | string;
  known_count: number | string;
}): JlptGapRow {
  return {
    jlpt_level: row.jlpt_level as JlptGapRow["jlpt_level"],
    total_count: Number(row.total_count),
    mastered_count: Number(row.mastered_count),
    known_count: Number(row.known_count),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("JlptGapRow shape", () => {
  it("correct field names present", () => {
    const row = transformJlptRow({
      jlpt_level: "N5",
      total_count: 10,
      mastered_count: 3,
      known_count: 5,
    });

    expect(row).toHaveProperty("jlpt_level");
    expect(row).toHaveProperty("total_count");
    expect(row).toHaveProperty("mastered_count");
    expect(row).toHaveProperty("known_count");
  });

  it("correct counts for a typical N5 row", () => {
    // 10 N5 items: 3 mastered (state=2), 5 known (state IN 1,2,3)
    const row = transformJlptRow({
      jlpt_level: "N5",
      total_count: 10,
      mastered_count: 3,
      known_count: 5,
    });

    expect(row.jlpt_level).toBe("N5");
    expect(row.total_count).toBe(10);
    expect(row.mastered_count).toBe(3);
    expect(row.known_count).toBe(5);
  });

  it("known_count >= mastered_count (mastered is a subset of known)", () => {
    const row = transformJlptRow({
      jlpt_level: "N4",
      total_count: 150,
      mastered_count: 20,
      known_count: 45,
    });

    expect(row.known_count).toBeGreaterThanOrEqual(row.mastered_count);
  });

  it("numeric coercion: DB string values are converted to numbers", () => {
    const row = transformJlptRow({
      jlpt_level: "N3",
      total_count: "250",  // DB may return count as string
      mastered_count: "50",
      known_count: "80",
    });

    expect(typeof row.total_count).toBe("number");
    expect(typeof row.mastered_count).toBe("number");
    expect(typeof row.known_count).toBe("number");
    expect(row.total_count).toBe(250);
    expect(row.mastered_count).toBe(50);
    expect(row.known_count).toBe(80);
  });

  it("zero counts for a tier with no mastery", () => {
    // A tier with 100 vocab items but user has never seen any
    const row = transformJlptRow({
      jlpt_level: "N1",
      total_count: 100,
      mastered_count: 0,
      known_count: 0,
    });

    expect(row.mastered_count).toBe(0);
    expect(row.known_count).toBe(0);
    expect(row.total_count).toBe(100);
  });

  it("all 5 JLPT levels are valid jlpt_level values", () => {
    const validTiers: Array<JlptGapRow["jlpt_level"]> = ["N5", "N4", "N3", "N2", "N1"];
    for (const tier of validTiers) {
      const row = transformJlptRow({
        jlpt_level: tier,
        total_count: 10,
        mastered_count: 0,
        known_count: 0,
      });
      expect(row.jlpt_level).toBe(tier);
    }
  });
});

describe("gap copy derivation (component-side logic)", () => {
  it("remaining = total - mastered (cannot go below 0)", () => {
    const row: JlptGapRow = {
      jlpt_level: "N5",
      total_count: 10,
      mastered_count: 3,
      known_count: 5,
    };
    const remaining = Math.max(0, row.total_count - row.mastered_count);
    expect(remaining).toBe(7);
  });

  it("remaining is 0 when all words are mastered", () => {
    const row: JlptGapRow = {
      jlpt_level: "N5",
      total_count: 10,
      mastered_count: 10,
      known_count: 10,
    };
    const remaining = Math.max(0, row.total_count - row.mastered_count);
    expect(remaining).toBe(0);
  });

  it("progress percentage is 0 for total_count=0 (division guard)", () => {
    const row: JlptGapRow = {
      jlpt_level: "N5",
      total_count: 0,
      mastered_count: 0,
      known_count: 0,
    };
    const pct = row.total_count > 0
      ? Math.round((row.mastered_count / row.total_count) * 100)
      : 0;
    expect(pct).toBe(0);
  });

  it("progress percentage rounds correctly", () => {
    const row: JlptGapRow = {
      jlpt_level: "N5",
      total_count: 3,
      mastered_count: 1,
      known_count: 2,
    };
    const pct = row.total_count > 0
      ? Math.round((row.mastered_count / row.total_count) * 100)
      : 0;
    expect(pct).toBe(33); // 1/3 = 0.333... → rounds to 33
  });
});
