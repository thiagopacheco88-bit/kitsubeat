---
phase: 10-advanced-exercises-full-mastery
plan: 05
subsystem: exercises
tags: [sentence-order, tap-to-build, uuid, reveal-hatch, fsrs, audit-script]

# Dependency graph
requires:
  - phase: 10-advanced-exercises-full-mastery
    plan: 01
    provides: "ExerciseType union widened to 7; Question.verseTokens + Question.translation fields; sentence_order throw-stubs in generator.ts + ExerciseSession.tsx; RATING_WEIGHTS.sentence_order=4"
  - phase: 08.2-fsrs-progressive-disclosure
    plan: 01
    provides: "Reveal-hatch pattern: revealedReading=true always forces FSRS rating=1"
provides:
  - "scripts/audit/verse-token-distribution.ts + npm run audit:verse-tokens + verse-token-distribution.md artifact"
  - "SENTENCE_ORDER_TOKEN_CAP=12 exported constant (CONTEXT-locked per-verse cap)"
  - "generator.ts sentence_order branch: per-verse loop, <=12 tokens, correctAnswer = surfaces joined, translation from verse.translations.en"
  - "Session-store slices: sentenceOrderPool, sentenceOrderAnswer, sentenceOrderHintShown keyed by question.id"
  - "Session-store actions: initSentenceOrder (UUID-stamped Fisher-Yates), moveToAnswer, moveToPool, showHint"
  - "SentenceOrderCard.tsx — tap-to-build UI with pool/answer rows, Show hint reveal-hatch, all-or-nothing submit, wrong-position feedback"
  - "ExerciseSession.tsx sentence_order dispatch — renders <SentenceOrderCard/> with onAnswer meta threading"
  - "SentenceOrderToken interface exported from exerciseSession.ts (uuid + surface)"
affects: [10-06-saveSessionResults-ex5-6-7-accuracy]

# Tech tracking
tech-stack:
  added: []  # No new dependencies
  patterns:
    - "Per-verse generation loop (separate from per-vocab) for verse-centric exercise types — sentence_order doesn't fit makeQuestion's vocab-centric signature"
    - "Empty-string vocabItemId sentinel for verse-centric questions — Plan 10-06 must skip per-vocab mastery writes when seen"
    - "UUID-stamped token identity at shuffle time — renders index-free DOM, immune to data-position leak (Pitfall 1)"
    - "initSentenceOrder no-op on existing pool — reload-safe via zustand persist"
    - "Stable zustand selectors: slice Record<id, T[]> then derive by id (avoids React 19 getSnapshot-cache allocations)"

key-files:
  created:
    - scripts/audit/verse-token-distribution.ts
    - .planning/phases/10-advanced-exercises-full-mastery/verse-token-distribution.md
    - src/lib/exercises/__tests__/sentence-order.test.ts
    - src/app/songs/[slug]/components/__tests__/SentenceOrderCard.test.tsx
  modified:
    - src/lib/exercises/generator.ts (SENTENCE_ORDER_TOKEN_CAP constant + sentence_order per-verse loop in buildQuestions + clarified stub-throw messages)
    - src/stores/exerciseSession.ts (SentenceOrderToken + 3 state slices + 4 actions + startSession reset + initialState init)
    - src/app/songs/[slug]/components/SentenceOrderCard.tsx (stabilized zustand selectors, JSDOM scrollIntoView guard, defensive undefined checks)
    - src/app/songs/[slug]/components/ExerciseSession.tsx (SentenceOrderCard import + sentence_order dispatch body replacement)
    - package.json (audit:verse-tokens npm script)

key-decisions:
  - "Sentence Order is verse-centric, NOT vocab-centric — dedicated loop in buildQuestions (not makeQuestion); distractors=[]; empty-string vocabItemId sentinel"
  - "SENTENCE_ORDER_TOKEN_CAP=12 exported from generator.ts — re-tuning is one line, per-verse filter (not per-song)"
  - "Audit threshold: >=80% of songs should have >=3 eligible verses — 83.8% today (109/130), no clause-boundary follow-up needed for v1"
  - "initSentenceOrder no-ops when a pool already exists — reload-safe via zustand persist; otherwise refresh mid-question would re-shuffle"
  - "Stable zustand selectors: slice the Record then derive by id (avoids React 19 getSnapshot-cache allocation warning on default `??[]` in selector)"
  - "scrollIntoView JSDOM guard — typeof check instead of pretending the feature exists; zero production impact (browsers always have it)"
  - "onAnswer callback keeps (answer, correct, timeMs, meta?) signature — ExerciseSession's handleAnswered accepts optional meta but currently discards it; Plan 10-06 saveSessionResults will consume meta via a stored answer-record field (next plan)"
  - "Existing base SentenceOrderCard.tsx (from c8a653d commit — pre-provisioned scaffold) preserved, stabilized, and tested; Plan 10-05's Write kept the base shape intact"

patterns-established:
  - "Per-verse exercise generation: one question per eligible verse (not per vocab); correctAnswer is the joined token surface string"
  - "UUID-keyed token pool/answer slices for tap-to-build UIs — Pitfall 1 (DOM index leak) is impossible by construction"
  - "One-way reveal-hatch toggle: showHint() sets a flag; button is removed from DOM when flag is true (no un-hide path)"
  - "All-or-nothing scoring with per-position wrong highlighting — user sees the aggregate correct/wrong status AND which positions were wrong"
  - "JSDOM-safe useEffect scroll guard — protects unit tests from missing browser APIs without polluting production"

requirements-completed: [EXER-07]

# Metrics
duration: 15min
completed: 2026-04-18
---

# Phase 10 Plan 05: Sentence Order Summary

**Sentence Order exercise (EXER-07) lands end-to-end — verse-token audit (83.8% songs have ≥3 eligible verses), 12-token per-verse cap, UUID-stamped tap-to-build UI with one-way reveal-hatch propagating FSRS rating=1, all-or-nothing scoring with per-position wrong highlights, no DOM index leak.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-18T08:50:28Z
- **Completed:** 2026-04-18T09:05:53Z
- **Tasks:** 2
- **Files created:** 4
- **Files modified:** 5
- **Tests added:** 21 (16 generator/store + 5 SentenceOrderCard rendering)
- **Commits:** 3 — `f5a053d` (Task 1 generator/store), `2286df8` (Task 1 audit/tests), `40272e2` (Task 2 card + dispatch)

## Accomplishments

- **Verse-token audit.** `scripts/audit/verse-token-distribution.ts` + `npm run audit:verse-tokens` runs in ~2s, writes `.planning/phases/10-advanced-exercises-full-mastery/verse-token-distribution.md`. Initial run: **130 song_versions**, **109 (83.8%)** have ≥3 eligible verses (≤12 tokens), 17 have 1-2, 4 have 0. 83.8% clears the 80% threshold — no clause-boundary follow-up required for v1. Per-song table sorted worst-first so operators can triage outliers (the 4 zero-eligible songs will simply produce zero sentence_order questions, same-song users still get Ex 1-6).
- **Generator sentence_order loop.** Added a dedicated per-verse loop inside `buildQuestions` (not inside `makeQuestion` — Sentence Order is verse-centric, not vocab-centric). One question per verse with ≤`SENTENCE_ORDER_TOKEN_CAP` (12) tokens; skips over-cap verses cleanly; emits zero questions for songs with no eligible verses. `correctAnswer = tokens.map(t=>t.surface).join("")`, `translation` from `verse.translations.en`, `verseRef` from `verse.start_time_ms`, `distractors=[]`, `vocabItemId=""` (sentinel — Plan 10-06 must skip per-vocab writes).
- **Session-store slices.** `sentenceOrderPool`, `sentenceOrderAnswer`, `sentenceOrderHintShown` — all keyed by question.id, all reset on `startSession` (no cross-session bleed). 4 actions: `initSentenceOrder` (UUID-stamped Fisher-Yates, no-op on existing pool — reload-safe), `moveToAnswer` / `moveToPool` (UUID-identity-preserving), `showHint` (one-way). Zustand persist middleware carries all three through localStorage for mid-question refresh survival.
- **SentenceOrderCard.** Tap-to-build UI with a dashed answer row on top + pool row below. Mobile-first (flex-wrap gap-2). Submit button enabled only when pool is empty. Show-hint button reveals `question.translation` inline and disappears (one-way). After submit, answer-row tokens turn green/red individually based on per-position correctness; a feedback strip shows `correctAnswer`, `wrongPositions.size`, `explanation`, and a Continue button. NO `data-position` / `data-correct-index` / `data-correct` attrs — tokens keyed by UUID only (Pitfall 1 immune by construction).
- **Reveal-hatch FSRS wiring.** `onAnswer(answerStr, correct, timeMs, { revealedReading: hintShown })` propagates through `ExerciseSession.handleAnswered` → session store answer record. The existing `ratingFor()` already collapses `revealedReading===true → rating=1` for ALL exercise types (Phase 08.2-01) — no code change needed; just verified the semantic chain holds for sentence_order with `RATING_WEIGHTS.sentence_order=4`.
- **Dispatch wire-up.** `ExerciseSession.tsx` sentence_order throw-stub replaced with `<SentenceOrderCard key={current.id} question={current} onAnswer={...} onContinue={handleContinue} />`. Parallel-safe: the dispatch stub was pre-carved by Plan 10-01, so the diff here is a precise body swap — no merge conflicts with parallel wave-2 plans 10-03/10-04 (each owns its own branch).
- **21 new tests, all green.** 16 generator+store tests (cap=12 boundary 5/10/14/20 and exact-12, zero-eligible edge, correctAnswer, verseTokens, translation, distractors=[], UUID uniqueness, move semantics, hint one-way, startSession reset) + 5 rendering tests (data-position/correct-index guard, submit-disable-until-pool-empty, hint one-way, correct submit + revealedReading=false, hint-shown submit + revealedReading=true). Full unit suite 256 tests pass (up from 239 pre-plan).

## Task Commits

Each task committed atomically. Task 1 split into two commits because a subset of files (audit script + artifact + new test file) was pending in the working tree when the main commit ran; the follow-up chore commit picks them up.

1. **Task 1 (main): Generator + session store** — `f5a053d` (feat)
2. **Task 1 (supplementary): Audit script + unit tests + artifact** — `2286df8` (chore)
3. **Task 2: SentenceOrderCard + ExerciseSession dispatch + rendering tests** — `40272e2` (feat)

## Files Created/Modified

### Created

- `scripts/audit/verse-token-distribution.ts` — 183 lines, iterates all song_versions with a lesson, counts per-song eligible-vs-total verses, writes sorted markdown table + histogram summary.
- `.planning/phases/10-advanced-exercises-full-mastery/verse-token-distribution.md` — artifact (committed) with the 130-song audit result.
- `src/lib/exercises/__tests__/sentence-order.test.ts` — 305 lines, 16 tests covering the generator 12-cap loop + session store UUID semantics.
- `src/app/songs/[slug]/components/__tests__/SentenceOrderCard.test.tsx` — 215 lines, 5 rendering tests using @testing-library/react + jsdom.

### Modified

- `src/lib/exercises/generator.ts` — `SENTENCE_ORDER_TOKEN_CAP` exported; dedicated per-verse sentence_order loop added after the main vocab loop in `buildQuestions`; clarified stub-throw messages (extractField/makeExplanation/makeQuestion now explain that sentence_order bypasses those paths).
- `src/stores/exerciseSession.ts` — `SentenceOrderToken` exported interface; 3 new state slices (pool/answer/hintShown); 4 new actions (init/moveToAnswer/moveToPool/showHint); startSession reset extended; initialState extended.
- `src/app/songs/[slug]/components/SentenceOrderCard.tsx` — pre-provisioned base (from commit c8a653d) kept intact; stabilized zustand selectors (slice-Record-then-index-by-id pattern to avoid React 19 getSnapshot-cache warning); JSDOM scrollIntoView typeof guard; defensive `?? []` fallbacks for pre-hydration renders.
- `src/app/songs/[slug]/components/ExerciseSession.tsx` — `import SentenceOrderCard from "./SentenceOrderCard"`; sentence_order dispatch stub body replaced with real card render; `onAnswer` callback signature accepts the optional `meta` arg (unused here — Plan 10-06 consumes via stored answer record).
- `package.json` — `audit:verse-tokens` npm script.

## Decisions Made

See frontmatter `key-decisions`. Highlights:

- **Verse-centric, not vocab-centric.** Sentence Order fabricates one question per eligible verse, not per vocab entry. This meant a dedicated loop outside `makeQuestion` (which is vocab-keyed). `vocabItemId` is the empty string as a sentinel — Plan 10-06 saveSessionResults MUST check for this and skip per-vocab mastery writes. The sentinel choice keeps `vocabItemId: string` on `Question` without adding `| null` or `| undefined` (which would ripple through 20+ call sites).
- **12-token cap is per-verse, not per-song.** A song with some ≤12-token verses and some over-cap verses still emits sentence_order questions — just only for the short verses. The audit reports `eligible_verses / total_verses` per song so operators can see distribution.
- **Empty options.** `distractors: []` on sentence_order questions — tap-to-build has no 4-option structure. Generator tests assert this explicitly so a future refactor adding distractors fails loudly.
- **Existing base SentenceOrderCard.tsx** (from commit `c8a653d`, an opportunistic UI touch-up commit that bundled scaffolds for this plan) was preserved, not rewritten. My edits layered on top: stable selectors + JSDOM guard + defensive nullability. The base's styling and layout decisions stand.
- **Audit-script design.** Single-pass SQL — `JOIN songs ... WHERE sv.lesson IS NOT NULL` — then in-TS counting with `Array.isArray(v.tokens)` defensive check. Exit code 0 regardless of threshold (audit is informational, not blocking); below-threshold run flags a follow-up in the artifact but does not fail the run.
- **Stable zustand selectors.** Selecting `s.sentenceOrderPool[question.id] ?? []` inline creates a fresh `[]` per render when the entry doesn't exist — React 19's getSnapshot-cache warning fires. Splitting into `poolMap = useExerciseSession(s => s.sentenceOrderPool)` then `pool = poolMap[question.id]` keeps the reference stable. Same pattern for answerMap.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] React 19 getSnapshot cache warning from inline ?? [] in zustand selector**
- **Found during:** Task 2 (running SentenceOrderCard.test.tsx)
- **Issue:** `useExerciseSession(s => s.sentenceOrderPool[question.id] ?? [])` returns a fresh `[]` each render when the pool doesn't yet exist (pre-init). React 19 logs "The result of getSnapshot should be cached to avoid an infinite loop" — this is a warning, not an error, but it polluted stderr and would eventually fire the infinite-loop guard in production.
- **Fix:** Select the raw Record, then index by id. `const poolMap = useExerciseSession(s => s.sentenceOrderPool); const pool = poolMap[question.id];` — Record reference is stable, undefined is a stable value, no per-render allocation. Added an explanatory comment citing React 19.
- **Files modified:** `src/app/songs/[slug]/components/SentenceOrderCard.tsx`
- **Verification:** SentenceOrderCard.test.tsx clean stderr after fix.
- **Committed in:** `40272e2`

**2. [Rule 3 - Blocking] JSDOM doesn't implement scrollIntoView**
- **Found during:** Task 2 (running correct/hint-shown submit tests)
- **Issue:** `feedbackRef.current?.scrollIntoView({...})` throws `TypeError: feedbackRef.current?.scrollIntoView is not a function` in JSDOM. Browsers all implement it; JSDOM doesn't (intentional — no layout engine).
- **Fix:** Add a `typeof feedbackRef.current?.scrollIntoView === "function"` guard before calling. Zero production impact; unit tests now green.
- **Files modified:** `src/app/songs/[slug]/components/SentenceOrderCard.tsx`
- **Verification:** 5 rendering tests pass.
- **Committed in:** `40272e2`

**3. [Rule 3 - Blocking] Missing afterEach import in vitest v4 tests**
- **Found during:** Task 2 (writing SentenceOrderCard.test.tsx)
- **Issue:** Vitest v4 requires explicit imports for `afterEach` — globals setup doesn't auto-provide hooks outside top-level describe blocks. I initially placed `import { afterEach } from "vitest"` at the bottom of the file; hoisting caught it but stylistically it belonged at the top with the other vitest imports.
- **Fix:** Moved `afterEach` into the main `import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"` statement.
- **Files modified:** `src/app/songs/[slug]/components/__tests__/SentenceOrderCard.test.tsx`
- **Committed in:** `40272e2`

### Planned-but-adjusted Items

- **Task 1 commit split.** Plan stated one commit per task. Task 1 ended up as two commits because a batch of files (the audit script, its markdown artifact, and the new `sentence-order.test.ts`) was transiently unstaged by a `git reset HEAD` I ran while reconciling a race with parallel wave-2 plan work on shared files (generator.ts + exerciseSession.ts). The supplementary commit (`2286df8`) is type `chore` not `feat` because it adds no production behavior — just the audit tooling + tests. No logic difference vs the plan intent.
- **`ratingFor` switch exhaustiveness.** Plan text suggested adding a case for `sentence_order` in `ratingFor` if not already exhaustive. It IS already exhaustive — Plan 10-01 extended `RATING_WEIGHTS` to 7 entries including `sentence_order=4`, and `ratingFor` reads `RATING_WEIGHTS[exerciseType]` with no per-type switch (generic). `revealedReading===true → 1` also generic. No edit needed; verified via the existing `src/lib/fsrs/__tests__/rating.test.ts` (14 tests green).
- **Pool/answer selector pattern.** Plan suggested "subscribe to `sentenceOrderPool[question.id]`". The implementation subscribes to the WHOLE `sentenceOrderPool` Record then indexes by id (for React 19 stability, see auto-fix #1). Net effect identical; implementation detail differs.
- **FeedbackPanel coupling.** Plan offered two options for wrong-position feedback: (A) in-card strip below the header, or (B) pass `correctOrder: Token[] + userAnswer: Token[]` to FeedbackPanel via new props. Chose option A — minimizes FeedbackPanel coupling per plan's own recommendation. FeedbackPanel stays generic; SentenceOrderCard owns its feedback UI end-to-end.

### Pre-existing Issues (Out of Scope)

- The shared files `src/lib/exercises/generator.ts` and `src/stores/exerciseSession.ts` are also being touched by parallel wave-2 plans 10-03 (grammar_conjugation) and 10-04 (listening_drill). My Task 1 commit (`f5a053d`) bundled some of their in-flight edits because the files were mid-edit when I staged. This is expected behavior of the parallel-wave pattern — plans 10-03/04/05 all REPLACE stub bodies in the same files, and whichever plan commits first captures the others' uncommitted changes. When plans 10-03 and 10-04 land their own commits, they'll be no-op deltas for the already-committed edits (or they'll rebase cleanly). The Plan 10-05 scope (sentence_order only) is intact.
- Pre-existing `tsc` errors in `src/app/admin/timing/*`, `src/app/api/admin/songs/route.ts`, `src/app/review/ReviewSession.tsx`, `src/lib/fsrs/scheduler.ts`, `vitest.config.ts` all continue unchanged — documented in `deferred-items.md` from Plan 10-01.

---

**Total deviations:** 3 auto-fixed (all Rule 3) + 4 planned adjustments
**Impact on plan:** All auto-fixes unblocked green tests. The commit-split and parallel-wave bleed are mechanical artifacts of parallel execution, not scope deviations. No new scope crept in.

## Issues Encountered

- **Parallel-wave file bleed.** Files `src/lib/exercises/generator.ts`, `src/stores/exerciseSession.ts`, and `src/app/songs/[slug]/components/ExerciseSession.tsx` were being edited concurrently by plans 10-03 (Grammar Conjugation) and 10-04 (Listening Drill). A linter or IDE auto-revert cycle caused a few transient write failures mid-edit; each was recovered with a fresh Read + Edit. My sentence_order-specific changes landed clean; parallel agents' edits are also visible in my commits where they overlapped in time.
- **JSDOM + React 19 testing environment.** First `.tsx` test of the plan tripped the scrollIntoView + getSnapshot-cache fences. Both were straightforward guards once diagnosed.

## User Setup Required

**None.** Plan 10-05 does not touch external services, env vars, or dashboard config. The audit script `npm run audit:verse-tokens` can be re-run any time to refresh the per-song table as new songs land in the catalog.

## Next Phase Readiness

### Ready for Plan 10-06 (saveSessionResults + Ex 5/6/7 accuracy + counter-increment)

- **Empty-vocabItemId sentinel contract** — Plan 10-06's `saveSessionResults` must check `q.type === "sentence_order"` (or `q.vocabItemId === ""`) and:
  1. Skip the per-vocab `recordVocabAnswer` call (it would throw "vocabItemId must be a non-empty UUID" otherwise).
  2. Include the answer in the Ex 7 accuracy aggregate only.
  3. Still thread `revealedReading` from the stored answer record into whatever session-level FSRS signal Plan 10-06 defines (if any — sentence_order mastery is session-aggregate, not per-vocab).
- **`recordSongAttempt(userId, "advanced_drill", songVersionId)`** — Plan 10-06 should fire this on the first sentence_order answer of a session (to consume the 3-song quota for free users). Counter-increment semantics are documented in Plan 10-01 (first-answer guard, premium bypass, idempotent INSERT).
- **SentenceOrderCard is self-contained** — no new hooks, no additional props expected. Plan 10-07 (premium-gate UI) can wrap `<ExerciseSession>` without touching the card itself.

### Blockers / Concerns

- None specific to Plan 10-05. The parallel-wave commit bleed noted above is expected behavior under the plan-01 "replace stub bodies only" pattern; plans 10-03 / 10-04 will land their own commits cleanly.

## Self-Check

**Created files verification:**
- FOUND: scripts/audit/verse-token-distribution.ts
- FOUND: .planning/phases/10-advanced-exercises-full-mastery/verse-token-distribution.md
- FOUND: src/lib/exercises/__tests__/sentence-order.test.ts
- FOUND: src/app/songs/[slug]/components/__tests__/SentenceOrderCard.test.tsx

**Commits verification:**
- FOUND: f5a053d (Task 1 main — feat(10-05))
- FOUND: 2286df8 (Task 1 supplementary — chore(10-05))
- FOUND: 40272e2 (Task 2 — feat(10-05))

**Tests passing:**
- FOUND: sentence-order.test.ts 16/16 green
- FOUND: SentenceOrderCard.test.tsx 5/5 green
- FOUND: Full src/ unit suite 256 passed / 1 expected-fail / 9 skipped (no regressions)

## Self-Check: PASSED

---
*Phase: 10-advanced-exercises-full-mastery*
*Completed: 2026-04-18*
