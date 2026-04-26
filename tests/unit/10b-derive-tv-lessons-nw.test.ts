/**
 * Unit tests for the Needleman-Wunsch core in 10b-derive-tv-lessons-nw.ts
 *
 * TDD RED phase — these tests define the NW core contract.
 * The alignment module is imported from scripts/seed/10b-derive-tv-lessons-nw.ts
 * once Task 1 (GREEN) is implemented.
 */

import { describe, it, expect } from "vitest";
import { needlemanWunsch } from "../../scripts/seed/10b-derive-tv-lessons-nw.js";

const DEFAULT_OPTS = { match: 2, mismatch: -1, gap: -1 };

describe("needlemanWunsch", () => {
  it("Test 1: perfect match — 'abc' vs 'abc' returns score=6 and no gaps", () => {
    const result = needlemanWunsch("abc", "abc", DEFAULT_OPTS);

    expect(result.score).toBe(6);

    // All three positions are matches
    const matches = result.alignment.filter((a) => a.type === "match");
    const gaps = result.alignment.filter(
      (a) => a.type === "gap-a" || a.type === "gap-b"
    );

    expect(matches.length).toBe(3);
    expect(gaps.length).toBe(0);

    // Perfect traceback: position i in a matches position i in b
    for (let i = 0; i < 3; i++) {
      expect(matches[i].aIndex).toBe(i);
      expect(matches[i].bIndex).toBe(i);
    }
  });

  it("Test 2: single gap on side A — 'abc' vs 'abxc' has one gap on a", () => {
    const result = needlemanWunsch("abc", "abxc", DEFAULT_OPTS);

    // a: a b - c  (gap at index 2 of b, i.e. 'x' is unmatched in b)
    // b: a b x c
    // score: 2+2-1+2 = 5
    expect(result.score).toBe(5);

    const gapsOnA = result.alignment.filter((a) => a.type === "gap-a");
    expect(gapsOnA.length).toBe(1);
    // The gap on A corresponds to 'x' in b (bIndex = 2)
    expect(gapsOnA[0].aIndex).toBeNull();
    expect(gapsOnA[0].bIndex).toBe(2);
  });

  it("Test 3: empty side A — '' vs 'abc' returns negative score and all gaps on a", () => {
    const result = needlemanWunsch("", "abc", DEFAULT_OPTS);

    // Every char in b must be a gap on a
    expect(result.score).toBe(-3);

    const gapsOnA = result.alignment.filter((a) => a.type === "gap-a");
    // All 3 chars of b are gap-a entries
    expect(gapsOnA.length).toBe(3);
    for (const g of gapsOnA) {
      expect(g.aIndex).toBeNull();
    }
  });

  it("Test 4: verse-boundary marker survives — chars either side can still match across it", () => {
    const MARKER = "";
    // Full-lesson stream: "ab" + MARKER + "cd"
    // TV stream: "abcd" (marker is absent from TV)
    // NW should match a→a, b→b, marker→gap (mismatch/gap), c→c, d→d
    const result = needlemanWunsch(`ab${MARKER}cd`, "abcd", DEFAULT_OPTS);

    const matches = result.alignment.filter((a) => a.type === "match");
    // 'a','b','c','d' all match
    expect(matches.length).toBe(4);

    // Marker (aIndex=2) should be in a gap or mismatch — NOT a match
    const markerEntry = result.alignment.find(
      (a) => a.aIndex === 2
    );
    expect(markerEntry).toBeDefined();
    expect(markerEntry!.type).not.toBe("match");

    // Verify ab and cd matched in order
    const matchedAIndices = matches.map((m) => m.aIndex);
    expect(matchedAIndices).toContain(0); // 'a'
    expect(matchedAIndices).toContain(1); // 'b'
    expect(matchedAIndices).toContain(3); // 'c' (aIndex=3 since marker is at 2)
    expect(matchedAIndices).toContain(4); // 'd'
  });

  it("Test 5: char-index mapping — matched positions carry correct aIndex and bIndex", () => {
    // 'axb' vs 'ab': x is a gap-b or mismatch; a and b match
    // Best: a→a (match, +2), x→gap-b (-1), b→b (match, +2) = 3
    const result = needlemanWunsch("axb", "ab", DEFAULT_OPTS);

    expect(result.score).toBe(3);

    // Find the matched 'a'
    const matchA = result.alignment.find(
      (e) => e.type === "match" && e.aIndex === 0
    );
    expect(matchA).toBeDefined();
    expect(matchA!.bIndex).toBe(0); // 'a' in b is at index 0

    // Find the matched 'b'
    const matchB = result.alignment.find(
      (e) => e.type === "match" && e.aIndex === 2
    );
    expect(matchB).toBeDefined();
    expect(matchB!.bIndex).toBe(1); // 'b' in b is at index 1
  });
});
