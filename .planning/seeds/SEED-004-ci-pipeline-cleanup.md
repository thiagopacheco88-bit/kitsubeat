---
id: SEED-004
status: dormant
planted: 2026-05-03
planted_during: v1.0 / Phase 14 (Wave 0 complete)
trigger_when: opening a real PR (red status check from qa-suite.yml becomes annoying), OR a migration adds/changes a vocabulary_items column, OR next touching qa-suite.yml directly
scope: Medium
---

# SEED-004: CI pipeline cleanup — restore qa-suite.yml so Phase 13 size-limit gate functions on real PRs

## Why This Matters

Phase 13 shipped a bundle-size budget (50 KB gzipped on `/songs/[slug]`) wired through `size-limit-action` in `qa-suite.yml`. The **gate logic itself works correctly** — verified locally on 2026-05-03: `npm run build && npm run size` reports **11.21 KB / 50 KB (78% headroom)**, `.size-limit.cjs` config correctly identifies route bundles.

But the gate is **non-functional on real PRs** because of unrelated upstream tech debt accumulated across Phase 11.x / 14.x:

1. The qa-suite job hard-fails on every PR (red status check)
2. Every scheduled QA Suite run on master fails nightly — see `gh run list`
3. The bundle-budget invariant is never actually enforced — Phase 14 UX polish could silently bloat the route bundle without anyone noticing
4. Future PR work is harder because red checks become noise that masks real failures

The fix is mechanical, not architectural. The gate is correct; it's surrounded by rot.

## When to Surface

**Trigger:** opening a real PR (where the red status check becomes annoying), OR a migration adds/changes a `vocabulary_items` column (forces revisiting the schema-drift item), OR next touching `qa-suite.yml` directly

This seed should be presented during `/gsd-new-milestone` (or proactively on the triggers above) when scope matches:
- "test infrastructure cleanup"
- "CI pipeline"
- "schema drift / migrations cleanup"
- "preparing repo for active PR-based collaboration"

## Scope Estimate

**Medium** — 1-2 days as its own phase. Each item is small individually; bundling them keeps context together.

## The Four Debt Items

### 1. `DATABASE_URL` missing in CI workflow env

`scripts/seed/06-qa-agent.ts` requires `DATABASE_URL` directly via `getDb()` (line 350 calls into `src/lib/db/index.ts:122` which throws `DATABASE_URL is not set`). The qa-suite.yml `pr-checks` job sets only `TEST_DATABASE_URL`. Result: `Run PR suite (qa + unit + integration)` step hard-fails.

**Fix paths:**
- (a) Add `DATABASE_URL: ${{ secrets.DATABASE_URL }}` to `qa-suite.yml`'s env block (and configure the secret) — simple, but couples CI to dev DB.
- (b) Refactor `06-qa-agent.ts` to use `TEST_DATABASE_URL` (pattern from `tests/integration/setup.ts`).
- (c) Restructure `qa-suite.yml` so the size-limit step runs INDEPENDENTLY of (or before) test/qa steps — so the gate functions even when downstream steps fail. **Recommended**: this is the architecturally correct fix because the bundle-size gate is orthogonal to test correctness.

### 2. Schema drift: `vocabulary_items.surface` column missing

`src/app/actions/exercises.ts:1013` references `vi.surface` in a SQL query (`recordVocabAnswer` → "verses-dominated" computation). The column does not exist in the live DB schema. Breaks **17 integration test files** including `tests/integration/verses-dominated-now-flag.test.ts` (38 test failures observed).

This is **Phase 11.x scope** (the verses-dominated logic), not Phase 13.

**Fix:** add a Drizzle migration that creates `vocabulary_items.surface` (likely `text NOT NULL` based on usage), backfill from existing data if any, apply to dev + production branches.

### 3. Eight test files with the neon-http rows-shape bug

The pattern `(await db.execute(sql\`...\`)) as unknown as Array<...>` and indexing with `[0]` is wrong — `drizzle-orm/neon-http`'s `db.execute()` returns `{rows: [...], rowCount, fields, ...}`, not a raw array. Same fix as commit `0ffc2e7` (which fixed only 2 of 10 occurrences):

```ts
// before
const rows = (await db.execute(sql`...`)) as unknown as Array<{...}>;
// after
const { rows } = (await db.execute(sql`...`)) as unknown as { rows: Array<{...}> };
```

**Files needing the fix:**
- `tests/support/fixtures.ts`
- `tests/integration/save-session-results.test.ts`
- `tests/integration/gamification.test.ts`
- `tests/integration/queries-progress.test.ts`
- `tests/integration/regression-stale-lesson-data.test.ts`
- `tests/integration/admin-songs-api.test.ts`
- `tests/e2e/regression-premium-gate.spec.ts`
- `tests/e2e/advanced-drill-quota.spec.ts`

This bug existed because the `as unknown as` cast bypassed type checking; nobody actually ran these tests with `TEST_DATABASE_URL` set after the library upgrade that changed the return shape.

### 4. Phase 13 cache test cannot run in plain vitest

`tests/integration/song-page-cache.test.ts` exercises `unstable_cache` (Next.js cross-request cache) which fails with `Invariant: incrementalCache missing in unstable_cache` outside Next.js's incremental cache runtime (AsyncLocalStorage plumbing). The test was never going to pass in vitest as designed.

**Fix paths:**
- (a) Set up `vitest-environment-nextjs` (community package) — sets up the runtime context; least invasive.
- (b) Rewrite as Playwright e2e against a running `next dev` server: hit `/songs/[slug]` twice, inspect query counts via an admin/test endpoint that surfaces `__testQueryCounter`. More work but uses an environment that already exists in this repo.
- (c) Replace with a unit test that mocks `unstable_cache` and asserts the wrapping is in place — defeats the cross-request verification purpose; not recommended.

**Source-level verification** of CR-01 stands: `unstable_cache` wrapping is at `src/lib/db/queries.ts:59-61` with the correct tag (`song:${slug}`), and the source review in `13-VERIFICATION.md` confirmed the layer ordering.

## Breadcrumbs

- `.github/workflows/qa-suite.yml` — pr-checks job, ordering of steps blocks size-limit-action from running
- `.size-limit.cjs` — the gate config (correct as written)
- `scripts/seed/06-qa-agent.ts:350` — DATABASE_URL requirement
- `src/app/actions/exercises.ts:1013` — `vi.surface` reference
- `src/lib/db/queries.ts:59-61` — `unstable_cache` wrapping (CR-01 fix)
- `tests/integration/song-page-cache.test.ts` — broken cache test
- `tests/support/fixtures.ts` + 7 other test files — rows-shape bug
- Commit `0ffc2e7` — the rows-shape pattern fix (template for the remaining 8 occurrences)
- `.planning/phases/13-performance-infrastructure/13-HUMAN-UAT.md` — full UAT findings, severity, and per-test reasoning
- Closed throwaway PRs: thiagopacheco88-bit/kitsubeat#1, #2 — reference workflow runs `25232789574` and `25276214277`

## Notes

- Neon test branch `kitsubeat-test` already provisioned (copy-on-write off `production`, 0/537 MB used). Connection string lives in `.env.test` (gitignored as of commit `0ffc2e7`) and as the `TEST_DATABASE_URL` GitHub Actions secret.
- The size-limit gate's local invocation works perfectly — when this seed activates, the verification target should be: open a PR, watch sticky comment land within ~30s, breach the budget on a separate PR and watch the gate hard-fail.
- Don't bundle this with feature work. It's a focused infra cleanup. Try to land it as a single phase before any PR-heavy collaboration begins (e.g., before bringing in a contractor or co-founder).
