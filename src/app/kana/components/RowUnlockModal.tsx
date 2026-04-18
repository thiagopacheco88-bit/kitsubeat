"use client";

import { useEffect } from "react";

interface Props {
  rowLabel: string; // e.g. "ka-row" or "ga-row (dakuten)"
  onClose: () => void;
}

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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Row unlocked"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="max-w-sm rounded-xl bg-white p-6 text-center shadow-2xl dark:bg-zinc-900">
        <div className="text-5xl mb-3" aria-hidden="true">
          🎉
        </div>
        <h2 className="text-xl font-bold mb-2">New row unlocked!</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-6">
          You unlocked the <strong>{rowLabel}</strong>. Keep going!
        </p>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
