import { describe, it, expect } from "vitest";
import { detectOverlap } from "./timing-overlap";

describe("detectOverlap", () => {
  it("returns [] for empty input", () => {
    expect(detectOverlap([])).toEqual([]);
  });

  it("returns [] for single verse with valid timing", () => {
    expect(
      detectOverlap([{ verse_number: 1, start_time_ms: 0, end_time_ms: 1000 }])
    ).toEqual([]);
  });

  it("returns [] for contiguous (non-overlapping) verses", () => {
    expect(
      detectOverlap([
        { verse_number: 1, start_time_ms: 0, end_time_ms: 1000 },
        { verse_number: 2, start_time_ms: 1000, end_time_ms: 2000 },
      ])
    ).toEqual([]);
  });

  it("flags overlap when v2.start_ms < v1.end_ms", () => {
    const w = detectOverlap([
      { verse_number: 1, start_time_ms: 0, end_time_ms: 1500 },
      { verse_number: 2, start_time_ms: 1000, end_time_ms: 2000 },
    ]);
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ verseNumber: 2, kind: "overlap" });
  });

  it("flags non_monotonic when v2.start_ms < v1.start_ms", () => {
    const w = detectOverlap([
      { verse_number: 1, start_time_ms: 1000, end_time_ms: 2000 },
      { verse_number: 2, start_time_ms: 500, end_time_ms: 800 },
    ]);
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ verseNumber: 2, kind: "non_monotonic" });
  });

  it("flags degenerate when start_ms > end_ms on same verse", () => {
    const w = detectOverlap([
      { verse_number: 1, start_time_ms: 1500, end_time_ms: 1000 },
    ]);
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ verseNumber: 1, kind: "degenerate" });
  });

  it("emits multiple warnings independently", () => {
    const w = detectOverlap([
      { verse_number: 1, start_time_ms: 0, end_time_ms: 1000 },
      { verse_number: 2, start_time_ms: 800, end_time_ms: 1500 }, // overlap
      { verse_number: 3, start_time_ms: 600, end_time_ms: 700 }, // non_monotonic
    ]);
    expect(w.length).toBeGreaterThanOrEqual(2);
  });
});
