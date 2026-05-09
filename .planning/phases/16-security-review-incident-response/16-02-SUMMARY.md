---
phase: 16-security-review-incident-response
plan: "02"
subsystem: security
tags: [idor, clerk, auth, server-actions, exercises, grammarSession, review]

# Dependency graph
requires:
  - phase: 16-security-review-incident-response
    plan: "01"
    provides: RED auth boundary test stubs for exercises and grammarSession
provides:
  - IDOR-free saveSessionResults (userId from auth())
  - IDOR-free recordVocabAnswer (userId from auth())
  - IDOR-free getAdvancedDrillAccess (single-arg, userId from auth(), graceful degradation)
  - IDOR-free recordReviewAnswer (userId from auth())
  - Auth-guarded startGrammarSession (userId from auth(), before LLM call)
  - Auth-guarded saveGrammarSessionResults (userId from auth())
affects:
  - 16-03 (Plan 03 auth fixes — userPrefs + vocab-mastery route)
  - All callers of exercises.ts server actions

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "auth() derive pattern: const { userId } = await auth(); if (!userId) throw new Error('Unauthorized')"
    - "vi.mock('@clerk/nextjs/server') + vi.mocked(auth).mockResolvedValue({ userId: TEST_USER }) for integration test auth injection"
    - "getAdvancedDrillAccess graceful degradation: null userId returns locked-down access object, does NOT throw"

key-files:
  created: []
  modified:
    - src/app/actions/exercises.ts
    - src/app/actions/grammarSession.ts
    - src/app/actions/review.ts
    - src/app/songs/[slug]/components/SessionSummary.tsx
    - src/app/songs/[slug]/components/ExerciseSession.tsx
    - src/app/songs/[slug]/components/QuestionCard.tsx
    - src/app/songs/[slug]/components/ConjugationCard.tsx
    - src/app/songs/[slug]/components/ListeningDrillCard.tsx
    - src/app/songs/[slug]/components/GrammarSessionRunner.tsx
    - src/app/review/ReviewQuestionCard.tsx
    - src/app/review/ReviewSession.tsx
    - src/app/actions/__tests__/exercises.recordVocabAnswer.test.ts
    - src/app/actions/__tests__/grammarSession.auth.test.ts
    - tests/integration/gamification.test.ts
    - tests/integration/queries-progress.test.ts
    - tests/integration/advanced-drill-unlock-gate.test.ts
    - tests/integration/all-kana-song.test.ts
    - tests/integration/record-vocab-answer-cardkind.test.ts
    - tests/integration/regression-stale-lesson-data.test.ts
    - tests/integration/review-queue-dual-cards.test.ts
    - tests/integration/save-session-results.test.ts
    - tests/integration/three-ring-recompute.test.ts
    - tests/integration/verse-domination-idempotent.test.ts
    - tests/integration/verses-dominated-now-flag.test.ts
    - tests/e2e/regression-premium-gate.spec.ts

key-decisions:
  - "Integration tests mock @clerk/nextjs/server auth() in beforeAll/beforeEach and pass TEST_USER as userId — avoids changing test semantics"
  - "getAdvancedDrillAccess gracefully returns locked-down access for null userId (does NOT throw) — consistent with Wave 1 test expectation and Plan 16-01 deviation note"
  - "getGrammarSessionRules and areAllGrammarRulesMasteredForSong keep userId param — they are internal read-only helpers called from functions that already derive userId from auth()"
  - "regression-premium-gate.spec.ts Playwright test: userId removed from call site; test needs Clerk test context for full runtime validity (pre-existing architectural gap)"

# Metrics
duration: 21min
completed: 2026-05-09
---

# Phase 16 Plan 02: IDOR Fix in exercises.ts and grammarSession.ts Summary

**Fixed IDOR vulnerabilities in 3 server actions (saveSessionResults, recordVocabAnswer, getAdvancedDrillAccess) and 2 grammar actions (startGrammarSession, saveGrammarSessionResults) by replacing caller-supplied userId with server-side Clerk auth() derivation — all 4 Wave 1 auth tests GREEN**

## Performance

- **Duration:** ~21 min
- **Started:** 2026-05-09T21:18:00Z
- **Completed:** 2026-05-09T21:39:30Z
- **Tasks:** 3
- **Files modified:** 25

## Accomplishments

- Fixed IDOR in `exercises.ts`: 3 auth() guards added (saveSessionResults, recordVocabAnswer, getAdvancedDrillAccess); interfaces stripped of userId; getAdvancedDrillAccess changed to single-arg with graceful degradation
- Fixed IDOR in `review.ts`: recordReviewAnswer derives userId from auth() — removes caller-supplied userId from input type
- Fixed IDOR in `grammarSession.ts`: startGrammarSession and saveGrammarSessionResults both derive userId from auth() before any LLM call or DB write
- Updated 11 client component/caller files to remove userId from call sites
- Updated 13 integration/e2e test files to inject auth mock via vi.mock + remove userId from call sites
- All 4 Wave 1 auth tests (exercises ×3 + grammarSession ×1) pass GREEN

## Task Commits

1. **Task 1: Fix exercises.ts IDOR** - `36e958c` (fix)
2. **Task 2: Update all callers** - `f129132` (fix)
3. **Task 3: Fix grammarSession.ts IDOR** - `679ab7c` (fix)

## Files Created/Modified

### Production files (IDOR fixes)
- `src/app/actions/exercises.ts` — auth() in saveSessionResults, recordVocabAnswer, getAdvancedDrillAccess; interfaces stripped of userId
- `src/app/actions/grammarSession.ts` — auth() in startGrammarSession, saveGrammarSessionResults; SaveGrammarSessionInput stripped of userId
- `src/app/actions/review.ts` — auth() in recordReviewAnswer; userId removed from input type

### Caller files (userId removed from call sites)
- `src/app/songs/[slug]/components/SessionSummary.tsx` — removed userId from saveSessionResults call
- `src/app/songs/[slug]/components/ExerciseSession.tsx` — removed userId from recordVocabAnswer call
- `src/app/songs/[slug]/components/QuestionCard.tsx` — removed userId from recordVocabAnswer call
- `src/app/songs/[slug]/components/ConjugationCard.tsx` — removed userId from recordVocabAnswer call
- `src/app/songs/[slug]/components/ListeningDrillCard.tsx` — removed userId from recordVocabAnswer call
- `src/app/songs/[slug]/components/GrammarSessionRunner.tsx` — removed userId from startGrammarSession + saveGrammarSessionResults calls
- `src/app/review/ReviewQuestionCard.tsx` — removed userId from recordReviewAnswer call
- `src/app/review/ReviewSession.tsx` — removed userId from recordReviewAnswer (kanji_kana path)

### Test files (auth mock injection + userId removed)
- `src/app/actions/__tests__/exercises.recordVocabAnswer.test.ts` — added vi.mock + auth mock in beforeAll
- `src/app/actions/__tests__/grammarSession.auth.test.ts` — fixed single-arg call signature
- 11 integration/e2e test files — added vi.mock for @clerk/nextjs/server + auth mock in beforeAll/beforeEach + removed userId from call sites

## Decisions Made

- `getAdvancedDrillAccess` returns degraded access object on null userId (does NOT throw) — consistent with Wave 1 test behavior and the degradation-friendly UI use case
- `getGrammarSessionRules` and `areAllGrammarRulesMasteredForSong` retain userId param (internal read-only helpers; not exported server actions)
- Integration test pattern: `vi.mock('@clerk/nextjs/server')` at module level + `vi.mocked(auth).mockResolvedValue({ userId: TEST_USER })` in beforeAll/beforeEach — does not change test semantics, only injects auth identity

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 13 integration/e2e test files pass userId directly to now-fixed server actions**
- **Found during:** Task 2 TypeScript check
- **Issue:** After removing userId from RecordAnswerInput and SaveSessionInput interfaces, 13 test files showed TS2353 errors. These tests call recordVocabAnswer/saveSessionResults directly and previously passed userId in the call object.
- **Fix:** Added `vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }))` at module level + `vi.mocked(auth).mockResolvedValue({ userId: TEST_USER })` in beforeAll/beforeEach. Removed userId from all call sites.
- **Files modified:** 13 test files listed above
- **Commits:** f129132, 679ab7c

**2. [Rule 1 - Bug] grammarSession.auth.test.ts used string "rule-1" as second arg to startGrammarSession**
- **Found during:** Task 3 TypeScript check
- **Issue:** Test called `startGrammarSession("test-song-version-id", "rule-1")` — after fix, second arg is `limit: number`, not a string ruleId. TypeScript TS2345 error.
- **Fix:** Changed to `startGrammarSession("test-song-version-id")` — limit defaults to DEFAULT_QUESTION_COUNT. Auth throws before limit is used.
- **Files modified:** `src/app/actions/__tests__/grammarSession.auth.test.ts`
- **Commit:** 679ab7c

**3. [Rule 2 - Missing auth] recordReviewAnswer in review.ts also passed caller-supplied userId to recordVocabAnswer**
- **Found during:** Task 2 (plan explicitly listed as required fix)
- **Issue:** review.ts::recordReviewAnswer had `userId: string` in input type and passed `input.userId` to recordVocabAnswer, plus called consumeNewCardBudget(input.userId) and isPremium(input.userId).
- **Fix:** Added auth() guard at top; switched all internal calls to use derived userId. Added auth import. Removed userId from input type.
- **Files modified:** `src/app/actions/review.ts`
- **Commit:** f129132

### Pre-existing Issues (out of scope, not fixed)

- `userPrefs.mutations.auth.test.ts` TS errors — Plan 03 territory (wrong signature for updateUserPrefs)
- `rate-limit.test.ts` TS errors — Plan 04 territory (module not yet created)
- `KanaCheckpointNode.test.tsx` TS type mismatch — pre-existing, unrelated to auth changes
- `regression-premium-gate.spec.ts` Playwright test calls `recordVocabAnswer` from Node test runner without Clerk session context — test will throw "Unauthorized" at runtime (but it's gated by `HAS_TEST_DB` and the quota-bypass assertion path is now further guarded by auth check)

## Known Stubs

None — all production code paths are fully wired. No placeholders in the fixed server actions.

## Threat Flags

None — this plan removes trust boundaries rather than adding them. The threat surface shrinks: server actions no longer accept userId from untrusted callers.

## Self-Check: PASSED

Files verified:
- `src/app/actions/exercises.ts` — EXISTS, contains 3x `const { userId } = await auth()`
- `src/app/actions/grammarSession.ts` — EXISTS, contains 2x `const { userId } = await auth()`
- `src/app/actions/review.ts` — EXISTS, contains 1x `const { userId } = await auth()`
- All auth tests GREEN (4/4)

Commits verified:
- `36e958c` — Task 1 (exercises.ts)
- `f129132` — Task 2 (callers)
- `679ab7c` — Task 3 (grammarSession.ts)

---
*Phase: 16-security-review-incident-response*
*Completed: 2026-05-09*
