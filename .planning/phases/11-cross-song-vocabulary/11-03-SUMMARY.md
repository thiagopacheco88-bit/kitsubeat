---
phase: 11-cross-song-vocabulary
plan: 03
subsystem: ui
tags: [react, nextjs, tailwind, server-components, api-route]

requires:
  - phase: 11-cross-song-vocabulary
    provides: getGlobalLearnedCount + getSeenInSongsForVocab queries from Plan 01
  - phase: 08.2-fsrs-progressive-disclosure
    provides: MasteryDetailPopover + vocab-mastery API route to extend

provides:
  - seenInSongs field on every /api/exercises/vocab-mastery/[vocabItemId] response
  - MasteryDetailPopover "Seen in" collapsible section for multi-song words
  - GlobalLearnedCounter async server component (nav + profile variants)
  - Global learned word count in root layout header nav (between Songs and Profile links)
  - Per-user learned counter card on profile page above preferences

affects:
  - 11-04 (vocabulary dashboard; /vocabulary route referenced by GlobalLearnedCounter forward-link)
  - Phase 10 (Clerk auth replacement of PLACEHOLDER_USER_ID in GlobalLearnedCounter + API routes)

tech-stack:
  added: []
  patterns:
    - "Async RootLayout pattern: export default async function RootLayout — Next 15 App Router supported"
    - "Forward-reference /vocabulary link: ships before Plan 04's route lands; acceptable within-phase 404"
    - "Promise.all parallelization for seenInSongs + mastery + log queries in a single API call"
    - "Collapsible show-N-more pattern: useState boolean, show first 3, reveal rest on toggle (Tailwind-only)"
    - "Two-variant server component: variant prop selects nav (compact) vs profile (large display card)"

key-files:
  created:
    - src/app/components/GlobalLearnedCounter.tsx
  modified:
    - src/app/api/exercises/vocab-mastery/[vocabItemId]/route.ts
    - src/app/songs/[slug]/components/MasteryDetailPopover.tsx
    - src/app/layout.tsx
    - src/app/profile/page.tsx

key-decisions:
  - "GlobalLearnedCounter visible to ALL users (free + premium) — hiding from free users reduces conversions per CROSS-03 CONTEXT"
  - "No emoji in counter display — project CLAUDE.md convention; documented inline in GlobalLearnedCounter.tsx"
  - "Async RootLayout: converts layout.tsx to async to support DB-reading GlobalLearnedCounter server component"
  - "Nav link order: Songs | {N} words | Profile — counter between navigation links, not appended after"
  - "seenInSongs list: current song included, sorted title ASC so other songs appear first"
  - "'Seen in' section hidden for 1-song words — showing it for single-song words adds noise, no provenance value"
  - "Collapsible at 4+ songs (not 3+): 3 songs always visible, toggle reveals 4th and beyond"
  - "Forward /vocabulary link: acceptable 404 until Plan 04 ships; both plans in same phase/commit cycle"
  - "No cache wrapper on GlobalLearnedCounter: per-request DB reads without cache — root layout makes all routes dynamic"
  - "Async RootLayout build impact: home and any previously-static routes become dynamic — acceptable because per-request count is the feature"

patterns-established:
  - "Two-variant async server component pattern (nav/profile) for cross-cutting display items"
  - "MasteryDetail type location: exported from vocab-mastery API route file directly (not a shared types file)"

requirements-completed: [CROSS-02, CROSS-03, CROSS-04]

duration: ~10min
completed: 2026-04-18
---

# Phase 11 Plan 03: Cross-Song Vocabulary Provenance + Global Counter Summary

**seenInSongs in vocab-mastery API + MasteryDetailPopover collapsible + GlobalLearnedCounter in root layout and profile, all surfacing cross-song vocab identity with zero extra round trips**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-18T00:16:00Z
- **Completed:** 2026-04-18T00:26:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Extended `/api/exercises/vocab-mastery/[vocabItemId]` to include `seenInSongs: Array<{ slug, title, anime }>` via `Promise.all` parallelization with the existing mastery and log queries — zero extra round trips for the client
- Added collapsible "Seen in" section to `MasteryDetailPopover.tsx`: hidden for single-song words, visible for 2+ songs, first 3 shown with "Show N more" toggle at 4+
- Created `GlobalLearnedCounter.tsx` async server component with `nav` (compact link) and `profile` (large card) variants; fetches `getGlobalLearnedCount` per request; no emoji per project CLAUDE.md convention
- Inserted counter into root `layout.tsx` (converted to async) between Songs and Profile nav links
- Added profile-variant counter above Learning preferences section in `profile/page.tsx`

## Task Commits

1. **Task 1: Extend vocab-mastery API + MasteryDetailPopover seenInSongs** - `6469e9b` (feat)
2. **Task 2: GlobalLearnedCounter + layout + profile wiring** - `696ff1e` (feat)

**Plan metadata:** (included in wave 2 docs commit)

## Files Created/Modified

- `src/app/api/exercises/vocab-mastery/[vocabItemId]/route.ts` - Added `seenInSongs` to `MasteryDetail` exported type; parallelized `getSeenInSongsForVocab` fetch
- `src/app/songs/[slug]/components/MasteryDetailPopover.tsx` - Added local `seenInSongs` interface field; renders collapsible "Seen in" section for 2+ songs
- `src/app/components/GlobalLearnedCounter.tsx` - New async server component, two variants, plain-text counter, /vocabulary forward-link
- `src/app/layout.tsx` - Converted to async RootLayout; inserted `<GlobalLearnedCounter />` between Songs and Profile links
- `src/app/profile/page.tsx` - Renders `<GlobalLearnedCounter variant="profile" />` in a `mb-6` wrapper above the preferences section

## Decisions Made

**MasteryDetail type location:** The `MasteryDetail` type is defined and exported directly from `src/app/api/exercises/vocab-mastery/[vocabItemId]/route.ts` (not in a shared types file). `seenInSongs` was added to this interface in-place.

**seenInSongs list design:** Current song is included in the list and sorted title ASC. This means the other songs appear before the current one alphabetically, satisfying the requirement to surface cross-song provenance. Single-song words receive no "Seen in" section (noise-free zero state).

**Collapsible threshold:** 4+ songs triggers "Show N more" (not 3+). The first 3 entries are always visible; toggle reveals from the 4th onward. This avoids a toggle on the most common 2-3 song case.

**Emoji decision:** Counter renders as plain text "{n} words" — no emoji. Project `CLAUDE.md` prohibits emoji in written files and output. Documented inline in `GlobalLearnedCounter.tsx` with `// Plain text per project convention (no emoji).`

**Async RootLayout build impact:** Converting `layout.tsx` to async and embedding a per-request DB read means all routes rendered through the root layout become dynamic. Main routes (`/songs`, `/profile`, `/vocabulary`, `/review`) already have `export const dynamic = "force-dynamic"`. The home route `/` may become dynamic as a side effect — acceptable because per-request counter accuracy is the feature goal of CROSS-03. No static route previously relied on ISR-style caching of the header.

**Counter free access:** No `isPremium()` check in `GlobalLearnedCounter` — counter renders for all users. Per CROSS-03 CONTEXT: hiding from free users reduces conversion.

**Navigation order:** Songs | {N} words | Profile. Counter sits between content-navigation and account-navigation links, giving it contextual weight without anchoring to either end.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Plan 11-03 was interrupted mid-execution (after Task 1 commit) and resumed in a continuation session. GlobalLearnedCounter.tsx was found pre-created in the working tree matching the plan spec exactly; layout.tsx and profile/page.tsx diffs were verified against plan requirements before staging. No code was changed — the continuation session only committed the existing correct files and created this SUMMARY.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `/vocabulary` link in GlobalLearnedCounter will 404 until Plan 04 ships its dashboard route — acceptable within-phase forward reference
- Plan 04 (vocabulary dashboard): `getVocabularyDashboard` + `DashboardRow` from Plan 01 are ready; `/vocabulary` route needed to satisfy the GlobalLearnedCounter link
- Phase 10 (auth): both `GlobalLearnedCounter` and the `/api/review/known-count` route use `PLACEHOLDER_USER_ID = "test-user-e2e"`; both have `TODO(Phase 10 auth)` comments marking the Clerk auth replacement points

---
*Phase: 11-cross-song-vocabulary*
*Completed: 2026-04-18*
