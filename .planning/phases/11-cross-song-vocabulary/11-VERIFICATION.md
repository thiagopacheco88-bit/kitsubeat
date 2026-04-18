---
phase: 11-cross-song-vocabulary
verified: 2026-04-18T02:15:00Z
status: passed
score: 5/5 success criteria verified
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "ReviewSession.buildQuestion now calls pickDistractors with jlptPool-derived VocabEntry[], producing real 4-option MCQ cards"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Visit /review as premium user, start a session, verify each question shows 4 answer options"
    expected: "Question card displays 1 correct answer + 3 distractors drawn from the JLPT pool for that card's level"
    why_human: "Can't click buttons programmatically — need to confirm the rendered card UI shows 4 options and not a degenerate single-button card"
  - test: "Visit /review as a free (non-premium) user"
    expected: "Page shows due count and Start Review button; clicking Start opens UpsellModal — queue data is never fetched"
    why_human: "isPremium is a placeholder stub returning true for all users until Clerk auth ships; cannot exercise the free-user branch in the running app without manual override"
---

# Phase 11: Cross-Song Vocabulary Verification Report — Re-verification

**Phase Goal:** Users can see how vocabulary they have mastered in one song carries across other songs, track their total unique Japanese words learned, and access a full vocabulary dashboard — with the cross-song SRS review queue as a premium differentiator.
**Verified:** 2026-04-18T02:15:00Z
**Status:** passed
**Re-verification:** Yes — after gap-closure plan 11-06 (commits 79956b7, e0e1ebc, bbd5867)

---

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Song page shows "You know X/Y words" count | VERIFIED | `KnownWordCount.tsx` renders pill; SSR via `getKnownWordCountForSong` in `page.tsx` line 60 |
| 2 | Vocabulary popover shows "Seen in: song titles" for multi-song words | VERIFIED | `MasteryDetailPopover.tsx` renders `Seen in` section (line 174+); API returns `seenInSongs[]` |
| 3 | Global learned counter visible on profile/dashboard | VERIFIED | `GlobalLearnedCounter.tsx` wired into `layout.tsx` line 60 and `profile/page.tsx` line 24 |
| 4 | Mastery keyed to vocabulary_items UUID — crosses songs automatically | VERIFIED | All queries join on `vocab_item_id`; `getKnownWordCountForSong` uses `vocab_global` CTE with DISTINCT |
| 5 | Premium-gated /review with cross-song SRS queue; free users see counts not queue | VERIFIED | `/api/review/queue` returns 403 for free users (lines 91-98); `ReviewLanding` opens `UpsellModal` for free users; `ReviewSession.buildQuestion` calls `pickDistractors` with real JLPT pool entries — distractors array is no longer hardcoded `[]` |

**Score:** 5/5 success criteria verified

---

## Gap Closure Verification (11-06)

### The Gap: ReviewSession.buildQuestion returned distractors: []

**Previous state (before 11-06):** `buildQuestion()` returned `distractors: []` with an inline comment "Simplified: no distractors in review mode for now". Every review card rendered with a single button (the correct answer), making all questions trivially correct.

**11-06 fix — verified in running code:**

**1. `/api/review/queue/route.ts` — jlptPools field added (lines 141-188)**

After building `vocabData`, the route:
- Collects unique JLPT levels from `vocabData` values (filtering null/empty)
- Builds a `queuedIds` exclusion set from `items[].vocab_item_id`
- Executes one combined drizzle query: `inArray(jlpt_level, levels) AND notInArray(id, queuedIds)`
- Groups results by `jlpt_level`, caps each pool at 50 rows
- Returns `jlptPools` alongside `items`, `vocabData`, `due_count`, `new_count`, `budget_remaining`

The `DbJlptLevel` type alias satisfies drizzle's pgEnum overload without importing `JlptLevel` (which includes `"unknown"` absent from DB enum).

**2. `src/lib/review/distractors.ts` — vocabRowToVocabEntry adapter**

Pure shape adapter (29 lines): converts `VocabRow` (API response shape) to `VocabEntry` (generator input shape). All fields required by `pickDistractors` are populated; `example_from_song` and `additional_examples` get safe empty defaults. `null` `jlpt_level` falls back to `"N5"`.

**3. `src/app/review/ReviewSession.tsx` — buildQuestion now calls pickDistractors (lines 86-125)**

`buildQuestion` accepts a third argument `jlptPools: Record<string, VocabRow[]>` (default `{}`).

Inside the function:
- `poolRows = vocab.jlpt_level ? (jlptPools[vocab.jlpt_level] ?? []) : []`
- `correctEntry = vocabRowToVocabEntry(vocab)`
- `poolEntries = poolRows.map(vocabRowToVocabEntry)`
- `distractors = pickDistractors(correctEntry, item.exerciseType, [], poolEntries)`

`distractors` is the actual `pickDistractors` return value — no longer hardcoded `[]`. A module-level `warnedNullLevel` flag fires `console.warn` at most once per page load when `jlpt_level` is null or pool returns < 3 distractors (accepted edge case documented in 11-VERIFICATION.md CONTEXT notes).

**4. `src/app/review/ReviewLanding.tsx` — jlptPools threaded to ReviewSession**

`QueueResponse` interface includes `jlptPools: Record<string, VocabRow[]>`. In `handleStart`: `setJlptPools(data.jlptPools ?? {})` after `setVocabData`. `<ReviewSession jlptPools={jlptPools} ... />` prop present at line 109. `onBack` resets `setJlptPools({})`.

---

## Required Artifacts — Final Status

| Artifact | Status | Notes |
|----------|--------|-------|
| `src/lib/review/distractors.ts` | VERIFIED | 29 lines, pure adapter, exports `vocabRowToVocabEntry` |
| `src/app/api/review/queue/route.ts` | VERIFIED | jlptPools block lines 141-188; field returned in JSON response |
| `src/app/review/ReviewSession.tsx` | VERIFIED | buildQuestion calls pickDistractors with real pool (lines 100-105) |
| `src/app/review/ReviewLanding.tsx` | VERIFIED | jlptPools state + prop threading complete |
| `src/lib/review/__tests__/distractors.test.ts` | VERIFIED | 131 lines, 7 unit cases + property test for all 3 ReviewQuestionType values |
| `src/app/api/review/queue/__tests__/route.test.ts` | VERIFIED | File exists; 5 integration cases gated by HAS_TEST_DB |

---

## Requirements Coverage — Final

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|---------|
| CROSS-01 | "You know X/Y words" pill on song page | Complete | `KnownWordCount.tsx` + `getKnownWordCountForSong`; REQUIREMENTS.md checked |
| CROSS-02 | "Seen in" cross-song popover | Complete | `MasteryDetailPopover.tsx` line 174; REQUIREMENTS.md checked |
| CROSS-03 | Global learned counter | Complete | `GlobalLearnedCounter.tsx`; REQUIREMENTS.md checked |
| CROSS-04 | Mastery propagates across songs via vocab UUID | Complete | All queries join on `vocab_item_id`; `vocab_global` CTE with DISTINCT; REQUIREMENTS.md checked |
| CROSS-05 | Vocabulary dashboard with all learned words | Complete | `src/app/vocabulary/page.tsx`; REQUIREMENTS.md checked |
| FREE-04 | SRS review queue premium-only | Complete | `/api/review/queue` 403 gate; `ReviewLanding` UpsellModal for free users; REQUIREMENTS.md checked |

All six requirement IDs are marked Complete in both the checklist (`[x]`) and traceability table in `.planning/REQUIREMENTS.md`.

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/app/api/review/queue/route.ts` line 62 | `PLACEHOLDER_USER_ID = "test-user-e2e"` | Info | Auth not wired; `isPremium` always returns true for this placeholder user. Accepted pre-Clerk; Phase 12 replaces. |
| `src/app/review/ReviewLanding.tsx` line 47 | `PLACEHOLDER_USER_ID = "test-user-e2e"` | Info | Same placeholder — same caveat. |
| `src/app/review/ReviewSession.tsx` null jlpt_level path | Single-button card when pool is empty | Info | Accepted edge case per 11-06 design note; `warnedNullLevel` flag fires once per session. |

No blockers found. All info-level items are known and accepted.

---

## Human Verification Required

### 1. Real 4-option MCQ cards in review session

**Test:** Navigate to `/review`, click Start Review, step through several cards.
**Expected:** Each card shows 4 answer buttons (1 correct + 3 distractors from the JLPT pool). No card should show a single button.
**Why human:** `buildQuestion` returns `distractors` from `pickDistractors`; the array will be non-empty when the pool is populated, but confirming that `ReviewQuestionCard` renders all 4 buttons requires visual inspection of the running UI.

### 2. Free-user gate behavior

**Test:** Temporarily override `isPremium` to return `false`, visit `/review`.
**Expected:** Page shows due-count and "Start Review" button with the note "The cross-song review queue is a premium feature." Clicking Start opens `UpsellModal` — the queue fetch never fires.
**Why human:** `isPremium` is a stub returning `true` for `PLACEHOLDER_USER_ID`; the free-user branch cannot be exercised without manual override until Clerk auth ships.

---

## Gaps Summary

No gaps remain. The single blocker from the initial verification — `ReviewSession.buildQuestion` returning `distractors: []` — is closed by plan 11-06. The fix is substantive across all four levels:

- **Server (route.ts):** One combined SQL query builds per-JLPT-level pools, excluding already-queued vocab IDs, capped at 50 per level.
- **Adapter (distractors.ts):** Pure shape conversion from `VocabRow` to `VocabEntry` with correct field mapping.
- **Session logic (ReviewSession.tsx):** `buildQuestion` calls `pickDistractors(correctEntry, type, [], poolEntries)` and returns the result as `distractors`.
- **Wiring (ReviewLanding.tsx):** `jlptPools` state is populated from the queue response and threaded as a prop to `ReviewSession`.

---

_Verified: 2026-04-18T02:15:00Z_
_Verifier: Claude (gsd-verifier) — re-verification after 11-06 gap closure_
