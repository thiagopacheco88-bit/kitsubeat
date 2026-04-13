---
phase: 01-content-pipeline
plan: 05
subsystem: ui
tags: [next.js, wavesurfer, react, admin, timing-editor, waveform, regions-plugin, drizzle, postgres]

# Dependency graph
requires:
  - phase: 01-01
    provides: "src/lib/db/schema.ts: songs table with timing_data JSONB + timing_verified enum"
  - phase: 01-03
    provides: "scripts/lib/run-whisperx.ts: WordTiming type; public/audio/{slug}.mp3 for waveform"
provides:
  - "src/app/admin/timing/page.tsx: server component song list page at /admin/timing"
  - "src/app/admin/timing/[songId]/page.tsx: server component timing editor page with stats header"
  - "src/app/admin/timing/components/SongList.tsx: client component with filter buttons and status badges"
  - "src/app/admin/timing/components/TimingEditor.tsx: client component with wavesurfer.js waveform + RegionsPlugin"
  - "src/app/admin/timing/components/TimingSaveHandler.tsx: client wrapper owning fetch PUT save logic"
  - "src/app/api/admin/songs/route.ts: GET all songs ordered by timing_verified then title"
  - "src/app/api/admin/timing/[songId]/route.ts: GET song timing data; PUT save words + verified status"
  - "src/lib/timing-types.ts: WordTiming + TimingData types for app code"
affects: [01-06, phase-2]

# Tech tracking
tech-stack:
  added:
    - next@15.5.14
    - react@19.2.4
    - react-dom@19.2.4
    - wavesurfer.js@7.12.5
    - "@wavesurfer/react@1.0.12"
    - "@types/react@19.2.14"
    - "@types/react-dom@19.2.3"
  patterns:
    - "Server component fetches DB data, passes to client component via props (Next.js App Router pattern)"
    - "Client component uses WaveSurfer.create (not @wavesurfer/react WavesurferPlayer) — direct imperative API for plugin integration"
    - "RegionsPlugin memoized with useMemo to prevent re-creation on re-render"
    - "region-updated event updates local timings state for drag/resize"
    - "Render prop pattern for passing async save handler from client wrapper to child client component"
    - "Separate tsconfig.scripts.json for seeding scripts (NodeNext) vs tsconfig.json for Next.js app (bundler)"

key-files:
  created:
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/app/admin/timing/page.tsx
    - src/app/admin/timing/[songId]/page.tsx
    - src/app/admin/timing/components/SongList.tsx
    - src/app/admin/timing/components/TimingEditor.tsx
    - src/app/admin/timing/components/TimingSaveHandler.tsx
    - src/app/api/admin/songs/route.ts
    - src/app/api/admin/timing/[songId]/route.ts
    - src/lib/timing-types.ts
    - next.config.ts
    - tsconfig.scripts.json
  modified:
    - tsconfig.json
    - package.json

key-decisions:
  - "Next.js not yet installed when plan started — installed as Rule 3 (blocking) deviation; scripts tsconfig separated to tsconfig.scripts.json"
  - "WaveSurfer.create used directly (not @wavesurfer/react WavesurferPlayer) — RegionsPlugin requires imperative initialization via plugins: [regions] array"
  - "region-updated event used (not deprecated region-update-end) — v7.12.5 fires region-updated after drag/resize completes"
  - "TimingSaveHandler render prop pattern — server components can't pass async functions as props to client components directly"
  - "Audio served from public/audio/{slug}.mp3 — created by WhisperX extraction script; production serving strategy deferred"
  - "Schema has timing_verified as 'auto'|'manual' (not 'auto'|'reviewed'|'approved') — plan mentioned three values but schema only has two; used schema values"

patterns-established:
  - "Next.js App Router admin pages: server component fetches DB data, renders client component for interactivity"
  - "Shared types in src/lib/ for cross-cutting concerns (timing-types.ts mirrors scripts/lib/ types for app use)"

requirements-completed: [CONT-09]

# Metrics
duration: 22min
completed: 2026-04-06
---

# Phase 1 Plan 05: Web-Based Timing Editor Admin Tool Summary

**Next.js 15 admin tool at /admin/timing with wavesurfer.js RegionsPlugin waveform, one draggable region per word, low-confidence word highlighting (red), save to Neon Postgres via PUT API**

## Performance

- **Duration:** 22 min
- **Started:** 2026-04-06T16:00:00Z
- **Completed:** 2026-04-06T16:22:27Z
- **Tasks:** 3 of 3
- **Files modified:** 14 created, 2 modified

## Accomplishments

- Next.js 15 installed and app directory bootstrapped; tsconfig.json updated for bundler moduleResolution; separate tsconfig.scripts.json preserves NodeNext for seeding scripts
- Song list page at `/admin/timing`: fetches all songs from DB, displays table with timing status badges (yellow=Needs Review/auto, blue=Reviewed/manual), filter buttons (All / Needs Review / Reviewed), each row links to editor
- Timing editor at `/admin/timing/[songId]`: WaveSurfer.create with RegionsPlugin renders one region per word; low-confidence words shown in red (score < 0.6); drag/resize updates timestamps via `region-updated` event; zoom slider 50–500px/s; Space/Arrow keyboard shortcuts; status selector (auto/manual); save button with PUT to `/api/admin/timing/[songId]`; audio served from `public/audio/{slug}.mp3`

## Task Commits

Each task was committed atomically:

1. **Task 1: Timing editor API routes and song list page** - `8648321` (feat)
2. **Task 2: Wavesurfer.js waveform timing editor component** - `1b106a7` (feat)
3. **Task 3: Human verify timing editor UI** - approved (human checkpoint)

## Files Created/Modified

- `src/app/layout.tsx` — Next.js root layout
- `src/app/page.tsx` — Minimal home page with link to /admin/timing
- `src/lib/timing-types.ts` — WordTiming + TimingData interfaces for app code
- `src/app/api/admin/songs/route.ts` — GET all songs (id, slug, title, artist, anime, timing_verified, timing_youtube_id)
- `src/app/api/admin/timing/[songId]/route.ts` — GET song with timing_data; PUT save words + timing_verified
- `src/app/admin/timing/page.tsx` — Server component: title + SongList
- `src/app/admin/timing/components/SongList.tsx` — Client: fetch song list, filter buttons, status badges, links to editor
- `src/app/admin/timing/[songId]/page.tsx` — Server component: fetch song from DB, show stats, render TimingSaveHandler + TimingEditor
- `src/app/admin/timing/components/TimingEditor.tsx` — Client: WaveSurfer + RegionsPlugin, all editor controls
- `src/app/admin/timing/components/TimingSaveHandler.tsx` — Client: render prop wrapper holding fetch PUT logic
- `next.config.ts` — Next.js config (empty, required)
- `tsconfig.json` — Updated for Next.js (bundler, jsx:preserve, dom lib)
- `tsconfig.scripts.json` — Separate config for seeding scripts (NodeNext, no jsx)
- `package.json` — Added dev/build/start/lint scripts; wavesurfer.js + @wavesurfer/react deps

## Decisions Made

- Next.js was not installed — installed as Rule 3 (blocking) deviation. Scripts tsconfig separated to `tsconfig.scripts.json` to preserve NodeNext module resolution for seeding scripts
- Used `WaveSurfer.create` directly (not `@wavesurfer/react` WavesurferPlayer) — the RegionsPlugin must be passed in the `plugins: [regions]` array at creation time; the React component wrapper does not expose this initialization path cleanly
- Used `region-updated` event (not `region-update-end`) — wavesurfer.js v7.12.5 fires `region-updated` after drag/resize completes; `region-update-end` is deprecated/removed in v7
- TimingSaveHandler render prop pattern — Next.js server components cannot pass functions as props to client components; the save handler must live in a client component that wraps the editor
- `timing_verified` uses schema values `"auto"` | `"manual"` — the plan mentioned `"reviewed"` and `"approved"` but the Drizzle schema (from Plan 01-01) only defines `"auto"` and `"manual"`; schema wins

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed Next.js — required to create app router pages**
- **Found during:** Task 1 (creating src/app/admin/timing/page.tsx)
- **Issue:** Next.js, React, and React-DOM were not in package.json; `src/app/` directory did not exist; no App Router infrastructure present
- **Fix:** `npm install next@15 react@19 react-dom@19 @types/react@19 @types/react-dom@19`; created `next.config.ts`; updated `tsconfig.json` to Next.js-compatible settings; created `tsconfig.scripts.json` for seeding scripts; added `dev/build/start/lint` scripts to package.json; created `src/app/layout.tsx` and `src/app/page.tsx`
- **Files modified:** package.json, package-lock.json, tsconfig.json, next.config.ts, tsconfig.scripts.json, src/app/layout.tsx, src/app/page.tsx
- **Verification:** `npx tsc --noEmit` passes; Next.js dev server starts with `npm run dev`
- **Committed in:** `8648321` (Task 1 commit)

**2. [Rule 1 - Bug] Used region-updated instead of region-update-end**
- **Found during:** Task 2 (TimingEditor region event setup)
- **Issue:** Plan specified `region-update-end` event but wavesurfer.js v7 RegionsPlugin fires `region-updated` (the TypeScript types confirm: `RegionEvents` has `update-end` on the region instance itself, not on the plugin; plugin emits `region-updated`)
- **Fix:** Used `regions.on("region-updated", ...)` which fires after drag/resize completes
- **Files modified:** src/app/admin/timing/components/TimingEditor.tsx
- **Verification:** TypeScript types validate; event name matches RegionsPluginEvents type definition
- **Committed in:** `1b106a7` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 Rule 3 blocking, 1 Rule 1 bug)
**Impact on plan:** Rule 3 necessary — Next.js was always part of the stack (per research RESEARCH.md), just not yet installed. Rule 1 prevents incorrect event binding that would silently fail. No scope creep.

## Issues Encountered

- `timing_verified` enum only has `"auto"` and `"manual"` values in the Drizzle schema (Plan 01-01), but the plan's task description mentioned `"reviewed"` and `"approved"`. Used the schema values — schema is source of truth. Note documented in key-decisions.

## User Setup Required

Before using the timing editor:

1. Run `npm run dev` to start the development server
2. For any song with timing data, ensure `public/audio/{slug}.mp3` exists (created by WhisperX extraction script)
3. Navigate to `http://localhost:3000/admin/timing`

No additional environment variables needed beyond DATABASE_URL (already required from Plans 01-01 through 01-04).

## Next Phase Readiness

- Plan 01-06 (Verse Coverage Agent): API routes exist; `src/lib/db` is accessible from server components
- Phase 2 (Player Experience): Next.js app router is now bootstrapped; `src/app/` ready for player pages
- Audio files for editor: require WhisperX extraction per song (scripts/seed/04-extract-timing.py)
- Blocker: timing editor requires DATABASE_URL to be set; song list and editor pages will fail without it

---
*Phase: 01-content-pipeline*
*Completed: 2026-04-06*
