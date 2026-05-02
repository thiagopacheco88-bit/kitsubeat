"use client";

import { useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalTitle,
} from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface Props {
  rowLabel: string; // e.g. "ka-row" or "ga-row (dakuten)"
  onClose: () => void;
}

/**
 * RowUnlockModal — celebratory overlay shown when the user unlocks a new
 * hiragana / katakana row mid-session.
 *
 * Phase 14 Plan 14-08 migration notes:
 * - Eliminated the project's only `dark:` Tailwind variant (was on the inner
 *   card per PATTERNS.md Pitfall 7 + planner correction 7). Tailwind v4's
 *   dark variant defaults to prefers-color-scheme: dark and would NOT respect
 *   the project's data-theme attribute switching. Token-driven surfaces
 *   auto-flip via the :root[data-theme="light"] override block in globals.css —
 *   no @variant dark rebinding needed.
 * - Inline `<div className="fixed inset-0 ...">` overlay shell replaced with
 *   the Modal primitive (Radix Dialog substrate). Radix supplies focus trap,
 *   ESC handling, scroll lock, aria-modal, portal mount, and restored focus.
 *   The dismiss-on-Escape contract is PRESERVED via onOpenChange.
 * - PRESERVED VERBATIM (per CONTEXT D-13 + threat T-14-08-02 + RESEARCH
 *   "Reduced-motion guard for canvas-confetti"):
 *   - canvas-confetti dynamic import
 *   - disableForReducedMotion: true on the confetti call
 *   - particleCount / spread / origin / colors arguments
 *   - autoFocus on the Continue button (now inherited from Button primitive
 *     receiving autoFocus prop)
 *
 * /* motion-catalog: confetti milestone — disableForReducedMotion already applied *\/
 */
export function RowUnlockModal({ rowLabel, onClose }: Props) {
  useEffect(() => {
    // Dynamic import — same pattern as src/app/songs/[slug]/components/StarDisplay.tsx:30-37
    let cancelled = false;
    void import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;
      confetti({
        particleCount: 200,
        spread: 120,
        origin: { y: 0.5 },
        colors: ["#FFD700", "#FFA500", "#FF6347", "#10b981"],
        disableForReducedMotion: true,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Modal
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <ModalContent className="max-w-sm text-center">
        <div className="text-5xl mb-3" aria-hidden="true">
          🎉
        </div>
        <ModalTitle>New row unlocked!</ModalTitle>
        <ModalDescription>
          You unlocked the <strong>{rowLabel}</strong>. Keep going!
        </ModalDescription>
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={onClose}
          autoFocus
          className="mt-6 w-full"
        >
          Continue
        </Button>
      </ModalContent>
    </Modal>
  );
}
