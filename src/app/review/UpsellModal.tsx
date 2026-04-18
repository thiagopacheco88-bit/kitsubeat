"use client";

import { useEffect } from "react";
import Link from "next/link";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Upsell modal for free users who click "Start Review".
 *
 * Minimal Tailwind dialog — no Radix/Headless UI dependency per CONTEXT.
 * Upgrade link points at /profile until Phase 10/v3 ships the real upgrade flow.
 * Closes on backdrop click and ESC keydown.
 */
export default function UpsellModal({ open, onClose }: Props) {
  // ESC key handler
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-900 p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-white">
          Cross-song review is premium
        </h2>
        <p className="mt-2 text-sm text-gray-300">
          Review every word you have mastered across all songs with FSRS-tuned
          scheduling. Upgrade to unlock your daily queue.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
          >
            Maybe later
          </button>
          <Link
            href="/profile"
            className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
          >
            Upgrade
          </Link>
        </div>
      </div>
    </div>
  );
}
