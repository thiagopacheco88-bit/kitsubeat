---
phase: 09-kana-trainer
plan: 04
subsystem: ui

tags: [next-app-router, react, zustand, tailwind-v4, client-component, hydration-guard, kana, public-route]

# Dependency graph
requires:
  - phase: 09-kana-trainer
    provides: KanaMode type + HIRAGANA_ROWS / KATAKANA_ROWS chart data + computeUnlockedRows + useKanaProgress store + KANA_SIGNUP_NUDGE_AFTER_SESSIONS context
provides:
  - Public /kana route (no auth gate; FREE-03)
  - KanaTile / KanaGrid / ModeToggle / SignupNudge components
  - KANA_SIGNUP_NUDGE_AFTER_SESSIONS = 3 constant (exported from SignupNudge.tsx)
  - Stable href contract /kana/session?mode={hiragana|katakana|mixed} consumed by Plan 09-05
affects: [09-05-drill-session, 09-06-session-summary, future Phase 10 premium ladder]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hydration guard: page reads `_hasHydrated` from persisted Zustand store and renders animate-pulse skeleton until true (matches src/app/songs/[slug]/components/ExerciseTab.tsx)"
    - "Pip-row mastery indicator: 10 small filled/outline circles beneath glyph (compact alternative to StarDisplay)"
    - "Type-only import of shared discriminator (KanaMode) to keep parallel-safe wave-3 plans (09-04, 09-05) decoupled"

key-files:
  created:
    - src/app/kana/page.tsx
    - src/app/kana/components/KanaTile.tsx
    - src/app/kana/components/KanaGrid.tsx
    - src/app/kana/components/ModeToggle.tsx
    - src/app/kana/components/SignupNudge.tsx
  modified: []

key-decisions:
  - "Page is a Client Component (reads localStorage-persisted store; SSR would hydration-mismatch per RESEARCH Pitfall 1)"
  - "No checkExerciseAccess / requireAuth call on /kana — FREE-03 invariant; grep audit verifies"
  - "KanaMode imported (not redefined) from src/lib/kana/types — single source of truth keeps 09-04 and 09-05 parallel-safe"
  - "Mode state is component-local (NOT persisted) — resets on reload by design; mode persistence out of scope for v1"
  - "KANA_SIGNUP_NUDGE_AFTER_SESSIONS locked at 3 (RESEARCH Open Question 4 resolution)"
  - "SignupNudge banner has no /signup CTA wired — Phase 3 auth lands the destination; banner alone is the nudge"
  - "Mixed mode renders both grids stacked (hiragana on top, katakana below) inside one main element"
  - "KanaTile and ModeToggle are pure props-driven (do not import the store) — only KanaGrid + SignupNudge subscribe"

patterns-established:
  - "Public-route convention: client component + hydration skeleton + no auth helper imports"
  - "Type ownership rule for parallel waves: shared discriminators live in src/lib/{subsystem}/types, never in a UI component that another wave-mate would have to import"

requirements-completed: [KANA-01, KANA-02, KANA-08, FREE-03]

# Metrics
duration: 3min
completed: 2026-04-18
---

# Phase 09 Plan 04: Kana Landing Page Summary

**Public /kana chart-style landing with mode toggle, mastery pips, hydration skeleton, locked-row dimming, and post-3-session sign-up nudge — zero auth gates per FREE-03**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-18T00:56:54Z
- **Completed:** 2026-04-18T00:59:19Z
- **Tasks:** 2
- **Files created:** 5
- **Files modified:** 0

## Accomplishments
- Public /kana route renders the full hiragana + katakana chart broken into rows with locked vs unlocked styling
- Mode toggle (Hiragana / Katakana / Mixed) controls which grid(s) render and which mode the Start CTA passes via querystring
- Per-tile 10-pip mastery indicator (amber-400 filled, zinc outline) reads from useKanaProgress without a fresh fetch
- Hydration skeleton (animate-pulse) prevents the empty-grid flash for returning users
- SignupNudge banner gated on sessionsCompleted >= 3 (KANA_SIGNUP_NUDGE_AFTER_SESSIONS constant)
- KanaMode kept as a type-only import from src/lib/kana/types — preserves parallelism with Plan 09-05

## Task Commits

Each task was committed atomically:

1. **Task 1: KanaTile + KanaGrid + ModeToggle + SignupNudge components** — `6e65257` (feat)
2. **Task 2: /kana landing page with hydration guard, mode state, Start CTA** — `aec7585` (feat)

**Plan metadata:** _(final commit appended below after STATE.md + ROADMAP.md updates)_

## Files Created/Modified

- `src/app/kana/page.tsx` — Public landing page; client component; owns mode state; renders skeleton until store hydrates; composes the four components
- `src/app/kana/components/KanaTile.tsx` — Single-character tile (glyph + romaji + 10 pip dots); locked variant dims via zinc colors; pure props-driven
- `src/app/kana/components/KanaGrid.tsx` — Row-grouped chart for ONE script; reads useKanaProgress; uses computeUnlockedRows to dim locked rows (opacity-50)
- `src/app/kana/components/ModeToggle.tsx` — Hiragana / Katakana / Mixed segmented control; imports KanaMode (does NOT redefine it)
- `src/app/kana/components/SignupNudge.tsx` — Amber banner shown when sessionsCompleted >= 3; exports KANA_SIGNUP_NUDGE_AFTER_SESSIONS = 3

## Decisions Made

- **Type ownership reaffirmed:** ModeToggle imports KanaMode from `@/lib/kana/types` and does not re-export. Plan 09-05 (parallel wave-3 sibling) consumes the same type from the lib module. Verified via `grep -n "^export type KanaMode" src/app/kana/` returning empty.
- **No checkExerciseAccess / requireAuth call on /kana:** FREE-03 invariant. Verified via `grep -rn "checkExerciseAccess|requireAuth" src/app/kana/` returning empty (after rewording the page-level JSDoc comment so the structural grep audit returns zero matches).
- **Comment hygiene for grep audits:** When verification commands rely on raw text greps, in-source comments must avoid mentioning the forbidden symbol. Rewrote one JSDoc block in page.tsx to satisfy the audit without losing intent ("the route deliberately skips every premium / access-check helper").
- **Hydration guard pattern lifted:** Same `_hasHydrated` + animate-pulse skeleton shape as `src/app/songs/[slug]/components/ExerciseTab.tsx`. Keeps the kana subsystem aligned with the rest of the app's persistent-store conventions.
- **No tile interactivity in v1:** Tiles render mastery state but expose no onClick. Drill entry is the Start CTA only — a tile-tap-to-drill path was deliberately not added (KISS, plan invariant).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reworded page.tsx JSDoc to satisfy structural grep audit**
- **Found during:** Task 2 (Wire /kana page) verification
- **Issue:** Plan verification step `grep -c "checkExerciseAccess" src/app/kana/page.tsx returns 0` and the broader `grep -rn "checkExerciseAccess|requireAuth" src/app/kana/` invariant both treat any textual occurrence — including documentation — as a violation. The initial JSDoc comment explained "explicitly NO call to `checkExerciseAccess()`", which made the structural grep return 1 instead of 0.
- **Fix:** Reworded the JSDoc bullet to "the route deliberately skips every premium / access-check helper." Same intent, no forbidden token in source.
- **Files modified:** src/app/kana/page.tsx (comment text only — no behavior change)
- **Verification:** Both `grep -c "checkExerciseAccess" src/app/kana/page.tsx` (= 0) and `grep -rn "checkExerciseAccess|requireAuth" src/app/kana/` (no matches) now pass.
- **Committed in:** aec7585 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Pure documentation rewording — no behavior change, no scope creep. The structural invariant the plan asserts is now genuinely encoded in the source rather than violated by a self-referential explanation.

## Issues Encountered

- **Pre-existing TypeScript errors in unrelated files** (admin/timing/[songId]/page.tsx, api/admin/songs/route.ts, lib/fsrs/scheduler.ts, .next-generated route param check for vocab-mastery). These predate this plan, do not touch any of the five new files we shipped, and are out of scope per the SCOPE BOUNDARY rule. `npx tsc --noEmit 2>&1 | grep "src/app/kana/"` returns empty — our additions compile cleanly.

## Deferred Issues

- See `deferred-items.md` (none added by this plan; the pre-existing TS errors above were already known to the project).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Plan 09-05 (drill session) is unblocked:** The Start CTA emits the contract `/kana/session?mode={mode}` that 09-05 will land. KanaMode is in `src/lib/kana/types`, so 09-05 imports it from the same place 09-04 does — no cross-component coupling.
- **Plan 09-06 (session summary) is unblocked:** Increments `sessionsCompleted` via the existing `incrementSessionsCompleted()` action; the SignupNudge will surface automatically once that count crosses 3.
- **No blockers.** Manual smoke (visit /kana while signed-out, see grid + a-row unlocked + remaining rows dimmed, switch modes, click Start → 404 until Plan 09-05 lands) is the only outstanding human-eyes verification — informational, not gating.

## Self-Check: PASSED

- [x] `src/app/kana/page.tsx` — FOUND
- [x] `src/app/kana/components/KanaTile.tsx` — FOUND
- [x] `src/app/kana/components/KanaGrid.tsx` — FOUND
- [x] `src/app/kana/components/ModeToggle.tsx` — FOUND
- [x] `src/app/kana/components/SignupNudge.tsx` — FOUND
- [x] Task 1 commit `6e65257` — FOUND
- [x] Task 2 commit `aec7585` — FOUND

---
*Phase: 09-kana-trainer*
*Completed: 2026-04-18*
