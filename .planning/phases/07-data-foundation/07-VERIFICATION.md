---
phase: 07-data-foundation
verified: 2026-04-15T00:00:00Z
status: passed
score: 14/14 must-haves verified
re_verification: false
---

# Phase 7: Data Foundation Verification Report

**Phase Goal:** A normalized vocabulary identity layer exists and grammar conjugation data is machine-parseable, enabling all downstream progress tracking and exercise generation to work from stable UUIDs rather than fragile text keys
**Verified:** 2026-04-15
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Plan 01)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | vocabulary_items table exists with (dictionary_form, reading) unique constraint | VERIFIED | schema.ts lines 140-161; migration SQL line 18 — `CONSTRAINT "vocabulary_items_form_reading_unique" UNIQUE ("dictionary_form", "reading")` |
| 2 | user_vocab_mastery table exists with FSRS scalar columns and indexed due date | VERIFIED | schema.ts lines 175-200; migration SQL lines 24-45 — stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, due, last_review all present; due_idx and user_due_idx created |
| 3 | user_exercise_log table exists referencing user_vocab_mastery | VERIFIED | schema.ts lines 212-225; migration SQL lines 51-60 — references vocabularyItems.id; song_version_id nullable |
| 4 | subscriptions table exists with generic provider fields | VERIFIED | schema.ts lines 236-255; migration SQL lines 64-76 — provider, provider_subscription_id, provider_customer_id all nullable |
| 5 | vocab_global materialized view is defined with unique index for CONCURRENTLY refresh | VERIFIED | schema.ts lines 270-290 — pgMaterializedView with LATERAL jsonb_array_elements; migration SQL lines 82-98 — UNIQUE INDEX `vocab_global_item_song_version_unique` on (vocab_item_id, song_id, version_type) |
| 6 | refreshVocabGlobal helper function exists and is wired into the song update path | VERIFIED | queries.ts lines 210-227 — full CONCURRENTLY/fallback implementation; timing route imports at line 18 and calls at line 112 |
| 7 | VocabEntry type in both lesson type files accepts optional vocab_item_id field | VERIFIED | src/lib/types/lesson.ts line 58 — `vocab_item_id?: string;`; scripts/types/lesson.ts line 97 — `vocab_item_id: z...` Zod field |

### Observable Truths (Plan 02)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 8 | Every distinct vocabulary entry across all song lessons has a stable UUID in vocabulary_items | VERIFIED | backfill-vocab-identity.ts lines 186-203 — batch insert with onConflictDoNothing; SUMMARY confirms 705 unique items extracted from 116 songs |
| 9 | Each vocab entry in lesson JSONB has a vocab_item_id field linking to its vocabulary_items row | VERIFIED | backfill-vocab-identity.ts lines 251-263 — patchedVocab maps entries to UUIDs; line 275 — db.update songVersions with patched lesson |
| 10 | Grammar conjugation paths are parsed into structured base/conjugated/type triples where possible | VERIFIED | conjugation-audit.ts lines 47-87 — parseConjugationPath with full arrow/Japanese-first-part logic; returns StructuredConjugation with base, conjugated, conjugation_type, is_structured |
| 11 | Unparseable conjugation paths are marked as unstructured and excluded from exercise eligibility | VERIFIED | conjugation-audit.ts lines 68-86 — grammar labels and no-arrow paths return is_structured=false; SUMMARY confirms 9% unstructured rate |
| 12 | Console summary shows counts of parseable vs skipped conjugation entries with examples | VERIFIED | backfill-vocab-identity.ts lines 334-356 — full summary block with parseable%, skipped%, and up to 5 examples |
| 13 | The backfill script is idempotent — re-running produces no duplicates or errors | VERIFIED | lines 10, 203 — onConflictDoNothing documented and implemented; vocab_item_id overwrite is no-op |
| 14 | vocab_global materialized view is refreshed after backfill completes | VERIFIED | backfill-vocab-identity.ts lines 316-328 — `db.refreshMaterializedView(vocabGlobal)` in Phase 4, wrapped in try/catch |

**Score:** 14/14 truths verified

---

## Required Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `src/lib/db/schema.ts` | vocabularyItems, userVocabMastery, userExerciseLog, subscriptions, vocabGlobal | VERIFIED | 290 lines; all 4 tables + materialized view exported with full type exports |
| `drizzle/0002_data_foundation.sql` | SQL migration for all new tables and materialized view | VERIFIED | 98 lines; all 4 tables, mat view, and unique index present |
| `src/lib/types/lesson.ts` | VocabEntry with optional vocab_item_id | VERIFIED | Line 58: `vocab_item_id?: string;` |
| `scripts/types/lesson.ts` | VocabEntrySchema with optional vocab_item_id | VERIFIED | Line 97: Zod uuid optional field |
| `src/lib/fsrs-presets.ts` | INTENSITY_PRESETS and IntensityPreset type | VERIFIED | 30 lines; light/normal/intensive presets using ts-fsrs generatorParameters |
| `scripts/lib/conjugation-audit.ts` | parseConjugationPath, auditConjugationPaths, StructuredConjugation | VERIFIED | 130 lines; all three exports substantively implemented |
| `scripts/backfill-vocab-identity.ts` | Idempotent 4-phase backfill script | VERIFIED | 363 lines; well above min_lines=100; all 4 phases implemented |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/db/schema.ts` | `drizzle/0002_data_foundation.sql` | drizzle-kit generate (manual) | VERIFIED | Migration contains `CREATE TABLE IF NOT EXISTS "vocabulary_items"` matching schema |
| `schema.ts::userVocabMastery` | `schema.ts::vocabularyItems` | FK reference | VERIFIED | Line 178: `.references(() => vocabularyItems.id)` |
| `backfill-vocab-identity.ts` | `schema.ts::vocabularyItems` | drizzle insert with onConflictDoNothing | VERIFIED | Lines 26, 186-203: imports vocabularyItems, calls `.onConflictDoNothing()` |
| `backfill-vocab-identity.ts` | `schema.ts::songVersions` | drizzle select + update for JSONB patching | VERIFIED | Lines 26, 99, 273-275: imports songVersions, queries and updates it |
| `backfill-vocab-identity.ts` | `schema.ts::vocabGlobal` | refreshMaterializedView after backfill | VERIFIED | Lines 27, 322: imports vocabGlobal, calls `db.refreshMaterializedView(vocabGlobal)` |
| `backfill-vocab-identity.ts` | `scripts/lib/conjugation-audit.ts` | import parseConjugationPath | VERIFIED | Lines 31-32: imports parseConjugationPath and auditConjugationPaths |
| `src/lib/db/queries.ts::refreshVocabGlobal` | `src/app/api/admin/timing/[songId]/route.ts` | import + call after song version PUT | VERIFIED | timing route line 18: import; line 112: `await refreshVocabGlobal()` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DATA-01 | 07-02-PLAN.md | Grammar conjugation paths audited and converted to structured format for exercise generation | SATISFIED | `scripts/lib/conjugation-audit.ts` exports `parseConjugationPath` returning structured base/conjugated/type triples; SUMMARY reports 91% parse rate (exceeds 80% threshold); backfill script runs audit and prints console summary |
| DATA-02 | 07-01-PLAN.md, 07-02-PLAN.md | Normalized vocabulary identity table with UUIDs enabling cross-song word matching by (surface, reading) | SATISFIED | `vocabulary_items` table with `vocabulary_items_form_reading_unique` constraint; backfill script inserts 705 items with UUID resolution; JSONB patching adds `vocab_item_id` to all 1409 vocab entries across 116 songs |

**Orphaned requirements check:** REQUIREMENTS.md maps only DATA-01 and DATA-02 to Phase 7. Both are claimed by plans and verified. No orphaned requirements.

---

## Anti-Patterns Found

No anti-patterns detected. Scanned `src/lib/db/schema.ts`, `scripts/backfill-vocab-identity.ts`, `scripts/lib/conjugation-audit.ts`, `src/lib/fsrs-presets.ts`, `src/lib/db/queries.ts` for TODO/FIXME/placeholder/stub patterns — all clean.

---

## Human Verification Required

### 1. Migration applied to production database

**Test:** Run `drizzle-kit push` or `drizzle-kit migrate` against the Neon database and confirm all 4 tables and the materialized view exist.
**Expected:** `\dt vocabulary_items`, `\dt user_vocab_mastery`, `\dt user_exercise_log`, `\dt subscriptions`, `\dm vocab_global` all return rows in psql.
**Why human:** Cannot verify database state programmatically from static analysis — requires live DB access.

### 2. Backfill ran successfully on live DB

**Test:** Run `npm run backfill:vocab` against the Neon database and inspect output.
**Expected:** Summary shows 705 (or more) unique vocabulary items, 116 song versions processed, 0 skipped, and materialized view refreshed successfully. `SELECT count(*) FROM vocabulary_items` returns > 0.
**Why human:** SUMMARY describes a dry-run result. Live DB state requires human confirmation.

### 3. vocab_global materialized view populates after backfill

**Test:** After running `npm run backfill:vocab` on live DB, run `SELECT count(*) FROM vocab_global`.
**Expected:** Returns a positive count matching the vocab entries patched with vocab_item_id.
**Why human:** View population depends on live DB state; verifiable only after migration + backfill run.

---

## Gaps Summary

No gaps. All 14 must-have truths are VERIFIED. All artifacts exist, are substantive, and are wired. Both DATA-01 and DATA-02 requirements are satisfied by actual code — not stubs or placeholders. Three items require human verification but are process-level checks (migration applied, script run on live DB), not code defects.

---

_Verified: 2026-04-15_
_Verifier: Claude (gsd-verifier)_
