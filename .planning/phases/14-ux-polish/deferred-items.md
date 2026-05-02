# Phase 14 — Deferred Items (out-of-scope discoveries)

Items discovered during Phase 14 execution that are NOT caused by Phase 14
changes. Logged here so they're tracked but NOT auto-fixed (per execute-plan
SCOPE BOUNDARY rule).

## Plan 14-00 (Wave 0 scaffolding)

### D-PRE-01 — pre-existing test failures in regression-stale-lesson-data.test.ts (3 cases)
- **Source:** Phase 08-01 single-gate + Phase 11 cross-song (called out in
  STATE.md Plan 11.4-01 D-02 — "3 pre-existing failures... unrelated to image_url")
- **Cases:**
  - `vocab[0].vocab_item_id = undefined → entry is silently skipped, no throw`
  - `lesson.vocabulary = [] → buildQuestions returns empty array, no throw`
  - `no .tsx file under src/app/songs/[slug]/components imports EXERCISE_FEATURE_FLAGS`
- **Phase 14 impact:** None. These tests do not exercise design-system code.
- **Owner:** Whoever picks up the Phase 11.4 D-02 follow-up.

### D-PRE-02 — pre-existing test failures in scripts/seed/spot-check-tv-onsets.test.ts (3 cases)
- **Source:** seed-script tooling, predates Phase 14 entirely.
- **Cases:**
  - `Test 1: delta within ±500ms → PASS (delta=100ms)` — assertion says PASS but expected FAIL (test logic appears inverted)
  - `Test 2: delta 700ms → FAIL` — same shape as Test 1
  - `Test 4: negative delta (lesson earlier than audio onset) is correctly computed` — same shape
- **Phase 14 impact:** None. Seed-script audit, not a learner surface.
- **Owner:** Whoever runs the seed pipeline next.

### D-PRE-03 — eslint surfaces 904 errors + 1199 warnings on master
- **Source:** Pre-existing palette utility usage across in-scope surfaces
  (Tailwind palette, raw hex, arbitrary px, bare white/black).
- **Phase 14 impact:** EXPECTED. The kitsubeat-tokens/no-raw-tokens rule
  was just added in Plan 14-00 Task 2 specifically to flag these. Wave 1+
  per-surface migrations will land token swaps; the violation count drops
  to 0 by the Phase 14 merge.
- **Owner:** Wave 1+ migration plans (14-01 through 14-09).

### D-PRE-04 — pre-existing build flake: PageNotFoundError /api/review/queue
- **Source:** Webpack cache flake — error appears intermittently on
  `npm run build`, disappears on rerun. Not specific to Phase 14.
- **Phase 14 impact:** Build verification passed on the second attempt
  during Plan 14-00 Task 4 verification.
- **Owner:** None for now. If the flake recurs in CI, investigate webpack
  cache flush or Next.js issue tracker.

### D-PRE-05 — pre-existing invalid `export const runtime` in admin/lyrics actions (FIXED IN PLAN 14-00)
- **Source:** Phase 11.5 commits 6df7850..4972b3a committed `export const
  runtime = "nodejs"` in 7 "use server" files. Next.js disallows non-async
  exports in those files; build was failing on master before Plan 14-00.
- **Resolution:** Fixed inline as Rule 3 deviation in commit 95bd743 —
  required to capture bundle baseline (Plan 14-00 Task 1 prerequisite).
- **Owner:** Resolved.

## Plan 14-04 (Wave 1 — motion catalog + dev/states + dashboard cleanup + CI)

### D-PRE-06 — pre-existing build error: `useRef` not imported in admin/lyrics/components/VerseRow.tsx
- **Source:** Pre-existing dirty WIP from another work stream (admin/lyrics
  in-flight refactor). Outside Phase 14 scope per parent agent prompt.
- **Symptom:** `npm run build` reports `Type error: Cannot find name 'useRef'`
  at src/app/admin/lyrics/components/VerseRow.tsx:91. Production build halts.
- **Phase 14 impact:** None on the Plan 14-04 deliverables. Plan 14-04
  verification gates (vitest gate test, motion-catalog audit, Playwright
  dev-states + reduced-motion specs) all green; Plan 14-04 files compile
  cleanly under `npx tsc --noEmit` (zero new errors introduced).
- **Owner:** Admin/lyrics WIP work stream owner. Will be resolved when that
  branch lands.

## Plan 14-05 (Wave 2 — /songs/[slug] surface migration)

### D-PRE-07 — `react-hooks/purity` rule firing on pre-existing `Date.now()` in useRef initializers
- **Source:** Pre-existing — the same pattern (`useRef<number>(Date.now())`)
  exists at SentenceOrderCard.tsx:59, ConjugationCard.tsx, QuestionCard.tsx,
  ListeningDrillCard.tsx all from Phase 10. The rule fires from
  `eslint-plugin-react-hooks` (React 19 purity additions).
- **Phase 14 impact:** Plan 14-05 doesn't touch the offending lines. ESLint
  output of `npm run lint` for these files now shows the purity error after
  the kitsubeat-tokens errors clear (previously masked by 18+ token errors
  per file). The kitsubeat-tokens rule was the Phase 14 merge gate; the
  purity rule is unrelated.
- **Fix shape (deferred):** Replace `useRef<number>(Date.now())` with
  `useRef<number>(0)` + `if (!ref.current) ref.current = Date.now()` pattern,
  OR move the `Date.now()` call into a `useEffect`/`useState` initializer
  function (`useState(() => Date.now())`).
- **Owner:** Phase 11 / Phase 12 maintainers — these are exercise-card
  components from those phases, not Phase 14 design-system migrations.
