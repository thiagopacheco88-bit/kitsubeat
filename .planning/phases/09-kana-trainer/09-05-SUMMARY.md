---
phase: 09-kana-trainer
plan: 05
subsystem: ui

tags: [react, nextjs, zustand, web-speech-api, canvas-confetti, suspense]

# Dependency graph
requires:
  - phase: 09-kana-trainer
    provides: "KanaMode + Script types, KANA_CHART + HIRAGANA_ROWS + KATAKANA_ROWS, weightFor + buildKanaSession + buildDistractors, applyStarDelta + computeUnlockedRows, useKanaProgress store with applyAnswer + setStars"
provides:
  - "/kana/session?mode=hiragana|katakana|mixed route — 20-question drill loop"
  - "KanaSession orchestrator (startSnapshot ref + queueMicrotask unlock-detection diff)"
  - "KanaQuestionCard (4-option tap card with 1/2/3/4 + Space/Enter shortcuts and TTS)"
  - "KanaLearnCard (0-star pre-reveal variant — KANA-04)"
  - "RowUnlockModal (canvas-confetti dynamic import + dismissable celebration)"
  - "sessionStorage handoff key kitsubeat-kana-last-session for Plan 09-06's summary screen"
affects: [09-06-session-summary]

# Tech tracking
tech-stack:
  added: []  # canvas-confetti and zustand were already in package.json from earlier phases
  patterns:
    - "Cross-plan KanaMode imported from @/lib/kana/types — never from sibling plan's UI component"
    - "startSnapshot ref captured at session start so mid-session unlocks don't expand the current pool"
    - "queueMicrotask before reading store post-applyAnswer to detect row unlocks against fresh state"
    - "sessionStorage (NOT localStorage) for ephemeral page-handoff between session and summary"
    - "Dynamic confetti import inside useEffect with cancelled-flag cleanup"

key-files:
  created:
    - "src/app/kana/session/page.tsx"
    - "src/app/kana/components/KanaSession.tsx"
    - "src/app/kana/components/KanaQuestionCard.tsx"
    - "src/app/kana/components/KanaLearnCard.tsx"
    - "src/app/kana/components/RowUnlockModal.tsx"
  modified: []

key-decisions:
  - "SESSION_LENGTH locked at 20 questions per drill"
  - "startSnapshot pattern: mid-session unlocks fire the modal but do NOT expand the current 20-question pool — new rows only show up in the NEXT session (clearer pacing)"
  - "sessionStorage key kitsubeat-kana-last-session shape = {mode: KanaMode, log: AnswerLog[], unlocked: string[]} for Plan 09-06 handoff"
  - "KanaMode imported from @/lib/kana/types in BOTH session/page.tsx and KanaSession.tsx — keeps wave-3 plans 09-04 and 09-05 parallel-safe (no sibling-plan import dependency)"
  - "0-star path uses setStars(script, glyph, 1) NOT applyAnswer — KANA-04 specifies 'exactly 1 star for acknowledgment', not '+1 from current'"
  - "queueMicrotask wraps the unlock-detection diff so the Zustand store has fully applied the delta before computeUnlockedRows reads latest state"
  - "Quit link returns to /kana without incrementing sessionsCompleted — that's owned by Plan 09-06 summary screen"
  - "sessionStorage.setItem moved into useEffect (NOT inline-during-render, deviating from plan text) to avoid React StrictMode double-write and broken Suspense semantics — same key/shape contract preserved"

patterns-established:
  - "questionKey shuffle gate: useMemo([questionKey]) prevents distractor re-shuffle on chosen-state change while user is reading"
  - "Two-phase question UI: 'question' phase accepts answer, 'feedback' phase requires manual continue (no auto-advance — CONTEXT manual pacing decision)"
  - "Keyboard handler stratification: option-keys (1-4) only active when chosen===null; Space/Enter only active after feedback (no double-answer or premature skip)"

requirements-completed: [KANA-01, KANA-02, KANA-04, KANA-06]

# Metrics
duration: 3min
completed: 2026-04-18
---

# Phase 09 Plan 05: Drill Session Loop Summary

**20-question /kana/session route with weighted-random selection, 4-option tap card (or 0-star pre-reveal variant), keyboard shortcuts, and mid-session row-unlock confetti modal — wires plans 01-03 into the actual interactive drill experience.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-18T00:57:11Z
- **Completed:** 2026-04-18T01:00:30Z
- **Tasks:** 2
- **Files created:** 5

## Accomplishments
- Three presentational components (KanaQuestionCard, KanaLearnCard, RowUnlockModal) reusing established repo patterns from QuestionCard.tsx, LearnCard.tsx, and StarDisplay.tsx — no new conventions introduced
- KanaSession orchestrator with startSnapshot ref so the 20-question pool is locked at session start (mid-session unlocks fire the modal but don't expand the pool; new rows surface in the NEXT session for clearer pacing)
- /kana/session route with Suspense-wrapped useSearchParams parsing (Next.js 15 requirement)
- queueMicrotask-gated unlock-detection diff: applyAnswer → microtask → re-read store → computeUnlockedRows → fire modal once per question (loop break)
- KanaMode sourced from @/lib/kana/types in both files — wave-3 plans 09-04 and 09-05 stay fully parallel-safe with no cross-plan UI import
- sessionStorage handoff key `kitsubeat-kana-last-session` ({mode, log: AnswerLog[], unlocked}) ready for Plan 09-06 to consume

## Task Commits

Each task was committed atomically:

1. **Task 1: Build KanaQuestionCard, KanaLearnCard, RowUnlockModal** — `41ca008` (feat)
2. **Task 2: Build KanaSession orchestrator + /kana/session route** — `964715c` (feat)

## Files Created/Modified

- `src/app/kana/components/KanaQuestionCard.tsx` — 4-option tap card with Fisher-Yates shuffle, getOptionStyle feedback colors (emerald/rose), TTS gating via hasJapaneseVoice + onVoicesChanged, and keyboard shortcuts (1/2/3/4 to pick, Space/Enter to continue)
- `src/app/kana/components/KanaLearnCard.tsx` — 0-star pre-reveal variant (KANA-04): glyph + romaji + Got it button, with the same TTS gating; Space/Enter triggers Got it
- `src/app/kana/components/RowUnlockModal.tsx` — celebration modal with dynamic `import("canvas-confetti")` inside useEffect, disableForReducedMotion=true, autoFocus on Continue button
- `src/app/kana/session/page.tsx` — thin client wrapper reading ?mode= from URL (hiragana | katakana | mixed; defaults to hiragana on invalid input) wrapped in Suspense
- `src/app/kana/components/KanaSession.tsx` — 20-question loop orchestrator: hydration guard → startSnapshot ref → buildKanaSession → dispatch to LearnCard (0-star) or QuestionCard (>=1 star) → applyAnswer + setAnswerLog → queueMicrotask unlock diff → fire modal once per unlock → advance index → write sessionStorage on completion

## Decisions Made

- **SESSION_LENGTH = 20:** Matches plan spec; locked as a module-level const for easy future tuning.
- **startSnapshot at first hydrated render:** Captures `{hiragana, katakana, unlocked}` ONCE so mid-session unlocks don't change the active pool. UX rationale: showing "you just unlocked ka-row!" then immediately drilling ka-row characters in the same session is jarring — the modal celebrates the milestone, the next session puts it into rotation.
- **sessionStorage (not localStorage):** The `kitsubeat-kana-last-session` payload is single-use, ephemeral handoff to the summary screen — persisting it would risk stale-session UI on later visits.
- **0-star path uses setStars(script, glyph, 1):** KANA-04 spec is "exactly 1 star for acknowledgment". Using applyAnswer would compute current+1, which is current+1=1 only if current is 0 — fragile if invariants ever break. Direct set is intent-explicit.
- **queueMicrotask over flushSync:** Zustand sets are synchronous but the React render hasn't reconciled yet; useKanaProgress.getState() inside the microtask reads the store directly (bypassing the snapshot) so the unlock detection sees the just-applied delta.
- **One modal per question (loop break):** If two rows unlock simultaneously (extreme edge case requiring exactly one star away from each), only the first is shown; the second appears the next time its mastery is checked. Keeps modal stack from blowing up.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Moved sessionStorage.setItem from inline-during-render into useEffect**
- **Found during:** Task 2 (KanaSession.tsx authoring)
- **Issue:** The plan text wrote `sessionStorage.setItem(...)` inline inside the `if (index >= SESSION_LENGTH)` branch during render. Side effects during render are a React anti-pattern: StrictMode double-renders cause double-writes; React Suspense / concurrent mode can throw away the render and replay it; future React versions may discard the entire render tree.
- **Fix:** Extracted the write into a `useEffect` keyed on `[index, mode, answerLog, unlockedDuringSession]` so it runs after the commit phase. Same key (`kitsubeat-kana-last-session`) and same JSON shape preserved — Plan 09-06's read contract is unchanged.
- **Files modified:** `src/app/kana/components/KanaSession.tsx`
- **Verification:** TS-clean; `kitsubeat-kana-last-session` key still appears in source (`grep` confirms); behavior identical from Plan 09-06's perspective.
- **Committed in:** `964715c` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — render-time side effect)
**Impact on plan:** Pure correctness fix. Public contract (sessionStorage key + shape) unchanged. No scope creep.

## Issues Encountered
- None. Live UI smoke tests (verify steps 4-9 in the plan: dev-server visit, click-through, keyboard test, mode switching) were NOT exercised in this environment — these require operator-driven browser interaction. The TS-clean compile + zero contract violations + plan 09-04's existing landing page already linking to `/kana/session?mode=hiragana` is the strongest mechanical assurance achievable autonomously. Operator should run through the 9-step verify list when convenient.

## Self-Check: PASSED

Files verified to exist:
- `src/app/kana/components/KanaQuestionCard.tsx` — FOUND
- `src/app/kana/components/KanaLearnCard.tsx` — FOUND
- `src/app/kana/components/RowUnlockModal.tsx` — FOUND
- `src/app/kana/components/KanaSession.tsx` — FOUND
- `src/app/kana/session/page.tsx` — FOUND

Commits verified to exist:
- `41ca008` — FOUND (Task 1 — KanaQuestionCard + KanaLearnCard + RowUnlockModal)
- `964715c` — FOUND (Task 2 — KanaSession + session/page.tsx)

## Next Phase Readiness
- Plan 09-06 (session summary) can now read `sessionStorage["kitsubeat-kana-last-session"]` payload `{mode: KanaMode, log: AnswerLog[], unlocked: string[]}` to render per-character results, total stars earned, and the unlock celebration replay.
- Phase 09 progress: 4/6 plans complete (09-01 + 09-02 + 09-03 + 09-05 if 09-04 has a SUMMARY by then; today 09-04 has commits but no SUMMARY yet — Phase 09 is at 4/6 plans landed in code, 4/6 with summaries pending 09-04's wrap).
- No blockers introduced. Manual UI smoke (verify steps 4-9) is the only outstanding verification.

---
*Phase: 09-kana-trainer*
*Completed: 2026-04-18*
