# Testing — KitsuBeat QA Suite

Single entry point for running the test suite locally and in CI. Four layers
(seed/QA, unit, integration, E2E) under a 15-minute speed budget and a
zero-flake policy. For known operator follow-ups (TEST_DATABASE_URL
provisioning, the pre-existing Localizable rendering bug that gates live E2E
runs of plans 05/06/07), see
[`.planning/phases/08.1-end-to-end-qa-suite/deferred-items.md`](.planning/phases/08.1-end-to-end-qa-suite/deferred-items.md).

## Running the suite

**Prerequisites:** `TEST_DATABASE_URL` set (separate Neon DB from `DATABASE_URL`).

**Ordering matters.** `npm run test:all` runs `test:seed` first; when running
individual layers manually, **always run `npm run test:seed` first** or you
will hit a stale catalog. Stale-seed mismatch is the single most common cause
of spurious failures.

```bash
npm run test:seed         # Reset test DB catalog (run FIRST when running layers manually)
npm run test:unit         # Vitest unit (pure TS, no DB)
npm run test:integration  # Vitest integration (DB + API handlers)
npm run test:e2e          # Playwright E2E (browser + real YouTube iframe)
npm run test:qa           # Content QA (lesson coverage, UUID integrity, geo audit)
npm run test:all          # All layers (chained — seed first, then everything)
npm run test:measure      # Like test:all but tiered-timed + asserts <15min budget
npm run test:quarantine   # Run only the [kb-quarantine]-tagged tests (debug only)
```

## Test DB

A dedicated Neon/Postgres database, separate from `DATABASE_URL`. Set
`TEST_DATABASE_URL` in `.env.test` (see `.env.test.example`). Run `npm run db:push`
against it once to create the schema, then `npm run seed:dev` to populate the
seeded slugs (`again-yui`, `red-swan-yoshiki-feat-hyde`,
`mayonaka-no-orchestra-aqua-timez` — the last is geo-restricted on purpose for
plan 08.1-07 regression).

`TEST_USER_ID` is the constant `'test-user-e2e'`. Its progress is wiped after
every test by the `testUser` fixture — DO NOT use this user in dev work.

## Zero-flake policy

- `retries: 0` is non-negotiable. Locked at `playwright.config.ts` and
  grep-audited — adding `test.describe.configure({ retries: N })` or `.retry(N)`
  is a regression. CI must not auto-retry; it hides real bugs.
- A flaky test is **quarantined**, not silently skipped. See "Quarantine" below.
- Maximum 3 simultaneously quarantined tests across the whole suite. If the
  count exceeds 3, the suite is considered degraded and the team must drain
  the queue before shipping new features.

### Quarantine

A test that goes flaky:

1. Add `[kb-quarantine]` to its title:
   `test("[kb-quarantine] resume session after long idle", async () => { ... })`
2. Add an inline TODO with date + reason:
   `// TODO(2026-04-17): network jitter on YT iframe; see issue #NNN`
3. Default runs (`npm run test:e2e`, `npm run test:all`,
   `npm run test:measure`) skip it via `grepInvert` in `playwright.config.ts`.
4. To debug it: `npm run test:quarantine` (Playwright) or
   `KB_RUN_QUARANTINE=1 npm run test:unit` (Vitest, via
   `tests/support/quarantine.ts` helper).
5. Quarantine is a HOLDING PEN — every quarantined test must be fixed within
   one sprint or removed. It is not a parking lot.

## Speed budget

Full suite must complete in **< 15 minutes** on a clean checkout. Enforced by
`scripts/qa/measure-suite-runtime.ts` which times each layer and exits non-zero
on overrun. Use `--budget <ms>` to override (debug only).

CI runs are tiered (see `.github/workflows/qa-suite.yml`):
- **PR runs (`test:ci-pr`):** unit + integration + qa only — no E2E. Keeps PR
  feedback under ~3 minutes.
- **Nightly (`test:ci-nightly`):** full `test:measure` including E2E + budget
  assertion.

## Layers

| Layer       | Runner | Scope | Where |
|-------------|--------|-------|-------|
| unit        | vitest | Pure TS — generator, deriveStars, checkExerciseAccess, FSRS scheduler | `src/**/*.test.ts` |
| integration | vitest | DB queries + Next route handler invocations, no browser | `tests/integration/**/*.test.ts` |
| e2e         | playwright | Real browser + real YouTube iframe — player + exercise flows + regression | `tests/e2e/*.spec.ts` |
| seed/qa     | tsx | Lesson JSONB coverage, UUID integrity, geo audit, TV-pack skip | `scripts/seed/06-qa-*.ts` |

## Test hooks

Test-only globals + data attributes carried by production code. Gated EXCLUSIVELY
on `process.env.NEXT_PUBLIC_APP_ENV === 'test'` (single condition; never OR'd
with `NODE_ENV` — keeps dev/prod bundles tree-shaken):

- `window.__kbPlayer` (gated) — YouTube IFrame API handle. `YouTubeEmbed.tsx`.
- `window.__kbExerciseStore` (gated) — Zustand session handle. `src/stores/exerciseSession.ts`.
- `data-start-ms` on `VerseBlock` (gated) — verse timing for sync lookups.
- `data-verse-number`, `data-active` on `VerseBlock` — UNGATED (cheap, useful in dev devtools).
- `data-question-id|type|feedback|stars` on exercise UI — UNGATED. State only, never answers.
- `data-yt-state` on `YouTubeEmbed` — UNGATED. `loading|ready|error`. Used by geo-fallback regression.
