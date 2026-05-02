// @vitest-environment jsdom
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Phase 11.6 Plan 06 — Wave 0 RED stub — track-text-rendering.test.tsx
 *
 * Covers SPEC-REQ-2: Vocabulary + Grammar tracks render romaji emphasized at
 * ALL FSRS states (no tier-based reveal). TierText should receive trackKind
 * prop and return TIER_NEW for vocab/grammar tracks regardless of FSRS state.
 *
 * These tests are RED until Task 2 (Plan 11.6-06) wires trackKind into
 * TierText and updates tierFor in tier.ts to bypass tier logic for vocab/grammar.
 *
 * Implementation target:
 *   - src/lib/fsrs/tier.ts: tierFor(state, trackKind?) → returns TIER_NEW for vocab/grammar
 *   - src/app/songs/[slug]/components/TierText.tsx: accepts trackKind prop
 */

import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import TierText from "../TierText";
import type { VocabInfo } from "@/lib/exercises/generator";
import type { TrackKind } from "@/lib/exercises/generator";

// Mock tier.ts to spy on tierFor calls
vi.mock("@/lib/fsrs/tier", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/fsrs/tier")>();
  return {
    ...actual,
    tierFor: vi.fn(actual.tierFor),
  };
});

import * as tierModule from "@/lib/fsrs/tier";

const vocabInfo: VocabInfo = {
  surface: "勉強",
  reading: "べんきょう",
  romaji: "benkyou",
  vocab_item_id: "00000000-0000-0000-0000-000000000001",
};

const kanjiVocabInfo: VocabInfo = {
  surface: "食べる",
  reading: "たべる",
  romaji: "taberu",
  vocab_item_id: "00000000-0000-0000-0000-000000000002",
};

describe("TierText track-text-rendering (Phase 11.6 SPEC-REQ-2)", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  /**
   * Test 1: Vocab track at FSRS state=0 (new) — romaji present + emphasized.
   *
   * SPEC-REQ-2: romaji is the visual emphasis at all FSRS states for vocab track.
   * TierText must render romaji when trackKind="vocab" even at a state that would
   * normally be TIER_LEARNING (state=1) or TIER_REVIEW (state=2).
   *
   * RED: TierText doesn't accept trackKind prop yet.
   */
  it("Vocab track at FSRS state=0 (new): romaji present and emphasized (font-semibold or prominent)", () => {
    render(
      <TierText
        vocab={vocabInfo}
        tier={1}
        mode="prompt"
        trackKind={"vocab" as TrackKind}
      />
    );
    // Romaji should be visible — not hidden by CSS class "hidden" or display:none
    const romajiEl = screen.getByText("benkyou");
    expect(romajiEl).toBeInTheDocument();
    expect(romajiEl).toBeVisible();
    // Romaji should carry emphasis — font-semibold, text-base, or similar
    // (Exact class TBD by implementation; test anchors on visibility + data-testid)
    expect(romajiEl).not.toHaveClass("hidden");
  });

  /**
   * Test 2: Vocab track at FSRS state=2 (review) — romaji STILL visible.
   *
   * The key SPEC-REQ-2 invariant: tier bypass means state=2 (which maps to
   * TIER_REVIEW = 3 = "kanji only") is overridden for vocab track → romaji shown.
   *
   * RED: TierText doesn't accept trackKind prop yet.
   */
  it("Vocab track at FSRS state=2 (review): romaji still visible + emphasized (tier bypass active)", () => {
    render(
      <TierText
        vocab={vocabInfo}
        tier={3}
        mode="prompt"
        trackKind={"vocab" as TrackKind}
      />
    );
    // Tier=3 (TIER_REVIEW) normally hides romaji; trackKind=vocab must override this
    const romajiEl = screen.getByText("benkyou");
    expect(romajiEl).toBeInTheDocument();
    expect(romajiEl).toBeVisible();
    expect(romajiEl).not.toHaveClass("hidden");
  });

  /**
   * Test 3: Vocab track at FSRS state=3 (relearning) — romaji STILL visible.
   *
   * state=3 maps to TIER_LEARNING (2) which hides romaji normally.
   * Vocab track bypasses this.
   *
   * RED: TierText doesn't accept trackKind prop yet.
   */
  it("Vocab track at FSRS state=3 (relearning): romaji still visible + emphasized", () => {
    render(
      <TierText
        vocab={vocabInfo}
        tier={2}
        mode="prompt"
        trackKind={"vocab" as TrackKind}
      />
    );
    // Tier=2 (TIER_LEARNING) normally hides romaji; trackKind=vocab must override
    const romajiEl = screen.getByText("benkyou");
    expect(romajiEl).toBeInTheDocument();
    expect(romajiEl).toBeVisible();
    expect(romajiEl).not.toHaveClass("hidden");
  });

  /**
   * Test 4: Kanji track question — kanji surface prominent; romaji NOT shown
   * during question phase (kanji track is romaji-production, not romaji-reading).
   *
   * For kanji track at state=2 (review), no tier bypass → normal tier behavior.
   * The kanji surface should render; romaji should NOT be visible in prompt mode.
   *
   * RED: TierText doesn't accept trackKind prop yet.
   */
  it("Kanji track at tier=3 (review): kanji surface shown; romaji hidden (no bypass for kanji track)", () => {
    render(
      <TierText
        vocab={kanjiVocabInfo}
        tier={3}
        mode="prompt"
        trackKind={"kanji" as TrackKind}
      />
    );
    // Kanji surface always shows
    expect(screen.getByText("食べる")).toBeInTheDocument();
    // Romaji should NOT be shown (tier=3 for kanji track = kanji only)
    expect(screen.queryByText("taberu")).not.toBeInTheDocument();
  });

  /**
   * Test 5: tierFor is NOT called for vocab track render path.
   *
   * SPEC-REQ-2 implementation constraint: TierText should bypass tierFor() entirely
   * when trackKind=vocab — the tier prop is effectively overridden to TIER_NEW before
   * tierFor is consulted. Asserting 0 calls to tierFor for vocab track.
   *
   * RED: TierText doesn't accept trackKind prop yet, so the bypass doesn't exist.
   */
  it("tierFor is bypassed (not called) when trackKind='vocab' is provided", () => {
    const spiedTierFor = vi.mocked(tierModule.tierFor);
    render(
      <TierText
        vocab={vocabInfo}
        tier={3}
        mode="prompt"
        trackKind={"vocab" as TrackKind}
      />
    );
    // TierText should not call tierFor for vocab track — it directly uses TIER_NEW
    expect(spiedTierFor).not.toHaveBeenCalled();
  });
});
