"use client";

import { useEffect, useCallback } from "react";
import { playLevelUpSFX, triggerHaptic } from "@/lib/sfx";

interface LevelUpTakeoverProps {
  newLevel: number;
  visible: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  onDismiss: () => void;
}

/**
 * LevelUpTakeover — full-screen celebration overlay triggered when a session
 * crosses a level threshold (result.leveledUp === true).
 *
 * Fires only when visible transitions to true (M3 guard: SessionSummary
 * controls the dismissed state, preventing re-fire on re-render).
 *
 * SFX + haptic gated on user prefs. iOS haptic is a silent no-op.
 * Confetti reuses canvas-confetti via dynamic import — same pattern as
 * StarDisplay.tsx (no second animation library — CONTEXT-locked).
 *
 * Animation: .level-pop CSS class (defined in globals.css alongside star-shine).
 */
export function LevelUpTakeover({
  newLevel,
  visible,
  soundEnabled,
  hapticsEnabled,
  onDismiss,
}: LevelUpTakeoverProps) {
  // Fire confetti + SFX + haptic when overlay becomes visible
  useEffect(() => {
    if (!visible) return;

    // Confetti burst — same pattern as StarDisplay.tsx (canvas-confetti, dynamic import)
    void import("canvas-confetti").then(({ default: confetti }) => {
      confetti({
        particleCount: 200,
        spread: 90,
        origin: { y: 0.6 },
        disableForReducedMotion: true,
      });
    });

    playLevelUpSFX(soundEnabled);
    triggerHaptic(hapticsEnabled, [120, 60, 120]);
  }, [visible, soundEnabled, hapticsEnabled]);

  // Dismiss on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss();
      }
    },
    [onDismiss]
  );

  useEffect(() => {
    if (!visible) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, handleKeyDown]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Level up to ${newLevel}`}
      data-testid="level-up-takeover"
    >
      <div className="flex flex-col items-center gap-6 px-8 py-12 text-center">
        {/* Animated headline */}
        <span
          className="level-pop inline-block text-7xl font-black text-white drop-shadow-lg"
          aria-live="assertive"
        >
          LEVEL {newLevel}!
        </span>

        <p className="text-xl text-orange-400 font-semibold">
          {"\uD83E\uDD8A"} You leveled up!
        </p>

        <p className="text-sm text-gray-300 max-w-xs">
          Keep going — your next reward unlocks at a higher level.
        </p>

        {/* Dismiss button */}
        <button
          type="button"
          onClick={onDismiss}
          className="mt-4 rounded-xl bg-orange-600 px-8 py-3 text-base font-semibold text-white hover:bg-orange-700 transition-colors"
          data-testid="level-up-continue"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
