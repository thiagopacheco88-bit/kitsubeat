"use client";

import { useEffect, useRef, useState } from "react";
import { useExerciseSession } from "@/stores/exerciseSession";

/**
 * VerseDominatedAnimation — Phase 11.6 D-15.
 *
 * Renders an inline overlay that shows a brief "Verse dominated!" text and
 * fires canvas-confetti from the panel's bounding box when a non-empty
 * versesDominatedNow slice arrives in the zustand store. Designed to be
 * mounted inside FeedbackPanel so the confetti burst originates from the
 * card the user just interacted with.
 *
 * Idempotency contract (SPEC-REQ-15):
 *   - Plan 11.6-05's recordVocabAnswer uses INSERT ... ON CONFLICT DO NOTHING
 *     RETURNING; on revisit/re-answer the server returns versesDominatedNow=[],
 *     so this component never receives the trigger to fire.
 *   - Plan 11.6-05 also excludes versesDominatedNow from the persist partialize
 *     so the slice is empty after a page reload — no spurious re-fire.
 *   - lastFiredRef stable-signature guard: if the same array (sorted+joined)
 *     arrives twice without an intervening clear (defensive — should not
 *     happen given clearVersesDominatedNow below, but cheap insurance against
 *     a rapid double-set race in the calling site).
 *
 * Lifecycle:
 *   1. ExerciseSession (or any recordVocabAnswer caller) sets versesDominatedNow.
 *   2. This component's useEffect detects the non-empty slice and:
 *      a. Fires canvas-confetti (dynamic import; disabled under reduced motion).
 *      b. Sets showOverlay=true for 1.2s, then back to false.
 *      c. Calls clearVersesDominatedNow() so the next answer starts clean.
 *   3. Static star icon (VerseStarIcon) renders independently, sourced from
 *      SSR-provided dominatedVerseNumbers — that's the persistent badge.
 *
 * Reduced-motion handling:
 *   - canvas-confetti respects disableForReducedMotion: true (skips the canvas).
 *   - The text overlay still renders so the celebration is preserved (D-15).
 *   - The CSS keyframe (verse-dominated-pulse) used elsewhere falls back to
 *     animation: none + static color via globals.css.
 *
 * data-testid="verse-dominated-overlay" consumed by
 * tests/e2e/verse-dominated-animation.spec.ts.
 */
export default function VerseDominatedAnimation() {
  const versesDominatedNow = useExerciseSession((s) => s.versesDominatedNow);
  const clearVersesDominatedNow = useExerciseSession(
    (s) => s.clearVersesDominatedNow
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const lastFiredRef = useRef<string>("");

  useEffect(() => {
    if (versesDominatedNow.length === 0) return;

    // Stable signature so re-fires on identical input don't double-trigger.
    // This is defense-in-depth — the calling site should clear the slice via
    // clearVersesDominatedNow(), and the lifecycle below also clears at the
    // tail. The ref guard catches any race between set and clear.
    const sig = versesDominatedNow.slice().sort((a, b) => a - b).join(",");
    if (sig === lastFiredRef.current) return;
    lastFiredRef.current = sig;

    // Confetti burst from this overlay's bounding box (StarDisplay precedent
    // at lines 31-45 — same import, same colors family swapped for amber).
    if (containerRef.current && typeof window !== "undefined") {
      const rect = containerRef.current.getBoundingClientRect();
      const originX = (rect.left + rect.width / 2) / window.innerWidth;
      const originY = (rect.top + rect.height / 2) / window.innerHeight;
      void import("canvas-confetti").then(({ default: confetti }) => {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { x: originX, y: originY },
          colors: ["#FBBF24", "#F59E0B", "#FCD34D"],
          disableForReducedMotion: true,
          ticks: 200,
        });
      });
    }

    // Show the text overlay for 1.2s, then fade out.
    setShowOverlay(true);
    const t = setTimeout(() => setShowOverlay(false), 1200);

    // Clear the slice immediately so the next answer's setVersesDominatedNow
    // sees a clean transition. The static star icon (VerseStarIcon) is the
    // persistent UI — versesDominatedNow is animation-only.
    clearVersesDominatedNow();

    return () => clearTimeout(t);
  }, [versesDominatedNow, clearVersesDominatedNow]);

  return (
    <div ref={containerRef} className="relative">
      {showOverlay && (
        <div
          className="absolute -top-8 left-0 right-0 text-center text-amber-400 font-semibold text-lg pointer-events-none"
          data-testid="verse-dominated-overlay"
          role="status"
          aria-live="polite"
        >
          Verse dominated!
        </div>
      )}
    </div>
  );
}
