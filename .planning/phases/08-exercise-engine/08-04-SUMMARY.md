---
plan: 08-04
status: complete
completed: 2026-04-16
commits:
  - 698949e
  - 8339d28
  - 8c172bd
---

# 08-04 Summary — Session Summary, Stars & Progress Ring

## What was built

- **`src/app/actions/exercises.ts`** — `saveSessionResults` server action that upserts `user_song_progress` using `GREATEST(accuracy)` and `LEAST(100, completion_pct)`. Returns `{ completionPct, stars, previousStars }` so the UI can detect newly-earned stars and trigger confetti.
- **`src/app/songs/[slug]/components/SessionSummary.tsx`** — Post-session screen with accuracy %, correct/total, time, star display with confetti on new-star earn, and 3 CTAs: Practice Again / Try Another Song / Dashboard.
- **`src/app/songs/[slug]/components/StarDisplay.tsx`** — 3 gold/gray stars; fires `canvas-confetti` when `animate=true` and a new star is detected.
- **`src/app/songs/[slug]/components/CircularProgress.tsx`** — SVG progress ring (red arc, top-origin) rendered on `SongCard` thumbnails.
- **`src/app/songs/components/SongCard.tsx`** — Now accepts optional `progress` prop; renders progress ring + stars when progress exists.
- **`src/app/songs/[slug]/components/ExerciseTab.tsx`** — Star-criteria section added to config screen; retry button relabeled "Return" per UX pass.
- **`src/app/songs/[slug]/components/ExerciseSession.tsx`** — Renders `SessionSummary` inline on completion.
- **`src/lib/db/queries.ts`** — `getUserSongProgress` and `getUserSongProgressBatch` added.
- **`src/lib/exercises/generator.ts`** — `vocab_meaning` prompt now shows reading hint next to kanji (e.g., `走る (はしる)`) so readings are surfaced when different from the surface form.
- **`src/app/globals.css`** — `star-shine` keyframe animation.

## Key decisions

- Stars derived at read time from `ex1_2_3_best_accuracy` and `ex4_best_accuracy` via `deriveStars()` — never stored.
- `GREATEST`/`LEAST` SQL ensures accuracy never decreases and completion never exceeds 100.
- Confetti only fires on NEW star earn (compare `stars > previousStars`).
- Progress ring is SVG rather than canvas — no additional deps, accessible, server-renderable.

## Verification

Human verification passed: Practice tab loads 15 questions on `again-yui` (full version) after DB migrations and vocab backfill were applied.

## Deviations

None from plan intent. Minor polish committed in the same session:
- `Start over` → `Return` label
- Reading hint on kanji prompts in `vocab_meaning` questions

## Infra work required (not in plan)

Plan 08-04 assumed Phase 7 DB artifacts were live. They were not — migrations `0001`/`0002`/`0003` and the vocab backfill had never been applied to Neon. Fixed this session:

- Added `scripts/apply-migrations.ts` — idempotent SQL runner (drizzle-kit push doesn't handle materialized views / custom SQL).
- Applied `0002_data_foundation.sql` and `0003_exercise_engine.sql`.
- Ran `npm run backfill:vocab` — 705 vocabulary_items, 1409 lesson vocab entries patched with UUIDs across 112 of 116 song versions. `vocab_global` refreshed.
