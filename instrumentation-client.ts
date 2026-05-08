/**
 * instrumentation-client.ts — Next.js 15 client instrumentation entry point.
 *
 * This file is loaded once before React hydration (client-side only).
 *
 * IMPORTANT — Scope:
 * - PostHog client init (consent-gated, UK PECR compliance)
 * - onRouterTransitionStart export (required by @sentry/nextjs for router breadcrumbs)
 *
 * Sentry.init() lives EXCLUSIVELY in sentry.client.config.ts (Plan 03).
 * Do NOT add Sentry.init() here — it would double-initialize the SDK and cause
 * duplicate event capture and SDK warnings.
 *
 * Phase 15 Plan 01 — PostHog init + router hook only.
 */
import posthog from "posthog-js";
import * as Sentry from "@sentry/nextjs";

// PostHog — consent-gated (UK PECR compliance)
// opt_out_capturing_by_default: true means zero events fire until user calls opt_in_capturing()
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_TOKEN!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
  defaults: "2026-01-30",
  opt_out_capturing_by_default: true,
  cookieless_mode: "on_reject",
  person_profiles: "identified_only",
  disable_session_recording: true,
  capture_pageview: false,
});

// Phase 15 SC-1: day_7_return — fires once per session if user has been around >= 7 days
// Uses localStorage ph_first_seen_at (epoch ms string set on first load; persists across sessions).
// Deduplicated per session via sessionStorage ph_day7_emitted.
// posthog SDK's opt_out_capturing_by_default gate means capture() is a no-op until consent given.
;(function emitDay7ReturnIfApplicable() {
  try {
    const KEY = "ph_first_seen_at";
    const now = Date.now();
    const stored = localStorage.getItem(KEY);
    if (!stored) {
      localStorage.setItem(KEY, String(now));
      return;
    }
    const firstSeen = Number(stored);
    const daysSince = Math.floor((now - firstSeen) / (1000 * 60 * 60 * 24));
    if (daysSince >= 7 && !sessionStorage.getItem("ph_day7_emitted")) {
      sessionStorage.setItem("ph_day7_emitted", "1");
      // Only emits if user has opted in — posthog SDK gates automatically with
      // opt_out_capturing_by_default: true set at init above
      posthog.capture("day_7_return", { days_since_signup: daysSince });
    }
  } catch {
    // localStorage may be blocked in private browsing — non-fatal
  }
})();

// Required by @sentry/nextjs for router transition breadcrumbs.
// This is NOT Sentry.init() — it only wires the router hook.
// Full Sentry.init() is in sentry.client.config.ts (Plan 03).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
