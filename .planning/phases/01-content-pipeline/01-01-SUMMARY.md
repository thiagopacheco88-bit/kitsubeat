---
phase: 01-content-pipeline
plan: 01
subsystem: database
tags: [drizzle, neon, postgres, zod, typescript, jikan, spotify, youtube, anidb, manifest]

# Dependency graph
requires: []
provides:
  - "scripts/types/lesson.ts: LessonSchema + LESSON_JSON_SCHEMA for Anthropic Batch API"
  - "scripts/types/manifest.ts: SongManifestEntrySchema + SongManifestSchema"
  - "src/lib/db/schema.ts: songs table with JSONB lesson + timing_data, pgEnums"
  - "drizzle/0000_furry_zeigeist.sql: initial migration SQL"
  - "scripts/seed/01-build-manifest.ts: manifest builder CLI with --dry-run flag"
  - "scripts/lib/jikan.ts: MAL/Jikan v4 theme fetcher with R-prefix parser fix"
  - "scripts/lib/spotify-charts.ts: Spotify Client Credentials API for anime playlists"
  - "scripts/lib/anidb-themes.ts: AniDB themes via anisongdb.com search_request endpoint"
  - "scripts/lib/youtube-search.ts: YouTube Data API v3 search with quota tracking"
affects: [01-02, 01-03, 01-04, 01-05, 01-06]

# Tech tracking
tech-stack:
  added:
    - drizzle-orm@0.41.0
    - "@neondatabase/serverless@0.10.4"
    - zod@3.24.3
    - zod-to-json-schema@3.24.5
    - drizzle-kit@0.30.6
    - tsx@4.19.3
    - dotenv@16.5.0
    - p-limit@6.2.0
  patterns:
    - "Zod-first schema design: define schema once, derive TypeScript type and JSON schema from same source"
    - "LESSON_JSON_SCHEMA via zodToJsonSchema({ $refStrategy: 'none' }) for Anthropic Batch API compatibility"
    - "JSONB column for lesson content (no nested relational tables); timing_data same pattern"
    - "pgEnum for jlpt_level, difficulty_tier, timing_verified_status"
    - "Checkpoint/resume pattern: save to JSON every 10 YouTube searches to handle quota limits"
    - "Multi-source weighted ranking: combined = mal_norm*0.4 + spotify_norm*0.35 + anidb_norm*0.25"
    - "p-limit concurrency control: 3 req/s for Jikan, 5 req/s for Spotify, 1 req/s for AniDB"

key-files:
  created:
    - scripts/types/lesson.ts
    - scripts/types/manifest.ts
    - src/lib/db/schema.ts
    - drizzle.config.ts
    - package.json
    - tsconfig.json
    - scripts/lib/jikan.ts
    - scripts/lib/spotify-charts.ts
    - scripts/lib/anidb-themes.ts
    - scripts/lib/youtube-search.ts
    - scripts/seed/01-build-manifest.ts
    - drizzle/0000_furry_zeigeist.sql
  modified: []

key-decisions:
  - "JSONB for lesson content: avoids deeply nested relational tables while keeping content queryable per research Pattern 7"
  - "zodToJsonSchema with $refStrategy:'none' inlines all $ref definitions — required for Claude API JSON schema validator compatibility"
  - "anisongdb.com endpoint is POST /api/search_request (not /api/filter as documented in research) — requires specific anime search filter, empty filter returns 0 results"
  - "Jikan theme strings use 'R1:' prefix for recap/alternate numbering — parser updated to handle this variant"
  - "Manifest builder uses graceful degradation: Spotify/AniDB failures continue pipeline with MAL-only data"

patterns-established:
  - "Schema-first TypeScript: Zod schema is source of truth for both runtime validation and JSON schema generation"
  - "Multi-source ranking with weighted formula ensures songs from multiple databases rank higher"
  - "YouTubeQuotaExceededError thrown as typed error class — caller can checkpoint-save before exit"

requirements-completed: [CONT-01, CONT-10]

# Metrics
duration: 13min
completed: 2026-04-06
---

# Phase 1 Plan 01: Schema, Types, and 200-Song Manifest Builder Summary

**Drizzle songs table with JSONB lesson/timing columns, Zod lesson schema producing JSON schema for Claude Batch API, and a multi-source manifest builder merging MAL + Spotify + AniDB into 200 ranked anime OP/ED songs**

## Performance

- **Duration:** 13 min
- **Started:** 2026-04-06T15:35:39Z
- **Completed:** 2026-04-06T15:48:49Z
- **Tasks:** 2
- **Files modified:** 12 created, 0 modified

## Accomplishments

- Zod-first lesson schema with Token, Verse, VocabEntry, GrammarPoint — exports LESSON_JSON_SCHEMA via zodToJsonSchema for direct use in Anthropic Batch API `output_config.format.schema`
- Drizzle ORM songs table with 20 columns: JSONB lesson + timing_data, pgEnums for jlpt_level/difficulty_tier/timing_verified_status, uuid PK, unique slug constraint; migration SQL generated and verified
- Manifest builder CLI merging three sources (Jikan/MAL + Spotify + AniDB/anisongdb.com) with weighted combined popularity score (0.4/0.35/0.25 weights); dry-run verified: 1,069 candidates with multi-source source_rankings; checkpoint/resume every 10 YouTube searches

## Task Commits

Each task was committed atomically:

1. **Task 1: TypeScript types, Zod schemas, and Drizzle database schema** - `7bf6233` (feat)
2. **Task 2: 200-song manifest builder CLI script** - `0c4ed1d` (feat)

## Files Created/Modified

- `scripts/types/lesson.ts` - LessonSchema with Token/Verse/VocabEntry/GrammarPoint sub-schemas; LESSON_JSON_SCHEMA export
- `scripts/types/manifest.ts` - SongManifestEntrySchema with source_rankings; SongManifestSchema array type
- `src/lib/db/schema.ts` - songs table: 20 columns, 3 pgEnums (jlpt_level, difficulty_tier, timing_verified_status)
- `drizzle.config.ts` - Drizzle Kit config pointing to Neon via DATABASE_URL
- `package.json` - Project deps: drizzle-orm, @neondatabase/serverless, zod, zod-to-json-schema, p-limit
- `tsconfig.json` - TypeScript config for scripts + src, NodeNext module resolution
- `scripts/lib/jikan.ts` - Jikan v4 API: fetchTopAnimeByPopularity, fetchAnimeThemes, parseThemeString (R-prefix aware)
- `scripts/lib/spotify-charts.ts` - Spotify Client Credentials OAuth; fetchSpotifyAnimeThemes via playlist search
- `scripts/lib/anidb-themes.ts` - AniDB via anisongdb.com POST /api/search_request; 20-anime query strategy
- `scripts/lib/youtube-search.ts` - YouTube Data API v3 search; YouTubeQuotaExceededError; quota estimation
- `scripts/seed/01-build-manifest.ts` - Manifest builder CLI: merge + rank + YouTube enrich + checkpoint/resume + --dry-run
- `drizzle/0000_furry_zeigeist.sql` - Generated migration SQL: CREATE TYPE + CREATE TABLE songs

## Decisions Made

- Used JSONB for lesson content (not normalized tables) — avoids deeply nested relational schema while keeping all lesson data queryable per research Pattern 7
- zodToJsonSchema with `$refStrategy: "none"` inlines all $ref definitions — required because Claude's JSON schema validator does not resolve external $ref pointers
- anisongdb.com search_request endpoint requires a specific anime search filter; empty filter returns 0 results; workaround: query 20 well-known popular anime series individually
- Manifest builder uses graceful degradation for Spotify/AniDB failures — pipeline continues with MAL-only data, partial source_rankings recorded

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Jikan theme parser not handling "R1:"-prefixed theme strings**
- **Found during:** Task 2 (manifest builder dry-run)
- **Issue:** Jikan API returns some themes with "R1:", "R2:" prefix (recap episodes) — regex only matched numeric prefix `1:`, causing these entries to print as "Unparseable theme"
- **Fix:** Updated regex in `parseThemeString` to match optional `[Rr]?` prefix before the number
- **Files modified:** scripts/lib/jikan.ts
- **Verification:** Dry-run no longer shows "Unparseable theme" warnings for R-prefixed entries
- **Committed in:** `0c4ed1d` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed AniDB anisongdb.com API endpoint path**
- **Found during:** Task 2 (manifest builder dry-run)
- **Issue:** Research documented endpoint as `/api/filter` — actual correct endpoint is `/api/search_request` (returns 404 on /filter). Additionally, empty filter body returns 0 results; must include a specific anime_search_filter
- **Fix:** Updated endpoint to POST /api/search_request; changed fetch strategy to query 20 popular anime by name; updated AnisongdbSong interface field from `artistName` to `songArtist` to match actual API response shape
- **Files modified:** scripts/lib/anidb-themes.ts
- **Verification:** Dry-run shows AniDB fetching 149+ themes for Naruto alone, multi-source candidates visible in output
- **Committed in:** `0c4ed1d` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both fixes necessary for correct data fetching. No scope creep. AniDB now contributes cross-source data as required by locked decision.

## Issues Encountered

- Jikan API theme string format has undocumented "R-prefix" variant for recap episodes — found during dry-run, fixed inline
- anisongdb.com API endpoint path differs from research documentation — API currently requires specific search term (cannot return all songs with an empty filter)

## User Setup Required

Before running the full manifest builder (without --dry-run), set environment variables in `.env.local`:

```
# YouTube Data API v3 — Required for YouTube video ID search
YOUTUBE_API_KEY=your_key_here
# Source: Google Cloud Console → APIs & Services → Credentials → Create API Key
#         Enable: YouTube Data API v3

# Spotify Web API — Required for Spotify playlist source
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
# Source: Spotify Developer Dashboard → Create App → Client ID + Secret

# Neon Postgres — Required for db:push migration
DATABASE_URL=postgresql://user:pass@host/dbname
# Source: Neon Dashboard → Project → Connection Details → Connection string
```

Note: The --dry-run mode works without any API credentials (uses Jikan + AniDB only).
YouTube quota: 200 searches = 20,000 units = 2 days at default 10,000/day quota.

## Next Phase Readiness

- Plan 01-02 (lyrics fetching) can proceed: SongManifestSchema is ready as input type
- Plan 01-03 (content generation) can proceed: LessonSchema + LESSON_JSON_SCHEMA ready for Anthropic Batch API
- Database ready: run `DATABASE_URL=... npx drizzle-kit push` to apply migration to Neon
- Full manifest build requires: YOUTUBE_API_KEY + SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET in .env.local
- Blocker for full manifest: YouTube API quota (2 days to search all 200 songs at default quota)

---
*Phase: 01-content-pipeline*
*Completed: 2026-04-06*
