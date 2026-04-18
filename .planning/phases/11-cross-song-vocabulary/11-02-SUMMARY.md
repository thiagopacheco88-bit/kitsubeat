---
phase: 11-cross-song-vocabulary
plan: 02
subsystem: ui
tags: [react, nextjs, tailwind, zustand, api-route, server-components]

requires:
  - phase: 11-cross-song-vocabulary
    provides: getKnownWordCountForSong query returning { total, known, mastered, learning }

provides:
  - GET /api/review/known-count endpoint returning vocab coverage counts for a song
  - KnownWordCount client pill component with SSR-initial values and post-session refetch
  - SongContent extended with songId + initialKnown props rendering the pill in the header badge row

affects:
  - 11-03 (pattern for Counter components consuming Phase 11 queries)
  - any future plan touching the song page header badges row

tech-stack:
  added: []
  patterns:
    - "SSR-initial + client-refetch pattern: page.tsx await + client component fetch on justFinished"
    - "justFinished predicate: questions.length > 0 && currentIndex >= questions.length (Zustand session-end detection)"
    - "Cache-Control: private, no-store on vocab count API to prevent CDN stale reads"
    - "lastFetchedKey ref guard pattern to prevent refetch storms on tab switches"
    - "force-dynamic API route to prevent Next.js route cache on user-specific data"

key-files:
  created:
    - src/app/api/review/known-count/route.ts
    - src/app/songs/[slug]/components/KnownWordCount.tsx
  modified:
    - src/app/songs/[slug]/page.tsx
    - src/app/songs/[slug]/components/SongContent.tsx

key-decisions:
  - "SSR initial value + narrow GET refetch on session end — NOT router.refresh() (would remount Practice tab, losing Zustand session state)"
  - "KnownWordCount uses Zustand exerciseSession store (questions + currentIndex) for session-end detection without new store surface"
  - "Zero-state renders 'New to you' — not '0/12' — per CONTEXT requirement (less discouraging)"
  - "songId threaded as explicit prop on SongContent (SongMeta has no id field; VersionData.id is song-version id)"
  - "Promise.all parallelizes getKnownWordCountForSong with existing enrichment query in page.tsx"
  - "lastFetchedKey ref guards against re-fetch storms when tab switches re-evaluate justFinished without state change"
  - "Pill inserted as last child of mt-2 flex items-center gap-2 badge row (after JLPT + difficulty_tier) — no layout changes needed"

patterns-established:
  - "justFinished predicate pattern: reusable in any component needing to react to exercise session completion"
  - "SSR-initial + client-refetch: avoids router.refresh() for narrow data updates on pages with complex client state"

requirements-completed: [CROSS-01, CROSS-04]

duration: ~5min
completed: 2026-04-18
---

# Phase 11 Plan 02: Song-Page Known Word Count Pill Summary

**SSR-fed KnownWordCount pill + /api/review/known-count endpoint that refetches on session end without remounting the Practice tab**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-18T00:15:00Z
- **Completed:** 2026-04-18T00:17:53Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `/api/review/known-count` GET route accepting `?songId=` UUID, returning `{ total, known, mastered, learning }` with `Cache-Control: private, no-store` and `force-dynamic`
- Built `KnownWordCount.tsx` client pill using SSR-provided initial values; detects session end via `justFinished` predicate on Zustand exerciseSession store; refetches the narrow endpoint without `router.refresh()`
- Extended `SongContent.tsx` with `songId` + `initialKnown` props (threading the parent song UUID required because `SongMeta` has no `id` field and `VersionData.id` is the version id)
- Extended `page.tsx` to `Promise.all` the known-count SSR fetch alongside the existing enrichment query

## Task Commits

1. **Task 1: Known-count GET API route** - `efcac39` (feat)
2. **Task 2: KnownWordCount component + SSR wiring** - `12d1292` (feat)

**Plan metadata:** (included in wave 2 docs commit)

## Files Created/Modified

- `src/app/api/review/known-count/route.ts` - GET handler, UUID validation, Cache-Control, force-dynamic
- `src/app/songs/[slug]/components/KnownWordCount.tsx` - Client pill: SSR initial, justFinished refetch, lastFetchedKey guard, "New to you" zero-state
- `src/app/songs/[slug]/page.tsx` - SSR fetch via Promise.all, passes songId + initialKnown to SongContent
- `src/app/songs/[slug]/components/SongContent.tsx` - Accepts new props, renders KnownWordCount as last badge in header row

## Decisions Made

**Pill insertion point:** Last child of the `mt-2 flex items-center gap-2` badge row (after JLPT + difficulty_tier badges). This reuses the existing horizontal flex row without layout changes.

**justFinished predicate:** `questions.length > 0 && currentIndex >= questions.length` — piggybacks on Phase 08 Zustand state. No new store surface needed.

**Zero-state copy:** "New to you" (not "0/12"). Per CONTEXT, the zero count is discouraging; "New to you" reframes the song as fresh content.

**songId prop:** `SongMeta` type has no `id` field (only `title`, `artist`, `slug`, etc.); `VersionData.id` is the song-version UUID, not the song UUID. The parent song UUID is threaded as an explicit `songId: string` prop on `SongContent` and the pill.

**lastFetchedKey ref:** Prevents refetch storms when tab switches cause React to re-evaluate `justFinished` with the same values. The ref stores `"${questions.length}-${currentIndex}"` and skips the fetch if already seen.

**Anti-pattern avoided:** No `router.refresh()` — would re-render the entire page, causing the Practice tab's Zustand session state to reset.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `KnownWordCount` and the API route are live; any future component needing post-session data refresh can reuse the `justFinished` predicate pattern
- Plan 11-03 GlobalLearnedCounter follows the same SSR server-component pattern

---
*Phase: 11-cross-song-vocabulary*
*Completed: 2026-04-18*
