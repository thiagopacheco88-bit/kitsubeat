---
phase: 08-exercise-engine
plan: "01"
subsystem: data-layer
tags: [schema, migrations, dependencies, feature-flags, access-control]
dependency_graph:
  requires: [07-data-foundation]
  provides: [user_song_progress-table, exercise-feature-flags, exercise-access-gate]
  affects: [src/lib/db/schema.ts, src/lib/exercises/]
tech_stack:
  added: [zustand@5.0.12, canvas-confetti@1.9.4, "@types/canvas-confetti"]
  patterns: [feature-flag-gating, DAL-access-gate, derived-computed-values]
key_files:
  created:
    - drizzle/0003_exercise_engine.sql
    - src/lib/exercises/feature-flags.ts
    - src/lib/exercises/access.ts
  modified:
    - src/lib/db/schema.ts
    - package.json
decisions:
  - Stars derived at read time via deriveStars() — never stored as a DB column
  - checkExerciseAccess() is the single gate — UI never checks flags directly
  - All 4 Phase 8 exercise types declared free — no premium gate needed yet
metrics:
  duration: 3 min
  completed: 2026-04-16
  tasks_completed: 3
  files_changed: 5
---

# Phase 8 Plan 01: Data Foundation and Dependencies Summary

**One-liner:** user_song_progress table, deriveStars utility, feature-flag gate, and zustand+canvas-confetti installed as exercise engine foundation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add user_song_progress table to schema and migration | c16b302 | src/lib/db/schema.ts, drizzle/0003_exercise_engine.sql |
| 2 | Install zustand and canvas-confetti dependencies | af4c5b0 | package.json, package-lock.json |
| 3 | Create feature flags config and premium gate access function | de64509 | src/lib/exercises/feature-flags.ts, src/lib/exercises/access.ts |

## What Was Built

**Schema (Task 1):** Added `userSongProgress` Drizzle table to `schema.ts` with:
- `completion_pct` (real), `ex1_2_3_best_accuracy` (real), `ex4_best_accuracy` (real)
- `sessions_completed` (integer)
- Unique constraint on `(user_id, song_version_id)`
- Index on `user_id` for fast per-user lookups
- Exported `UserSongProgress` and `NewUserSongProgress` types
- `deriveStars()` pure function: 2 stars = both >= 80%, 1 star = ex1_2_3 >= 80%, 0 stars = below threshold

**Migration (Task 1):** `drizzle/0003_exercise_engine.sql` written manually with `IF NOT EXISTS` for idempotency.

**Dependencies (Task 2):** zustand@5.0.12 and canvas-confetti@1.9.4 installed. @types/canvas-confetti in devDependencies.

**Feature Flags (Task 3):** `EXERCISE_FEATURE_FLAGS` config object with all 4 Phase 8 types as `"free"`.

**Access Gate (Task 3):** `checkExerciseAccess()` is the single source of truth for premium decisions. Returns `{ allowed: true }` for free types, `{ allowed: false, reason: "premium_required" }` for premium types. TODO comment marks where Clerk auth integration will wire in real subscription lookup.

## Verification Results

- `npx tsc --noEmit` — clean on all new files (pre-existing `generator.test.ts` errors are from Plan 02's TDD test file referencing `generator.ts` stub; not caused by this plan)
- `npm ls zustand canvas-confetti` — both present at expected versions
- Migration SQL contains `CREATE TABLE IF NOT EXISTS`, `UNIQUE` constraint, and `INDEX`
- `deriveStars({ex1_2_3_best_accuracy: 0.9, ex4_best_accuracy: 0.9})` returns `2` (verified by logic inspection)

## Decisions Made

1. **Stars derived at read time** — `deriveStars()` computes from accuracy columns; never stored as a DB column (per Phase 8 research anti-pattern guidance)
2. **Single access gate** — `checkExerciseAccess()` in `access.ts` is the ONLY location where free/premium decisions are made; UI components receive data or `{ gated: true }` from server actions
3. **All Phase 8 types free** — all 4 exercise types declared free for MVP launch; Phase 10 can add premium types by updating the flags without changing the gate logic

## Deviations from Plan

None — plan executed exactly as written.

Pre-existing note: `generator.test.ts` was already tracked in git (committed during Phase 8 research/planning) and references `generator.ts`. TypeScript reported errors for these files but they are out of scope for this plan — they are the TDD artifacts for Plan 02.

## Self-Check

Files created:
- drizzle/0003_exercise_engine.sql — FOUND
- src/lib/exercises/feature-flags.ts — FOUND
- src/lib/exercises/access.ts — FOUND

Commits:
- c16b302 — feat(08-01): add user_song_progress table to schema and migration
- af4c5b0 — chore(08-01): install zustand and canvas-confetti dependencies
- de64509 — feat(08-01): add exercise feature flags and premium gate access function

## Self-Check: PASSED
