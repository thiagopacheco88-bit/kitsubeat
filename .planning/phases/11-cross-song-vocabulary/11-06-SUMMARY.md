---
phase: 11-cross-song-vocabulary
plan: "06"
subsystem: review
tags: [distractor-pool, jlpt-pools, review-session, gap-closure]
dependency_graph:
  requires:
    - "11-05"  # ReviewSession + ReviewLanding + /api/review/queue exist
  provides:
    - jlptPools field on /api/review/queue response
    - vocabRowToVocabEntry adapter in src/lib/review/distractors.ts
    - real 4-option MCQ cards in ReviewSession
  affects:
    - src/app/api/review/queue/route.ts
    - src/app/review/ReviewSession.tsx
    - src/app/review/ReviewLanding.tsx
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
tech_stack:
  added: []
  patterns:
    - pickDistractors reused verbatim from src/lib/exercises/generator.ts
    - shape adapter pattern (VocabRow -> VocabEntry) mirrors ExerciseTab.tsx lines 134-149
    - describe.skipIf(!HAS_TEST_DB) gating pattern (same as Phase 08.1 integration tests)
key_files:
  created:
    - src/lib/review/distractors.ts
    - src/lib/review/__tests__/distractors.test.ts
    - src/app/api/review/queue/__tests__/route.test.ts
  modified:
    - src/app/api/review/queue/route.ts
    - src/app/review/ReviewSession.tsx
    - src/app/review/ReviewLanding.tsx
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
decisions:
  - "jlptPools built in one combined SQL query (inArray on jlpt_level + notInArray on id) — one roundtrip cheaper than N per-level fetches; first 50 per level is sufficient for pickDistractors"
  - "sameSongPool=[] in ReviewSession.buildQuestion by design — cross-song review has no same-song context; jlpt-level pool is the sole distractor source"
  - "Module-level warnedNullLevel flag prevents console.warn spam on null-jlpt_level vocab — fires at most once per page load"
  - "DbJlptLevel type alias defined inline in route.ts to satisfy drizzle pgEnum overload without importing JlptLevel (which includes 'unknown' not in DB enum)"
metrics:
  duration_minutes: 7
  completed_date: "2026-04-18"
  tasks_completed: 3
  files_changed: 7
---

# Phase 11 Plan 06: Gap Closure — Real Distractors for Review Session Summary

**One-liner:** jlptPools enrichment on /api/review/queue + vocabRowToVocabEntry adapter closes the distractors:[] gap so ReviewSession renders real 4-option MCQ cards.

## What Was Built

### Task 1: Server-side distractor-pool enrichment + adapter + tests

**`/api/review/queue` response extended with `jlptPools`:**

The GET handler was extended with a two-step pool-building block inserted after the `vocabData` lookup and before `NextResponse.json(...)`:

1. Compute unique JLPT levels from `vocabData` values (skipping null/empty levels).
2. Build a `queuedIds` exclusion set from `items[].vocab_item_id`.
3. If any levels exist, execute one combined drizzle query:
   ```ts
   .where(and(
     inArray(vocabularyItems.jlpt_level, jlptLevels as DbJlptLevel[]),
     notInArray(vocabularyItems.id, Array.from(queuedIds))
   ))
   ```
4. Group results by `jlpt_level`, cap each pool at 50 rows.
5. Return `jlptPools` alongside `items`, `vocabData`, `due_count`, `new_count`, `budget_remaining`.

The `inArray` call requires casting `string[]` to `DbJlptLevel[]` — drizzle's pgEnum column overload rejects `string[]`. A local `type DbJlptLevel = "N5" | "N4" | "N3" | "N2" | "N1"` alias was defined to satisfy the type without importing `JlptLevel` from lesson.ts (which includes `"unknown"`, absent from the DB enum).

**Exclusion rule:** Any `vocab_item_id` already in `items` is excluded from all pools, preventing a distractor from revealing a later-queued card.

**`src/lib/review/distractors.ts` — `vocabRowToVocabEntry` adapter:**

Pure shape adapter from `VocabRow` (API response) to `VocabEntry` (generator input). Populates all fields required by `pickDistractors`; `example_from_song` and `additional_examples` get safe empty defaults since `pickDistractors` does not read them. Mirrors the adapter pattern in `ExerciseTab.tsx` lines 134-149.

**Tests — 7 unit cases (distractors.test.ts):**
- String meaning wraps to `{ en: "..." }`
- Object meaning passes through unchanged
- `null` `jlpt_level` falls back to `"N5"`
- `vocab_item_id` maps from `row.id`; surface/reading/romaji are non-empty
- Property test: for each of the 3 `ReviewQuestionType` values, `pickDistractors(correctEntry, type, [], pool)` returns exactly 3 unique, non-correct-answer strings

**Integration test — 5 cases (route.test.ts):**
- `jlptPools` field present (not undefined)
- Pool keys match only JLPT levels in `vocabData`
- No pool row `id` appears in `items` (no self-distractor cross-contamination)
- Each pool has `length <= 50`
- Empty queue returns `jlptPools: {}`
- Gated by `describe.skipIf(!HAS_TEST_DB)` — all 5 skipped when `TEST_DATABASE_URL` is unset; type-only compile check locks the response shape.

### Task 2: Wire real distractors into ReviewSession + thread jlptPools

**`ReviewSession.tsx` — closed the `distractors: []` gap:**

- Added `jlptPools?: Record<string, VocabRow[]>` to `ReviewSessionProps` (default `{}` on destructure).
- Imported `pickDistractors` from `@/lib/exercises/generator` and `vocabRowToVocabEntry` from `@/lib/review/distractors`.
- `buildQuestion` signature changed to `(item, vocab, jlptPools)` — accepts pools as a third argument.
- Inside `buildQuestion`:
  1. Resolve pool rows: `vocab.jlpt_level ? (jlptPools[vocab.jlpt_level] ?? []) : []`
  2. Convert correct vocab to `VocabEntry` via `vocabRowToVocabEntry`
  3. Map pool rows via `vocabRowToVocabEntry`
  4. Call `pickDistractors(correctEntry, type, [], poolEntries)` — `sameSongPool=[]` by design
  5. Return `distractors` (the result) instead of `[]`
- Module-level `warnedNullLevel` flag fires `console.warn` at most once per page load when `vocab.jlpt_level` is null or pool returns < 3 distractors.
- Pre-existing TS2454 errors (prompt/correctAnswer used before assigned) fixed by initializing both to `""` before the switch.

**`ReviewLanding.tsx` — threads jlptPools:**

- Added `jlptPools: Record<string, VocabRow[]>` to `QueueResponse` interface.
- Added `const [jlptPools, setJlptPools] = useState<Record<string, VocabRow[]>>({})`.
- In `handleStart`: `setJlptPools(data.jlptPools ?? {})` after `setVocabData`.
- `<ReviewSession jlptPools={jlptPools} ... />` prop added.
- `onBack` resets `setJlptPools({})`.

### Task 3: Tracking-doc flips

**`.planning/REQUIREMENTS.md`:**
- Requirements section: CROSS-01, CROSS-02, CROSS-03 checkboxes flipped `[ ]` → `[x]`.
- Traceability table: CROSS-01, CROSS-02, CROSS-03 Status column flipped `Pending` → `Complete`.
- No other rows touched.

**`.planning/ROADMAP.md`:**
- Phase 11 Plans list: `11-04-PLAN.md` and `11-05-PLAN.md` rows flipped `[ ]` → `[x]`.
- Phase 11 header already `[x]` — left unchanged.
- No 11-06 entry added (gap-closure plans do not appear in ROADMAP).

## Invariants Preserved

- `src/lib/review/queue-builder.ts` was NOT modified — `Exclude<ExerciseType, "fill_lyric">` at line 23 is intact.
- `pickDistractors` from `src/lib/exercises/generator.ts` is reused verbatim — no new distractor picker introduced.
- No new `/api/review/distractors` route — `ls src/app/api/review/` shows only `budget/ known-count/ queue/ vocab-data/`.
- `export const dynamic = "force-dynamic"` and `Cache-Control: private, no-store` preserved in route.

## Null jlpt_level Fallback Behavior

When a `VocabRow` has `jlpt_level: null`:
1. `poolRows` resolves to `[]` (no pool entry for null key).
2. `pickDistractors` called with empty `poolEntries` — returns 0 distractors.
3. `ReviewQuestionCard` renders a single-button card (the correct answer only).
4. `warnedNullLevel` fires `console.warn` once per session identifying the vocab UUID.
5. User can still answer (trivially correct) — session continues normally.

This is the accepted edge case per 11-VERIFICATION.md CONTEXT notes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] drizzle pgEnum overload rejects string[] in inArray**
- **Found during:** Task 1 — TypeScript compile check after writing route.ts
- **Issue:** `inArray(vocabularyItems.jlpt_level, jlptLevels)` where `jlptLevels: string[]` fails drizzle's overload: pgEnum column expects `("N5" | "N4" | "N3" | "N2" | "N1")[]`
- **Fix:** Defined local `type DbJlptLevel = "N5" | "N4" | "N3" | "N2" | "N1"` and cast `jlptLevels as DbJlptLevel[]`. Could not use `JlptLevel` from `@/lib/types/lesson` because it includes `"unknown"` which is absent from the DB enum definition.
- **Files modified:** `src/app/api/review/queue/route.ts`
- **Commit:** 79956b7

**2. [Rule 1 - Bug] Pre-existing TS2454 — prompt/correctAnswer used before assigned**
- **Found during:** Task 2 (became visible when touching ReviewSession.tsx)
- **Issue:** Switch statement in `buildQuestion` did not initialize `prompt`/`correctAnswer` before the switch, causing TS2454 even though exhaustive. Pre-existing from 11-05.
- **Fix:** Initialized both to `""` before the switch — no behavior change since all cases assign before any read.
- **Files modified:** `src/app/review/ReviewSession.tsx`
- **Commit:** e0e1ebc

## Self-Check: PASSED

Files created:
- src/lib/review/distractors.ts: EXISTS
- src/lib/review/__tests__/distractors.test.ts: EXISTS
- src/app/api/review/queue/__tests__/route.test.ts: EXISTS

Commits:
- 79956b7: feat(11-06): enrich /api/review/queue with jlptPools + vocabRowToVocabEntry adapter
- e0e1ebc: feat(11-06): wire real distractors into ReviewSession + thread jlptPools via ReviewLanding
- bbd5867: chore(11-06): flip CROSS-01/02/03 to Complete and 11-04/11-05 to [x]
