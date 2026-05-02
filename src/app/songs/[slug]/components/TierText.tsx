"use client";

/**
 * TierText — Single component for rendering a vocabulary word at the
 * correct progressive-disclosure tier.
 *
 * Used by every exercise surface (prompts, options, feedback panel) to apply
 * the per-vocab FSRS tier consistently.
 *
 * kana-only words render identically at all tiers:
 *   when vocab.surface === vocab.reading (e.g. すごい), the furigana line
 *   has nothing to add — it's omitted at every tier. Romaji still shows
 *   at Tier 1 for pronunciation help, but the furigana block is skipped.
 *
 * Leak-override matrix (CONTEXT-locked):
 *   forceKanjiOnly=true           → effectiveTier = 3 (surface only), beats stored tier
 *   forceTier1=true               → effectiveTier = 1 (full), beats stored tier
 *   trackKind="vocab"|"grammar"   → effectiveTier = 1 (SPEC-REQ-2 tier bypass)
 *   Neither                       → effectiveTier = tier prop
 *
 * Phase 11.6 SPEC-REQ-2: When trackKind is "vocab" or "grammar", tier-based reveal
 * is disabled — TierText returns TIER_NEW (full display) regardless of the `tier` prop.
 * This is the primary teach-romaji invariant for beginner-focused tracks.
 */

import type { Tier } from "@/lib/fsrs/tier";
import type { VocabInfo, TrackKind } from "@/lib/exercises/generator";

export interface TierTextProps {
  vocab: VocabInfo;
  tier: Tier;
  mode: "prompt" | "option" | "feedback";
  /** Force Tier 1 regardless of stored tier (feedback panel always-Tier-1 invariant) */
  forceTier1?: boolean;
  /**
   * Force "kanji only" regardless of tier.
   * Used by reading_match prompts and meaning→vocab / fill_lyric answer options
   * to prevent furigana from leaking the answer.
   */
  forceKanjiOnly?: boolean;
  /**
   * Phase 11.6 SPEC-REQ-2: Track kind from the active exercise session.
   * When "vocab" or "grammar", tier-based reveal is bypassed — effectiveTier
   * is forced to TIER_NEW (1) so romaji is always visible and emphasized.
   * Omit (or pass "kanji"/"advanced_drills") for standard tier behavior.
   */
  trackKind?: TrackKind;
}

export default function TierText({
  vocab,
  tier,
  mode: _mode,
  forceTier1 = false,
  forceKanjiOnly = false,
  trackKind,
}: TierTextProps) {
  // Phase 11.6 SPEC-REQ-2: Vocab + Grammar tracks bypass tier-based reveal.
  // This check is explicit (not delegated to tierFor) so TierText remains
  // purely presentational and does NOT call tierFor at render time.
  const isTrackBypass = trackKind === "vocab" || trackKind === "grammar";

  // Compute effective tier respecting override precedence (highest first):
  //   1. forceKanjiOnly → surface only (tier 3)
  //   2. forceTier1 OR trackKind bypass → full display (tier 1)
  //   3. tier prop → normal FSRS-driven behavior
  const effectiveTier: Tier = forceKanjiOnly ? 3 : (forceTier1 || isTrackBypass) ? 1 : tier;

  // Pure-kana edge case: surface === reading → no furigana to show
  const isPureKana = vocab.surface === vocab.reading;

  // Phase 11.6 SPEC-REQ-2: For Vocab + Grammar tracks, INVERT the surface
  // hierarchy — romaji is the primary teaching signal (large), kanji surface
  // becomes a secondary cue (small). The Kanji track keeps the standard
  // kanji-primary layout so the kanji surface stays the test target.
  if (isTrackBypass) {
    return (
      <span className="inline-flex flex-col items-center leading-tight">
        {/* Romaji — primary teaching signal */}
        <span className="text-lg font-semibold text-[var(--color-text)]">
          {vocab.romaji}
        </span>
        {/* Kanji surface — secondary cue, hidden for pure-kana to avoid duplicate */}
        {!isPureKana && (
          <span className="text-xs text-gray-400">{vocab.surface}</span>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-center leading-tight">
      {/* Surface (kanji / kana) — always shown */}
      <span className="font-medium">{vocab.surface}</span>

      {/* Furigana — shown at Tier 1 and Tier 2, omitted for pure-kana words */}
      {effectiveTier <= 2 && !isPureKana && (
        <span className="text-xs text-gray-400">{vocab.reading}</span>
      )}

      {/* Romaji — shown at Tier 1 only. */}
      {effectiveTier === 1 && (
        <span className="text-xs text-gray-500">{vocab.romaji}</span>
      )}
    </span>
  );
}
