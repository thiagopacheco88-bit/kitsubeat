"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error); // Phase 15 — rich stack frames + source maps
    try {
      void fetch("/api/client-errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          at: new Date().toISOString(),
          url: typeof window !== "undefined" ? window.location.href : undefined,
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent : undefined,
          digest: error.digest,
          // message/stack omitted — Sentry captures full stack with source maps (Phase 15)
        }),
        keepalive: true,
      });
    } catch (err) {
      console.error("[error-boundary] telemetry post failed", err);
    }
  }, [error]);

  // Phase 14 Plan 14-09: token-only swap per CONTEXT D-18 (error.tsx allowlisted
  // for raw values, but migration improves cross-theme rendering of the
  // last-resort error fallback). a11y fix: tabIndex={0} on the scrollable
  // <pre> closes axe rule scrollable-region-focusable (serious — surfaced by
  // a11y suite when /path or any other route renders the error boundary).
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-[var(--color-text)]">
      <h1 className="mb-2 text-lg font-semibold text-[var(--color-accent)]">
        Something broke.
      </h1>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        The error has been reported. You can retry or go back.
      </p>
      <pre
        tabIndex={0}
        aria-label="Error details"
        className="mb-4 max-h-72 overflow-auto rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-xs text-[var(--color-text-muted)] whitespace-pre-wrap focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
      >
        {error.message}
        {error.digest ? `\n\ndigest: ${error.digest}` : ""}
        {error.stack ? `\n\n${error.stack}` : ""}
      </pre>
      <button
        onClick={reset}
        className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 py-2 text-lg font-bold [color:white] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
      >
        Try again
      </button>
    </div>
  );
}
