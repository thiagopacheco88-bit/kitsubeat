---
status: partial
phase: 13-performance-infrastructure
source: [13-VERIFICATION.md]
started: 2026-04-30T00:00:00Z
updated: 2026-05-01T21:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. pr-checks workflow runs on a real PR
expected: Open a trivial PR against master. The pr-checks workflow runs the new Build step (npm run build with NEXT_PUBLIC_APP_ENV=production) and the size-limit-action step (against .size-limit.cjs). A sticky PR comment lands within ~30s reporting measured size + delta vs base. Status check is green when measured size < 50 KB gzipped.
result: issue
reported: "Workflow triggered correctly on pull_request event. PR checks job hard-failed at 'Seed test DB' step: TEST_DATABASE_URL is not set. Build step (NEXT_PUBLIC_APP_ENV=production) and size-limit-action step never ran. No sticky size comment on the PR. Status check is red for wrong reason (missing secret, not budget breach). Size-limit gate is non-functional on real PRs in current state. Verified via throwaway PR #1 (now closed): https://github.com/thiagopacheco88-bit/kitsubeat/pull/1 — workflow run https://github.com/thiagopacheco88-bit/kitsubeat/actions/runs/25232789574"
severity: major
artifacts:
  - .github/workflows/qa-suite.yml
  - https://github.com/thiagopacheco88-bit/kitsubeat/actions/runs/25232789574

### 2. size-limit-action hard-fails on budget breach
expected: On a throwaway PR, import a heavy library (e.g., moment, lodash) into SongContent.tsx so the route-specific bundle exceeds 50 KB gzipped. The size-limit step reports measured size > 50 KB; the status check exits non-zero (hard fail); the sticky comment shows breach details; the PR cannot be merged through the gate. Documented as a post-merge rollout-validation step in 13-03-SUMMARY.md.
result: blocked
blocked_by: size-limit-gate-broken
reason: "Same root cause as Test 1's issue — qa-suite.yml hard-fails at 'Seed test DB' (missing TEST_DATABASE_URL secret) before reaching the size-limit step, so a budget-breach PR cannot be observed hard-failing through the gate. Re-run this test after Test 1's fix is executed and the workflow can reach the size-limit step."

### 3. Cache contract holds against TEST_DATABASE_URL
expected: With TEST_DATABASE_URL set to a seeded Neon test DB, run `npm run test:integration tests/integration/song-page-cache.test.ts`. The 3 tests pass: second render fires 0 SELECTs against songs/song_versions/vocabulary_items (proves unstable_cache layer works cross-request), revalidateTag busts the cache and the next render hits the DB (proves invalidation works), and per-user decoupling does not poison the shared cache. CI runs this on master; until that run is observed, the CR-01 fix is verified at the source level only.
result: blocked
blocked_by: no-test-db-configured
reason: "No separate Neon test database has been provisioned for this repo. .env.test does not exist; .env.local only contains DATABASE_URL (dev DB) which the integration setup deliberately refuses to fall back to (would truncate user_song_progress / user_vocab_mastery and wipe dev progress). Without TEST_DATABASE_URL the test self-skips at the describe.skip guard (tests/integration/song-page-cache.test.ts:34-35). Same root cause family as Test 1 — TEST_DATABASE_URL is unconfigured in both GitHub Actions secrets and locally. Re-run after a Neon test DB is provisioned and TEST_DATABASE_URL is set in .env.test."

## Summary

total: 3
passed: 0
issues: 1
pending: 0
skipped: 0
blocked: 2

## Gaps

- truth: "size-limit-action runs on a real PR and lands a sticky comment with measured size + delta; status check turns green when measured size < 50 KB gzipped."
  status: failed
  reason: "Workflow triggered correctly on pull_request, but PR checks job hard-fails at 'Seed test DB' step because TEST_DATABASE_URL secret is not configured in the GitHub repo (Settings → Secrets and variables → Actions). The Build step and size-limit-action step never execute. No sticky size comment lands on PRs. Status check is red for the wrong reason. The size-limit gate is non-functional on real PRs in the current state. Two fix paths: (a) configure the TEST_DATABASE_URL secret on the GitHub repo (out-of-band config), or (b) restructure qa-suite.yml so the size-limit step runs independently of (or before) the seed/test steps so the gate functions even when downstream steps fail."
  severity: major
  test: 1
  artifacts:
    - .github/workflows/qa-suite.yml
    - https://github.com/thiagopacheco88-bit/kitsubeat/actions/runs/25232789574
    - https://github.com/thiagopacheco88-bit/kitsubeat/pull/1
  missing: []
