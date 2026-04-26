# CONTEXT

**Current Task:** Lesson cache fully ingested into Neon Postgres. 273 song_versions rows now in DB (84% of 323-song catalog); 50 manifest songs remain unlessoned (SKIP-listed for foreign-language/garbled-whisper/too-short reasons + a few still-pending Whisper repass).

**Critical state:** Schema-shape mismatch on 107/273 cache files (legacy `song_slug+summary` headers + recent `slug+summary` from autonomous /loop) was resolved via new `scripts/seed/transform-lesson-shape.ts` — normalizes to LessonSchema, coerces enum drift (`N/A`→`unknown`, `demonstrative`→`other`), validates each output. 273/273 pass safeParse. `05-insert-db.ts` then upserted all 273 with 0 errors. Backup snapshot at `data/lessons-cache.pre-transform.tar.gz` (4.9MB).

## Key Decisions
- Two-step normalize-then-ingest beat partial-ingest of just the 166 already-correct files: full transform was idempotent (re-running on a correct file is a no-op), serializer matches existing `JSON.stringify(_, null, 2)` byte-for-byte so git diff stays clean, and lessons that DID change were validated post-transform before write.
- Top-level `cultural_context` (61 files), `summary` (107), `examples` arrays inside grammar_points were dropped on transform — none are in LessonSchema and would have been stripped by Zod on ingest anyway. No DB outcome change; recoverable from git history if ever needed.
- Transformer committed as `f908345` so the schema-shape logic is preserved; data/ stays gitignored as before.

## Next Steps
1. Triage the ~50 unupserted manifest songs: ~9 have no youtube_id, the rest hit the loop's SKIP list (foreign-language/garbled/<150-char fragments). Consider `scripts/seed/find-geo-replacements.ts` for the geo-blocked subset.
2. Verify ingested lessons render correctly in the UI for a few sample slugs that came through the transform path (e.g. `us-ado`, `to-be-hero-ningen-isu`, `anytime-anywhere-milet`) — check verse timing displays since `start_time_ms`/`end_time_ms` were defaulted to 0 on transformed verses (timing pipeline backfills these later via `restore-verse-order.ts`).
3. Consider deleting `data/lessons-cache.pre-transform.tar.gz` once the UI verification confirms no regression.
