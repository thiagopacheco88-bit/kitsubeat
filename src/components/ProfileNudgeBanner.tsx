"use client";

/**
 * ProfileNudgeBanner — Phase 18 existing-user profile completion nudge.
 *
 * Non-blocking prompt for users who signed up before Phase 18 (no date_of_birth).
 * Shown inline on /profile page — NOT viewport-fixed.
 * Dismissible via localStorage; no DB record needed (UX preference only).
 *
 * T-18-05-03: localStorage dismissal is UX preference; no security decision tied to it.
 *
 * REQ-MINORS-31 (non-blocking nudge for existing users — Pitfall 3 mitigation)
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

const NUDGE_DISMISSED_KEY = "kb_profile_nudge_dismissed";

interface ProfileNudgeBannerProps {
  /** Authenticated user ID — kept for future analytics/telemetry use. */
  userId: string;
}

export function ProfileNudgeBanner({ userId: _userId }: ProfileNudgeBannerProps) {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setDismissed(localStorage.getItem(NUDGE_DISMISSED_KEY) === "true");
    }
  }, []);

  function handleDismiss() {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(NUDGE_DISMISSED_KEY, "true");
    }
  }

  // SSR guard: render nothing until mounted (prevents hydration mismatch)
  if (!mounted || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3"
    >
      <p className="text-sm text-[var(--color-text-muted)]">
        Help us keep KitsuBeat safe — complete your profile to confirm your age.
      </p>
      <a href="/onboarding/age-gate">
        <Button variant="secondary" size="sm">
          Complete profile
        </Button>
      </a>
      <button
        aria-label="Dismiss profile prompt"
        onClick={handleDismiss}
        style={{ minHeight: "44px", minWidth: "44px" }}
        className="flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 rounded"
      >
        &times;
      </button>
    </div>
  );
}
