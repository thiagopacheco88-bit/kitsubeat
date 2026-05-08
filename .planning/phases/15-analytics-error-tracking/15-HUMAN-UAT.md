---
status: partial
phase: 15-analytics-error-tracking
source: [15-VERIFICATION.md]
started: 2026-05-08
updated: 2026-05-08
---

## Current Test

[awaiting human testing]

## Tests

### 1. PostHog funnel dashboard (SC-3)
expected: Funnel exists in PostHog Cloud UI: signup → song_opened → first_star_earned; steps are queryable and return data after first real session
result: [pending]

### 2. Sentry source map verification (SC-2 live check)
expected: Trigger a test exception in dev with real credentials; TypeScript file paths (not minified .js) appear in Sentry Issues dashboard
result: [pending]

### 3. PostHog consent gate end-to-end (SC-4 live check)
expected: Incognito visit → PostHog Live Events is empty before Accept; after Accept events flow; hard-refresh confirms banner does not reappear
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
