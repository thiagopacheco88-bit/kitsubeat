---
phase: 07-data-foundation
plan: 01
subsystem: database
tags: [drizzle-orm, postgres, fsrs, ts-fsrs, materialized-view, spaced-repetition, subscriptions]

# Dependency graph
requires:
  - phase: 01-content-pipeline
    provides: song_versions table with lesson JSONB that vocab_global joins against
provides:
  - vocabulary_items table with (dictionary_form, reading) unique constraint
  - user_vocab_mastery table with FSRS scalar columns and indexed due date
  - user_exercise_log table referencing vocabulary_items and song_versions
  - subscriptions table with generic provider fields
  - vocab_global materialized view with unique index for CONCURRENTLY refresh
  - refreshVocabGlobal() helper wired into admin timing PUT route
  - INTENSITY_PRESETS (light/normal/intensive) using ts-fsrs generatorParameters
  - VocabEntry type in both lesson type files with optional vocab_item_id field
affects: [07-02-backfill, 08-exercise-engine, 09-kana-trainer, 10-progress-dashboard, 11-subscriptions]

# Tech tracking
tech-stack:
  added: [ts-fsrs@5.3.2]
  patterns:
    - FSRS scalar columns (Pattern 3) — individual numeric fields required for indexed due-date queries
    - Provider-agnostic subscriptions table — fields nullable for free plan, portable across Stripe/LemonSqueezy
    - Materialized view with CONCURRENTLY fallback — blocking refresh on first run before backfill

key-files:
  created:
    - src/lib/fsrs-presets.ts
    - drizzle/0002_data_foundation.sql
  modified:
    - src/lib/db/schema.ts
    - src/lib/db/queries.ts
    - src/lib/types/lesson.ts
    - scripts/types/lesson.ts
    - src/app/api/admin/timing/[songId]/route.ts

key-decisions:
  - "FSRS scalar columns (not JSONB) required for indexed due-date queries — Pattern 3 from research"
  - "Materialized view refresh on song update via refreshVocabGlobal() — not cron-based"
  - "Migration written manually — drizzle-kit generate is interactive due to unregistered 0001 migration"

patterns-established:
  - "Pattern: FSRS state as individual DB columns (stability, difficulty, due, state, etc.) — not JSONB object"
  - "Pattern: vocab_global CONCURRENTLY refresh with fallback to blocking on empty view"
  - "Pattern: Provider-agnostic subscription record — plan/status + nullable provider fields"

requirements-completed: [DATA-02]

# Metrics
duration: 4min
completed: 2026-04-15
---

# Phase 7 Plan 01: Data Foundation Schema Summary

**Four FSRS-ready tables plus vocab_global materialized view built using Drizzle ORM, with ts-fsrs presets and optional vocab_item_id patched into both lesson type files.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-15T06:25:49Z
- **Completed:** 2026-04-15T06:29:57Z
- **Tasks:** 2
- **Files modified:** 7 (+ 2 created)

## Accomplishments

- Added 4 new Drizzle tables: vocabularyItems (with form+reading unique constraint), userVocabMastery (FSRS scalars + due-date indexes), userExerciseLog, subscriptions
- Created vocab_global pgMaterializedView with LATERAL jsonb_array_elements join and unique index for CONCURRENTLY refresh
- Created src/lib/fsrs-presets.ts with light/normal/intensive intensity presets using ts-fsrs@5.3.2 generatorParameters
- Added refreshVocabGlobal() to queries.ts with CONCURRENTLY/fallback pattern, wired into admin timing PUT route
- Added optional vocab_item_id to VocabEntry (src) and VocabEntrySchema (scripts) without breaking existing validation
- Wrote drizzle/0002_data_foundation.sql migration manually (drizzle-kit generate is interactive due to unregistered 0001 migration in journal)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install ts-fsrs and add all schema tables + materialized view** - `cf171d5` (feat)
2. **Task 2: Update lesson types and generate Drizzle migration** - `6a43ec3` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/lib/db/schema.ts` — Added vocabularyItems, userVocabMastery, userExerciseLog, subscriptions tables and vocabGlobal materialized view; added pgMaterializedView, boolean, real, smallint, index imports
- `src/lib/fsrs-presets.ts` — New file: INTENSITY_PRESETS with light/normal/intensive presets and IntensityPreset type
- `src/lib/db/queries.ts` — Added refreshVocabGlobal() with CONCURRENTLY/fallback pattern; imported vocabGlobal
- `src/app/api/admin/timing/[songId]/route.ts` — Wired refreshVocabGlobal() call after song version PUT (best-effort, non-fatal)
- `src/lib/types/lesson.ts` — Added optional vocab_item_id?: string to VocabEntry interface
- `scripts/types/lesson.ts` — Added optional vocab_item_id Zod field with uuid validation to VocabEntrySchema
- `drizzle/0002_data_foundation.sql` — New migration: all 4 tables, materialized view, unique index for CONCURRENTLY refresh

## Decisions Made

- FSRS scalar columns (not JSONB) — confirmed Pattern 3 from research is mandatory for indexed due-date queries
- Materialized view refresh on song update (not cron) — locked decision from research, implemented as best-effort non-fatal call
- Migration written manually — drizzle-kit generate presents an interactive column-rename prompt because the 0001 migration was manually created and never registered in the drizzle journal/snapshot

## Deviations from Plan

None - plan executed exactly as written.

The only noteworthy implementation detail: drizzle-kit generate was interactive due to the unregistered 0001 migration in the drizzle journal. The migration was written manually (as was 0001 before it). This is consistent with the project's existing pattern.

## Issues Encountered

- drizzle-kit generate prompted interactively for column rename/create disambiguation (popularity_rank column not in snapshot). Resolved by writing the migration SQL manually — consistent with how 0001_song_versions.sql was produced.

## User Setup Required

None - no external service configuration required. The migration SQL is ready for `drizzle-kit push` or `drizzle-kit migrate` when the database is available.

## Next Phase Readiness

- Database schema foundation is complete. Phase 7 Plan 02 (backfill script) can proceed immediately.
- refreshVocabGlobal() is ready — will return early/error gracefully until backfill patches vocab_item_id into lesson JSONB.
- No blockers for Plan 02.

---
*Phase: 07-data-foundation*
*Completed: 2026-04-15*
