/**
 * Unit tests for spot-check-tv-onsets.ts — SPEC-REQ-4 validation gate.
 *
 * TDD RED phase — defines the per-verse onset comparison contract:
 *   - PASS when delta is within ±tolerance
 *   - FAIL when delta exceeds ±tolerance
 *   - SKIP when start_time_ms === 0 (no TV claim from deriver)
 *   - Negative deltas (lesson claims earlier than audio) are handled correctly
 *
 * Tests use synthetic lesson + stem JSON; no real catalog data needed.
 */

import { describe, it, expect } from "vitest";
import { checkVerseOnsets, type VerseOnsetResult } from "./spot-check-tv-onsets.js";

// ---------------------------------------------------------------------------
// Synthetic data helpers
// ---------------------------------------------------------------------------

function makeLesson(verses: Array<{ start_time_ms: number; tokens: Array<{ surface: string; romaji?: string }> }>) {
  return {
    jlpt_level: "N3",
    difficulty_tier: "beginner",
    verses: verses.map((v, i) => ({
      verse_number: i + 1,
      start_time_ms: v.start_time_ms,
      end_time_ms: v.start_time_ms + 3000,
      tokens: v.tokens,
      translations: { en: "test" },
    })),
    vocabulary: [],
    grammar_points: [],
  };
}

function makeTiming(words: Array<{ word: string; start: number; end: number }>) {
  return {
    words: words.map(w => ({ ...w, score: 1.0 })),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("checkVerseOnsets", () => {
  it("Test 1: delta within ±500ms → PASS (delta=100ms)", async () => {
    // Lesson says verse starts at 1000ms; audio onset (first matched char) is at 1100ms
    // delta = 1000 - 1100 = -100ms → |delta| = 100 ≤ 500 → PASS
    const lesson = makeLesson([
      { start_time_ms: 1000, tokens: [{ surface: "ka", romaji: "ka" }] },
    ]);
    const timing = makeTiming([
      { word: "か", start: 1.1, end: 1.5 },
    ]);

    const results = await checkVerseOnsets(lesson, timing, 500);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("PASS");
    // delta = lesson.start_time_ms - predicted_onset_ms = 1000 - 1100 = -100
    expect(results[0].deltaMs).toBe(-100);
    expect(Math.abs(results[0].deltaMs)).toBeLessThanOrEqual(500);
  });

  it("Test 2: delta 700ms → FAIL", async () => {
    // Lesson says start=2000ms; audio onset is at 2700ms
    // delta = 2000 - 2700 = -700ms → |delta| = 700 > 500 → FAIL
    const lesson = makeLesson([
      { start_time_ms: 2000, tokens: [{ surface: "sa", romaji: "sa" }] },
    ]);
    const timing = makeTiming([
      { word: "さ", start: 2.7, end: 3.0 },
    ]);

    const results = await checkVerseOnsets(lesson, timing, 500);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("FAIL");
    expect(results[0].deltaMs).toBe(-700);
    expect(Math.abs(results[0].deltaMs)).toBeGreaterThan(500);
  });

  it("Test 3: start_time_ms === 0 → SKIP (no TV claim, not FAIL)", async () => {
    // Verses with start_time_ms=0 are low-coverage emissions from the NW deriver;
    // the deriver explicitly disclaims timing for these. Failing them is a false positive.
    const lesson = makeLesson([
      { start_time_ms: 0, tokens: [{ surface: "no", romaji: "no" }] },
    ]);
    const timing = makeTiming([
      { word: "の", start: 1.0, end: 1.2 },
    ]);

    const results = await checkVerseOnsets(lesson, timing, 500);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("SKIP");
    // SKIP entries do NOT have a deltaMs (or it is null/undefined)
    expect(results[0].deltaMs == null || results[0].deltaMs === 0).toBe(true);
  });

  it("Test 4: negative delta (lesson earlier than audio onset) is correctly computed", async () => {
    // Lesson claims start=5000ms; audio onset is at 5600ms
    // delta = 5000 - 5600 = -600ms → |delta| = 600 > 500 → FAIL with negative delta
    const lesson = makeLesson([
      { start_time_ms: 5000, tokens: [{ surface: "mi", romaji: "mi" }] },
    ]);
    const timing = makeTiming([
      { word: "み", start: 5.6, end: 5.9 },
    ]);

    const results = await checkVerseOnsets(lesson, timing, 500);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("FAIL");
    // Negative delta: lesson claims earlier than audio
    expect(results[0].deltaMs).toBe(-600);
    expect(results[0].deltaMs).toBeLessThan(0);
    expect(Math.abs(results[0].deltaMs)).toBeGreaterThan(500);
  });
});
