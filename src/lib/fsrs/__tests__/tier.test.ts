import { describe, it, expect } from "vitest";
import { tierFor, TIER_NEW, TIER_LEARNING, TIER_REVIEW, type Tier } from "../tier";

describe("tierFor", () => {
  it("state 0 (New) → 1 (TIER_NEW)", () => {
    expect(tierFor(0)).toBe(1);
    expect(tierFor(0)).toBe(TIER_NEW);
  });

  it("state 1 (Learning) → 2 (TIER_LEARNING)", () => {
    expect(tierFor(1)).toBe(2);
    expect(tierFor(1)).toBe(TIER_LEARNING);
  });

  it("state 2 (Review) → 3 (TIER_REVIEW)", () => {
    expect(tierFor(2)).toBe(3);
    expect(tierFor(2)).toBe(TIER_REVIEW);
  });

  it("state 3 (Relearning) → 2 (TIER_LEARNING) — relearning collapses to learning", () => {
    expect(tierFor(3)).toBe(2);
    expect(tierFor(3)).toBe(TIER_LEARNING);
  });

  it("defensive: unknown state (e.g. 99) → 1 (TIER_NEW)", () => {
    expect(tierFor(99)).toBe(1);
    expect(tierFor(99)).toBe(TIER_NEW);
  });

  it("pure-kana note: tierFor does not branch on word shape — tierFor(0) always returns 1", () => {
    // Kana words just render the kana itself at every tier; this is a renderer concern,
    // not a tier concern. Verify tierFor returns the same value regardless.
    expect(tierFor(0)).toBe(1);
  });

  describe("constants", () => {
    it("TIER_NEW is 1", () => expect(TIER_NEW).toBe(1));
    it("TIER_LEARNING is 2", () => expect(TIER_LEARNING).toBe(2));
    it("TIER_REVIEW is 3", () => expect(TIER_REVIEW).toBe(3));
  });
});
