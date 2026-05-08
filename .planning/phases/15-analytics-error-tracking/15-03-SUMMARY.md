---
phase: 15
plan: "03"
subsystem: error-tracking
tags: [sentry, error-tracking, instrumentation, next-config, error-boundary]
dependency_graph:
  requires:
    - 15-01 (package install: @sentry/nextjs already installed)
  provides:
    - sentry.client.config.ts::Sentry.init (browser runtime)
    - sentry.server.config.ts::Sentry.init (Node.js runtime)
    - sentry.edge.config.ts::Sentry.init (edge runtime)
    - instrumentation.ts::register + onRequestError
    - src/app/error.tsx::Sentry.captureException
    - src/app/global-error.tsx::Sentry.captureException
    - next.config.ts::withSentryConfig
  affects:
    - src/app/error.tsx
    - src/app/global-error.tsx
    - next.config.ts
tech_stack:
  added: []
  patterns:
    - "Three-runtime Sentry init: separate files per runtime (client/server/edge)"
    - "instrumentation.ts NEXT_RUNTIME branching to lazy-import correct config"
    - "withSentryConfig outermost wrap over withBundleAnalyzer in next.config.ts"
    - "Belt-and-suspenders: Sentry.captureException + existing /api/client-errors POST both preserved"
key_files:
  created:
    - sentry.client.config.ts
    - sentry.server.config.ts
    - sentry.edge.config.ts
    - instrumentation.ts
  modified:
    - src/app/error.tsx
    - src/app/global-error.tsx
    - next.config.ts
decisions:
  - "sentry.client.config.ts uses NEXT_PUBLIC_SENTRY_DSN (exposed to browser for reporting); server/edge use SENTRY_DSN (server-only)"
  - "SENTRY_AUTH_TOKEN has no NEXT_PUBLIC_ prefix — build-time only, must not enter client bundle (T-15-01)"
  - "replaysSessionSampleRate and replaysOnErrorSampleRate both 0.0 — deferred to Phase 17/18 pending ICO PECR review"
  - "tunnelRoute: /sentry-tunnel bypasses ad-blockers; deleteSourcemapsAfterUpload:true keeps source maps off public CDN"
metrics:
  duration_seconds: 118
  completed_date: "2026-05-08"
  tasks_completed: 2
  files_created: 4
  files_modified: 3
---

# Phase 15 Plan 03: Sentry Install — Three Runtime Config Files + Error Boundary Augmentation Summary

Sentry wired across all three Next.js runtimes (client, server, edge) via separate init files, instrumentation.ts NEXT_RUNTIME branching, withSentryConfig next.config.ts wrap, and Sentry.captureException added to both error boundaries.

## What Was Built

Four new files (sentry.client.config.ts, sentry.server.config.ts, sentry.edge.config.ts, instrumentation.ts) at project root, plus three modifications: both error boundaries gain Sentry.captureException(error) as the first line inside useEffect (before the existing /api/client-errors fetch — belt-and-suspenders preserved), and next.config.ts gets withSentryConfig wrapping enableAnalyzer(nextConfig) with tunnelRoute, deleteSourcemapsAfterUpload, and SENTRY_AUTH_TOKEN as a build-only env var (no NEXT_PUBLIC_ prefix — T-15-01 mitigation).

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Three Sentry runtime config files + instrumentation.ts | 027bd9f | sentry.client.config.ts, sentry.server.config.ts, sentry.edge.config.ts, instrumentation.ts |
| 2 | Augment error.tsx + global-error.tsx + withSentryConfig next.config.ts | 7bf4df7 | src/app/error.tsx, src/app/global-error.tsx, next.config.ts |

## Decisions Made

- **Three separate runtime config files** rather than one unified file: Next.js requires distinct entry points per runtime; mixing them would break edge compatibility (Node.js APIs unavailable in edge).
- **SENTRY_AUTH_TOKEN without NEXT_PUBLIC_ prefix**: Build-time only. If prefixed, the token would ship in the client bundle — a critical information disclosure (T-15-01).
- **Replays deferred to Phase 17/18**: replaysSessionSampleRate=0.0 and replaysOnErrorSampleRate=0.0 until ICO/UK PECR consent review is complete.
- **global-error.tsx preserves inline styles**: This component renders before CSS loads — Tailwind classes would be unstyled. Inline styles are correct by design.

## Verification Results

```
npx tsc --noEmit: only 2 pre-existing errors (KanaCheckpointNode mock mismatch, ConsentBanner stub from Plan 01)

grep "Sentry.captureException" src/app/error.tsx      — PASS
grep "Sentry.captureException" src/app/global-error.tsx — PASS
grep "withSentryConfig" next.config.ts                 — PASS (import + usage = 2 matches)
grep "tunnelRoute.*sentry-tunnel" next.config.ts       — PASS
grep "deleteSourcemapsAfterUpload.*true" next.config.ts — PASS
grep -r "NEXT_PUBLIC_SENTRY_AUTH" src/ next.config.ts  — CLEAN (no leak)
grep "NEXT_PUBLIC_SENTRY_DSN" sentry.client.config.ts  — PASS
grep "SENTRY_DSN" sentry.server.config.ts              — PASS (no NEXT_PUBLIC_)
grep "SENTRY_DSN" sentry.edge.config.ts                — PASS (no NEXT_PUBLIC_)
grep "replaysSessionSampleRate.*0.0" sentry.client.config.ts — PASS
```

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All files are complete implementations with no placeholder values.

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| threat_flag: information-disclosure | next.config.ts | SENTRY_AUTH_TOKEN referenced as process.env.SENTRY_AUTH_TOKEN — confirmed no NEXT_PUBLIC_ prefix (T-15-01 mitigated) |
| threat_flag: privacy | sentry.client.config.ts | replaysSessionSampleRate=0.0 and replaysOnErrorSampleRate=0.0 confirmed — no session recording (T-15-04 mitigated) |

No new unplanned threat surface introduced beyond the plan's threat model.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| sentry.client.config.ts | FOUND |
| sentry.server.config.ts | FOUND |
| sentry.edge.config.ts | FOUND |
| instrumentation.ts | FOUND |
| src/app/error.tsx modified | FOUND |
| src/app/global-error.tsx modified | FOUND |
| next.config.ts modified | FOUND |
| Commit 027bd9f (Task 1) | FOUND |
| Commit 7bf4df7 (Task 2) | FOUND |
