# Phase 13: Performance Infrastructure — Summary

**Status:** Plan 13-04 Task 2 pending — Performance baseline table awaits human Lighthouse run.

---

## Plans

- **13-01-PLAN.md** — Lesson cache + revalidateTag + Neon SELECT counter — see [13-01-SUMMARY.md](13-01-SUMMARY.md)
- **13-02-PLAN.md** — iframe lazy-mount (IntersectionObserver) + force-mount on Practice tab — see [13-02-SUMMARY.md](13-02-SUMMARY.md)
- **13-03-PLAN.md** — size-limit CI + 50 KB budget on /songs/[slug] — see [13-03-SUMMARY.md](13-03-SUMMARY.md)
- **13-04-PLAN.md** — Lighthouse baseline (this document)

---

## Performance baseline

<!-- HUMAN: Populate this section after running Plan 13-04 Task 2 steps:
  1. npm run build && npm run start    (shell A)
  2. npm run lighthouse:pick-target    (shell B)
  3. npm run lighthouse:baseline       (shell B — ~3-5 min)
  4. Extract scores with jq (see below) and fill the table.
  5. Commit: git add .planning/phases/13-performance-infrastructure/lighthouse-baseline/ .planning/phases/13-performance-infrastructure/13-SUMMARY.md && git commit -m "docs(13-04): capture Lighthouse baseline for Phase 19 entry gate"

jq extraction command per JSON file:
  jq -r '[(.categories.performance.score * 100), .audits["largest-contentful-paint"].numericValue, .audits["interactive"].numericValue] | @tsv' <file>.json
-->

Captured: **PENDING** — run `npm run lighthouse:pick-target && npm run lighthouse:baseline` against `npm run start` on http://localhost:7000.

Median target song (D-17): **PENDING** — see `.planning/phases/13-performance-infrastructure/lighthouse-baseline/target-song.txt` after running pick-target.

| Route | Mobile Perf | Mobile LCP | Mobile TTI | Desktop Perf | Desktop LCP | Desktop TTI |
|---|---:|---:|---:|---:|---:|---:|
| / (home)         | PENDING/100 | PENDINGms | PENDINGms | PENDING/100 | PENDINGms | PENDINGms |
| /songs (catalog) | PENDING/100 | PENDINGms | PENDINGms | PENDING/100 | PENDINGms | PENDINGms |
| /songs/\<slug\>  | PENDING/100 | PENDINGms | PENDINGms | PENDING/100 | PENDINGms | PENDINGms |

Raw JSON: `.planning/phases/13-performance-infrastructure/lighthouse-baseline/{home,catalog,song}-{mobile,desktop}.json`

**Status: informational only** (D-14, SPEC out-of-scope §Lighthouse). Phase 19 entry gate will compare against these numbers AFTER Phase 14 UX polish.

---

## Phase 13 wins (against pre-Phase-13 baseline)

- **Cache (Plan 01):** `/songs/[slug]` is now `○` (Static) in `next build` route table. Second visit fires 0 Neon SELECTs against songs/song_versions/vocabulary_items. `revalidateSongCache(slug)` server action invalidates the tag on lesson writes.
- **Iframe defer (Plan 02):** Initial DOM has 0 YouTube iframes; iframe mounts on viewport entry (IntersectionObserver, rootMargin: 200px) or when Practice tab opens (forceMount path). Zero CLS from aspect-video skeleton placeholder.
- **Bundle CI (Plan 03):** `/songs/[slug]` First Load JS budgeted at 50 KB gzipped; hard-fail in CI via `andresz1/size-limit-action@v1`. Bundle analyzer available via `ANALYZE=true npm run build` for local investigation.

---

## Risks logged

- **Future lesson writers must call `revalidateSongCache(slug)`** — centralized in `src/app/actions/cache.ts`; log for Phase 20 audit to ensure all lesson-write surfaces call it.
- **level-up.mp3 placeholder swap** (carried from Phase 12) — log for beta-launch checklist.
- **andresz1/size-limit-action@v1 supply-chain risk** — pinned to v1 major; log for Phase 16 IR runbook to evaluate pinning to a SHA.
- **Phase 13 baseline scores may be below Phase 19 target (mobile Perf ≥ 85)** — this is expected and acceptable per D-14 (SPEC out-of-scope). Phase 14 UX polish is expected to improve scores; Phase 19 entry gate will gate on the post-14 state.

---

## SPEC ACs addressed

| AC | Description | Status |
|----|-------------|--------|
| AC #1 | Second request to /songs/[slug] fires 0 Neon SELECTs | Done (Plan 01) |
| AC #2 | revalidateTag invalidates the cache | Done (Plan 01) |
| AC #3 | Cache integration test (song-page-cache.test.ts) | Done (Plan 01) |
| AC #4 | iframe absent on initial DOM | Done (Plan 02) |
| AC #5 | iframe present after scroll | Done (Plan 02) |
| AC #6 | Listening Drill unaffected (advanced-drill-quota.spec.ts green) | Done (Plan 02) |
| AC #7 | size-limit config present (.size-limit.cjs) | Done (Plan 03) |
| AC #8 | CI fails if /songs/[slug] budget breached | Done (Plan 03) |
| AC #9 | Bundle analyzer wired in next.config.ts | Done (Plan 03) |
| AC #10 | pr-checks extended with Build + size-limit-action | Done (Plan 03) |
| AC #11 | 13-SUMMARY.md Performance baseline table | Pending Task 2 |
