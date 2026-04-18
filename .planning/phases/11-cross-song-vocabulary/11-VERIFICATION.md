---
phase: 11-cross-song-vocabulary
verified: 2026-04-18T00:51:30Z
status: gaps_found
score: 4/5 success criteria verified (1 partial)
re_verification: false
gaps:
  - truth: "Session exercises are drawn from {vocab_meaning, meaning_vocab, reading_match} only — Fill-the-Lyric is never emitted"
    status: partial
    reason: "Type-level exclusion is correct and tests pass, but ReviewSession builds questions with distractors=[] (empty array). A card renders with exactly 1 clickable button (the correct answer), making every review question trivially correct with no real choice. The queue-builder exclusion of fill_lyric is solid; the distractor gap is a UX/functional degradation of the session experience."
    artifacts:
      - path: "src/app/review/ReviewSession.tsx"
        issue: "buildQuestion() returns distractors: [] with comment 'Simplified: no distractors in review mode for now' (line 71). ReviewQuestionCard shuffles [correctAnswer, ...distractors] which yields a single-option question."
    missing:
      - "Fetch JLPT-pool distractors for each card via /api/exercises/jlpt-pool or equivalent, or generate same-POS distractors from vocabulary_items. The plan (11-05 Task 3 Step C) explicitly noted reuse of /api/exercises/jlpt-pool but this was not implemented."
human_verification:
  - test: "Visit /review as premium user, start a session, verify each question shows multiple answer options"
    expected: "Question card should display 4 options (1 correct + 3 distractors)"
    why_human: "The distractors[] stub renders as valid JSX with 1 button — cannot determine from code inspection whether the product team considers single-option questions acceptable for v1 or a blocker"
  - test: "Verify REQUIREMENTS.md tracking: CROSS-01, CROSS-02, CROSS-03 are still marked Pending (not checked)"
    expected: "These should be updated to Complete after phase verification passes"
    why_human: "Tracking document update requires human decision"
---

# Phase 11: Cross-Song Vocabulary Verification Report

**Phase Goal:** Users can see how vocabulary they have mastered in one song carries across other songs, track their total unique Japanese words learned, and access a full vocabulary dashboard — with the cross-song SRS review queue as a premium differentiator.
**Verified:** 2026-04-18T00:51:30Z
**Status:** gaps_found (1 gap: empty distractors in review session)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Song page shows "You know X/Y words" count | VERIFIED | `KnownWordCount.tsx` renders pill; SSR via `getKnownWordCountForSong` in `page.tsx` line 60; "New to you" for zero-known case |
| 2 | Vocabulary popover shows "Seen in: song titles" for multi-song words | VERIFIED | `MasteryDetailPopover.tsx` renders `Seen in` section (line 174+) when `seenInSongs.length >= 2`; API returns `seenInSongs[]` via `getSeenInSongsForVocab` |
| 3 | Global learned counter visible on profile/dashboard | VERIFIED | `GlobalLearnedCounter.tsx` (server component) wired into `layout.tsx` line 60 and `profile/page.tsx` line 24; calls `getGlobalLearnedCount` |
| 4 | Mastery keyed to vocabulary_items UUID — crosses songs automatically | VERIFIED | All queries join on `vocab_item_id`; `getKnownWordCountForSong` uses `vocab_global` CTE with DISTINCT; CROSS-04 is structural, no extra code needed |
| 5 | Premium-gated /review with cross-song SRS queue; free users see counts not queue | PARTIAL | `/review` page correctly shows due count for all users; premium gate enforced at server: `/api/review/queue` returns 403 for free users AND `recordReviewAnswer` throws `premium_required` for free users. Gap: review session questions have empty distractors (single-option questions) |

**Score:** 4/5 success criteria fully verified; 1 partial (functional but UX-degraded)

---

## Required Artifacts

### Plan 11-01 (Data Layer)

| Artifact | Status | Details |
|----------|--------|---------|
| `drizzle/0006_review_daily_counter.sql` | VERIFIED | `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "review_new_today" INTEGER NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS "review_new_today_date" DATE` — idempotent, correct |
| `src/lib/db/schema.ts` | VERIFIED | Lines 279-280 add `review_new_today` and `review_new_today_date` to users table |
| `src/lib/db/queries.ts` | VERIFIED | All 5 functions exported: `getKnownWordCountForSong` (line 446), `getGlobalLearnedCount` (line 492), `getSeenInSongsForVocab` (line 514), `getVocabularyDashboard` (line 557), `getDueReviewQueue` (line 667). `DashboardRow` interface exported at line 417 |
| `src/lib/user-prefs.ts` | VERIFIED | `REVIEW_NEW_DAILY_CAP = 20` at line 14 |

### Plan 11-02 (Song Page Pill)

| Artifact | Status | Details |
|----------|--------|---------|
| `src/app/api/review/known-count/route.ts` | VERIFIED | GET handler with UUID validation, `Cache-Control: private, no-store`, `force-dynamic`, 400/500 error handling |
| `src/app/songs/[slug]/components/KnownWordCount.tsx` | VERIFIED | 58 lines (min_lines=30 met), `"use client"`, fetches `/api/review/known-count` on session end via `useExerciseSession` |
| `src/app/songs/[slug]/page.tsx` | VERIFIED | Imports and calls `getKnownWordCountForSong` at line 60 via `Promise.all` |
| `src/app/songs/[slug]/components/SongContent.tsx` | VERIFIED | Imports `KnownWordCount` (line 13), renders it at line 98, accepts `songId` and `initialKnown` props |

### Plan 11-03 (Seen-In + Global Counter)

| Artifact | Status | Details |
|----------|--------|---------|
| `src/app/api/exercises/vocab-mastery/[vocabItemId]/route.ts` | VERIFIED | Calls `getSeenInSongsForVocab` via `Promise.all` at line 70, includes `seenInSongs` in response (line 117) |
| `src/app/songs/[slug]/components/MasteryDetailPopover.tsx` | VERIFIED | Renders "Seen in" section for 2+ songs (line 174), collapsible for >3, links to song pages |
| `src/app/components/GlobalLearnedCounter.tsx` | VERIFIED | Async server component, calls `getGlobalLearnedCount`, nav+profile variants, no premium gate |
| `src/app/layout.tsx` | VERIFIED | `GlobalLearnedCounter` imported at line 6, rendered at line 60 in header nav |
| `src/app/profile/page.tsx` | VERIFIED | `GlobalLearnedCounter variant="profile"` at line 24, above preferences section |

### Plan 11-04 (Vocabulary Dashboard)

| Artifact | Status | Details |
|----------|--------|---------|
| `src/app/vocabulary/page.tsx` | VERIFIED | 99 lines (min_lines=50 met), server component, awaits `searchParams`, calls `getVocabularyDashboard` + `isPremium` + `getVocabularySources`, applies `rows.slice(0, 20)` for free users |
| `src/app/vocabulary/VocabularyList.tsx` | VERIFIED | Contains "Mastered" section heading, Path B 3-bucket split with documenting comment, uses `SeenInExpander` per row |
| `src/app/vocabulary/FilterControls.tsx` | VERIFIED | `"use client"`, uses `router.push` via `useRouter`, 3 controls (tier, song, sort) |
| `src/app/vocabulary/SeenInExpander.tsx` | VERIFIED | `"use client"`, lazy fetch on first expand, caches result, one-shot per word |

### Plan 11-05 (Review Queue)

| Artifact | Status | Details |
|----------|--------|---------|
| `src/lib/review/queue-builder.ts` | VERIFIED | `buildReviewQueue` exported, `ReviewQuestionType = Exclude<ExerciseType, "fill_lyric">` enforced at type level, deterministic hash rotation |
| `src/lib/review/__tests__/queue-builder.test.ts` | VERIFIED | 139 lines (min_lines=60 met), 11 test cases covering: empty inputs, fill_lyric exclusion (100 ids property test), budget=0, budget cap, due-first order, deterministic types, isNew flags, budget > available, negative budget |
| `src/app/actions/review.ts` | VERIFIED | Exports `startReviewSession`, `recordReviewAnswer`, `consumeNewCardBudget`; premium gate on both `startReviewSession` and `recordReviewAnswer`; atomic upsert with UTC rollover in `consumeNewCardBudget` |
| `src/stores/reviewSession.ts` | VERIFIED | 152 lines, Zustand + persist, `removeNewCards()` action at line 120, `_hasHydrated` guard, persist key `review-session-storage` |
| `src/app/review/page.tsx` | VERIFIED | Server component, calls `isPremium`, `countDue`, `readTodayBudget` in parallel, renders `<ReviewLanding />` |
| `src/app/review/ReviewLanding.tsx` | VERIFIED | `"use client"`, opens `UpsellModal` for free users, fetches `/api/review/queue` for premium users, handles 403 |
| `src/app/review/ReviewSession.tsx` | VERIFIED | Uses `useReviewSession` (not `useExerciseSession`), implements `handleCapReached` race handler, calls `removeNewCards()`, fetches `/api/review/budget`, shows toast, renders summary screen |
| `src/app/review/ReviewQuestionCard.tsx` | VERIFIED (partial) | Uses `useReviewSession`, calls `recordReviewAnswer`, catches `daily_new_card_cap_reached`, calls `onCapReached()`. **Issue: builds questions with `distractors: []`** |
| `src/app/review/ReviewFeedbackPanel.tsx` | VERIFIED | `"use client"`, uses `useState` for accordion (not `useExerciseSession`), no store collision |
| `src/app/api/review/budget/route.ts` | VERIFIED | GET endpoint returning `{budget_remaining}`, no premium gate, `force-dynamic` |
| `src/app/review/UpsellModal.tsx` | VERIFIED | `"use client"`, ESC key handler via `useEffect`, backdrop click closes, links to `/profile` |
| `src/app/api/review/queue/route.ts` | VERIFIED | 403 for free users, calls `getDueReviewQueue` + `buildReviewQueue`, returns `{items, vocabData, due_count, new_count, budget_remaining}`, `Cache-Control: private, no-store` |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `page.tsx` (song) | `getKnownWordCountForSong` | SSR await | WIRED | Line 60 via `Promise.all` |
| `KnownWordCount.tsx` | `/api/review/known-count` | fetch() after session ends | WIRED | Line 28 |
| `/api/review/known-count/route.ts` | `getKnownWordCountForSong` | direct call | WIRED | Line import + call |
| `vocab-mastery/route.ts` | `getSeenInSongsForVocab` | `Promise.all` | WIRED | Lines 70, 94 |
| `GlobalLearnedCounter.tsx` | `getGlobalLearnedCount` | async server component | WIRED | Line 30 |
| `layout.tsx` | `GlobalLearnedCounter` | JSX in header | WIRED | Line 60 |
| `vocabulary/page.tsx` | `getVocabularyDashboard` + `isPremium` | parallel await | WIRED | Lines 50-51 |
| `FilterControls.tsx` | URL searchParams | `router.push` | WIRED | `updateParam` function |
| `SeenInExpander.tsx` | `getSeenInSongsForVocab` (via API) | lazy fetch | WIRED | Fetches `/api/exercises/vocab-mastery/${vocabItemId}` |
| `review.ts` actions | `isPremium` | server-action guard | WIRED | Lines 105, 140 |
| `review.ts::recordReviewAnswer` | `recordVocabAnswer` with songVersionId=null | passthrough | WIRED | Lines 154-162 |
| `review.ts::consumeNewCardBudget` | `users.review_new_today/date` | INSERT...ON CONFLICT | WIRED | Lines 65-79 |
| `queue-builder.ts` | ExerciseType enum | `Exclude<ExerciseType, "fill_lyric">` | WIRED | Type-level |
| `/api/review/queue/route.ts` | `isPremium` → 403 | server guard | WIRED | Lines 80-85 |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|------------|------------|-------------|--------|---------|
| CROSS-01 | 11-02 | "You know X/Y words" pill on song page | SATISFIED | `KnownWordCount.tsx` + `page.tsx` SSR fetch |
| CROSS-02 | 11-03 | "Seen in" song list in vocab popover | SATISFIED | `MasteryDetailPopover.tsx` renders for 2+ songs |
| CROSS-03 | 11-03 | Global learned counter visible on profile/layout | SATISFIED | `GlobalLearnedCounter.tsx` in layout + profile |
| CROSS-04 | 11-02, 11-03, 11-05 | Mastery crosses songs via vocab_item_id identity | SATISFIED | Structural — all queries join on vocab_item_id; confirmed in every query |
| CROSS-05 | 11-04 | Vocabulary dashboard with tier groups + source songs | SATISFIED | `/vocabulary` route renders 3-bucket list, filters, SeenInExpander |
| FREE-04 | 11-05 | Cross-song review queue premium-only; free sees counts | SATISFIED | `/api/review/queue` returns 403 for free; `recordReviewAnswer` throws for free; counts visible via server-rendered `page.tsx` |

Note: REQUIREMENTS.md tracking rows for CROSS-01, CROSS-02, CROSS-03 are still marked "Pending" — the checkbox and table status were not updated. These should be marked Complete.

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/app/review/ReviewSession.tsx:71` | `distractors: []` with comment "Simplified: no distractors in review mode for now" | WARNING | Every review question renders with exactly 1 answer button (the correct answer). Users cannot be tested — clicking the only option always succeeds. The Fill-the-Lyric exclusion is correct; the distractor problem is separate. |

---

## Fill-the-Lyric Exclusion Verification

**Type-level:** `ReviewQuestionType = Exclude<ExerciseType, "fill_lyric">` in `queue-builder.ts` line 23. TypeScript rejects any `fill_lyric` value at compilation.

**Runtime:** `REVIEW_EXERCISE_TYPES = ["vocab_meaning", "meaning_vocab", "reading_match"]` — `fill_lyric` is not in the array. The hash rotation cannot produce it.

**Server action:** `recordReviewAnswer` accepts `exerciseType: Exclude<ExerciseType, "fill_lyric">` — type guard at the persistence boundary.

**Test coverage:** `queue-builder.test.ts` property tests 100 synthetic IDs and asserts `exerciseType !== "fill_lyric"` for all.

**Assessment:** Fill-the-Lyric exclusion is correctly enforced at every layer.

---

## Premium Gate Verification

### /review route

| Layer | Gate | Method |
|-------|------|--------|
| Server component (`page.tsx`) | No gate (displays counts to all) | Intended — free users see count |
| API endpoint (`/api/review/queue`) | 403 for non-premium | `isPremium()` server-side, line 80 |
| Server action (`recordReviewAnswer`) | Throws `"premium_required"` | `isPremium()` server-side, line 140 |
| Client UI (`ReviewLanding`) | Opens UpsellModal | Client check on `isPremium` prop from server |

**Assessment:** Premium gate is enforced at the server/data layer (API + server action), not just in the UI. A free user who bypasses the UI and calls the API directly gets a 403.

### /vocabulary route

| Layer | Gate | Method |
|-------|------|--------|
| Server component (`page.tsx`) | `rows.slice(0, 20)` in-memory | `isPremium()` server-side, line 49; slice at line 63 |
| Client UI | Upgrade CTA rendered conditionally | `hiddenCount > 0 && !premium` |

**Assessment:** The preview cutoff is enforced at the server component (SSR) — `VocabularyList` only receives the first 20 rows; the remaining rows are never sent to the browser for free users.

---

## Human Verification Required

### 1. Review Session Distractor Quality

**Test:** Visit `/review` as premium user (or with `isPremium` returning true), start a session, observe a question card
**Expected:** Each question should display 4 answer options — 1 correct + 3 distractors from the same JLPT level
**Why human:** The code renders `shuffle([correctAnswer, ...distractors])` where `distractors=[]`, producing 1 button. Whether this is acceptable for v1 or a release blocker is a product decision.

### 2. REQUIREMENTS.md Tracking Update

**Test:** Open `.planning/REQUIREMENTS.md` and update CROSS-01, CROSS-02, CROSS-03 checkbox + table status from Pending to Complete
**Expected:** All 6 Phase 11 requirements marked Complete
**Why human:** Tracking document update requires human action; no code change needed

### 3. KnownWordCount pill on fully-mastered song

**Test:** Visit a song where the user has mastered all words, verify pill still appears (no "incomplete song" filter)
**Expected:** Pill shows "You know N/N words" — the plan says "for incomplete songs" but implementation shows for all songs. Confirm this behavior is acceptable.
**Why human:** The success criterion says "for incomplete songs" but the implementation shows for all songs. The "New to you" / count display covers both cases semantically.

---

## Gaps Summary

One functional gap blocks full goal achievement:

**Empty distractors in /review session** — `ReviewSession.tsx::buildQuestion()` returns `distractors: []` for all cards. The `ReviewQuestionCard` shuffles `[correctAnswer]` producing a single-option MCQ where users click the only button and always receive "Correct". The plan (11-05 Task 3 Step C) explicitly described fetching JLPT-pool distractors via `/api/exercises/jlpt-pool` but this was not implemented. The gap does not affect any other surface (song page pill, vocabulary dashboard, global counter, seen-in popover — all fully working).

The gap is tagged `partial` rather than `failed` because:
- The type-level and runtime fill_lyric exclusion is complete and tested
- The session loop, FSRS persistence, premium gate, and daily cap race handling all work correctly
- The distractor issue is a UX degradation of the session experience, not a missing feature at the goal level

The cross-song review queue IS delivered as a premium differentiator. A free user clicking Start sees the UpsellModal. A premium user gets a functional session — just with trivially easy questions until distractors are added.

---

_Verified: 2026-04-18T00:51:30Z_
_Verifier: Claude (gsd-verifier)_
