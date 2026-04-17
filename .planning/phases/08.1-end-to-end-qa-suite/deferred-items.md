# Deferred Items — Phase 08.1 End-to-End QA Suite

Items discovered during plan execution that are out of scope for the originating plan and need separate triage.

## Plan 08.1-05 (player E2E specs)

### CRITICAL — Pre-existing 500 error on song player route

**Discovered:** 2026-04-17 during Task 4 verification of plan 08.1-05.

**Symptom:** `GET http://localhost:7000/songs/again-yui` returns HTTP 500. The page renders the Next.js error boundary instead of the song layout.

**Error message (from rendered HTML):**
> Objects are not valid as a React child (found: object with keys {en, es, pt-BR}). If you meant to render a collection of children, use an array instead.

**Root cause:** The `Localizable` type (`Record<string, string>` with `en`/`es`/`pt-BR` keys) is being passed directly as a React child in one or more of:
- `src/app/songs/[slug]/components/VerseBlock.tsx` (lines ~70, 76, 81 — three TS2322 errors against `Localizable` -> `ReactNode`)
- `src/app/songs/[slug]/components/TokenPopup.tsx` (line 60 — same TS2322)
- `src/app/songs/[slug]/components/VocabularySection.tsx` (line 116 — same TS2322)
- `src/app/songs/[slug]/components/GrammarSection.tsx` (line 69 — TS2345 `Localizable` -> `string`, plus split() expression-not-callable)

These are pre-existing TypeScript errors visible in `npx tsc --noEmit` output BEFORE plan 08.1-05's changes. The same 24 TS errors are present in HEAD before and after plan 08.1-05 commits.

**Impact on plan 08.1-05:**
- All 4 player E2E spec files were authored, type-checked, and committed (commits `48e0fc8`, `140530a`, `f03ba25`).
- Playwright collects 12 tests across the 4 specs.
- Test execution: only 1 of 12 passed (`404 surface for unknown slug` — no DB query path). The other 11 either failed or skipped because the song page never reaches a renderable state due to the 500.
- The `data-start-ms` / `data-active` / `__kbPlayer` instrumentation IS in place — it would activate the moment the page renders successfully.

**Suggested fix scope (NOT done in this plan):**
- Resolve the `Localizable` -> `ReactNode` mismatch by either:
  - Picking a language at the boundary: `meaning[lang] ?? meaning.en ?? ""` everywhere `meaning` is rendered
  - Adding a `Localized` helper component: `<Localized value={meaning} lang={lang} />`
- Likely a 30-minute refactor across 4 files. Would also unblock a chunk of the standing TS error count (currently 24 → likely ~12-16 after).

**Recommended next action:** A small follow-up plan or hotfix commit to resolve `Localizable` rendering. Once the song page returns 200, plan 08.1-05's specs should pass without further changes (pending the `again-yui` slug being present in whichever DB is configured).

---

### MINOR — Test-only instrumentation only activates with NEXT_PUBLIC_APP_ENV=test

The `__kbPlayer` exposure and `data-start-ms` attribute are gated EXCLUSIVELY on `process.env.NEXT_PUBLIC_APP_ENV === "test"`. `playwright.config.ts` `webServer.env` sets this. If an operator runs `npm run dev` directly (no env), the player E2E sync tests will skip with "YouTube iframe / IFrame API unavailable" — which is correct degraded behavior but worth flagging in case it confuses a manual debug run.

To debug the sync spec interactively: `NEXT_PUBLIC_APP_ENV=test npm run dev`, then `window.__kbPlayer` will populate after the YT API initialises.

---

## Plan 08.1-06 (exercise E2E specs)

### Same Localizable rendering blocker (re-observed 2026-04-17)

Re-confirmed during 08.1-06 Task 4 verification: running
`npx playwright test tests/e2e/exercise-session-full.spec.ts` against the live
dev server reproduces the same `Objects are not valid as a React child` error
on `/songs/again-yui`. The exercise specs cannot reach the Practice tab until
the LyricsPanel/VerseBlock Localizable rendering is fixed.

**Status of plan 08.1-06 deliverables:**
- All 4 exercise spec files authored, type-checked, and committed (`d782df3`,
  `50b2367`, `082c815`).
- `window.__kbExerciseStore` test hook wired and gated on
  `NEXT_PUBLIC_APP_ENV === 'test'` (single condition; verified by grep).
- `data-question-id`, `data-question-type`, `data-feedback`, `data-stars`
  instrumentation in production-safe components (no `data-correct` exposed).
- `saveSessionResults` Step 7 wires per-vocab `userVocabMastery` upserts using
  the 08.2-01 FSRS scheduler. The action's exercises.ts changes were rolled
  into commit `208233e` by the parallel 08.2-02 agent — the wiring is in HEAD.
- `playwright.config.ts` gains `testMatch=*.spec.ts` and `testIgnore=**/integration/**`
  so vitest .test.ts files aren't collected by Playwright.
- Specs will pass green the moment the Localizable bug is fixed AND
  TEST_DATABASE_URL is provisioned (FSRS DB-write tests gated via test.skip).

### TEST_DATABASE_URL not provisioned in this environment

Hard FSRS DB-write assertions in `exercise-progress-fsrs.spec.ts` are gated via
`test.skip(!process.env.TEST_DATABASE_URL, ...)`. They are HARD assertions
(no `.fixme`) — they activate automatically once the operator finishes the
.env.test setup documented in `.env.test.example`.

### Pre-existing TypeScript errors in scheduler.ts

- `src/lib/fsrs/scheduler.ts(84,5)` missing `learning_steps` field
- `src/lib/fsrs/scheduler.ts(101,38)` Rating not assignable to Grade

Introduced by plan 08.2-01. Not in 08.1-06 scope. Operator action: add
`learning_steps: prev.learning_steps ?? 0` to the Card construction in scheduler.ts
and align the Rating → Grade cast.

### Pre-existing TypeScript errors in admin/timing route

`src/app/admin/timing/[songId]/page.tsx` and `src/app/api/admin/songs/route.ts`
reference `timing_data`, `timing_verified`, `timing_youtube_id` columns on the
`songs` table — these moved to `song_versions` in the v2.0 schema split.
Operator action: re-point handlers at `song_versions` (join on `song_id`).
