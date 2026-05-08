---
phase: 15-analytics-error-tracking
verified: 2026-05-08T12:00:00Z
status: human_needed
score: 4/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "PostHog funnel dashboard exists in PostHog Cloud UI — smoke test C from Plan 04"
    expected: "Funnel with steps signup -> song_opened -> first_star_earned is queryable by cohort in PostHog Cloud"
    why_human: "SC-3 requires a live PostHog account to verify. The dashboard must be manually created and confirmed to render. Cannot be verified without real API credentials."
  - test: "Sentry receives an exception with source-mapped stack trace — smoke test A from Plan 04"
    expected: "After throwing a test error in dev, Sentry dashboard shows the exception with TypeScript file paths (not minified .js)"
    why_human: "SC-2 source map verification requires a live Sentry account and a real build with SENTRY_AUTH_TOKEN set. The instrumentation code is in place but end-to-end upload cannot be confirmed programmatically."
  - test: "PostHog consent gate holds end-to-end — smoke tests B and D from Plan 04"
    expected: "Consent banner appears on first incognito visit; no events fire in PostHog Live Events before Accept is clicked; banner does not reappear on hard-refresh after accepting"
    why_human: "Requires running the live dev server with real PostHog credentials and observing the Live Events stream. Cannot be validated from static code analysis alone."
---

# Phase 15: Analytics & Error Tracking — Verification Report

**Phase Goal:** Every meaningful user event captured in product analytics; every exception surfaces in Sentry with debugging context; funnel metrics are queryable before beta opens.
**Verified:** 2026-05-08
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | PostHog tracks all 7 SC-1 funnel events (signup, song_opened, exercise_started, first_star_earned, day_7_return, premium_gate_hit, subscription_started stub) | VERIFIED | All 7 events instrumented at call sites: song_opened in page.tsx, exercise_started in ExerciseTab.tsx, first_star_earned + premium_gate_hit in exercises.ts/access.ts, day_7_return IIFE in instrumentation-client.ts, signup in PostHogIdentify.tsx, trackSubscriptionStarted exported stub in analytics.ts |
| 2 | Sentry captures client + server + edge exceptions with source maps | VERIFIED (code) / human_needed (live) | sentry.client.config.ts, sentry.server.config.ts, sentry.edge.config.ts all exist with Sentry.init(); instrumentation.ts has register() + onRequestError; both error boundaries call Sentry.captureException(error); withSentryConfig wraps next.config.ts with deleteSourcemapsAfterUpload: true. Live source-map upload needs human smoke test. |
| 3 | Core funnel dashboard exists in PostHog Cloud UI and is queryable | HUMAN_NEEDED | This is a live-service verification (SC-3). The code foundation is complete but the PostHog account, funnel configuration, and event flow require operator smoke test C from Plan 04. |
| 4 | No PostHog events fire before consent (opt_out_capturing_by_default: true; banner shows on first visit) | VERIFIED | instrumentation-client.ts: opt_out_capturing_by_default: true confirmed. ConsentBanner.tsx: useState('') sentinel, useEffect reads posthog.get_explicit_consent_status(), opt_in_capturing()/opt_out_capturing() wired to buttons. ConsentBanner and PostHogIdentify both rendered in layout.tsx before <main>. |
| 5 | No PII in event payloads — no email, name, raw user data; only userId/distinct_id allowed | VERIFIED | analytics.test.ts: 12 tests green including no-PII assertion on trackGamification payload. All capture calls use distinctId: userId ?? 'anonymous'. No email/name keys in any event shape verified by unit tests. GamificationEvent type preserved exactly (6 members). |

**Score:** 4/5 truths verified (SC-3 deferred to human verification)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/posthog-server.ts` | PostHog Node.js singleton with flushAt:1, flushInterval:0 | VERIFIED | Lazy singleton mirrors db/index.ts pattern; throws on missing token; flushAt:1/flushInterval:0 confirmed |
| `src/lib/analytics.ts` | trackGamification with posthog-node calls; trackSubscriptionStarted stub; GamificationEvent type preserved | VERIFIED | All 6 GamificationEvent union members present; trackGamification uses getPostHogServer(); try/catch non-fatal; trackSubscriptionStarted exported with Phase 19 JSDoc |
| `instrumentation-client.ts` | posthog.init with opt_out_capturing_by_default: true + day_7_return IIFE + onRouterTransitionStart; NO Sentry.init() | VERIFIED | All 3 elements confirmed; no Sentry.init() call present |
| `src/components/ConsentBanner.tsx` | 'use client'; useState('') sentinel; role="dialog"; opt_in/opt_out wired | VERIFIED | All acceptance criteria met; 5/5 test suite green |
| `src/app/components/PostHogIdentify.tsx` | has_opted_in_capturing() guard; signup event on first-time Clerk user | VERIFIED | Guard present; ph_known_users localStorage logic for signup detection confirmed |
| `src/app/layout.tsx` | Imports and renders ConsentBanner and PostHogIdentify | VERIFIED | Both imports and render calls confirmed at lines 11, 13, 201, 204 |
| `sentry.client.config.ts` | Sentry.init with NEXT_PUBLIC_SENTRY_DSN; replays both 0.0 | VERIFIED | replaysOnErrorSampleRate: 0.0, replaysSessionSampleRate: 0.0 confirmed |
| `sentry.server.config.ts` | Sentry.init with SENTRY_DSN (no NEXT_PUBLIC_ prefix) | VERIFIED | Uses process.env.SENTRY_DSN — no NEXT_PUBLIC_ prefix |
| `sentry.edge.config.ts` | Sentry.init with SENTRY_DSN; minimal config | VERIFIED | Uses process.env.SENTRY_DSN; no replays keys |
| `instrumentation.ts` | register() with NEXT_RUNTIME branching + onRequestError = Sentry.captureRequestError | VERIFIED | Both nodejs and edge branches present; onRequestError export confirmed |
| `src/app/error.tsx` | Sentry.captureException(error) before existing /api/client-errors fetch | VERIFIED | Confirmed at line 14 |
| `src/app/global-error.tsx` | Sentry.captureException(error) before existing fetch; inline styles preserved | VERIFIED | Confirmed at line 14 |
| `next.config.ts` | withSentryConfig wraps enableAnalyzer(nextConfig); tunnelRoute; deleteSourcemapsAfterUpload; SENTRY_AUTH_TOKEN not NEXT_PUBLIC_ | VERIFIED | All 4 criteria confirmed |
| `src/app/songs/[slug]/page.tsx` | song_opened event via getPostHogServer() after song fetch | VERIFIED | getPostHogServer import + song_opened capture confirmed at line 140-147 |
| `src/app/songs/[slug]/components/ExerciseTab.tsx` | exercise_started via posthog.capture on tab activation with useRef dedup | VERIFIED | exercise_started capture with useRef dedup guard confirmed |
| `src/lib/exercises/access.ts` | premium_gate_hit via getPostHogServer() at both denial return paths | VERIFIED | Both quota_exhausted and premium_required denial paths instrumented (lines 89-94, 108-113) |
| `src/app/actions/exercises.ts` | first_star_earned via getPostHogServer() on previousStars < 1 to stars >= 1 transition | VERIFIED | Conditional guard + capture confirmed at lines 397-404 |
| `.env.example` | 6 Phase 15 env vars with source instructions; SENTRY_AUTH_TOKEN explicit NEXT_PUBLIC_ warning | VERIFIED | All 6 vars present; NEVER add NEXT_PUBLIC_ prefix warning confirmed |
| `src/lib/analytics.test.ts` | 12 tests: 5 trackGamification + 7 SC-1 funnel event shape tests; no it.todo() | VERIFIED | 12 it() blocks confirmed; 0 it.todo entries |
| `src/components/ConsentBanner.test.tsx` | 5 tests: SSR null, pending dialog, granted null, Accept, Decline | VERIFIED | 5 it() blocks confirmed |
| `src/lib/posthog-server.test.ts` | 4 tests: singleton, constructor args, missing token throws | VERIFIED | 4 it() blocks confirmed |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/analytics.ts` | `src/lib/posthog-server.ts` | `import { getPostHogServer }` | WIRED | Import confirmed at line 14; used in trackGamification body |
| `instrumentation-client.ts` | `posthog-js` | `posthog.init with opt_out_capturing_by_default: true` | WIRED | Confirmed at lines 21-29 |
| `src/app/layout.tsx` | `src/components/ConsentBanner.tsx` | import + render inside body | WIRED | Import line 11; render line 201 |
| `src/app/layout.tsx` | `posthog.identify` | PostHogIdentify component with has_opted_in_capturing() guard | WIRED | PostHogIdentify import line 13; render line 204 |
| `instrumentation.ts` | `sentry.server.config.ts` | `await import('./sentry.server.config')` when NEXT_RUNTIME === 'nodejs' | WIRED | Confirmed in instrumentation.ts |
| `next.config.ts` | `@sentry/nextjs withSentryConfig` | `withSentryConfig(enableAnalyzer(nextConfig), ...)` | WIRED | import line 3; usage line 23 |
| `src/app/error.tsx` | `@sentry/nextjs Sentry` | `Sentry.captureException(error)` inside useEffect | WIRED | Confirmed at line 14 |
| `src/app/songs/[slug]/page.tsx` | `posthog-node` | `getPostHogServer().capture('song_opened', ...)` | WIRED | Confirmed at lines 140-147 |
| `src/lib/exercises/access.ts` | `posthog-node` | `getPostHogServer().capture('premium_gate_hit', ...)` | WIRED | Both denial paths confirmed |
| `src/app/actions/exercises.ts` | `posthog-node` | `getPostHogServer().capture('first_star_earned', ...)` | WIRED | Transition guard + capture confirmed |
| `src/app/components/PostHogIdentify.tsx` | `posthog-js` | `posthog.capture('signup') on ph_known_users first-time detection` | WIRED | Confirmed in useEffect |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `ConsentBanner.tsx` | status (consent state) | `posthog.get_explicit_consent_status()` in useEffect | Yes — reads live PostHog SDK state | FLOWING |
| `PostHogIdentify.tsx` | userId | Prop from layout.tsx (Clerk auth() server-side) | Yes — Clerk userId prop passed from server | FLOWING |
| `instrumentation-client.ts` day_7_return | firstSeen (epoch ms) | `localStorage.getItem('ph_first_seen_at')` | Yes — localStorage timestamp | FLOWING |
| `src/app/songs/[slug]/page.tsx` song_opened | song.jlpt_level, song.difficulty_tier | DB query result (song object from existing page fetch) | Yes — real DB song fields | FLOWING |
| `src/lib/exercises/access.ts` premium_gate_hit | songVersionId, denial reason | Function parameters from exercise access check | Yes — runtime values from access control | FLOWING |
| `src/app/actions/exercises.ts` first_star_earned | previousStars, stars | Session results from DB upsert | Yes — computed from real session data | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED for live PostHog/Sentry integrations — requires running server with real credentials. The code paths are fully wired and unit-tested. End-to-end behavioral checks require human smoke tests (Plan 04 Smoke Tests A–D).

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SC-1 | 15-01, 15-02, 15-05 | PostHog tracks 7 specified funnel events | SATISFIED | All 7 events instrumented at call sites; 12 passing unit tests; trackSubscriptionStarted named stub exported |
| SC-2 | 15-03 | Sentry captures client + server + edge exceptions with source maps | SATISFIED (code) | Three runtime configs, instrumentation.ts, error boundaries, withSentryConfig all confirmed. Source map upload requires live build. |
| SC-3 | 15-04 | Core funnel dashboard queryable in PostHog Cloud UI | NEEDS HUMAN | Requires live PostHog account and operator action per Plan 04 smoke test C |
| SC-4 | 15-01, 15-02 | No PostHog events before consent | SATISFIED | opt_out_capturing_by_default: true in SDK init; ConsentBanner uses useState('') sentinel + useEffect; banner wired in layout.tsx covering all routes |
| SC-5 | 15-01, 15-05 | No PII in event payloads | SATISFIED | Unit test no-PII assertion in analytics.test.ts; all event properties use distinctId (opaque userId) only; no email/name keys in any event shape |

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/lib/analytics.ts` — `trackSubscriptionStarted` | Intentional no-op stub | Info | This is a planned stub per SC-1 spec. JSDoc documents Phase 19 billing wiring instructions. The named export creates a TypeScript compile-time enforcer. Not a regression. |

No blocker or warning-level anti-patterns found. The `trackSubscriptionStarted` stub is explicitly required by the roadmap success criteria ("subscription_started exported as named stub — fires when billing route is integrated in Phase 19").

**Security scan results:**
- `grep -r "NEXT_PUBLIC_SENTRY_AUTH" src/ next.config.ts` — zero matches (T-15-01 clean)
- `SENTRY_AUTH_TOKEN` in next.config.ts uses `process.env.SENTRY_AUTH_TOKEN` with no NEXT_PUBLIC_ prefix — clean
- `SENTRY_DSN` in server/edge configs: no NEXT_PUBLIC_ prefix — clean
- Session replay: replaysSessionSampleRate=0.0, replaysOnErrorSampleRate=0.0 in sentry.client.config.ts — clean

---

### Human Verification Required

#### 1. PostHog Funnel Dashboard (SC-3)

**Test:** Follow Plan 04 Smoke Test C — log into PostHog Cloud, create a Funnel insight with steps: signup → song_opened → first_star_earned. Confirm the funnel renders and is queryable by cohort.
**Expected:** Funnel dashboard exists in PostHog Cloud UI with the three steps visible. Zero data is acceptable if no real users have run through the funnel yet — the steps must be queryable.
**Why human:** Requires a live PostHog account with real API credentials. The funnel dashboard is a PostHog Cloud configuration, not a code artifact.

#### 2. Sentry Source Map Verification (SC-2 live check)

**Test:** Follow Plan 04 Smoke Test A — start the dev server with real Sentry credentials, trigger a test exception (add a temporary throw to any page, or use the /sentry-example-error route if generated). Verify the exception appears in the Sentry dashboard with TypeScript file paths (not minified .js paths).
**Expected:** Exception appears in Sentry Issues with readable stack trace showing TypeScript source file paths and line numbers.
**Why human:** Source map upload during build requires SENTRY_AUTH_TOKEN in the build environment. The code infrastructure (withSentryConfig, deleteSourcemapsAfterUpload) is confirmed in place — live verification requires the actual build + upload cycle.

#### 3. PostHog Consent Gate End-to-End (SC-4 live check)

**Test:** Follow Plan 04 Smoke Tests B and D — open an incognito window, verify the consent banner appears; verify no events appear in PostHog Live Events before accepting; click Accept and confirm events flow; hard-refresh and verify banner does not reappear.
**Expected:** Banner appears on first visit; Live Events is empty before consent; events flow after Accept; localStorage persists consent across page refresh.
**Why human:** Requires a running dev server with real PostHog credentials and observation of the Live Events stream in PostHog Cloud.

---

### Gaps Summary

No code-level gaps found. All 5 success criteria have full code-level implementation:
- SC-1: All 7 funnel events instrumented with 12 passing unit tests
- SC-2: Sentry wired across all 3 Next.js runtimes
- SC-3: Code foundation complete; live PostHog account verification is the remaining step
- SC-4: Consent gate implemented at SDK level and UI level; wired in root layout
- SC-5: No-PII contract enforced by unit tests

SC-3 cannot be verified without operator action (PostHog account setup + funnel creation). SC-2 and SC-4 have live-service verification steps that also require real credentials. These are not code gaps — they are operator setup steps documented in Plan 04.

---

_Verified: 2026-05-08_
_Verifier: Claude (gsd-verifier)_
