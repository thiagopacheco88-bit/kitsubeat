---
phase: 10-advanced-exercises-full-mastery
plan: 02
subsystem: ui
tags: [react, youtube-iframe, context, imperative-api, debounce, vitest, jsdom, testing-library]

# Dependency graph
requires:
  - phase: 08.1-end-to-end-qa-suite
    provides: "window.__kbPlayer test-only hook gated on NEXT_PUBLIC_APP_ENV === 'test' (plan 08.1-05) — Plan 10-02 preserves the gate and adds the production-grade PlayerContext imperative API alongside"
provides:
  - "PlayerContext.seekTo(ms) / play() / pause() imperative API dispatched through a ref — stable identity across registration lifecycle"
  - "PlayerContext.seekAndPlay(ms) convenience with 400ms debounce + 50ms seek->play delay (Pitfall 2 replay-race mitigation)"
  - "PlayerContext.embedState + setEmbedState promoted from YouTubeEmbed-local state so Listening Drill (Plan 04) can read it without embed-internals import"
  - "PlayerContext.isReady boolean = embedState === 'ready' AND api registered — consumers short-circuit on this before calling imperative verbs"
  - "PlayerContext._registerApi internal hook used exclusively by YouTubeEmbed.onReady (register) and cleanup (clear)"
  - "React component test infrastructure: @vitejs/plugin-react + jsdom + @testing-library (devDeps); per-file `// @vitest-environment jsdom` directive supports .test.tsx alongside existing .test.ts suite"
affects: [10-advanced-exercises-full-mastery/10-04, 10-advanced-exercises-full-mastery/10-07]

# Tech tracking
tech-stack:
  added:
    - "@vitejs/plugin-react ^6.0.1 (dev) — JSX transform for .tsx test files (tsconfig jsx: preserve is owned by Next in prod, Vite needs its own loader in test)"
    - "jsdom ^29.0.2 (dev) — DOM for React component tests via per-file directive"
    - "@testing-library/react ^16.3.2 (dev) — future React component assertions (not yet used; enables Plan 10-04 card tests)"
    - "@testing-library/jest-dom ^6.9.1 (dev) — future matchers"
  patterns:
    - "Imperative-API-via-context: React context exposes verbs (seekTo/play/pause) backed by a ref so owner-component registration does not ripple re-renders downstream"
    - "Registration-bundle: single `_registerApi(api | null)` call dispatches all imperative verbs together; clearing with null on unmount prevents stale calls to destroyed YT players"
    - "Trailing-edge debounce with apiRef short-circuit: setTimeout tracks last-ms-payload; inner fires only if api still registered (handles tear-down-during-debounce)"
    - "Per-file jsdom directive: `// @vitest-environment jsdom` comment at file top — vitest v4 dropped `environmentMatchGlobs`; directive is the remaining cheap override"
    - "IS_REACT_ACT_ENVIRONMENT = true at top of .tsx test files — silences React 19 act() warnings when using act() outside Testing Library"

key-files:
  created:
    - "src/app/songs/[slug]/components/__tests__/PlayerContext.test.tsx — 10 tests, jsdom, fake timers, Probe consumer pattern"
  modified:
    - "src/app/songs/[slug]/components/PlayerContext.tsx — imperative API surface + embedState promotion + debounce seekAndPlay"
    - "src/app/songs/[slug]/components/YouTubeEmbed.tsx — _registerApi in onReady + clear on unmount; embedState migrated to context"
    - "vitest.config.ts — plugin-react + include *.test.tsx + per-file jsdom directive documentation"
    - "package.json / package-lock.json — test-infra devDeps"

key-decisions:
  - "Ref-based dispatch (not state) for imperative verbs — registration must not trigger consumer re-renders since PlayerContext is consumed by 13 files including verse-sync TokenSpan"
  - "useState tracks apiReady (separate from apiRef) — isReady needs to flip when api registers/clears, but the seekTo/play/pause wrappers themselves stay stable"
  - "Single _registerApi(bundle) call replaces planner's illustrative four-setter pattern (setSeekTo/setPlay/setPause/setIsReady) — functionally equivalent, single atomic register/clear"
  - "embedState promoted from YouTubeEmbed-local to PlayerContext — Listening Drill (Plan 04) Pitfall 3: drill mounts after watchdog expiry and must read embedState==='error' without importing embed internals"
  - "seekAndPlay pause->seek->50ms->play sequencing inside the debounce fn (not spread across separate wrappers) — keeps the replay dance atomic and testable as one trailing-edge exec"
  - "Per-file @vitest-environment directive over environmentMatchGlobs — vitest v4 removed the latter; keeps node as fast default for pure TS tests (~2-3x faster than jsdom)"
  - "jsdom + RTL + plugin-react added as devDeps (Rule 3 — blocker: can't test React context without a React test environment; existing tests are pure TS with vitest node env)"
  - "__kbPlayer test gate (Plan 08.1-05 single-condition NEXT_PUBLIC_APP_ENV === 'test') preserved verbatim — production grade PlayerContext API sits alongside, not in place of, the e2e instrumentation"

patterns-established:
  - "Imperative-API-via-context with ref dispatch — Plan 10-04 ListeningDrillCard consumes usePlayer().seekTo + play as the ONLY YT integration path (no YouTubeEmbed internal imports)"
  - "Test-environment-per-file — .test.tsx files opt into jsdom via comment directive; .test.ts stays on fast node default"
  - "Probe consumer pattern for context tests — tiny component captures ctx into a module-level ref on each render so tests can call ctx verbs via `getCtx().seekTo(...)` between act() blocks"

requirements-completed: [EXER-06]

# Metrics
duration: 9min
completed: 2026-04-18
---

# Phase 10 Plan 02: PlayerContext Imperative API Summary

**Production-grade PlayerContext.seekTo/play/pause/seekAndPlay + debounced replay + promoted embedState, backed by a ref-dispatch pattern and jsdom-based unit tests — unblocks Plan 10-04 Listening Drill without leaking the test-only window.__kbPlayer hook.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-18T08:31:44Z
- **Completed:** 2026-04-18T08:40:55Z
- **Tasks:** 2
- **Files modified:** 4 (PlayerContext.tsx, YouTubeEmbed.tsx, vitest.config.ts, package.json + lock)
- **Files created:** 1 (PlayerContext.test.tsx)

## Accomplishments

- Imperative API (`seekTo(ms)`, `play()`, `pause()`, `seekAndPlay(ms)`, `isReady`) on PlayerContext, dispatched through a ref so YouTubeEmbed registration does not re-render consumers
- 400ms debounce + 50ms seek->play delay on `seekAndPlay` — Pitfall 2 (YT iframe replay race with onStateChange) mitigated
- `embedState` + `setEmbedState` promoted from YouTubeEmbed-local state to PlayerContext — Plan 10-04 Listening Drill can detect watchdog-triggered error without embed-internals import (Pitfall 3)
- YouTubeEmbed registers imperative API in `onReady`, clears on unmount — raw `YT.Player` reference stays scoped to the embed closure
- 10 new unit tests covering registration, dispatch, isReady derivation, debounce coalescing, trailing-edge execution, pre-registration no-ops, post-unregister no-ops, and window-independent firing
- Test infra: `@vitejs/plugin-react` + `jsdom` + `@testing-library` added as devDeps; per-file `// @vitest-environment jsdom` directive pattern documented in vitest.config.ts for future .tsx component tests
- `__kbPlayer` test-only gate (Plan 08.1-05 single-condition `NEXT_PUBLIC_APP_ENV === 'test'`) preserved verbatim — Phase 08.1 e2e player-sync specs unaffected

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend PlayerContext with imperative API** - `1ae57fc` (feat)
2. **Task 2: Wire YouTubeEmbed + unit tests** - `65c4fad` (feat)
3. **Verify-step cleanup: reword doc comment** - `cdacd21` (chore — satisfies `grep 'YT.Player'` returns-nothing verification)

Plan metadata commit (SUMMARY + STATE + ROADMAP): pending final-commit step.

## Files Created/Modified

- `src/app/songs/[slug]/components/PlayerContext.tsx` — imperative API (seekTo/play/pause/seekAndPlay), isReady, embedState, _registerApi internal hook
- `src/app/songs/[slug]/components/YouTubeEmbed.tsx` — onReady registers api bundle, cleanup clears it, embedState/setEmbedState migrated to context
- `src/app/songs/[slug]/components/__tests__/PlayerContext.test.tsx` — NEW; 10 tests, jsdom, fake timers, Probe capture pattern
- `vitest.config.ts` — react() plugin, .test.tsx include, directive documentation
- `package.json` / `package-lock.json` — @vitejs/plugin-react, jsdom, @testing-library/react, @testing-library/jest-dom devDeps

## Decisions Made

- **Ref-based dispatch (not state) for imperative verbs:** PlayerContext is consumed by 13 files including TokenSpan in the verse-sync critical path. Re-rendering them when the YT api registers would regress the 250ms tick. A ref + stable useCallback wrapper avoids this entirely.
- **Single `_registerApi(bundle)` call** instead of planner's four discrete setters (setSeekTo/setPlay/setPause/setIsReady): atomic register/clear is simpler and harder to desync. A comment in YouTubeEmbed preserves the planner's pattern name for future reference.
- **embedState promoted** to context (Pitfall 3): lets ListeningDrillCard render the "unavailable" fallback when watchdog expired before the drill mounted, without touching YouTubeEmbed.
- **Added jsdom + RTL + @vitejs/plugin-react as devDeps (Rule 3 — blocker):** pre-10-02 tests are pure TS on vitest node env. Testing a React context requires a DOM; no workaround without adding these (extracting the logic as pure helpers would reduce the test's faithfulness to the shipped API contract). Disk cost is ~10MB; runtime cost is ~1s per .tsx file via the per-file directive.
- **Per-file `// @vitest-environment jsdom` directive** over globbing: vitest v4 dropped `environmentMatchGlobs`. Directive keeps `node` as the fast default.
- **`seekAndPlay` keeps pause->seek->50ms->play sequencing inside the debounce fn** instead of exposing it as three separate wrappers on the context — the dance is one atomic replay, consumers just call `seekAndPlay(ms)`.
- **`__kbPlayer` gate unchanged:** production context API is in addition to, not in place of, the e2e instrumentation. Phase 08.1-05 regression remains a straight pass-through.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added React component test infrastructure (jsdom + @vitejs/plugin-react + @testing-library)**
- **Found during:** Task 2 (writing PlayerContext.test.tsx)
- **Issue:** Plan specified a `.tsx` test mounting PlayerProvider around a test consumer. Pre-10-02 vitest config used `environment: "node"`, included only `*.test.ts`, had no JSX transform (tsconfig `jsx: "preserve"` is owned by Next), and had no React Testing Library or DOM — making the specified test literally unwritable.
- **Fix:** Added `@vitejs/plugin-react` + `jsdom` + `@testing-library/react` + `@testing-library/jest-dom` as devDeps. Updated vitest.config.ts: included `**/*.{test,spec}.tsx`, added the `react()` plugin, kept `node` as the default environment, and documented the per-file `// @vitest-environment jsdom` directive as the vitest v4 replacement for the deprecated `environmentMatchGlobs`.
- **Files modified:** `package.json`, `package-lock.json`, `vitest.config.ts`
- **Verification:** `npx vitest run src/` — 14 files, 181 tests pass before + 10 new = 14 files, 190 tests pass after
- **Committed in:** `65c4fad` (folded into the Task 2 commit rather than split — the infra is inert without the test that consumes it)

**2. [Rule 3 - Blocking] Removed deprecated `environmentMatchGlobs` from vitest.config.ts**
- **Found during:** Task 2 (type-check pass after config edit)
- **Issue:** `environmentMatchGlobs` was deprecated in vitest v3 and removed in v4 (this repo runs vitest 4.1.4). TS errored `TS2769: No overload matches this call`.
- **Fix:** Removed the option; the per-file `// @vitest-environment jsdom` directive at the top of PlayerContext.test.tsx handles the opt-in. Documented in a config comment.
- **Files modified:** `vitest.config.ts`
- **Verification:** `npx tsc --noEmit 2>&1 | grep vitest.config` — clean; `npx vitest run PlayerContext.test.tsx` — 10/10 pass
- **Committed in:** `65c4fad`

**3. [Rule 3 - Blocking] Widened PlayerContext.setEmbedState type to `Dispatch<SetStateAction<EmbedState>>`**
- **Found during:** Task 2 (migrating YouTubeEmbed to use context-owned embedState)
- **Issue:** YouTubeEmbed's watchdog uses the functional updater form `setEmbedState((prev) => prev === "loading" ? "error" : prev)` to race-safely avoid clobbering a "ready" state set in the same tick by onReady. Initial context type `(v: EmbedState) => void` rejected the updater form.
- **Fix:** Imported `Dispatch` + `SetStateAction` from React; typed `setEmbedState: Dispatch<SetStateAction<EmbedState>>`. `useState` already returns this shape so no runtime change.
- **Files modified:** `src/app/songs/[slug]/components/PlayerContext.tsx`
- **Verification:** Watchdog still uses functional-updater; type-check passes
- **Committed in:** Folded into `1ae57fc` (the widening was done inline while writing Task 1)

**4. [Verify-step adjustment] Reworded PlayerContext doc comment to satisfy `grep 'YT.Player'`**
- **Found during:** Post-task-2 verification
- **Issue:** Plan's verify step requires `grep "YT.Player" PlayerContext.tsx` to return nothing (raw type does not leak into context). The initial doc comment mentioned "`YT.Player`" by name to clarify what was intentionally absent, which triggered the grep.
- **Fix:** Reworded the comment to say "raw YouTube player" instead of "raw `YT.Player`". Intent and content unchanged.
- **Files modified:** `src/app/songs/[slug]/components/PlayerContext.tsx`
- **Verification:** `grep "YT.Player" PlayerContext.tsx` returns 0 matches
- **Committed in:** `cdacd21` (small separate commit — purely editorial)

---

**Total deviations:** 4 auto-fixed (3 Rule-3 blocking + 1 verify-step editorial). No scope creep — all four are mechanical requirements for shipping the plan as specified. No Rule-4 architectural ask surfaced.

## Issues Encountered

- **vitest v4 `environmentMatchGlobs` removal** — documented in Deviation 2. Straightforward: use the per-file directive.
- **React 19 `act()` warning noise** — spamming stderr on every render/state update. Fixed by setting `IS_REACT_ACT_ENVIRONMENT = true` at the top of the .tsx test file (before any `act()` import). Documented inline.
- **Pre-existing TS errors in unrelated files** (`src/app/admin/timing/...`, `src/app/api/admin/songs/route.ts`, `src/app/actions/exercises.ts`, `src/lib/db/__tests__/derive-stars.test.ts`, `src/lib/fsrs/scheduler.ts`, `src/app/review/ReviewSession.tsx`) — all from Plan 10-01's uncommitted working copy (schema.ts adds ex5/6/7 columns; consumers haven't caught up yet). **Out of scope per SCOPE BOUNDARY rule** — will resolve when Plan 10-01 lands. My code added 0 new TS errors: `npx tsc --noEmit 2>&1 | grep -iE "PlayerContext|YouTubeEmbed" — clean`.

## User Setup Required

None — no external service configuration required. All changes are in-process React state.

## Next Phase Readiness

- **Plan 10-04 (Listening Drill card) unblocked:** `usePlayer().seekTo(verseStartMs)` + `usePlayer().play()` is the production-grade one-liner for Listening Drill's "Replay" button. For rapid replay UX, `usePlayer().seekAndPlay(verseStartMs)` handles the pause-seek-delay-play dance with the 400ms debounce.
- **Plan 10-04 fallback path ready:** `usePlayer().embedState === "error"` gives Listening Drill the Pitfall 3 detection signal without importing YouTubeEmbed.
- **Plan 10-07 (catalog mastery badge) unaffected:** PlayerContext changes don't touch catalog-card rendering.
- **Phase 08.1-05 regression protected:** `__kbPlayer` test gate still single-condition `NEXT_PUBLIC_APP_ENV === 'test'`; e2e player-sync specs untouched.
- **Future .tsx component tests enabled:** any future React component test just adds `// @vitest-environment jsdom` at the top of its `.test.tsx` and `IS_REACT_ACT_ENVIRONMENT = true` before importing `act`. The vitest.config.ts documents the pattern inline.

## Self-Check: PASSED

All 5 key files on disk (PlayerContext.tsx, YouTubeEmbed.tsx, PlayerContext.test.tsx, vitest.config.ts, this SUMMARY.md).
All 3 task commits reachable from HEAD (1ae57fc, 65c4fad, cdacd21).
10/10 new tests green (`npx vitest run src/app/songs/\[slug\]/components/__tests__/PlayerContext.test.tsx`).
Full suite: 14 files pass + 1 skipped, 190 tests pass + 1 expected fail + 3 skipped.
Grep audits: `YT.Player` in PlayerContext.tsx → 0; `__kbPlayer` test gate in YouTubeEmbed.tsx intact on `NEXT_PUBLIC_APP_ENV === 'test'`.

---
*Phase: 10-advanced-exercises-full-mastery*
*Completed: 2026-04-18*
