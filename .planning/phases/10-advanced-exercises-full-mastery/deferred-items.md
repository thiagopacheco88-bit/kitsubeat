# Phase 10 — Deferred Items

Out-of-scope issues discovered during plan execution. Logged per GSD
scope-boundary rule: only auto-fix issues DIRECTLY caused by the current
task's changes; pre-existing errors in unrelated files are deferred.

## Pre-existing type errors (not touched by Plan 10-01)

These `npx tsc --noEmit` errors exist BEFORE Phase 10 work and are unrelated
to the data-layer foundation being laid. Log here so future plans/phases can
pick them up; do NOT fix in Plan 10-01.

### src/app/admin/timing/[songId]/page.tsx + src/app/api/admin/songs/route.ts

Errors reference columns that do not exist on the current `songs` table:
- `timing_data`
- `timing_verified`
- `timing_youtube_id`

These columns live on `song_versions` (per the current schema), not `songs`.
Either the admin code needs to be refactored to query `song_versions`, or the
columns need to be added to `songs`. Unrelated to Phase 10 advanced exercises.

### src/app/review/ReviewSession.tsx (lines 69-70)

`Variable 'prompt' used before being assigned` and same for `correctAnswer`.
Likely a Phase 11 Review loop edge case around a conditional assignment path.
Unrelated to Phase 10.

### src/lib/fsrs/scheduler.ts (lines 84, 101)

`Property 'learning_steps' missing in type ... Card` and
`Argument of type 'Rating' is not assignable to parameter of type 'Grade'`.
These are ts-fsrs upstream API changes after the Phase 08.2 FSRS integration.
The scheduler probably needs an update to match the newer ts-fsrs version.
Unrelated to Phase 10.

### vitest.config.ts (line 28)

`'environmentMatchGlobs' does not exist in type 'InlineConfig'` — Vitest
upstream API deprecated this config key. Cosmetic; tests still run.

### src/app/api/exercises/vocab-mastery/[vocabItemId]/route.ts (Next.js 15 build)

`npm run build` fails during `.next/types/app/api/.../route.ts` type check:
`Type '{ params: { vocabItemId: string } }' is not assignable to RouteContext
... missing properties from 'Promise<any>'`. Next.js 15 requires `params` to
be `Promise<...>` now. Route signature needs update. Pre-dates Phase 10.
Unrelated to Plan 10-03 grammar_conjugation work.

## Stale narrow type on SongCard progress prop

`src/app/songs/components/SongCard.tsx` line 18 declares:

```ts
progress?: { completionPct: number; stars: 0 | 1 | 2 } | null;
```

Phase 10-01 widened `deriveStars` to `0 | 1 | 2 | 3`. This file's narrow
declaration is not actively breaking builds today (no call site assigns from
a `0 | 1 | 2 | 3` source yet — the prop defaults to `null`), but Plan 10-02
(per RESEARCH §9) owns `SongCard`/`SongMasteredBanner`/`BonusBadgeIcon` and
will tighten this when the catalog surfaces Star 3 + bonus badge.

**Do NOT fix in Plan 10-01** — Plan 10-02's planner scope.

---

## Plan 10-07 discoveries

### src/app/actions/exercises.ts — QuotaExhaustedError `class` exported from "use server" file

Introduced by Plan 10-06 commit `4af194a`. Next.js 15 refuses `class`
exports from `"use server"` modules — only async functions are allowed.
`npm run build` fails at webpack parse step on this line:

```
Error: Only async functions are allowed to be exported in a "use server" file.
  102 | export class QuotaExhaustedError extends Error {
```

**Workaround:** move `QuotaExhaustedError` into a sibling non-server module
(e.g., `src/lib/exercises/errors.ts`) and re-import. Consumers (tests,
possible UI catch paths) switch to the new import path. Server action then
re-exports nothing — only the class's `.name === "QuotaExhaustedError"`
contract stays intact across the RSC boundary.

**Verification command after fix:** `npm run build` (currently fails before
Plan 10-07 verification). Unit test suite (`npm run test:unit`) is
unaffected — test imports go straight to the TS source, not through
`"use server"` bundling.

**Do NOT fix in Plan 10-07** — Plan 10-07 surfaces existing mastery data;
`QuotaExhaustedError` relocation is an unrelated Plan 10-06 follow-up.
Tracked here so a future plan (or a standalone fix commit) can pick it up.
All Plan 10-07 verification happens via `npx tsc --noEmit` (targeted) +
`npm run test:unit` (263 tests passing).

