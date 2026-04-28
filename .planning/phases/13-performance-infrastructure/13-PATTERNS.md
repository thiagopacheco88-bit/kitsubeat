# Phase 13: Performance Infrastructure — Pattern Map

**Mapped:** 2026-04-28
**Files analyzed:** 14 (5 modified, 9 created)
**Analogs found:** 11 / 14 (3 greenfield: `.size-limit.cjs`, `next.config.ts` analyzer wrap, IntersectionObserver lazy-mount)

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/songs/[slug]/page.tsx` | route (server-component) | request-response | self (existing — patch in place) | exact |
| `src/app/songs/[slug]/components/SongContent.tsx` | component (client root) | event-driven | self (existing — patch in place) | exact |
| `src/app/songs/[slug]/components/KnownWordCount.tsx` | component (client) | request-response (client-fetch) | `KnownWordCount.tsx` lines 27-40 (already has fetch shape) | exact |
| `src/app/songs/[slug]/components/YouTubeEmbed.tsx` | component (client) | event-driven (lifecycle) | self + `LyricsPanel` IO usage hunt (none found) | role-match |
| `src/app/songs/[slug]/components/PlayerContext.tsx` | provider (client) | event-driven | self (existing — extend for `forceMount`) | exact |
| `src/lib/db/index.ts` | infrastructure (DB client) | transform (fetch shim) | `fetchWithColdStartRetry` lines 39-54 (existing fetch wrap pattern) | exact |
| `next.config.ts` | config | n/a | `@next/bundle-analyzer` README (no in-repo analog) | none |
| `package.json` | config | n/a | self (existing scripts block) | exact |
| `.github/workflows/qa-suite.yml` | config (CI) | event-driven | `pr-checks` job lines 42-69 | exact |
| `.size-limit.cjs` | config | n/a | none (greenfield) | none |
| `tests/integration/song-page-cache.test.ts` | test (integration) | request-response | `regression-stale-lesson-data.test.ts` (DB-gated integration) | exact |
| `tests/e2e/iframe-defer.spec.ts` (new) | test (e2e) | event-driven | `regression-geo-fallback.spec.ts` + `player-load.spec.ts` | exact |
| `scripts/lighthouse-baseline.ts` | script (one-shot) | batch | `scripts/qa/measure-suite-runtime.ts` (sequential CLI orchestration) | role-match |
| `scripts/lighthouse-pick-target.ts` | script (one-shot) | CRUD (read DB) | `scripts/audit/verse-token-distribution.ts` (DB read + file write) | exact |
| `scripts/seed/snap-full-onsets.ts` (modify) | script (lesson-write) | CRUD | self (extend with revalidate hook) | exact |
| `scripts/seed/05-insert-db.ts` (modify) | script (lesson-write) | CRUD | self (extend with revalidate hook) | exact |

## Pattern Assignments

### `src/app/songs/[slug]/page.tsx` (route, request-response)

**Analog:** self — D-01 patches the existing file.

**Imports pattern** (lines 1-8, current):
```typescript
import { notFound } from "next/navigation";
import { inArray } from "drizzle-orm";
import { getSongBySlug, getKnownWordCountForSong } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { vocabularyItems } from "@/lib/db/schema";
import type { Lesson, VocabEntry, Localizable, KanjiBreakdown } from "@/lib/types/lesson";
import { PLACEHOLDER_USER_ID } from "@/lib/user-prefs";
import SongContent from "./components/SongContent";
```

**Lines to delete (per D-01, D-03):**
- Line 10: `export const dynamic = "force-dynamic";` — REMOVE entirely. Route becomes statically generatable once per-user dependency is gone.
- Lines 3 & 7: drop `getKnownWordCountForSong` and `PLACEHOLDER_USER_ID` from imports.
- Lines 56-59: drop `Promise.all` wrapping `getKnownWordCountForSong`. Replace with `const enrichRows = await enrichQuery;`.
- Line 115: drop `initialKnown={initialKnown}` prop on `<SongContent>`.

**Pattern to add (revalidateTag tag namespacing — informational; consumers of D-02 use this same tag string):**
```typescript
// Tag pattern: `song:${slug}` — matches what the seed-script revalidate hooks
// must call. Centralized here so a future lesson-edit surface (admin UI) imports
// from the same constant rather than re-deriving the string.
// Optional: export const REVALIDATE_TAG = (slug: string) => `song:${slug}`;
```

**Generation primitive note (D-01):** No explicit `dynamic = "force-static"` required — the SPEC says removing `force-dynamic` is sufficient once the per-user fetch is gone. `getSongBySlug`'s React `cache()` wrapper (queries.ts:25) stays — it provides intra-request dedupe across `generateMetadata` + page body and does NOT poison the cross-request cache.

---

### `src/app/songs/[slug]/components/KnownWordCount.tsx` (component, request-response)

**Analog:** self — D-03 already has the exact fetch shape needed; flip it from "post-session refresh" to "always-on-mount".

**Existing fetch pattern** (lines 27-40 — REUSE this shape on initial mount):
```typescript
let cancelled = false;
fetch(`/api/review/known-count?songId=${encodeURIComponent(songId)}`)
  .then((r) => (r.ok ? r.json() : null))
  .then((data) => {
    if (cancelled || !data) return;
    setCounts(data);
  })
  .catch(() => {
    /* keep last-known counts; no user-facing error for a background refresh */
  });
return () => {
  cancelled = true;
};
```

**Patch shape (D-03):**
- Drop `initial: { total, known, mastered, learning }` from `Props` interface (lines 5-8).
- Replace `useState(initial)` (line 11) with `useState<Counts | null>(null)`.
- Add a mount-time `useEffect(() => { ... }, [songId])` that runs the fetch above on first mount (mirror lines 27-40 pattern).
- Render skeleton when `counts === null`:
  ```tsx
  if (counts === null) {
    return (
      <span className="inline-flex h-6 w-32 animate-pulse rounded-full bg-gray-800/60" />
    );
  }
  ```
- Existing post-session refresh effect (lines 20-40) stays unchanged — it already runs after `justFinished` and overwrites the state.

**Why this is safe:** `/api/review/known-count` exists with `Cache-Control: private, no-store` (route.ts:36) — the per-user fetch never poisons any CDN/SW. `dynamic = "force-dynamic"` on the route (route.ts:20) keeps user-specific data live.

---

### `src/app/songs/[slug]/components/SongContent.tsx` (component, event-driven)

**Analog:** self — D-03 + D-08 patches.

**D-03 deletions:**
- Line 43: drop `initialKnown` from props.
- Line 48: drop `initialKnown: { total: number; ... }` from interface.
- Line 104: change `<KnownWordCount songId={songId} initial={initialKnown} />` → `<KnownWordCount songId={songId} />`.

**D-08 force-mount-on-Practice — pattern:**
The existing `<PlayerProvider key={activeType}>` (line 80) already remounts the provider on version toggle. The cleanest force-mount surface is a **state lift on `<PlayerProvider>`** (Claude's discretion per CONTEXT.md):

```typescript
// NEW state inside SongContent body, near line 60-63:
const [forceMountIframe, setForceMountIframe] = useState(false);

// Reset on activeType remount via the same key trick — useState initializes
// fresh on each mount, so no manual reset needed.

// Pass to PlayerProvider as a prop the IO gate inside YouTubeEmbed reads via
// usePlayer(), OR pass directly to <YouTubeEmbed forceMount={...}>.
```

Then wire the Practice tab open trigger at the existing tab-change site (lines 71-77 — extend the existing `useEffect` watching `activeTab`):
```typescript
useEffect(() => {
  if (isFirstTabRender.current) { ... }
  if (activeTab === "practice") {
    setForceMountIframe(true);
  }
  tabSectionRef.current?.scrollIntoView(...);
}, [activeTab]);
```

**Existing lazy-load pattern (line 16, untouched):**
```typescript
const ExerciseTab = lazy(() => import("./ExerciseTab"));
```
ExerciseTab stays code-split. Force-mount is independent of the Suspense boundary — the iframe just gets evicted from its IO-gate when Practice opens.

---

### `src/app/songs/[slug]/components/YouTubeEmbed.tsx` (component, event-driven — IntersectionObserver lazy-mount)

**Analog for IO observer:** none in repo (greenfield IO usage). Closest mental model: `WATCHDOG_MS` setTimeout pattern at lines 315-320 (existing self-managed lifecycle resource with cleanup in unmount return). Apply the same shape: create observer → store ref → cleanup in return.

**Existing test-only gate to preserve** (lines 206-212 — D-20):
```typescript
if (process.env.NEXT_PUBLIC_APP_ENV === "test") {
  window.__kbPlayer = event.target;
}
```
**Constraint:** any new test-only hook for the IO defer (e.g., `window.__kbForceIframeMount`) MUST follow the same single-condition gate pattern. NO `||` with `NODE_ENV`. See `src/stores/exerciseSession.ts:382` for the canonical reference comment ("Single condition gate, audit grep returns only this site").

**Mount-gate pattern shape (D-05, D-06, D-07):**
```typescript
// NEW state at top of component body (near line 71):
const [shouldMount, setShouldMount] = useState(false);
const placeholderRef = useRef<HTMLDivElement>(null);

// NEW effect — runs once on mount, separate from the player init effect
// (which still depends on shouldMount becoming true).
useEffect(() => {
  if (shouldMount) return; // already mounted — disconnect not needed
  const el = placeholderRef.current;
  if (!el) return;

  // Test gate: skip the IO and force-mount in test env so existing player
  // specs (player-load.spec.ts asserting iframe within 10s) keep passing
  // without per-spec scroll wiring. Single-condition gate per D-20.
  if (process.env.NEXT_PUBLIC_APP_ENV === "test") {
    setShouldMount(true);
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setShouldMount(true);
          io.disconnect();
          return;
        }
      }
    },
    { rootMargin: "200px" }, // D-07 — locked
  );
  io.observe(el);
  return () => io.disconnect();
}, [shouldMount]);

// Then gate the existing player-init effect (line 125-338) on `shouldMount`:
useEffect(() => {
  if (!shouldMount) return;
  // ... existing init body unchanged ...
}, [shouldMount, currentId, songVersionId, userId, ...]);
```

**Placeholder JSX (D-06):** swap the container at line 383-390. Render `placeholderRef`'d skeleton when `!shouldMount`:
```tsx
{!shouldMount ? (
  <div
    ref={placeholderRef}
    data-yt-state="placeholder"
    className="aspect-video w-full animate-pulse rounded-lg bg-zinc-800"
  />
) : embedState === "error" ? (
  <div data-yt-state="error" className="aspect-video w-full ..."> ... </div>
) : (
  <div ref={containerRef} data-yt-state={embedState} ... />
)}
```

`aspect-video` matches the iframe's final dimensions exactly — zero CLS on mount.

**Force-mount path (D-08):** read `forceMount` from `usePlayer()` (or as a prop) and short-circuit the IO setup:
```typescript
const { forceMount } = usePlayer(); // assuming D-08 lifts state into context
useEffect(() => {
  if (forceMount && !shouldMount) {
    setShouldMount(true);
  }
}, [forceMount, shouldMount]);
```

---

### `src/app/songs/[slug]/components/PlayerContext.tsx` (provider, event-driven)

**Analog:** self — extend `PlayerState` interface and `PlayerProvider` body (D-08).

**Existing API pattern** (lines 40-44, 134-144 — `_registerApi` + `useState`-driven flag):
```typescript
export interface PlayerImperativeApi {
  seekTo: (ms: number) => void;
  play: () => void;
  pause: () => void;
}

const _registerApi = useCallback((api: PlayerImperativeApi | null) => {
  apiRef.current = api;
  setApiReady(api !== null);
  ...
}, []);
```

**D-08 additive shape (planner picks the exact API; one option):**
```typescript
// In PlayerState interface (near line 84):
forceMount: boolean;
setForceMount: (v: boolean) => void;

// In PlayerProvider body (near line 119):
const [forceMount, setForceMount] = useState(false);

// In context value (lines 222-238): add forceMount + setForceMount.
```

`PlayerProvider key={activeType}` (SongContent.tsx:80) already triggers fresh `useState(false)` on version toggle — no manual reset needed.

**Constraint preservation (D-19):** `seekTo`, `play`, `pause`, `isReady`, `embedState` MUST remain on the context surface unchanged. Listening Drill (`ListeningDrillCard.tsx`, EXER-06 spec) consumes these and the e2e (`advanced-drill-quota.spec.ts`) MUST stay green.

---

### `src/lib/db/index.ts` (infrastructure, transform)

**Analog:** self — `fetchWithColdStartRetry` (lines 39-54) is the existing fetch-wrap pattern; the test-only counter shim (D-04) layers on top of it.

**Existing fetch wrap pattern** (lines 36-54):
```typescript
const COLD_START_RETRIES = 2;
const COLD_START_BACKOFF_MS = 250;

const fetchWithColdStartRetry: typeof fetch = async (input, init) => {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= COLD_START_RETRIES; attempt++) {
    try {
      return await fetch(input, init);
    } catch (err) {
      lastErr = err;
      if (attempt < COLD_START_RETRIES) {
        await new Promise((r) =>
          setTimeout(r, COLD_START_BACKOFF_MS * (attempt + 1))
        );
      }
    }
  }
  throw lastErr;
};
```

**D-04 instrumented-counter shim — extend this same `fetch`-wrap pattern:**
```typescript
// Test-only query counter. Gated on NEXT_PUBLIC_APP_ENV === 'test' (single
// condition, mirrors src/stores/exerciseSession.ts:382). In dev/prod,
// `process.env.NEXT_PUBLIC_APP_ENV !== "test"` so this entire branch is
// dead-code-eliminated by Next's build-time inlining — zero bundle bytes.
//
// The integration test reads the counter via dynamic import of this module
// and asserts the cache hit zeroes out songs/song_versions/vocabulary_items
// SELECT counts on the second request to the same slug.

interface QueryCounter {
  reset(): void;
  count(table: string): number;
}

let _queryCounter: QueryCounter | null = null;

if (process.env.NEXT_PUBLIC_APP_ENV === "test") {
  // D-20 single-condition gate. Canonical site: src/stores/exerciseSession.ts:382.
  // Integration tests get NEXT_PUBLIC_APP_ENV=test from tests/integration/setup.ts
  // (matches CI env at .github/workflows/qa-suite.yml:51).
  const counts = new Map<string, number>();
  _queryCounter = {
    reset: () => counts.clear(),
    count: (table) => counts.get(table) ?? 0,
  };
  // Wrap fetchWithColdStartRetry: parse the SQL from `init.body`, regex-match
  // table names, increment counter. Real Neon HTTP body shape: JSON with a
  // `query` field. Pattern: /\b(songs|song_versions|vocabulary_items)\b/g.
}

export const __testQueryCounter = _queryCounter; // undefined in prod
```

**Test-only export gating (D-20):** matches the project's "single-condition gate, no `||` with NODE_ENV" rule (see `exerciseSession.ts:371-384`). Vitest's NODE_ENV=test is acceptable for the integration test (server-side, never bundled).

---

### `next.config.ts` (config)

**Analog:** none in repo. Use `@next/bundle-analyzer` standard wiring.

**Patch (D-09):**
```typescript
import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  /* config options here */
};

const enableAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default enableAnalyzer(nextConfig);
```

**Trigger:** `ANALYZE=true npm run build` produces the analyzer reports in `.next/analyze/`. Not enabled in CI per D-09 — investigation tool only.

---

### `package.json` (config)

**Analog:** self — existing scripts pattern (lines 6-45).

**Existing script pattern (npm-script + tsx invocation):**
```json
"audit:verse-tokens": "tsx --tsconfig tsconfig.scripts.json scripts/audit/verse-token-distribution.ts",
"test:integration": "vitest run tests/integration/",
"test:e2e": "playwright test",
```

**D-09 + D-13 + D-14 — new scripts:**
```json
"size": "size-limit",
"analyze": "ANALYZE=true next build",
"lighthouse:baseline": "tsx --tsconfig tsconfig.scripts.json scripts/lighthouse-baseline.ts",
"lighthouse:pick-target": "tsx --tsconfig tsconfig.scripts.json scripts/lighthouse-pick-target.ts"
```

**New devDependencies (D-09):**
```json
"size-limit": "^11.x",
"@size-limit/preset-app": "^11.x",
"@next/bundle-analyzer": "^15.x"
```

**Lighthouse:** prefer the `lighthouse` CLI as a devDependency (no API key, runs against localhost). Add `"lighthouse": "^12.x"` if the script invokes it programmatically; otherwise the script can `npx lighthouse` and avoid pinning. Planner picks.

---

### `.size-limit.cjs` (config — greenfield)

**Analog:** none. Use `@size-limit/preset-app` standard config shape. Project uses `"type": "module"` in package.json (line 5) — config MUST be `.cjs` (or pull from `.size-limit.json` to avoid the ESM/CJS dance).

**Pattern (D-09, D-10, D-12):**
```javascript
// .size-limit.cjs
//
// Phase 13 D-09/D-10/D-12: budget /songs/[slug] First Load JS at 50 KB gzipped.
// Glob patterns survive Next.js content-hashed filenames. Path set derived
// from `next build` output 2026-04-24 (RESEARCH.md Appendix A); update this
// list if a future Next.js minor changes the chunk layout.
//
// Why preset-app: matches the Next.js production bundle measurement model
// (gzipped, includes shared chunks pulled by the route).
module.exports = [
  {
    name: "/songs/[slug] First Load JS (gzipped)",
    path: [
      ".next/static/chunks/app/songs/[slug]/page-*.js",
      ".next/static/chunks/main-*.js",
      ".next/static/chunks/framework-*.js",
      ".next/static/chunks/webpack-*.js",
      ".next/static/chunks/[id]-*.js",
    ],
    limit: "50 KB",
    gzip: true,
  },
];
```

**Boundary preservation (D-12):** ONLY `/songs/[slug]`. NO entries for `/`, `/songs`, `/path`, `/vocabulary`, `/review`, `/kana`. SPEC out-of-scope list is verbatim.

---

### `.github/workflows/qa-suite.yml` (config — CI)

**Analog:** existing `pr-checks` job (lines 42-69).

**Existing pr-checks pattern** (lines 42-69):
```yaml
pr-checks:
  name: PR checks (unit + integration + qa)
  if: github.event_name == 'pull_request'
  runs-on: ubuntu-latest
  timeout-minutes: 10
  env:
    TEST_DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
    NEXT_PUBLIC_APP_ENV: test
  steps:
    - name: Checkout
      uses: actions/checkout@v4
    - name: Setup Node 20
      uses: actions/setup-node@v4
      with:
        node-version: "20"
        cache: "npm"
    - name: Install deps
      run: npm ci
    - name: Seed test DB
      run: npm run test:seed
    - name: Run PR suite (qa + unit + integration)
      run: npm run test:ci-pr
```

**D-13 patch — extend `pr-checks` (NOT a new job, NOT `nightly-full`):**

Add `permissions:` block at job level (D-11 — needed for `andresz1/size-limit-action` PR comment):
```yaml
pr-checks:
  name: PR checks (unit + integration + qa)
  if: github.event_name == 'pull_request'
  runs-on: ubuntu-latest
  timeout-minutes: 10
  permissions:
    pull-requests: write   # NEW — for size-limit-action PR comment
  env:
    TEST_DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
    NEXT_PUBLIC_APP_ENV: test
  steps:
    # ... existing steps unchanged ...
    - name: Run PR suite (qa + unit + integration)
      run: npm run test:ci-pr

    # D-09/D-11/D-13 — NEW steps after test:ci-pr
    - name: Build
      run: npm run build

    - name: Bundle size check
      uses: andresz1/size-limit-action@v1
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        skip_step: build       # already built above
        package_manager: npm
```

**Boundaries preserved:**
- `nightly-full` job inherits no changes (CONTEXT.md: "nightly-full inherits the check via job-list reuse" is informational only — the size check runs on PRs).
- No `paths:` filter — bundle check runs on every PR (D-13).
- `concurrency:` block (lines 36-39) untouched.
- Zero-flake policy (header comment lines 20-25) preserved — no `continue-on-error`, no retries.

---

### `tests/integration/song-page-cache.test.ts` (test — integration)

**Analog:** `tests/integration/regression-stale-lesson-data.test.ts` (similar shape: integration test, optional DB gate, real server-action calls).

**Imports + skip-gate pattern** (regression-stale-lesson-data.test.ts lines 34-48):
```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { /* the route handler or page component */ } from "@/app/songs/[slug]/page";
import {
  getTestDb,
  resetTestProgress,
  TEST_USER_ID,
} from "../support/test-db";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;
```

**setup file already swaps DATABASE_URL → TEST_DATABASE_URL** (`tests/integration/setup.ts:48-50`) — no per-test env juggling needed.

**Cache acceptance test pattern (SPEC AC #1, #2):**
```typescript
import { revalidateTag } from "next/cache";
import { __testQueryCounter } from "@/lib/db";

describeIfTestDb("song-page cache", () => {
  let slug: string;

  beforeAll(async () => {
    // Mirror regression-stale-lesson-data.test.ts:259-275 — pull a real seeded
    // slug with lesson IS NOT NULL.
    const db = getTestDb();
    const rows = (await db.execute(sql`
      SELECT s.slug FROM songs s
      JOIN song_versions v ON v.song_id = s.id
      WHERE v.lesson IS NOT NULL
      LIMIT 1
    `)) as unknown as Array<{ slug: string }>;
    if (!rows[0]) throw new Error("No seeded song with lesson — run npm run seed:dev");
    slug = rows[0].slug;
  });

  it("second request hits 0 Neon SELECTs for songs/song_versions/vocabulary_items", async () => {
    __testQueryCounter?.reset();
    await renderSongPage(slug); // warm
    __testQueryCounter?.reset();
    await renderSongPage(slug); // cached
    expect(__testQueryCounter?.count("songs")).toBe(0);
    expect(__testQueryCounter?.count("song_versions")).toBe(0);
    expect(__testQueryCounter?.count("vocabulary_items")).toBe(0);
  });

  it("revalidateTag invalidates the cache", async () => {
    await renderSongPage(slug); // warm
    revalidateTag(`song:${slug}`);
    __testQueryCounter?.reset();
    await renderSongPage(slug);
    expect(__testQueryCounter?.count("songs")).toBeGreaterThan(0);
  });
});
```

**`renderSongPage`** is planner's choice — could be importing the page module and calling its async default, or fetching `http://localhost:7000/songs/${slug}` against `npm run start`. The shape that's cleanest with Vitest's environment is a direct module import (no HTTP layer). Planner picks based on what proves the cache without over-coupling to Next internals.

---

### `tests/e2e/iframe-defer.spec.ts` (test — e2e)

**Analogs:**
- `tests/e2e/regression-geo-fallback.spec.ts` (route-intercept + assertion-on-data-attr pattern)
- `tests/e2e/player-load.spec.ts` (initial-paint iframe wait pattern, lines 36-38)

**Imports + fixture pattern** (regression-geo-fallback.spec.ts lines 41-45):
```typescript
import { test, expect } from "../support/fixtures";

const SLUG = "again-yui";
```

**Initial-DOM iframe assertion pattern (SPEC AC #4):**
```typescript
test("iframe is absent on initial DOM, present after scroll", async ({ page }) => {
  await page.goto(`/songs/${SLUG}`);

  // First wait for the placeholder to confirm the page rendered.
  await expect(page.locator('[data-yt-state="placeholder"]')).toBeVisible({
    timeout: 10_000,
  });

  // SPEC AC #4: iframe count is 0 on initial DOM.
  expect(await page.locator('iframe[src*="youtube"]').count()).toBe(0);

  // Scroll the placeholder into view (D-07 rootMargin: 200px — IO triggers
  // before placeholder fully reaches viewport).
  await page.locator('[data-yt-state="placeholder"]').scrollIntoViewIfNeeded();

  // SPEC AC #5: iframe present after scroll, bounded wait.
  await page.waitForSelector('iframe[src*="youtube"]', { timeout: 10_000 });
});
```

**IMPORTANT — adjust existing `player-load.spec.ts`** (D-19, D-20):
- Lines 36-38 currently assert `iframe[src*="youtube.com"]` within 10s on initial paint.
- After D-05 ships, the iframe is gated behind IO. Two options for the planner:
  1. Insert `await page.locator('[data-yt-state="placeholder"]').scrollIntoViewIfNeeded()` before the iframe wait.
  2. Rely on the `NEXT_PUBLIC_APP_ENV === 'test'` short-circuit (CONTEXT.md: test-only force-mount path) so legacy specs don't need scroll wiring.
- D-20 says test-only state is gated on `NEXT_PUBLIC_APP_ENV === 'test'` — option 2 is consistent with the rest of the project. Option 1 is more honest about the production behavior. Planner picks; if the test-env short-circuit is chosen, it MUST follow the single-condition gate (no `||`), and the e2e iframe-defer spec above MUST set its own override (e.g., a query param or a direct localStorage flag that flips `forceMount`) to actually exercise the IO path.

**Listening Drill preservation** (D-19, SPEC AC #6): `tests/e2e/advanced-drill-quota.spec.ts` opens Practice tab → Advanced Drills → Listening Drill. D-08's force-mount-on-Practice keeps this green WITHOUT modifying that spec. Verify by re-running.

---

### `scripts/lighthouse-baseline.ts` (script — batch orchestration)

**Analog:** `scripts/qa/measure-suite-runtime.ts` (sequential CLI orchestration, table-print, file-write).

**Sequential CLI invocation pattern** (measure-suite-runtime.ts lines 33, 79):
```typescript
import { spawnSync } from "node:child_process";
// ...
function runLayer(layer: Layer): LayerResult {
  process.stdout.write(`\n[measure-suite-runtime] -> npm run ${layer.name}\n`);
  // spawnSync(...) returns exit code; capture timing
}
```

**Adapted shape for Lighthouse (D-14, D-15, D-16):**
```typescript
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = "http://localhost:7000";
const OUT_DIR = resolve(
  process.cwd(),
  ".planning/phases/13-performance-infrastructure/lighthouse-baseline"
);

interface Run { route: string; preset: "mobile" | "desktop"; outFile: string; }

const RUNS: Run[] = [
  { route: "/", preset: "mobile",  outFile: "home-mobile.json" },
  { route: "/", preset: "desktop", outFile: "home-desktop.json" },
  { route: "/songs", preset: "mobile",  outFile: "catalog-mobile.json" },
  { route: "/songs", preset: "desktop", outFile: "catalog-desktop.json" },
  // /songs/[slug] target picked by lighthouse-pick-target.ts
];

mkdirSync(OUT_DIR, { recursive: true });
for (const r of RUNS) {
  const url = `${BASE}${r.route}`;
  const out = resolve(OUT_DIR, r.outFile);
  spawnSync("npx", [
    "lighthouse", url,
    `--preset=${r.preset === "mobile" ? "mobile" : "desktop"}`,
    "--output=json",
    `--output-path=${out}`,
    "--chrome-flags=--headless",
    "--quiet",
  ], { stdio: "inherit" });
}
```

**Storage path (D-16):** `.planning/phases/13-performance-infrastructure/lighthouse-baseline/{home,catalog,song}-{mobile,desktop}.json` — matches the directory CONTEXT.md names. Add a `.gitignore` entry inside the directory (or commit the JSON; planner picks per CONTEXT.md "raw `lighthouse --output=json` results dumped" wording — the `13-SUMMARY.md` table is the durable artifact).

**Pre-condition:** the script assumes `npm run start` is running. Document this in the script header (mirror `measure-suite-runtime.ts:18-22` usage block).

---

### `scripts/lighthouse-pick-target.ts` (script — DB read + file write)

**Analog:** `scripts/audit/verse-token-distribution.ts` (DB query + file write + dotenv loading).

**dotenv + DB pattern** (verse-token-distribution.ts lines 22-29):
```typescript
import { resolve, join } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { writeFileSync, mkdirSync } from "fs";
import { Client } from "@neondatabase/serverless";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: join(resolve(__dirname, "..", ".."), ".env.local") });
```

**Adapted for D-17:**
```typescript
// scripts/lighthouse-pick-target.ts
//
// Picks the song closest to the catalog median by lesson JSONB byte size.
// Writes the chosen slug to lighthouse-baseline/target-song.txt so subsequent
// `npm run lighthouse:baseline` runs (and Phase 19 re-runs) target the SAME
// representative slug.

import { config } from "dotenv";
import { resolve, join } from "path";
import { fileURLToPath } from "url";
import { writeFileSync, mkdirSync } from "fs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: join(resolve(__dirname, ".."), ".env.local") });

const { getDb } = await import("../src/lib/db/index.js");
const { sql } = await import("drizzle-orm");

const db = getDb();
const rows = (await db.execute(sql`
  SELECT s.slug, octet_length(v.lesson::text) AS bytes
    FROM songs s
    JOIN song_versions v ON v.song_id = s.id
   WHERE v.lesson IS NOT NULL
   ORDER BY bytes ASC
`)) as unknown as Array<{ slug: string; bytes: number }>;

const median = rows[Math.floor(rows.length / 2)];
const outDir = resolve(__dirname, "../.planning/phases/13-performance-infrastructure/lighthouse-baseline");
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "target-song.txt"), median.slug, "utf-8");
console.log(`[pick-target] median slug: ${median.slug} (${median.bytes} bytes)`);
```

**Reproducibility note (D-17):** writes to a tracked-or-ignored text file the planner picks; CONTEXT.md says "recorded in SUMMARY.md so Phase 19 can re-run against the same target" — the script writes the file, and the SUMMARY.md authoring step copies the slug into the table.

---

### `scripts/seed/snap-full-onsets.ts` + `scripts/seed/05-insert-db.ts` (modify — revalidateTag hook)

**Analog:** the existing snap script (snap-full-onsets.ts:413-454) — APPLY phase loop. The revalidate call lands inside the same loop.

**Existing apply-loop pattern (snap-full-onsets.ts lines 419-447):**
```typescript
for (const p of plans) {
  try {
    const newLesson = { ... };
    await db.update(songVersions).set({ ... })
      .where(eq(songVersions.id, p.song_version_id));
    applied++;
    process.stdout.write(`\r  ${applied}/${plans.length} applied`);
  } catch (err) {
    failed.push(`${p.slug}: ${(err as Error).message}`);
  }
}
```

**D-02 hook — add after the successful `db.update` call:**

Scripts run in Node (NOT inside a Next.js request) — direct `revalidateTag` import from `next/cache` does NOT work outside a Next.js render context. The planner must pick from CONTEXT.md "Claude's Discretion":
1. **Server-action wrapper:** create `src/app/actions/cache.ts` exporting `revalidateSongCache(slug)` as a server action, then `await revalidateSongCache(p.slug)` from the script.
2. **API route:** `POST /api/admin/revalidate-song` with a shared-secret header; script `await fetch(...)`s it after each update.
3. **Direct `revalidateTag` via Next.js internal:** unstable; not recommended.

**Recommendation (lowest blast radius):** option 1 — server action. Server actions can be imported and awaited from any Node script that has `DATABASE_URL` set, and the existing seed-script call chain (snap-full-onsets.ts:328 already does `await import("../../src/lib/db/index.js")`) shows the pattern for runtime-importing app-tier modules from scripts. Server-action import shape:
```typescript
const { revalidateSongCache } = await import("../../src/app/actions/cache.js");
// ... after db.update succeeds:
await revalidateSongCache(p.slug);
```

**Same hook pattern for `05-insert-db.ts`:** the upsert loop (read the file from line 1-80 onward) writes per-slug. Same `revalidateSongCache(slug)` call after a successful upsert.

**Risk acknowledged (D-02):** future writers that forget to revalidate cause stale lessons. Mitigation per CONTEXT.md: centralize the lesson-write surface so a missed revalidate is a code-review smell. The planner may consider a thin wrapper module (`src/lib/db/lesson-writes.ts`) that all writers go through; not strictly required for Phase 13.

---

## Shared Patterns

### Test-only state gating (single-condition `NEXT_PUBLIC_APP_ENV === 'test'`)

**Source:** `src/stores/exerciseSession.ts:371-384` (canonical reference, includes audit comment).
**Apply to:** any test-only hook in `YouTubeEmbed.tsx` (IO defer), `src/lib/db/index.ts` (query counter export), and the new e2e iframe-defer spec.

```typescript
// Gate is a SINGLE condition: `process.env.NEXT_PUBLIC_APP_ENV === 'test'`.
// In dev (NEXT_PUBLIC_APP_ENV unset) and production (NEXT_PUBLIC_APP_ENV='production'
// or 'staging'), the guarded code is `false` and tree-shaken.
//
// Audit: grep -n "NEXT_PUBLIC_APP_ENV" must return only this comparison and
// peer test-only sites; no `||`, no `process.env.NODE_ENV` fallback.
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_APP_ENV === "test") {
  // test-only assignment
}
```

**Rationale (D-20):** Next.js inlines `NEXT_PUBLIC_*` at build time. Single-condition gate guarantees dead-code elimination — no test bytes in the production bundle, which also keeps the 50 KB budget achievable.

---

### Three-layer test discipline (D-18)

**Source:** CONTEXT.md decision 2026-04-24 + SPEC.md constraint.
**Apply to:** every change in Phase 13.

| Layer | Command | Phase 13 changes covered |
|---|---|---|
| Unit | `npm run test:unit` | `.size-limit.cjs` regex helpers if any; `lighthouse-pick-target.ts` median calc if extracted |
| Integration | `npm run test:integration` | `tests/integration/song-page-cache.test.ts` (cache acceptance, AC #1+#2+#3) |
| E2E (Playwright) | `npm run test:e2e` | `tests/e2e/iframe-defer.spec.ts` (AC #4+#5) + existing `advanced-drill-quota.spec.ts` re-run (AC #6) + adjusted `player-load.spec.ts` |
| CI | `npm run build` + `npm run size` (CI) | AC #7+#8+#9+#10 |

**`npm run build` passing alone is INSUFFICIENT** — the constraint is that every code path needs an actual test or CI assertion exercising it.

---

### Integration test DB gate

**Source:** `tests/integration/regression-stale-lesson-data.test.ts:47-48` + `tests/integration/setup.ts:38-50`.
**Apply to:** `tests/integration/song-page-cache.test.ts`.

```typescript
const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

describeIfTestDb("...", () => { /* tests */ });
```

The `setup.ts` file (loaded via `vitest.config.ts:52`) swaps `DATABASE_URL → TEST_DATABASE_URL` BEFORE any module-level `db` proxy import resolves. No per-test env juggling.

---

### dotenv-then-import-DB ordering for scripts

**Source:** `scripts/seed/snap-full-onsets.ts:37-38` (top), `:328-332` (lazy import).
**Apply to:** `scripts/lighthouse-pick-target.ts`, the modified `scripts/seed/snap-full-onsets.ts` revalidate hook, the modified `scripts/seed/05-insert-db.ts` revalidate hook.

```typescript
import { config } from "dotenv";
config({ path: ".env.local" });
// ... THEN any DB-touching import:
const { getDb } = await import("../../src/lib/db/index.js");
```

The DB client is a Proxy that defers `DATABASE_URL` validation to first access (`src/lib/db/index.ts:91-100`), so as long as `dotenv` runs before any `db.*` operation, the Proxy resolves cleanly.

---

### Tag-namespace convention for cache invalidation

**Source:** D-02 — locked.
**Apply to:** `src/app/songs/[slug]/page.tsx` (read site, implicit via Next's static route + tag); the new `revalidateSongCache` server action; the `tests/integration/song-page-cache.test.ts` `revalidateTag('song:${slug}')` call.

```typescript
// Tag string format: `song:${slug}` — exact, no variants.
// Reader: Next.js static route (page.tsx after force-dynamic removed)
// Writer: server action revalidateSongCache(slug) called from seed scripts
//         and any future admin lesson-edit surface.
```

---

## No Analog Found

| File | Role | Data Flow | Reason / Approach |
|---|---|---|---|
| `.size-limit.cjs` | config | n/a | Greenfield. Use `@size-limit/preset-app` standard config. CommonJS extension required — project is `"type": "module"`. |
| `next.config.ts` analyzer wrap | config | n/a | Greenfield. Use `@next/bundle-analyzer` standard `withBundleAnalyzer` HOC. |
| IntersectionObserver lazy-mount in `YouTubeEmbed.tsx` | component | event-driven | No existing IO usage in the repo (`grep IntersectionObserver src/` returned 0 matches). Mental model is the existing `WATCHDOG_MS` setTimeout (YouTubeEmbed.tsx:315-320): create resource ref → cleanup in unmount return. Pattern shape provided in YouTubeEmbed assignment above. |

## Metadata

**Analog search scope:**
- `src/app/songs/[slug]/components/` — all components
- `src/lib/db/` — DB client + queries
- `src/stores/` — for test-gating pattern
- `src/app/api/review/known-count/` — fetch endpoint
- `tests/integration/` — DB-gated test pattern
- `tests/e2e/` — Playwright pattern
- `tests/support/` — fixtures + test-db
- `scripts/seed/` — lesson-write scripts (snap-full-onsets, 05-insert-db)
- `scripts/qa/` — measure-suite-runtime (orchestration)
- `scripts/audit/` — verse-token-distribution (DB-read + file-write)
- `.github/workflows/` — qa-suite.yml
- `next.config.ts`, `package.json`, `vitest.config.ts`, `playwright.config.ts`

**Files scanned:** ~25
**Files read in full:** 11 (page.tsx, SongContent.tsx, KnownWordCount.tsx, YouTubeEmbed.tsx, PlayerContext.tsx, db/index.ts, route.ts (known-count), regression-stale-lesson-data.test.ts, regression-geo-fallback.spec.ts, qa-suite.yml, snap-full-onsets.ts partial)
**Pattern extraction date:** 2026-04-28

---

*Phase: 13-performance-infrastructure*
*Patterns mapped: 2026-04-28*
*Next step: planner consumes this map alongside 13-CONTEXT.md, 13-SPEC.md, 13-RESEARCH.md*
