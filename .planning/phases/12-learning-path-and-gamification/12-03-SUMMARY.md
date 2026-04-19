---
phase: 12-learning-path-and-gamification
plan: 03
subsystem: gamification
tags: [typescript, discriminated-union, reward-slots, starter-songs, drizzle, vitest]

# Dependency graph
requires:
  - phase: 12-learning-path-and-gamification
    provides: Plan 02 reward-slots.ts imports RewardSlotDefinition (types contract)
provides:
  - RewardSlotContent discriminated union + RewardSlotDefinition interface (5 content types)
  - COSMETIC_CATALOG with 5 v3.0 cosmetic entries matching Plan 01 DB seed
  - STARTER_SONG_SLUGS (3 user-approved slugs) + getStarterSongs() query helper
affects: [phase-12-plan-06 (StarterPick modal), phase-21 (anime_scene / cultural_vocab INSERT)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discriminated-union narrowing via type literal on RewardSlotContent"
    - "Correlated SQL subquery pattern (same as queries.ts getAllSongs) for single-query youtube_id lookup"
    - "Stable re-order after DB fetch to match STARTER_SONG_SLUGS declaration order"
    - "Defensive throw naming missing/lesson-less slugs for dev-time safety"

key-files:
  created:
    - src/lib/types/reward-slots.ts
    - src/lib/gamification/cosmetic-catalog.ts
    - src/lib/gamification/starter-songs.ts
    - src/lib/gamification/__tests__/starter-songs.test.ts
  modified: []

key-decisions:
  - "Starter songs: under-the-tree-sim / misa-no-uta-aya-hirano / yume-wo-kanaete-doraemon-mao (user-approved option-b)"
  - "thumbnail_url derived client-side from youtube_id; StarterSongRow exposes both fields"
  - "AnimeSceneContent.media_url typed string|null — Phase 21 INSERTs with populated value, no code change needed"
  - "COSMETIC_CATALOG intentionally duplicates DB seed data for fast client-render lookups without DB round-trip"

patterns-established:
  - "Correlated subquery pattern for tv-preferred youtube_id with lesson filter"
  - "Defensive guard pattern: throw with named slug(s) on missing lesson at startup"

requirements-completed: [SC4]

# Metrics
duration: 35min
completed: 2026-04-19
---

# Phase 12 Plan 03: Reward-Slot Types, Cosmetic Catalog, and User-Approved Starter Songs Summary

**TypeScript discriminated union for 5 reward-slot content shapes + 3 user-approved starter songs (Attack on Titan / Death Note / Doraemon) with getStarterSongs() query helper**

## Performance

- **Duration:** 35 min
- **Started:** 2026-04-19T12:00:00Z
- **Completed:** 2026-04-19T12:35:00Z
- **Tasks:** 3 (Task 1 from prior session, Tasks 2+3 in this session)
- **Files modified:** 4 created, 0 modified

## Accomplishments

- Locked the v3.0 / v4.0 reward-slot type contract: 3 live cosmetic types (avatar_border, color_theme, badge) + 2 Phase-21-scaffolded types (anime_scene with `media_url:null`, cultural_vocab) compiled as a discriminated union
- Shipped COSMETIC_CATALOG with 5 entries mirroring Plan 01 DB seed for zero-latency HUD rendering
- User approved 3 starter songs at the decision checkpoint (option-b): distinct franchises (AoT/Death Note/Doraemon), JLPT N4/N4/N5, all DB-verified basic tier with non-null lesson
- getStarterSongs() returns stable-ordered StarterSongRow[] with tv-preferred youtube_id, derived thumbnail_url, and a dev-time defensive throw

## Task Commits

Each task was committed atomically:

1. **Task 1: Define RewardSlotContent discriminated union + cosmetic catalog helper** - `9ad85e1` (feat)
2. **Task 2: Confirm 3 starter-song slugs** - checkpoint:decision (no code commit — user decision)
3. **Task 3: Write starter-songs.ts with approved slugs + getStarterSongs() query** - `d8ac000` (feat)

**Plan metadata:** (docs commit — see below)

## Starter Song Decision

**User selected: option-b** — swap one Naruto entry for a different franchise.

Final slugs (DB-verified at execution time):

| Slug | Title | Anime | JLPT | Tier | Lessons |
|------|-------|-------|------|------|---------|
| `under-the-tree-sim` | UNDER THE TREE | Attack on Titan Final Season | N4 | basic | 1 |
| `misa-no-uta-aya-hirano` | Misa no Uta | Death Note | N4 | basic | 1 |
| `yume-wo-kanaete-doraemon-mao` | Yume wo Kanaete Doraemon | Doraemon | N5 | basic | 1 |

Rationale: distinct franchises (variety), distinct moods (emotional/haunting/upbeat), N5 Doraemon as true beginner on-ramp.

## Reward-Slot Content Types

| Type | Phase | Status | Notes |
|------|-------|--------|-------|
| `avatar_border` | v3.0 | Live | css_class + preview_color + label |
| `color_theme` | v3.0 | Live | css_vars record + label |
| `badge` | v3.0 | Live | icon + label + description |
| `anime_scene` | v4.0 | Scaffolded | media_url: string\|null (null in v3.0) |
| `cultural_vocab` | v4.0 | Scaffolded | word + etymology + explanation |

The `media_url: string | null` hook on AnimeSceneContent means Phase 21 can INSERT rows with a real URL without any code changes to this file.

## Files Created/Modified

- `src/lib/types/reward-slots.ts` — 5 content interfaces, RewardSlotContent union, RewardSlotDefinition
- `src/lib/gamification/cosmetic-catalog.ts` — COSMETIC_CATALOG (5 v3.0 entries) + getCosmeticRenderData()
- `src/lib/gamification/starter-songs.ts` — STARTER_SONG_SLUGS const + StarterSongRow interface + getStarterSongs()
- `src/lib/gamification/__tests__/starter-songs.test.ts` — 12 Vitest unit tests

## Decisions Made

- **Starter song selection (option-b):** Replaced second Naruto entry with Doraemon (N5) to provide broader franchise variety and a true beginner on-ramp
- **thumbnail_url derivation:** Included both `youtube_id` and derived `thumbnail_url` in StarterSongRow so Plan 06 can use any YouTube thumbnail resolution
- **v4.0 non-breaking extension:** `media_url: string | null` typed on AnimeSceneContent so Phase 21 INSERT requires zero code change here
- **COSMETIC_CATALOG intentional duplication:** Mirrors DB seed data for fast client-render without DB round-trip; documented sync requirement

## Deviations from Plan

None — plan executed exactly as written. The `isNotNull` Drizzle subquery approach was substituted with a correlated SQL subquery (`has_lesson`) to match the established codebase pattern in queries.ts. This is a technique refinement, not a deviation.

## Issues Encountered

None. DB verification of all 3 slugs passed immediately (basic tier, 1 lesson each).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 04 (if any) and Plan 06 (StarterPick modal) can import `STARTER_SONG_SLUGS` and `getStarterSongs()` directly
- Phase 21 can INSERT anime_scene / cultural_vocab rows into reward_slots without touching types
- Plan 02's reward-slots.ts already compiles against the real types from this plan

---
*Phase: 12-learning-path-and-gamification*
*Completed: 2026-04-19*
