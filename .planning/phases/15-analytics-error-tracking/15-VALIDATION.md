---
phase: 15
slug: analytics-error-tracking
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-08
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 (unit) + Playwright 1.59.1 (e2e) |
| **Config file** | vitest.config.ts (existing) + playwright.config.ts (existing) |
| **Quick run command** | `npx vitest run src/lib/analytics.test.ts src/components/ConsentBanner.test.ts -x` |
| **Full suite command** | `npm run test:unit` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/analytics.test.ts -x`
- **After every plan wave:** Run `npm run test:unit`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | SC-1 | — | PostHog SDK init fires no events before consent | unit | `npx vitest run src/lib/analytics.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| 15-01-02 | 01 | 1 | SC-4 | T-consent-bypass | No events fire before opt-in | unit | `npx vitest run src/components/ConsentBanner.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| 15-02-01 | 02 | 1 | SC-1 | T-pii-event | 7 events captured with correct shape, no PII | unit | `npx vitest run src/lib/analytics.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| 15-03-01 | 03 | 2 | SC-2 | T-sentry-token | Sentry captures client exceptions | smoke | manual — Sentry test route | ❌ Wave 0 | ⬜ pending |
| 15-04-01 | 04 | 2 | SC-5 | T-pii-event | No user email/name in event payloads | unit | `npx vitest run src/lib/analytics.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| 15-05-01 | 05 | 2 | SC-1 | T-pii-event | 6 funnel event shapes correct, no PII; subscription_started stub exported and callable | unit | `npx vitest run src/lib/analytics.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| 15-05-02 | 05 | 2 | SC-1 | — | song_opened + exercise_started wired at call sites | smoke | tsc + manual dev server | — | ⬜ pending |
| 15-05-03 | 05 | 2 | SC-1 | — | first_star_earned + premium_gate_hit + day_7_return + signup wired; trackSubscriptionStarted exported | smoke | tsc + manual dev server | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/lib/analytics.test.ts` — unit tests for trackGamification() event shape + no-PII assertion; mock posthog-js (Plan 01 Task 1)
- [x] `src/components/ConsentBanner.test.ts` — renders nothing when status is '' (SSR); renders banner when 'pending'; calls opt_in_capturing on Accept (Plan 01 Task 1)
- [x] `src/lib/posthog-server.test.ts` — getPostHogServer() returns singleton; capture() called with correct event shape (Plan 01 Task 1)
- [x] SC-1 funnel event shape stubs in `src/lib/analytics.test.ts` — 7 tests (6 passing + 1 subscription_started stub verification) added in Plan 05 Task 1

*Wave 0 must land before any instrumentation code is written.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sentry error appears in Sentry dashboard with stack trace | SC-2 | Requires live Sentry org + DSN; no test-mode stub | Trigger `/sentry-example-error` route in dev; verify event in Sentry dashboard |
| PostHog funnel visible in PostHog Cloud UI | SC-3 | Requires real event volume + PostHog cloud | Sign up, open a song, earn star 1; check Funnels > signup→song_opened→first_star_earned |
| Consent banner does not appear on second visit | SC-4 | localStorage state; no headless DOM for localStorage | Accept consent; hard-refresh; verify banner absent |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter
- [x] `wave_0_complete: true` set in frontmatter (Plan 01 Task 1 defines Wave 0 stubs; Plan 05 Task 1 extends them)

**Approval:** pending
