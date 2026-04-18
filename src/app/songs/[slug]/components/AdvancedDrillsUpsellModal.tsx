"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Phase 10 Plan 06 — Advanced Drills tab-open upsell modal.
 *
 * Rendered when a free user taps the "Advanced Drills" mode card in ExerciseTab
 * and their per-family song quota is exhausted. The session does NOT start —
 * the modal is the ONLY visible UI until the user dismisses or upgrades.
 *
 * Quota families (locked — see feature-flags.ts QUOTA_LIMITS):
 *   - listening        → 10 songs per free user (drives Listening Drill / Ex 6)
 *   - advanced_drill   →  3 songs per free user (shared Grammar Conjugation + Sentence Order)
 *
 * Copy is commit-as-locked: changing these strings requires updating the E2E
 * assertions in tests/e2e/advanced-drill-quota.spec.ts in the same PR. This
 * brittleness is deliberate — copy is the user-facing contract for FREE-05.
 *
 * Closes on backdrop click, ESC key, and "Not now" button. Upgrade CTA links
 * to /profile (mirrors src/app/review/UpsellModal.tsx — no real upgrade flow
 * ships until v3).
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
  // ESC closes. Registered once — cleanup on unmount.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="advanced-drills-upsell-heading"
      onClick={onClose}
      data-testid="advanced-drills-upsell-modal"
      data-family={family}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-7 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="advanced-drills-upsell-heading"
          className="text-xl font-semibold text-white"
        >
          {heading}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-300">{body}</p>

        {/* Quota indicator — shown for transparency ("10 of 10 used"). */}
        <p
          className="mt-4 text-xs uppercase tracking-wider text-gray-500"
          data-testid="upsell-quota-indicator"
        >
          {quotaUsed} of {quotaLimit} used
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
          >
            Not now
          </button>
          <Link
            href="/profile"
            onClick={onUpgrade}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
          >
            Upgrade to Premium
          </Link>
        </div>
      </div>
    </div>
  );
}
