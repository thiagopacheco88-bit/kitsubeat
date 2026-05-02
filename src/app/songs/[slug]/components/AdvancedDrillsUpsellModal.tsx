"use client";

import Link from "next/link";
import {
  Modal,
  ModalContent,
  ModalTitle,
  ModalDescription,
} from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/**
 * Phase 10 Plan 06 — Advanced Drills tab-open upsell modal.
 *
 * Phase 14 Plan 14-05 — migrated to consume the <Modal> primitive (Radix
 * Dialog substrate). Radix handles ESC, focus trap, scroll lock, and the
 * aria-modal/role="dialog" attributes; the per-family copy + props +
 * onClose contract are unchanged.
 *
 * Quota families (locked — see feature-flags.ts QUOTA_LIMITS):
 *   - listening        → 10 songs per free user (drives Listening Drill / Ex 6)
 *   - advanced_drill   →  3 songs per free user (shared Grammar Conjugation + Sentence Order)
 *
 * Copy is commit-as-locked: changing these strings requires updating the E2E
 * assertions in tests/e2e/advanced-drill-quota.spec.ts in the same PR. This
 * brittleness is deliberate — copy is the user-facing contract for FREE-05.
 *
 * The data-testid="advanced-drills-upsell-modal" + data-family attributes
 * are preserved on ModalContent so tests/e2e/advanced-drill-quota.spec.ts
 * (Phase 10-06 regression guard) keeps finding the rendered modal.
 */
interface Props {
  family: "listening" | "advanced_drill";
  quotaUsed: number;
  quotaLimit: number;
  onClose: () => void;
  onUpgrade: () => void;
}

export default function AdvancedDrillsUpsellModal({
  family,
  quotaUsed,
  quotaLimit,
  onClose,
  onUpgrade,
}: Props) {
  // Copy-as-contract: label and body change based on family, numbers bound to
  // props so future tuning of QUOTA_LIMITS doesn't require a copy edit.
  const familyLabel =
    family === "listening" ? "Listening Drill" : "Advanced Drill";
  const bodyDrillName =
    family === "listening"
      ? "Listening Drill"
      : "Grammar Conjugation + Sentence Order";
  const heading = `You've used your free ${familyLabel} songs`;
  const body = `Free users get ${quotaLimit} songs of ${bodyDrillName} practice. Upgrade to Premium for unlimited access.`;

  return (
    <Modal
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <ModalContent
        className="max-w-md text-center"
        data-testid="advanced-drills-upsell-modal"
        data-family={family}
      >
        <ModalTitle>{heading}</ModalTitle>
        <ModalDescription>{body}</ModalDescription>

        {/* Quota indicator — shown for transparency ("10 of 10 used"). */}
        <p
          className="mt-4 text-xs uppercase tracking-wider text-[var(--color-text-dim)]"
          data-testid="upsell-quota-indicator"
        >
          {quotaUsed} of {quotaLimit} used
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:gap-3">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            className="flex-1"
          >
            Not now
          </Button>
          <Link
            href="/profile"
            onClick={onUpgrade}
            className="inline-flex h-11 min-h-11 flex-1 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] shadow-[var(--shadow-button-red)] transition-colors hover:bg-[var(--color-accent)]/90"
          >
            Upgrade to Premium
          </Link>
        </div>
      </ModalContent>
    </Modal>
  );
}
