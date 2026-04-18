---
phase: 09-kana-trainer
plan: 03
subsystem: ui
tags: [zustand, persist, localStorage, kana, mastery, hydration]

# Dependency graph
requires:
  - phase: 09-kana-trainer/01
    provides: Script + MasteryMap type contracts (src/lib/kana/types.ts)
  - phase: 09-kana-trainer/02
    provides: applyStarDelta pure helper (src/lib/kana/mastery.ts)
provides:
  - useKanaProgress Zustand store with persist middleware
  - Two independent MasteryMaps (hiragana / katakana) for KANA-03 separation
  - sessionsCompleted counter for the sign-up nudge cadence
  - _hasHydrated guard so consumers can render skeleton until ready
  - Test-env window hook (window.__kbKanaStore) for Playwright reads
affects: [09-04 landing page, 09-05 drill session, 09-06 session summary]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zustand persist + partialize + onRehydrateStorage hydration guard (mirrors src/stores/exerciseSession.ts)"
    - "Test-env window hook gated single-condition on NEXT_PUBLIC_APP_ENV === 'test' (no NODE_ENV fallback)"
    - "Versioned localStorage key (kitsubeat-kana-mastery-v1) — schema bump = key bump"

key-files:
  created:
    - "src/stores/kanaProgress.ts"
    - "src/stores/__tests__/kanaProgress.test.ts"
  modified: []

key-decisions:
  - "Persist key locked at 'kitsubeat-kana-mastery-v1' — versioned for forward migration"
  - "applyAnswer delegates to applyStarDelta from mastery.ts (KANA-03 +1/-2 clamp lives there, not duplicated)"
  - "No nudgeShown flag — banner derives purely from sessionsCompleted (cleaner; no bookkeeping)"
  - "No write debouncing — 5KB localStorage write is trivial; debounce loses data on mid-session refresh"
  - "Per-script independence: hiragana and katakana stored as two separate maps (あ ≠ ア counters)"
  - "__resetForTests intentionally does NOT touch _hasHydrated (test sets explicitly when needed)"

patterns-established:
  - "Store partialize strips _hasHydrated from persisted JSON; onRehydrateStorage flips it true after rehydration"
  - "vi.mock('zustand/middleware', { persist: passthrough, createJSONStorage: () => null }) for unit tests in node env"

requirements-completed: [KANA-03]

# Metrics
duration: 3min
completed: 2026-04-18
---

# Phase 09 Plan 03: Kana Progress Store Summary

**Zustand + persist localStorage store for per-character kana mastery (independent hiragana/katakana maps), session counter, and hydration guard — wired to applyStarDelta from mastery.ts.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-18T00:48:27Z
- **Completed:** 2026-04-18T00:51:06Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments

- `useKanaProgress` Zustand store live with persist middleware (key: `kitsubeat-kana-mastery-v1`)
- Two independent `MasteryMap`s (hiragana, katakana) so あ and ア have separate 10-star counters
- `applyAnswer(script, kana, correct)` delegates to `applyStarDelta` from `@/lib/kana/mastery` — single source of truth for the +1/-2 clamping rule
- `_hasHydrated` flag exposed via `setHasHydrated` + `onRehydrateStorage` for skeleton-render gating
- Test-env window hook `window.__kbKanaStore` gated single-condition on `NEXT_PUBLIC_APP_ENV === 'test'` (production bundle tree-shakes)
- 14-test vitest spec covering initial state, applyAnswer (correct/wrong/clamping/independence), setStars (clamp + isolation), incrementSessionsCompleted, hydrateFrom (wholesale replace), setHasHydrated, and partialize shape

## Task Commits

Each task was committed atomically:

1. **Task 1: Create kanaProgress store with persist + hydration + test hook** — `0570044` (feat)
2. **Task 2: Unit-test the store actions and partialize shape** — `31446fc` (test)

## Files Created/Modified

- `src/stores/kanaProgress.ts` — Zustand store with persist + partialize + onRehydrateStorage; applyAnswer/setStars/incrementSessionsCompleted/hydrateFrom/setHasHydrated/__resetForTests actions; window.__kbKanaStore test-env hook
- `src/stores/__tests__/kanaProgress.test.ts` — 14 tests covering all store actions and the partialize contract

## Persisted JSON Shape

After hydration the localStorage entry under key `kitsubeat-kana-mastery-v1` looks like:

```json
{
  "state": {
    "hiragana": { "あ": 1, "い": 0 },
    "katakana": { "ア": 1 },
    "sessionsCompleted": 0
  },
  "version": 0
}
```

`_hasHydrated` is **never** persisted — verified by the partialize contract test (asserts the JSON contains `sessionsCompleted` / `hiragana` / `katakana` but NOT `_hasHydrated`).

## Test-env Window Hook — Audit

```typescript
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_APP_ENV === "test") {
  (window as unknown as { __kbKanaStore: typeof useKanaProgress }).__kbKanaStore = useKanaProgress;
}
```

Single-condition gate matches the audited pattern in `src/stores/exerciseSession.ts:219-220`. No `||` with `NODE_ENV`. In production (`NEXT_PUBLIC_APP_ENV='production'`) the comparison evaluates to `false` at build time and the dead branch is tree-shaken — the store reference never reaches the production client bundle.

## Decisions Made

- **Persist key versioned (`-v1`):** Future schema change bumps to `-v2`, leaving v1 readers un-broken; no migration script needed for the bump.
- **Plan 02 dependency satisfied at execution time:** Plan 02's `applyStarDelta` was already shipped in commit `d2d21eb` (Plan 02 GREEN landed before this plan ran). No deviation/stub needed for the import.
- **Reset semantics:** `__resetForTests` clears mastery + sessions but leaves `_hasHydrated` untouched. Tests that care set it explicitly via `useKanaProgress.setState({ _hasHydrated: false })`. Avoids spurious re-hydration churn between tests.
- **Mock zustand/middleware in unit tests** (vi.mock pattern): Lets the store run in node env without a real `localStorage`. Mirrors `exerciseSession.test.ts` exactly so the pattern stays consistent across stores.

## Deviations from Plan

None — plan executed exactly as written. The plan flagged a Plan 02 import dependency (`@/lib/kana/mastery`); a check at execution start confirmed Plan 02's GREEN commit (`d2d21eb feat(09-02): implement mastery + row-unlock helpers`) had already landed, so the import resolved cleanly with no stubbing required.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Store is importable from `@/stores/kanaProgress` and ready for consumption by:
  - **Plan 09-04** (landing page / row chart): can read `hiragana` / `katakana` maps to render star counts and pass to `computeUnlockedRows`.
  - **Plan 09-05** (drill session): will call `applyAnswer` per question and `setStars` for the KANA-04 "Got it" pre-reveal path.
  - **Plan 09-06** (session summary): will call `incrementSessionsCompleted` on session end and read `sessionsCompleted` to drive the sign-up nudge cadence.
- Plan 02 SUMMARY (`09-02-SUMMARY.md`) does not yet exist on disk — Plan 02 commits shipped without a summary file. Plan 02 should be summarized separately (independent of this plan).

---
*Phase: 09-kana-trainer*
*Completed: 2026-04-18*

## Self-Check: PASSED

- FOUND: src/stores/kanaProgress.ts
- FOUND: src/stores/__tests__/kanaProgress.test.ts
- FOUND: commit 0570044 (feat — Task 1)
- FOUND: commit 31446fc (test — Task 2)
- FOUND: applyStarDelta import resolves to src/lib/kana/mastery.ts (Plan 02 commit d2d21eb)
- VERIFIED: 14/14 vitest assertions green
- VERIFIED: tsc --noEmit clean for kanaProgress files (no new errors introduced)
- VERIFIED: grep "useKanaProgress" src/ shows only source file and test (no premature consumers)
