# Phase 13: Performance Infrastructure — Context

**Gathered:** 2026-04-28 (rewritten from 2026-04-23 scaffold after SPEC.md locked requirements)
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship the design-independent performance infrastructure for `/songs/[slug]` — a cross-request lesson cache, deferred YouTube iframe mount, and a CI-enforced bundle budget — so Phase 14 UX polish lands on a measured, regression-proof baseline. Lighthouse / LCP / TTI scoring is explicitly NOT in scope (deferred to the Phase 19 entry gate). This phase delivers the *infrastructure that constrains* future polish, not the polish itself.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**3 requirements are locked.** See [`13-SPEC.md`](./13-SPEC.md) for full requirements, boundaries, and acceptance criteria.

Downstream agents (researcher / planner / executor) MUST read `13-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- Cross-request lesson cache for `/songs/[slug]` (server-side, scoped to lesson body — songs + versions + vocab enrichment)
- Cache invalidation hook on lesson-edit path
- Decoupling per-user `KnownWordCount` from the cached SSR path
- Lazy-mount of `<YouTubeEmbed>` iframe gated on viewport visibility
- CI workflow step that measures and gates `/songs/[slug]` bundle size at 50 KB gzipped
- Bundle baseline documentation
- One-off local Lighthouse run against home/catalog/song to capture Phase 19 entry-gate baseline (informational only — NOT a Phase 13 exit criterion)

**Out of scope (from SPEC.md):**
- Lighthouse mobile ≥85 on home/catalog/song — moved to Phase 19 entry gate
- Song page LCP <2.5s, TTI <3.5s on Moto G4 4G — Phase 19 entry gate
- Visual performance polish — Phase 14 UX Polish
- Caching `/songs`, `/`, `/anime-list`, `/path`, `/vocabulary`, `/review`, `/api/*`
- Pipeline / WhisperX / LLM throughput
- DB query optimization in isolation (e.g., collapsing `getSongBySlug`'s serial queries)
- Facade-style click-to-play YouTube replacement
- Per-route bundle budgets for `/`, `/songs`, `/path`, `/vocabulary`, `/review`, `/kana`
- Neon HTTP retry-wrapper tuning

</spec_lock>

<decisions>
## Implementation Decisions

### Cache Mechanism (Requirement 1)

- **D-01 — Cache shape: route-level static + `revalidateTag`.** Remove `export const dynamic = "force-dynamic"` from `src/app/songs/[slug]/page.tsx`; the route becomes statically generatable (no explicit `dynamic = "force-static"` needed once the per-user dependency is removed). Eliminates *both* DB queries on cache hit *and* the cold-SSR cost. Chose Option A from RESEARCH.md §3.1 over `unstable_cache` wrapping (Option B) because B preserves cold-SSR work for no proportional gain.

- **D-02 — Invalidation strategy: tag-only on lesson edit, no TTL safety net.** Every code path that mutates lesson data MUST call `revalidateTag('song:${slug}')`. Concretely: the seed/import scripts, the WhisperX timing rewriter (`scripts/snap-full-onsets.ts` and siblings), and any in-app admin lesson-edit surface that exists at implementation time. No fallback `export const revalidate = N` — cleanest semantics, the cache is correct iff every writer revalidates. Risk acknowledged: a future writer that forgets to revalidate causes stale lessons until manual purge; mitigation is to centralise the lesson-write surface so revalidate is unmissable (see D-04).

- **D-03 — Per-user data decoupling: `<KnownWordCount>` becomes a client component.** Today `<KnownWordCount>` receives `initial={initialKnown}` from SSR via `Promise.all` in `page.tsx:44-59`. Flip it to client-fetch via the existing `/api/review/known-count` route on mount (RESEARCH.md §2 confirmed the route already exists). Render a small skeleton during the in-flight fetch. The page no longer takes `userId` to compute the lesson body, which is what makes it cacheable.

- **D-04 — Cache acceptance test: integration test with instrumented Neon client.** Add a test-only query-counter shim around the Neon HTTP client (counts SELECT calls per request, gated on `NODE_ENV === 'test'`). New test at `tests/integration/song-page-cache.test.ts`: render `/songs/[slug]` twice for the same slug, assert second render's counter for `songs` + `song_versions` + `vocabulary_items` is 0; call `revalidateTag('song:${slug}')`, assert third render's counter is non-zero. Lives in `npm run test:integration` per the test-verify rule.

### Iframe Defer Mechanism (Requirement 2)

- **D-05 — Defer mechanism: IntersectionObserver lazy-mount.** `<YouTubeEmbed>` renders a placeholder on initial paint; an IntersectionObserver on the player container triggers iframe mount on viewport entry (per RESEARCH.md §3.2 Option A). Facade pattern (poster + click-to-play) is deliberately *not* chosen here — see Deferred Ideas. The Phase 10 `PlayerContext` API (`seekTo`, `play`, `pause`, `isReady`, `embedState`) remains intact: callers that hit the API before the iframe has mounted continue to see `embedState === 'loading'` per existing semantics.

- **D-06 — Placeholder appearance: plain skeleton box, same dimensions.** `aspect-video bg-zinc-800 animate-pulse` (or the project's equivalent skeleton primitive). Zero extra network requests, zero CLS — the box matches the iframe's exact final dimensions from first paint. Phase 14 polish can swap the visual without touching defer logic.

- **D-07 — IntersectionObserver `rootMargin`: `'200px'`.** Iframe mounts when the container is within 200px of viewport — typically before the user reaches the bottom of the lesson header on scroll. Smooth UX (no scroll → wait → play stutter), still gives real defer past first paint. Reject `'0px'` (visible loading delay) and `'50%'` (preloads almost immediately, defeats the goal on desktop).

- **D-08 — Practice tab interaction: force-mount on Practice open.** When the user opens the Practice tab (lazy-loaded `<ExerciseTab>`), force-mount the iframe regardless of viewport position. Drills always work without spec changes. Implementation surface is the planner's call but the natural shape is a `forceMount` flag on `PlayerProvider` (or imperative call on the player API surface) that bypasses the IO gate. Reset on `PlayerProvider key={activeType}` remount per existing semantics (free with `useState(false)`). Listening Drill E2E (`advanced-drill-quota.spec.ts` + Phase 10 spec) must remain green.

### Bundle Tooling & CI (Requirement 3)

- **D-09 — Tool: `size-limit` for enforcement, `@next/bundle-analyzer` for investigation.** Add `size-limit` + `@size-limit/preset-app` as devDependencies. `.size-limit.cjs` config tracks `/songs/[slug]` First Load JS at 50 KB gzipped (the SPEC-locked budget; ~25% headroom over today's ~40 KB baseline). `@next/bundle-analyzer` wired behind `ANALYZE=true npm run build` for human investigation when budgets fail — NOT in CI by default. Reject hand-rolled `.next/build-manifest.json` parser (brittle to Next.js minor version manifest changes) and `bundlewatch` (less actively maintained).

- **D-10 — Measurement target: size-limit's app preset with content-hash glob patterns.** Use `@size-limit/preset-app` with paths matching `.next/static/chunks/app/songs/[slug]/page-*.js` + `main-*.js` + `framework-*.js` + `webpack-*.js` + `[id]-*.js` (the chunks Next loads on first paint of `/songs/[slug]`). Glob patterns survive Next's content-hashed filenames. Exact path set derived once from a fresh `next build` output; recorded in `.size-limit.cjs` with a comment pointing at the build output that established it.

- **D-11 — PR feedback: `andresz1/size-limit-action@v1`.** Posts a sticky PR comment with measured size + delta vs base branch on every push (e.g., `+2.3 KB ⚠️` or `-1.1 KB ✅`). Status check is the actual gate (hard-fail per SPEC). Satisfies SPEC AC: PR comment + status check are both visible per PR.

- **D-12 — Budget scope: strict `/songs/[slug]` only.** Honor SPEC boundary verbatim. `/`, `/songs`, `/path`, `/vocabulary`, `/review`, `/kana` get NO bundle budgets in this phase. Phase 19 entry gate adds budgets for the gate routes (`/`, `/songs`) when the gate runs. Keeps blast radius small before Phase 14.

- **D-13 — CI integration: extend existing `pr-checks` job in `.github/workflows/qa-suite.yml`.** Add `npm run build` + `npm run size` steps after lint/typecheck. Reuses the existing checkout + npm cache. `nightly-full` inherits the check via job-list reuse. One workflow file change. `paths:` filtering NOT applied — bundle check always runs (status check stays consistent across PRs).

### Lighthouse Baseline (informational, AC #11)

- **D-14 — Baseline routes: home + catalog + song page.** Run Lighthouse against `/`, `/songs`, `/songs/[slug]` — the three routes the Phase 19 entry gate will eventually score. Captures the full pre-Phase-14 baseline for all gate routes in one pass. Baseline is informational only — NOT a Phase 13 exit criterion.

- **D-15 — Profile: mobile + desktop, against `localhost:7000` production build.** Run `lighthouse <url> --preset=mobile` AND `--preset=desktop` against `npm run build && npm run start` (production build, not dev). Mobile is the Phase 19 gate target (≥85 perf, LCP <2.5s, TTI <3.5s on Moto G4 4G profile). Desktop captures relative ceiling. Local matches what Phase 19 will run — deploying first introduces network/region/cold-start variability into a baseline that's meant to be reproducible.

- **D-16 — Storage: `13-SUMMARY.md` baseline table + raw JSON in artifact dir.** Phase 13 SUMMARY.md gets a "Performance baseline" section with a table (Route × Mobile Perf / Mobile LCP / Mobile TTI / Desktop Perf) per SPEC AC #11. Raw `lighthouse --output=json` results dumped to `.planning/phases/13-performance-infrastructure/lighthouse-baseline/{home,catalog,song}-{mobile,desktop}.json`. Phase 19 entry gate can diff audit-level details against the JSON.

- **D-17 — Song target slug: median-bundle representative.** A small npm script (`npm run lighthouse:pick-target` or similar) picks the song closest to the catalog median by lesson JSON byte size; the chosen slug is recorded in SUMMARY.md so Phase 19 can re-run against the same target. Reject "heaviest song" (pessimistic, most users never hit it) and "hardcoded slug" (drifts as content evolves).

### Carried Forward From Earlier Phases / SPEC

- **D-18 — Test-verify every change (locked 2026-04-24, re-affirmed in SPEC).** Every code change in Phase 13 must be verified with the appropriate test layer before it is reported done. `npm run build` passing alone is INSUFFICIENT.
  - DB / server-action / cache changes → `npm run test:integration` (hits Neon via `TEST_DATABASE_URL`)
  - Client component changes affecting song page / exercises / player → `npm run test:e2e` (Playwright)
  - Pure-logic / pure-function changes → `npm run test:unit`
  - Cross-layer changes → run all relevant layers.

- **D-19 — Phase 10 `PlayerContext` API is preserved.** `seekTo`, `play`, `pause`, `isReady`, `embedState` remain functional after iframe defer. Listening Drill (EXER-06) E2E coverage (`advanced-drill-quota.spec.ts` + Phase 10 listening drill spec) must remain green.

- **D-20 — Test-only instrumentation gating preserved.** `window.__kbPlayer` and similar test hooks remain gated on `NEXT_PUBLIC_APP_ENV === 'test'`. Iframe defer must not leak test-only state into the prod bundle (which would also blow the 50 KB budget).

- **D-21 — Phase 12 HUD is part of the baseline, not a regression.** The 50 KB budget is calibrated against the post-Phase-12 First Load JS captured 2026-04-24 (~40 KB gzipped on `/songs/[slug]`).

- **D-22 — Sequencing: Phase 13 ships before Phase 14.** The CI bundle budget is a *pre-condition* for Phase 14 polish discipline, not a post-hoc audit. Phase 14 plans must not start until D-09–D-13 are merged.

- **D-23 — CI failure mode: hard fail.** No warn-only mode, no escape hatch. The budget is raised in a PR if a regression is intentional.

### Claude's Discretion

- The exact React / Next.js shape of "force-mount when Practice tab opens" (D-08) — could be a context flag dispatched from `<ExerciseTab>`'s effect, an imperative call on `PlayerContext`, or a state lift on `<PlayerProvider>`. Planner picks.
- Skeleton primitive choice (D-06) — whether to add a new `<Skeleton>` UI primitive or inline `aspect-video bg-zinc-800 animate-pulse` directly. Planner picks.
- The exact RPC for triggering `revalidateTag` from the seed scripts (D-02) — direct call vs server-action wrapper vs API route. Planner picks based on what's already in the seed-script call chain.
- The pick-median-song script implementation (D-17) — JS script vs SQL query vs hardcoded after a one-time inspection. Planner picks.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 13 artifacts
- [`.planning/phases/13-performance-infrastructure/13-SPEC.md`](./13-SPEC.md) — Locked requirements (3), boundaries, acceptance criteria. **Read first.**
- [`.planning/phases/13-performance-infrastructure/13-RESEARCH.md`](./13-RESEARCH.md) — Baseline state, option-space analysis per requirement, bundle baseline appendix (2026-04-24). Confirms `/api/review/known-count` exists and `<KnownWordCount>` already takes `initial` prop.

### Cache surface
- `src/app/songs/[slug]/page.tsx` — Currently `force-dynamic`; the route this phase converts to static-with-revalidateTag.
- `src/app/songs/[slug]/components/SongContent.tsx` — Hosts `<KnownWordCount>` (line ~104 per RESEARCH.md), `<PlayerProvider key={activeType}>` (line ~80), and the lazy `<ExerciseTab>` (line ~16).
- `src/lib/db/queries.ts` §`getSongBySlug` (line ~25) — React `cache()`-wrapped today; cross-request cache lands at the route layer above this, not on the function itself.
- `src/lib/db/index.ts` §39 — Neon HTTP retry wrapper; D-04's instrumented-client shim wraps this.
- `src/app/api/review/known-count/route.ts` — Existing endpoint that `<KnownWordCount>` will client-fetch from after D-03.

### Iframe defer surface
- `src/app/songs/[slug]/components/YouTubeEmbed.tsx` — Embed component; defer logic lands here. Test-only `window.__kbPlayer` hook at line ~210 gated on `NEXT_PUBLIC_APP_ENV === 'test'` — must remain gated.
- `src/app/songs/[slug]/components/StarDisplay.tsx` line ~36, `src/app/components/LevelUpTakeover.tsx` line ~39, `src/app/kana/components/RowUnlockModal.tsx` line ~14 — Reference patterns for `dynamic-import` of heavy assets (canvas-confetti pattern; informs how to dynamic-import IO observer if useful).

### Bundle / CI surface
- `next.config.ts` — Currently empty; `@next/bundle-analyzer` wires here.
- `.github/workflows/qa-suite.yml` — `pr-checks` and `nightly-full` jobs. D-13 extends `pr-checks`.
- `package.json` — devDependencies and scripts. Adding `size-limit`, `@size-limit/preset-app`, `@next/bundle-analyzer` here. New scripts: `size`, `analyze`, `lighthouse:baseline`.

### Listening Drill / PlayerContext invariants
- `src/app/songs/[slug]/components/ListeningDrillCard.tsx` — Calls `usePlayer().seekTo/play/isReady/embedState`. Defer change must not break this.
- `tests/e2e/advanced-drill-quota.spec.ts` — Listening Drill E2E. Must stay green.
- Phase 10 listening-drill spec — Same constraint.

### Project / milestone context
- [`.planning/PROJECT.md`](../../PROJECT.md) — KitsuBeat product context, milestone v2.0 frame.
- [`.planning/REQUIREMENTS.md`](../../REQUIREMENTS.md) — `EXER-06` (Listening Drill) is the requirement that pins the PlayerContext-preservation constraint.
- [`.planning/ROADMAP.md`](../../ROADMAP.md) §Phase 13, §Phase 19 entry gate — Phase boundaries; Phase 19 explicitly inherits the deferred Lighthouse measurement.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **React `cache()` wrapper on `getSongBySlug`** (`queries.ts:25`) — Provides request-level dedupe; cross-request cache layers above this, not replaces it.
- **`/api/review/known-count` route** — Already exists; `<KnownWordCount>` switching to client-fetch is a one-file change.
- **`<KnownWordCount>` accepts `initial` prop** — Was designed for SSR-seed; flipping to client-fetch is straightforward.
- **`<ExerciseTab>` is `lazy()` + `<Suspense>`** (`SongContent.tsx:16`) — Already code-split. Force-mount-on-Practice (D-08) hooks into the lazy-load surface.
- **`canvas-confetti` dynamic-import pattern** (3 call sites in research) — Reference shape for keeping heavy deps out of First Load JS; not directly reused but the pattern is the same one Phase 14 polish must continue to follow.
- **`PlayerProvider key={activeType}`** (`SongContent.tsx:80`) — Forces remount on version toggle. Defer state resets on remount for free via `useState(false)`.

### Established Patterns

- **`force-dynamic` everywhere by default** — 13 routes declare it; D-01 removes it from `/songs/[slug]` only. Other routes are out of scope per SPEC.
- **Test-only state gated on `NEXT_PUBLIC_APP_ENV === 'test'`** (`YouTubeEmbed.tsx:210`) — Defer code must use this same pattern if any test-only hooks are needed.
- **Three-layer test discipline** — `npm run test:unit`, `test:integration`, `test:e2e`. D-04 lives in integration; defer changes need e2e; bundle config changes need a build-passing check (CI itself is the test).

### Integration Points

- **Cache invalidation hooks (D-02)**: lesson-write code paths to instrument — likely `scripts/seed/*` and `scripts/snap-full-onsets.ts` family. Researcher confirms exact site list.
- **Iframe defer (D-05–D-08)**: `YouTubeEmbed.tsx` JSX wrap + `PlayerProvider` flag wiring + `ExerciseTab` mount-trigger.
- **Bundle CI (D-09–D-13)**: `package.json` (deps + scripts), new `.size-limit.cjs`, `next.config.ts` analyzer wrap, `.github/workflows/qa-suite.yml` job extension.
- **Lighthouse baseline (D-14–D-17)**: new `scripts/lighthouse-baseline.ts` (or similar), Phase 13 SUMMARY.md authoring at phase-end.

### Bundle baseline (2026-04-24, RESEARCH.md Appendix A)

Route-level First Load JS from `next build`. Sizes are raw; gzipped ≈ 25–35% of raw.

| Route | Route-specific | First Load JS | Gzipped (est.) |
|---|---:|---:|---:|
| `/` | 174 B | 111 KB | ~38 KB |
| `/songs` | 128 B | 130 KB | ~46 KB |
| `/songs/[slug]` | 9.59 KB | 116 KB | ~40 KB |
| Shared chunks | — | 102 KB | ~36 KB |

Song page is well under the 200 KB ROADMAP target — that's why SPEC tightened to 50 KB. Shared chunks dominate; route-specific song-page code is only 9.59 KB.

</code_context>

<specifics>
## Specific Ideas

- The "instrumented Neon client" for D-04 is a single shim around `src/lib/db/index.ts:39` (the existing `neon()` HTTP wrapper); it doesn't need to be a full mock — just a counter that ticks per SQL fragment matching `songs|song_versions|vocabulary_items`.
- The Lighthouse target song picker (D-17) should write the chosen slug to `lighthouse-baseline/target-song.txt` (or similar) so the baseline is fully reproducible even if the catalog median shifts later.
- The size-limit-action setup (D-11) needs `permissions: { pull-requests: write }` on the workflow job for the PR comment to land. Researcher / planner: surface this in the workflow YAML.

</specifics>

<deferred>
## Deferred Ideas

- **Facade-style click-to-play YouTube replacement** — The bigger perf lever (iframe + YT API JS never loads until user engages). NOT chosen for Phase 13 because it changes UX (currently autoplay-on-mount when YT cooperates). Revisit in Phase 14 if the IO defer from D-05 doesn't move LCP enough at the Phase 19 entry gate. Per SPEC out-of-scope list.
- **`force-dynamic` audit on routes that don't need it** (`/anime-list`, `/admin/timing/*`, `/api/client-errors`) — Pure upside but not a Phase 13 critical path. Logged for Phase 20 code-quality pass per RESEARCH.md §4.
- **`getAllSongs` correlated-subquery audit** — 8+ correlated subqueries in `queries.ts:79-166`. Caching the catalog is out of scope for Phase 13; if a future phase disables catalog caching this matters. Logged for Phase 20.
- **`getSongBySlug` two-query collapse** — Songs + versions could be one join. Caching the route makes it a one-time cost anyway. Logged for Phase 20 per SPEC.
- **Neon HTTP retry-wrapper tuning** (`db/index.ts:39`, up to 750ms on cold starts) — Caching reduces hot-path exposure. Logged for Phase 16 IR runbook.
- **Per-route bundle budgets for `/`, `/songs`, `/path`, `/vocabulary`, `/review`, `/kana`** — Only `/songs/[slug]` is named in SPEC success criteria. Phase 19 entry gate adds budgets for `/` and `/songs` when the gate runs.
- **OG image `metadataBase` fix** (build-time warning, RESEARCH.md) — Logged for Phase 18 (legal/SEO surface).
- **Lighthouse mobile ≥85 / LCP <2.5s / TTI <3.5s on Moto G4 4G** — Phase 19 entry gate, NOT Phase 13.

</deferred>

---

*Phase: 13-performance-infrastructure*
*Context gathered: 2026-04-28 (rewrite)*
*Next step: `/gsd-plan-phase 13` (after `/clear`)*
