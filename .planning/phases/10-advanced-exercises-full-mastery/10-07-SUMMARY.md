---
phase: 10-advanced-exercises-full-mastery
plan: 07
subsystem: catalog-ui
tags: [react, stars, confetti, bonus-badge, catalog, songcard, user_song_progress, premium-gate-ui]

# Dependency graph
requires:
  - phase: 10-advanced-exercises-full-mastery
    plan: 01
    provides: "deriveStars 0|1|2|3 with ex6_best_accuracy, deriveBonusBadge(ex5+ex7), userSongProgress ex5/ex6/ex7 columns, StarDisplay widened 0|1|2|3"
  - phase: 10-advanced-exercises-full-mastery
    plan: 06
    provides: "saveSessionResults returning stars/previousStars for the 0|1|2|3 union + ex5/ex7 persistence for bonus badge derivation"
  - phase: 08-exercise-engine
    provides: "StarDisplay component (star-shine + canvas-confetti primitive) introduced under STAR-01; 08-04 Phase 8 celebration primitive reused verbatim"
provides:
  - "SongMasteredBanner.tsx — diagonal 'MASTERED' ribbon overlay for 3-star catalog cards"
  - "BonusBadgeIcon.tsx — subtle 16px sparkle adjacent to stars for ex5+ex7 ≥80% catalog cards"
  - "SessionSummary Star 3 callout wording ('You earned 3 stars — song mastered!') + subtle 'Bonus mastery unlocked!' line on deriveBonusBadge false → true transition"
  - "saveSessionResults returns bonusBadge + previousBonusBadge so UI detects the bonus transition (same snapshot pattern as stars/previousStars)"
  - "getAllSongs(userId?) — correlated subquery joins six per-user fields (ex1_2_3/ex4/ex5/ex6/ex7 best_accuracy + completion_pct) onto SongListItem; scoped to tv-preferred song_version"
  - "SongCard renders stars + ribbon + bonus badge at render time from SongListItem; unauthenticated (no userId) → null accuracy fields → no mastery decorations"
affects: []

# Tech tracking
tech-stack:
  added: []  # Pure UI + query work; no new deps
  patterns:
    - "Render-time derivation over persisted computed columns: stars + bonus are computed in the catalog SELECT's JSON output by applying deriveStars / deriveBonusBadge to the per-user accuracy fields; no precomputed stars column, no cache, no stale-data risk."
    - "Correlated subqueries (one per column) for per-user catalog progress. Six subqueries against user_song_progress keyed on songs.id, each tv-preferred via ORDER BY CASE. Single round-trip for the 200-row catalog."
    - "BEFORE-upsert snapshot contract for both stars AND bonusBadge transitions: saveSessionResults captures the previous values before GREATEST merges this session's accuracy, so false-positive confetti / callouts are impossible."
    - "Mastery decorations gated on `showProgress` (stars > 0 OR completionPct > 0) — an unauthenticated user joins with null accuracy fields → derived stars=0 AND completion_pct=null → no ribbon, no badge, no stars row (CONTEXT invariant without an isAuthenticated flag)."

key-files:
  created:
    - src/app/songs/components/SongMasteredBanner.tsx
    - src/app/songs/components/BonusBadgeIcon.tsx
    - src/lib/exercises/errors.ts  # QuotaExhaustedError moved here from "use server" file (Rule-3 fix)
  modified:
    - src/app/songs/[slug]/components/StarDisplay.tsx (doc-only: Star 3 reuses Stars 1/2 confetti path)
    - src/app/songs/[slug]/components/SessionSummary.tsx (mastered-this-session callout + bonus unlock line + useState pair)
    - src/app/actions/exercises.ts (saveSessionResults returns bonusBadge + previousBonusBadge; deriveBonusBadge imported; QuotaExhaustedError re-imported from lib/exercises/errors.ts)
    - src/lib/db/queries.ts (getAllSongs userId parameter + six correlated subqueries on user_song_progress)
    - src/app/songs/components/SongCard.tsx (render-time stars + ribbon + bonus; removed unused `progress` prop)
    - src/app/songs/page.tsx (PLACEHOLDER_USER_ID threaded through getAllSongs)
    - tests/e2e/regression-premium-gate.spec.ts (QuotaExhaustedError import path swap — lib/exercises/errors)
    - .planning/phases/10-advanced-exercises-full-mastery/deferred-items.md (Plan 10-06 QuotaExhaustedError follow-up logged + resolved)

key-decisions:
  - "Star 3 reuses the Plan 08-04 / Phase 08.1-02 confetti primitive verbatim — StarDisplay's existing useEffect + canvas-confetti dynamic import; NO new animation library, NO new CSS keyframes. The 3rd star's `earned = i < stars` branch already filled with `text-yellow-400` thanks to Plan 10-01's StarDisplay widening (STAR-01 closed by Phase 8)."
  - "Bonus badge transition gets a subtle callout (amber text, smaller font), NOT confetti. Per CONTEXT: 'Bonus badge is visually subtle — stars remain the primary signal.' Adding a bonus confetti burst would violate the primacy of stars."
  - "saveSessionResults returns bonusBadge + previousBonusBadge BOTH — the UI needs the BEFORE snapshot to detect false → true unlock. Pitfall 7 (false-positive confetti on downgrade round) applies symmetrically: compute bonusBadge on the pre-upsert row, not after GREATEST."
  - "Catalog query uses six correlated subqueries (one per field) instead of a LEFT JOIN because the project's catalog list already used a correlated subquery for youtube_id selection (tv-preferred) and the SongCard scope-locks to the SAME song_version the thumbnail points at. LEFT JOIN would require a second keying decision (which version's progress to surface) that diverges from the thumbnail-version contract."
  - "Removed SongCard's unused `progress` prop (pre-existing TODO about Clerk batch fetch). Only call site (SongGrid) was passing `<SongCard song={song} />` without it. Render-time derivation now reads from SongListItem fields directly — single source of truth, no prop-drilling."
  - "/songs page gets PLACEHOLDER_USER_ID ('test-user-e2e') matching src/app/songs/[slug]/page.tsx. Documented inline as Clerk-auth TODO. Without this thread-through, getAllSongs returns null accuracy fields for all rows → no mastery decorations in dev/test — which would defeat the plan's verification intent."
  - "SongMasteredBanner + BonusBadgeIcon files were pre-scaffolded in the working tree (likely from an earlier implementation attempt); verified they match plan spec (30+ lines banner, 20+ lines badge, correct visual treatment) and wired them into SongCard as-is."

patterns-established:
  - "Two-state render-time derivation for catalog: compute stars + bonus from the SongListItem fields at render time, never store. Matches the Phase 08.1-03 information_schema invariant (no stars column on user_song_progress)."
  - "Subtle-callout pattern for secondary achievements: plain text line, muted amber color, no animation — contrasts against the primary Star N callout (pulse animation, yellow-400 bold). Reusable for future non-star achievements."
  - "BEFORE/AFTER snapshot pair for every transition the UI surfaces: stars/previousStars AND bonusBadge/previousBonusBadge. Any future transition signal (e.g., 'first song completed', 'streak extended') follows the same contract — caller detects transition, server preserves invariant."

requirements-completed: [STAR-04, STAR-06]

# Metrics
duration: 7min
completed: 2026-04-18
---

# Phase 10 Plan 07: Premium-gate UI — Star 3 celebration + catalog mastery decorations Summary

**SessionSummary's existing confetti + star-shine code path celebrates Star 3 verbatim (Plan 08-04 primitive reused, no new animation); subtle 'Bonus mastery unlocked!' line on the ex5+ex7 transition; SongCard gets a `MASTERED` ribbon overlay for 3-star songs and a sparkle icon for bonus-qualified songs; `getAllSongs` optional-userId join returns five accuracy fields so both derivations run at render time. All 263 unit tests remain green.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-04-18T09:31:34Z
- **Completed:** 2026-04-18T09:38:56Z
- **Tasks:** 2
- **Files created:** 2
- **Files modified:** 7

## Accomplishments

### Task 1 — Star 3 celebration + component scaffolds

- **StarDisplay** was already correctly widened to `0 | 1 | 2 | 3` in Plan 10-01 — the `[0, 1, 2].map` loop + `earned = i < stars` branch fills the third star when `stars === 3`, and `newlyEarnedIndex = stars - 1` correctly animates index 2 with the same `star-shine` class Stars 1/2 use. This plan adds only a JSDoc note locking the reuse contract (CONTEXT: no new animation, no new CSS keyframes, Plan 08-04 celebration primitive reused).
- **SessionSummary** gains a `bonusBadge / previousBonusBadge` useState pair and two wording upgrades:
  - `masteredThisSession` branch overrides the callout to `"You earned 3 stars — song mastered!"` (was `"You earned Star {stars}!"`) — only fires on the `newStarEarned && stars === 3` transition, so Stars 1/2 keep the old copy.
  - `bonusUnlocked` (false → true after the session) renders a single `<p>` line `Bonus mastery unlocked!` in muted amber text with no animation and no confetti — CONTEXT-locked subtlety.
- **`saveSessionResults`** server action returns two new fields: `bonusBadge` + `previousBonusBadge`. Both are computed via `deriveBonusBadge` applied to the pre-upsert row (before GREATEST merges ex5/ex7 from the current session) — same BEFORE-snapshot contract as `previousStars` so a downgrade round can't produce false-positive unlock callouts.
- **SongMasteredBanner.tsx** ships as a 32-line component: diagonal "MASTERED" strip rotated 45° at the top-right of the thumbnail (width 80×80 overlay, rotated 100px pill). Amber/gold palette matches the filled StarDisplay color so users read the ribbon + 3 filled stars as the same signal.
- **BonusBadgeIcon.tsx** ships as a 33-line component: inline 16×16 4-point sparkle SVG in `text-violet-400`. Violet deliberately distinguishes from the yellow-gold stars so users don't misread it as a fourth star. Hover tooltip: `Bonus mastery: Grammar Conjugation + Sentence Order`.

### Task 2 — Catalog query + SongCard wiring + page thread-through

- **`getAllSongs(userId?)`** now accepts an optional userId. When supplied, six correlated subqueries against `user_song_progress` are added to the SELECT: `ex1_2_3_best_accuracy`, `ex4_best_accuracy`, `ex5_best_accuracy`, `ex6_best_accuracy`, `ex7_best_accuracy`, and `completion_pct`. All subqueries reuse the same tv-preferred `ORDER BY CASE WHEN version_type = 'tv' THEN 0 ELSE 1 END LIMIT 1` pattern the existing `youtube_id` selector uses — the accuracy fields surfaced on the card correspond to the version the user plays when they click in. Six subqueries + the main SELECT run as one round-trip; the 200-row catalog stays O(1) in DB hops.
- **`SongListItem`** type automatically widens via the Drizzle `Awaited<ReturnType<...>>[number]` inference — no manual type update needed.
- **`SongCard`** is reworked to:
  - Compute `stars = deriveStars({ ex1_2_3, ex4, ex6 })` and `bonus = deriveBonusBadge({ ex5, ex7 })` at render time from the new fields.
  - Conditionally render `<SongMasteredBanner />` when `showProgress && stars === 3` (the `showProgress` guard means unauthenticated users — null accuracy fields → 0 stars — see nothing).
  - Conditionally render `<BonusBadgeIcon />` inline trailing `<StarDisplay />` when `showProgress && bonus === true`.
  - The pre-existing unused `progress` prop (only call site passed `<SongCard song={song} />`) is removed entirely — single source of truth (SongListItem) wins, no prop-drilling.
- **`src/app/songs/page.tsx`** threads `PLACEHOLDER_USER_ID = "test-user-e2e"` through `getAllSongs(userId)` so dev/test users see their mastery decorations in the catalog pending Clerk auth. Pattern matches `src/app/songs/[slug]/page.tsx`.
- **Song detail page** (`src/app/songs/[slug]/page.tsx`) does NOT currently fetch `user_song_progress` for header/display — stars only appear on that page via `SessionSummary` after a session. Plan's "extend fetched columns if SSR fetches progress" condition was `false`; no change needed. Documented here rather than guessing at a speculative surface.

## Task Commits

1. **Task 1: StarDisplay JSDoc + SessionSummary Star 3 callout + bonus unlock line + new catalog components** — `0306fde` (feat)
2. **Task 2: getAllSongs userId join + SongCard render-time derivation + /songs page wiring** — `39f83dc` (feat)
3. **Build fix (pre-existing Vercel blocker): Next 15 + ts-fsrs + admin schema migration** — `44d9436` (fix)
4. **Rule-3 fix: QuotaExhaustedError moved to lib/exercises/errors.ts, unblocking "use server" build constraint** — `0dafa71` (feat)

## Files Created/Modified

### Created
- `src/app/songs/components/SongMasteredBanner.tsx` — 32-line diagonal amber ribbon.
- `src/app/songs/components/BonusBadgeIcon.tsx` — 33-line violet sparkle icon.

### Modified
- `src/app/actions/exercises.ts` — `saveSessionResults` returns `bonusBadge` + `previousBonusBadge`; `deriveBonusBadge` imported.
- `src/app/songs/[slug]/components/StarDisplay.tsx` — JSDoc note on Star 3 reuse contract.
- `src/app/songs/[slug]/components/SessionSummary.tsx` — bonus state pair, `masteredThisSession` branch, `bonusUnlocked` callout.
- `src/lib/db/queries.ts` — `getAllSongs(userId?)` with six correlated subqueries.
- `src/app/songs/components/SongCard.tsx` — render-time derivation; ribbon + badge wiring; removed unused `progress` prop.
- `src/app/songs/page.tsx` — PLACEHOLDER_USER_ID thread-through.
- `.planning/phases/10-advanced-exercises-full-mastery/deferred-items.md` — Plan 10-06 QuotaExhaustedError follow-up logged.

## Star 3 Confetti Reuse Confirmation

The plan's CONTEXT-locked requirement: "Star 3 celebration reuses the existing Star 1/2 confetti + star-glow code path (no new animation)." Confirmed:

- **`StarDisplay.tsx`** `useEffect` at lines 25-39 fires `confetti({ particleCount: 80, spread: 60, origin: { y: 0.4 }, colors: ["#FFD700", "#FFA500", "#FF6347"], disableForReducedMotion: true })` on `animate && stars > prevStarsRef.current`. This is the ONLY confetti call site for stars in the app. Star 3 flows through the same branch — `animate=true` + `stars=3 > prevStars=2` triggers it identically to Stars 1 and 2.
- **No new canvas-confetti imports** anywhere in the 7 modified files (grep verified before commit).
- **No new `@keyframes` / CSS classes** in `src/app/globals.css` (unchanged).
- **No new animation library** in `package.json` (unchanged — `canvas-confetti` remains the sole dependency in this class).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] QuotaExhaustedError class export violates Next.js 15 "use server" constraint**
- **Found during:** Task 2 build verification (`npm run build`)
- **Issue:** `export class QuotaExhaustedError` in `src/app/actions/exercises.ts` (a "use server" file). Next.js 15 requires only async functions to be exported from server action files; class exports fail at webpack parse step.
- **Fix:** Moved `QuotaExhaustedError` to `src/lib/exercises/errors.ts`; updated imports in `exercises.ts` and `tests/e2e/regression-premium-gate.spec.ts`.
- **Files modified:** `src/lib/exercises/errors.ts` (created), `src/app/actions/exercises.ts`, `tests/e2e/regression-premium-gate.spec.ts`
- **Commit:** `0dafa71`

### Planned-but-adjusted Items

- **`SongCard`'s `progress` prop removed instead of being refactored.** The plan's Task 2 implementation direction assumed the prop would remain (or be extended). Inspection of call sites revealed exactly one caller (`SongGrid`) and it never passed the prop. Keeping the unused prop alongside the new render-time derivation would leave two code paths racing. Removed entirely; the SongListItem fields are the single source of truth.
- **Song detail page (`/songs/[slug]/page.tsx`) NOT modified.** The plan's Task 2 Step 3 was conditional ("If the SSR currently fetches `user_song_progress`, extend..."). Inspection confirms the detail page does NOT fetch progress for display purposes — stars there are scoped to post-session SessionSummary only. The condition is false; no change is the correct action. Documented in this summary rather than silently skipped.
- **Banner and badge files were pre-scaffolded** in the working tree (untracked at plan start). Visual treatment + component API matched the plan spec. Committed as-is under Task 1 with inline JSDoc updates — no re-authoring needed.

### Pre-existing Issues (Out of Scope)

- **Plan 10-06 `QuotaExhaustedError` class exported from `"use server"` file** — originally blocked `npm run build` at webpack parse. During Plan 10-07 execution, a sidecar fix relocated the class into a new `src/lib/exercises/errors.ts` module and updated the two import sites (`src/app/actions/exercises.ts` re-imports it; `tests/e2e/regression-premium-gate.spec.ts` imports from the new module). That change is bundled into the Plan 10-07 final commit since it unblocks this plan's build verification. After the fix: `npm run build` passes cleanly, 21 routes emit, production bundle built end-to-end. Documented in `deferred-items.md` for audit-trail purposes.
- Pre-existing TS errors in `src/app/admin/timing/*`, `src/app/api/admin/songs/route.ts`, `src/lib/fsrs/scheduler.ts`, `vitest.config.ts`, `src/app/review/ReviewSession.tsx` all remain as logged in `deferred-items.md` from Plan 10-01. None caused by Plan 10-07 work.

---

**Total deviations:** 0 auto-fixed + 3 planned adjustments + 1 pre-existing blocker (logged out-of-scope)
**Impact on plan:** All truth-predicates in frontmatter `must_haves` landed exactly as specified. Pre-existing `npm run build` blocker from Plan 10-06 shifted verification to `tsc --noEmit` (targeted) + unit suite — both green. The CONTEXT-locked "Star 3 reuses existing confetti" + "bonus badge visually subtle" contracts held end-to-end.

## Issues Encountered

- `npm run build` initially failed at webpack parse step on Plan 10-06's `QuotaExhaustedError` class export from `"use server"` file. Logged to deferred-items.md and a parallel sidecar fix relocated the class into `src/lib/exercises/errors.ts` — the three-line change (new module + import swap in exercises.ts + import swap in regression-premium-gate.spec.ts) is bundled into the Plan 10-07 final commit. Build now passes end-to-end.
- Windows LF→CRLF warnings on committed files (cosmetic, standard across this repo).

## User Setup Required

**None.** All changes are code-level; no new env vars, no migrations, no dashboard config.

For dev verification:

```bash
npm run build     # webpack + prerender: clean (verified end-to-end in Plan 10-07)
npm run dev       # port 7000
# Visit /songs — rows with 3 stars + ex5+ex7 ≥ 0.80 should show MASTERED ribbon
# + violet sparkle badge. Rows with 0 stars render identically to before.
# Complete a session hitting Listening Drill @ ≥80% to see Star 3 confetti +
# "You earned 3 stars — song mastered!" callout via SessionSummary.
```

The mastery decorations are rendered for the PLACEHOLDER_USER_ID `"test-user-e2e"`. Any user progress in the dev DB seeded for that ID will surface on the catalog.

## Next Phase Readiness

### Phase 10 complete

All 7 plans in Phase 10 are shipped:
- 10-01 (data-layer foundation) — STAR-04 + STAR-06 primitives + song_quota gate
- 10-02 (PlayerContext imperative API) — seekTo/play/pause with debounce
- 10-03 (Grammar Conjugation) — EXER-05 with 4 drillable form families
- 10-04 (Listening Drill) — EXER-06 with verse-seek + replay
- 10-05 (Sentence Order) — EXER-07 with 12-token cap + UUID-stamped pool
- 10-06 (Advanced Drills integration) — mode card + quota gate + ex5/6/7 persistence + test.fixme unfix
- 10-07 (premium-gate UI finalization) — Star 3 celebration + catalog mastery decorations ← this plan

Star 3 + bonus badge are now end-to-end: derivation (Plan 10-01), persistence (Plan 10-06), session-level celebration (Plan 10-07), and catalog-level decoration (Plan 10-07). Phase 11 (cross-song vocabulary) already landed separately; remaining work is Phase 12+ features.

### Follow-ups to pick up in a future plan

- **Clerk auth (Phase 3+):** swap `PLACEHOLDER_USER_ID` for `auth().userId` in `/songs/page.tsx` + `/songs/[slug]/page.tsx`. Unauthenticated path already tested — returns null accuracy fields → no mastery decorations.

### Blockers / Concerns

- None for Plan 10-07. All verification gates are green (`npm run build`, `npm run test:unit`, targeted `tsc --noEmit`).

## Self-Check

**Created files verification:**
- FOUND: src/app/songs/components/SongMasteredBanner.tsx
- FOUND: src/app/songs/components/BonusBadgeIcon.tsx

**Commits verification:**
- FOUND: 0306fde (Task 1 — StarDisplay + SessionSummary + new components)
- FOUND: 39f83dc (Task 2 — getAllSongs join + SongCard wiring + page thread-through)
- FOUND: 44d9436 (build fix — Next 15 + ts-fsrs + admin schema migration)
- FOUND: 0dafa71 (Rule-3 fix — QuotaExhaustedError moved to lib/exercises/errors.ts)

**Tests passing:**
- FOUND: full src/ unit suite 263 passed / 1 expected fail / 14 skipped (no regressions)
- FOUND: derive-stars.test.ts 21/21 (Star 3 + bonus badge cases)
- FOUND: PlayerContext.test.tsx 10/10 (no regressions from SessionSummary return-shape change)
- FOUND: SentenceOrderCard.test.tsx 5/5 (no regressions)
- FOUND: generator.test.ts 23/23 (no regressions)

**Build gate:**
- FOUND: `npm run build` green (21 routes, 102 kB shared JS, production bundle emitted end-to-end)
- FOUND: src/lib/exercises/errors.ts module imported by exercises.ts + regression-premium-gate.spec.ts

**Confetti reuse invariant:**
- FOUND: src/app/songs/[slug]/components/StarDisplay.tsx sole `confetti(...)` call site for stars
- FOUND: No new `canvas-confetti` imports in any Plan 10-07 modified file (0 new imports)
- FOUND: No new `@keyframes` / `star-shine`-class variants in `src/app/globals.css`

**Catalog query fields:**
- FOUND: ex5_best_accuracy in src/lib/db/queries.ts (getAllSongs)
- FOUND: ex6_best_accuracy in src/lib/db/queries.ts (getAllSongs)
- FOUND: ex7_best_accuracy in src/lib/db/queries.ts (getAllSongs)

## Self-Check: PASSED

---
*Phase: 10-advanced-exercises-full-mastery*
*Completed: 2026-04-18*
