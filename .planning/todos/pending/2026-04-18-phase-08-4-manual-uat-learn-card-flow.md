---
created: 2026-04-18T18:30:00.000Z
title: Phase 08.4 manual UAT — 7 browser tests for learn-card flow
area: qa
files:
  - .planning/phases/08.4-learn-phase-session-pacing-for-new-vocabulary-presentation-step-before-first-exercise-skip-learning-user-preset-new-card-cap-per-session/08.4-VERIFICATION.md
  - src/app/songs/[slug]/components/ExerciseTab.tsx
  - src/app/songs/[slug]/components/ExerciseSession.tsx
  - src/app/songs/[slug]/components/LearnCard.tsx
  - src/app/profile/ProfileForm.tsx
---

## Problem

Phase 08.4 (learn-phase + session pacing) passed all 12/12 automated verification checks on 2026-04-17. Seven behavioural tests remain — they require a running dev server, live Neon DB, and a browser with Japanese TTS. Until they run, the phase is functionally complete but UAT-pending.

Full list from [08.4-VERIFICATION.md](.planning/phases/08.4-learn-phase-session-pacing-for-new-vocabulary-presentation-step-before-first-exercise-skip-learning-user-preset-new-card-cap-per-session/08.4-VERIFICATION.md):

1. **End-to-end cap filtering + JIT LearnCard** — free user, song with >10 new words. Expect exactly 10 new/relearning in session, LearnCard before first exercise of each, tap-bg dismisses to QuestionCard at same index (progress bar does not advance during card).
2. **Reveal vs advance tap semantics** — Tap "Show more" expands mnemonic + kanji_breakdown inline. Subsequent tap on background dismisses card only.
3. **TTS speaker icon** — Chrome/Edge w/ Japanese voice. Tap plays pronunciation; card does not advance. Rapid double-tap cancels + restarts.
4. **skip_learning toggle end-to-end** — Check on `/profile`, save. New session renders zero LearnCards; cap still applies.
5. **Free user `/profile`** — No subscription row. Cap input visually disabled, "Upgrade to premium..." hint visible, toggle still works.
6. **Premium user cap editing** — Active `premium_monthly` row. Cap input enabled (1–30); save 15, reload, verify persisted; new session respects raised cap.
7. **Session resume across reload** — Dismiss two LearnCards, hard-reload. Already-dismissed cards do not reappear; session resumes at correct index.

## Solution

Spin up dev server, walk through the 7 tests, document pass/fail. If any fail, file a focused bug and flip Phase 08.4 status from `human_needed` to `failed_human_verification` with specifics.

Reference test data needed:
- A song with >10 new vocab (any newly-seeded song with a fresh user row will do)
- Two users in DB: one with no `subscriptions` row (free) and one with `status='active'`, `plan='premium_monthly'`
- Modern Chrome/Edge for TTS coverage

On pass of all 7: flip 08.4-VERIFICATION.md `status` to `passed` and close this todo.
