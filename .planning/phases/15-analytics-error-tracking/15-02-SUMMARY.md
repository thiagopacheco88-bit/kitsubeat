---
phase: 15
plan: "02"
subsystem: analytics
tags: [analytics, posthog, consent, gdpr, layout, identify]
dependency_graph:
  requires:
    - src/lib/posthog-server.ts::getPostHogServer
    - instrumentation-client.ts::onRouterTransitionStart
  provides:
    - src/components/ConsentBanner.tsx::ConsentBanner
    - src/app/components/PostHogIdentify.tsx::PostHogIdentify
  affects:
    - src/app/layout.tsx
tech_stack:
  added: []
  patterns:
    - Hydration-safe useState('') sentinel for SSR-safe client component
    - GDPR has_opted_in_capturing() guard before posthog.identify()
    - Client component with useEffect for browser-only state (ThemeToggle pattern)
key_files:
  created:
    - src/components/ConsentBanner.tsx
    - src/app/components/PostHogIdentify.tsx
  modified:
    - src/app/layout.tsx
    - src/components/ConsentBanner.test.tsx
decisions:
  - "useState('') sentinel prevents SSR flash — empty string renders null, 'pending' shows banner"
  - "has_opted_in_capturing() guard in PostHogIdentify prevents profile creation before consent (T-15-05)"
  - "ConsentBanner placed before <main> in layout.tsx so it covers every route"
metrics:
  duration_seconds: 179
  completed_date: "2026-05-08"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
---

# Phase 15 Plan 02: ConsentBanner + PostHog identify() wired to Clerk session Summary

GDPR consent banner with hydration-safe SSR guard and PostHog identify() consent-gated to Clerk userId, both wired into root layout for full-app coverage.

## What Was Built

ConsentBanner client component using the `useState('')` sentinel pattern for SSR safety — renders nothing until hydration confirms status is `'pending'`, then shows an accept/decline dialog. PostHogIdentify client component guards `posthog.identify(userId)` behind `has_opted_in_capturing()` to prevent person profile creation before consent. Both components integrated into `src/app/layout.tsx` before `<main>`.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | ConsentBanner component GREEN — satisfy Plan 01 test stubs | 6de0f69 | ConsentBanner.tsx, ConsentBanner.test.tsx |
| 2 | Wire ConsentBanner + PostHogIdentify into layout.tsx | 793c117 | PostHogIdentify.tsx, layout.tsx |

## Decisions Made

- **useState('') sentinel**: Initializing with `''` (not `'pending'`) prevents SSR flash — the component renders nothing until `useEffect` fires and reads the real PostHog consent status. This mirrors the ThemeToggle cookie-read pattern from Plan 14.
- **has_opted_in_capturing() guard**: The GDPR guard in PostHogIdentify ensures no person profile is created in PostHog before the user explicitly accepts the consent banner (T-15-05 mitigation).
- **ConsentBanner before `<main>`**: Placing it before `<main>` in layout.tsx ensures it appears on every route including error pages and full-page transitions.
- **No PostHogProvider wrapper**: Confirmed by RESEARCH.md — `instrumentation-client.ts` (Plan 01) replaces the provider pattern in Next.js 15. Adding a provider would double-init PostHog.

## Verification Results

```
ConsentBanner.test.tsx: 5/5 PASS
npx tsc --noEmit: clean (no new errors in plan files)
grep "ConsentBanner" src/app/layout.tsx: 2 matches (import + render)
grep "PostHogIdentify" src/app/layout.tsx: 2 matches (import + render)
grep "has_opted_in_capturing" src/app/components/PostHogIdentify.tsx: PASS
grep "useState('')" src/components/ConsentBanner.tsx: PASS
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] vi.mock hoisting bug in ConsentBanner.test.tsx**
- **Found during:** Task 1 — first test run after creating ConsentBanner.tsx
- **Issue:** The test file (created in Plan 01) used `const mockGetExplicitConsentStatus = vi.fn()` at the top level, then referenced it inside `vi.mock("posthog-js", ...)` factory. `vi.mock` is hoisted before variable initialization, causing `ReferenceError: Cannot access 'mockGetExplicitConsentStatus' before initialization`
- **Fix:** Rewrote `vi.mock` factory to use `vi.fn()` directly inline (no top-level reference), then extracted typed mocks via `vi.mocked()` after the import. Same fix pattern applied to `analytics.test.ts` in Plan 01.
- **Files modified:** `src/components/ConsentBanner.test.tsx`
- **Commit:** 6de0f69

**2. [Rule 1 - Bug] TypeScript type narrowing for '' in test**
- **Found during:** Task 2 — `npx tsc --noEmit` check
- **Issue:** `mockGetExplicitConsentStatus.mockReturnValue("")` raised TS2345 — PostHog types `get_explicit_consent_status()` return as `"pending" | "granted" | "denied"`, not including `""`
- **Fix:** Added `as any` cast on the empty string mock return value — the component intentionally handles `''` as the SSR sentinel; the type restriction is PostHog's public API surface, not our internal behavior
- **Files modified:** `src/components/ConsentBanner.test.tsx`
- **Commit:** 6de0f69

## Known Stubs

None — all functionality is fully wired.

## Threat Surface Scan

All threat model mitigations confirmed implemented:

| Threat | Mitigation | Status |
|--------|-----------|--------|
| T-15-05 Privacy — posthog.identify() creates profile before consent | `has_opted_in_capturing()` guard in PostHogIdentify.tsx | IMPLEMENTED |
| T-15-06 Privacy — ConsentBanner hydration flash leaks visitor status | `useState('')` sentinel; banner never renders on SSR (`''` → null) | IMPLEMENTED |
| T-15-07 Info Disclosure — Clerk userId in PostHog | Accepted per plan (userId is opaque string, not PII email/name) | ACCEPTED |

No new threat surface beyond plan scope.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| src/components/ConsentBanner.tsx | FOUND |
| src/app/components/PostHogIdentify.tsx | FOUND |
| src/app/layout.tsx (modified) | FOUND |
| Commit 6de0f69 (Task 1) | FOUND |
| Commit 793c117 (Task 2) | FOUND |
| ConsentBanner tests 5/5 | PASS |
| tsc --noEmit (plan files) | CLEAN |
