/**
 * Phase 14.4 D-13 + D-14 — Streak-saver saved toast.
 *
 * Client-only (useEffect gate prevents SSR conditional rendering — RESEARCH Pitfall 7).
 * Reads streak_saver_pending from isPending prop passed from server.
 * Auto-dismiss 5s; reduced-motion = static banner with manual close only (D-14).
 * Calls clearStreakSaverPending after showing once — no re-render on next session.
 *
 * Toast framing is celebratory, NOT corrective (D-23 product philosophy).
 *
 * Token discipline (D-19): all colors via var(--color-*).
 * M1 invariant (D-20): dismiss button is never disabled; pointer-events always active.
 * Tap target (D-21): dismiss button has min 44×44px.
 */
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { clearStreakSaverPending } from "@/app/actions/userPrefs";

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

interface StreakSaverToastProps {
  userId: string;
  streakSavedTo: number;
  /** streak_saver_pending from server — determines whether toast should appear */
  isPending: boolean;
}

export function StreakSaverToast({ userId, streakSavedTo, isPending }: StreakSaverToastProps) {
  const t = useTranslations("common");
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();

  // eslint-disable-next-line react-hooks/set-state-in-effect -- useEffect gate required for SSR/hydration safety (RESEARCH Pitfall 7)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    if (isPending) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
      // Clear the pending flag so toast doesn't re-render on next session
      clearStreakSaverPending().catch(() => {});
    }
  }, [isPending, userId]);

  useEffect(() => {
    if (!visible || reduced) return; // D-14: no auto-dismiss for reduced-motion users
    const id = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(id);
  }, [visible, reduced]);

  // SSR renders nothing — client mounts and shows if pending (Pitfall 7)
  if (!mounted || !visible) return null;

  return (
    <div
      data-testid="streak-saver-toast"
      role="status"
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-card-2)] px-4 py-3 shadow-[var(--shadow-lg)] border border-[var(--color-border)]"
      style={{ maxWidth: "min(90vw, 400px)" }}
    >
      <span aria-hidden="true" className="text-lg">🛡️</span>
      <span className="text-sm font-medium text-[var(--color-text)]">
        {t("streakSaver.saved", { n: streakSavedTo })}
      </span>
      <button
        aria-label={t("streakSaver.dismiss")}
        onClick={() => setVisible(false)}
        className="ml-auto flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        style={{ minHeight: "44px", minWidth: "44px" }}
      >
        ×
      </button>
    </div>
  );
}
