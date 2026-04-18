---
phase: 10-advanced-exercises-full-mastery
plan: 01
subsystem: database
tags: [drizzle, postgres, fsrs, exercises, premium-gate, schema-migration, vitest]

# Dependency graph
requires:
  - phase: 08-exercise-engine
    provides: "deriveStars 0|1|2, ExerciseType union of 4 Phase 8 types, checkExerciseAccess pure-function gate, RATING_WEIGHTS, EXERCISE_FEATURE_FLAGS"
  - phase: 08.2-fsrs-progressive-disclosure
    provides: "RATING_WEIGHTS ordering invariant (production > recognition > surface), revealedReading=true → rating=1 hatch"
  - phase: 08.1-end-to-end-qa-suite
    provides: "TEST_DATABASE_URL + describe.skip hermetic integration-test pattern, test-db.ts resetTestProgress seam"
provides:
  - "drizzle/0007_advanced_exercises.sql migration: user_song_progress.ex5/ex6/ex7_best_accuracy columns + user_exercise_song_counters table"
  - "Extended ExerciseType union: 4 → 7 (adds grammar_conjugation, listening_drill, sentence_order)"
  - "Widened Question interface: conjugationBase, verseStartMs, verseTokens, translation (one-shot so wave-2 plans don't race)"
  - "deriveStars 0|1|2 → 0|1|2|3 (Star 3 gated on Ex 6 Listening Drill ≥80%)"
  - "deriveBonusBadge predicate (both Ex 5 + Ex 7 ≥80%)"
  - "ExerciseGateStatus union: free|premium|song_quota"
  - "QUOTA_FAMILY map + QUOTA_LIMITS constants (listening=10, advanced_drill=3)"
  - "RATING_WEIGHTS extended to 7 entries"
  - "src/lib/exercises/counters.ts: getSongCountForFamily, userHasTouchedSong, recordSongAttempt (idempotent INSERT)"
  - "checkExerciseAccess(userId, type, { songVersionId? }) quota-aware gate with premium bypass + already-counted re-entry semantics"
  - "makeQuestion + ExerciseSession dispatch stubs so Plans 03/04/05 replace stub bodies only (parallel-safe)"
affects: [10-02-song-catalog-surface, 10-03-grammar-conjugation, 10-04-listening-drill, 10-05-sentence-order, 10-06-saveSessionResults-ex5-6-7-accuracy, 10-07-premium-gate-UI]

# Tech tracking
tech-stack:
  added: []  # No new dependencies — Phase 10 is integration work on existing primitives
  patterns:
    - "Pre-stubbed switch-branch pattern for parallel wave execution: wave-1 carves out stubs; wave-2 plans REPLACE bodies only, never add new cases"
    - "Optional Question-interface field widening in one shot at wave-1 so wave-2 plans don't race on the type definition"
    - "Gate composition: counters.ts is a narrow DB wrapper; gate (access.ts) composes flags + isPremium + counters — isPremium never leaks into the DB layer"
    - "Counter-increment NEVER inside the gate (Pitfall 5 — double-increment on session resume). Increment owned by Plan 06 saveSessionResults."

key-files:
  created:
    - drizzle/0007_advanced_exercises.sql
    - src/lib/exercises/counters.ts
    - src/lib/exercises/__tests__/counters.test.ts
    - .planning/phases/10-advanced-exercises-full-mastery/deferred-items.md
  modified:
    - src/lib/db/schema.ts (userSongProgress + userExerciseSongCounters + deriveStars + deriveBonusBadge)
    - src/lib/exercises/generator.ts (ExerciseType union + Question fields + stubs)
    - src/lib/exercises/feature-flags.ts (song_quota + QUOTA_FAMILY + QUOTA_LIMITS)
    - src/lib/exercises/access.ts (song_quota gate path)
    - src/lib/fsrs/rating.ts (RATING_WEIGHTS 4 → 7 entries)
    - src/app/songs/[slug]/components/ExerciseSession.tsx (dispatch stubs)
    - src/app/actions/exercises.ts (deriveStars ex6 threading + SaveSessionResult widened 0|1|2|3)
    - src/lib/db/queries.ts (deriveStars ex6 threading)
    - src/lib/db/__tests__/derive-stars.test.ts (13 → 21 cases + deriveBonusBadge)
    - src/lib/exercises/__tests__/access.test.ts (4 → 13 cases including song_quota)
    - src/lib/exercises/__tests__/generator.test.ts (Record<ExerciseType, number> init with 3 new keys)
    - tests/support/test-db.ts (resetTestProgress clears counter table)

key-decisions:
  - "Migration number 0007 not 0006 — 0006 already used by Phase 11-05 review_daily_counter"
  - "deriveStars signature: ex6_best_accuracy OPTIONAL (nullable) — backward-compat for legacy callers; missing treated as 0"
  - "stars typed as 0|1|2|3 everywhere (SaveSessionResult, StarDisplay already widened) — SongCard narrow type left for Plan 10-02 per RESEARCH §9"
  - "Counter-increment LIVES IN saveSessionResults/recordVocabAnswer (Plan 06), NEVER in checkExerciseAccess (Pitfall 5)"
  - "Already-touched song always passes song_quota gate (re-entry = not 11th touch)"
  - "Premium bypass is a short-circuit — counter reads skipped entirely for premium users (performance + simplicity)"
  - "QUOTA_LIMITS in feature-flags.ts not access.ts — tests can import the constants and assert precise values"
  - "stars.test.ts from plan text merged into existing derive-stars.test.ts — avoids two suites owning deriveStars"
  - "9 generator stub markers (3×makeQuestion + 3×extractField + 3×makeExplanation) + 3 ExerciseSession = 12 total (plan stated 6 minimum; TypeScript exhaustiveness required the extractField/makeExplanation stubs)"

patterns-established:
  - "Wave-1 type widening: union + interface + stubs in ONE plan so wave-2 plans don't need to touch types — they just replace stub bodies"
  - "Thin counter wrapper (counters.ts) + composed gate (access.ts): gate composes flags + premium + counter; counter module stays narrow"
  - "Mocked unit tests over vi.mock for access gate; integration tests for counters behind describe.skip(!HAS_TEST_DB) guard"
  - "Counter tables use (user_id, family, scope_id) unique triples + ON CONFLICT DO NOTHING for idempotent first-attempt semantics"

requirements-completed: [STAR-04, STAR-06, FREE-05]

# Metrics
duration: 35min
completed: 2026-04-18
---

# Phase 10 Plan 01: Data-layer Foundation for Advanced Exercises + Premium Quota Gate Summary

**Migration 0007 adds ex5/ex6/ex7 accuracy columns + user_exercise_song_counters table; ExerciseType union widened 4 → 7; deriveStars widened 0|1|2 → 0|1|2|3; song_quota gate path with 10/3 independent counters ships.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-04-18T08:07:00Z (approx — init before Task 1)
- **Completed:** 2026-04-18T08:42:12Z
- **Tasks:** 2
- **Files modified:** 13 (+ 4 created)

## Accomplishments

- Drizzle migration `0007_advanced_exercises.sql` — 3 new nullable `real` columns on `user_song_progress` + new `user_exercise_song_counters` table with UNIQUE(user_id, exercise_family, song_version_id) + composite index on (user_id, exercise_family). DB ready for Plans 10-03/04/05/06 to read/write without further schema changes.
- `ExerciseType` union widened from 4 to 7 in a single shot; `Question` interface pre-populated with all four optional fields (`conjugationBase`, `verseStartMs`, `verseTokens`, `translation`) that wave-2 plans need. `makeQuestion`, `extractField`, and `makeExplanation` have throw-stub branches for the 3 new types so wave-2 plans REPLACE stub bodies only. `ExerciseSession.tsx` dispatch switch also stubbed. Wave-2 plans run in parallel without racing on the type.
- `deriveStars` evolved from `0 | 1 | 2` to `0 | 1 | 2 | 3` with ordering-invariant preserved (Star 3 gated on Ex 6 ≥80%, Star 2 gated on Ex 4, Star 1 gated on Ex 1-3). `deriveBonusBadge` added for Ex 5 + Ex 7 dual ≥80% criterion (STAR-06). All 4 call sites in `queries.ts` + `exercises.ts` updated to pass `ex6_best_accuracy`. `SaveSessionResult.stars/previousStars` widened to `0 | 1 | 2 | 3`.
- `song_quota` gate path shipped: `checkExerciseAccess(userId, type, { songVersionId? })` accepts an optional `songVersionId`, short-circuits for premium users, short-circuits for already-counted songs (re-entry = not 11th touch), and returns `quotaRemaining` for UI upsell copy. Missing `songVersionId` returns a structured `"songVersionId required for quota gate"` denial.
- Counters module (`counters.ts`) exposes three narrow primitives: `getSongCountForFamily`, `userHasTouchedSong`, `recordSongAttempt`. All use typed drizzle queries against the new `userExerciseSongCounters` table. No `isPremium` leak, no feature-flag introspection — pure DB wrapper.
- `RATING_WEIGHTS` grew from 4 to 7 entries: `grammar_conjugation=4`, `listening_drill=3`, `sentence_order=4`. Production > recognition > surface invariant preserved.
- Regression guards both hold: no UI imports of `EXERCISE_FEATURE_FLAGS` in `src/app` or `src/stores`; `song_quota` declared in `feature-flags.ts`, consumed only in `access.ts` + tests.
- 34 unit tests green (13 access + 21 derive-stars + deriveBonusBadge); 6 counters integration tests correctly skipped pending TEST_DATABASE_URL; full unit suite 202 tests pass with no regressions.

## Task Commits

Each task committed atomically:

1. **Task 1: Schema + migration + types extension + pre-stubbed dispatch scaffolds** — `8a4a6f4` (feat)
2. **Task 2: Counters module + checkExerciseAccess quota extension + tests** — `dd82cbb` (feat)

**Plan metadata:** to be recorded on final commit after SUMMARY + STATE + ROADMAP update.

## Files Created/Modified

### Created
- `drizzle/0007_advanced_exercises.sql` — Phase 10 DDL (3 accuracy cols + counter table + index)
- `src/lib/exercises/counters.ts` — drizzle wrapper for `user_exercise_song_counters`
- `src/lib/exercises/__tests__/counters.test.ts` — integration suite (TEST_DATABASE_URL-gated)
- `.planning/phases/10-advanced-exercises-full-mastery/deferred-items.md` — pre-existing tsc errors + SongCard narrow-type stale type

### Modified
- `src/lib/db/schema.ts` — `userSongProgress` columns, new `userExerciseSongCounters` pgTable, `deriveStars` widened, `deriveBonusBadge` added
- `src/lib/exercises/generator.ts` — `ExerciseType` widened to 7; `Question` interface gains 4 optional wave-2 fields; 9 throw-stub branches
- `src/lib/exercises/feature-flags.ts` — `ExerciseGateStatus` widened; Phase 10 types mapped to `song_quota`; `QUOTA_FAMILY` + `QUOTA_LIMITS` exported
- `src/lib/exercises/access.ts` — `song_quota` gate path with premium bypass, already-touched re-entry, quota_exhausted response
- `src/lib/fsrs/rating.ts` — `RATING_WEIGHTS` 4 → 7 entries
- `src/app/songs/[slug]/components/ExerciseSession.tsx` — 3 dispatch stubs
- `src/app/actions/exercises.ts` — `deriveStars` calls thread `ex6_best_accuracy`; `SaveSessionResult.stars/previousStars` widened
- `src/lib/db/queries.ts` — `deriveStars` calls thread `ex6_best_accuracy`
- `src/lib/db/__tests__/derive-stars.test.ts` — 21 cases covering 0/1/2/3 + ordering invariant + `deriveBonusBadge`
- `src/lib/exercises/__tests__/access.test.ts` — 13 cases covering all three gate paths including song_quota
- `src/lib/exercises/__tests__/generator.test.ts` — Record<ExerciseType, number> initializers updated for 3 new keys
- `tests/support/test-db.ts` — `resetTestProgress` clears `user_exercise_song_counters`

## Decisions Made

See frontmatter `key-decisions`. Highlights:

- **Migration number 0007 (not 0006)** — avoided collision with existing `0006_review_daily_counter.sql` from Phase 11-05.
- **`ex6_best_accuracy` optional in `deriveStars`** — backward-compat for legacy callers who call without the new field; `null`/`undefined` both treated as 0 (Star 3 unreachable without Ex 6).
- **Counter-increment lives in Plan 06, NOT the gate** — gates are pure reads. Insert happens on first answer per CONTEXT, preventing Pitfall 5 (session-resume double-increment).
- **Already-touched song always passes the gate** — the 11th *distinct* song check uses `userHasTouchedSong`, so users can re-enter a song they already counted and finish without a false 11th-touch denial.
- **`stars.test.ts` from plan text merged into existing `derive-stars.test.ts`** — avoid two suites owning the same pure function. The plan's assertions all landed in the existing file; diffing two files for the same logic would confuse future maintainers.
- **12 stub markers (not 6)** — TypeScript exhaustiveness in `extractField` and `makeExplanation` required stubs to keep the build green. Plan's stated 6 was the minimum for `makeQuestion` + `ExerciseSession`; the extras are mechanical consequences of the union widening.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration number collision**
- **Found during:** Task 1 (writing `drizzle/0006_advanced_exercises.sql`)
- **Issue:** `drizzle/0006_review_daily_counter.sql` already exists from Phase 11-05. Writing a second 0006 would collide.
- **Fix:** Migration renamed to `drizzle/0007_advanced_exercises.sql`. Inline comment documents the rename.
- **Files modified:** `drizzle/0007_advanced_exercises.sql` (new)
- **Verification:** `ls drizzle/` shows clean 0000..0007 sequence
- **Committed in:** `8a4a6f4`

**2. [Rule 3 - Blocking] `deriveStars` signature change required updating callers**
- **Found during:** Task 1 (extending `deriveStars`)
- **Issue:** Widening to `0|1|2|3` and adding `ex6_best_accuracy` parameter broke the `SaveSessionResult.stars: 0|1|2` return type and required threading `ex6_best_accuracy` through 4 call sites.
- **Fix:** Made `ex6_best_accuracy` optional on the function signature (backward compat); widened `SaveSessionResult.stars` and `previousStars` to `0|1|2|3`; updated both `queries.ts` call sites and both `exercises.ts` call sites to thread `row.ex6_best_accuracy`.
- **Files modified:** `src/lib/db/queries.ts`, `src/app/actions/exercises.ts`
- **Verification:** `npx tsc --noEmit` passes for these files (all remaining errors are pre-existing and out of scope)
- **Committed in:** `8a4a6f4`

**3. [Rule 3 - Blocking] `generator.test.ts` Record<ExerciseType, number> exhaustiveness**
- **Found during:** Task 1 (running tsc after widening `ExerciseType`)
- **Issue:** Two test blocks initialize `counts: Record<ExerciseType, number>` with only the 4 Phase 8 keys; widening to 7 breaks the Record.
- **Fix:** Added `grammar_conjugation: 0, listening_drill: 0, sentence_order: 0` to both initializers with a comment noting wave-1 widening.
- **Files modified:** `src/lib/exercises/__tests__/generator.test.ts`
- **Verification:** 20 generator tests still green
- **Committed in:** `8a4a6f4`

**4. [Rule 3 - Blocking] `resetTestProgress` hermeticism for counters integration test**
- **Found during:** Task 2 (writing `counters.test.ts`)
- **Issue:** `resetTestProgress(userId)` only clears `user_song_progress`, `user_vocab_mastery`, `user_exercise_log`. With the new counter table, consecutive counters tests would leak rows across runs.
- **Fix:** Added `DELETE FROM user_exercise_song_counters WHERE user_id = ${userId}` to `resetTestProgress`. Documented in the function's comment.
- **Files modified:** `tests/support/test-db.ts`
- **Verification:** Counters test uses the standard `beforeEach(resetTestProgress)` fixture — hermetic
- **Committed in:** `dd82cbb`

### Planned-but-adjusted Items

- **`src/lib/db/__tests__/stars.test.ts` merged into existing `derive-stars.test.ts`** — the plan named a new filename but a suite already exists for the same function from Phase 08.1-02. Creating a duplicate would split ownership of `deriveStars` assertions. All plan requirements landed in the existing file (21 cases including the new 3-star ordering invariant + `deriveBonusBadge` cases).
- **12 stub markers instead of 6** — plan's grep verification expected 6; TypeScript exhaustiveness required stubs in `extractField` and `makeExplanation` as well. All 12 reference the correct wave-2 plan (10-03/04/05). Plan 10-02/03/04/05 still REPLACE stub bodies only (none need to add new cases).

### Pre-existing Issues (Out of Scope)

- Pre-existing `tsc` errors in `src/app/admin/timing/*`, `src/app/api/admin/songs/route.ts`, `src/app/review/ReviewSession.tsx`, `src/lib/fsrs/scheduler.ts`, `vitest.config.ts`. Logged to `deferred-items.md`.
- Stale narrow type `stars: 0 | 1 | 2` on `SongCard.tsx` — does NOT cause compile errors today (default `progress=null`); Plan 10-02 owns `SongCard` per RESEARCH §9 and will tighten this when the catalog surfaces Star 3 + bonus badge.

---

**Total deviations:** 4 auto-fixed (all Rule 3 blocking) + 2 planned adjustments
**Impact on plan:** All auto-fixes essential for green build and hermetic tests. No scope creep — each fix was the minimum unblocking change to ship the task. Planned adjustments (stars.test.ts merge + 12 stubs) preserve plan intent with cleaner implementation.

## Issues Encountered

- Linter reverted an earlier batch of edits to `generator.ts` mid-way through Task 1; re-applied via fresh Read + Edit. Schema.ts changes survived. Cause: likely an IDE auto-format that reverted to baseline. Recovery was automatic.
- `package.json` + `manifest.ts` + several player-related files appear modified in `git status` from prior work (not touched by this plan). Not staged into task commits — left in working tree for owner to triage.

## User Setup Required

**None.** Plan 10-01 does not touch external services. The counters integration test (`counters.test.ts`) remains in `describe.skip` until the operator provisions TEST_DATABASE_URL — consistent with the existing Phase 08.1-03 pattern. No new env vars, no dashboard config.

To activate the integration suite (operator, any time):
```bash
# One-time DB provisioning (already partially done for Phase 08.1):
# 1. Create kitsubeat_test DB on the Neon project
# 2. Set TEST_DATABASE_URL in .env.test
# 3. Run the new migration against the test DB
npx tsx scripts/apply-migration.ts drizzle/0007_advanced_exercises.sql  # or drizzle-kit push
npm run seed:dev  # populates song_versions for the integration tests
npm run test:integration  # counters.test.ts activates automatically
```

## Next Phase Readiness

### Ready for Wave-2 (parallel)

- **Plan 10-02 (song catalog surface):** ready — can read `ex5_best_accuracy`, `ex6_best_accuracy`, `ex7_best_accuracy` from `user_song_progress` and consume `deriveStars(... , ex6_best_accuracy)` + `deriveBonusBadge({ex5, ex7})`. SongCard narrow `stars: 0 | 1 | 2` type flagged in `deferred-items.md` for this plan's owner to widen.
- **Plan 10-03 (Grammar Conjugation):** ready — REPLACES `case "grammar_conjugation":` stub bodies in generator.ts (extractField + makeExplanation + makeQuestion) and ExerciseSession dispatch. Populates `Question.conjugationBase` + `Question.verseRef` as pre-declared optional fields.
- **Plan 10-04 (Listening Drill):** ready — REPLACES `case "listening_drill":` stubs. Populates `Question.verseStartMs` + `Question.verseTokens`. Star 3 gate already wired.
- **Plan 10-05 (Sentence Order):** ready — REPLACES `case "sentence_order":` stubs. Populates `Question.verseTokens` + `Question.translation`. Uses `revealedReading=true` hatch via existing `ratingFor` signature.
- **Plan 10-06 (saveSessionResults ex5/6/7 accuracy + counter-increment):** ready — consumes `recordSongAttempt` from `counters.ts` at "first answer" guard; extends `saveSessionResults` upsert to write `ex5/ex6/ex7_best_accuracy` via same GREATEST(COALESCE, new) pattern used for ex1_2_3/ex4.
- **Plan 10-07 (premium-gate UI):** ready — `checkExerciseAccess(..., { songVersionId })` returns `{ allowed, reason, quotaRemaining }` for the upsell prompt.

### Parallel-safety contract

All wave-2 plans (10-03/04/05) can run concurrently on the same branch because:

1. Each plan REPLACES stub bodies in 3 places (extractField + makeExplanation + makeQuestion) for ONE unique case — no diff overlap.
2. `Question` interface widening is already complete — no plan needs to touch types.
3. Dispatch stubs in `ExerciseSession.tsx` are per-type — each plan edits its own `if` block.
4. `EXERCISE_FEATURE_FLAGS` + `QUOTA_FAMILY` already mapped — no plan needs to touch flags.

### Blockers / Concerns

- Operator must run migration 0007 against production + TEST_DATABASE_URL before Plan 10-06 lands (which writes the new columns and reads the counter table). This is the standard migration cadence and not a new blocker.

## Self-Check

**Created files verification:**
- FOUND: drizzle/0007_advanced_exercises.sql
- FOUND: src/lib/exercises/counters.ts
- FOUND: src/lib/exercises/__tests__/counters.test.ts
- FOUND: .planning/phases/10-advanced-exercises-full-mastery/deferred-items.md

**Commits verification:**
- FOUND: 8a4a6f4 (Task 1)
- FOUND: dd82cbb (Task 2)

**Tests passing:**
- FOUND: derive-stars.test.ts 21/21 green
- FOUND: access.test.ts 13/13 green
- FOUND: generator.test.ts 20/20 green
- FOUND: counters.test.ts 6/6 skipped (TEST_DATABASE_URL unset — expected)
- FOUND: full unit suite 202 tests pass (no regressions)

## Self-Check: PASSED

---
*Phase: 10-advanced-exercises-full-mastery*
*Completed: 2026-04-18*
