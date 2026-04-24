# Phase 13: Performance Infrastructure — Research

**Gathered:** 2026-04-23
**Status:** Draft — bundle-size baseline pending (build not yet re-runnable from this shell)

---

## 1. Baseline state

### 1.1 Caching — there is none

Every top-level route and relevant API handler is declared `export const dynamic = "force-dynamic"`. 13 files:

```
src/app/page.tsx                               (home)
src/app/songs/page.tsx                         (catalog)
src/app/songs/[slug]/page.tsx                  (song detail)
src/app/path/page.tsx
src/app/vocabulary/page.tsx
src/app/review/page.tsx
src/app/anime-list/page.tsx
src/app/admin/timing/page.tsx
src/app/admin/timing/[songId]/page.tsx
src/app/api/client-errors/route.ts
src/app/api/review/budget/route.ts
src/app/api/review/known-count/route.ts
src/app/api/review/queue/route.ts
```

Every page hit = cold SSR + full DB round-trip chain. The `/songs/[slug]` route alone fires **three serial Neon queries per request** (see §1.3).

**Next.js config is empty** — [next.config.ts](next.config.ts) declares `const nextConfig: NextConfig = {}`. No cache headers, no experimental flags, no image-optimization tuning, nothing.

### 1.2 Bundle tooling — there is none

- `package.json` devDependencies: **no** `@next/bundle-analyzer`, `size-limit`, `bundlewatch`, or equivalent.
- `.github/workflows/qa-suite.yml` defines `pr-checks` + `nightly-full` — neither runs `next build`, neither measures bundle size.
- First-load JS budget is ungoverned today; any Phase 12/14 addition silently increases it.

### 1.3 Good patterns already in the tree (build on these, don't reinvent)

- `getSongBySlug` is wrapped in React `cache()` ([queries.ts:25](src/lib/db/queries.ts#L25)) — request-level dedupe across `generateMetadata` + page body. This is **only** request-level; it provides no cross-request cache.
- `ExerciseTab` is lazy-loaded from `SongContent.tsx:16` (`lazy(() => import("./ExerciseTab"))`). All Phase 8/10 exercise code (~30 components) is code-split behind the Practice tab.
- `canvas-confetti` is dynamic-imported at every call site ([StarDisplay.tsx:36](src/app/songs/[slug]/components/StarDisplay.tsx#L36), [LevelUpTakeover.tsx:39](src/app/components/LevelUpTakeover.tsx#L39), [RowUnlockModal.tsx:14](src/app/kana/components/RowUnlockModal.tsx#L14)) — heavy animation lib stays out of first-load.
- Test-only `window.__kbPlayer` hook gated on `NEXT_PUBLIC_APP_ENV === 'test'` ([YouTubeEmbed.tsx:210](src/app/songs/[slug]/components/YouTubeEmbed.tsx#L210)) — doesn't leak to prod bundles.

---

## 2. Song-page load path (current)

Per request to `/songs/[slug]`:

| # | Query                                            | Cache-eligible? |
|---|---------------------------------------------------|------------------|
| 1 | `getSongBySlug` (2 round-trips: songs + versions) | Yes — per slug, invalidate on lesson edit |
| 2 | Batch `vocabulary_items` SELECT (enrichment)      | Yes — per (vocab_item_id) set |
| 3 | `getKnownWordCountForSong(userId, songId)`        | **No** — per-user, changes on every exercise answer |

(1) and (2) are the full lesson body; identical for every visitor. (3) is per-user mastery state.

The render **couples** these in a single server component: [songs/[slug]/page.tsx:44-59](src/app/songs/[slug]/page.tsx#L44-L59) Promise.all-s enrichment + known-count, passes both into `<SongContent>`.

**`<KnownWordCount>` already exists as a separate component** ([SongContent.tsx:104](src/app/songs/[slug]/components/SongContent.tsx#L104)) — it just receives `initial={initialKnown}` from SSR rather than fetching itself. Decoupling is a one-file change: flip it to client-fetch via the existing `/api/review/known-count` route.

---

## 3. Option space for each success criterion

### 3.1 Lesson cache on repeat visit

**Two viable shapes:**

**A) Remove `force-dynamic`, split per-user data to a client component**
- Song page becomes cacheable at the route level (`export const revalidate = 3600` or `'force-static'` with `revalidateTag`).
- `<KnownWordCount>` moves from SSR-seeded to client-fetched (component + route already exist).
- Lesson edits → bump tag via `revalidateTag('song:${slug}')` in the seed script that writes lessons.
- Blast radius: ~20 lines changed in [page.tsx](src/app/songs/[slug]/page.tsx) + [SongContent.tsx](src/app/songs/[slug]/components/SongContent.tsx). No DB layer change.

**B) Wrap `getSongBySlug` in `unstable_cache`, keep page dynamic**
- Page stays `force-dynamic`, so per-user data keeps its SSR path.
- DB queries 1 + 2 hit Next.js cache memory/ISR, query 3 still hits Neon.
- Tagging: `unstable_cache(fn, [slug], { tags: [`song:${slug}`] })`.
- Doesn't fix cold-SSR cost — every request still renders the full React tree server-side. Only saves the DB round-trips.

**Recommendation:** A. Cold-SSR cost is a real part of LCP; eliminating it matters. The split is cheap because `<KnownWordCount>` is already a separate component and `/api/review/known-count` already exists. B is a smaller wedge for the same complexity.

**Open decision for user:** TTL vs tag-based invalidation. Lessons are only mutated by seed scripts (never at runtime in prod); `force-static` + manual `revalidateTag` on seed-script write is the cleanest model. TTL is a fallback if we don't want to wire the seed script to revalidate.

### 3.2 Deferred YouTube iframe

**Two viable shapes:**

**A) IntersectionObserver lazy-mount**
- `<YouTubeEmbed>` stays visually identical; the `<iframe>` + YT API script only load when the container enters viewport.
- Desktop: video is above the fold → small win (defers by ~100ms as scroll starts).
- Mobile: video is below the lesson header → bigger win (user sees lesson text first, iframe loads when they scroll).
- `isReady` gate on `<ListeningDrillCard>` already handles the "iframe not mounted" case via `embedState === "loading"`.

**B) Facade (poster image + play button, swap on click)**
- Fastest (YT API JS never loads until user engages).
- Changes UX: user has to click to start video — today autoplay-on-mount is the implicit default when YT cooperates.
- `recordSongPlay` semantics actually improve ("did user watch?" vs "did page load?").

**Recommendation:** A for v1 — keeps UX identical, ships a real win. B is a separate UX decision; worth revisiting if A doesn't move LCP enough.

**Concrete integration notes from [YouTubeEmbed.tsx](src/app/songs/[slug]/components/YouTubeEmbed.tsx):**
- Component effect depends on `[currentId, songVersionId, userId, startTracking, stopTracking, setEmbedState, _registerApi]` — mount gate just needs to wrap the return JSX in a conditional ref-based render.
- `PlayerProvider key={activeType}` in [SongContent.tsx:80](src/app/songs/[slug]/components/SongContent.tsx#L80) forces remount on version toggle. Defer state needs to reset on remount (free — `useState(false)` does this).
- Practice tab is already `lazy()` + `Suspense` wrapped, so Listening Drill code only loads after user clicks Practice. The `isReady` gate guards playback calls — drill code shows "player unavailable" fallback if user opens Practice before the iframe has ever mounted.

### 3.3 CI bundle budget

**Recommendation: `size-limit` for enforcement + `@next/bundle-analyzer` for on-demand investigation.**

- `size-limit` integrates via `.size-limit.cjs` config + a `size-limit` script in package.json. CI runs `npm run size` after `npm run build`, fails if any tracked path exceeds its budget. PR comments via `andresz1/size-limit-action`.
- `@next/bundle-analyzer` is the Next-blessed analyzer; triggered via `ANALYZE=true npm run build`. Not in CI — used by humans when budget fails.

**Alternative: parse `.next/build-manifest.json` in a tsx script and assert sizes.** Zero deps, total control, but reinventing what size-limit already does.

**What to measure:**
- First Load JS for `/` (home), `/songs` (catalog), `/songs/[slug]` (song page) — Phase 13 success criterion names the song page; the other two are Phase 19 entry-gate targets so the budget lines should land in CI now.
- **Not yet:** `/path`, `/vocabulary`, `/review`, `/kana` — signed-in-only surfaces aren't in the beta launch gate; add budgets when they become critical paths.

**Baseline (pending build completion):** `next build` run is in progress from this session — build output will be pasted into this doc as an appendix once it finishes. Target 200KB gzipped First Load JS on song page is the ROADMAP-locked number; baseline will tell us if that's aggressive or loose against current state.

---

## 4. Out-of-scope findings (logged, not this phase)

These surfaced during the audit and are worth capturing but don't belong in Phase 13:

- **`force-dynamic` on pages that don't need it.** `/anime-list/page.tsx`, `/admin/timing/*`, `/api/client-errors/route.ts` have no per-user render dependency I could spot — they're dynamic out of default paranoia. Tightening these is pure upside but not on the Phase 13 critical path. File follow-up for Phase 20 code-quality pass.
- **`getAllSongs` has 8+ correlated subqueries** ([queries.ts:79-166](src/lib/db/queries.ts#L79-L166)). Every catalog page load runs this. Not a Phase 13 issue (we're caching the whole route), but if someone disables catalog caching it'll matter. Log for Phase 20.
- **Song page fires 3 serial DB queries, not 2.** [page.tsx:44-59](src/app/songs/[slug]/page.tsx#L44-L59) Promise.all-s two, but `getSongBySlug` itself does two sequentially ([queries.ts:26-40](src/lib/db/queries.ts#L26-L40): songs then versions). That's correctable (single query with join) but the cache in §3.1 makes it a one-time cost anyway.
- **Neon HTTP retry wrapper** ([db/index.ts:39](src/lib/db/index.ts#L39)) adds up to 750ms on cold-start DB requests. Caching routes away from Neon makes this retry path rarely hit, but it's worth documenting for Phase 16 (IR runbook: "first request after idle can be slow").

---

## 5. Phase 13 plan shape (proposed for user review)

Four plans, roughly:

- **13-01** — Lesson cache on repeat visit: remove `force-dynamic` from `/songs/[slug]`, split `<KnownWordCount>` to client-fetch, wire `revalidateTag('song:${slug}')` into the seed-script write path. Ship with a manual verification (reload same song → server-timing header shows cache hit, no Neon query in logs).
- **13-02** — YouTube iframe lazy-mount via IntersectionObserver: wrap `<YouTubeEmbed>` JSX in a mount gate, verify `isReady` / listening drill interaction preserved. Add a Playwright test asserting iframe is absent on initial paint and present after scroll.
- **13-03** — CI bundle budget: add `@next/bundle-analyzer` + `size-limit` + `.size-limit.cjs`, extend `.github/workflows/qa-suite.yml` `pr-checks` job to run `size-limit` post-build, start with song-page budget at 200KB gzipped (adjust to baseline if tighter).
- **13-04** — Baseline & cleanup: tighten `force-dynamic` on routes that don't need it (home, catalog, anime-list) — unblocks their inclusion in the Phase 19 Lighthouse gate. Not strictly Phase 13 criterion but natural to bundle here since the audit surfaced them.

---

---

## Appendix A: Bundle baseline (captured 2026-04-24)

Route-level First Load JS from `npm run build` (Next.js 15.5.14, production build, 7.1s compile). Sizes are **raw (uncompressed) JS**; gzipped is typically 25–35% of raw.

```
Route (app)                                        Size  First Load JS
┌ ƒ /                                             174 B         111 kB
├ ○ /_not-found                                   995 B         103 kB
├ ƒ /admin/timing                               1.38 kB         107 kB
├ ƒ /admin/timing/[songId]                      17.6 kB         123 kB
├ ƒ /anime-list                                   128 B         130 kB
├ ƒ /api/*  (all routes)                          145 B         102 kB
├ ○ /dashboard                                  7.28 kB         118 kB
├ ○ /kana                                       1.66 kB         111 kB
├ ○ /kana/session                               3.83 kB         117 kB
├ ○ /kana/session/summary                       1.79 kB         111 kB
├ ƒ /path                                       2.59 kB         108 kB
├ ○ /profile                                    1.67 kB         107 kB
├ ƒ /review                                     4.03 kB         110 kB
├ ƒ /songs                                        128 B         130 kB
├ ƒ /songs/[slug]                               9.59 kB         116 kB
└ ƒ /vocabulary                                 1.27 kB         107 kB
+ First Load JS shared by all                    102 kB
  ├ chunks/493-e61740f684b4ba13.js                46 kB
  ├ chunks/4bd1b696-c023c6e3521b1417.js         54.2 kB
  └ other shared chunks (total)                  2.1 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

### Key observations

**Song page is well under the 200 KB gzipped budget.**  
116 KB raw ≈ ~35–40 KB gzipped. Budget has ~5× headroom. The ROADMAP number was set defensively; actual state is already compliant. Recommendation for Plan 13-03: set the `size-limit` budget to **~45 KB gzipped** (tight-but-achievable ceiling against today's ~40 KB) rather than 200 KB, so regressions fail CI instead of passing into the backlog.

**Shared chunks dominate First Load.**  
102 KB of First Load JS is shared across *every* route — two chunks at 46 KB and 54.2 KB. Route-specific code is tiny (song page adds only 9.59 KB on top; most pages add <5 KB). Biggest perf lever isn't per-route trimming — it's auditing what's in the shared chunks. Likely candidates: React 19 + Next.js 15 runtime, Zustand, shared UI primitives. Worth a `@next/bundle-analyzer` pass in Plan 13-03.

**`/songs` and `/anime-list` carry +28 KB more First Load than most pages (130 KB vs ~108 KB average).**  
Route-specific code is 128 B each — meaning the catalog-specific delta is in imports that *those* routes pull into the shared layer (SongCard, imports from `/lib/db/queries.ts`'s heavy correlated subquery helpers, or similar). An analyzer run will tell.

**Six routes are already statically prerendered (○).**  
`/_not-found`, `/dashboard`, `/kana`, `/kana/session`, `/kana/session/summary`, `/profile`. These were *not* in the earlier `force-dynamic` grep — confirming the 13-route list is complete. Plan 13-04's `force-dynamic` cleanup should measurably move `/`, `/songs`, `/anime-list` into the ○ column on their next build.

**Song page detail routes: `/songs/[slug]` (9.59 KB) and `/admin/timing/[songId]` (17.6 KB).**  
Admin page is heavier because wavesurfer ships there. Confirmed: song-player page does *not* include wavesurfer (good — seed/admin dep, not prod user dep).

### Non-blocking warning from the build

```
⚠ metadataBase property in metadata export is not set for resolving social
  open graph or twitter images, using "http://localhost:3000".
```

Not a Phase 13 issue — log for Phase 18 (legal/SEO surface) where OG image metadata is a natural bundle.

---

*Phase: 13-performance-infrastructure*
*Research drafted: 2026-04-23*
*Bundle baseline captured: 2026-04-24 — see Appendix A*
