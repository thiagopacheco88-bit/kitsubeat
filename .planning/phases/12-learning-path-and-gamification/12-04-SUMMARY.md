---
phase: 12-learning-path-and-gamification
plan: "04"
subsystem: gamification-write-boundary
tags: [gamification, xp, streak, level, session-summary, integration-tests]
dependency_graph:
  requires: [12-01, 12-02, 12-03]
  provides: [saveSessionResults-gamification-fields, applyGamificationUpdate, setStarterSong, SessionSummary-gamification-UI]
  affects: [src/app/actions/exercises.ts, src/app/songs/[slug]/components/SessionSummary.tsx]
tech_stack:
  added: []
  patterns: [single-write-boundary, idempotent-path-guard, graceful-degradation-on-gamification-failure]
key_files:
  created:
    - src/lib/gamification/session-integration.ts
    - src/app/actions/gamification.ts
    - tests/integration/gamification.test.ts
  modified:
    - src/app/actions/exercises.ts
    - src/app/songs/[slug]/components/SessionSummary.tsx
    - src/app/songs/[slug]/components/ExerciseSession.tsx
decisions:
  - "songSlug made optional in SaveSessionInput to avoid breaking existing integration tests"
  - "gamification failure wrapped in try/catch — progress write is the user-visible side effect, XP failure logs and returns zeros"
  - "tz read once in ExerciseSession useState initializer, passed as prop to SessionSummary (smallest diff)"
  - "Continue Path CTA shown only when pathAdvancedTo !== null (not whenever user has path state) to keep UI clean before Plan 06 /path surface exists"
metrics:
  duration_min: 65
  completed_date: "2026-04-19"
  tasks_completed: 3
  files_created: 3
  files_modified: 3
---

# Phase 12 Plan 04: Session-Summary Write Boundary Summary

`saveSessionResults` extended to be the single write boundary for XP, streak, level, and path advancement; `SessionSummary` renders the new end-of-session gamification moment.

## What Was Built

### Task 1: session-integration.ts + extended saveSessionResults + setStarterSong

**`src/lib/gamification/session-integration.ts`** — Pure glue module:
- `applyGamificationUpdate(input: GamificationInput): Promise<GamificationResult>` — the single write boundary for all XP/streak/level/path writes (M6 honored)
- Reads users row, detects dailyFirst / perfectRun / pathOrder bonuses, calls `calculateXp` + `advanceStreak`, applies streak milestone XP, computes next path slug (idempotent via `songSlug === currentPathNodeSlug` equality check at line 211 — M7), writes one UPDATE to users, queries reward slots, returns `GamificationResult`
- Wrapped in graceful error handling: gamification failure in `saveSessionResults` logs and returns zero-XP defaults — the star/progress upsert is always the user-visible side effect

**`src/app/actions/exercises.ts`** extensions:
- `SaveSessionInput` gains optional `songSlug?: string` and `tz?: string` (defaults `"UTC"` — legacy callers unaffected, no regressions)
- `SaveSessionResult` widened with 11 new fields: `xpGained`, `xpTotal`, `previousLevel`, `currentLevel`, `leveledUp`, `streakCurrent`, `streakBest`, `graceApplied`, `milestoneXp`, `rewardSlotPreview`, `pathAdvancedTo`
- `saveSessionResults` calls `applyGamificationUpdate` after the stars/progress upsert so `newStars` / `previousStars` are the final values (correct star-bonus XP calculation)

**`src/app/actions/gamification.ts`** — New server action:
- `setStarterSong(userId, slug): Promise<{ ok: true }>` validates slug against `STARTER_SONG_SLUGS` constant, upserts users row with `currentPathNodeSlug` set before any session (M8 path-order bonus on first play)

**`ExerciseSession.tsx`** — TZ wiring:
- Reads device TZ ONCE on mount via `useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone)` with `"UTC"` fallback
- Passes `tz` prop to `SessionSummary`

### Task 2: SessionSummary gamification UI

`SessionSummary.tsx` extended with gamification state (11 new `useState` calls) and new UI block rendered when `!saving && xpGained > 0`:

1. **XP gained row** — `+{xpGained} XP` in yellow-400; milestone bonus line shown when `milestoneXp > 0`
2. **Streak flame** — `🔥 {streakCurrent} day(s)` in orange-400; grace-applied copy "Phew — your streak survived today 🎐" in sky-300 when `graceApplied`
3. **Level progress bar** — `Level {currentLevel}` label + indigo-500 Tailwind div (width: `pct%`) + `{xpInLevel} / {xpToNext} XP to Level {N+1}` using `xpWithinCurrentLevel(result.xpTotal)`
4. **Reward preview** — Only renders when `rewardSlotPreview !== null`; shows level threshold + label. Empty state renders nothing (M4 honored)
5. **Level-up trigger** — `data-level-up={currentLevel}` on the gamification div when `leveledUp`; `console.info("[gamification] level up to", result.currentLevel)` for Plan 06 overlay wiring
6. **Continue Path CTA** — `<Link href="/path">` shown when `pathAdvancedTo !== null`, rendered above "Try Another Song"

The XP block is gated on `xpGained > 0` (won't flash empty on sessions that fail to save or return zero XP).

### Task 3: Integration tests

`tests/integration/gamification.test.ts` — 10 test cases:

| ID | Scenario | Key Assertion |
|----|----------|---------------|
| TC1 | XP increment | `result.xpGained > 0`, `row.xp_total === result.xpGained` |
| TC2 | Streak 2-day consecutive | `result.streakCurrent === 2` |
| TC3 | Grace applied | `result.graceApplied === true`, streak count unchanged |
| TC4 | Grace exhausted → reset | `result.streakCurrent === 1`, `row.streak_best === 10` |
| TC5 | Level-up crossing threshold | `result.leveledUp === true`, `previousLevel=1`, `currentLevel≥2` |
| TC6 | Path idempotency (M7) | Non-current slug → null; current slug → advances once; old slug → null again |
| TC7 | Daily soft cap (M2) | `result.xpGained > 0` even above 250 XP daily cap |
| TC8 | setStarterSong before first session (M8) | `row.current_path_node_slug === starterSlug` |
| TC9 | Reward preview null (M4) | `result.rewardSlotPreview === null` |
| TC10 | Reward preview lowest locked slot | `result.rewardSlotPreview.id === 'test-slot-3'` |

Tests skip when `TEST_DATABASE_URL` is not set (existing pattern).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Input] `songSlug` made optional in SaveSessionInput**
- **Found during:** Task 1 TypeScript check
- **Issue:** Making `songSlug` required broke 12+ existing integration test call sites
- **Fix:** Typed `songSlug?: string` with default `""` — gamification handles empty slug by skipping path-order bonus (no path node slug === empty string)
- **Files modified:** `src/app/actions/exercises.ts`

**2. [Rule 1 - Bug] Gamification failure isolation**
- **Found during:** Task 1 implementation
- **Issue:** Any exception in `applyGamificationUpdate` would propagate and fail the session save, wiping stars/progress data from the client response
- **Fix:** try/catch wrapper returns zero-XP defaults on failure; logs error but returns full `SaveSessionResult` with gamification zeros
- **Files modified:** `src/app/actions/exercises.ts`

### Pre-existing Issue (Not Fixed — Out of Scope)

**`regression-stale-lesson-data.test.ts` single-gate invariant failure** — The test scans `src/app/songs/[slug]/components/` for files containing the string `"EXERCISE_FEATURE_FLAGS"` and fails on `ExerciseTab.tsx` which has a _comment_ that says "UI invariant: ExerciseTab NEVER imports EXERCISE_FEATURE_FLAGS". The test's string match is too broad (matches comments). Verified this failure predates Plan 12-04 (confirmed by stash test). Logged to deferred-items.md.

## Session Decision

The `tz` is read in `ExerciseSession` (not `SessionSummary`) because `ExerciseSession` mounts first and lives for the duration of the exercise flow — reading TZ once there and passing as a prop avoids the slight timing difference of reading it inside the `save()` async callback after the session ends. The difference is negligible in practice but the mount-time read is architecturally cleaner.

## Self-Check: PASSED

All created files found on disk. All commits (9bcab56, 2e090f8, 520747f) exist in git history. 352 unit tests pass. TypeScript clean (`npx tsc --noEmit` exits 0).
