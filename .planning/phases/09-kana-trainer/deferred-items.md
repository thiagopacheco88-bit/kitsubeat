# Deferred Items — Phase 09 Kana Trainer

Pre-existing typecheck errors discovered during plan 01 execution (NOT caused by kana subsystem). Out of scope for plan 01 — fix where they belong.

## Pre-existing TS errors (unrelated to plan 09-01)

- `.next/types/app/api/exercises/vocab-mastery/[vocabItemId]/route.ts` — Next 15 RouteContext params type (Promise vs sync) mismatch
- `src/app/admin/timing/[songId]/page.tsx` — refers to `timing_data`, `timing_verified`, `timing_youtube_id` columns missing from songs schema
- `src/app/api/admin/songs/route.ts` — same missing timing_* columns
- `src/lib/fsrs/scheduler.ts(84,5)` — Card type missing `learning_steps`
- `src/lib/fsrs/scheduler.ts(101,38)` — Rating not assignable to Grade

These do not reference `src/lib/kana/*` and existed before plan 09-01 started.
