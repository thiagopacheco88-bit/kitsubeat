---
phase: 12-learning-path-and-gamification
plan: "02"
subsystem: gamification-engine
tags: [xp, streak, level-curve, reward-slots, analytics, pure-functions, tdd]
dependency_graph:
  requires: []
  provides: [xp-calculator, level-curve, streak-state-machine, reward-slot-filter, analytics-stub]
  affects: [12-04-session-save, 12-05-hud, 12-06-session-summary]
tech_stack:
  added: []
  patterns: [pure-functions, tdd-red-green-refactor, intl-date-formatting, deterministic-injection]
key_files:
  created:
    - src/lib/gamification/xp.ts
    - src/lib/gamification/streak.ts
    - src/lib/gamification/level-curve.ts
    - src/lib/gamification/reward-slots.ts
    - src/lib/gamification/__tests__/xp.test.ts
    - src/lib/gamification/__tests__/streak.test.ts
    - src/lib/gamification/__tests__/level-curve.test.ts
    - src/lib/gamification/__tests__/reward-slots.test.ts
    - src/lib/analytics.ts
  modified: []
decisions:
  - "Milestone fires only on streak advance, not same-day repeat (streakAdvanced flag guards check)"
  - "applyDailyCap extracted as public helper for Plan 04 to call directly without re-running calculateXp"
  - "isoWeekStart uses UTC date math to avoid DST-induced day-of-week errors"
metrics:
  duration_minutes: 8
  completed_date: "2026-04-19"
  tasks_completed: 4
  files_created: 9
---

# Phase 12 Plan 02: Gamification Engine Summary

Pure-function gamification engine: XP calculator with daily soft cap, streak state machine with ISO-week grace, exponential level curve, reward-slot filter, and analytics stub — 67 Vitest tests across 4 modules.

## Modules Delivered

| Module | File | Tests | Purpose |
|--------|------|-------|---------|
| XP calculator | `src/lib/gamification/xp.ts` | 14 | calculateXp + applyDailyCap + XP_CONSTANTS |
| Level curve | `src/lib/gamification/level-curve.ts` | 21 | xpForLevel / levelFromXp / xpWithinCurrentLevel |
| Streak machine | `src/lib/gamification/streak.ts` | 18 | advanceStreak + localDateFromTz + isoWeekStart |
| Reward-slot filter | `src/lib/gamification/reward-slots.ts` | 14 | getVisibleSlotsForUser / getNextRewardPreview |
| Analytics stub | `src/lib/analytics.ts` | — | trackGamification + GamificationEvent type |

**Total: 67 tests, all green.**

## Verification Results

- `npx vitest run src/lib/gamification` — 67/67 pass
- `npx tsc --noEmit` — clean (no errors)
- `grep -r "from.*db" src/lib/gamification` — returns nothing (no DB imports)
- No new npm dependencies added

## TDD Commit Cycle

Each module followed RED → GREEN → REFACTOR:

| Module | RED Commit | GREEN Commit |
|--------|-----------|--------------|
| XP | `898c87d` | `3295212` |
| Level curve | `75b1fa7` | `30679d0` |
| Streak | `bd90d04` | `6d1cd58` |
| Reward-slots | `c3a665e` | `a80039b` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] xpForLevel(10) returns 515, not 516**
- **Found during:** Task 2 GREEN (level-curve test run)
- **Issue:** Plan spec said "≈ 516.1" but JS float `100 * Math.pow(1.2, 9)` evaluates to `515.978...` → `floor = 515`
- **Fix:** Updated test expected value from 516 to 515. The formula in `level-curve.ts` is correct per spec; only the comment in the test plan was wrong.
- **Files modified:** `src/lib/gamification/__tests__/level-curve.test.ts`
- **Commit:** `30679d0`

**2. [Rule 1 - Bug] Milestone fires on same-day repeat when streak already at milestone value**
- **Found during:** Task 3 GREEN (streak test run)
- **Issue:** Initial implementation checked `streakCurrent === m` after all rules, including same-day no-op. A user already at streak=7 re-opening the app on the same day would incorrectly get `milestoneHit=7` again.
- **Fix:** Added `streakAdvanced` boolean flag; milestone check only runs when the streak counter actually moved.
- **Files modified:** `src/lib/gamification/streak.ts`
- **Commit:** `6d1cd58` (updated implementation before commit)

## Key Design Decisions

- **Multiplier order is deterministic:** dailyFirst → perfectRun → pathOrder, floored once at the end. This matches the plan spec and prevents floating-point accumulation.
- **applyDailyCap is exported** so Plan 04's `saveSessionResults` can call it directly without re-running the full `calculateXp` (e.g., when applying streak milestone bonus XP separately).
- **No date-fns-tz dependency:** Date arithmetic via `Intl.DateTimeFormat` + UTC anchoring for DST safety, exactly as the RESEARCH doc specified.
- **Reward-slot empty guarantee:** `getVisibleSlotsForUser` and `getNextRewardPreview` return `[]` / `null` on empty catalog — no "coming soon" state possible by construction.

## Self-Check: PASSED

Files exist:
- src/lib/gamification/xp.ts: FOUND
- src/lib/gamification/streak.ts: FOUND
- src/lib/gamification/level-curve.ts: FOUND
- src/lib/gamification/reward-slots.ts: FOUND
- src/lib/analytics.ts: FOUND

Commits confirmed in HEAD:
- 898c87d (RED xp tests)
- 3295212 (GREEN xp impl)
- 75b1fa7 (RED level-curve tests)
- 30679d0 (GREEN level-curve impl + bug fix)
- bd90d04 (RED streak tests)
- 6d1cd58 (GREEN streak impl)
- c3a665e (RED reward-slots tests)
- a80039b (GREEN reward-slots + analytics)
