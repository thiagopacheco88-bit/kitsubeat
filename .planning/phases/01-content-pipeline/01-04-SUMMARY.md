---
phase: 01-content-pipeline
plan: 04
subsystem: data-pipeline
tags: [anthropic, batch-api, claude-sonnet, drizzle, neon, postgres, jsonb, lesson-generation, zod]

# Dependency graph
requires:
  - phase: 01-content-pipeline/01-02
    provides: "data/lyrics-cache/{slug}.json with raw_lyrics and tokens (LyricsToken[])"
  - phase: 01-content-pipeline/01-03
    provides: "data/timing-cache/{slug}.json with word-level timestamps"
provides:
  - "scripts/lib/batch-claude.ts: buildBatchRequests + submitBatch + pollBatch + streamResults lifecycle for Anthropic Batch API"
  - "scripts/lib/lesson-prompt.ts: buildLessonPrompt() prompt template encoding all locked content decisions"
  - "scripts/seed/03-generate-content.ts: CLI script submitting all songs to Claude Batch API with validation, caching, checkpoint/resume, --limit flag"
  - "scripts/seed/05-insert-db.ts: CLI script upserting all songs with lesson + timing JSONB into Neon Postgres"
  - "src/lib/db/index.ts: Drizzle/Neon HTTP client with lazy Proxy db export and getDb() factory"
  - "data/lessons-cache/{slug}.json: per-song lesson JSON (produced when 03-generate-content.ts runs)"
affects: [01-05, 01-06, 02-player]

# Tech tracking
tech-stack:
  added:
    - "@anthropic-ai/sdk@0.82.0"
  patterns:
    - "Anthropic Batch API lifecycle: buildBatchRequests → submitBatch (returns batch ID) → pollBatch (30s intervals) → streamResults (async generator)"
    - "Lesson prompt encodes all locked decisions inline: grammar colors, PT-BR, literal-first explanations, JLPT calibration examples"
    - "Zod schema drives both Claude output_config.format.json_schema and runtime validation of returned JSON"
    - "Drizzle db export as Proxy — defers getDb() to first property access, allowing seeding scripts to load dotenv before DB client init"
    - "Checkpoint/resume: existsSync per-slug in lessons-cache before adding to batch requests"
    - "onConflictDoUpdate on songs.slug — idempotent upserts, safe to re-run"

key-files:
  created:
    - scripts/lib/batch-claude.ts
    - scripts/lib/lesson-prompt.ts
    - scripts/seed/03-generate-content.ts
    - scripts/seed/05-insert-db.ts
    - src/lib/db/index.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Proxy export for db constant — allows `import { db }` in app code while seeding scripts use getDb() after dotenv loads; avoids ESM module evaluation order issue with DATABASE_URL"
  - "output_config.format.json_schema cast as any — @anthropic-ai/sdk@0.82.0 types BatchCreateParams.Request.params as MessageCreateParamsNonStreaming which doesn't include output_config; cast required until SDK types are updated"
  - "processing_status terminal states are 'canceling' and 'ended' (not 'canceled'/'expired') — SDK type is 'in_progress' | 'canceling' | 'ended'"
  - "Token context capped at 500 tokens in prompt — prevents exceeding Claude 8192 max_tokens for songs with long lyrics"

patterns-established:
  - "Lesson prompt pattern: metadata block + token context JSON + raw lyrics + 10 instruction sections"
  - "Batch result streaming: async generator yielding {custom_id, lesson} — caller handles Zod validation and file writes"
  - "Cost estimate at end of generation run: rough token count from output size, batch pricing $1.50/$7.50 per MTok"

requirements-completed: [CONT-05, CONT-06, CONT-07, CONT-08, CONT-10]

# Metrics
duration: 7min
completed: 2026-04-06
---

# Phase 1 Plan 04: Claude Batch API Content Generation and DB Insertion Summary

**Claude Batch API wrapper with lesson prompt template encoding all locked design decisions, plus generation and DB insertion scripts with Zod validation, checkpoint/resume, and idempotent upserts into Neon Postgres**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-06T16:06:53Z
- **Completed:** 2026-04-06T16:14:11Z
- **Tasks:** 2
- **Files modified:** 5 created, 2 modified (package.json, package-lock.json)

## Accomplishments

- Anthropic Batch API lifecycle wrapper (buildBatchRequests/submitBatch/pollBatch/streamResults) with 30s polling intervals, progress logging, and result streaming as async generator
- Lesson prompt template encoding all locked decisions: grammar color map (noun=blue/verb=red/adjective=green/adverb=orange/particle=grey), natural/fluent translation style, Brazilian PT-BR, literal meaning first, JLPT auto-assignment algorithm with calibration examples
- Content generation script with Zod validation, lessons-cache writer, checkpoint/resume (skip existing cache), --limit flag for testing, cost estimate output at batch pricing ($1.50/$7.50 per MTok)
- DB insertion script upserting all songs with lesson + timing JSONB into Neon Postgres via drizzle onConflictDoUpdate — idempotent, safe to re-run
- Drizzle/Neon HTTP db client with Proxy-based lazy initialization allowing dotenv to load before DATABASE_URL is accessed

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the Claude Batch API wrapper and lesson prompt template** - `b86b0dd` (feat)
2. **Task 2: Create the content generation script and database insertion script** - `bfe9056` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `scripts/lib/batch-claude.ts` — Anthropic Batch API wrapper: buildBatchRequests, submitBatch, pollBatch, streamResults
- `scripts/lib/lesson-prompt.ts` — Lesson prompt template builder with all locked design decisions encoded
- `scripts/seed/03-generate-content.ts` — CLI: submit songs to Claude Batch API, validate results, write lessons-cache
- `scripts/seed/05-insert-db.ts` — CLI: upsert all songs with lesson + timing data into Neon Postgres
- `src/lib/db/index.ts` — Drizzle ORM client with lazy Proxy export and getDb() factory
- `package.json` — Added @anthropic-ai/sdk@0.82.0

## Decisions Made

- **Proxy db export:** App code can use `import { db }` while seeding scripts call `getDb()` after dotenv loads — avoids ESM evaluation order issue where `src/lib/db/index.ts` would throw before `.env.local` is processed
- **output_config as any cast:** SDK types don't include output_config on MessageCreateParamsNonStreaming; cast required until @anthropic-ai/sdk types add structured output support to batch params
- **processing_status 'ended':** The Anthropic SDK uses 'in_progress' | 'canceling' | 'ended' — not 'canceled' or 'expired' as docs might suggest; fixed type comparison accordingly
- **500-token cap on prompt context:** Prevents prompt token overflow for songs with very long lyrics; kuromoji produces many tokens per line

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incorrect processing_status terminal state comparison**
- **Found during:** Task 2 (content generation script)
- **Issue:** Plan said to check for `"canceled"` and `"expired"` but SDK type is `'in_progress' | 'canceling' | 'ended'` — comparisons would never match
- **Fix:** Changed `=== "canceled"` to `=== "canceling"` and removed the `"expired"` check (no separate expired state in SDK)
- **Files modified:** scripts/seed/03-generate-content.ts
- **Verification:** tsc --noEmit confirms no type error on the comparison
- **Committed in:** bfe9056 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Fix necessary for correct batch status handling. No scope creep.

## Issues Encountered

- ESM import order vs dotenv: Static imports are hoisted in ES modules, so `dotenv/config` doesn't load before `src/lib/db/index.ts` is evaluated if DATABASE_URL is in `.env.local` only. Resolved by using a Proxy-based lazy db export that defers `neon()` call to first property access.

## User Setup Required

To execute the generation pipeline:

1. Add `ANTHROPIC_API_KEY` to `.env.local`
2. Ensure `DATABASE_URL` points to your Neon Postgres instance in `.env.local`
3. Run `npx drizzle-kit push` to create/sync the songs table
4. Run `npx tsx scripts/seed/01-build-manifest.ts` (plan 01) if not done
5. Run `npx tsx scripts/seed/02-fetch-lyrics.ts` (plan 02) if not done
6. Run `npx tsx scripts/seed/03-generate-content.ts` — submits Claude batch, polls, saves lessons-cache
7. Run `npx tsx scripts/seed/05-insert-db.ts` — upserts all content into Neon Postgres

Test with limited run: `npx tsx scripts/seed/03-generate-content.ts --limit 5`

## Next Phase Readiness

- Batch API lifecycle and lesson prompt are production-ready for 200 songs
- DB insertion is idempotent — safe to run incrementally as lessons generate
- Plan 05 (timing editor) can proceed as `timing_data` column accepts null values
- Plan 06 (QA agent) will query lessons-cache and Neon Postgres for coverage validation

---
*Phase: 01-content-pipeline*
*Completed: 2026-04-06*
