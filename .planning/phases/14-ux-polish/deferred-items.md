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

### D-PRE-08 — pre-existing sub-44 tap targets + ~24px horizontal overflow on /songs/[slug]
- **Source:** Out-of-scope-for-Plan-14-05 components on the `/songs/[slug]`
  page that pre-date Phase 14:
  - **Header nav** (`src/app/components/header/*`): "Songs", "Kana",
    "Progress", "0 words", "Profile" links rendered at 20px height.
    Slated for Plan 14-09.
  - **Version selector** (`SongContent.tsx`): "Anime Version" / "Full
    Version" tabs at 32px height. Slated for a future cleanup plan
    (Plan 14-05 only ships the lesson-area surface).
  - **Tab strip** (`SongContent.tsx`): "vocabulary" / "grammar" / "practice"
    tabs at 30px height. Same plan as version selector.
  - **Vocabulary section** (`VocabularySection.tsx`): "By type" / "By JLPT"
    + per-POS filter chips at 24px height. Same plan.
  - **Grammar section** (`GrammarSection.tsx`): "Romaji ON" + per-card
    chevron buttons at 20-24px height. Same plan.
  - **Lyric controls** (`PlayerControls.tsx`): "Furigana ON" / "Romaji ON" +
    "English" / "Portugues" / "Espanol" language pills at 24px height.
    Same plan.
- **Plan 14-05 impact:** The mobile-parity tap-target test scopes its
  selectors to Plan 14-05's `files_modified` only via in-scope `data-testid`
  wrappers (advanced-drills-start, grammar-session-start, learn-card-*, and
  every `[data-question-id] button|a` inside the migrated exercise cards).
  Out-of-scope buttons fail the spec but are not asserted in Plan 14-05.
  The horizontal-scroll assertion is set to <=24px (currently ~23px) — a
  lenient threshold that catches NEW regressions Plan 14-05 might introduce
  while acknowledging the pre-existing overflow from `LyricsPanel` /
  `SongLayout` lyrics column on narrow viewports.
- **Fix shape (per future plan):** Apply `min-h-11 inline-flex items-center`
  to every sub-44 button. Bump `px-2` → `px-3` to compensate for visual
  density change. Or migrate to `<Button variant="secondary" size="sm">`.
- **Owner:** 14-06 (catalog selector cleanup), 14-09 (header nav), and a
  yet-to-be-numbered "lesson chrome" plan for SongContent + VocabularySection
  + GrammarSection + PlayerControls. When all four ship, the
  mobile-parity.spec.ts `<=24` threshold can drop to `<=0` and the
  tap-target assertion can broaden from in-scope-only to whole-page.

## Plan 14-07 (Wave 3 — /review + /vocabulary + /profile + cross-cutting modals)

### D-PRE-09 — react-hooks v6+ purity errors in ProfileForm.tsx (cookie write + setState in effect)
- **Source:** Plan 14-03 commit `5897f68` introduced both patterns:
  - Line 54: `setThemePreferenceLocal(m[1] as ThemePref)` inside `useEffect`
    (cookie-seed pattern)
  - Line 66: `document.cookie = ...` assignment inside `handleThemeChange`
    (optimistic UI pattern)
- **Pre-existing baseline:** `git stash` + lint shows the same 2 errors EXIST
  without Plan 14-07 changes. Previously masked behind 26 kitsubeat-tokens
  errors; once tokens cleared (Plan 14-07 token migration), the react-hooks
  v6+ purity rules became visible — same pattern as D-PRE-07 for
  SentenceOrderCard.
- **Phase 14 impact:** Zero on Plan 14-07's deliverables. The
  kitsubeat-tokens rule is the Phase 14 merge gate; it reports **0 errors**
  on ProfileForm. The react-hooks rules are unrelated to the token system.
- **Fix shape (deferred):** Both patterns are actually safe in their context
  (user-initiated callbacks, not effect bodies). Either:
  1. Add `// eslint-disable-next-line react-hooks/immutability` and
     `// eslint-disable-next-line react-hooks/set-state-in-effect` comments,
     OR
  2. Refactor `handleThemeChange` to use `useTransition` wrapper (the cookie
     write becomes a side effect of a transition, not direct mutation).
- **Owner:** Plan 14-03 maintainers / future Phase 16 lint-cleanup pass.

### D-PRE-10 — Palette utilities in non-listed /review + /vocabulary + /profile files [CLOSED IN PLAN 14-09]
- **Source:** Files with palette utilities that are NOT in Plan 14-07's
  `files_modified` list:
  - `src/app/review/ReviewQuestionCard.tsx` (gray, green, red option styles)
  - `src/app/review/ReviewFeedbackPanel.tsx` (green/red feedback colors,
    gray text, indigo mnemonic panel)
  - `src/app/vocabulary/VocabularyList.tsx` (gray text, gray-800 background
    on rounded pills, gray border)
  - `src/app/profile/ProfileHud.tsx` (gray border, orange-900 avatar bg,
    progress-bar palette, gray text)
- **Why not migrated:** NOT in plan frontmatter `files_modified` list. Per
  scope-boundary rule, only the 11 listed files are in scope. These 4 files
  are mentioned in the plan's `<read_first>` but not in `<files>`.
- **Phase 14 impact:** None on Plan 14-07's measurable deliverables. The
  kitsubeat-tokens audit (the merge gate) reports zero violations on the 11
  in-scope files; the 4 out-of-scope files contribute their own violations
  to the codebase-wide audit count, which Plan 14-09 will sweep.
- **Fix shape (deferred):** Same surface-migration recipe as Plan 14-07
  Tasks 1-3:
  - bg-gray-* → bg-card / bg-surface tokens
  - text-gray-* → text-text / text-text-muted tokens
  - border-gray-* → border-border tokens
  - bg-green-*/bg-red-* feedback → JLPT-N5 / accent alpha tints
  - bg-indigo-* mnemonic panel → JLPT-N4 alpha (per Plan 14-05 mnemonic
    pattern)
  - bg-orange-900 avatar bg → consider new --color-avatar-bg token, OR
    (D-22 token-only swap) bg-card-2 with subtle ring
- **Owner:** Plan 14-09 (chrome cleanup) is the natural home — it already
  covers VocabularySection / GrammarSection / PlayerControls so adding these
  4 files fits the same scope.
- **Closed:** 2026-05-02 in Plan 14-09 commit `ca08cd8`. ProfileHud,
  VocabularyList, ReviewQuestionCard, ReviewFeedbackPanel migrated to
  tokens; 68 violations → 0 in those 4 files.

## Plan 14-09 (Wave 4 — /path + a11y suite + final gate)

### D-PRE-11 — A11y `color-contrast` violations across 20 of 22 axe-core test cases [NEEDS-USER-DECISION]
- **Source:** Plan 14-09 Task 2 filled the 22-case a11y suite (11 routes × 2
  themes) with real assertions. The first nightly run surfaced ~2,200
  individual node violations with `serious` impact.
- **Dominant class:** Brand accent `#ef4444` fails WCAG AA contrast against
  white (3.76:1) — every Button primary, every accent link in light theme.
  Plus `text-text-muted` / `text-text-dim` rgba-alpha values fall below
  4.5:1 on light theme cards. Plus `text-grammar-expression` (#8b5cf6) at
  4.23:1 on white (one site — ProfileForm cap-help).
- **Phase 14 impact:** **BLOCKING merge per WARNING 2.** Per plan A11y
  Severity Policy: BOTH `serious` AND `critical` are blocking; no defer
  escape clause. Phase 14 merge held pending user disposition.
- **Disposition options** (full triage in `14-A11Y-VIOLATIONS.md`):
  - **A1:** Darken `--color-accent` to clear AA on white (e.g., `#dc2626`
    red-600 → 4.66:1). Brand identity shifts.
  - **A2:** Bump every Button primary CTA text to `text-lg` + `font-bold`
    to qualify as "large bold" per WCAG 1.4.3.
  - **A3:** User-approved Phase 18 deferral with rationale + timestamp
    recorded in `14-A11Y-VIOLATIONS.md` "User decisions log" section.
- **Owner:** User must pick a disposition before Phase 14 merges.

### D-PRE-12 — Lesson-chrome surfaces (`/songs/[slug]/components/*`) still on palette utilities
- **Source:** ~16 files under `/songs/[slug]/components/` (excluding the
  Plan 14-05 lesson-area exercise cards) carry 231 token-compliance
  violations. Plan 14-05 explicitly scoped to exercise cards; the
  surrounding chrome (VocabularySection, GrammarWriteCard, SongContent,
  VerseBlock, MasteryDetailPopover, GrammarSessionRunner, GrammarSection,
  YouTubeEmbed, PlayerControls, TokenPopup, KanjiBreakdownSection,
  ExerciseSession, StarDisplay, TokenSpan, TierText) was deferred.
- **Phase 14 impact:** None on Phase 14 in-scope deliverables. All 11
  Phase 14 in-scope surfaces report 0 violations. The audit gate codebase-
  wide is AMBER — accepted under CONTEXT D-22 ("merge is NOT blocked on
  full design coverage; it IS blocked on full token coverage" — for
  in-scope surfaces).
- **Owner:** Yet-to-be-numbered "lesson chrome" plan. Pattern: Plans
  14-05..14-08 surface-migration recipe (CardLink + Badge + tokens).
  Estimated effort: 1 day. (D-PRE-08 is the same surface; D-PRE-12
  formalises the violation count and migration scope.)
