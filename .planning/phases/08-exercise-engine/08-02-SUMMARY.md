---
phase: 08-exercise-engine
plan: "02"
subsystem: testing
tags: [vitest, typescript, exercises, tdd, distractor-selection, fisher-yates]

# Dependency graph
requires:
  - phase: 07-data-foundation
    provides: VocabEntry with vocab_item_id UUID FK, Lesson/Verse types in lesson.ts, localize() helper

provides:
  - Pure buildQuestions(lesson, mode, jlptPool) -> Question[] function
  - pickDistractors with same-song-first, JLPT-pool fallback, deduplication
  - ExerciseType, Question, SessionConfig TypeScript types
  - 18-test vitest suite covering all exercise types and edge cases

affects:
  - 08-03 (Zustand session store uses Question[] type)
  - 08-04 (UI components consume Question[] from buildQuestions)
  - 08-07 (feature flag access layer wraps exercise type strings)

# Tech tracking
tech-stack:
  added:
    - vitest ^4.1.4
    - "@vitest/coverage-v8" ^4.1.4
  patterns:
    - TDD red-green cycle for pure business logic
    - Fisher-Yates shuffle (unbiased, explicit swap loop)
    - Same-song-first distractor selection with JLPT-level fallback
    - fill_lyric disabled when < 3 vocab entries (can't form 4 unique options)
    - crypto.randomUUID() for question IDs (no external uuid dependency)

key-files:
  created:
    - src/lib/exercises/generator.ts
    - src/lib/exercises/__tests__/generator.test.ts
    - vitest.config.ts
  modified:
    - package.json (added vitest scripts + devDependencies)

key-decisions:
  - "Generator is pure TypeScript — no DB access, no network calls, testable in isolation"
  - "fill_lyric skipped when < 3 vocab entries (not enough pool for 4 unique options)"
  - "Distractor dedup uses trim+lowercase normalization to catch synonym collisions"

patterns-established:
  - "Pattern: pure generator tested with vitest; no mocking needed"
  - "Pattern: findVerseForVocab scans token array (not verse text string) for surface match"

requirements-completed:
  - EXER-01
  - EXER-02
  - EXER-03
  - EXER-04
  - EXER-10

# Metrics
duration: 4min
completed: 2026-04-16
---

# Phase 08 Plan 02: Exercise Question Generator Summary

**Pure TypeScript buildQuestions() with Fisher-Yates shuffle, 4 exercise types, same-song distractor selection, and 18 passing vitest tests**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-16T20:54:18Z
- **Completed:** 2026-04-16T20:57:53Z
- **Tasks:** 2 (TDD RED + TDD GREEN)
- **Files modified:** 4

## Accomplishments

- Implemented `buildQuestions(lesson, mode, jlptPool)` — full question generation pipeline with Fisher-Yates shuffle and session mode caps (short=10, full=40)
- `pickDistractors` strategy: same-song pool first, JLPT-level fallback, full-pool fallback; deduplication via trim+lowercase normalization
- Fill-the-Lyric questions: only generated when verse has `start_time_ms > 0` AND song has >= 3 vocab entries; prompt blanks the surface with `_____`
- 18 vitest test cases passing: session modes, all 4 exercise types, distractor validation, UUID shape, explanation presence, fill_lyric edge cases

## Task Commits

Each task was committed atomically:

1. **TDD RED: Failing tests** - `5124801` (test)
2. **TDD GREEN: Implement generator.ts** - `dc8a299` (feat)

**Plan metadata:** (docs commit follows)

_TDD tasks have two commits (test → feat)_

## Files Created/Modified

- `src/lib/exercises/generator.ts` — Pure question generator: buildQuestions, pickDistractors, Fisher-Yates shuffle, makeQuestion, makeExplanation
- `src/lib/exercises/__tests__/generator.test.ts` — 18-test vitest suite with fixture helpers (makeVocabEntry, makeVerse, makeLesson)
- `vitest.config.ts` — Vitest config with `@/*` path alias and node environment
- `package.json` — Added `test` / `test:watch` scripts; vitest devDependencies

## Decisions Made

- Generator is pure TypeScript with no side effects — makes it trivially testable with vitest without any mocking framework
- `fill_lyric` disabled for songs with < 3 vocab entries because 4 distinct options (1 correct + 3 distractors) can't be formed from a smaller pool
- Distractor deduplication uses `trim().toLowerCase()` normalization to prevent synonym collisions (two vocab entries with identical meaning text)
- `crypto.randomUUID()` used for question IDs — no external uuid library needed (Node 18+, all modern browsers)
- `findVerseForVocab` scans `verse.tokens[].surface` (not verse text string) for accurate token-level matching

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `buildQuestions`, `Question`, `ExerciseType`, `SessionConfig` types are exported and ready for Zustand session store (Plan 08-03)
- JLPT pool fetch (Server Action querying `vocab_global` by `jlpt_level`) is expected by `buildQuestions` as a parameter — Plan 08-03/04 wires this
- `verseRef.startMs` in fill_lyric questions is ready for `seekTo()` calls via PlayerContext (Plan 08-04)

---
*Phase: 08-exercise-engine*
*Completed: 2026-04-16*
