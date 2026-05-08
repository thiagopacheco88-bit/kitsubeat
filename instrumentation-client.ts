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

// Required by @sentry/nextjs for router transition breadcrumbs.
// This is NOT Sentry.init() — it only wires the router hook.
// Full Sentry.init() is in sentry.client.config.ts (Plan 03).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
