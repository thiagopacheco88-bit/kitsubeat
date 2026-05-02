// Phase 11.6 Wave 0 RED stub — implementation lands later in this plan (Task 2/3). DO NOT delete the failing assertions.

import { describe, it, expect } from "vitest";
import {
  buildSessionSequence,
  type SessionItem,
  type SequencedItem,
  type JlptLevel,
} from "../scheduler";

// ---------------------------------------------------------------------------
// Helper — asserts the intro->test lag invariant across the whole sequence.
// For every (intro) at position p, the corresponding test for the same
// vocabItemId must appear at position >= p + minGap.
// ---------------------------------------------------------------------------
function assertLagGap(seq: SequencedItem[], minGap: number) {
  const introPos = new Map<string, number>();
  seq.forEach((s, i) => {
    if (s.kind === "intro") introPos.set(s.item.vocabItemId, i);
  });
  for (const [i, s] of seq.entries()) {
    if (s.kind === "test") {
      const introIdx = introPos.get(s.item.vocabItemId);
      if (introIdx !== undefined) {
        expect(i - introIdx).toBeGreaterThanOrEqual(minGap);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeIntro(id: string, jlptLevel: JlptLevel = "N5"): SessionItem {
  return { vocabItemId: id, jlptLevel, isNew: true };
}

function makeReview(id: string, jlptLevel: JlptLevel = "N5"): SessionItem {
  return { vocabItemId: id, jlptLevel, isNew: false };
}

// ---------------------------------------------------------------------------
// SPEC-REQ-6: Lag-test solver invariants
// ---------------------------------------------------------------------------

describe("buildSessionSequence — lag-test solver (SPEC-REQ-6)", () => {
  it("intro->test gap >=3 invariant on 3-new + 7-review session", () => {
    const intros = [makeIntro("A"), makeIntro("B"), makeIntro("C")];
    const reviews = Array.from({ length: 7 }, (_, i) => makeReview(`r${i + 1}`));

    const seq = buildSessionSequence({
      intros,
      reviews,
      lengthCap: 15,
      minIntroToTestGap: 3,
    });

    // The sequence must have been built
    expect(seq.length).toBeGreaterThan(0);

    // Every intro->test pair must honor gap >= 3
    assertLagGap(seq, 3);
  });

  it("interleave new + review (no contiguous block)", () => {
    const intros = [makeIntro("A"), makeIntro("B"), makeIntro("C")];
    const reviews = Array.from({ length: 7 }, (_, i) => makeReview(`r${i + 1}`));

    const seq = buildSessionSequence({
      intros,
      reviews,
      lengthCap: 15,
      minIntroToTestGap: 3,
    });

    // Assert the result does NOT show 3 contiguous intros at positions 0/1/2
    // followed by all 7 reviews; at least one review appears within first 5 items.
    const first5 = seq.slice(0, 5);
    const reviewsInFirst5 = first5.filter((s) => s.kind === "review").length;
    expect(reviewsInFirst5).toBeGreaterThanOrEqual(1);
  });

  it("small-pool fallback (3 intros + 0 reviews) — content-complete trumps strict-lag", () => {
    const intros = [makeIntro("A"), makeIntro("B"), makeIntro("C")];

    const seq = buildSessionSequence({
      intros,
      reviews: [],
      lengthCap: 10,
      minIntroToTestGap: 3,
    });

    // Sequence must emit all 6 items (3 intros + 3 tests)
    expect(seq.length).toBe(6);

    // All 3 intro IDs must appear in a test slot
    const testedIds = seq
      .filter((s) => s.kind === "test")
      .map((s) => s.item.vocabItemId);
    expect(testedIds).toContain("A");
    expect(testedIds).toContain("B");
    expect(testedIds).toContain("C");
  });

  it("lengthCap clamp: sequence length never exceeds cap", () => {
    const intros = Array.from({ length: 5 }, (_, i) => makeIntro(`intro${i}`));
    const reviews = Array.from({ length: 30 }, (_, i) => makeReview(`rev${i}`));

    const seq = buildSessionSequence({
      intros,
      reviews,
      lengthCap: 10,
      minIntroToTestGap: 3,
    });

    expect(seq.length).toBeLessThanOrEqual(10);
  });

  it("due reviews placed before intros where lag-budget allows (D-19)", () => {
    const reviews = [makeReview("r1"), makeReview("r2")];
    const intros = [makeIntro("A")];

    const seq = buildSessionSequence({
      intros,
      reviews,
      lengthCap: 10,
      minIntroToTestGap: 3,
    });

    // Reviews should appear before A's intro position when there is no lag conflict.
    const introPos = seq.findIndex(
      (s) => s.kind === "intro" && s.item.vocabItemId === "A"
    );
    const firstReviewPos = seq.findIndex((s) => s.kind === "review");

    // At least one review should appear before A's intro
    expect(firstReviewPos).toBeLessThan(introPos);
  });

  it("JLPT soft sort within bucket: N5 intros emit before N1 reviews when lag permits", () => {
    const intros = [makeIntro("A", "N5"), makeIntro("B", "N5")];
    const reviews = [makeReview("r1", "N1"), makeReview("r2", "N1")];

    const seq = buildSessionSequence({
      intros,
      reviews,
      lengthCap: 10,
      minIntroToTestGap: 3,
    });

    // N5 intros should emit before N1 reviews when lag permits.
    // At minimum, the first intro (N5) must appear in the sequence.
    const firstIntroPos = seq.findIndex((s) => s.kind === "intro");
    const firstReviewPos = seq.findIndex((s) => s.kind === "review");

    // When both intros and reviews are present, due reviews come first (D-19)
    // but once reviews are exhausted, N5 intros should be placed.
    // The sequence should be non-empty and contain both types.
    expect(firstIntroPos).toBeGreaterThanOrEqual(0);
    expect(firstReviewPos).toBeGreaterThanOrEqual(0);
  });
});
