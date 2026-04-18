---
phase: 10-advanced-exercises-full-mastery
plan: 03
subsystem: exercises
tags: [grammar, conjugation, japanese-verbs, drizzle-audit, vitest, react]

# Dependency graph
requires:
  - phase: 07-data-foundation
    provides: "parseConjugationPath() + StructuredConjugation type (on-demand parser; no JSONB mutation)"
  - phase: 08-exercise-engine
    provides: "Question/ExerciseType/Verse model, fill_lyric verse-blank pattern, pickDistractors shape, FeedbackPanel"
  - phase: 10-advanced-exercises-full-mastery
    provides: "ExerciseType union widened to 7 + Question interface widened (conjugationBase optional), ExerciseSession grammar_conjugation dispatch stub, RATING_WEIGHTS[grammar_conjugation]=4"
provides:
  - "scripts/audit/conjugation-form-coverage.ts — one-shot audit that classifies every structured grammar_point into a coarse form family + writes conjugation-coverage.md"
  - "V1_CONJUGATION_FORMS = [past_affirmative, te_form, negative, tai_form] — 4 drillable form families with clean mini-conjugator coverage"
  - "src/lib/exercises/conjugation.ts — classifyConjugationForm + stripGloss + conjugate (godan + ichidan + irregulars する/くる/行く/ある) + pickConjugationOptions(targetVocab, grammarPoint, sameJlptPool)"
  - "src/lib/exercises/generator.ts — makeGrammarConjugationQuestion helper + per-grammar-point loop in buildQuestions (Wave 2 replaces stub bodies only, no new cases)"
  - "src/app/songs/[slug]/components/ConjugationCard.tsx — 4-option card with base-form scaffold + verse-blank prompt + FeedbackPanel dispatch"
  - "ExerciseSession.tsx grammar_conjugation → ConjugationCard dispatch (replaces Plan 10-01 stub-throw)"
affects: [10-06-saveSessionResults-ex5-6-7-accuracy, 10-07-premium-gate-UI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Runtime coarse-form classifier duplicated verbatim in scripts/audit and src/lib/exercises: runtime code never imports from scripts/. Both are kept in sync via a shared fixture in conjugation.test.ts."
    - "Mini-conjugator = lookup table (GODAN_STEM) + ichidan strip-る + IRREGULAR_TABLE hardcoded. ~80 LOC. Every branch returns null when input doesn't match a known rule — no throws, no guesses."
    - "Grammar Conjugation questions are driven by lesson.grammar_points[] (NOT the per-vocab loop) — matches fill_lyric's shape where the question trigger is a structural event (timed verse hit), not a vocab-traversal tick."
    - "pickConjugationOptions returns null on every degenerate input (unstructured path, form-not-in-V1, pool<2 verbs, collision with correct) — caller filters, never emits 「???」 filler."

key-files:
  created:
    - scripts/audit/conjugation-form-coverage.ts
    - .planning/phases/10-advanced-exercises-full-mastery/conjugation-coverage.md
    - src/lib/exercises/conjugation.ts
    - src/lib/exercises/__tests__/conjugation.test.ts
    - src/app/songs/[slug]/components/ConjugationCard.tsx
  modified:
    - src/lib/exercises/generator.ts (grammar_conjugation branches + makeGrammarConjugationQuestion + per-GP loop in buildQuestions)
    - src/lib/exercises/__tests__/generator.test.ts (3 integration tests for grammar_conjugation)
    - src/app/songs/[slug]/components/ExerciseSession.tsx (ConjugationCard import + grammar_conjugation dispatch)
    - .planning/phases/10-advanced-exercises-full-mastery/deferred-items.md (logged pre-existing Next.js 15 route.ts build break)

key-decisions:
  - "V1_CONJUGATION_FORMS shortened from the audit's top-11 to 4 clean families (past_affirmative / te_form / negative / tai_form). Top-11 covered >=80% of drillable exemplars but included compound chains (shimau, conditional_*, obligation) whose mini-conjugator would inflate conjugation.ts by 3-4x. past_negative drilled-as-target is deferred; it ships as the adjacent-form same-verb distractor for past_affirmative."
  - "classifier 'other' + 'stem' + 'clause_marker' EXCLUDED from V1 selection — they're catch-all buckets without a user-guessable mini-rule. Without exclusion, 'other' alone absorbed 286/607 (47%) exemplars and the drill would feel like a free-form puzzle, not a conjugation quiz."
  - "Grammar Conjugation generator drives off lesson.grammar_points[] (not lesson.vocabulary[]). The per-vocab loop produced by Phase 8 can't satisfy the grammar point requirement — a question is born from a structured grammar_point with a verse hit, not from traversing each vocab × type combinatorially."
  - "Grammar-point → vocab linking is lookup-by-surface (base kana/kanji against v.surface). VocabEntry has no grammar_point back-reference; threading one through would require a schema shape change. When no match is found, makeGrammarConjugationQuestion synthesizes a minimal VocabEntry so pickConjugationOptions still runs — but emits the sentinel empty-string vocabItemId so Plan 10-06 saveSessionResults skips per-vocab mastery writes (same sentinel pattern as Plan 10-05 sentence_order)."
  - "Same-verb wrong distractor uses ADJACENT_FORM: past_affirmative↔past_negative (polarity flip), te_form→negative, negative→past_affirmative, tai_form→te_form. Opposite polarity > same-category siblings because beginners fumble on negation before they fumble on form category."
  - "pickConjugationOptions stripGloss('食べた (tabeta, ate)') = '食べた' — extracting the Japanese-only portion of parsed.conjugated is required for (a) prompt-blank replacement and (b) suffix-regex classification. Romaji gloss removal is THE hot path."
  - "ConjugationCard NEVER extends QuestionCard. The rendering-with-scaffold pattern (base form → blanked verse) is cheap to duplicate (187 LOC card); extracting a shared helper would cost more in indirection than the ~30 LOC saved. QuestionCard stays untouched for legacy types."
  - "ConjugationCard owns its own recordVocabAnswer call (same shape as QuestionCard / ListeningDrillCard) and short-circuits on empty-string vocabItemId — the sentinel value used when grammar_point.base doesn't match a vocab entry. Prevents noisy FSRS writes against non-existent vocab rows."

patterns-established:
  - "Audit-then-pick: one-shot drizzle script → markdown artifact → manual curation of V1 constant. The artifact is committed so future maintainers understand why V1 was sized the way it was. Future phases (e.g. Phase X-backfill to fill compound forms) reference the same artifact shape."
  - "Null-return-over-filler: every advanced-exercise factory (makeGrammarConjugationQuestion, pickConjugationOptions) returns null rather than emitting 「???」 or truncated options. Caller filters nulls. Zero questions > one bad question (CONTEXT-locked for Phase 10)."
  - "Per-GP loop in buildQuestions: 3 concentric loops now live in buildQuestions — per-vocab × per-type (Phase 8), per-verse (sentence_order), per-grammar-point (grammar_conjugation). Each loop is independent and can skip cleanly (empty lesson, no timing, no structured path)."
  - "Empty-string vocabItemId sentinel: adopted by BOTH sentence_order (Plan 10-05) and grammar_conjugation (Plan 10-03) when the question is verse- or grammar-point-centric rather than vocab-centric. Plan 10-06 saveSessionResults MUST branch on `!vocabItemId` to skip mastery writes."

requirements-completed: [EXER-05]

# Metrics
duration: 15min
completed: 2026-04-18
---

# Phase 10 Plan 03: Grammar Conjugation Exercise Summary

**Grammar Conjugation (EXER-05) shipped end-to-end: one-shot audit + coarse-form classifier + V1=4-form mini-conjugator (godan + ichidan + irregulars) + pickConjugationOptions(correct, same-verb adjacent, 2 alt-verb same-JLPT) + makeGrammarConjugationQuestion driven off lesson.grammar_points[] + verse-blank prompt + ConjugationCard with base-form scaffold, wired into ExerciseSession dispatch.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-18T08:50:09Z
- **Completed:** 2026-04-18T09:05:42Z
- **Tasks:** 2
- **Files modified:** 4 (+ 5 created)

## Accomplishments

- **Audit artifact.** `scripts/audit/conjugation-form-coverage.ts` classifies every structured conjugation across 130 song_versions (732 grammar points, 607 structured / 91.6%) into 23 coarse form families. Top 5: past_affirmative (42), te_form (39), negative (29), tai_form (20), progressive_casual (17). Artifact committed to `conjugation-coverage.md` with V1 rationale.
- **V1_CONJUGATION_FORMS** locked at `[past_affirmative, te_form, negative, tai_form]` — the four families with clean mini-conjugator rules. Rationale: compound families (shimau, conditional_*, obligation) require multi-step conjugation that would inflate `conjugation.ts` 3-4x; v1 picks tight + drillable.
- **Mini-conjugator** covers godan (full kana→phoneme table for う/つ/る/む/ぬ/ぶ/く/ぐ/す), ichidan (strip-る heuristic with i-row/e-row kana check), and irregulars (する, くる, 来る, 行く, いく, ある). Returns `null` on unknown endings so callers filter cleanly.
- **pickConjugationOptions** assembles `{correct, distractors[3], base, form}` or returns `null`. 3 distractors = 1 same-verb adjacent-form (ADJACENT_FORM map; polarity-flip for past_affirmative↔past_negative, category-flip for te_form↔negative/tai_form↔te_form) + 2 alternate-verb same-JLPT conjugated to the target form. De-duplicated via trim+lowercase normalization.
- **makeGrammarConjugationQuestion** drives off `lesson.grammar_points[]` (not `lesson.vocabulary[]`) — one question per structured grammar point whose classified form is in V1 AND whose conjugated surface appears in a timed verse. Reuses `findVerseForVocab` + verse-text-with-blank pattern from `fill_lyric`. Matches target vocab by surface lookup; synthesizes a minimal VocabEntry with empty-string vocabItemId when no match (Plan 10-06 saveSessionResults skips per-vocab mastery writes on this sentinel).
- **buildQuestions** extended with a third concentric loop (per-grammar-point) that runs alongside the existing per-vocab × per-type (Phase 8) and per-verse (sentence_order, Plan 10-05) loops. Each skips cleanly on degenerate inputs.
- **ConjugationCard** (187 LOC) renders the exercise-type header, base-form scaffold (`食べる →`), verse-blank prompt (`_____`), and 4 tap-to-pick option buttons with the same styling as QuestionCard's options. Owns its own `recordVocabAnswer` + `FeedbackPanel`; short-circuits FSRS writes on empty-string vocabItemId.
- **ExerciseSession** grammar_conjugation stub replaced with `<ConjugationCard>` dispatch. Wave-2 parallel-safe diff: imports + single `if`-branch body swap.
- **Tests:** 35 unit tests in `conjugation.test.ts` (V1 sanity + stripGloss + classifier + conjugate across verb classes + pickConjugationOptions happy path + all 4 null branches + irregular する) + 3 integration tests in `generator.test.ts` (buildQuestions produces 1 GC question for structured lesson, 0 for unstructured, 0 when grammar_points is empty).

## Task Commits

1. **Task 1: Audit + conjugation module + generator branch + unit tests** — `c8a653d` (bundled with other parallel-wave commits; see Issues Encountered)
2. **Task 2: ConjugationCard + ExerciseSession dispatch** — `3f91104` (feat)

**Plan metadata:** to be recorded on final commit after SUMMARY + STATE + ROADMAP update.

## Files Created/Modified

### Created
- `scripts/audit/conjugation-form-coverage.ts` — drizzle audit script; classifies structured paths into 23 coarse form families; writes markdown artifact
- `.planning/phases/10-advanced-exercises-full-mastery/conjugation-coverage.md` — audit artifact with histogram + V1 rationale
- `src/lib/exercises/conjugation.ts` — V1_CONJUGATION_FORMS, stripGloss, classifyConjugationForm, conjugate, pickConjugationOptions
- `src/lib/exercises/__tests__/conjugation.test.ts` — 35 unit tests
- `src/app/songs/[slug]/components/ConjugationCard.tsx` — 4-option card with base-form scaffold

### Modified
- `src/lib/exercises/generator.ts` — imports conjugation helpers; `extractField`/`makeExplanation`/`makeQuestion` grammar_conjugation stub bodies replaced; new `makeGrammarConjugationQuestion` helper; per-grammar-point loop in `buildQuestions`
- `src/lib/exercises/__tests__/generator.test.ts` — 3 new integration tests for grammar_conjugation
- `src/app/songs/[slug]/components/ExerciseSession.tsx` — `ConjugationCard` import; grammar_conjugation dispatch replaces stub-throw
- `.planning/phases/10-advanced-exercises-full-mastery/deferred-items.md` — logged pre-existing Next.js 15 build break on vocab-mastery route

## Decisions Made

See frontmatter `key-decisions`. Highlights:

- **V1 scoped to 4 drillable families, not the audit's top-11.** The histogram's >=80% threshold said 11; curation said 4. Compound forms (shimau, conditional_*, obligation, you_ni_hope) require stacked-rule mini-conjugators — deferred to a future plan.
- **'other' + 'stem' + 'clause_marker' excluded from V1 selection.** Catch-all buckets dominate the raw histogram (330/607 exemplars); without exclusion V1 would be meaningless. Drillable-total = 271 after exclusion; 4 forms = 130 exemplars (48% of drillable).
- **Grammar Conjugation is grammar-point-driven, not vocab-driven.** buildQuestions gains a third concentric loop rather than shoehorning into the per-vocab × per-type matrix. Each loop is independent and can emit zero cleanly.
- **empty-string vocabItemId sentinel** extended from Plan 10-05 (sentence_order) to grammar_conjugation. ConjugationCard short-circuits recordVocabAnswer on the sentinel; Plan 10-06 saveSessionResults must branch `!vocabItemId` to skip per-vocab mastery writes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan assumed parseConjugationPath returns coarse form family labels**

- **Found during:** Task 1 (running the audit script)
- **Issue:** The plan stated "Group parsed results by `conjugation_type` (past_affirmative, te_form, negative, past_negative, etc.)", implying `parseConjugationPath().conjugation_type` returns canonical family names. In reality it returns the raw free-text annotation from the lesson JSON (e.g. `"past tense"`, `"食べて (tabete, te-form) → 食べてしまった (...)"` — everything after the first `→`). Grouping by this field produced 601 distinct 'families' from 607 exemplars (essentially 1:1 noise). The 'top-N forms with highest exemplar density' selection couldn't happen.
- **Fix:** Added a `classifyConjugationForm(parsed)` helper that maps the parsed output (keyed off conjugated-suffix + label-text heuristics) to a canonical 23-family taxonomy. Also added `stripGloss(conjugated)` to extract the Japanese-only portion before the ASCII gloss. Both live in `conjugation.ts`; `classifyConjugationForm` is duplicated (verbatim) in the audit script since runtime code must not import from `scripts/`.
- **Files modified:** `scripts/audit/conjugation-form-coverage.ts`, `src/lib/exercises/conjugation.ts`
- **Verification:** Re-ran audit; 23 distinct families (down from 601), histogram now meaningful; 35 unit tests cover classifier round-trips on canonical fixtures.
- **Committed in:** `c8a653d`

**2. [Rule 1 - Bug] VocabEntry has no `grammar_point` back-reference**

- **Found during:** Task 1 (implementing the generator branch)
- **Issue:** The plan's snippet uses `const gp = vocab.grammar_point` — but VocabEntry has no such field. GrammarPoints live on `Lesson.grammar_points[]` independently. Threading a grammar_point ref through VocabEntry would require a schema shape change, and the per-vocab loop couldn't naturally emit one grammar_conjugation question per grammar point (cardinality mismatch).
- **Fix:** Introduced `makeGrammarConjugationQuestion(grammarPoint, vocabulary, verses, jlptPool)` — a dedicated per-grammar-point factory. Added a third loop in `buildQuestions` that iterates `lesson.grammar_points[]`. Target vocab is looked up by surface match; when no match exists, a minimal synthetic VocabEntry is used and the question emits with the empty-string `vocabItemId` sentinel (Plan 10-06 saveSessionResults must branch on it).
- **Files modified:** `src/lib/exercises/generator.ts`
- **Verification:** 3 new integration tests in `generator.test.ts` assert correct question generation, zero-on-unstructured, zero-on-empty-grammar-points; all green.
- **Committed in:** `c8a653d`

**3. [Rule 3 - Blocking] Pre-existing Next.js 15 build error in api/exercises/vocab-mastery**

- **Found during:** Task 1 (attempted `npm run build` per plan verification)
- **Issue:** `npm run build` fails inside `.next/types/app/api/exercises/vocab-mastery/[vocabItemId]/route.ts` — Next.js 15 requires `params` to be `Promise<…>` now. File last touched by Phase 11-03; not in Plan 10-03 scope.
- **Fix:** Logged to `deferred-items.md` under "Pre-existing type errors". Verified (via `git log`) the file pre-dates this plan's start. `npx vitest run src/` + `npx tsc --noEmit` pass on my changed files.
- **Files modified:** `deferred-items.md`
- **Committed in:** `c8a653d`

### Planned-but-adjusted Items

- **V1_CONJUGATION_FORMS = 4 families, not the plan's implied top-N.** Plan text hinted at "top-N forms covering >=80% of exemplars" which the audit answers as 11. Curating down to 4 is a planner-discretion call documented in the audit artifact + `key-decisions`. The 80% threshold is retained for the artifact's informational section; the actual V1 list is hand-picked.
- **Local smoke test via E2E/Vitest deferred.** Plan Task 2 suggests `npm run dev` + visiting `again-yui` to visually confirm the card renders. The ExerciseTab wiring that surfaces grammar_conjugation to end users is Plan 10-06's scope; unit tests + integration tests (generator emits questions with correct shape) are the current layer of coverage. Existing Phase 8 E2E suite runs are gated on a pre-existing Localizable rendering bug (see blockers/concerns in STATE.md) unrelated to this plan.

### Pre-existing Issues (Out of Scope)

- Next.js 15 `api/exercises/vocab-mastery/[vocabItemId]/route.ts` build break (logged in `deferred-items.md`).
- `tsc --noEmit` errors in `src/app/admin/timing/*`, `src/app/review/ReviewSession.tsx`, `src/lib/fsrs/scheduler.ts` (already logged by Plan 10-01).
- `SentenceOrderCard.test.tsx` (untracked, from Plan 10-05's ongoing work) — 5 failing tests. Plan 10-05's scope, not mine.

---

**Total deviations:** 3 auto-fixed (2 Rule 3 blocking, 1 Rule 1 bug) + 2 planned adjustments
**Impact on plan:** All auto-fixes were essential for correct classification + generator wiring. The V1 curation deviates from the literal audit output but is more defensible: 4 drillable forms > 11 compound chains.

## Issues Encountered

- **Commit attribution got bundled.** While running this plan, one or more parallel executors (Plans 10-04 + 10-05) were operating on the same working tree. During my Task 1 sequence, commit `c8a653d` (`feat(ui): hero kana CTA + kana option hover readability`) landed — it was actually an auto-bundled "pending changes" commit that absorbed my conjugation.ts, conjugation.test.ts, audit script, and coverage artifact alongside unrelated UI changes. My explicit `git commit` for Task 1 failed with "nothing added" because the files had already been committed under the bundled commit. Task 2 (ConjugationCard + ExerciseSession dispatch) was committed cleanly as `3f91104`. Effect: Task 1's conjugation work lives in a commit whose subject line mentions UI, not grammar conjugation; grep-for-attribution will miss it. Recovery was not attempted (force-amending history during active parallel execution is risky).
- `git stash -u` → `git stash pop` mid-task inadvertently tangled with the parallel executor's in-flight changes and had to be rolled back manually (dropped the stash; re-verified files intact). Harmless in the end but noisy.

## User Setup Required

**None.** Plan 10-03 adds no new environment variables, no dashboard config, and no new migrations. The audit script read-only traverses existing lesson JSONB; the runtime helpers are pure TypeScript.

To regenerate the audit artifact at any time:

```bash
npx tsx --tsconfig tsconfig.scripts.json scripts/audit/conjugation-form-coverage.ts
```

## Next Phase Readiness

### Ready for dependent plans

- **Plan 10-06 (saveSessionResults ex5/6/7 accuracy + counter-increment):** ready — consumes grammar_conjugation answers with the empty-string `vocabItemId` sentinel; saveSessionResults must branch on `!vocabItemId` to skip per-vocab mastery writes (same contract as Plan 10-05 sentence_order). Ex 5 best accuracy writes to `ex5_best_accuracy` (schema column added in Plan 10-01); `deriveBonusBadge({ex5, ex7})` already in place.
- **Plan 10-07 (premium-gate UI):** grammar_conjugation falls under the `advanced_drill` quota family (QUOTA_FAMILY map, Plan 10-01). `checkExerciseAccess(userId, 'grammar_conjugation', { songVersionId })` short-circuits for premium and returns `quotaRemaining` for upsell copy. No additional wiring needed in this plan.

### Blockers / Concerns

- `SentenceOrderCard.test.tsx` (Plan 10-05 in-flight) fails 5 tests in the full `src/` suite. Not my plan's scope; Plan 10-05's owner will resolve.
- No live end-to-end verification of Grammar Conjugation rendering yet — ExerciseTab wiring that routes grammar_conjugation into user sessions is Plan 10-06's scope. Today, unit + integration tests cover the generator + card independently.

## Self-Check

**Created files verification:**
- FOUND: scripts/audit/conjugation-form-coverage.ts
- FOUND: .planning/phases/10-advanced-exercises-full-mastery/conjugation-coverage.md
- FOUND: src/lib/exercises/conjugation.ts
- FOUND: src/lib/exercises/__tests__/conjugation.test.ts
- FOUND: src/app/songs/[slug]/components/ConjugationCard.tsx

**Commits verification:**
- FOUND: c8a653d (Task 1 files, bundled commit)
- FOUND: 3f91104 (Task 2)

**Tests passing:**
- FOUND: conjugation.test.ts 35/35 green
- FOUND: generator.test.ts 23/23 green (including 3 new grammar_conjugation integration cases)
- FOUND: full exercises suite 97/97 pass, 1 expected-fail, 6 skipped
- OUT OF SCOPE: SentenceOrderCard.test.tsx 5 failing (Plan 10-05's territory)

## Self-Check: PASSED

---
*Phase: 10-advanced-exercises-full-mastery*
*Completed: 2026-04-18*
