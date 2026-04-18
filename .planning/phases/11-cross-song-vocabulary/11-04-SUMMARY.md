---
phase: 11-cross-song-vocabulary
plan: 04
subsystem: ui
tags: [react, nextjs, tailwind, server-components, client-components, vocabulary, fsrs, premium]

requires:
  - phase: 11-cross-song-vocabulary
    provides: getVocabularyDashboard + DashboardRow from Plan 01; seenInSongs on vocab-mastery API from Plan 03
  - phase: 08.4-learn-phase-session-pacing-for-new-vocabulary
    provides: isPremium helper in userPrefs.ts

provides:
  - /vocabulary route (server component, Next-15 async searchParams)
  - VocabularyList.tsx: tier-grouped server-renderable list with Path B 3-bucket state mapping
  - FilterControls.tsx: client component with URL-synced tier/song/sort filters via router.push
  - SeenInExpander.tsx: per-row lazy-fetch client component for seenInSongs expansion
  - getVocabularySources private helper in page.tsx (NOT exported — page-local only)
  - Free-tier 20-row preview with upgrade CTA; premium sees full list

affects:
  - Phase 10 (Clerk auth): PLACEHOLDER_USER_ID replacement point in page.tsx
  - 11-05 (/review): /vocabulary link forward-reference now resolves

tech-stack:
  added: []
  patterns:
    - "Phase-local 3-bucket state split: state 2=Mastered, 3=Known, 1=Learning — diverges from tierFor() deliberately"
    - "In-memory preview cutoff (slice) rather than SQL LIMIT — single-query accurate total for CTA"
    - "Private page-local helper pattern: getVocabularySources lives in page.tsx, not queries.ts"
    - "Lazy-fetch + cache pattern in SeenInExpander: fetch once on first expand, no re-fetches"

key-files:
  created:
    - src/app/vocabulary/page.tsx
    - src/app/vocabulary/VocabularyList.tsx
    - src/app/vocabulary/FilterControls.tsx
    - src/app/vocabulary/SeenInExpander.tsx
    - .planning/phases/11-cross-song-vocabulary/11-04-SUMMARY.md

key-decisions:
  - "Path B 3-bucket split (state 2/3/1) in VocabularyList — NOT tierFor() — divergence documented in component JSDoc"
  - "In-memory FREE_PREVIEW_LIMIT=20 slice vs SQL LIMIT: single query, accurate total, simpler upgrade CTA"
  - "getVocabularySources private to page.tsx — only used here, not worth polluting queries.ts exports"
  - "SeenInExpander lazy fetch on first expand, cached in useState — avoids O(N) API calls on page load"
  - "Free/premium gating via isPremium() from userPrefs.ts (Phase 08.4 single source of truth)"

patterns-established:
  - "Private page-local SQL helper pattern: define async function at top of page.tsx, not exported"
  - "Phase-local divergence comment pattern: paragraph-length JSDoc at top of component explaining why tierFor() is NOT used"

requirements-completed: [CROSS-05]

duration: 4min
completed: 2026-04-18
---

# Phase 11 Plan 04: Vocabulary Dashboard Summary

**Vocabulary dashboard at /vocabulary: tier-grouped word list with URL-synced filters, lazy seenInSongs expansion, and free-tier 20-row preview with upgrade CTA**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-18T00:29:58Z
- **Completed:** 2026-04-18T00:33:18Z
- **Tasks:** 2
- **Files modified:** 4 (all created new)

## Accomplishments

- Created the `/vocabulary` server route with Next-15 async searchParams, parallel `Promise.all` for premium check + dashboard query + sources query, and in-memory FREE_PREVIEW_LIMIT=20 preview cutoff
- Built VocabularyList.tsx with the locked Path B 3-bucket split (Mastered=state 2, Known=state 3, Learning=state 1) and a paragraph-length divergence comment explaining why `tierFor()` must NOT replace the direct state inspection
- Built FilterControls.tsx client component with three URL-synced controls (tier dropdown, source song dropdown, sort toggle)
- Built SeenInExpander.tsx lazy-fetch client component: fetches `/api/exercises/vocab-mastery/[id]` once on first expand, caches in useState, subsequent toggles are instant

## Task Commits

1. **Task 1: /vocabulary server page + filter controls + list rendering** - `98a7aec` (feat)
2. **Task 2: SeenInExpander client component for per-row source songs** - `c2c12ef` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/app/vocabulary/page.tsx` — Server component; async searchParams; parallel isPremium + getVocabularyDashboard + getVocabularySources; in-memory preview slice; upgrade CTA
- `src/app/vocabulary/VocabularyList.tsx` — Server component; Path B 3-bucket grouping; per-row metadata (dictionary form, reading, romaji, meaning, POS pills, JLPT pill, due date, SeenInExpander)
- `src/app/vocabulary/FilterControls.tsx` — Client component; tier/song/sort dropdowns/button; router.push with URLSearchParams
- `src/app/vocabulary/SeenInExpander.tsx` — Client component; lazy fetch on first open; cached result; song links to /songs/[slug]

## Key Design Decisions

### Path B 3-bucket split — why not tierFor()

`src/lib/fsrs/tier.ts::tierFor` collapses state=1 and state=3 to a single `TIER_LEARNING` bucket. Every other surface (TierText, KnownWordCount pill) only needs two post-new labels. The vocabulary dashboard is the one place users benefit from seeing "fresh learning" (state=1, first introduction) separately from "lapsed and relearning" (state=3, previously known but now due). VocabularyList.tsx reads `state` directly and documents the divergence in a paragraph-length comment at the top of the file. Do not replace with `tierFor()`.

State → bucket mapping (LOCKED):

| state | bucket   | FSRS meaning          |
|-------|----------|-----------------------|
| 2     | Mastered | Review (stable)       |
| 3     | Known    | Relearning (lapsed)   |
| 1     | Learning | Learning (first-pass) |
| 0     | —        | Excluded by SQL WHERE |

### getVocabularySources — private page helper, not in queries.ts

The query is specific to the vocabulary dashboard page. Putting it in queries.ts would expose it as a module-level export used exactly once. The private async function at the top of page.tsx pattern keeps it co-located with its single consumer and avoids growing the queries.ts surface unnecessarily.

### In-memory preview cutoff vs SQL LIMIT

Free users see the first 20 rows. The cutoff is applied via `rows.slice(0, FREE_PREVIEW_LIMIT)` in-memory after `getVocabularyDashboard` returns the full result. This means:
- The header shows the accurate total (`rows.length` = full count)
- The upgrade CTA shows the exact `hiddenCount = rows.length - FREE_PREVIEW_LIMIT`
- Only one SQL query needed (vs a COUNT + LIMIT pair)
- Trade-off: for users with thousands of words, the full list transfers over the wire then gets sliced. Acceptable at v1 scale — revisit if P99 latency degrades in production.

### URL shape for shareable/bookmarkable views

```
/vocabulary
/vocabulary?tier=3                         # Mastered only
/vocabulary?tier=2                         # Known only
/vocabulary?tier=1                         # Learning only
/vocabulary?song=<uuid>                    # Filter by source song ID
/vocabulary?sort=asc                       # Least mastered first
/vocabulary?tier=3&song=<uuid>&sort=asc    # Combined
```

All three params are optional. Missing params mean "no filter / default sort (desc)". Filters compose correctly via URLSearchParams manipulation in FilterControls.

### SeenInExpander lazy fetch

The expander fetches `/api/exercises/vocab-mastery/[vocabItemId]` — the same endpoint extended in Plan 03 to include `seenInSongs`. The fetch fires exactly once (guarded by `if (!open && !songs)`). After the first expand, the song list is cached in `useState`; toggling closed and re-opening uses the cached data with no extra network hit.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Pre-existing build error in `src/app/api/exercises/vocab-mastery/[vocabItemId]/route.ts` (Next-15 `params` Promise type mismatch in `.next/types/`) exists before this plan and is unrelated to Phase 11 changes. Verified by running `next build` before and after git stash — same error both times.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 05 (`/review` route): no dependencies on Plan 04; can proceed immediately
- Phase 10 (Clerk auth): `PLACEHOLDER_USER_ID = "test-user-e2e"` in `src/app/vocabulary/page.tsx` marked with `// TODO(Phase 10 auth)` for replacement
- `/vocabulary` link in GlobalLearnedCounter (Plan 03) now resolves — no longer a 404

---
*Phase: 11-cross-song-vocabulary*
*Completed: 2026-04-18*
