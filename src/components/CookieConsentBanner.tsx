"use client";

/**
 * CookieConsentBanner — Phase 18 PECR-compliant cookie consent banner.
 *
 * SSR flash prevention: RootLayout reads the kb_consent cookie server-side
 * and passes it as `initialConsent`. If set, this component returns null
 * immediately — no client-side flash (Pitfall 1 mitigation).
 *
 * Consent state flows via useConsentStore (Zustand) and is persisted
 * by the recordConsent() server action (writes kb_consent cookie + DB row).
 *
 * Accessibility:
 *   - role="dialog" aria-label="Cookie consent" aria-modal="false"
 *   - aria-live="polite" for screen reader announcement on mount
 *   - Focus moves to "Reject non-essential" button on mount (safer default)
 *   - Escape does NOT dismiss (PECR requires explicit choice)
 *   - Tab order: Reject → Accept → Cookie Policy link
 *
 * REQ-PRIV-COOKIE-05, T-18-05-04
 */

import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { useConsentStore } from "@/lib/consent/store";
import { recordConsent } from "@/app/actions/consent";
import { Button } from "@/components/ui/Button";

interface CookieConsentBannerProps {
  /** kb_consent cookie value read SSR-side in RootLayout. Prevents hydration flash. */
  initialConsent: string | undefined;
}

export function CookieConsentBanner({ initialConsent }: CookieConsentBannerProps) {
  const { state, setGranted, setRejected } = useConsentStore();
  const rejectButtonRef = useRef<HTMLButtonElement>(null);

  // Focus the "Reject" button on mount for keyboard accessibility.
  // Only runs when the banner is visible (no initialConsent + state unknown).
  useEffect(() => {
    if (!initialConsent && state === "unknown") {
      rejectButtonRef.current?.focus();
    }
  }, [initialConsent, state]);

  // SSR flash prevention: if kb_consent is already set (from SSR cookie read),
  // or the user has already made a choice this session, render nothing.
  if (initialConsent || state !== "unknown") return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-modal="false"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_-4px_20px_rgba(0,0,0,0.15)] motion-safe:translate-y-0 motion-safe:transition-transform motion-safe:duration-200"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
        <p className="text-sm leading-[1.5] text-[var(--color-text-muted)] sm:flex-1">
          We use cookies for essential functionality and, with your consent, analytics to improve KitsuBeat.{" "}
          <a
            href="/legal/cookie-policy"
            className="underline text-[var(--color-accent-readable)] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
          >
            Cookie Policy
          </a>
        </p>
        {/* Button order: Reject first (keyboard focus default), Accept second */}
        <div className="flex flex-shrink-0 gap-2">
          <Button
            ref={rejectButtonRef}
            variant="secondary"
            size="sm"
            onClick={async () => {
              await recordConsent("rejected");
              posthog.opt_out_capturing();
              setRejected();
            }}
          >
            Reject non-essential
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={async () => {
              await recordConsent("granted");
              posthog.opt_in_capturing();
              setGranted();
            }}
          >
            Accept all cookies
          </Button>
        </div>
      </div>
    </div>
  );
}
