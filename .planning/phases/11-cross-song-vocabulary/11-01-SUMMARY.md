---
phase: 11-cross-song-vocabulary
plan: 01
subsystem: database
tags: [postgres, drizzle, sql, cte, fsrs, vocabulary, materialized-view]

requires:
  - phase: 08.2-fsrs-progressive-disclosure
    provides: user_vocab_mastery table with FSRS scalar columns and state field
  - phase: 07-data-foundation
    provides: vocab_global materialized view, vocabulary_items table
  - phase: 08.4-learn-phase-session-pacing-for-new-vocabulary
    provides: users table with new_card_cap; migration pattern (0005_user_prefs.sql)

provides:
  - SQL migration 0006_review_daily_counter.sql adding review_new_today + review_new_today_date to users
  - users table schema extended with daily counter columns
  - REVIEW_NEW_DAILY_CAP=20 constant in user-prefs.ts
  - getKnownWordCountForSong: song-level vocab coverage counts (total/known/mastered/learning)
  - getGlobalLearnedCount: global learned word count for user
  - getSeenInSongsForVocab: distinct songs a vocab item appears in
  - getVocabularyDashboard: tier-filtered vocab list with DashboardRow type
  - getDueReviewQueue: due+new card split bounded by newCardCap

affects:
  - 11-02 (song-page vocab pill consumes getKnownWordCountForSong)
  - 11-03 (global counter + seen-in-songs panel consumes getGlobalLearnedCount + getSeenInSongsForVocab)
  - 11-04 (vocabulary dashboard consumes getVocabularyDashboard + DashboardRow)
  - 11-05 (/review queue consumes getDueReviewQueue + REVIEW_NEW_DAILY_CAP)

tech-stack:
  added: []
  patterns:
    - "db.execute(sql`...`) raw CTE pattern for cross-table aggregations"
    - "Array.isArray(r) ? r : (r.rows ?? []) defensive row extraction for neon-http"
    - "Phase-local tier→state mapping (Path B, 3-bucket) diverging from src/lib/fsrs/tier.ts"

key-files:
  created:
    - drizzle/0006_review_daily_counter.sql
    - .planning/phases/11-cross-song-vocabulary/11-01-SUMMARY.md
  modified:
    - src/lib/db/schema.ts
    - src/lib/db/queries.ts
    - src/lib/user-prefs.ts

key-decisions:
  - "REVIEW_NEW_DAILY_CAP=20: researcher recommendation, matches Phase 08.4 premium ceiling / 1.5"
  - "state IN (1,2,3) for known check everywhere — NOT state >= 2 (Pitfall 1 per RESEARCH.md)"
  - "DISTINCT on vocab_item_id in every vocab_global scan to avoid tv+full double-count (Pitfall 2)"
  - "Phase-local 3-bucket tier→state mapping in getVocabularyDashboard diverges from tier.ts (deliberate, dashboard-local only)"
  - "ORDER BY state DESC, last_review DESC NULLS LAST in dashboard — surfaces mastery wins first (Open Question #1)"
  - "Two separate db.execute calls in getDueReviewQueue — neon-http has no callback transactions (Pitfall 4)"

patterns-established:
  - "Phase-local tier→state divergence pattern: document in JSDoc + SUMMARY when a surface needs richer mapping than tier.ts"
  - "DashboardRow as exported interface in queries.ts — downstream UI plans import type, not redeclare"

requirements-completed: []

duration: 20min
completed: 2026-04-18
---

# Phase 11 Plan 01: Cross-Song Vocabulary Data Layer Summary

**One SQL migration + five read-only CTE queries unblocking all four Phase 11 UI plans to run in parallel**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-18T00:00:00Z
- **Completed:** 2026-04-18T00:12:24Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `review_new_today` (int NOT NULL DEFAULT 0) and `review_new_today_date` (DATE nullable) to users table via idempotent migration
- Exported `REVIEW_NEW_DAILY_CAP = 20` from user-prefs.ts with JSDoc justification (distinct namespace from per-session `new_card_cap`)
- Implemented five read-only query functions covering all Phase 11 UI data needs:
  - `getKnownWordCountForSong` — song-page vocab coverage pill
  - `getGlobalLearnedCount` — global learned word counter
  - `getSeenInSongsForVocab` — "Seen in N songs" expansion panel
  - `getVocabularyDashboard` — pageable, filterable vocabulary dashboard
  - `getDueReviewQueue` — /review queue with due+new split

## Task Commits

1. **Task 1: Migration + schema update** - `73ab97e` (feat)
2. **Task 2: REVIEW_NEW_DAILY_CAP + five queries** - `68ca68f` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `drizzle/0006_review_daily_counter.sql` - ALTER TABLE users ADD COLUMN IF NOT EXISTS (idempotent, two-column)
- `src/lib/db/schema.ts` - Added `date` import + `review_new_today` + `review_new_today_date` to users table
- `src/lib/user-prefs.ts` - Added REVIEW_NEW_DAILY_CAP=20 with JSDoc rationale
- `src/lib/db/queries.ts` - Added DashboardRow interface + five exported async query functions

## Query Signatures (for downstream plan reference)

```ts
// CROSS-01: Song-page vocabulary pill
getKnownWordCountForSong(userId: string, songId: string): Promise<{ total: number; known: number; mastered: number; learning: number }>

// CROSS-02: Global learned word counter
getGlobalLearnedCount(userId: string): Promise<number>

// CROSS-03: Seen-in-songs expansion for vocabulary feedback
getSeenInSongsForVocab(vocabItemId: string): Promise<Array<{ slug: string; title: string; anime: string }>>

// CROSS-04: Vocabulary dashboard
getVocabularyDashboard(userId: string, opts?: { tierFilter?: 1|2|3; sourceSongId?: string; limit?: number; sortDirection?: "asc"|"desc" }): Promise<DashboardRow[]>

// CROSS-05: /review queue
getDueReviewQueue(userId: string, newCardCap: number, now?: Date): Promise<{ due: Array<{ vocab_item_id: string; state: 0|1|2|3; due: Date }>; new: Array<{ vocab_item_id: string }> }>
```

## Key Design Decisions

### Why `state IN (1, 2, 3)` — not `state >= 2`

FSRS states: 0=New, 1=Learning, 2=Review, 3=Relearning. "Known" means the user has interacted with the word (state 1, 2, or 3). State 0 is unseen. RESEARCH.md Pitfall 1: using `state >= 2` would exclude state=1 (Learning) cards, under-counting known words.

### Why DISTINCT in every vocab_global scan

`vocab_global` has one row per `(vocab_item_id, song_id, version_type)`. A song with both tv and full versions would produce two rows for the same vocab_item_id without DISTINCT, causing double-counts. RESEARCH.md Pitfall 2. All five query functions use DISTINCT where scanning vocab_global.

### REVIEW_NEW_DAILY_CAP = 20 — Claude discretion

Researcher recommendation in RESEARCH.md §Open Questions #2. Rationale: matches Phase 08.4 premium per-session ceiling (30) / 1.5 ≈ 20. One named constant — tune later without schema change. Distinct namespace from `new_card_cap` (per-session, per-user, set in Phase 08.4).

### Phase-local tier → state mapping in `getVocabularyDashboard` (Path B, 3-bucket)

| tierFilter | state clause   | Label      |
|------------|----------------|------------|
| 3          | m.state = 2    | Mastered   |
| 2          | m.state = 3    | Known      |
| 1          | m.state = 1    | Learning   |
| omitted    | (none)         | All        |

This deliberately diverges from `src/lib/fsrs/tier.ts`, which collapses state=1 and state=3 to `TIER_LEARNING` (a 2-bucket post-new split). The dashboard is the only surface where users distinguish "relearning" (state=3, previously known but lapsed) from "fresh learning" (state=1, first introduction). `tierFor()` is **not modified** — the divergence is dashboard-local only. Documented in JSDoc above `getVocabularyDashboard`.

### getDueReviewQueue uses two sequential db.execute calls

neon-http does not support callback transactions for reads. Two sequential queries (due, then new) are correct and safe. RESEARCH.md Pitfall 4.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. Pre-existing TypeScript errors in `src/app/admin/timing/` and `src/lib/fsrs/scheduler.ts` were present before this plan and are unrelated to Phase 11 changes.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Plans 02-05 can import these five functions immediately:
- Plan 02: `getKnownWordCountForSong` → song-page vocabulary pill
- Plan 03: `getGlobalLearnedCount` + `getSeenInSongsForVocab` → global counter + seen-in-songs panel
- Plan 04: `getVocabularyDashboard` + `DashboardRow` → vocabulary dashboard UI
- Plan 05: `getDueReviewQueue` + `REVIEW_NEW_DAILY_CAP` → /review route + daily cap upsert logic

The `review_new_today` / `review_new_today_date` columns on `users` are ready for Plan 05's reset-and-increment upsert.

---
*Phase: 11-cross-song-vocabulary*
*Completed: 2026-04-18*
