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
