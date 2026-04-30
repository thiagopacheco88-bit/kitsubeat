---
status: partial
phase: 13-performance-infrastructure
source: [13-VERIFICATION.md]
started: 2026-04-30T00:00:00Z
updated: 2026-04-30T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. pr-checks workflow runs on a real PR
expected: Open a trivial PR against master. The pr-checks workflow runs the new Build step (npm run build with NEXT_PUBLIC_APP_ENV=production) and the size-limit-action step (against .size-limit.cjs). A sticky PR comment lands within ~30s reporting measured size + delta vs base. Status check is green when measured size < 50 KB gzipped.
result: [pending]

### 2. size-limit-action hard-fails on budget breach
expected: On a throwaway PR, import a heavy library (e.g., moment, lodash) into SongContent.tsx so the route-specific bundle exceeds 50 KB gzipped. The size-limit step reports measured size > 50 KB; the status check exits non-zero (hard fail); the sticky comment shows breach details; the PR cannot be merged through the gate. Documented as a post-merge rollout-validation step in 13-03-SUMMARY.md.
result: [pending]

### 3. Cache contract holds against TEST_DATABASE_URL
expected: With TEST_DATABASE_URL set to a seeded Neon test DB, run `npm run test:integration tests/integration/song-page-cache.test.ts`. The 3 tests pass: second render fires 0 SELECTs against songs/song_versions/vocabulary_items (proves unstable_cache layer works cross-request), revalidateTag busts the cache and the next render hits the DB (proves invalidation works), and per-user decoupling does not poison the shared cache. CI runs this on master; until that run is observed, the CR-01 fix is verified at the source level only.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
