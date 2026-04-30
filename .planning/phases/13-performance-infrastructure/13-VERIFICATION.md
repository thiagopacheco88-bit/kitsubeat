---
phase: 13-performance-infrastructure
verified: 2026-04-28T00:00:00Z
status: human_needed
score: 11/11 must-haves verified (3 require human confirmation in live CI/runtime)
overrides_applied: 0
re_verification: null
human_verification:
  - test: "Open a trivial PR against master and observe pr-checks workflow"
    expected: "Build step runs npm run build with NEXT_PUBLIC_APP_ENV=production; size-limit-action step runs against .size-limit.cjs; sticky PR comment lands within ~30s reporting measured size + delta vs base; status check is green when measured size < 50 KB"
    why_human: "GitHub Actions workflow execution can only be observed by triggering a real PR — local YAML parsing confirms syntax but cannot prove the workflow actually runs and posts a comment in the GitHub-hosted environment"
  - test: "Throwaway PR scenario — import a heavy library into SongContent.tsx"
    expected: "size-limit step reports measured size > 50 KB; status check exits non-zero (hard fail); sticky comment shows breach details; PR cannot be merged through the gate"
    why_human: "AC #10 (test PR scenario for SPEC R3) requires creating a real GitHub PR and observing CI rejection — documented in 13-03-SUMMARY.md as a post-merge manual rollout-validation step that has not yet been executed"
  - test: "Run integration suite against TEST_DATABASE_URL with a seeded test DB"
    expected: "tests/integration/song-page-cache.test.ts: 3 tests pass — second render fires 0 SELECTs against songs/song_versions/vocabulary_items (proves unstable_cache layer works), revalidateTag busts the cache and the next render hits the DB (proves invalidation works), and the per-user decoupling does not poison the shared cache"
    why_human: "TEST_DATABASE_URL is not provisioned in the local environment (the integration suite uses describeIfTestDb to skip when unset); the CR-01 fix correctness must be validated against a real Neon connection where the cross-request cache boundary actually exists. CI runs this on master; until that run is observed, the fix is verified at the source level only"
---

# Phase 13: Performance Infrastructure Verification Report

**Phase Goal:** Ship the performance infrastructure whose shape is independent of visual design — caching, deferred loading, CI bundle budgets. Actual Lighthouse/LCP/TTI scoring is deferred to Phase 19 entry gate (after Phase 14 UX polish lands), so we don't score pages we're about to redesign.

**Verified:** 2026-04-28
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | `/songs/[slug]` is wrapped in `unstable_cache` so a second cross-request render fires 0 Neon SELECTs against `songs` / `song_versions` / `vocabulary_items` (AC #1) | VERIFIED (source) — needs CI/integration to lock | `src/lib/db/queries.ts` lines 55-61 wrap `getSongBySlug` in `unstable_cache(..., ["song-by-slug", slug], { tags: ['song:${slug}'], revalidate: false })`; lines 95-104 wrap `getVocabularyEnrichmentForSong` in the same tag. Both are wrapped per-slug so the tag closes over the argument. CR-01 fix landed at commit `1db37d1`. The integration test in `tests/integration/song-page-cache.test.ts` lines 69-79 asserts the 0-SELECT contract |
| 2  | `revalidateTag('song:${slug}')` invalidates the cache; the next request fires fresh queries (AC #2) | VERIFIED (source) | `src/app/actions/cache.ts` line 22 calls `revalidateTag('song:${slug}')`; the read sites in `queries.ts` register that exact tag string via `unstable_cache` `tags: ['song:${slug}']`. Tag string symmetry confirmed at both sites. Integration test lines 81-96 explicitly warm + reset + bust + assert SELECT > 0 on both `songs` AND `song_versions` |
| 3  | Integration test genuinely exercises Next's data cache, not React's per-request `cache()` | VERIFIED | `tests/integration/song-page-cache.test.ts` lines 9-25 explicitly document the layered contract; the test file-level docstring states "Layer 2 — `unstable_cache` — is the only thing that can produce a 0-SELECT second render. If the song body were only wrapped in React `cache()` (per-request only) and not `unstable_cache`, the second render WOULD hit Neon." The post-CR-01-fix test now includes a warm-baseline assertion before the revalidateTag bust to make the test fail fast if `unstable_cache` is removed |
| 4  | `revalidateSongCache(slug)` is the single sanctioned cache writer; lesson-write seed scripts call it | VERIFIED | `src/app/actions/cache.ts` exports the only writer (line 21). `scripts/seed/snap-full-onsets.ts:455` and `scripts/seed/05-insert-db.ts:428` both dynamically import and call `revalidateSongCache` after their respective writes |
| 5  | Initial DOM has 0 youtube iframes (AC #4) | VERIFIED | `YouTubeEmbed.tsx` lines 432-441 render the placeholder `<div data-yt-state="placeholder" className="aspect-video w-full animate-pulse rounded-lg bg-zinc-800" />` when `!shouldMount`. `shouldMount` defaults to `false` at line 75. E2E spec `tests/e2e/iframe-defer.spec.ts` lines 19-32 asserts `iframe[src*="youtube"]` count is 0 on initial load with `?disableTestForceMount=1` |
| 6  | Iframe present after scroll, IntersectionObserver with rootMargin: 200px (AC #5) | VERIFIED | `YouTubeEmbed.tsx` lines 162-180 construct an IntersectionObserver with `{ rootMargin: "200px" }` (D-07 LOCKED string). `tests/e2e/iframe-defer.spec.ts` lines 34-47 scrolls the placeholder into view and asserts iframe present within 10s bounded wait |
| 7  | Listening Drill (advanced-drill-quota.spec.ts) green — force-mount on Practice tab (AC #6) | VERIFIED (source) | `SongContent.tsx:92` calls `setForceMount(true)` when `activeTab === "practice"`. `YouTubeEmbed.tsx` lines 154-157 short-circuits the IO setup when `forceMount === true` and immediately calls `setShouldMount(true)`. `iframe-defer.spec.ts` lines 49-64 asserts the Practice-tab path mounts the iframe without scroll. The `advanced-drill-quota.spec.ts` file exists at the documented path; live E2E execution to confirm green is part of standard CI run |
| 8  | Phase 10 PlayerContext API surface (seekTo, play, pause, isReady, embedState) preserved verbatim | VERIFIED | `PlayerContext.tsx` lines 100-101 add ONLY two new fields (`forceMount: boolean`, `setForceMount: (v: boolean) => void`); existing API surface unchanged. Provider value object lines 252-253 add the new pair without modifying any existing key |
| 9  | WR-03 fix: io.disconnect() called BEFORE setShouldMount(true) | VERIFIED | `YouTubeEmbed.tsx` lines 166-173 — comment explicitly references "Phase 13 WR-03 fix" and the `io.disconnect()` call at line 171 precedes `setShouldMount(true)` at line 172. Commit `0af4c2f` confirmed in git log |
| 10 | `.size-limit.cjs` budgets `/songs/[slug]` First Load JS at 50 KB gzipped (AC #7) | VERIFIED | `.size-limit.cjs` line 39: `name: "/songs/[slug] First Load JS (gzipped)"`; line 50: `limit: "50 KB"`; line 51: `gzip: true`. Path globs at lines 41-48 cover the route-specific page chunk plus near-route shared chunks. 13-03-SUMMARY documents measured baseline at 15.99 KB gzipped (34 KB headroom) |
| 11 | pr-checks workflow has size-limit-action that hard-fails on budget breach (AC #8, #10) | VERIFIED (source) — needs CI run to lock | `.github/workflows/qa-suite.yml` lines 78-83 add the `andresz1/size-limit-action@v1` step with `skip_step: build` and `package_manager: npm`. Lines 47-48 grant `pull-requests: write` permission. Build step at lines 73-76 runs `npm run build` with `NEXT_PUBLIC_APP_ENV: production` for prod-build measurement. No `continue-on-error` anywhere (D-23 hard-fail rule). Live PR observation deferred to human verification |
| 12 | `@next/bundle-analyzer` wired in next.config.ts behind ANALYZE=true (AC #9) | VERIFIED | `next.config.ts` line 2 imports `withBundleAnalyzer`; lines 10-12 enable on `process.env.ANALYZE === "true"`; line 14 exports the wrapped config |
| 13 | Phase 13 SUMMARY records the Lighthouse baseline (AC #11) | VERIFIED | `13-SUMMARY.md` lines 33-38 contain the 6-cell baseline table (mobile + desktop × home/catalog/song); line 31 records median target song slug `ima-made-nando-mo-the-mass-missile`. 6 JSON files exist at `.planning/phases/13-performance-infrastructure/lighthouse-baseline/{home,catalog,song}-{mobile,desktop}.json`. `target-song.txt` is non-empty. Per ROADMAP, scores are explicitly informational only; baseline is for Phase 19 entry-gate comparison |

**Score:** 13/13 truths verified at the source level; 3 truths additionally require human/CI runtime verification to lock the contract end-to-end.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/db/queries.ts` | `unstable_cache` wraps `getSongBySlug` and `getVocabularyEnrichmentForSong` with `song:${slug}` tag | VERIFIED | 4 occurrences of `unstable_cache`; closure-over-slug pattern correctly applied |
| `src/app/actions/cache.ts` | Exports `revalidateSongCache(slug)` calling `revalidateTag('song:${slug}')` | VERIFIED | Single export, exact tag string, "use server" directive present |
| `src/app/songs/[slug]/page.tsx` | No `force-dynamic`, no `PLACEHOLDER_USER_ID`, no `getKnownWordCountForSong`; uses `getVocabularyEnrichmentForSong` | VERIFIED | grep returned 0 matches for all forbidden patterns; line 2 imports the new enrichment helper; line 40 calls it |
| `src/app/songs/[slug]/components/KnownWordCount.tsx` | Client-component fetches `/api/review/known-count` on mount | VERIFIED (source) | WR-01 fix landed (commit 3d82573); component now uses fallback counts and test-env short-circuit per the review-fix report |
| `src/app/songs/[slug]/components/YouTubeEmbed.tsx` | IntersectionObserver, rootMargin: "200px", placeholder skeleton, forceMount short-circuit, test-env single-condition gate | VERIFIED | All required strings present; WR-03 disconnect-before-setState ordering confirmed at lines 171-172 |
| `src/app/songs/[slug]/components/PlayerContext.tsx` | Additive `forceMount: boolean` + `setForceMount` on context value; preserves seekTo/play/pause/isReady/embedState | VERIFIED | Interface lines 100-101, useState line 140, value object lines 252-253; Phase 10 API untouched |
| `src/app/songs/[slug]/components/SongContent.tsx` | activeTab effect calls `setForceMount(true)` when Practice tab opens | VERIFIED | Line 92 calls `setForceMount(true)` inside the activeTab effect; SongContentInner extraction documented in 13-02-SUMMARY |
| `src/lib/db/index.ts` | `__testQueryCounter` shim gated single-condition on `NEXT_PUBLIC_APP_ENV === "test"` | VERIFIED | Line 78 single-condition gate; line 132 wires `_instrumentedFetch` to neonConfig; line 160 exports shim |
| `tests/integration/setup.ts` | Sets `NEXT_PUBLIC_APP_ENV="test"` so counter activates in local integration runs | VERIFIED | Lines 57-59 set the env var when unset (CI sets it at qa-suite.yml:53) |
| `tests/integration/song-page-cache.test.ts` | 3 integration tests for AC #1, #2, #3; describeIfTestDb gate; explicit Layer 1 vs Layer 2 documentation | VERIFIED (source) | All three tests present; warm-baseline assertion added in CR-01 fix to ensure invalidation test cannot pass on a never-warmed cache |
| `tests/e2e/iframe-defer.spec.ts` | Playwright spec for AC #4, #5, D-08 force-mount; uses `?disableTestForceMount=1` override | VERIFIED | 3 tests present; `scrollIntoViewIfNeeded` at line 42; `disableTestForceMount` query param set in all 3 tests |
| `.size-limit.cjs` | 50 KB gzipped budget on `/songs/[slug]` route-specific chunks | VERIFIED | Glob set scoped correctly to route + near-route shared chunks (the deviation from PLAN's original glob set is documented in 13-03-SUMMARY as an essential auto-fix; without it CI would always fail) |
| `next.config.ts` | `withBundleAnalyzer` wraps `nextConfig`, gated on `ANALYZE=true` | VERIFIED | All required strings present at correct lines |
| `.github/workflows/qa-suite.yml` | pr-checks extended with Build + size-limit-action steps; pull-requests: write permission; no continue-on-error | VERIFIED | All required additions present; nightly-full job preserved; concurrency block preserved |
| `scripts/lighthouse-pick-target.ts` | DB-driven median song picker writing to target-song.txt | VERIFIED | Script exists; 13-04 SUMMARY confirms run produced median slug at 51,383 bytes / rank 165/329 |
| `scripts/lighthouse-baseline.ts` | Sequential Lighthouse runs (mobile + desktop × 3 routes) writing 6 JSON outputs | VERIFIED | Script exists; 6 JSON outputs present in lighthouse-baseline/ directory |
| `.planning/phases/13-performance-infrastructure/lighthouse-baseline/` | 6 JSON outputs + target-song.txt | VERIFIED | All 7 files present and target-song.txt is non-empty |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/db/queries.ts::getSongBySlug` | `next/cache::revalidateTag('song:${slug}')` | tags array on unstable_cache | WIRED | Tag string `song:${slug}` registered at line 59; matches writer string at `cache.ts:22` exactly |
| `src/lib/db/queries.ts::getVocabularyEnrichmentForSong` | same `song:${slug}` tag | tags array on unstable_cache | WIRED | Line 101 — both readers register the same tag so revalidateTag busts both in lockstep |
| `src/app/songs/[slug]/page.tsx` | `getVocabularyEnrichmentForSong` | direct import + call at line 40 | WIRED | Replaces the formerly-inline `db.select()` call that bypassed the cache |
| `src/app/actions/cache.ts::revalidateSongCache` | `scripts/seed/snap-full-onsets.ts` apply loop | dynamic import after db.update | WIRED | Line 455-456 imports + invokes after each successful per-slug update |
| `src/app/actions/cache.ts::revalidateSongCache` | `scripts/seed/05-insert-db.ts` upsert loop | dynamic import after upsert | WIRED | Line 428-429 imports + invokes after each successful per-slug upsert |
| `src/app/songs/[slug]/components/YouTubeEmbed.tsx` | `PlayerContext::forceMount` | `usePlayer().forceMount` destructure | WIRED | Line 69 destructures forceMount from usePlayer(); line 154 short-circuits IO setup when true |
| `src/app/songs/[slug]/components/SongContent.tsx` | `PlayerContext::setForceMount` | `usePlayer().setForceMount` destructure inside SongContentInner | WIRED | Line 72 destructures; line 92 calls `setForceMount(true)` in the activeTab effect |
| `tests/e2e/iframe-defer.spec.ts` | YouTubeEmbed `?disableTestForceMount=1` hook | URL query param at page.goto | WIRED | All 3 tests pass the param at page.goto; YouTubeEmbed.tsx:144-150 reads and honors it |
| `tests/integration/song-page-cache.test.ts` | `src/lib/db::__testQueryCounter` | direct module import at line 32 | WIRED | Counter import + reset/count assertions in all 3 tests |
| `.github/workflows/qa-suite.yml::pr-checks` | `.size-limit.cjs` | size-limit-action reads config | WIRED | size-limit-action@v1 step references the config file by convention; skip_step: build avoids double-build |
| `scripts/lighthouse-baseline.ts` | `target-song.txt` | reads file path on startup | WIRED | Script reads the file via fs to determine which slug to audit |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `KnownWordCount.tsx` | `counts` state | `/api/review/known-count?songId=...` fetch on mount | Yes — endpoint exists with real DB query (verified by grep / pre-existing infrastructure from Phase 11) | FLOWING |
| `SongContent.tsx` (rendered lesson) | `versions` array | `getSongBySlug` + `getVocabularyEnrichmentForSong` | Yes — Drizzle SELECTs against songs/song_versions/vocabulary_items | FLOWING |
| `YouTubeEmbed.tsx` | iframe (after `shouldMount`) | YT IFrame API loaded from youtube.com/iframe_api | Yes — only mounts after viewport entry or forceMount | FLOWING |
| Lighthouse baseline JSONs | Lighthouse audit results | `npx lighthouse` against localhost:7000 | Yes — 6 JSON files captured 2026-04-30; scores populated in 13-SUMMARY table | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `.size-limit.cjs` parses as valid CommonJS | static read confirmed module.exports is an array of one budget object | Valid structure | PASS |
| `qa-suite.yml` is valid YAML | static read confirmed indentation, key shapes, action references | Valid YAML | PASS |
| Lighthouse baseline directory has 6 JSON files | `ls lighthouse-baseline/*.json` (file list) | 6 JSON files present (catalog/home/song × mobile/desktop) | PASS |
| target-song.txt is non-empty | file read returned `ima-made-nando-mo-the-mass-missile` | Non-empty | PASS |
| `revalidateSongCache` is exported and called by both seed scripts | grep across scripts/seed | 2 dynamic-import call sites confirmed | PASS |
| Live CI workflow run on a real PR | only observable in GitHub Actions | Cannot test locally | SKIP — routed to human verification |
| Throwaway PR with heavy import rejected by size-limit-action | only observable on a real PR | Cannot test locally | SKIP — routed to human verification |
| Integration suite runs against TEST_DATABASE_URL with seeded test DB | `npm run test:integration -- song-page-cache` | TEST_DATABASE_URL not provisioned in this verification environment | SKIP — routed to human verification |

### Requirements Coverage

REQUIREMENTS.md does not enumerate Phase 13 requirements — the ROADMAP entry for Phase 13 explicitly states `**Requirements**: TBD`. The plan-internal requirement IDs (R1, R2, R3, BASELINE) are tracked in the individual plan frontmatters and do NOT appear in REQUIREMENTS.md. This is informational, not a gap.

| Requirement (plan-internal) | Source Plan | Description | Status | Evidence |
|-----------|------------|-------------|--------|----------|
| R1 | 13-01-PLAN.md | Lesson cache: remove force-dynamic, decouple KnownWordCount, instrumented Neon counter, integration tests, revalidateTag hooks in seed scripts | SATISFIED | All 5 deliverables landed; CR-01 fix corrected the original false-positive (`unstable_cache` wrap added at queries.ts) |
| R2 | 13-02-PLAN.md | Iframe defer: IntersectionObserver lazy-mount, skeleton placeholder, force-mount on Practice tab, E2E spec | SATISFIED | All 4 deliverables landed; PlayerContext API preserved (D-19); WR-03 disconnect-order fix applied |
| R3 | 13-03-PLAN.md | Bundle CI: size-limit + bundle-analyzer + .size-limit.cjs (50 KB gzipped on /songs/[slug]) + pr-checks extension | SATISFIED (source) — needs human verification of live CI behavior | All artifacts present; auto-fixed glob set documented; AC #10 (test PR scenario) deferred to post-merge rollout per 13-03-SUMMARY |
| BASELINE | 13-04-PLAN.md | Lighthouse baseline: pick-target script, baseline script, 6 JSON outputs, populated table in 13-SUMMARY.md | SATISFIED | All deliverables landed 2026-04-30; baseline scores captured (informational only per ROADMAP / D-14) |

No orphaned Phase-13 requirements found in REQUIREMENTS.md (since none are listed there).

### Anti-Patterns Found

Targeted scan of the 17 phase-13-modified files turned up zero blocker-level anti-patterns. Two informational items below; neither is a gap.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `package.json` | 73 | `@next/bundle-analyzer@^16.2.4` paired with `next@^15.5.14` (major-version skew) | Info (already noted in 13-REVIEW IN-03) | Not a blocker; bundle-analyzer 16 is generally backward-compatible with Next 15 builds. Logged for future tracking |
| `next.config.ts` | (informational) | `package.json` was updated to use `--port 7000` for `start` script during 13-04 execution | Info | Documented in commit `cd1704d`; required by lighthouse-baseline.ts which expects port 7000. Not a gap — this is a deliberate behavioral coupling |

The 6 pre-existing test failures (3 in `scripts/seed/spot-check-tv-onsets.test.ts`, 3 in `tests/integration/regression-stale-lesson-data.test.ts`) verified to fail at pre-Phase-13 base commit `dd59ade` are NOT phase 13 regressions per the orchestrator's known-issues note and are NOT flagged.

The build output marking `/songs/[slug]` as `Dynamic` rather than `Static` is the correct expected outcome of the CR-01 fix per the orchestrator's known-issues note: `unstable_cache` is data-layer caching, not route-level static generation. AC #1 (0 SELECTs on second cross-request render) is satisfied at the data layer.

### Human Verification Required

#### 1. Live CI workflow run on a real PR

**Test:** Open a trivial PR against master (e.g., a single-line README change) and observe the pr-checks workflow execution in GitHub Actions.
**Expected:**
- `Build` step runs `npm run build` with `NEXT_PUBLIC_APP_ENV=production` and exits 0.
- `Bundle size check` step runs `andresz1/size-limit-action@v1` with `skip_step: build` and `package_manager: npm`, exits 0.
- A sticky comment from the size-limit-action bot lands on the PR within ~30s of the workflow finishing, showing measured size + delta vs base branch (e.g., "/songs/[slug] First Load JS (gzipped): 16.0 KB / +0 B").
- The PR's status check shows green.

**Why human:** GitHub Actions workflow execution can only be observed by triggering a real PR — local YAML parsing confirms syntax but cannot prove the workflow actually runs and posts a comment in the GitHub-hosted environment.

#### 2. Throwaway PR scenario for size-limit hard-fail (AC #10)

**Test:** Create a throwaway branch + PR that imports a known-heavy library into `src/app/songs/[slug]/components/SongContent.tsx` (e.g., `import _ from "lodash"; void _.cloneDeep({});`).
**Expected:**
- size-limit-action reports measured size > 50 KB.
- The status check is red (hard fail; no `continue-on-error`).
- A sticky PR comment shows the breach details with measured size and the +X KB overage.
- The PR cannot be merged through the gate.
- Roll back the throwaway branch without merging.

**Why human:** AC #10 (test PR scenario for SPEC R3) requires creating a real GitHub PR and observing CI rejection — this is a post-merge rollout-validation step documented in 13-03-SUMMARY.md and should be executed once before considering R3 fully closed.

#### 3. Run the integration suite against a seeded TEST_DATABASE_URL

**Test:**
```bash
# In a shell with TEST_DATABASE_URL set in .env.test or .env.local:
npm run test:seed
npm run test:integration -- song-page-cache
```
**Expected:** All 3 tests in `Phase 13 / song-page cache (R1)` pass:
1. "second render fires 0 Neon SELECTs for songs / song_versions / vocabulary_items" — proves `unstable_cache` Layer 2 actually deduplicates across module re-imports.
2. "revalidateTag(`song:${slug}`) invalidates the cache" — first warms + asserts 0-SELECT baseline, then bursts and asserts SELECTs > 0 on `songs` AND `song_versions`.
3. "KnownWordCount client fetch does not trigger lesson-body SELECTs" — proves per-user data is OFF the cached path (D-03 invariant).

**Why human:** TEST_DATABASE_URL is not provisioned in this verification environment (the integration suite uses `describeIfTestDb` to skip when unset). The CR-01 fix correctness must be validated against a real Neon connection where the cross-request cache boundary actually exists. CI runs this on master via the pr-checks job; until that run is observed, the fix is verified at the source level only.

### Gaps Summary

No goal-blocking gaps were found. Phase 13 ships its complete contract at the source level:
- The CR-01 fix (commit `1db37d1`) correctly resolves the original false-positive — `unstable_cache` is wired with the `song:${slug}` tag for both the song-body and the vocab-enrichment SELECTs, in lockstep.
- The 5 warning-level review findings (WR-01 through WR-05) all landed fixes at the documented commits.
- The iframe defer contract (initial DOM = 0 iframes; post-scroll = 1 iframe; Practice-tab force-mount) is locked by the IntersectionObserver setup with `rootMargin: "200px"`, the placeholder skeleton, and the additive PlayerContext surface.
- The 50 KB gzipped budget on `/songs/[slug]` is enforced by `andresz1/size-limit-action@v1` with `skip_step: build`, hard-fail, and `pull-requests: write` permission.
- Lighthouse baseline is captured for Phase 19 entry-gate comparison — and per ROADMAP, Phase 13 explicitly does NOT gate on Lighthouse score targets, so the below-Phase-19-target mobile scores are expected and acceptable.

The three human-verification items represent observable behaviors that cannot be exercised programmatically from the verifier's environment. They are not gaps — they are runtime confirmation steps that lock the live behavior in CI / against a seeded TEST_DATABASE_URL.

---

*Verified: 2026-04-28*
*Verifier: Claude (gsd-verifier)*
