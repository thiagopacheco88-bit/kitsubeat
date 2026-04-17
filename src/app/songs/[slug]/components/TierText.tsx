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
 *   forceKanjiOnly=true  → effectiveTier = 3 (surface only), beats stored tier
 *   forceTier1=true      → effectiveTier = 1 (full), beats stored tier
 *   Neither              → effectiveTier = tier prop
 */

import type { Tier } from "@/lib/fsrs/tier";
import type { VocabInfo } from "@/lib/exercises/generator";

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
}

export default function TierText({
  vocab,
  tier,
  mode: _mode,
  forceTier1 = false,
  forceKanjiOnly = false,
}: TierTextProps) {
  // Compute effective tier respecting leak-override precedence
  const effectiveTier: Tier = forceTier1 ? 1 : forceKanjiOnly ? 3 : tier;

  // Pure-kana edge case: surface === reading → no furigana to show
  const isPureKana = vocab.surface === vocab.reading;

  return (
    <span className="inline-flex flex-col items-center leading-tight">
      {/* Surface (kanji / kana) — always shown */}
      <span className="font-medium">{vocab.surface}</span>

      {/* Furigana — shown at Tier 1 and Tier 2, omitted for pure-kana words */}
      {effectiveTier <= 2 && !isPureKana && (
        <span className="text-xs text-gray-400">{vocab.reading}</span>
      )}

      {/* Romaji — shown at Tier 1 only */}
      {effectiveTier === 1 && (
        <span className="text-xs text-gray-500">{vocab.romaji}</span>
      )}
    </span>
  );
}
