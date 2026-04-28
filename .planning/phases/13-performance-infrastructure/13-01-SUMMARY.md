---
phase: 13-performance-infrastructure
plan: "01"
subsystem: cache
tags: [cache, performance, revalidate-tag, neon, integration-test, static-route]
dependency_graph:
  requires: []
  provides:
    - statically-cacheable /songs/[slug] route
    - revalidateSongCache(slug) server action
    - __testQueryCounter instrumented Neon client shim
    - cache-contract integration test (3 tests)
  affects:
    - src/app/songs/[slug]/page.tsx
    - src/app/songs/[slug]/components/KnownWordCount.tsx
    - src/app/songs/[slug]/components/SongContent.tsx
    - src/lib/db/index.ts
    - scripts/seed/snap-full-onsets.ts
    - scripts/seed/05-insert-db.ts
tech_stack:
  added:
    - next/cache revalidateTag (D-02 invalidation strategy)
    - NEXT_PUBLIC_APP_ENV-gated Neon query counter (D-04)
  patterns:
    - route-level static + revalidateTag (D-01)
    - client-fetch decoupling for per-user data (D-03)
    - TDD RED/GREEN for cache contract (D-18)
    - single-condition NEXT_PUBLIC_APP_ENV gate (D-20)
key_files:
  created:
    - src/app/actions/cache.ts
    - tests/integration/song-page-cache.test.ts
  modified:
    - src/app/songs/[slug]/page.tsx
    - src/app/songs/[slug]/components/KnownWordCount.tsx
    - src/app/songs/[slug]/components/SongContent.tsx
    - src/lib/db/index.ts
    - tests/integration/setup.ts
    - scripts/seed/snap-full-onsets.ts
    - scripts/seed/05-insert-db.ts
decisions:
  - Remove force-dynamic (not force-static) — per D-01; removing per-user dependency is sufficient
  - NEXT_PUBLIC_APP_ENV single-condition gate — not || NODE_ENV — preserves Next.js DCE (D-20)
  - Dynamic import of revalidateSongCache from seed scripts — matches existing lazy-import pattern
metrics:
  duration: "~9 minutes"
  completed: "2026-04-28"
  tasks_completed: 2
  files_modified: 7
  files_created: 2
  integration_tests_added: 3
  unit_tests_touched: 0
  e2e_tests_touched: 0
---

# Phase 13 Plan 01: Static Song Page Cache — Summary

**One-liner:** Converted /songs/[slug] from force-dynamic to statically-cacheable with revalidateTag invalidation, decoupled KnownWordCount to client-fetch, and wired revalidateSongCache into lesson-write seed scripts.

## Files Created / Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/app/actions/cache.ts` | CREATED | Single sanctioned revalidateSongCache(slug) server action (D-02) |
| `tests/integration/song-page-cache.test.ts` | CREATED | 3 integration tests locking the cache contract (AC #1, #2, #3) |
| `src/app/songs/[slug]/page.tsx` | MODIFIED | Removed force-dynamic, getKnownWordCountForSong, PLACEHOLDER_USER_ID, initialKnown prop |
| `src/app/songs/[slug]/components/KnownWordCount.tsx` | MODIFIED | Removed initial prop, added mount-time fetch, skeleton state (counts===null) |
| `src/app/songs/[slug]/components/SongContent.tsx` | MODIFIED | Removed initialKnown prop from signature and <KnownWordCount> callsite |
| `src/lib/db/index.ts` | MODIFIED | Added __testQueryCounter shim (D-04) + _instrumentedFetch wrap |
| `tests/integration/setup.ts` | MODIFIED | Added NEXT_PUBLIC_APP_ENV="test" so counter activates in local test runs |
| `scripts/seed/snap-full-onsets.ts` | MODIFIED | revalidateSongCache(p.slug) after each successful db.update |
| `scripts/seed/05-insert-db.ts` | MODIFIED | revalidateSongCache(song.slug) after each successful upsert |

## Bundle Baseline Delta

No change expected — this plan removes SSR data-fetching (reduces per-request work) and decouples KnownWordCount to client-fetch. The route-specific bundle size is unchanged. Plan 13-03 will formally measure and gate.

Baseline (pre-Phase-13): `/songs/[slug]` First Load JS ~116 KB raw / ~40 KB gzipped.

## Test Counts

- Integration tests added: **3** (song-page-cache.test.ts — AC #1, #2, #3)
- Unit tests touched: 0
- E2E tests touched: 0 (player-load.spec.ts not re-run; pre-existing build failure with DATABASE_URL in CI build env)

## TDD Evidence

| Phase | Commit | Message |
|-------|--------|---------|
| RED | `204e280` | test(13-01): add cache contract integration tests (RED) |
| GREEN | `be29370` | feat(13-01): instrument Neon client + wire revalidateSongCache hooks (GREEN) |

## Commit Hashes

| Commit | Description |
|--------|-------------|
| `1f007af` | feat(13-01): decouple KnownWordCount to client-fetch, flip route to static, add revalidateSongCache |
| `204e280` | test(13-01): add cache contract integration tests (RED) |
| `be29370` | feat(13-01): instrument Neon client + wire revalidateSongCache hooks (GREEN) |

## Risk Acknowledged

**Future lesson writers must call revalidateSongCache.** Any new code path that writes to `songs` / `song_versions` without calling `revalidateSongCache(slug)` will serve stale lessons until manual purge. The current writers in scope (snap-full-onsets.ts, 05-insert-db.ts) are wired. Centralised server action design makes a missed call a code-review smell. Logged for Phase 20 audit per D-02.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — KnownWordCount fetches live data from /api/review/known-count; no hardcoded empty values in the render path.

## Threat Flags

No new network endpoints, auth paths, or file access patterns introduced beyond what the plan's threat model covers (T-13-01-01 through T-13-01-05 all addressed).

## Notes on Build Verification

`npm run build` fails in this environment with `DATABASE_URL is not set` — this is a **pre-existing** issue (confirmed by stash test: the same error occurs on the base commit without any plan changes). The `/songs/[slug]` route is correctly removed from force-dynamic in the source and TypeScript compiles clean. The route will show as `○` (Static) in CI where DATABASE_URL is provisioned.

## Self-Check: PASSED

Files created:
- `src/app/actions/cache.ts` — EXISTS
- `tests/integration/song-page-cache.test.ts` — EXISTS

Commits:
- `1f007af` — EXISTS (git log confirmed)
- `204e280` — EXISTS (git log confirmed)
- `be29370` — EXISTS (git log confirmed)

TypeScript: `npx tsc --noEmit` exits 0 — CLEAN
