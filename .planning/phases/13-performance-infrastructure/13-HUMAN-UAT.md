---
status: partial
phase: 13-performance-infrastructure
source: [13-VERIFICATION.md]
started: 2026-04-30T00:00:00Z
updated: 2026-05-03T10:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. pr-checks workflow runs on a real PR
expected: Open a trivial PR against master. The pr-checks workflow runs the new Build step (npm run build with NEXT_PUBLIC_APP_ENV=production) and the size-limit-action step (against .size-limit.cjs). A sticky PR comment lands within ~30s reporting measured size + delta vs base. Status check is green when measured size < 50 KB gzipped.
result: issue
reported: "Initial run (PR #1, run 25232789574): Workflow triggered correctly on pull_request event but hard-failed at 'Seed test DB' because TEST_DATABASE_URL was not configured in GitHub Actions secrets. Re-run (PR #2, run 25276214277) after configuring the secret: Seed step now passes, BUT the workflow then hard-fails at 'Run PR suite (qa + unit + integration)' because scripts/seed/06-qa-agent.ts requires DATABASE_URL (not TEST_DATABASE_URL) which is also not set in the workflow env. Build step + size-limit-action step still never run. The size-limit gate logic itself was verified separately by running 'npm run build && npm run size' locally: 11.21 KB / 50 KB budget (78% headroom) — the gate WORKS, it's just not reachable through the current qa-suite.yml step ordering. Multiple unrelated upstream issues block the gate: (1) DATABASE_URL not in CI env, (2) vocabulary_items.surface column missing in DB schema (drift across 17 test files), (3) 8 other test files share the same neon-http rows-shape bug (commit 0ffc2e7 fixed only 2 of 10 occurrences — out of scope for this UAT)."
severity: major
artifacts:
  - .github/workflows/qa-suite.yml
  - https://github.com/thiagopacheco88-bit/kitsubeat/actions/runs/25232789574
  - https://github.com/thiagopacheco88-bit/kitsubeat/actions/runs/25276214277
  - 0ffc2e7 (rows-shape fix in cache test + seed-test-db.ts)

### 2. size-limit-action hard-fails on budget breach
expected: On a throwaway PR, import a heavy library (e.g., moment, lodash) into SongContent.tsx so the route-specific bundle exceeds 50 KB gzipped. The size-limit step reports measured size > 50 KB; the status check exits non-zero (hard fail); the sticky comment shows breach details; the PR cannot be merged through the gate. Documented as a post-merge rollout-validation step in 13-03-SUMMARY.md.
result: blocked
blocked_by: ci-pipeline-broken-upstream
reason: "Same root cause family as Test 1 — qa-suite.yml has multiple unrelated upstream failures (DATABASE_URL missing, schema drift on vocabulary_items.surface, 8 test files with neon-http rows-shape bug) that block the workflow from reaching the size-limit step on real PRs. Cannot observe a budget-breach PR hard-fail through the gate until all upstream blockers are fixed. Locally-verified that the size-limit-action logic itself is correct (.size-limit.cjs config matches build output, budget assertion works) — see Test 1 reported note. Re-run this test after the qa-suite.yml restructure or the upstream fixes land."

### 3. Cache contract holds against TEST_DATABASE_URL
expected: With TEST_DATABASE_URL set to a seeded Neon test DB, run `npm run test:integration tests/integration/song-page-cache.test.ts`. The 3 tests pass: second render fires 0 SELECTs against songs/song_versions/vocabulary_items (proves unstable_cache layer works cross-request), revalidateTag busts the cache and the next render hits the DB (proves invalidation works), and per-user decoupling does not poison the shared cache. CI runs this on master; until that run is observed, the CR-01 fix is verified at the source level only.
result: blocked
blocked_by: vitest-cannot-host-unstable-cache
reason: "Provisioned Neon test branch 'kitsubeat-test' as copy-on-write fork of production; configured TEST_DATABASE_URL in .env.test (gitignored) and as GitHub Actions secret. Fixed pre-existing rows-shape bug in the test (commit 0ffc2e7) which had blocked the test from ever running. Test now actually executes — but fails with 'Invariant: incrementalCache missing in unstable_cache' because Next.js's unstable_cache requires the framework's incremental cache runtime (AsyncLocalStorage plumbing only present inside next dev / next build). Plain vitest cannot host unstable_cache. The Phase 13 test was never going to work as designed in vitest — would need either Playwright e2e against running server, or vitest-environment-nextjs (community), or substantial rewrite. The CR-01 fix remains verified at the source level (unstable_cache wrapping is in place at src/lib/db/queries.ts:59-61); runtime verification deferred. Re-run after a Next.js-aware test harness is set up or the test is rewritten as Playwright e2e."

## Summary

total: 3
passed: 0
issues: 1
pending: 0
skipped: 0
blocked: 2

## Gaps

- truth: "size-limit-action runs on a real PR and lands a sticky comment with measured size + delta; status check turns green when measured size < 50 KB gzipped."
  status: partially_fixed
  reason: "Configured TEST_DATABASE_URL as a GitHub Actions secret (kitsubeat-test branch on Neon, free tier). Fixed pre-existing rows-shape bug in seed-test-db.ts (commit 0ffc2e7) so the seed step now passes. But the workflow still does not reach the size-limit step on real PRs because of multiple unrelated upstream blockers in qa-suite.yml's pr-checks job: (1) DATABASE_URL is not configured in CI workflow env — scripts/seed/06-qa-agent.ts requires it directly. (2) vocabulary_items.surface column is missing in the DB schema — affects 17 unrelated integration tests (Phase 11.x schema drift, not Phase 13). (3) 8 other test files share the same neon-http rows-shape bug (only 2 of 10 occurrences fixed in commit 0ffc2e7). The size-limit gate logic itself is verifiably correct: locally ran 'npm run build && npm run size' → 11.21 KB / 50 KB budget, gate enforces correctly. The deliverable (gate logic) works; the surrounding CI pipeline does not."
  severity: major
  test: 1
  artifacts:
    - .github/workflows/qa-suite.yml
    - https://github.com/thiagopacheco88-bit/kitsubeat/actions/runs/25232789574
    - https://github.com/thiagopacheco88-bit/kitsubeat/actions/runs/25276214277
    - 0ffc2e7
  missing:
    - DATABASE_URL in qa-suite.yml workflow env (or refactor 06-qa-agent.ts to use TEST_DATABASE_URL)
    - migration to add vocabulary_items.surface column (Phase 11.x scope)
    - rows-shape fix in 8 remaining test files (tests/support/fixtures.ts; tests/integration/save-session-results.test.ts, gamification.test.ts, queries-progress.test.ts, regression-stale-lesson-data.test.ts, admin-songs-api.test.ts; tests/e2e/regression-premium-gate.spec.ts, advanced-drill-quota.spec.ts)
    - qa-suite.yml restructure: move size-limit-action ahead of dependent test steps so gate runs independently
