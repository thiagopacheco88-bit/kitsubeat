---
phase: 12-learning-path-and-gamification
plan: "06"
subsystem: gamification-surface
tags: [path, level-up, cosmetics, sfx, e2e, starter-pick]
dependency_graph:
  requires: [12-04, 12-05]
  provides: [path-route, level-up-takeover, cosmetics-provider, sfx-helpers, e2e-spec]
  affects: [session-summary, exercises-action, session-integration]
tech_stack:
  added: []
  patterns:
    - canvas-confetti dynamic import (matches StarDisplay.tsx pattern, no second lib)
    - HTMLAudioElement for SFX (no howler.js or Web Audio API — RESEARCH F2)
    - CSS @keyframes level-pop alongside existing star-shine
    - Drizzle serial test fixtures with TEST_DATABASE_URL guard
key_files:
  created:
    - src/app/path/page.tsx
    - src/app/path/components/PathMap.tsx
    - src/app/path/components/PathNode.tsx
    - src/app/path/components/PathHud.tsx
    - src/app/path/components/StarterPick.tsx
    - src/app/components/LevelUpTakeover.tsx
    - src/app/components/CosmeticsProvider.tsx
    - src/lib/sfx.ts
    - public/sounds/level-up.mp3
    - tests/e2e/gamification-path.spec.ts
  modified:
    - src/app/globals.css
    - src/app/songs/[slug]/components/SessionSummary.tsx
    - src/app/actions/exercises.ts
    - src/lib/gamification/session-integration.ts
decisions:
  - "PathHud kept as separate component from ProfileHud (not merged to GamificationHud); both are small enough that duplication is cleaner than a shared sub-component rename in this plan"
  - "isCompleted on PathNode uses ex1_2_3_best_accuracy > 0 as simplest available signal — any exercise touch counts; documented here as the canonical check"
  - "level-up.mp3 is a silent placeholder (348 bytes); real CC0 asset from freesound.org must be swapped before beta launch (see rollout notes)"
  - "CosmeticsProvider renders fragment (no wrapper div) when theme is null, avoiding empty style attribute"
metrics:
  duration_minutes: 10
  completed_date: "2026-04-19"
  tasks_completed: 3
  files_created_or_modified: 14
---

# Phase 12 Plan 06: Final Surfaces — Path, Level-Up, Cosmetics, E2E Summary

One-liner: /path stepped map + StarterPick modal + full-screen LevelUpTakeover with confetti + sound/haptic prefs + CosmeticsProvider + Playwright E2E covering the complete loop.

## Files Delivered

### /path route

- **`src/app/path/page.tsx`** — server component, `force-dynamic`, parallel-fetches user gamification state + songs + reward slot defs. Renders `<CosmeticsProvider>` wrapper → `<PathHud>` → StarterPick (null slug) or PathMap (slug set).

- **`src/app/path/components/PathMap.tsx`** — client component; sorts songs by `difficulty_tier` (basic→intermediate→advanced) then `popularity_rank ASC NULLS LAST` in JS; alternates `mr-auto` / `ml-auto` for winding visual; inserts tier-chip dividers between groups.

- **`src/app/path/components/PathNode.tsx`** — client Link; `isCurrent` → `ring-4 ring-orange-500 scale-110` + "Next up" label; `isCompleted` → green checkmark. M1 guard enforced: no `disabled`, no `pointer-events:none`.

- **`src/app/path/components/PathHud.tsx`** — server component mirroring ProfileHud pattern: avatar with equipped border ring, level + XP progress bar, streak/best streak. M4 guard: next-reward chip only renders when `nextReward !== null`.

- **`src/app/path/components/StarterPick.tsx`** — client component; renders 3 cards with thumbnail, title, anime, JLPT level, hardcoded vibe descriptor (per `VIBE_MAP` matching STARTER_SONG_SLUGS); calls `setStarterSong` server action then `router.refresh()`.

### Overlay + helpers

- **`src/app/components/LevelUpTakeover.tsx`** — full-screen fixed overlay (`z-50 bg-black/70 backdrop-blur`); fires canvas-confetti (dynamic import, same pattern as StarDisplay.tsx), `playLevelUpSFX`, `triggerHaptic` on `visible` transition; `.level-pop` class on headline; dismisses on Continue button or Escape key. M3 guard enforced via `dismissed` state in SessionSummary caller.

- **`src/app/components/CosmeticsProvider.tsx`** — client wrapper applying `theme.css_vars` as inline style on a div; renders plain fragment when `theme` is null. NOT in `layout.tsx` (cosmetics never leak to /songs).

- **`src/lib/sfx.ts`** — `preloadLevelUpSFX` (singleton HTMLAudioElement) + `playLevelUpSFX(enabled)` (catch silences autoplay-blocked errors) + `triggerHaptic(enabled, pattern)` (try/catch for iOS no-op).

### Audio asset

- **`public/sounds/level-up.mp3`** — **PLACEHOLDER: 348-byte silent file.** A real CC0 ~1.5s fanfare must be sourced from freesound.org and swapped before beta launch. The file is present so the build passes and HTMLAudioElement does not 404. Suggested source: freesound.org CC0 search "fanfare short" or "level up chime".

### Animation

- **`src/app/globals.css`** — added `@keyframes level-pop` (scale 0.3→1.2→1, opacity 0→1) + `.level-pop` class alongside existing `star-shine`. No new animation libraries.

### Session wiring

- **`src/app/songs/[slug]/components/SessionSummary.tsx`** — imports `LevelUpTakeover`; adds `levelUpDismissed`, `soundEnabled`, `hapticsEnabled` state; renders overlay when `leveledUp && !levelUpDismissed`; replaces the Plan 04 `console.info` signal.

- **`src/app/actions/exercises.ts`** — `SaveSessionResult` extended with `soundEnabled` + `hapticsEnabled` fields; both early-return fallback objects updated.

- **`src/lib/gamification/session-integration.ts`** — `GamificationResult` extended with `soundEnabled` + `hapticsEnabled`; threaded from `userRow` in `applyGamificationUpdate` return.

### E2E

- **`tests/e2e/gamification-path.spec.ts`** — 7 serial Playwright tests:
  1. StarterPick modal renders with 3 cards
  2. Pick → modal dismissed → PathMap renders with "Next up" label → DB slug is a starter
  3. First session → XP earned / Streak / Level bar / Continue Path visible
  4. Level-up trigger (seed xp=95 → complete session) → LevelUpTakeover visible, dismiss → overlay gone
  5. Path advancement → DB current_path_node_slug updated → /path "Next up" still visible
  6. HUD leak: no `data-testid="gamification-hud"` or `.ring-orange-500` on /songs
  7. HUD leak: no `data-testid="gamification-hud"` on /songs/[slug]

  **Spec status: skips cleanly when `TEST_DATABASE_URL` is absent** (same guard pattern as advanced-drill-quota.spec.ts). Run with `TEST_DATABASE_URL=<url> npx playwright test tests/e2e/gamification-path.spec.ts`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Extend GamificationResult/SaveSessionResult with soundEnabled + hapticsEnabled**
- **Found during:** Task 2 — wiring LevelUpTakeover into SessionSummary requires user prefs at the client layer
- **Issue:** `saveSessionResults` returned no user pref fields; LevelUpTakeover needed them for SFX/haptic gates
- **Fix:** Extended `GamificationResult` (session-integration.ts) and `SaveSessionResult` (exercises.ts) with `soundEnabled` + `hapticsEnabled`; threaded from the already-fetched `userRow` in `applyGamificationUpdate`; updated both early-return fallback objects (default: `true` for both)
- **Files modified:** `src/lib/gamification/session-integration.ts`, `src/app/actions/exercises.ts`
- **Commit:** bc0080d

**2. [Rule 1 - Deviation from plan option (a)] PathHud kept separate from ProfileHud**
- **Found during:** Task 1 design — plan preferred option (a): move ProfileHud to GamificationHud and have both pages import it
- **Issue:** ProfileHud is currently a named function export and only 73 lines. Relocating it mid-plan would touch /profile route (out of scope for this plan's file_modified list) and risk a broken page during commit
- **Fix:** Created `PathHud` as a separate sibling component following the same pattern. Both share identical structure. A future consolidation (rename to GamificationHud) is low risk and deferred to a polish plan
- **Impact:** Slight duplication (~73 LOC) between PathHud and ProfileHud; no behavior difference
- **Deferred to:** Plan XX polish

**3. [Note - audio asset] level-up.mp3 is a silent placeholder**
- **Found during:** Task 2 audio sourcing — freesound.org is not accessible in this agent context
- **Fix:** Created a 348-byte minimal MP3 frame so the build passes and HTMLAudioElement does not 404. The `sfx.ts` `playLevelUpSFX` catches autoplay errors silently
- **Required before beta launch:** Replace `public/sounds/level-up.mp3` with a real CC0 ~1.5s fanfare from freesound.org (search: "fanfare short" or "level up chime" filtered by CC0). No code changes needed — drop the file in the same path

## HUD Placement Grep Verification

```bash
grep -rn "PathHud|PathMap|gamification-hud" src/app/songs/
# Result: OK: no HUD leak
```

No HUD elements bleed into /songs or /songs/[slug]. The `data-testid="gamification-hud"` is only on `PathHud` (in `/path`). The E2E spec's tests 6 and 7 also assert this at runtime.

## Animation Library Check

```bash
grep -rn "framer-motion|lottie" src/
# Result: OK: no framer-motion/lottie
```

## Confetti Import Pattern

`canvas-confetti` used via dynamic import in LevelUpTakeover (same pattern as StarDisplay.tsx and RowUnlockModal.tsx). No second confetti library added.

## Rollout Notes

1. **level-up.mp3 asset swap** — before beta, replace the placeholder with a real CC0 fanfare. No code changes.
2. **Auth integration** — all routes use `PLACEHOLDER_USER_ID` = `'test-user-e2e'`. Phase 15 (auth) will replace this with `auth().userId` from Clerk.
3. **No feature flag gate** — /path is live immediately for signed-in users. If a soft rollout is desired before auth ships, a simple environment variable check in `page.tsx` would suffice.
4. **reward_slot_definitions** — M4 guard is implemented correctly: if `getVisibleSlotsForUser` returns [], no cosmetic section renders anywhere. PathHud's `nextReward` chip only shows when `getNextRewardPreview` returns non-null.

## Self-Check: PENDING

Self-check against human-verify checkpoint is deferred — this is a `checkpoint:human-verify` plan. The checkpoint returns structured state for the orchestrator to present to the user. The build passes (`npm run build` clean, `/path` in route list), TypeScript passes, unit test baseline is unchanged (3 pre-existing failures confirmed pre-our-changes).
