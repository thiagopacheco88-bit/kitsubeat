---
phase: 01-content-pipeline
plan: 06
subsystem: testing
tags: [drizzle-orm, neon, typescript, qa, validation, zod]

# Dependency graph
requires:
  - phase: 01-content-pipeline/01-05
    provides: songs table with lesson JSONB, timing_data, content_schema_version populated by insert-db script
provides:
  - Verse Coverage Agent CLI that validates 100% content coverage for all songs in the database
  - Dev seed script that selects 10-20 representative songs for Phase 2 player development
  - npm scripts: qa:coverage and seed:dev
affects:
  - Phase 2 player development (dev seed provides working data set)
  - CI/CD pipeline (QA agent is exit-code-1 compatible)
  - Ongoing content additions (QA agent catches gaps on re-run)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - QA validation: structured gap reporting as JSON with slug, field, type, detail
    - CLI flag pattern: --verbose (per-song detail), --json (raw JSON for programmatic use)
    - Dev data selection: multi-criteria selection (JLPT spread, difficulty tiers, grammar richness, cultural context)

key-files:
  created:
    - kitsubeat/scripts/seed/06-qa-agent.ts
    - kitsubeat/scripts/seed/07-dev-seed.ts
  modified:
    - kitsubeat/package.json

key-decisions:
  - "QA agent exits code 1 on any gap (CI-compatible) so it can be used as a pipeline gate"
  - "Gap report is structured JSON enabling programmatic consumption by CI or reporting tools"
  - "Dev seed targets 10-20 songs (not all 200) to keep Phase 2 development fast and focused"
  - "Empty database handled gracefully — agent exits 0 with instructions, not as an error"

patterns-established:
  - "QA script pattern: load all from DB, validate each record, collect gaps[], report JSON, exit code based on gap count"
  - "Dev seed selection: multi-pass with guaranteed minimums (JLPT coverage) before opportunistic additions"

requirements-completed: [CONT-11]

# Metrics
duration: 4min
completed: 2026-04-06
---

# Phase 1 Plan 06: Verse Coverage Agent and Dev Seed Summary

**TypeScript QA agent validating all song fields (tokens, translations, vocabulary, timing) with structured JSON gap reporting and CI-compatible exit codes, plus dev seed selecting 10-20 songs by JLPT/tier coverage for Phase 2**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-06T16:45:39Z
- **Completed:** 2026-04-06T16:49:28Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Verse Coverage Agent validates every required field across all songs: tokens (surface, reading, romaji, grammar, grammar_color, meaning), translations (en, pt-BR, es), verse literal_meaning and timing, vocabulary (part_of_speech, jlpt_level, example_from_song), lesson arrays, song-level fields, and content_schema_version
- Gap report outputs structured JSON: `{ total_songs, songs_complete, songs_with_gaps, gaps_count, gaps[], timing_status }` — each gap includes slug, field path, gap type (missing/empty/invalid/outdated_schema), and optional detail
- Dev seed selects 10-20 representative songs using multi-pass criteria: guaranteed 2 songs per JLPT level, all difficulty tiers covered, richest grammar-points song included, cultural-context song included, remainder filled with earliest-inserted (most popular) songs

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the Verse Coverage Agent (QA script)** - `e5d3fe0` (feat)
2. **Task 2: Create the development seed script for Phase 2** - `40a2f42` (feat)

## Files Created/Modified
- `kitsubeat/scripts/seed/06-qa-agent.ts` - Verse Coverage Agent; validates all songs; exits code 1 if any gaps; --verbose and --json flags
- `kitsubeat/scripts/seed/07-dev-seed.ts` - Dev seed script; selects 10-20 representative songs; --json flag for programmatic use
- `kitsubeat/package.json` - Added npm scripts: `qa:coverage` and `seed:dev`

## Decisions Made
- QA agent exits code 1 on any gap (not just warnings) so it can serve as a CI gate in the content pipeline
- Empty database handled gracefully with exit code 0 and instructional message — an empty DB is not a failure state for QA
- Dev seed targets 10-20 songs by design: fewer songs means faster Phase 2 iteration, and the selection criteria ensure representative coverage

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Database has 0 songs (content pipeline scripts 01-05 have not been run yet). Both scripts handle this gracefully: QA agent exits 0 with a message, dev seed exits 0 with pipeline instructions. This is expected at this stage — the scripts are ready for when data is populated.

## User Setup Required
None - no external service configuration required. The scripts use the existing `.env.local` DATABASE_URL configuration from prior setup.

## Next Phase Readiness
- QA agent is ready to run against the database after content pipeline (01-01 through 01-05) populates songs
- Dev seed is ready to select Phase 2 data once the database has content
- Plan 06 completes the Phase 1 tooling suite — all 6 plans are now implemented
- Phase 1 content pipeline can be declared complete once QA agent reports zero gaps on a populated database

---
*Phase: 01-content-pipeline*
*Completed: 2026-04-06*
