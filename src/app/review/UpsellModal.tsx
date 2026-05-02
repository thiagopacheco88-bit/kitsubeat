"use client";

import Link from "next/link";
import {
  Modal,
  ModalContent,
  ModalTitle,
  ModalDescription,
} from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Upsell modal for free users who click "Start Review".
 *
 * Phase 14 Plan 14-07: migrated from inline `fixed inset-0` shell to the
 * Modal primitive (Radix Dialog substrate). Radix handles focus trap, ESC,
 * scroll lock, aria-modal, restored focus, portal mounting.
 *
 * Upgrade link points at /profile until Phase 10/v3 ships the real upgrade flow.
 */
export default function UpsellModal({ open, onClose }: Props) {
  return (
    <Modal
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <ModalContent className="max-w-sm text-center">
        <ModalTitle>Cross-song review is premium</ModalTitle>
        <ModalDescription>
          Review every word you have mastered across all songs with FSRS-tuned
          scheduling. Upgrade to unlock your daily queue.
        </ModalDescription>
        <div className="mt-6 flex gap-3">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            className="flex-1"
          >
            Maybe later
          </Button>
          <Link
            href="/profile"
            className="inline-flex h-11 min-h-11 flex-1 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-sm font-semibold [color:white] shadow-[var(--shadow-button-red)] transition-colors hover:bg-[var(--color-accent)]/90"
          >
            Upgrade
          </Link>
        </div>
      </ModalContent>
    </Modal>
  );
}
