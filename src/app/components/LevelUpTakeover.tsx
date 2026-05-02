"use client";

import { useEffect } from "react";
import { playLevelUpSFX, triggerHaptic } from "@/lib/sfx";
import {
  Modal,
  ModalContent,
  ModalTitle,
} from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

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
 *
 * Phase 14 Plan 14-07 migration notes:
 * - Inline fixed-inset overlay shell replaced with Modal primitive (Radix Dialog
 *   substrate). Radix supplies focus trap, ESC handling, scroll lock, aria-modal,
 *   portal mount, and restored focus automatically. The dismiss-on-Escape
 *   contract is PRESERVED (now inherited from the primitive).
 * - The orange Continue button is now Button variant=primary, which consumes
 *   --color-accent (the celebratory red tone). Per planner D-19, accent red
 *   carries the same weight as orange in a full-screen takeover.
 * - All decorative palette utilities (orange + gray text + drop-shadow + bare
 *   white) tokenized via --color-text / --color-text-muted / --color-accent.
 * - PRESERVED VERBATIM (per CONTEXT D-27 + threat T-14-07-01/02):
 *   - .level-pop class on the headline
 *   - canvas-confetti call with disableForReducedMotion: true
 *   - data-testid="level-up-continue" on the Continue button
 *   - data-testid="level-up-takeover" on the outer container (now ModalContent)
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

    // motion-catalog: confetti milestone — disableForReducedMotion already applied
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

  return (
    <Modal
      open={visible}
      onOpenChange={(isOpen) => {
        if (!isOpen) onDismiss();
      }}
    >
      <ModalContent
        className="max-w-md bg-transparent shadow-none p-0"
        data-testid="level-up-takeover"
      >
        <div
          className="flex flex-col items-center gap-6 px-8 py-12 text-center"
          aria-label={`Level up to ${newLevel}`}
        >
          {/* Animated headline — .level-pop keyframe preserved verbatim per D-27 */}
          <ModalTitle>
            <span
              className="level-pop inline-block text-7xl font-black text-[var(--color-text)] [filter:drop-shadow(0_4px_12px_rgba(0,0,0,0.5))]"
              aria-live="assertive"
            >
              LEVEL {newLevel}!
            </span>
          </ModalTitle>

          <p className="text-xl font-semibold text-[var(--color-accent)]">
            {"🦊"} You leveled up!
          </p>

          <p className="max-w-xs text-sm text-[var(--color-text-muted)]">
            Keep going — your next reward unlocks at a higher level.
          </p>

          {/* Dismiss button */}
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={onDismiss}
            data-testid="level-up-continue"
            className="mt-4"
          >
            Continue
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
