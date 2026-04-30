---
phase: 13-performance-infrastructure
reviewed: 2026-04-28T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - .github/workflows/qa-suite.yml
  - .size-limit.cjs
  - next.config.ts
  - package.json
  - scripts/lighthouse-baseline.ts
  - scripts/lighthouse-pick-target.ts
  - scripts/seed/05-insert-db.ts
  - scripts/seed/snap-full-onsets.ts
  - src/app/actions/cache.ts
  - src/app/songs/[slug]/components/KnownWordCount.tsx
  - src/app/songs/[slug]/components/PlayerContext.tsx
  - src/app/songs/[slug]/components/SongContent.tsx
  - src/app/songs/[slug]/components/YouTubeEmbed.tsx
  - src/app/songs/[slug]/page.tsx
  - src/lib/db/index.ts
  - tests/e2e/iframe-defer.spec.ts
  - tests/integration/setup.ts
  - tests/integration/song-page-cache.test.ts
findings:
  critical: 1
  warning: 5
  info: 4
  total: 10
status: issues_found
---

# Phase 13: Code Review Report

**Reviewed:** 2026-04-28
**Depth:** standard
**Files Reviewed:** 17 (includes the integration test file already in scope)
**Status:** issues_found

## Summary

Phase 13 lays the performance-infrastructure groundwork well: the IntersectionObserver lazy-mount in `YouTubeEmbed.tsx` is correctly observer-disconnected on entry and on cleanup; the test-only Neon counter in `src/lib/db/index.ts` is properly gated on a single `NEXT_PUBLIC_APP_ENV === "test"` condition (DCE-friendly); `size-limit` globs use content-hash wildcards that survive Next.js chunk renames; CI wires `size-limit-action` with the correct `pull-requests: write` permission and `skip_step: build`; and the Lighthouse harness sequentially captures the locked 3-route × 2-preset matrix.

One correctness defect is critical: **the `revalidateSongCache` server action is wired to a cache tag that no code path actually registers**. `getSongBySlug` uses only React's per-request `cache()`, and neither `unstable_cache`, the `'use cache'` directive, nor any `cacheTag()` call is present in the song-page data path. `revalidateTag(\`song:${slug}\`)` will therefore be a no-op in production, so the documented "single sanctioned cache writer" contract (D-02) and the integration test's invalidation assertion (R1 AC #3) are not actually enforced by the runtime.

Beyond that, several design correctness and minor quality issues are flagged below.

## Critical Issues

### CR-01: `revalidateSongCache` writes to a tag no read path registers

**File:** `src/app/actions/cache.ts:18-20` (and consumers `scripts/seed/05-insert-db.ts:428-435`, `scripts/seed/snap-full-onsets.ts:445-453`)
**Issue:**
`revalidateSongCache(slug)` calls `revalidateTag(\`song:${slug}\`)`, but no read path in the song-page pipeline ever registers that tag:

- `src/app/songs/[slug]/page.tsx` does not call `unstable_cache`, does not have a `'use cache'` directive, and does not invoke `cacheTag()`. The route also has no static-export configuration (no `export const revalidate`, no `dynamicIO`, no `cacheComponents`).
- `src/lib/db/queries.ts:25` wraps `getSongBySlug` in `react.cache()`, which is per-request memoization only — it is **not** invalidatable via `next/cache.revalidateTag`.
- The free `vocabularyItems` SELECT in `page.tsx:42-62` is not wrapped in any caching layer at all.

The doc comment in `cache.ts:14-15` claims "page.tsx (after force-dynamic removal) is implicitly tagged by the route" — Next.js does not auto-tag routes with `song:${slug}`. Tags must be registered explicitly via `unstable_cache({...}, [...], { tags: [...] })`, `cacheTag()` inside a `'use cache'` boundary, or `fetch(..., { next: { tags: [...] } })`. None of these exist for the song page.

**Consequences:**
1. After a seed/snap rewrite, the next request to `/songs/[slug]` will read fresh data only because nothing is cached cross-request to begin with — the "invalidation" the action advertises is incidental, not engineered.
2. The integration test `tests/integration/song-page-cache.test.ts:53-60` ("second render fires 0 SELECTs") only passes because the test re-imports the page module and Vitest module-cache + React `cache()` co-resident state happen to dedupe within the same Node worker — not because any production cache actually hits. In a Vercel runtime two separate requests will hit the DB twice.
3. The third test (`revalidateTag invalidates`) will green-light because the second render *also* hits the DB, regardless of whether the tag exists — making the assertion `count("songs") > 0` a false positive that does not prove invalidation.

**Fix:** Either implement the cache or delete the action and update its consumers. Two viable shapes:

Option A — `unstable_cache` (stable in Next 15):
```ts
// src/lib/db/queries.ts
import { unstable_cache } from "next/cache";

export const getSongBySlug = unstable_cache(
  async (slug: string) => {
    const rows = await db.select().from(songs).where(eq(songs.slug, slug)).limit(1);
    const song = rows[0] ?? null;
    if (!song) return null;
    const versions = await db
      .select()
      .from(songVersions)
      .where(eq(songVersions.song_id, song.id));
    return { ...song, versions };
  },
  ["song-by-slug"],
  { tags: (slug) => [`song:${slug}`] } // dynamic tag — closure over the arg
);
```
Note that `unstable_cache` does not support per-arg tag closures directly; the typical pattern is to wrap per slug:
```ts
export const getSongBySlug = (slug: string) =>
  unstable_cache(
    async () => { /* …queries… */ },
    ["song-by-slug", slug],
    { tags: [`song:${slug}`] }
  )();
```
And do the same for the `vocabularyItems` enrich SELECT, otherwise it leaks past the cache.

Option B — `'use cache'` directive (Next 15 cacheComponents):
Enable `experimental.cacheComponents = true` in `next.config.ts`, mark the data-fetching helper with `'use cache'`, and call `cacheTag(\`song:${slug}\`)` inside it. This is the modern path and matches the "single sanctioned cache writer" contract more cleanly.

Either way, the integration test should be promoted to assert a real cross-request cache: e.g., warm via one render, mutate the underlying row directly through a different DB connection, render again WITHOUT calling `revalidateSongCache`, and assert stale data is observed; then call the action and assert fresh data. The current test cannot distinguish "Next cache" from "React per-request cache" and will green-light a no-op.

## Warnings

### WR-01: First render of `KnownWordCount` triggers an unconditional fetch in test environments

**File:** `src/app/songs/[slug]/components/KnownWordCount.tsx:24-38`
**Issue:** The mount-time `useEffect` fires `fetch("/api/review/known-count?songId=...")` on every mount. There is no `NEXT_PUBLIC_APP_ENV === "test"` short-circuit. In Playwright runs with the default route stack, this hits the API and competes with whatever assertions the spec is making (and racks up network noise that confounds size-limit / Lighthouse measurements when `npm run start` is left up between runs). Also: a `fetch` on every mount with `currentIndex >= questions.length` re-fires from the second `useEffect`, so the first render can issue *two* near-simultaneous requests — the `lastFetchedKey` gate only protects the second effect, not against the first effect overlapping with it.
**Fix:**
- Coalesce both effects into one: track an in-flight request key in a ref and abort the prior request on superseding fetches (use `AbortController`).
- Drop the response handler's silent `null` → `setCounts(null)` confusion: `r.ok ? r.json() : null` followed by `if (!data) return` means a 4xx/5xx leaves the skeleton shimmering forever. Render an explicit "could not load" state or default to `{ total: 0, known: 0, … }` so the user sees the "New to you" pill instead of an indefinite skeleton.

### WR-02: `embedState` not in the `YouTubeEmbed` init-effect dependency list

**File:** `src/app/songs/[slug]/components/YouTubeEmbed.tsx:178-392`
**Issue:** The init effect reads `embedState` indirectly (via the watchdog functional updater on line 373) and writes it (`setEmbedState("loading")`, `setEmbedState("ready")`, `setEmbedState("error")`), but `embedState` is destructured at line 69 and used to drive rendering (`embedState === "error"` at line 430). The effect dependency array (line 392) does not include `embedState`, which is correct for the writers but creates a subtle issue: if a parent re-renders and changes `embedState` to "error" via some external path (e.g. the watchdog landing during teardown), the cleanup destroys the player but the effect does not re-run because `shouldMount` and `currentId` haven't changed. In practice this is benign because nothing outside this component writes `embedState` during the player's lifetime, but the comment at line 110-113 ("re-imported above to keep this file's type contract self-documenting") obscures the actual contract.
**Fix:** Tighten the contract — make `embedState` write-only inside the init effect by reading `prevState` only via the functional updater, and document at the top of the effect that `embedState` is intentionally NOT a dependency because the effect owns it. Add an ESLint disable comment so future refactors don't inadvertently add it:
```ts
// eslint-disable-next-line react-hooks/exhaustive-deps -- effect owns embedState
}, [shouldMount, currentId, songVersionId, userId, startTracking, stopTracking, setEmbedState, _registerApi]);
```

### WR-03: IntersectionObserver effect cleanup is conditional and can leak the observer

**File:** `src/app/songs/[slug]/components/YouTubeEmbed.tsx:134-176`
**Issue:** Three early returns inside the effect skip creating the observer:
- `if (shouldMount) return;` (line 135) — returns no cleanup
- the `NEXT_PUBLIC_APP_ENV === "test"` `setShouldMount(true); return;` path (line 147) — no cleanup
- the `forceMount` `setShouldMount(true); return;` path (line 155) — no cleanup
- `if (!el) return;` (line 160) — no cleanup

This is fine because none of those branches created an observer. **However**, the actual leak risk is on line 174-175: the effect does `io.observe(el); return () => io.disconnect();` BUT inside the IO callback `io.disconnect()` is also called (line 168). If the component unmounts in the same task as `entry.isIntersecting` firing, both disconnects run — `disconnect()` is idempotent so this is safe, but the effect cleanup also fires the cleanup of the *next* effect run (e.g., when `forceMount` flips), and at that point the observer reference is the old one from the prior render. React is supposed to call cleanup before the next effect, so this is actually correct — but the dependency `[shouldMount, forceMount]` (line 176) means when `shouldMount` flips true, the effect runs again with `if (shouldMount) return;` returning *no cleanup function*. The previously-set observer's cleanup function from the prior render run is what disconnects it.

The real concern: when `forceMount` fires after the IO has already triggered (rare but possible — IO entry races with Practice tab click), the effect runs with `shouldMount=true`, returns immediately with no cleanup, and any in-flight IO callback fires `setShouldMount(true)` against an already-mounted state (wasteful re-render). Not a leak, but a wasted callback.
**Fix:** Add a `disconnected` ref guard so the observer callback bails when `shouldMount` has already flipped:
```ts
const io = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      io.disconnect();
      setShouldMount(true);
      return;
    }
  }
}, { rootMargin: "200px" });
```
Swap the order of `setShouldMount(true)` and `io.disconnect()` — disconnect first to ensure the next entries batch can't fire after we've decided.

### WR-04: `lighthouse-pick-target.ts` does not validate `medianIndex` against array length-1

**File:** `scripts/lighthouse-pick-target.ts:53-54`
**Issue:** `Math.floor(rows.length / 2)` for `rows.length === 1` yields `0`, which is fine. For `rows.length === 2` yields `1` (valid). But for `rows.length === 0` the prior check exits early — good. However, the destructure assumes `median` is non-null; it does access `median.slug` and `median.bytes` directly. If `rows[medianIndex]` were ever `undefined` (e.g., a hole due to a filter step added later), the script would crash with `TypeError: Cannot read properties of undefined (reading 'slug')` rather than producing an actionable error. Currently safe because the SELECT can't return holes, but defensive code is cheap.
**Fix:**
```ts
const median = rows[medianIndex];
if (!median) {
  console.error(`[pick-target] Internal error: medianIndex ${medianIndex} out of bounds for ${rows.length} rows.`);
  process.exit(1);
}
```

### WR-05: `snap-full-onsets.ts` runs DB writes outside an explicit transaction

**File:** `scripts/seed/snap-full-onsets.ts:419-459`
**Issue:** The `--apply` loop calls `db.update(songVersions).set({...}).where(...)` per slug, then dynamically imports `revalidateSongCache` and calls it after each write. There is no transaction grouping the lesson-rewrite and the (intended) cache invalidation, and there is no transaction grouping the 12 cohort updates atomically. If the script crashes after row 6 of 12 (e.g., the operator Ctrl-C's the `--apply` run), six songs are partially rewritten and six are not, with no resume marker. The snapshot at line 396-407 lets you restore, but only if you remember which slugs were applied — the script does not write a per-slug "applied" log. Combined with CR-01 (the `revalidateTag` is a no-op anyway), the apparent atomicity is illusory.
**Fix:** Wrap each per-slug write + revalidation in a try/catch that writes a per-slug status line to a side log (e.g., `.planning/snap-full-onsets-progress.json`), so the restore script can know which slugs to revert. Also consider batching the 12 updates into a single `Pool`-driven transaction (matches the `05-insert-db.ts` pattern at line 340-341) so a partial failure either applies all 12 or zero.

## Info

### IN-01: Unused `versions` prop in `SongContentInner`

**File:** `src/app/songs/[slug]/components/SongContent.tsx:64, 266`
**Issue:** `SongContentInner` destructures `versions` (line 64) and declares the prop type at line 41 (`versions: VersionData[]`), but the value is only ever passed in (line 266) — never read inside the function body. The component already receives `tvVersion` and `fullVersion` as separate props which is the actual contract.
**Fix:** Remove `versions` from `SongContentInnerProps`, the destructure, and the call site:
```ts
interface SongContentInnerProps {
  song: SongMeta;
  songId: string;
  // versions removed — tvVersion + fullVersion are passed directly
  activeType: "tv" | "full";
  // …rest unchanged
}
```

### IN-02: `KnownWordCount`'s second `useEffect` cleanup races with the first

**File:** `src/app/songs/[slug]/components/KnownWordCount.tsx:51-63`
**Issue:** Both effects declare a local `cancelled` flag scoped to that effect's closure. If the first effect's fetch is in-flight when `justFinished` flips, the second effect fires its own fetch and the first effect's `cancelled` stays false (it cleans up on unmount or songId change, not when justFinished changes). Result: two fetches resolve, two `setCounts` calls, last-write-wins. Not user-visible because both should return the same data, but wasteful.
**Fix:** Hoist a single shared `AbortController` ref and abort the prior request before starting a new one. Or merge both effects into one that depends on `[songId, justFinished, currentIndex, questions.length]`.

### IN-03: `package.json` dev-deps include both `@next/bundle-analyzer` and `size-limit/preset-app` — verify on disk

**File:** `package.json:73-78, 88`
**Issue:** Cosmetic — `@next/bundle-analyzer@^16.2.4` is listed but `next@^15.5.14` is the runtime. Next 16's analyzer is generally backward-compatible with Next 15 builds, but pinning to a major mismatch is fragile. If the analyzer ever publishes a breaking change to the analyzer-plugin contract assuming Next 16+ build manifest format, `npm run analyze` will silently produce wrong numbers (or crash). The actual usage today (line 14 of `next.config.ts`) is correct and should work, but the version skew is worth flagging.
**Fix:** Pin `@next/bundle-analyzer` to a version that matches `next`'s major (e.g., `^15.0.0`) to avoid surprise. If 16.x is intentionally preferred, document the rationale in the same comment block as the analyzer wiring.

### IN-04: Snap script default cohort is hardcoded — drift risk vs the FAIL report

**File:** `scripts/seed/snap-full-onsets.ts:97-110`
**Issue:** The 12-slug `DEFAULT_COHORT` is hardcoded with the comment "Keeping these explicit avoids accidental writes when the report file changes." That's a defensible choice, but if `data/full-onset-report-playerpath.json` is later regenerated and the cohort grows or shrinks, the script will silently apply to the stale list. There is no assertion that the hardcoded list still matches the report at run time.
**Fix:** Add a soft check at startup: if `data/full-onset-report-playerpath.json` exists, parse it and warn (do not fail) if `DEFAULT_COHORT` and the report diverge. This preserves the "explicit list" property but surfaces drift.

---

_Reviewed: 2026-04-28_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
