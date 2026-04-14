# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-14)

**Core value:** Users can watch an anime song and understand exactly what every word means — with furigana, translation, grammar breakdown, and vocabulary categorization synced to the music as it plays.
**Current focus:** v2.0 Phase 7 — Data Foundation (next milestone, ready to plan)

## Current Position

Phase: 7 of 12 (Data Foundation — first phase of v2.0)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-04-14 — v2.0 roadmap created (Phases 7-12, 47 requirements mapped)

Progress: [████░░░░░░░░] v1.0 Phase 1 in progress (6/8 plans); v2.0 not started

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

- Foundation: Use YouTube iframe embed API (not audio extraction) — legal compliance
- Foundation: Pre-generate all lesson content offline via Claude API before launch
- Foundation: Freemium gating at database layer (not hidden UI elements)
- 01-01: JSONB for lesson content (not normalized tables)
- v2.0: Vocabulary identity tracked by UUID FK to vocabulary_items (not surface string) — avoids progress orphaning on content corrections
- v2.0: Exercise generation is client-side from existing JSONB — no pre-computation pipeline needed
- v2.0: FSRS columns as individual scalar columns (not JSONB) — required for indexed due-date queries
- v2.0: Phase 9 (Kana Trainer) can be built in parallel with Phase 8 (Exercise Engine)

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 1: Lyric copyright strategy requires legal review for US and Japan markets
- Phase 1: Pipeline execution blocked pending env setup: YOUTUBE_API_KEY, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, ANTHROPIC_API_KEY
- v2.0 Phase 7: Grammar conjugation_path field may be free-text prose in existing songs — audit required before Phase 10 planning
- v2.0 Phase 8: Distractor pool is thin until 30+ songs are seeded — validateDistractorPool() fallback to same-JLPT-level words needed

## Session Continuity

Last session: 2026-04-14
Stopped at: v2.0 roadmap creation complete (Phases 7-12 appended to ROADMAP.md)
Resume file: .planning/phases/01-content-pipeline/01-07-PLAN.md (v1.0 still in progress — Task 2 awaiting env setup)
