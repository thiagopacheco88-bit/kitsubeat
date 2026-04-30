---
phase: 13-performance-infrastructure
fixed_at: 2026-04-28T00:00:00Z
review_path: .planning/phases/13-performance-infrastructure/13-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 13: Code Review Fix Report

**Fixed at:** 2026-04-28
**Source review:** `.planning/phases/13-performance-infrastructure/13-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (1 critical + 5 warnings; Info findings out of scope per `fix_scope: critical_warning`)
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: `revalidateSongCache` writes to a tag no read path registers

**Files modified:** `src/lib/db/queries.ts`, `src/app/songs/[slug]/page.tsx`, `src/app/actions/cache.ts`, `tests/integration/song-page-cache.test.ts`
**Commit:** `1db37d1`
**Status:** fixed: requires human verification

**Applied fix (Approach A — `unstable_cache`, per phase-context guidance):**

1. In `src/lib/db/queries.ts`:
   - Added `import { unstable_cache } from "next/cache"`.
   - Refactored `getSongBySlug(slug)` so the inner DB SELECTs are wrapped in `unstable_cache(..., ["song-by-slug", slug], { tags: [\`song:${slug}\`], revalidate: false })`. Kept the outer React `cache()` wrapper for per-request memo (so `generateMetadata` + the page body still share one query).
   - Added a new `getVocabularyEnrichmentForSong(slug, vocabIds)` helper that wraps the vocab `inArray` SELECT in the same `unstable_cache` shape with the SAME `song:${slug}` tag, so writers only need to revalidate one tag per slug. Cache key includes the sorted vocab-id list. Imported `vocabularyItems` from `./schema`.
2. In `src/app/songs/[slug]/page.tsx`:
   - Replaced the inline `db.select()...` enrichment query with a call to `getVocabularyEnrichmentForSong(slug, Array.from(vocabIds))`.
   - Dropped the now-unused `db`, `vocabularyItems`, `inArray` imports.
3. In `src/app/actions/cache.ts`:
   - Updated the JSDoc to honestly describe the read-side registration: read paths in `src/lib/db/queries.ts` register the `song:${slug}` tag via `unstable_cache`, and `revalidateTag` busts BOTH the song body AND the vocab enrichment in lockstep.
4. In `tests/integration/song-page-cache.test.ts`:
   - Rewrote the file-level docstring to honestly describe the layered contract (Layer 1 = React `cache()` per-request memo; Layer 2 = `unstable_cache` cross-request, tag-keyed).
   - Strengthened the `revalidateTag` test: now first warms Layer 2 + asserts a 0-SELECT second render (so the post-revalidate non-zero count is unambiguously attributable to the tag bust, not a never-warmed cache), THEN calls `revalidateTag` and asserts SELECTs > 0 against BOTH `songs` and `song_versions`.
   - Comments now explicitly state that the test fails fast if `unstable_cache` wrapping is removed (so a future regression to bare React `cache()` flips the suite red).

**Why "requires human verification":** The integration test honestly exercises the cache layer now, but the integration suite requires `TEST_DATABASE_URL` to actually run (it's gated via `describeIfTestDb`). The fix layer-correctness must be confirmed by running `npm run test:integration` against a seeded test DB, and ideally by running `npm run build && npm run start` and observing Server Timing headers + Neon logs on a second `/songs/[slug]` request showing 0 SELECTs.

**Note on Approach B:** The phase-context guidance suggested `'use cache'` (cacheComponents) as a viable alternative. I chose Approach A (`unstable_cache`) because:
- Next.js 15.5.14 (per `package.json`) has `'use cache'` as experimental — `unstable_cache` is the stable path.
- Approach A leaves `next.config.ts` untouched (no `experimental.cacheComponents` flag flip), keeping blast radius minimal.
- Approach A keeps the React `cache()` per-request layer intact without introducing new directives.

### WR-01: KnownWordCount mount fetch error handling + test-env gate

**Files modified:** `src/app/songs/[slug]/components/KnownWordCount.tsx`
**Commit:** `3d82573`
**Status:** fixed

**Applied fix:**
- Added a `FALLBACK_COUNTS = { total: 0, known: 0, mastered: 0, learning: 0 }` constant that renders the "New to you" pill (the same UI a never-touched song shows) instead of leaving the skeleton shimmering forever.
- Added a `NEXT_PUBLIC_APP_ENV === "test"` short-circuit that sets counts to the fallback immediately on mount, skipping the API call entirely under jsdom/Playwright.
- Coalesced both `useEffect`s into a single effect that handles BOTH the mount path and the "session-just-finished" refetch path. Cache key is now keyed on whether `justFinished` is true (`finished-${len}-${idx}` vs `mount-${songId}`) and the in-flight request is held in a shared `inflightRef` controller, so any superseding fetch aborts the prior one.
- Response handler now branches: `r.ok` → JSON; `r.ok === false` (4xx/5xx) → fallback; network error → fallback. AbortError is silently swallowed (expected when superseded).
- Existing `lastFetchedKey` ref guard preserved for completed-session dedupe.

### WR-02: `embedState` not in YouTubeEmbed init effect dependency list

**Files modified:** `src/app/songs/[slug]/components/YouTubeEmbed.tsx`
**Commit:** `bf4a0e6`
**Status:** fixed

**Applied fix:**
- Added an explanatory comment + `eslint-disable-next-line react-hooks/exhaustive-deps` immediately before the dependency array of the player-init effect. The comment documents that the effect OWNS `embedState` (writes via `setEmbedState` and the watchdog's functional updater), and that adding it to deps would cause the effect to re-run on every state transition — destroying and rebuilding the player every time `onReady` or `onError` fires.
- The functional `setEmbedState((prev) => prev === "loading" ? "error" : prev)` watchdog at line ~373 was already in place; the WR-02 fix is documentation + lint suppression so future refactors don't accidentally add `embedState` to the deps array and break the player lifecycle.

### WR-03: IntersectionObserver — disconnect before setShouldMount

**Files modified:** `src/app/songs/[slug]/components/YouTubeEmbed.tsx`
**Commit:** `0af4c2f`
**Status:** fixed

**Applied fix:**
- In the IntersectionObserver callback inside the lazy-mount effect, swapped the order of `setShouldMount(true)` and `io.disconnect()` so `disconnect()` runs FIRST.
- Rationale: if a late entry batch is queued at the moment of intersection, disconnecting before flipping `shouldMount` ensures that batch cannot fire a second `setShouldMount(true)` against an already-mounted state. `disconnect()` is synchronous and idempotent, so the post-disconnect `setShouldMount(true)` is safe.
- Added a comment documenting the WR-03 rationale at the swap site.

### WR-04: lighthouse-pick-target.ts defensive medianIndex check

**Files modified:** `scripts/lighthouse-pick-target.ts`
**Commit:** `8300c86`
**Status:** fixed

**Applied fix:**
- Inserted a `if (!median) { console.error(...); process.exit(1); }` guard immediately after the `const median = rows[medianIndex]` access.
- Failing with an actionable error message ("medianIndex N out of bounds for M rows") beats a `TypeError: Cannot read properties of undefined (reading 'slug')` stack trace if a future filter step ever introduces holes in `rows`.

### WR-05: snap-full-onsets per-slug stdout logging at start of each row

**Files modified:** `scripts/seed/snap-full-onsets.ts`
**Commit:** `42a2aaf`
**Status:** fixed

**Applied fix:**
- Replaced `for (const p of plans)` with `for (let i = 0; i < plans.length; i++)` so the script knows the row number.
- At the START of each row's processing (BEFORE the DB write), the script now writes `[snap] (i+1/N) applying ${slug}...\n` (newline-terminated, NOT `\r`-overwritten) to stdout.
- After successful application: `[snap] (i+1/N) ${slug} OK (${applied} applied)\n`.
- After failure: `[snap] (i+1/N) ${slug} FAILED: ${message}\n` (in addition to the existing `failed.push`).
- Operator semantics: a Ctrl-C mid-loop now leaves the most recent "applying ${slug}" line as the last stdout output, so the operator knows exactly which slug was in flight when the cancel landed. Previously the `\r`-overwritten counter only updated AFTER success, leaving the operator unsure whether the canceled row had been written.

---

_Fixed: 2026-04-28_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
