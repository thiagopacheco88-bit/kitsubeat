import { describe, it, expect } from "vitest";
import { renumberVerses } from "./verse-renumber";

describe("renumberVerses", () => {
  it("returns [] for empty input", () => {
    expect(renumberVerses([])).toEqual([]);
  });

  it("leaves already-contiguous verses alone (in-order)", () => {
    const r = renumberVerses([
      { verse_number: 1, start_time_ms: 0 },
      { verse_number: 2, start_time_ms: 1000 },
    ]);
    expect(r.map((v) => v.verse_number)).toEqual([1, 2]);
  });

  it("compacts gap after delete: [1,3] -> [1,2]", () => {
    const r = renumberVerses([
      { verse_number: 1, start_time_ms: 0 },
      { verse_number: 3, start_time_ms: 2000 },
    ]);
    expect(r.map((v) => v.verse_number)).toEqual([1, 2]);
  });

  it("inserts new verse between existing (sorted by start_time_ms)", () => {
    const r = renumberVerses([
      { verse_number: 1, start_time_ms: 0 },
      { verse_number: 2, start_time_ms: 2000 },
      { verse_number: 99, start_time_ms: 1000 }, // newly inserted
    ]);
    expect(r.map((v) => v.verse_number)).toEqual([1, 2, 3]);
    expect(r.map((v) => v.start_time_ms)).toEqual([0, 1000, 2000]);
  });

  it("sorts out-of-order input by start_time_ms then renumbers", () => {
    const r = renumberVerses([
      { verse_number: 5, start_time_ms: 4000 },
      { verse_number: 1, start_time_ms: 0 },
      { verse_number: 3, start_time_ms: 2000 },
    ]);
    expect(r.map((v) => v.verse_number)).toEqual([1, 2, 3]);
    expect(r.map((v) => v.start_time_ms)).toEqual([0, 2000, 4000]);
  });

  it("preserves other verse fields", () => {
    type V = { verse_number: number; start_time_ms: number; surface: string };
    const r = renumberVerses<V>([
      { verse_number: 2, start_time_ms: 1000, surface: "B" },
      { verse_number: 1, start_time_ms: 0, surface: "A" },
    ]);
    expect(r[0].surface).toBe("A");
    expect(r[1].surface).toBe("B");
  });
});
