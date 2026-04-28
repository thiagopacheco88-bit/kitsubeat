---
phase: 13-performance-infrastructure
plan: "02"
subsystem: iframe-defer
tags: [intersection-observer, lazy-mount, youtube, player-context, e2e, tdd]
dependency_graph:
  requires:
    - statically-cacheable /songs/[slug] route (13-01)
  provides:
    - IntersectionObserver-gated YouTube iframe lazy-mount
    - Skeleton placeholder on initial paint (zero CLS)
    - forceMount: boolean + setForceMount: (v: boolean) => void on PlayerContext
    - Practice-tab force-mount trigger in SongContent
    - iframe-defer E2E spec (3 tests locking SPEC AC #4, #5, D-08)
  affects:
    - src/app/songs/[slug]/components/YouTubeEmbed.tsx
    - src/app/songs/[slug]/components/PlayerContext.tsx
    - src/app/songs/[slug]/components/SongContent.tsx
    - tests/e2e/iframe-defer.spec.ts
tech_stack:
  added:
    - IntersectionObserver (browser primitive, zero library cost)
  patterns:
    - IO lazy-mount with rootMargin: "200px" (D-07 LOCKED)
    - Test-env short-circuit single-condition gate (D-20)
    - per-test URL flag override (?disableTestForceMount=1) to exercise IO path
    - SongContentInner extraction inside PlayerProvider boundary (D-08 context access)
    - TDD RED/GREEN (D-18) — RED spec committed before source changes
key_files:
  created:
    - tests/e2e/iframe-defer.spec.ts
  modified:
    - src/app/songs/[slug]/components/YouTubeEmbed.tsx
    - src/app/songs/[slug]/components/PlayerContext.tsx
    - src/app/songs/[slug]/components/SongContent.tsx
decisions:
  - D-08 force-mount surface as state-lift on PlayerProvider (forceMount/setForceMount in context value) over imperative call or ExerciseTab effect
  - SongContentInner extraction (lowest blast radius) to call usePlayer() inside provider boundary
  - ?disableTestForceMount=1 URL flag (not localStorage) for per-test IO override — URL flags are request-scoped and cleaner for Playwright
  - activeType state kept in SongContent (not SongContentInner) so key={activeType} remount resets forceMount via fresh useState(false)
metrics:
  duration: "~5 minutes"
  completed: "2026-04-28"
  tasks_completed: 3
  files_modified: 3
  files_created: 1
  integration_tests_added: 0
  unit_tests_touched: 0
  e2e_tests_added: 3
  e2e_tests_preserved: 2
---

# Phase 13 Plan 02: YouTube Iframe Defer — Summary

**One-liner:** IntersectionObserver lazy-mount in YouTubeEmbed defers iframe past first paint; forceMount flag on PlayerContext keeps Listening Drill working when Practice tab opens without scroll.

## Files Created / Modified

| File | Action | Purpose |
|------|--------|---------|
| `tests/e2e/iframe-defer.spec.ts` | CREATED | 3 E2E tests locking SPEC AC #4 (0 iframes on initial DOM), #5 (1 iframe post-scroll), D-08 (Practice force-mount) |
| `src/app/songs/[slug]/components/YouTubeEmbed.tsx` | MODIFIED | IO lazy-mount gate: shouldMount state, IntersectionObserver effect (rootMargin: "200px"), placeholder skeleton, forceMount short-circuit, test-env gate, player-init effect gated on shouldMount |
| `src/app/songs/[slug]/components/PlayerContext.tsx` | MODIFIED | Additive forceMount: boolean + setForceMount: (v: boolean) => void on PlayerState interface and context value; useState(false) in provider body |
| `src/app/songs/[slug]/components/SongContent.tsx` | MODIFIED | Extracted SongContentInner component inside PlayerProvider boundary; wired setForceMount(true) in activeTab effect when Practice opens; activeType lifted in SongContent to preserve key={activeType} remount semantics |

## Bundle Delta

IntersectionObserver is a browser primitive — zero library import. Added ~45 lines TypeScript + ~15 lines JSX across the modified files.

Estimated bundle delta on /songs/[slug] First Load JS: **< 0.5 KB gzipped** (well within the 50 KB budget Plan 13-03 will enforce).

Baseline (pre-Phase-13): `/songs/[slug]` First Load JS ~116 KB raw / ~40 KB gzipped.

## Test Counts

- E2E tests added: **3** (iframe-defer.spec.ts — SPEC AC #4, #5, D-08 force-mount)
- Unit tests touched: 0 (PlayerContext is additive — existing phase-10 suite stays green without modification)
- E2E tests preserved (not modified): player-load.spec.ts, advanced-drill-quota.spec.ts

## TDD Evidence (D-18)

| Phase | Commit | Message |
|-------|--------|---------|
| RED | `fe0cab1` | test(13-02): add iframe-defer E2E spec (RED) |
| GREEN | `2fab8da` | feat(13-02): IO defer + force-mount + placeholder skeleton in YouTubeEmbed (GREEN) |

`git log --oneline | head -5` confirms RED (`fe0cab1`) at an earlier position than GREEN (`2fab8da`) — TDD ordering preserved per D-18.

## Commit Hashes

| Commit | Description |
|--------|-------------|
| `48e76e4` | feat(13-02): extend PlayerContext with forceMount + extract SongContentInner |
| `fe0cab1` | test(13-02): add iframe-defer E2E spec (RED) |
| `2fab8da` | feat(13-02): IO defer + force-mount + placeholder skeleton in YouTubeEmbed (GREEN) |

## Key Decisions

### D-08 Force-Mount Surface: State-Lift on PlayerProvider

Chose `forceMount: boolean + setForceMount: (v: boolean) => void` as additive context state on `PlayerProvider` over two alternatives:
- **Rejected: context-flag-dispatched-from-ExerciseTab-effect** — would require ExerciseTab to import and call setForceMount, coupling a lazy-loaded chunk to the player context.
- **Rejected: imperative call on PlayerContext API** — would extend the Phase 10 locked API surface (D-19), which must remain unchanged in call signatures and timing semantics.

Chosen surface is purely additive: existing Phase 10 API (`seekTo`, `play`, `pause`, `isReady`, `embedState`) unchanged. `forceMount` resets automatically on PlayerProvider remount (`key={activeType}` version toggle) via fresh `useState(false)` — no manual reset needed.

Reference: PATTERNS.md PlayerContext.tsx:40-44, 134-144 confirms additive context-state is the existing extension shape.

### SongContentInner Extraction

Extracted `SongContentInner` from `SongContent` to access `usePlayer().setForceMount` inside the `<PlayerProvider>` boundary. The extraction is a JSX-tree lift + props pass-through with no logic changes:
- `activeType` state stays lifted in `SongContent` (not in `SongContentInner`) so `<PlayerProvider key={activeType}>` remounts cleanly on version toggle, resetting `forceMount` for free.
- All existing tabs (vocabulary, grammar, practice), player controls, version toggle buttons, and Suspense fallback are preserved verbatim.

### ?disableTestForceMount=1 URL Flag

Chose a per-test URL query parameter (not localStorage) to override the D-20 test-env short-circuit in the iframe-defer spec:
- URL flags are request-scoped — no cross-test contamination.
- Playwright can set them declaratively in `page.goto()` — no extra `page.evaluate()` calls.
- Single-condition D-20 gate is preserved: outer `if (process.env.NEXT_PUBLIC_APP_ENV === "test")` checks ONE env var; the inner URL check is a runtime override within that branch, not a second condition joined with `||`.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all three render branches (placeholder, error, player container) produce real DOM. The placeholder is replaced by a real iframe on IO trigger or force-mount; no hardcoded empty values flow to UI rendering.

## Threat Flags

All surfaces within the plan's threat model (T-13-02-01 through T-13-02-05). Verification:
- `rg "NEXT_PUBLIC_APP_ENV.*||" src/` returns 0 code matches (1 comment match in db/index.ts explicitly documenting the no-`||` rule — not a violation).
- `window.__kbPlayer` single-condition gate preserved verbatim (lines 264-266 of YouTubeEmbed.tsx).
- `?disableTestForceMount=1` query param is inert in production (`NEXT_PUBLIC_APP_ENV !== "test"` so the outer branch is dead code at build time — T-13-02-02 mitigated).

## Build Verification Note

`npm run build` fails in this environment with `DATABASE_URL is not set` — **pre-existing issue** confirmed by Plan 13-01 SUMMARY.md (same error on base commit without any changes). TypeScript compiles clean (`npx tsc --noEmit` exits 0). Build will succeed in CI where DATABASE_URL is provisioned.

## Self-Check: PASSED

Files created:
- `tests/e2e/iframe-defer.spec.ts` — EXISTS

Files modified (verified via grep output):
- `src/app/songs/[slug]/components/YouTubeEmbed.tsx` — IntersectionObserver, rootMargin: "200px", data-yt-state="placeholder", shouldMount state, NEXT_PUBLIC_APP_ENV gates — ALL PRESENT
- `src/app/songs/[slug]/components/PlayerContext.tsx` — forceMount: boolean, setForceMount: (v: boolean) => void, useState(false) — ALL PRESENT
- `src/app/songs/[slug]/components/SongContent.tsx` — setForceMount(true) in activeTab effect — PRESENT

Commits:
- `48e76e4` — EXISTS (git log confirmed)
- `fe0cab1` — EXISTS (git log confirmed)
- `2fab8da` — EXISTS (git log confirmed)

TypeScript: `npx tsc --noEmit` exits 0 — CLEAN

TDD ordering: `test(13-02)` RED commit (`fe0cab1`) at earlier position than `feat(13-02)` GREEN commit (`2fab8da`) — CONFIRMED
