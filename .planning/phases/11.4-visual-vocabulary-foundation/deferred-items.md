# Phase 11.4 — Deferred Items

Out-of-scope discoveries logged during plan execution. Track for future plans/phases; DO NOT fix in 11.4.

---

## D-01: Pre-existing schema drift on `songs.popularity_rank`

**Found during:** Plan 11.4-01 Task 2 (`npm run db:generate`)

**Issue:**
`src/lib/db/schema.ts:73` declares `popularity_rank: integer("popularity_rank")` on the `songs` table, but no migration file (or `drizzle/meta` snapshot entry) exists for this column. When `npm run db:generate` is invoked it prompts interactively to either create the column or rename one of several existing columns to `popularity_rank` — meaning either:

1. The column exists in the live DB already (added manually outside the migration tooling, à la the project's existing manual-migration precedent for 07-01), and only the journal/snapshot is out of sync; OR
2. The column was added to `schema.ts` without a corresponding DDL push, and the live DB doesn't actually have it yet.

Either way, the unresolved diff causes `db:generate` to want to bundle an unrelated `popularity_rank` change into any new migration it emits. To keep Plan 11.4-01's migration scoped to the `image_url` addition only, the 0014 migration was hand-written following the `drizzle/0004_vocab_enrichment.sql` precedent (single ALTER TABLE ADD COLUMN IF NOT EXISTS) — same approach used for the 07-01 manual-migration precedent recorded in STATE.md.

**Why deferred:**
Out of scope for Plan 11.4-01 (which only touches `vocabulary_items`). Resolving the `songs.popularity_rank` drift requires investigating the live DB to determine whether the column already exists, then either:
- (a) hand-writing a no-op migration + meta snapshot entry to align tooling with the DB, or
- (b) writing a real `0015_songs_popularity_rank.sql` if the column hasn't been pushed yet.

**Suggested next phase:** Schema-hygiene cleanup — audit `schema.ts` against live DB and `drizzle/meta` to surface all drifted columns, then emit aligning migrations.

**Files:**
- `src/lib/db/schema.ts:73` (`popularity_rank: integer("popularity_rank")`)
- `drizzle/meta/_journal.json` (only entry: `0000_furry_zeigeist`; missing entries 0001-0013 indicate the journal has been incomplete since the project's first manual migration)

---

## D-02: Pre-existing failures in `tests/integration/regression-stale-lesson-data.test.ts`

**Found during:** Plan 11.4-01 Task 5 (`npm run test:integration -- seed-19b-load-vocab-images`)

**Issue:**
Three failing tests in `tests/integration/regression-stale-lesson-data.test.ts` (one expecting `buildQuestions` to return `[]` for empty vocab; one single-gate-architecture invariant about `ExerciseTab.tsx` importing `EXERCISE_FEATURE_FLAGS`; one `[3/3]` whose detail was clipped). All three are unrelated to `image_url` / Phase 11.4 — they reference Phase 08-01 architectural decisions and Phase 11 cross-song vocabulary.

**Why deferred:**
Out of scope per the SCOPE BOUNDARY rule (Plan 11.4-01 only touches the `image_url` column path). Plan 11.4-01's own Wave 0 integration test (`seed-19b-load-vocab-images.test.ts`) skips cleanly when `TEST_DATABASE_URL` is unset (4 tests | 4 skipped) — exactly as designed.

**Suggested next phase:** Triage during the next test-hygiene pass; the EXERCISE_FEATURE_FLAGS import in `ExerciseTab.tsx` may be a recent regression worth a fix-forward commit on its own.

**Files:**
- `tests/integration/regression-stale-lesson-data.test.ts` (3 of 10 tests failing)
- `src/app/songs/[slug]/components/ExerciseTab.tsx` (single-gate violation per the failing test)
