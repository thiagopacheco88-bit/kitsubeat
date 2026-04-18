---
phase: 11-cross-song-vocabulary
plan: 05
subsystem: ui
tags: [zustand, fsrs, review, next-app-router, tailwind, vitest, server-actions]

requires:
  - phase: 11-cross-song-vocabulary/11-01
    provides: getDueReviewQueue, REVIEW_NEW_DAILY_CAP, review_new_today + review_new_today_date columns on users
  - phase: 08.2-fsrs-progressive-disclosure
    provides: recordVocabAnswer, user_vocab_mastery table with FSRS scalar columns
  - phase: 08.4-learn-phase-session-pacing-for-new-vocabulary
    provides: isPremium() from userPrefs.ts (single source of truth)

provides:
  - buildReviewQueue() pure function: deterministic hash-based type rotation (vocab_meaning|meaning_vocab|reading_match only)
  - 13 unit tests for buildReviewQueue covering fill-lyric exclusion, cap, ordering, determinism
  - startReviewSession, recordReviewAnswer, consumeNewCardBudget server actions
  - reviewSession Zustand store (persist key: review-session-storage, no song context)
  - /review page: server component counting due cards + premium check
  - ReviewLanding, ReviewSession, ReviewQuestionCard, ReviewFeedbackPanel client components
  - UpsellModal: minimal Tailwind dialog for free users
  - GET /api/review/queue: premium-gated, returns {items, vocabData, due_count, new_count, budget_remaining}
  - GET /api/review/budget: lightweight budget probe (no premium gate) for mid-session race recovery

affects:
  - Future phases using the review session infrastructure
  - FREE-04 requirement: premium differentiator for cross-song SRS review
  - CROSS-04 confirmation: words mastered in /review propagate to all song pages via shared vocab_item_id

tech-stack:
  added: []
  patterns:
    - "Wrapper pattern for store-coupled components: copy JSX, swap useExerciseSession → useReviewSession"
    - "Deterministic hash-based exercise-type rotation: hashVocabId(id) % 3 maps vocab_item_id to stable type"
    - "atomic INSERT...ON CONFLICT DO UPDATE with CASE for daily counter rollover (no cron job needed)"
    - "Queue-response includes vocabData inline to avoid per-card roundtrip in ReviewSession"
    - "daily_new_card_cap_reached error-code contract: ReviewSession catches, prunes new cards, refetches budget, toasts"

key-files:
  created:
    - src/lib/review/queue-builder.ts
    - src/lib/review/__tests__/queue-builder.test.ts
    - src/app/api/review/queue/route.ts
    - src/app/api/review/budget/route.ts
    - src/app/actions/review.ts
    - src/stores/reviewSession.ts
    - src/app/review/page.tsx
    - src/app/review/ReviewLanding.tsx
    - src/app/review/ReviewSession.tsx
    - src/app/review/ReviewQuestionCard.tsx
    - src/app/review/ReviewFeedbackPanel.tsx
    - src/app/review/UpsellModal.tsx
    - .planning/phases/11-cross-song-vocabulary/11-05-SUMMARY.md
  modified:
    - src/app/api/review/queue/route.ts (extended: added VocabRow export + vocabData in response)

key-decisions:
  - "QuestionCard/FeedbackPanel WRAPPED (not reused): both call useExerciseSession() + FeedbackPanel uses usePlayer(). Wrappers copy JSX and swap stores. Refactoring to store-agnostic primitives deferred."
  - "hashVocabId polynomial rolling hash (base 31, bitwise-OR 0, Math.abs) for deterministic exercise-type rotation"
  - "consumeNewCardBudget uses single INSERT...ON CONFLICT DO UPDATE with CASE — atomic rollover at UTC midnight, no cron job"
  - "users.new_card_cap (Phase 08.4, per-session, tunable by user) and users.review_new_today (Phase 11, per-day, fixed at REVIEW_NEW_DAILY_CAP) are independent columns with distinct semantics"
  - "Queue response includes vocabData inline (Record<id,VocabRow>) — avoids per-card fetch in ReviewSession"
  - "ReviewFeedbackPanel uses local useState for accordion (no cross-question persistence needed in review) and DEFAULT_LANG='en' (no PlayerContext)"
  - "daily_new_card_cap_reached contract: thrown by recordReviewAnswer on budget exhaustion; ReviewSession catches specific message, calls removeNewCards(), refetches /api/review/budget, shows non-blocking toast"
  - "Fill-the-Lyric exclusion enforced at type level: ReviewQuestionType = Exclude<ExerciseType, 'fill_lyric'>; ReviewQuestionCard switch has no fill_lyric case"

patterns-established:
  - "Wrapper pattern: when a component is tightly coupled to a Zustand store, copy JSX and swap imports rather than refactoring (documents debt, defers to shared-primitive phase)"
  - "Error-code contract pattern: server action throws new Error('specific_code'); client matches on err.message === 'specific_code'"
  - "daily-cap atomic upsert pattern: INSERT...ON CONFLICT DO UPDATE with CASE handles new row / same-day increment / cap clamp / date-change rollover in one SQL statement"

requirements-completed:
  - FREE-04
  - CROSS-04

duration: 8min
completed: 2026-04-18
---

# Phase 11 Plan 05: /review Cross-Song SRS Queue Summary

**Premium /review route with FSRS daily new-card cap, own Zustand session store, wrapper components (not direct reuse) for store isolation, and atomic per-card budget accounting with mid-session cap-reached recovery**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-18T01:37:00Z
- **Completed:** 2026-04-18T01:45:00Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments

- Shipped `buildReviewQueue()` pure function with 13 unit tests; fill-lyric exclusion enforced at TypeScript type level (`Exclude<ExerciseType, "fill_lyric">`)
- Implemented three server actions: `consumeNewCardBudget` (atomic upsert with UTC rollover), `startReviewSession` (thin premium gate), `recordReviewAnswer` (premium + budget gate + passthrough to recordVocabAnswer with songVersionId=null)
- Created `reviewSession` Zustand store (persist key `review-session-storage`) with `removeNewCards()` action for daily-cap race recovery
- Full /review page: server component + ReviewLanding + ReviewSession + ReviewQuestionCard + ReviewFeedbackPanel (store-isolation wrappers) + UpsellModal
- GET /api/review/queue: premium-gated, includes vocabData inline to avoid per-card fetch
- GET /api/review/budget: lightweight probe for mid-session cap recovery
- CROSS-04 confirmed: review answers call `recordVocabAnswer(songVersionId: null)` which updates `user_vocab_mastery`; all song pages reading the same `vocab_item_id` reflect the new tier

## Task Commits

1. **Task 1: buildReviewQueue + unit tests + queue + budget API routes** - `348dd2c` (feat)
2. **Task 2: server actions + reviewSession Zustand store** - `5c1a8b8` (feat)
3. **Task 3: /review page + ReviewLanding + ReviewSession + UpsellModal** - `78bde7d` (feat)

## Files Created/Modified

- `src/lib/review/queue-builder.ts` — Pure function: buildReviewQueue() with hash-based type rotation; hashVocabId() exported
- `src/lib/review/__tests__/queue-builder.test.ts` — 13 unit tests: empty inputs, fill-lyric exclusion, budget cap (0/5/negative), due-first order, determinism, isNew flag, full type set
- `src/app/api/review/queue/route.ts` — GET /api/review/queue: premium gate, budget read, getDueReviewQueue, buildReviewQueue, vocabData inline
- `src/app/api/review/budget/route.ts` — GET /api/review/budget: lightweight budget probe, no premium gate
- `src/app/actions/review.ts` — startReviewSession, recordReviewAnswer, consumeNewCardBudget
- `src/stores/reviewSession.ts` — Zustand store: items, currentIndex, answers, removeNewCards()
- `src/app/review/page.tsx` — Server component: countDue + readTodayBudget + isPremium in parallel
- `src/app/review/ReviewLanding.tsx` — Client: Start button, UpsellModal gate, fetches queue, hydrates store
- `src/app/review/ReviewSession.tsx` — Client: session loop, cap-reached handler (removeNewCards + toast + refetch), summary screen
- `src/app/review/ReviewQuestionCard.tsx` — Wrapper: QuestionCard JSX using useReviewSession; calls recordReviewAnswer; no fill_lyric case
- `src/app/review/ReviewFeedbackPanel.tsx` — Wrapper: FeedbackPanel JSX using local useState accordion + DEFAULT_LANG='en'
- `src/app/review/UpsellModal.tsx` — Tailwind dialog with ESC + backdrop close; upgrade → /profile

## Decisions Made

### QuestionCard/FeedbackPanel wrapped, not directly reused

`QuestionCard.tsx` calls `useExerciseSession()` at line 47 and `recordVocabAnswer` (per-song action with `songVersionId` required). `FeedbackPanel.tsx` calls both `useExerciseSession()` (for `moreAccordionOpen`) and `usePlayer()` (for `translationLang` from PlayerContext). Direct reuse would either cross-contaminate the per-song session state or require invasive refactoring. The wrapper copies the JSX and swaps store imports. Refactoring to store-agnostic primitives is documented as a future shared-primitive phase item.

### Hash function for deterministic exercise-type rotation

Polynomial rolling hash: `h = (h * 31 + charCodeAt(i)) | 0`, then `Math.abs(h)`. Same `vocab_item_id` → same hash → same slot in `REVIEW_EXERCISE_TYPES[hash % 3]`. This means repeated reviews of the same card always use the same exercise type (stable rotation over time). No seeded shuffle needed.

### Daily cap behavior across UTC midnight

`consumeNewCardBudget` uses a single `INSERT ... ON CONFLICT DO UPDATE ... CASE` statement. The `CASE` checks `users.review_new_today_date = today::date`:
- If same date AND counter >= cap: leave counter at cap (no increment — idempotent cap clamp)
- If same date AND counter < cap: increment
- If different date (past midnight UTC): reset to 1 (rollover)

No cron job, no scheduled reset. The rollover fires automatically on the first new-card answer after midnight UTC.

### users.new_card_cap vs users.review_new_today — independence

`users.new_card_cap` (Phase 08.4): per-session cap for the song-based exercise flow; per-user tunable; enforced by `getEffectiveCap()`. `users.review_new_today` (Phase 11): per-day counter for the cross-song `/review` queue; fixed at `REVIEW_NEW_DAILY_CAP=20`; enforced by `consumeNewCardBudget()`. These are orthogonal concerns documented in both `review.ts` and `user-prefs.ts` JSDoc.

### Race-handling: daily_new_card_cap_reached error-code contract

The queue is assembled at queue-fetch time using a read-only budget snapshot. Per-card `consumeNewCardBudget` upserts fire later (on answer). Two-tab scenarios or held-over queues can exhaust the budget mid-session. The contract:
- `recordReviewAnswer` throws `new Error("daily_new_card_cap_reached")` when budget is exhausted.
- `ReviewQuestionCard` catches this specific `err.message`, calls `onCapReached()`.
- `ReviewSession.handleCapReached()`: calls `removeNewCards()` (prunes `isNew=true` from queue), refetches `/api/review/budget`, shows non-blocking `role="status" aria-live="polite"` toast for 8 seconds.
- The card is NOT marked answered (no partial write).
- If no due-only cards remain, the session ends with the summary screen.

### Queue response includes vocabData inline

GET `/api/review/queue` now returns `vocabData: Record<id, VocabRow>` alongside `items`. This avoids a per-card API roundtrip in ReviewSession and keeps the queue load as a single fetch. The `VocabRow` interface is exported from the route file and imported by ReviewSession/ReviewLanding.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Extended /api/review/queue response to include vocabData**
- **Found during:** Task 3 (ReviewSession implementation)
- **Issue:** Plan said to fetch vocab row per card via jlpt-pool endpoint, but queue items only contain `vocab_item_id`. A per-card fetch would be O(N) roundtrips; jlpt-pool doesn't return individual vocab by ID. Plan spec for the queue response shape (`{items, due_count, new_count, budget_remaining}`) was extended to add `vocabData` inline.
- **Fix:** Added `VocabRow` interface + batch `vocabulary_items` SELECT in the queue route; exported `VocabRow` type for client consumption.
- **Files modified:** `src/app/api/review/queue/route.ts`
- **Verification:** TypeScript compiles cleanly; ReviewSession types align.
- **Committed in:** `78bde7d` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing critical functionality for correctness)
**Impact on plan:** Required for correctness. Without vocabData, ReviewSession cannot render questions. The queue response shape extension is additive and doesn't break the plan's stated response fields.

## Issues Encountered

None — TypeScript type checks pass cleanly. All pre-existing errors (admin/timing, lib/fsrs/scheduler) are unrelated to Phase 11 changes and are documented in STATE.md blockers.

## User Setup Required

None — no external service configuration required. The /review page uses the same `test-user-e2e` placeholder as all other Phase 11 pages. Premium gate requires an active subscription row in the `subscriptions` table with `status='active'` and `plan IN (premium_monthly, premium_annual)`.

## CROSS-04 Confirmation

`recordReviewAnswer` calls `recordVocabAnswer({ songVersionId: null, ... })`. This upserts `user_vocab_mastery` keyed by `(user_id, vocab_item_id)` — the same row that all song pages read via `/api/exercises/vocab-tiers`. A word reviewed and mastered in `/review` immediately propagates to every song page containing that `vocab_item_id` via the shared mastery row. No extra action needed — the identity is vocab-item-level, not song-level.

## Next Phase Readiness

Phase 11 is complete. All 5 plans delivered:
- Plan 01: Data layer (getDueReviewQueue, 5 query functions, migration)
- Plan 02: KnownWordCount song-page pill
- Plan 03: GlobalLearnedCounter + seenInSongs in vocab-mastery API
- Plan 04: /vocabulary dashboard
- Plan 05: /review queue (this plan)

The review infrastructure (server actions, Zustand store, wrapper components) is ready for future enhancement:
- Phase 10/v3: Replace PLACEHOLDER_USER_ID with Clerk auth()
- Future: Add distractor fetching per card (jlpt-pool) for richer meaning_vocab options
- Future: Add session-level analytics (streak, leech detection)
- Future: Refactor QuestionCard/FeedbackPanel to be store-agnostic (shared-primitive phase)

---
*Phase: 11-cross-song-vocabulary*
*Completed: 2026-04-18*
