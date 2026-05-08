---
phase: 15
plan: "05"
subsystem: analytics
tags: [analytics, posthog, funnel-events, sc-1, tdd]
dependency_graph:
  requires:
    - src/lib/posthog-server.ts::getPostHogServer
    - src/app/components/PostHogIdentify.tsx::PostHogIdentify
    - instrumentation-client.ts::onRouterTransitionStart
  provides:
    - src/lib/analytics.ts::trackSubscriptionStarted
    - src/app/songs/[slug]/page.tsx::song_opened
    - src/app/songs/[slug]/components/ExerciseTab.tsx::exercise_started
    - src/lib/exercises/access.ts::premium_gate_hit
    - src/app/actions/exercises.ts::first_star_earned
    - instrumentation-client.ts::day_7_return
    - src/app/components/PostHogIdentify.tsx::signup
  affects:
    - src/lib/analytics.test.ts
tech_stack:
  added: []
  patterns:
    - TDD Red/Green for unit test block extension
    - try/catch non-fatal analytics wrapping pattern (server-side)
    - useRef dedup guard for client-side once-per-activation event
    - IIFE in instrumentation-client.ts for localStorage-based day tracking
    - localStorage ph_known_users for first-time user signup detection
key_files:
  created: []
  modified:
    - src/lib/analytics.test.ts
    - src/lib/analytics.ts
    - src/app/songs/[slug]/page.tsx
    - src/app/songs/[slug]/components/ExerciseTab.tsx
    - src/lib/exercises/access.ts
    - src/app/actions/exercises.ts
    - instrumentation-client.ts
    - src/app/components/PostHogIdentify.tsx
decisions:
  - "premium_gate_hit added to access.ts not exercises.ts — only access.ts has the denial return points"
  - "song_slug uses songVersionId as proxy in access.ts (no slug available at that call depth)"
  - "exercise_started useEffect fires on tabState to session/grammar-session transition with useRef dedup"
  - "trackSubscriptionStarted is intentional no-op stub with JSDoc for Phase 19 billing wiring"
  - "first_star_earned fires only on previousStars < 1 to stars >= 1 transition in saveSessionResults"
metrics:
  duration_seconds: 540
  completed_date: "2026-05-08"
  tasks_completed: 3
  files_created: 0
  files_modified: 8
---

# Phase 15 Plan 05: SC-1 Funnel Event Instrumentation Summary

All 7 SC-1 funnel events instrumented at their call sites: song_opened (server), exercise_started (client), first_star_earned + premium_gate_hit (server actions), day_7_return (instrumentation-client IIFE), signup (PostHogIdentify), and subscription_started as named export stub.

## What Was Built

Extended the PostHog analytics foundation (Plans 01-02) with live event capture at every SC-1 funnel touchpoint. Each server-side capture is wrapped in try/catch (non-fatal). Client-side captures use the posthog-js SDK gated by `opt_out_capturing_by_default: true` from Plan 01. All 7 events covered by passing unit tests in analytics.test.ts (12 total: 5 original + 7 new).

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 (RED) | Extend analytics.test.ts — 7 SC-1 funnel event shape tests (1 expected fail) | 4d577d6 | src/lib/analytics.test.ts |
| 2 | Instrument song_opened (page.tsx) + exercise_started (ExerciseTab.tsx) | 9837fdd | src/app/songs/[slug]/page.tsx, src/app/songs/[slug]/components/ExerciseTab.tsx |
| 3 (GREEN) | Instrument first_star_earned, premium_gate_hit, day_7_return, signup; trackSubscriptionStarted stub | f9a4d7c | src/app/actions/exercises.ts, src/lib/exercises/access.ts, instrumentation-client.ts, src/app/components/PostHogIdentify.tsx, src/lib/analytics.ts |

## Decisions Made

- **premium_gate_hit placed in access.ts**: The plan referred to `exercises.ts::checkExerciseAccess` but `checkExerciseAccess` lives in `src/lib/exercises/access.ts`. Both denial return paths (quota_exhausted + premium_required) are instrumented there. Using `opts?.songVersionId` as the `song_slug` property value since song slug is not available at that call depth.
- **exercise_started via tabState useEffect**: ExerciseTab has no `isActive` prop — it transitions via `tabState`. The useEffect watches `tabState === "session" | "grammar-session"` with `useRef` dedup to fire exactly once per activation cycle, resetting when returning to "config".
- **first_star_earned transition guard**: `previousStars < 1 && stars >= 1` fires on the first star ever earned on a song (not on subsequent star gains). Both values are computed within `saveSessionResults` before/after the upsert.
- **trackSubscriptionStarted as intentional stub**: Billing route does not exist in Phase 15. The named export with JSDoc creates a TypeScript compile-time enforcer that will catch all call sites when Phase 19 billing lands.
- **day_7_return dedup via sessionStorage**: IIFE in instrumentation-client fires once per browser session (sessionStorage key `ph_day7_emitted`) to avoid repeating on every page load within the same session.

## Verification Results

```
npx vitest run src/lib/analytics.test.ts: 12/12 PASS
npx tsc --noEmit: clean (only pre-existing KanaCheckpointNode.test.tsx error)
grep "song_opened" src/app/songs/[slug]/page.tsx: PASS
grep "getPostHogServer" src/app/songs/[slug]/page.tsx: PASS
grep "exercise_started" src/app/songs/[slug]/components/ExerciseTab.tsx: PASS
grep "first_star_earned" src/app/actions/exercises.ts: PASS
grep "premium_gate_hit" src/lib/exercises/access.ts: PASS
grep "day_7_return" instrumentation-client.ts: PASS
grep "ph_first_seen_at" instrumentation-client.ts: PASS
grep "signup" src/app/components/PostHogIdentify.tsx: PASS
grep "ph_known_users" src/app/components/PostHogIdentify.tsx: PASS
grep "export function trackSubscriptionStarted" src/lib/analytics.ts: PASS
grep "it.todo" src/lib/analytics.test.ts: (no matches — GOOD)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Deviation] premium_gate_hit wired in access.ts instead of exercises.ts**
- **Found during:** Task 3
- **Issue:** Plan said to add `premium_gate_hit` in `checkExerciseAccess` but the plan's `files_modified` listed `src/lib/actions/exercises.ts` (a path that doesn't exist) — the actual `checkExerciseAccess` function is in `src/lib/exercises/access.ts`. The server action wrappers (`getAdvancedDrillAccess`) don't expose the denial reason directly.
- **Fix:** Added capture in `src/lib/exercises/access.ts` at both denial return paths. Song slug unavailable at that depth, so `songVersionId` used as proxy per the event shape.
- **Files modified:** `src/lib/exercises/access.ts`
- **Commit:** f9a4d7c

## Known Stubs

- `src/lib/analytics.ts::trackSubscriptionStarted`: Intentional no-op stub — billing route does not exist in Phase 15. JSDoc documents Phase 19 wiring instructions. This stub is tracked here per SUMMARY protocol but is explicitly planned per plan spec (not a regression stub).

## Threat Surface Scan

All Phase 15 threat model mitigations confirmed implemented per PLAN.md T-15-12 through T-15-16:

| Threat | Mitigation | Status |
|--------|-----------|--------|
| T-15-12 Info Disclosure — song_opened properties | Accepted: non-PII catalog metadata | ACCEPTED |
| T-15-13 Info Disclosure — first_star_earned/premium_gate_hit | Accepted: song_slug + star_number/reason only | ACCEPTED |
| T-15-14 Privacy — day_7_return localStorage | ph_first_seen_at is epoch timestamp only; posthog consent gate is active | IMPLEMENTED |
| T-15-15 Privacy — signup event is_first_time | ph_known_users contains only opaque Clerk userIds; has_opted_in_capturing() guard inherited from Plan 02 | IMPLEMENTED |
| T-15-16 Spoofing — client exercise_started | Accepted: analytics data not security-sensitive | ACCEPTED |

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| src/lib/analytics.test.ts (extended) | FOUND |
| src/lib/analytics.ts (trackSubscriptionStarted) | FOUND |
| src/app/songs/[slug]/page.tsx (song_opened) | FOUND |
| src/app/songs/[slug]/components/ExerciseTab.tsx (exercise_started) | FOUND |
| src/lib/exercises/access.ts (premium_gate_hit) | FOUND |
| src/app/actions/exercises.ts (first_star_earned) | FOUND |
| instrumentation-client.ts (day_7_return) | FOUND |
| src/app/components/PostHogIdentify.tsx (signup) | FOUND |
| Commit 4d577d6 (RED) | FOUND |
| Commit 9837fdd (Task 2) | FOUND |
| Commit f9a4d7c (Task 3 / GREEN) | FOUND |
| vitest run analytics.test.ts 12/12 | PASS |
| tsc --noEmit (plan files clean) | PASS |
