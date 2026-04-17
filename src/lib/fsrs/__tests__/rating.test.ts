import { describe, it, expect } from "vitest";
import { ratingFor, RATING_WEIGHTS, type FSRSRating } from "../rating";
import type { ExerciseType } from "@/lib/exercises/generator";

describe("ratingFor", () => {
  describe("wrong answer always returns 1 (Again)", () => {
    const exerciseTypes: ExerciseType[] = [
      "vocab_meaning",
      "meaning_vocab",
      "reading_match",
      "fill_lyric",
    ];

    for (const type of exerciseTypes) {
      it(`${type} wrong → 1`, () => {
        expect(ratingFor(type, false)).toBe(1);
      });
    }
  });

  describe("correct answers honor RATING_WEIGHTS table", () => {
    it("vocab_meaning correct → 3 (Good)", () => {
      expect(ratingFor("vocab_meaning", true)).toBe(3);
    });

    it("meaning_vocab correct → 4 (Easy)", () => {
      expect(ratingFor("meaning_vocab", true)).toBe(4);
    });

    it("reading_match correct → 2 (Hard)", () => {
      expect(ratingFor("reading_match", true)).toBe(2);
    });

    it("fill_lyric correct → 3 (Good)", () => {
      expect(ratingFor("fill_lyric", true)).toBe(3);
    });
  });

  describe("weight ordering invariant", () => {
    it("meaning_vocab (production-flavored) correct >= reading_match (pure-surface) correct", () => {
      expect(ratingFor("meaning_vocab", true)).toBeGreaterThanOrEqual(
        ratingFor("reading_match", true)
      );
    });
  });

  describe("reveal hatch (revealedReading) always returns 1", () => {
    it("revealedReading: true with correct: true → 1 (Again)", () => {
      expect(ratingFor("reading_match", true, { revealedReading: true })).toBe(1);
    });

    it("revealedReading: true with correct: false → 1 (Again)", () => {
      expect(ratingFor("reading_match", false, { revealedReading: true })).toBe(1);
    });

    it("revealedReading: true on vocab_meaning with correct → 1", () => {
      expect(ratingFor("vocab_meaning", true, { revealedReading: true })).toBe(1);
    });
  });

  describe("RATING_WEIGHTS constant", () => {
    it("has entries for all 4 exercise types", () => {
      const keys = Object.keys(RATING_WEIGHTS) as ExerciseType[];
      expect(keys).toContain("vocab_meaning");
      expect(keys).toContain("meaning_vocab");
      expect(keys).toContain("reading_match");
      expect(keys).toContain("fill_lyric");
    });

    it("all weights are valid FSRSRating values (1|2|3|4)", () => {
      for (const weight of Object.values(RATING_WEIGHTS)) {
        expect([1, 2, 3, 4]).toContain(weight);
      }
    });
  });
});
