---
phase: 07-data-foundation
plan: 02
subsystem: data-scripts
tags: [vocabulary, backfill, conjugation, fsrs, materialized-view]
dependency_graph:
  requires:
    - 07-01  # vocabulary_items table, vocabGlobal view, songVersions schema
  provides:
    - vocab-identity-layer  # vocab_item_id patched into all lesson JSONB
    - conjugation-audit-library  # parseConjugationPath for Phase 10 exercise eligibility
  affects:
    - src/lib/db/schema.ts  # vocabGlobal now populated after backfill
    - song_versions.lesson  # vocab_item_id patched into all 116 rows
tech_stack:
  added: []
  patterns:
    - drizzle onConflictDoNothing for idempotent inserts
    - JSONB patching with full row update (lesson column)
    - Script variant merge (hiragana-only → use reading as dictionary_form)
    - Non-concurrent materialized view refresh for first-run population
key_files:
  created:
    - scripts/lib/conjugation-audit.ts
    - scripts/backfill-vocab-identity.ts
  modified:
    - package.json  # added backfill:vocab npm script
decisions:
  - "parseConjugationPath called on-demand at exercise time — no JSONB mutation for grammar"
  - "Full vocabulary_items table scan for UUID resolution avoids large IN clause parameters"
  - "Non-concurrent refresh for first population; CONCURRENTLY available after population"
metrics:
  duration_seconds: 211
  tasks_completed: 2
  files_changed: 3
  completed_date: "2026-04-15"
requirements:
  - DATA-01
  - DATA-02
---

# Phase 7 Plan 02: Vocabulary Backfill and Conjugation Audit Summary

**One-liner:** Idempotent backfill assigns stable UUIDs to 705 vocab items across 116 songs, with 91% conjugation path parse rate.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create conjugation path parser | 0e8b60b | scripts/lib/conjugation-audit.ts |
| 2 | Create idempotent vocabulary backfill script | 5d65e72 | scripts/backfill-vocab-identity.ts, package.json |

## What Was Built

### Task 1: Conjugation Path Parser (`scripts/lib/conjugation-audit.ts`)

Exports:
- `StructuredConjugation` interface — base/conjugated/conjugation_type/is_structured
- `parseConjugationPath(path)` — parses free-text conjugation_path into structured triple
  - Arrow + Japanese first part → structured (e.g. `食べる → 食べた`)
  - Arrow + grammar label first part → unstructured (e.g. `dictionary form → te-form`)
  - Pattern-only (no arrow) → unstructured (e.g. `〜ている`)
  - undefined/null/empty → null
- `auditConjugationPaths(grammarPoints[])` → `{ parsed, skipped, total }`

### Task 2: Vocabulary Backfill Script (`scripts/backfill-vocab-identity.ts`)

Four-phase script:

**Phase 1: Extract and deduplicate vocabulary**
- Loads all 116 song_versions with lessons from Neon
- Parses lesson JSONB with `LessonSchema.safeParse` — 0 skipped
- Applies script variant merge: surfaces without kanji use reading as dictionary_form
- Detects katakana loanwords with `KATAKANA_ONLY_RE`
- Deduplicates by `(dictionary_form, reading)` key
- Batch inserts into `vocabulary_items` with `onConflictDoNothing` (chunks of 50)

**Phase 2: JSONB patching**
- Resolves UUIDs via full `vocabulary_items` table scan
- Patches `vocab_item_id` into each `VocabEntry` in lesson JSONB
- Updates `song_versions` rows in batches of 15 to avoid connection timeouts

**Phase 3: Conjugation audit**
- Collects all grammar_points from all lessons
- Calls `auditConjugationPaths` for summary
- DECISION: Does NOT mutate GrammarPoint JSONB — `parseConjugationPath` is called on-demand at exercise generation time (Phase 10)

**Phase 4: Refresh vocab_global**
- Non-concurrent refresh on first run (view may be empty)
- `db.refreshMaterializedView(vocabGlobal)`

### Dry-Run Output (verified on local DB with 116 songs)

```
Song versions processed: 116
Unique vocabulary items: 705
Katakana loanwords flagged: 3
JSONB rows patched: 116 (1409 vocab entries)

Conjugation Audit:
Total grammar points: 648
With conjugation_path: 602
Parseable (structured): 547 (91%)  ← exceeds 80% threshold
Skipped (unstructured): 55 (9%)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed fragile raw SQL UUID resolution query**
- **Found during:** Task 2 implementation
- **Issue:** Initial approach used `sql.raw()` with parameterized `IN (VALUES ...)` which is error-prone with large parameter lists and fragile string interpolation
- **Fix:** Replaced with full `vocabulary_items` table scan and in-memory Map lookup — simpler, correct, and avoids large IN clauses
- **Files modified:** scripts/backfill-vocab-identity.ts
- **Commit:** 5d65e72

## Self-Check

- [x] scripts/lib/conjugation-audit.ts — created and tested
- [x] scripts/backfill-vocab-identity.ts — created and dry-run verified
- [x] package.json backfill:vocab script added
- [x] Commits 0e8b60b and 5d65e72 exist
- [x] All tests passed (5/5 unit assertions + successful dry-run on 116 real songs)

## Self-Check: PASSED
