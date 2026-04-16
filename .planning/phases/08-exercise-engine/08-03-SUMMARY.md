---
phase: 08-exercise-engine
plan: "03"
subsystem: ui-layer
tags: [zustand, persist, exercise-ui, react, lazy-loading, tabs]
dependency_graph:
  requires:
    - 08-01 (user_song_progress table, feature flags, zustand installed)
    - 08-02 (buildQuestions, Question types, generator.ts)
  provides:
    - useExerciseSession Zustand store with localStorage persistence
    - isSessionForSong cross-song stale-session guard
    - GET /api/exercises/jlpt-pool endpoint
    - ExerciseTab config screen and session gate
    - ExerciseSession question loop with progress bar
    - QuestionCard 4-option answering with green/red feedback
    - FeedbackPanel inline + full-screen detail panel
    - SongContent 3-tab interface (Vocabulary, Grammar, Practice)
  affects:
    - src/app/songs/[slug]/components/SongContent.tsx (3-tab layout)
    - src/app/songs/[slug]/page.tsx (adds id to VersionData)
tech_stack:
  added: []
  patterns:
    - zustand persist middleware with createJSONStorage for localStorage
    - _hasHydrated hydration guard prevents SSR flash
    - React.lazy + Suspense for exercise bundle lazy-loading
    - useMemo keyed on question.id for stable shuffle on mount
    - Opacity fade transition (300ms) between questions
key_files:
  created:
    - src/stores/exerciseSession.ts
    - src/app/api/exercises/jlpt-pool/route.ts
    - src/app/songs/[slug]/components/ExerciseTab.tsx
    - src/app/songs/[slug]/components/ExerciseSession.tsx
    - src/app/songs/[slug]/components/QuestionCard.tsx
    - src/app/songs/[slug]/components/FeedbackPanel.tsx
  modified:
    - src/app/songs/[slug]/components/SongContent.tsx
    - src/app/songs/[slug]/page.tsx
decisions:
  - "isSessionForSong guards against stale cross-song sessions in ExerciseTab"
  - "Exercise bundle lazy-loaded via React.lazy — keeps initial song page fast"
  - "QuestionCard shuffles options once via useMemo keyed on question.id"
  - "onContinue flows through QuestionCard -> FeedbackPanel -> ExerciseSession for clean advance"
metrics:
  duration: 5 min
  completed: 2026-04-16
  tasks_completed: 3
  files_changed: 8
---

# Phase 8 Plan 03: Exercise Session Loop UI Summary

**Zustand persistent session store, JLPT pool API, and complete exercise UI from config screen through 4-type question answering with inline+full-screen feedback**

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create Zustand session store and JLPT pool API | b30e72a | src/stores/exerciseSession.ts, src/app/api/exercises/jlpt-pool/route.ts |
| 2 | Build exercise UI components | 708af9a | ExerciseTab.tsx, ExerciseSession.tsx, QuestionCard.tsx, FeedbackPanel.tsx |
| 3 | Integrate Practice tab into SongContent | 2a28c68 | SongContent.tsx, page.tsx |

## What Was Built

**Zustand store (Task 1):** `useExerciseSession` with persist middleware backed by localStorage.
- State: songVersionId, questions[], currentIndex, answers{}, startedAt, mode, _hasHydrated
- Actions: startSession, recordAnswer, advanceQuestion, clearSession, setHasHydrated
- `isSessionForSong()` helper exported for stale-session detection
- `partialize` excludes `_hasHydrated` from serialization (runtime-only flag)
- `onRehydrateStorage` sets `_hasHydrated: true` after localStorage restore

**JLPT Pool API (Task 1):** `GET /api/exercises/jlpt-pool?jlpt_level=N5`
- Queries `vocab_global` materialized view joined with `vocabulary_items`
- Returns up to 50 vocab items at requested JLPT level for distractor fallback
- Returns 400 if `jlpt_level` param missing

**ExerciseTab (Task 2):** Config screen + session gate
- Shows skeleton loader until `_hasHydrated` is true
- If `isSessionForSong()` returns true: jumps directly to ExerciseSession (resume)
- Config screen: Quick Practice (10Q, ~2min) and Full Lesson (40Q, ~5-8min)
- On Start: fetches JLPT pool, maps to VocabEntry shape, calls buildQuestions, startSession

**ExerciseSession (Task 2):** Question loop orchestrator
- Reads all state from Zustand store
- Progress bar: red fill, transitions with CSS `transition-all duration-500`
- Question counter: "X / N" text
- Opacity fade (300ms) between questions via setTimeout + visibility state
- Calls `onComplete` prop when `currentIndex >= questions.length`

**QuestionCard (Task 2):** Single question with 4 answer options
- Options shuffled once on mount via `useMemo([question.id])`
- Click: records start time, computes timeMs, calls onAnswered
- After click: disables all buttons; correct=green, wrong=red, other=dimmed
- Renders FeedbackPanel inline below options after answer

**FeedbackPanel (Task 2):** Dual-mode feedback
- Inline: green check / red X icon, 1-2 sentence explanation
- Wrong answer: shows "Correct answer: X" in green + "「chosen」is not the answer..."
- "More" button: triggers full-screen fixed overlay
- Full-screen panel: repeats question prompt, answer, explanation, detailedExplanation
- Both Continue buttons: close panel + call onContinue (which calls advanceQuestion)

**SongContent (Task 3):** 3-tab interface
- Tabs: Vocabulary | Grammar | Practice
- Active tab: `border-b-2 border-red-500 text-white`
- Practice tab body lazy-loaded via `React.lazy(() => import('./ExerciseTab'))`
- `VersionData` interface updated to include `id: string` (song_version UUID)
- `page.tsx` updated to map `v.id` into version data

## Decisions Made

1. **isSessionForSong as resume guard** — ExerciseTab checks this before rendering config screen; if it returns true the config screen is skipped entirely
2. **Lazy exercise bundle** — `React.lazy` on ExerciseTab keeps the song page bundle lean; Suspense fallback mirrors the hydration skeleton
3. **onContinue prop threading** — FeedbackPanel calls onContinue which is wired through QuestionCard to ExerciseSession.handleContinue; this keeps the advance logic in one place (ExerciseSession)
4. **tabState vs Zustand** — `tabState` (config/session/complete) lives in React component state, not the Zustand store; only session data (questions, answers, index) needs persistence

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

Files created:
- src/stores/exerciseSession.ts
- src/app/api/exercises/jlpt-pool/route.ts
- src/app/songs/[slug]/components/ExerciseTab.tsx
- src/app/songs/[slug]/components/ExerciseSession.tsx
- src/app/songs/[slug]/components/QuestionCard.tsx
- src/app/songs/[slug]/components/FeedbackPanel.tsx

Files modified:
- src/app/songs/[slug]/components/SongContent.tsx
- src/app/songs/[slug]/page.tsx

Commits:
- b30e72a — feat(08-03): Zustand session store and JLPT pool API
- 708af9a — feat(08-03): exercise UI components
- 2a28c68 — feat(08-03): Practice tab integration

TypeScript: clean (npx tsc --noEmit passes after each task)

## Self-Check: PASSED
