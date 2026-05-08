---
plan: 15-04
phase: 15-analytics-error-tracking
status: complete
checkpoint_status: deferred
started: 2026-05-08
completed: 2026-05-08
tasks_completed: 1
tasks_total: 2
commits:
  - sha: 6828e36
    message: "feat(15-04): document Phase 15 env vars in .env.example (6 PostHog + Sentry vars)"
---

# Plan 15-04 Summary: Env Var Documentation + Service Setup Checkpoint

## What Was Built

**Task 1 (complete):** `.env.example` updated with 6 Phase 15 env vars:
- `NEXT_PUBLIC_POSTHOG_TOKEN` — PostHog project API key
- `NEXT_PUBLIC_POSTHOG_HOST` — PostHog cloud region (defaults to US)
- `NEXT_PUBLIC_SENTRY_DSN` — Sentry client DSN
- `SENTRY_DSN` — Sentry server/edge DSN (no NEXT_PUBLIC_ prefix)
- `SENTRY_ORG` / `SENTRY_PROJECT` — Sentry org and project slugs
- `SENTRY_AUTH_TOKEN` — build-time only, explicit warning against NEXT_PUBLIC_ prefix

**Task 2 (deferred — human checkpoint):** PostHog and Sentry account setup + 4 smoke tests.
Deferred by operator to verify asynchronously. To complete:
1. Set env vars in `.env.local` (see `.env.example` Phase 15 block for sources)
2. Run `npm run dev` and execute Smoke Tests A–D from the plan
3. Create PostHog funnel: signup → song_opened → first_star_earned

## Key Decisions

- SENTRY_AUTH_TOKEN goes in `.env.sentry-build-plugin` (build-time only), not `.env.local`
- EU PostHog cloud (`eu.i.posthog.com`) may be required post Phase 17 ICO review

## Self-Check: PASSED (with deferred checkpoint)

- `.env.example` contains all 6 Phase 15 vars with correct naming conventions
- SENTRY_AUTH_TOKEN warning is explicit: no NEXT_PUBLIC_ prefix (T-15-01)
- Human smoke tests deferred — will be validated by operator asynchronously
