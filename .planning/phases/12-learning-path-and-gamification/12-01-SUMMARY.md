---
phase: 12-learning-path-and-gamification
plan: 01
subsystem: database
tags: [postgres, drizzle-orm, gamification, cosmetics, migration]

# Dependency graph
requires:
  - phase: 11-cross-song-vocabulary
    provides: users table, song schema, vocabulary schema
  - phase: 10-advanced-exercises-full-mastery
    provides: user_song_progress, deriveStars, exercise quota system
provides:
  - drizzle/0008_gamification.sql: additive migration with 13 users columns + 2 new tables
  - userCosmetics Drizzle table: per-user cosmetic unlock/equip tracking
  - rewardSlotDefinitions Drizzle table: extensible cosmetic catalog for v4.0 Phase 21
  - scripts/seed/14-seed-reward-slots.ts: 5 v3.0 cosmetic rows seeded idempotently
  - scripts/audit/verify-starter-picks.ts: starter-pick candidate audit (flags SUBSTITUTION NEEDED)
affects:
  - 12-02-PLAN.md: depends on xp_total, level, streak_current, streak_best, last_streak_date columns
  - 12-04-PLAN.md: depends on users gamification columns for write boundary
  - 12-05-PLAN.md: depends on reward_slot_definitions for JLPT HUD context
  - 12-06-PLAN.md: depends on user_cosmetics + rewardSlotDefinitions for cosmetic rendering
  - 12-03-PLAN.md: depends on rewardSlotDefinitions for RewardSlotContent type narrowing

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Hand-written IF NOT EXISTS SQL migration (matches Phase 10 convention; drizzle-kit generate skipped)
    - neon tagged template literal for DDL execution in tsx seed scripts
    - Idempotent seed via ON CONFLICT (id) DO UPDATE SET (not DO NOTHING) to allow content updates

key-files:
  created:
    - drizzle/0008_gamification.sql
    - scripts/seed/14-seed-reward-slots.ts
    - scripts/audit/verify-starter-picks.ts
  modified:
    - src/lib/db/schema.ts

key-decisions:
  - "content jsonb typed as plain jsonb in schema.ts — Plan 03 narrows to RewardSlotContent discriminated union"
  - "Researcher starter picks (wind-akeboshi, utakata-hanabi-supercell, crossing-field-lisa) all fail basic-tier check — SUBSTITUTION NEEDED for Plan 03 decision"
  - "Migration applied via tsx script using neon tagged template literals (psql not available in env)"

patterns-established:
  - "Phase 12 gamification columns: Phase 12: Gamification comment prefix in schema.ts"
  - "Reward slot seed uses ON CONFLICT DO UPDATE (not DO NOTHING) to allow catalog updates on re-run"

requirements-completed: [SC1, SC3, SC4]

# Metrics
duration: 9min
completed: 2026-04-19
---

# Phase 12 Plan 01: Gamification Data Foundation Summary

**Drizzle migration adding 13 gamification columns to users + user_cosmetics + reward_slot_definitions tables, with 5 v3.0 cosmetic rows seeded and a starter-pick audit surfacing SUBSTITUTION NEEDED for Plan 03.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-19T11:48:53Z
- **Completed:** 2026-04-19T10:57:39Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `drizzle/0008_gamification.sql` with all 13 `ALTER TABLE users ADD COLUMN IF NOT EXISTS` guards + `user_cosmetics` + `reward_slot_definitions` DDL; applied to dev DB cleanly
- Extended `src/lib/db/schema.ts` with 13 new users columns (xpTotal/level/streakCurrent/streakBest/lastStreakDate/streakTz/graceUsedThisWeek/streakWeekStart/xpToday/xpTodayDate/currentPathNodeSlug/soundEnabled/hapticsEnabled) + `userCosmetics` + `rewardSlotDefinitions` pgTable exports with correct Drizzle-pg patterns
- Seeded 5 v3.0 cosmetic rows (Kitsune Fire border L3, Ember theme L7, Night Fox border L10, Scholar Fox badge L15, Sakura theme L20) idempotently; `npm run seed:reward-slots` re-runnable safely
- `npm run audit:starter-picks` surfaces top-10 basic-tier candidates + SUBSTITUTION NEEDED verdict: all 3 researcher picks fail (wind-akeboshi not in DB; utakata-hanabi-supercell + crossing-field-lisa tagged `intermediate`)
- 330 unit tests pass, zero regressions; tsc --noEmit clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration 0008_gamification.sql + Drizzle schema.ts** - `a14144e` (feat)
2. **Task 2: Seed + audit scripts** - `a80039b` (feat) — committed as part of Plan 12-02 batch (scripts were already in HEAD)

## Files Created/Modified

- `drizzle/0008_gamification.sql` — Additive migration: 13 users ALTER columns + user_cosmetics CREATE TABLE + reward_slot_definitions CREATE TABLE
- `src/lib/db/schema.ts` — users pgTable extended with 13 Phase 12 columns; new userCosmetics and rewardSlotDefinitions pgTable exports
- `scripts/seed/14-seed-reward-slots.ts` — Idempotent seed populating 5 v3.0 cosmetic catalog rows
- `scripts/audit/verify-starter-picks.ts` — Verification query: top-10 basic-tier songs + researcher-pick verdicts

## Decisions Made

- `content` column in `rewardSlotDefinitions` typed as plain `jsonb` in schema.ts — Plan 03 narrows it to the `RewardSlotContent` discriminated union. This avoids a circular dependency (schema.ts exported before the type is defined).
- Migration applied via one-shot tsx script using neon tagged template literals since `psql` binary is not in PATH on this machine and `drizzle-kit push` has an interactive prompt that cannot be automated.
- Hand-wrote migration SQL with `IF NOT EXISTS` guards per Phase 10 convention (0007_advanced_exercises.sql precedent). Did NOT run `drizzle-kit generate`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Applied migration via tsx neon script instead of psql/drizzle-kit push**
- **Found during:** Task 1 verification
- **Issue:** `psql` not in PATH; `drizzle-kit push` has an interactive rename-vs-create prompt that blocks automation
- **Fix:** Created one-shot `scripts/apply-migration-0008.ts` using `neon` tagged template literals to execute each DDL statement individually; script deleted after use (not committed to keep scripts/ clean)
- **Files modified:** None permanent (temporary script only)
- **Verification:** All 16 statements returned OK; seed + audit scripts confirmed tables exist
- **Committed in:** a14144e (part of Task 1 verification)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Migration applied cleanly via alternative method. No schema changes required. All done criteria met.

## Issues Encountered

- Researcher starter picks all fail the `difficulty_tier = 'basic'` check: `wind-akeboshi` is not in the DB at all; `utakata-hanabi-supercell` and `crossing-field-lisa` are tagged `intermediate`. The `audit:starter-picks` script correctly surfaces this as SUBSTITUTION NEEDED with 3 alternative candidates from the top-10 list. Final selection is Plan 03's `checkpoint:decision`.

## User Setup Required

None - no external service configuration required. Migration applies automatically via seed scripts.

## Next Phase Readiness

- All gamification columns exist on users table — Plan 02 (XP/streak logic) can write to them
- `user_cosmetics` and `reward_slot_definitions` tables exist — Plan 06 (cosmetic rendering) can query them
- `reward_slot_definitions` seeded with 5 v3.0 catalog rows
- Starter-pick candidates surfaced; Plan 03 `checkpoint:decision` will confirm final 3

---
*Phase: 12-learning-path-and-gamification*
*Completed: 2026-04-19*
