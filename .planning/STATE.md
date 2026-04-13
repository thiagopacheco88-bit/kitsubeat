# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-06)

**Core value:** Users can watch an anime song and understand exactly what every word means — with furigana, translation, grammar breakdown, and vocabulary categorization synced to the music as it plays.
**Current focus:** Phase 1 — Content Pipeline

## Current Position

Phase: 1 of 6 (Content Pipeline)
Plan: 7 of 8 in current phase
Status: In progress (checkpoint — awaiting human action for env setup + pipeline execution)
Last activity: 2026-04-06 — Completed plan 01-07 Task 1: Pipeline orchestrator; blocked at checkpoint for env setup

Progress: [█████░░░░░] 14%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: 10 min
- Total execution time: 0.8 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-content-pipeline | 6/8 | 60 min | 10 min |

**Recent Trend:**
- Last 6 plans: 01-01 (13 min), 01-02 (6 min), 01-03 (4 min), 01-04 (7 min), 01-05 (22 min), 01-07 (8 min)
- Trend: stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Foundation: Use YouTube iframe embed API (not audio extraction) — legal compliance
- Foundation: Pre-generate all lesson content offline via Claude API before launch
- Foundation: AI-generated lyric breakdowns (not verbatim reproduction) — JASRAC/NMPA copyright risk mitigation
- Foundation: Lesson panel placed beside/below player, never overlaid — YouTube Developer Policy compliance
- Foundation: Freemium gating at database layer via Postgres RLS (not hidden UI elements)
- 01-01: JSONB for lesson content (not normalized tables) — avoids deeply nested relational schema, keeps content queryable
- 01-01: zodToJsonSchema with $refStrategy:'none' required for Claude API JSON schema validator compatibility
- 01-01: anisongdb.com endpoint is POST /api/search_request; requires specific anime filter (empty filter returns 0 results)
- 01-01: Manifest builder uses graceful degradation — Spotify/AniDB failures continue pipeline with MAL-only data
- 01-02: LRCLIB two-step fetch (with album_name, then without) — LRCLIB stores original single/album name, not anime title; without fallback 100% of songs fail
- 01-02: kuroshiro-analyzer-kuromoji pointed at @sglkc/kuromoji dict — avoids Node 18+ async dict loading issue while using official adapter
- 01-02: Per-token romaji via kuroshiro.convert(surface) — prevents cross-token ambiguity in hepburn transliteration
- 01-03: Low-confidence threshold at score < 0.6 — words flagged for timing editor review
- 01-03: mp3 retained in public/audio/ after extraction — Plan 05 wavesurfer.js waveform rendering requires audio file
- 01-03: 500ms silence gap heuristic for lyric line breaks — no canonical line structure from transcription alone
- 01-03: TypeScript wrapper returns null on Python non-zero exit — single-song failures should not abort batch pipeline runs
- 01-04: Proxy export for db constant — defers DATABASE_URL check to first property access, allows seeding scripts to load .env.local before DB client init
- 01-04: output_config cast as any in batch requests — @anthropic-ai/sdk@0.82.0 BatchCreateParams doesn't type output_config; structured output requires cast until SDK types updated
- 01-04: Anthropic Batch API processing_status terminal states are 'canceling' and 'ended' (not 'canceled'/'expired')
- [Phase 01-content-pipeline]: Next.js installed as Rule 3 deviation (blocking) — was not in package.json when Plan 05 started; scripts tsconfig separated to tsconfig.scripts.json to preserve NodeNext for seeding scripts
- [Phase 01-05]: WaveSurfer.create used directly (not @wavesurfer/react WavesurferPlayer) — RegionsPlugin requires plugins:[regions] array at creation time; region-updated event used (not deprecated region-update-end) per v7.12.5 TypeScript types
- [Phase 01-05]: timing_verified schema uses auto|manual (not auto|reviewed|approved) — plan described three states but Drizzle schema from Plan 01-01 only defines two; schema is source of truth
- 01-07: Pipeline orchestrator dry-run is informational only — env var warnings shown but not blocking; allows planning without all keys configured

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 1: Lyric copyright strategy requires legal review for US and Japan markets before content model is finalized — design around grammatical breakdowns, not verbatim lyrics
- Phase 1: Video timing data sourcing for 200 songs is an open operational question (manual authoring, licensed data, or AI-approximated timings)
- Phase 1: Embedding model choice (OpenAI text-embedding-3-small vs. Anthropic native) adds a second AI provider dependency — decide before Phase 4
- 01-01: Full manifest build requires YOUTUBE_API_KEY + SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET; YouTube quota requires 2 days at default 10k/day limit
- 01-07: Pipeline execution (Steps 1-4) blocked pending human env setup: YOUTUBE_API_KEY, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, ANTHROPIC_API_KEY

## Session Continuity

Last session: 2026-04-06
Stopped at: Checkpoint in 01-07-PLAN.md (Task 2 — human action required for env setup + pipeline execution)
Resume file: .planning/phases/01-content-pipeline/01-07-PLAN.md (Task 2 continuation after env setup)
