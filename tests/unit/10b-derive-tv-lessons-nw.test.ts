/**
 * Unit tests for the Needleman-Wunsch core in 10b-derive-tv-lessons-nw.ts
 *
 * TDD RED phase — these tests define the NW core contract.
 * The alignment module is imported from scripts/seed/10b-derive-tv-lessons-nw.ts
 * once Task 1 (GREEN) is implemented.
 */

import { describe, it, expect } from "vitest";
import {
  needlemanWunsch,
  snapVerseOnsetToWordBoundary,
  computeVerseTimes,
} from "../../scripts/seed/10b-derive-tv-lessons-nw.js";

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

// ─────────────────────────────────────────────────────────────────────────────
// snapVerseOnsetToWordBoundary — R1 boundary-snap tests
// (11.2-followup: fix instrumental-break drift for sign-flow / the-day / uso-sid)
// ─────────────────────────────────────────────────────────────────────────────

/** Helper: build a synthetic WhisperWord */
function mkWord(word: string, startS: number, endS: number, score = 0.9) {
  return { word, start: startS, end: endS, score };
}

describe("snapVerseOnsetToWordBoundary", () => {
  it("no-op: onset before any long word — returns unchanged", () => {
    const wxWords = [
      mkWord("a", 0.5, 0.7),          // short (200ms)
      mkWord("b", 1.0, 12.5),         // long (11500ms) — starts after onset
    ];
    // onset = 300ms, before the long word starting at 500ms
    expect(snapVerseOnsetToWordBoundary(300, wxWords)).toBe(300);
  });

  it("snaps onset inside a long word to next word start (long-word case)", () => {
    // Mimics sign-flow: word 'a' spans 12336-23660ms (11324ms long word covering instrumental)
    const wxWords = [
      mkWord("心", 10.0, 12.336),
      mkWord("a",  12.336, 23.660),   // 11324ms — instrumental break absorbed into one word
      mkWord("r",  23.660, 23.720),
      mkWord("忘", 26.333, 27.174),
    ];
    // onset = 19525ms is inside the long "a" word
    const result = snapVerseOnsetToWordBoundary(19525, wxWords);
    // Should snap to next non-trivial word: "r" at 23660ms
    expect(result).toBe(23660);
  });

  it("snaps onset inside a long word — skips empty next-word, lands on substantive word", () => {
    const wxWords = [
      mkWord("a", 12.336, 23.660),    // long word
      mkWord("",  23.660, 23.670),    // empty/whitespace word — should be skipped
      mkWord("忘", 26.333, 27.174),   // substantive
    ];
    const result = snapVerseOnsetToWordBoundary(19000, wxWords);
    // Should skip empty word, land on 忘 at 26333ms
    expect(result).toBe(26333);
  });

  it("snaps onset in a long silence gap to the word after the gap", () => {
    // Mimics sign-flow: silence gap from 23740ms to 26333ms (2593ms > 2000ms threshold)
    const wxWords = [
      mkWord("t", 23.720, 23.740),    // word ending at 23740ms
      mkWord("忘", 26.333, 27.174),   // next word at 26333ms
    ];
    // onset = 25000ms falls in the 2593ms silence gap
    const result = snapVerseOnsetToWordBoundary(25000, wxWords);
    // Should snap to 忘 at 26333ms
    expect(result).toBe(26333);
  });

  it("no-op: onset in a SHORT silence gap (< threshold) — returns unchanged", () => {
    const wxWords = [
      mkWord("た", 20.0, 20.5),
      mkWord("か", 21.0, 21.5),       // 500ms gap between words (< 2000ms threshold)
    ];
    // onset = 20.7s falls in the short 500ms gap
    expect(snapVerseOnsetToWordBoundary(20700, wxWords)).toBe(20700);
  });

  it("no-op: onset exactly at word START boundary — not strictly inside — returns unchanged", () => {
    const wxWords = [
      mkWord("a", 12.0, 23.0),        // long word starting at 12000ms
    ];
    // onset = 12000ms exactly at word start (not strictly inside) → no snap
    expect(snapVerseOnsetToWordBoundary(12000, wxWords)).toBe(12000);
  });

  it("computeVerseTimes with wxWords snaps verse onsets at instrumental breaks", () => {
    // Simplified version of the sign-flow scenario:
    // verse 1 raw span ends at 12000ms, verse 2 raw start at 26000ms
    // gap-midpoint = (12000 + 26000) / 2 = 19000ms
    // 19000ms falls inside the long "a" word (12336-23660ms) → should snap to 23660ms
    const rawSpans = [
      { verseNumber: 1, startMs: 1000, endMs: 12000 },
      { verseNumber: 2, startMs: 26000, endMs: 30000 },
    ];
    const wxWords = [
      mkWord("心", 0.5, 1.0),
      mkWord("a", 12.336, 23.660),   // long instrumental word
      mkWord("忘", 26.0, 27.0),
    ];
    const result = computeVerseTimes(rawSpans, 500, wxWords);
    // verse 2 startMs should be snapped from 19000ms to 23660ms (or next word)
    const v2 = result.find((v) => v.verseNumber === 2);
    expect(v2).toBeDefined();
    // 19000ms is inside long "a" word, next word is 忘 at 26000ms (26.0s → 26000ms)
    expect(v2!.startMs).toBe(26000);
  });
});
