---
phase: 15
plan: "01"
subsystem: analytics
tags: [analytics, posthog, consent, tdd, server-side]
dependency_graph:
  requires: []
  provides:
    - src/lib/posthog-server.ts::getPostHogServer
    - src/lib/analytics.ts::trackGamification
    - instrumentation-client.ts::onRouterTransitionStart
  affects:
    - src/lib/gamification/session-integration.ts
    - src/app/actions/gamification.ts
tech_stack:
  added:
    - posthog-js@1.372.10
    - posthog-node@5.33.4
    - "@sentry/nextjs@10.52.0"
  patterns:
    - Lazy singleton (getPostHogServer mirrors db/index.ts _db pattern)
    - opt_out_capturing_by_default for UK PECR consent gate
    - TDD Red/Green with vi.resetModules() for singleton isolation
key_files:
  created:
    - instrumentation-client.ts
    - src/lib/posthog-server.ts
    - src/lib/analytics.test.ts
    - src/components/ConsentBanner.test.tsx
    - src/lib/posthog-server.test.ts
  modified:
    - src/lib/analytics.ts
    - package.json
decisions:
  - "posthog-server.ts uses flushAt:1/flushInterval:0 for Vercel serverless immediate flush"
  - "trackGamification wrapped in try/catch — analytics is non-fatal to gamification path"
  - "instrumentation-client.ts contains only PostHog init + onRouterTransitionStart (no Sentry.init to avoid double-init)"
  - "ConsentBanner test uses .tsx extension for JSX; written as RED stub (component delivered in Plan 02)"
metrics:
  duration_seconds: 311
  completed_date: "2026-05-08"
  tasks_completed: 2
  files_created: 5
  files_modified: 2
---

# Phase 15 Plan 01: Wave 0 Test Stubs + PostHog SDK + Analytics Init Summary

Consent-gated PostHog analytics foundation: posthog-node singleton, trackGamification body swap, instrumentation-client init with opt_out_capturing_by_default, and 9 passing unit tests (TDD Red/Green).

## What Was Built

Three test files establishing the Wave 0 contract, one PostHog server singleton, the replaced analytics.ts body, and the instrumentation-client.ts client init. The posthog-js, posthog-node, and @sentry/nextjs packages were installed.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Wave 0 RED — failing test stubs | 970e899 | analytics.test.ts, ConsentBanner.test.tsx, posthog-server.test.ts |
| 2 | GREEN — posthog-server + analytics swap + instrumentation-client | 82196f1 | posthog-server.ts, analytics.ts, instrumentation-client.ts |

## Decisions Made

- **flushAt:1, flushInterval:0** in posthog-server.ts: Vercel serverless functions terminate before the default batch window fires; immediate flush is mandatory.
- **No Sentry.init() in instrumentation-client.ts**: Plan 03 delivers sentry.client.config.ts; putting Sentry.init() in instrumentation-client.ts causes double-init and duplicate events.
- **try/catch in trackGamification**: Analytics must be non-fatal — a PostHog outage cannot break the gamification write path.
- **ConsentBanner.test.tsx written as RED stub**: The ConsentBanner component is Plan 02's deliverable. The test file establishes the contract in advance (5 failing tests: SSR null, pending dialog, granted null, accept/decline).

## Verification Results

```
analytics.test.ts:      5/5 PASS
posthog-server.test.ts: 4/4 PASS
ConsentBanner.test.tsx: 0/5 (expected — component not yet created, Plan 02)
```

Grep checks:
- `opt_out_capturing_by_default: true` in instrumentation-client.ts — PASS
- No `Sentry.init()` call in instrumentation-client.ts — PASS
- `onRouterTransitionStart` export in instrumentation-client.ts — PASS
- No `NEXT_PUBLIC_SENTRY_AUTH` in src/ — PASS
- `getPostHogServer` imported in analytics.ts — PASS
- GamificationEvent type references count: 3 (preserved)
- `npx tsc --noEmit` — no new errors in plan files (ConsentBanner.test.tsx has expected "cannot find module" since component doesn't exist yet)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] vi.mock hoisting issue in analytics.test.ts**
- **Found during:** Task 1 → Task 2 GREEN phase first run
- **Issue:** `vi.mock("./posthog-server", () => ...)` factory referenced a top-level `const mockGetPostHogServer` variable; `vi.mock` is hoisted before variable initialization, causing `ReferenceError: Cannot access 'mockGetPostHogServer' before initialization`
- **Fix:** Rewrote factory to use `vi.fn()` directly inside the factory, then imported the mocked module and used `vi.mocked()` outside to get the typed reference
- **Files modified:** `src/lib/analytics.test.ts`

**2. [Rule 1 - Bug] PostHog constructor mock was not constructable**
- **Found during:** Task 2 GREEN phase first run
- **Issue:** `vi.fn(() => captureInstanceMock)` returns an arrow function which is not `new`-able; `new PostHog(...)` in posthog-server.ts threw `TypeError: () => captureInstanceMock is not a constructor`
- **Fix:** Changed mock factory to use `vi.fn(function(this) { this.capture = vi.fn() })` (regular function with `this` context, constructable with `new`)
- **Files modified:** `src/lib/posthog-server.test.ts`

**3. [Rule 1 - Bug] ConsentBanner test format**
- **Found during:** Task 1 initial creation
- **Issue:** First wrote `src/components/ConsentBanner.test.ts` (no JSX) calling `render(ConsentBanner({}))` — invalid React rendering; should use `.tsx` and `<ConsentBanner />`
- **Fix:** Deleted `.ts` file, created `src/components/ConsentBanner.test.tsx` with proper JSX and `@testing-library/react` `act` wrappers
- **Files modified:** Replaced `src/components/ConsentBanner.test.ts` → `src/components/ConsentBanner.test.tsx`

## Known Stubs

- `src/components/ConsentBanner.test.tsx`: 5 failing tests referencing `@/components/ConsentBanner` — intentional stub; ConsentBanner component is created in Plan 02. These tests will turn green when Plan 02 lands.

## Threat Surface Scan

No new threat surface introduced beyond what is documented in the plan's threat model:
- `instrumentation-client.ts` crosses to PostHog Cloud via posthog-js (T-15-03 — mitigated by `opt_out_capturing_by_default: true`)
- `src/lib/analytics.ts` crosses to PostHog Cloud via posthog-node (T-15-02 — mitigated by no-PII unit test)
- `NEXT_PUBLIC_SENTRY_AUTH` not present anywhere in src/ (T-15-01 — no violation)

## Self-Check: PASSED

All created files found on disk. Both commits verified in git log.

| Check | Result |
|-------|--------|
| src/lib/posthog-server.ts | FOUND |
| src/lib/analytics.ts | FOUND |
| instrumentation-client.ts | FOUND |
| src/lib/analytics.test.ts | FOUND |
| src/components/ConsentBanner.test.tsx | FOUND |
| src/lib/posthog-server.test.ts | FOUND |
| Commit 970e899 (RED) | FOUND |
| Commit 82196f1 (GREEN) | FOUND |
