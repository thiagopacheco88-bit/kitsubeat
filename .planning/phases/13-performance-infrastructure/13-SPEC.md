# Phase 13: Performance Infrastructure — Specification

**Created:** 2026-04-28
**Ambiguity score:** 0.084 (gate: ≤ 0.20)
**Requirements:** 3 locked

## Goal

Ship the design-independent performance infrastructure for the song page — a cross-request lesson cache, deferred YouTube iframe mount, and a CI-enforced bundle budget — so Phase 14 UX polish lands on a measured, regression-proof baseline. Lighthouse / LCP / TTI scoring is explicitly NOT in scope (deferred to Phase 19 entry gate).

## Background

The song page is the most expensive route in the app and runs cold on every visit:

- **No cross-request caching:** 13 routes (including `/songs/[slug]`) declare `export const dynamic = "force-dynamic"`. `next.config.ts` is empty. `getSongBySlug` is wrapped in React `cache()` (request-level dedupe only — provides no cross-request reuse). Per song-page request: 3 serial Neon query groups (`songs+song_versions`, `vocabulary_items` enrichment, per-user `getKnownWordCountForSong`).
- **No bundle tooling:** No `@next/bundle-analyzer`, `size-limit`, or `bundlewatch` in devDependencies. CI (`.github/workflows/qa-suite.yml`) does not run `next build` or measure bundle size. Phase 12's HUD additions and Phase 14 polish can silently inflate first-load JS without anyone noticing.
- **YouTube iframe loads on first paint:** `<YouTubeEmbed>` mounts unconditionally; iframe + YT API JS pull in synchronously regardless of whether the user scrolls to the player or even opens Practice.

Bundle baseline captured 2026-04-24 via `next build`: `/songs/[slug]` is **116 KB First Load JS (~40 KB gzipped)**. Shared chunks dominate (102 KB shared across all routes; route-specific song-page code is only 9.59 KB). The ROADMAP-locked 200 KB gzipped target is ~5× current state — defensive but toothless against regressions.

Phase 12 (XP/streak/level + `/path` route) completed 2026-04-19. Phase 10 introduced an imperative PlayerContext API (`seekTo`, `play`, `pause`, `isReady`); the iframe-defer requirement must preserve this API surface for Listening Drill (EXER-06).

## Requirements

1. **Cross-request lesson cache on `/songs/[slug]`**: Lesson body (songs + song_versions + vocabulary enrichment) serves from cache on repeat visits to the same slug, with explicit invalidation on lesson edits.
   - Current: Every `/songs/[slug]` request fires the full song+versions+vocab query chain against Neon (three serial query groups), driven by `force-dynamic` on the route. React `cache()` only dedupes within a single request.
   - Target: First request to a slug populates a cross-request cache for the lesson body. The second-and-subsequent request to the same slug returns from cache, hitting Neon zero times for the lesson body. Per-user data (`getKnownWordCountForSong`) is split off the cached path so the route remains correct for authenticated users. Lesson-content edits invalidate the cache.
   - Acceptance: A test that issues two sequential requests to the same `/songs/[slug]` slug observes 0 Neon queries for `songs`, `song_versions`, and `vocabulary_items` on the second request (verified via DB query log or instrumented client). After triggering the lesson-edit invalidation path, the next request observes a cache miss (Neon queries fire again).

2. **Deferred YouTube iframe mount**: The YouTube `<iframe>` does NOT exist in the DOM on initial paint of `/songs/[slug]` — it mounts only after the player container enters the viewport.
   - Current: `<YouTubeEmbed>` renders the `<iframe>` (and triggers YT API JS load) unconditionally on song-page mount. PlayerProvider sits above it with `key={activeType}`.
   - Target: `<YouTubeEmbed>` renders a placeholder/skeleton on initial paint. The `<iframe>` mounts only when the container scrolls into viewport. The Phase 10 PlayerContext API (`seekTo`, `play`, `pause`, `isReady`, `embedState`) remains intact — drill code that calls `play()` before the iframe has mounted continues to behave per existing `embedState === 'loading'` / `'error'` semantics. Listening Drill (EXER-06) end-to-end flow remains green.
   - Acceptance: Playwright test loads `/songs/[slug]` and asserts `iframe[src*="youtube"]` count is 0 on initial DOM. After scrolling the player container into viewport, the same selector returns 1 within a bounded wait. Existing Listening Drill E2E spec (`advanced-drill-quota.spec.ts` + Phase 10 listening drill flow) continues to pass without modification beyond defer-aware waits.

3. **CI-enforced bundle budget on `/songs/[slug]`**: A bundle-size check runs in CI after `next build` and hard-fails the PR if `/songs/[slug]` First Load JS exceeds 50 KB gzipped.
   - Current: No bundle tooling. CI never runs `next build`. Bundle size is ungoverned — silent regressions accumulate from Phase 12, 14, and beyond.
   - Target: A bundle-size measurement step exists in the CI workflow. It runs `next build` (or reuses an existing build artifact), measures gzipped First Load JS for `/songs/[slug]`, and exits non-zero if the value > 50 KB. The check runs on every PR; a PR-visible artifact (PR comment, status check, or job log) reports the measured size and the delta vs. base.
   - Acceptance: A test PR that intentionally inflates `/songs/[slug]` past 50 KB gzipped (e.g., import a heavy library into `SongContent`) fails CI with a clear "bundle size exceeded" error. A baseline-state PR (no bundle change) passes. The measured size is visible in the CI run output for every PR.

## Boundaries

**In scope:**
- Cross-request lesson cache for `/songs/[slug]` (server-side, scoped to the lesson body — songs + versions + vocab enrichment)
- Cache invalidation hook on lesson-edit path (whatever surface mutates lesson JSONB)
- Decoupling per-user `KnownWordCount` from the cached SSR path (whether by client-fetch, separate Server Component, or equivalent — the requirement is that per-user data does not poison the cache)
- Lazy-mount of `<YouTubeEmbed>` iframe gated on viewport visibility
- CI workflow step that measures and gates `/songs/[slug]` bundle size at 50 KB gzipped
- Bundle baseline documentation (so Phase 14 starts from a known number)
- One-off local Lighthouse run against home/catalog/song to capture a Phase 19 entry-gate baseline (informational only — NOT a Phase 13 exit criterion)

**Out of scope:**
- Lighthouse mobile ≥85 on home/catalog/song — moved to Phase 19 entry gate; measurement against pages about to be redesigned in Phase 14 would be wasted work
- Song page LCP <2.5s, TTI <3.5s on Moto G4 4G — same reasoning; Phase 19 entry gate
- Visual performance (animations, transitions, microinteraction polish) — Phase 14 UX Polish owns this
- Caching `/songs` (catalog), `/`, `/anime-list`, `/path`, `/vocabulary`, `/review`, `/api/*` — single-route scope keeps blast radius small before Phase 14; broader `force-dynamic` audit logged for Phase 20
- Pipeline / WhisperX / LLM throughput — batch/backend concern, not user-facing perf
- DB query optimization in isolation (e.g. collapsing `getSongBySlug`'s two serial queries into a join, rewriting `getAllSongs`'s correlated subqueries) — caching the route makes them rare-path; logged for Phase 20
- Facade-style "click-to-play" YouTube replacement — UX change, not a perf-infra change; revisit in Phase 14 if defer alone doesn't move LCP enough at the Phase 19 gate
- Per-route bundle budgets for `/`, `/songs`, `/path`, `/vocabulary`, `/review`, `/kana` — only `/songs/[slug]` is named in the success criteria; broader budget table can be added later when those routes become critical paths
- Neon HTTP retry-wrapper tuning — caching reduces hot-path exposure; logged for Phase 16 IR runbook

## Constraints

- **Test-verify locked (CONTEXT.md decision 2026-04-24):** every code change in this phase MUST be verified with the appropriate test layer before being reported done. `npm run build` passing alone is insufficient. DB / server-action / cache changes → `npm run test:integration`. Client component changes affecting song page / exercises / player → `npm run test:e2e`. Pure-logic changes → `npm run test:unit`. Cross-layer changes run all relevant layers.
- **Phase 10 PlayerContext API is preserved**: `seekTo`, `play`, `pause`, `isReady`, `embedState` remain functional after iframe defer. Listening Drill (EXER-06) E2E coverage from `advanced-drill-quota.spec.ts` and Phase 10 specs must remain green.
- **Phase 12's HUD additions are part of the baseline, not a regression**: bundle budget is calibrated against the post-Phase-12 First Load JS, not pre-12.
- **Sequencing: Phase 13 ships before Phase 14**. The CI bundle budget is a pre-condition for Phase 14 polish discipline, not a post-hoc audit.
- **Test-only instrumentation gating preserved**: `window.__kbPlayer` and similar test hooks remain gated on `NEXT_PUBLIC_APP_ENV === 'test'`; iframe defer must not leak test-only state into prod bundles.
- **Bundle budget calibration**: 50 KB gzipped is ~25% headroom over today's ~40 KB First Load JS — tight enough to fail on regressions, loose enough that disciplined Phase 14 polish lands without bypass.
- **CI failure mode: hard fail.** No warn-only mode, no escape hatch — the budget is raised in a PR if a regression is intentional.

## Acceptance Criteria

- [ ] Two sequential requests to the same `/songs/[slug]` slug: second request fires 0 Neon queries for `songs`, `song_versions`, and `vocabulary_items` (verified via DB query log or instrumented client)
- [ ] Triggering the lesson-edit invalidation path causes the next `/songs/[slug]` request to fire fresh Neon queries (cache miss), proving the cache returns to consistent reads after lesson updates
- [ ] Per-user `KnownWordCount` continues to render the correct user-specific number across cache hits (no per-user data poisoning the shared cache)
- [ ] On initial `/songs/[slug]` DOM, `iframe[src*="youtube"]` count is 0 (Playwright assertion)
- [ ] After scrolling the player container into viewport, `iframe[src*="youtube"]` count is 1 within a bounded wait (Playwright assertion)
- [ ] Existing Listening Drill E2E flow (`advanced-drill-quota.spec.ts` + Phase 10 listening drill spec) passes after iframe-defer change
- [ ] CI runs bundle-size measurement after `next build` on every PR
- [ ] CI status check exits non-zero (hard fail) when `/songs/[slug]` First Load JS > 50 KB gzipped
- [ ] CI run output (or PR comment / status surface) reports the measured `/songs/[slug]` size and delta vs base
- [ ] A test PR that imports a heavy library into `SongContent` is rejected by CI; a no-op PR passes
- [ ] Phase 13 SUMMARY.md records the local Lighthouse baseline (informational, for Phase 19 entry gate)

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                                              |
|--------------------|-------|------|--------|--------------------------------------------------------------------|
| Goal Clarity       | 0.95  | 0.75 | ✓      | Three success criteria with hard numbers (50 KB, 0 queries, 0 iframes) |
| Boundary Clarity   | 0.92  | 0.70 | ✓      | Explicit out-of-scope list with reasoning per item                 |
| Constraint Clarity | 0.85  | 0.65 | ✓      | Test-verify rule, sequencing, PlayerContext preservation locked    |
| Acceptance Criteria| 0.92  | 0.70 | ✓      | 11 pass/fail checkboxes; falsifiable per requirement               |
| **Ambiguity**      | 0.084 | ≤0.20| ✓      | Mechanism choices intentionally deferred to discuss-phase          |

## Interview Log

| Round | Perspective                | Question summary                                              | Decision locked                                                                                            |
|-------|----------------------------|---------------------------------------------------------------|------------------------------------------------------------------------------------------------------------|
| 0     | (initial scoring)          | Read CONTEXT.md, RESEARCH.md, ROADMAP, REQUIREMENTS, STATE    | Phase 13 narrowed to 3 infra criteria; Lighthouse/LCP/TTI deferred to Phase 19; bundle baseline is ~40 KB |
| 1     | Researcher / Simplifier    | Bundle target — 200 KB ROADMAP, 100 KB, or 50 KB tight?       | 50 KB gzipped on `/songs/[slug]` (~25% headroom over today's ~40 KB)                                       |
| 1     | Researcher / Simplifier    | Cache scope — song page only, +catalog+home, or all routes?   | Song page only; broader audit deferred to Phase 20                                                         |
| 1     | Researcher / Simplifier    | Iframe defer — viewport, facade, or non-blocking?             | iframe absent on initial DOM, mounts after viewport entry (mechanism deferred to discuss-phase)            |
| 2     | Failure Analyst / Seed Closer | What signal proves "cache on repeat visit, no cold DB hit"? | Server log assertion: 2nd request runs 0 Neon queries for `songs` + `song_versions` + `vocabulary_items` |
| 2     | Failure Analyst / Seed Closer | CI failure mode for bundle budget breach?                  | Hard fail (no warn-only, no escape hatch); budget raised in a PR if regression is intentional             |

---

*Phase: 13-performance-infrastructure*
*Spec created: 2026-04-28*
*Next step: /gsd-discuss-phase 13 — implementation decisions (cache primitive, defer mechanism, bundle-size tool, CI workflow integration)*
