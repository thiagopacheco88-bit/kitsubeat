# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-14)

**Core value:** Users can watch an anime song and understand exactly what every word means — with furigana, translation, grammar breakdown, and vocabulary categorization synced to the music as it plays.
**Current focus:** v2.0 Phase 10 COMPLETE — all 7 plans shipped. Star 3 celebration + bonus badge + catalog mastery decorations landed in Plan 10-07. Phase 11 (cross-song vocabulary) previously shipped; remaining work is Phase 12+ features or unfinished v1.0 Phase 1 plans.

## Current Position

Phase: 10 of 11 (Advanced Exercises & Full Mastery) — COMPLETE
Plan: 7 of 7 complete (10-01 ✓, 10-02 ✓, 10-03 ✓, 10-04 ✓, 10-05 ✓, 10-06 ✓, 10-07 ✓). Phase 10 shipped end-to-end. Next: Phase 12 or Phase 1 remaining plans.
Status: Plan 10-01 complete — data-layer foundation shipped: drizzle/0007_advanced_exercises.sql (ex5/ex6/ex7_best_accuracy cols on user_song_progress + user_exercise_song_counters table with UNIQUE(user_id, exercise_family, song_version_id)); ExerciseType union widened 4→7 (grammar_conjugation + listening_drill + sentence_order); Question interface widened one-shot with 4 optional wave-2 fields (conjugationBase/verseStartMs/verseTokens/translation); deriveStars widened 0|1|2→0|1|2|3 (Star 3 gated on Ex 6 ≥80%); deriveBonusBadge added (Ex 5 + Ex 7 both ≥80%); song_quota gate path in checkExerciseAccess(userId, type, {songVersionId}) with premium bypass + already-touched re-entry + quota_exhausted response; counters.ts thin drizzle wrapper (getSongCountForFamily + userHasTouchedSong + recordSongAttempt idempotent via ON CONFLICT DO NOTHING); RATING_WEIGHTS 4→7 entries (grammar_conjugation=4, listening_drill=3, sentence_order=4); 9 generator + 3 ExerciseSession throw-stub branches so wave-2 plans 10-03/04/05 REPLACE stub bodies only (parallel-safe). 34 new unit tests green (13 access mocked + 21 derive-stars+deriveBonusBadge); 6 counters integration tests behind describe.skip pending TEST_DATABASE_URL. Four Rule-3 deviations (migration collision 0006→0007, deriveStars signature threading through 4 call sites, Record<ExerciseType,number> exhaustiveness, resetTestProgress clears counter table). Commits 8a4a6f4 (schema+stubs), dd82cbb (counters+gate+tests).

Plan 10-02 complete (prior) — PlayerContext imperative API (seekTo/play/pause/seekAndPlay with 400ms debounce + 50ms seek→play delay, isReady, embedState promoted). YouTubeEmbed.onReady registers the api via _registerApi. Raw YT player reference stays scoped to YouTubeEmbed closure — production bundle does not leak __kbPlayer (single-condition NEXT_PUBLIC_APP_ENV === 'test' gate intact). 10-test jsdom suite covers registration + debounce coalescing + trailing-edge pause→seek→50ms→play sequencing. Commits 1ae57fc, 65c4fad, cdacd21.

Plan 10-04 complete — Listening Drill exercise end-to-end. Generator: listening_drill branch mirrors fill_lyric verse-blank (findVerseForVocab + pickDistractorsWithVocab); requires start_time_ms > 0; Question.verseStartMs + Question.verseTokens populated; buildQuestions.types extended with hasTimedVerses gate (zero-emission clean skip on untimed songs). Session store: listeningReplays: Record<string, number> slice + incrementListeningReplay action (telemetry only; NOT fed to FSRS; reset on startSession). ListeningDrillCard (280 lines) consumes usePlayer().seekTo/play/isReady/embedState — auto-seek+play on mount and on question.id change; Replay uses discrete seekTo()+play() (not debounced seekAndPlay) for human-tap responsiveness. Blanked-verse rendering replaces target surface with _____; no romaji rendered in-card (Pitfall 8). embedState === 'error' fallback renders the CONTEXT-locked string ONLY ("Listening Drill unavailable for this song (video not playable). Star 3 is unreachable until the video works.") — no Skip/Next/onSkip/onAnswer, no silent fill_lyric substitution. ExerciseSession dispatch replaces stub; verseTokens resolved from lesson.verses via q.verseRef.verseNumber with Question.verseTokens as fallback. 7 unit tests in listening-drill.test.ts + widened count assertions in generator.test.ts / distractor-picker.test.ts (covers 5-type emission + Plan 10-05 sentence_order sibling). One Rule-3 auto-fix (test-count assertions). Commits f5a053d (Task 1, bundled with Plan 10-05 sentence_order Task 1 under the sibling's label), c8a653d (Task 2, bundled with in-progress kana UI under a misleading label — CODE verified in HEAD).

Plan 10-03 complete — Grammar Conjugation (EXER-05) end-to-end. Audit script `scripts/audit/conjugation-form-coverage.ts` over 130 song_versions.lesson (732 grammar points, 607 structured / 91.6%) introduces `classifyConjugationForm` that collapses raw parseConjugationPath labels into 23 coarse form families + writes `conjugation-coverage.md` artifact. `V1_CONJUGATION_FORMS` curated from audit to 4 drillable families (past_affirmative / te_form / negative / tai_form — 130 exemplars, 48% of drillable total 271 after excluding 'other'/'stem'/'clause_marker' catch-alls); compound families (shimau, conditional_*, obligation, you_ni_hope) deferred — mini-conjugator would triple in size. `src/lib/exercises/conjugation.ts`: mini-conjugator (GODAN_STEM for u/tsu/ru/mu/nu/bu/ku/gu/su + ichidan strip-る with i/e-row kana check + IRREGULAR_TABLE: する/くる/来る/行く/いく/ある) + `stripGloss` extracting Japanese-only portion from `"食べた (tabeta, ...)"` + `pickConjugationOptions({targetVocab, grammarPoint, sameJlptPool})` returns `{correct, distractors[3], base, form}` or `null` on every degenerate input (never "???" filler). Same-verb wrong via `ADJACENT_FORM` map (polarity-flip: past_affirmative↔past_negative; category-flip: te_form↔negative / tai_form↔te_form). 2 alternate-verb distractors conjugated from `sameJlptPool` filtered to `part_of_speech === "verb"`. Generator: `makeGrammarConjugationQuestion(gp, vocab, verses, jlptPool)` helper + third concentric loop in `buildQuestions` (per-grammar-point, alongside per-vocab×type + per-verse). Target vocab matched by surface; synthetic VocabEntry with empty-string `vocabItemId` sentinel when no match (Plan 10-06 `saveSessionResults` must branch on `!vocabItemId`). ConjugationCard (187 LOC): "grammar conjugation" header + `conjugationBase` scaffold (`食べる →`) + verse-blank prompt + 4 option buttons with QuestionCard option styling; owns own `recordVocabAnswer` + `FeedbackPanel`; short-circuits FSRS writes on sentinel vocabItemId. ExerciseSession grammar_conjugation stub replaced with `<ConjugationCard>` dispatch. 35 unit tests in `conjugation.test.ts` + 3 integration tests in `generator.test.ts`. Three Rule-3/Rule-1 auto-fixes (classifier added — parseConjugationPath returns raw label not canonical family; VocabEntry has no grammar_point back-ref — switched to per-GP loop + synthetic-vocab path; Next.js 15 build break in vocab-mastery route logged as pre-existing). Commits c8a653d (Task 1, bundled with parallel in-flight UI changes under misleading "feat(ui)" label — CODE verified in HEAD), 3f91104 (Task 2, clean feat commit).

Plan 10-05 complete — Sentence Order (EXER-07) end-to-end. Audit script `scripts/audit/verse-token-distribution.ts` + `npm run audit:verse-tokens` verifies the 12-token CONTEXT-locked cap against live catalog: 130 songs, 109 (83.8%) have ≥3 eligible verses — above the 80% threshold, no clause-boundary follow-up needed. `SENTENCE_ORDER_TOKEN_CAP=12` exported from generator.ts. buildQuestions gains a dedicated per-verse loop (sentence_order is verse-centric, not vocab-centric): one question per eligible verse, correctAnswer = joined token surfaces, translation from `verse.translations.en`, `distractors=[]`, empty-string `vocabItemId` sentinel (Plan 10-06 must skip per-vocab mastery writes). Session store gains `sentenceOrderPool / sentenceOrderAnswer / sentenceOrderHintShown` slices keyed by question.id + 4 actions (init, moveToAnswer, moveToPool, showHint). `initSentenceOrder` stamps each token with `crypto.randomUUID()` + Fisher-Yates (no DOM index leak); no-op on existing pool (reload-safe). SentenceOrderCard (~240 lines) renders dashed answer row + pool row (flex-wrap), Submit disabled until pool empty, Show hint one-way reveal-hatch (propagates `revealedReading=true` → FSRS rating=1 via existing generic `ratingFor`). All-or-nothing scoring + wrong-position highlight in-row after submit; no data-position/data-correct-index/data-correct attrs (Pitfall 1 immune by construction). ExerciseSession dispatch replaces sentence_order throw-stub with <SentenceOrderCard/>. 21 unit tests added (16 generator/store + 5 rendering); full suite 256 pass / 9 skipped. Three Rule-3 auto-fixes (React 19 getSnapshot-cache warning on inline `?? []` selector → slice Record then index by id; JSDOM missing scrollIntoView guard; afterEach import). Commits f5a053d (Task 1 main — bundled with concurrent Plan 10-04 edits on shared generator.ts + exerciseSession.ts), 2286df8 (Task 1 supplementary — audit script + markdown + unit tests), 40272e2 (Task 2 — card + dispatch + rendering tests).

Plan 10-07 complete — Phase 10 premium-gate UI finalization + Phase 10 end-to-end done. StarDisplay pre-widened 0|1|2|3 in Plan 10-01; Plan 10-07 adds only a JSDoc note locking "Star 3 reuses Stars 1/2 confetti + star-shine verbatim" (Plan 08-04 primitive; no new animation library, no new CSS keyframes, no new @keyframes in globals.css). SessionSummary: masteredThisSession = newStarEarned && stars === 3 flips the callout to "You earned 3 stars — song mastered!"; bonusUnlocked = !saving && bonusBadge && !previousBonusBadge renders a single muted-amber <p>Bonus mastery unlocked!</p> line — zero animation, stars remain primary signal, bonus is secondary (CONTEXT-locked). saveSessionResults SaveSessionResult gains bonusBadge + previousBonusBadge fields; both computed via deriveBonusBadge({ex5,ex7}) applied to pre-upsert AND post-upsert rows (Pitfall 7 — false-positive callout immune, same contract as stars/previousStars). SongMasteredBanner (32-line diagonal amber ribbon top-right of thumbnail, rotated 45°, 100×100 overlay, "MASTERED" tracking-widest) + BonusBadgeIcon (33-line inline 16×16 4-point violet-400 sparkle SVG, hover-tooltip "Bonus mastery: Grammar Conjugation + Sentence Order") ship as catalog decorations — violet deliberate so bonus isn't misread as a fourth star. getAllSongs now accepts optional userId; adds six correlated subqueries joining ex1_2_3/ex4/ex5/ex6/ex7 best_accuracy + completion_pct against user_song_progress with the SAME tv-preferred ORDER BY CASE the existing youtube_id subquery uses — same version the thumbnail points at, single round-trip for the 200-row catalog. SongCard reworked: stars = deriveStars({ex1_2_3,ex4,ex6}) + bonus = deriveBonusBadge({ex5,ex7}) at render time; showMasteryBanner = showProgress && stars===3 renders SongMasteredBanner BEFORE the OP-ED pill (visual priority for returning users); showBonusBadge = showProgress && bonus renders BonusBadgeIcon inline trailing StarDisplay via gap-1.5. Unused `progress` prop removed (only call site passed song-only). Unauthenticated path: null accuracy fields + null completion_pct → showProgress = false → no ribbon, no badge, no stars row (CONTEXT invariant). /songs/page.tsx threads PLACEHOLDER_USER_ID='test-user-e2e' matching the /songs/[slug]/page.tsx pattern. Song detail page header unchanged — currently does NOT fetch user_song_progress for display (plan's conditional was false). Sidecar fix during execution: Plan 10-06's QuotaExhaustedError class export relocated from "use server" exercises.ts into new src/lib/exercises/errors.ts + swapped import sites in exercises.ts + regression-premium-gate.spec.ts — unblocks `npm run build` which now passes end-to-end (21 routes, 102kB shared JS). Zero auto-fixes needed for Plan 10-07's own tasks; the sidecar QuotaExhaustedError relocation is the only deviation and unblocked build verification. 263 unit tests green / 1 expected fail / 14 skipped. Commits 0306fde (Task 1 — StarDisplay JSDoc + SessionSummary callouts + Banner + Badge + saveSessionResults bonusBadge fields), 39f83dc (Task 2 — getAllSongs userId join + SongCard wiring + /songs page PLACEHOLDER_USER_ID).

Plan 10-06 complete — Advanced Drills integration end-to-end. AdvancedDrillsUpsellModal (100 LOC) full-screen upsell with per-family copy (listening/10 vs advanced_drill/3), ESC/backdrop close, data-testid + data-family hooks. ExerciseTab gets third mode card "Advanced Drills" (always rendered — CONTEXT-locked); click handler fires `getAdvancedDrillAccess(userId, songVersionId)` server action (Promise.all of 2 checkExerciseAccess + isPremium); on quota exhaustion sets upsell state → modal renders → session does NOT start. buildQuestions gains optional `typeFilter: ExerciseType[]`; Advanced Drills passes `["grammar_conjugation","listening_drill","sentence_order"]`; per-vocab loop + sentence_order loop + grammar-point loop all honor the allowlist. saveSessionResults extended for ex5/ex6/ex7 via GREATEST(COALESCE) — mastery never regresses. recordVocabAnswer stamps user_exercise_song_counters on first answer for song_quota-gated types + server-side re-check; if non-premium user over limit, DELETEs the overshoot row and throws QuotaExhaustedError (RESEARCH Pitfall 6: one answer of slippage possible under cross-device race — documented in upsell past-tense copy). recordAdvancedDrillAttempt action for empty-vocabItemId callers (sentence_order / synthetic grammar_conjugation). saveSessionResults end-of-session safety-net stamps counter for every family present in answer batch (ON CONFLICT DO NOTHING across all 3 paths — no inflation). Phase 08.1-07 test.fixme REMOVED from regression-premium-gate.spec.ts; replaced with live QuotaExhaustedError assertion (seeds 10 listening counter rows, invokes recordVocabAnswer on 11th song, asserts throw + refund). New advanced-drill-quota.spec.ts (4 E2E: 11th-listening upsell, 4th-advanced upsell, independent counters via direct gate check, premium bypass with cleanup). UI regression contract preserved (0 `EXERCISE_FEATURE_FLAGS` imports in src/app or src/stores — confirmed by grep). 263 unit tests green (no regressions). Two Rule-3 auto-fixes (typeFilter TS narrowing → extracted typed const; saveSessionResults end-of-session safety-net needed because sentence_order + synthetic-vocab grammar_conjugation bypass recordVocabAnswer). Commits 0cc9dcd (Task 1 — UI + upsell), 4af194a (Task 2 — saveSessionResults + counter-increment + re-check), fcbb3ce (Task 3 — test.fixme unfix + quota E2E).

Last activity: 2026-04-18 — **Plan 10-07 complete. Phase 10 end-to-end.** Star 3 celebration reuses existing Stars 1/2 confetti + star-shine primitive (CONTEXT-locked: no new animation library, no new CSS keyframes — JSDoc lock added to StarDisplay). SessionSummary callout flips to "You earned 3 stars — song mastered!" on the Star 3 transition; subtle "Bonus mastery unlocked!" amber line surfaces on the deriveBonusBadge false→true transition (no confetti — bonus stays secondary to stars). saveSessionResults returns bonusBadge + previousBonusBadge pair alongside stars/previousStars, both computed on the BEFORE-upsert row (Pitfall 7 — false-positive-callout immune). SongMasteredBanner (32-line diagonal amber "MASTERED" ribbon, top-right of thumbnail) + BonusBadgeIcon (33-line inline 16px violet sparkle adjacent to stars) ship as catalog decorations. getAllSongs(userId?) gains six correlated subqueries against user_song_progress (ex1_2_3/ex4/ex5/ex6/ex7 best_accuracy + completion_pct) with the same tv-preferred ORDER BY CASE the existing youtube_id subquery uses — single round-trip for the 200-row catalog, no N+1. SongCard reworked to render stars + ribbon + bonus from SongListItem fields at render time; unused `progress` prop removed (only call site passed song only). /songs page threads PLACEHOLDER_USER_ID='test-user-e2e' matching the existing pattern in /songs/[slug]/page.tsx. Sidecar fix relocated Plan 10-06's QuotaExhaustedError class export from the "use server" exercises.ts into new src/lib/exercises/errors.ts module + swapped the two import sites — unblocks `npm run build` which now passes end-to-end (21 routes, 102kB shared JS). 263 unit tests green, zero regressions. Commits 0306fde (Task 1 — StarDisplay JSDoc + SessionSummary callouts + Banner + Badge), 39f83dc (Task 2 — getAllSongs join + SongCard render-time derivation + page wiring), plus final metadata commit.

Progress: [████████████] v1.0 Phase 1 in progress (6/8 plans); v2.0 Phase 08.1 COMPLETE (8/8 plans); v2.0 Phase 08.2 COMPLETE (3/3 plans); v2.0 Phase 08.3 COMPLETE (5/5 plans); v2.0 Phase 08.4 in progress (3/5 plans); v2.0 Phase 09 COMPLETE (6/6 plans); v2.0 Phase 10 COMPLETE (7/7 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 18
- Average duration: 9.3 min
- Total execution time: 2.73 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-content-pipeline | 6/8 | 60 min | 10 min |
| 08.1-end-to-end-qa-suite | 8/8 | 66 min | 8 min |
| 08.2-fsrs-progressive-disclosure | 3/3 | 16 min | 5 min |

**Recent Trend:**
- Last 7 plans: 09-03 (3 min), 09-04 (3 min), 09-05 (3 min), 10-02 (9 min), 10-01 (35 min), 10-04 (14 min)
- Trend: 10-04 at 14 min — Listening Drill integration on top of Plan 10-02 PlayerContext API + Plan 10-01 stubs. One Rule-3 deviation (widening generator.test.ts count assertions for the 5-type emission + Plan 10-05 sentence_order sibling). Commit hygiene messy (Tasks 1+2 bundled with sibling wave-2 commits under their labels) but CODE is verifiably in HEAD. Wave-2 parallel-safety contract from Plan 10-01 held: stubs replaced cleanly, no type conflicts.

*Updated after each plan completion*
| Phase 07-data-foundation P02 | 211 | 2 tasks | 3 files |
| Phase 08-exercise-engine P01 | 3 | 3 tasks | 5 files |
| Phase 08-exercise-engine P02 | 4 | 2 tasks | 4 files |
| Phase 08-exercise-engine P03 | 5 | 3 tasks | 8 files |
| Phase 08.1-end-to-end-qa-suite P01 | 8 | 3 tasks | 8 files |
| Phase 08.1 P02 | 4 | 3 tasks | 4 files |
| Phase 08.1-end-to-end-qa-suite P03 | 4 | 3 tasks | 6 files |
| Phase 08.1 P04 | 9 | 2 tasks | 4 files |
| Phase 08.2-fsrs-progressive-disclosure P01 | 3 | 2 tasks | 6 files |
| Phase 08.2-fsrs-progressive-disclosure P02 | 5 | 2 tasks | 4 files |
| Phase 08.1-end-to-end-qa-suite P05 | 11 | 3 tasks | 7 files |
| Phase 08.1-end-to-end-qa-suite P06 | 14 | 3 tasks | 12 files |
| Phase 08.2-fsrs-progressive-disclosure P03 | 8 | 3 tasks | 8 files |
| Phase 08.1-end-to-end-qa-suite P07 | 7 | 3 tasks | 5 files |
| Phase 08.3-mnemonic-and-kanji-breakdown-for-vocabulary-feedback P01 | 2 | 2 tasks | 4 files |
| Phase 08.3-mnemonic-and-kanji-breakdown-for-vocabulary-feedback P03 | 2 | 2 tasks | 2 files |
| Phase 08.3-mnemonic-and-kanji-breakdown-for-vocabulary-feedback P02 | 3 | 2 tasks | 3 files |
| Phase 08.3-mnemonic-and-kanji-breakdown-for-vocabulary-feedback P04 | 12 | 3 tasks | 5 files |
| Phase 08.1-end-to-end-qa-suite P08 | 9 | 3 tasks | 7 files |
| Phase 08.3-mnemonic-and-kanji-breakdown-for-vocabulary-feedback P05 | 2 | 2 tasks | 5 files |
| Phase 08.4-learn-phase-session-pacing-for-new-vocabulary P02 | 2 | 1 tasks | 2 files |
| Phase 08.4-learn-phase-session-pacing-for-new-vocabulary P01 | 8 | 3 tasks | 4 files |
| Phase 08.4-learn-phase-session-pacing-for-new-vocabulary P03 | 5 | 2 tasks | 2 files |
| Phase 08.4 P05 | 2 | 2 tasks | 2 files |
| Phase 08.4 P04 | 3 | 2 tasks | 2 files |
| Phase 11-cross-song-vocabulary P01 | 20 | 2 tasks | 4 files |
| Phase 11-cross-song-vocabulary P04 | 4 | 2 tasks | 4 files |
| Phase 11-cross-song-vocabulary P05 | 8 | 3 tasks | 12 files |
| Phase 09-kana-trainer P01 | 3 | 3 tasks | 3 files |
| Phase 09-kana-trainer P01 | 3 | 3 tasks | 3 files |
| Phase 09 P03 | 3 | 2 tasks | 2 files |
| Phase 09-kana-trainer P02 | 4 | 2 tasks | 4 files |
| Phase 09 P04 | 3 | 2 tasks | 5 files |
| Phase 09 P05 | 3 | 2 tasks | 5 files |
| Phase 10-advanced-exercises-full-mastery P02 | 9 | 2 tasks | 5 files |
| Phase 10-advanced-exercises-full-mastery P01 | 35 | 2 tasks | 17 files |
| Phase 10-advanced-exercises-full-mastery P04 | 14 | 2 tasks | 7 files |
| Phase 10-advanced-exercises-full-mastery P03 | 15 | 2 tasks | 9 files |
| Phase 10-advanced-exercises-full-mastery P05 | 15 | 2 tasks | 9 files |
| Phase 11-cross-song-vocabulary P06 | 7 | 3 tasks | 7 files |
| Phase 10-advanced-exercises-full-mastery P06 | 12 | 3 tasks | 4 files |
| Phase 10-advanced-exercises-full-mastery P07 | 7 | 2 tasks | 9 files |
| Phase 10 P07 | 15 | 2 tasks | 9 files |
| Phase 12-learning-path-and-gamification P02 | 8 | 4 tasks | 9 files |
| Phase 12 P01 | 9 | 2 tasks | 4 files |
| Phase 12-learning-path-and-gamification P03 | 35 | 3 tasks | 4 files |

## Accumulated Context

### Roadmap Evolution

- Phase 08.1 inserted after Phase 8: End-to-End QA Suite (URGENT) — cross-cutting Playwright + Node-side QA infra to verify v1.0 player + v2.0 Phase 8 exercise engine before Phase 9 (Kana Trainer) builds further
- Phase 08.2 inserted after Phase 8: FSRS progressive disclosure (URGENT) — wire user_vocab_mastery/user_exercise_log writes (currently dead infra) and derive a per-word display tier (kanji+furigana+romaji → kanji+furigana → kanji only) so exercise options stop starting at bare kanji; also unblocks Phase 11's assumption that per-vocab mastery is being persisted
- Phase 08.3 inserted after Phase 8: Mnemonic and kanji breakdown for vocabulary feedback — extend VocabEntry with `mnemonic` + `kanji_breakdown` fields, update content-generation prompt in scripts/seed/03-generate-content.ts, backfill ~60 songs (~1200 vocab items), surface in FeedbackPanel "More" accordion. Separated from Phase 8 refactor (which landed vocab block + wrong-pick callout + verse context without re-seed).
- Phase 08.4 inserted after Phase 8: Learn phase + session pacing for new vocabulary — presentation step before first exercise, skip_learning user preset, new-card cap per session (URGENT)

### Decisions

- Foundation: Use YouTube iframe embed API (not audio extraction) — legal compliance
- Foundation: Pre-generate all lesson content offline via Claude API before launch
- Foundation: Freemium gating at database layer (not hidden UI elements)
- 01-01: JSONB for lesson content (not normalized tables)
- v2.0: Vocabulary identity tracked by UUID FK to vocabulary_items (not surface string) — avoids progress orphaning on content corrections
- v2.0: Exercise generation is client-side from existing JSONB — no pre-computation pipeline needed
- v2.0: FSRS columns as individual scalar columns (not JSONB) — required for indexed due-date queries
- v2.0: Phase 9 (Kana Trainer) can be built in parallel with Phase 8 (Exercise Engine)
- 07-01: Materialized view refresh on song update (not cron) via refreshVocabGlobal() with CONCURRENTLY fallback
- 07-01: Migration written manually — drizzle-kit generate interactive due to unregistered 0001 migration in journal
- [Phase 07-02]: parseConjugationPath called on-demand at exercise time, no JSONB mutation for grammar points
- [Phase 07-02]: Full vocabulary_items table scan for UUID resolution avoids large parameterized IN clauses
- [Phase 08-01]: Stars derived at read time via deriveStars() — never stored as a DB column
- [Phase 08-01]: checkExerciseAccess() is single gate — UI never checks feature flags directly
- [Phase 08-01]: All 4 Phase 8 exercise types declared free — no subscription lookup needed for MVP
- [Phase 08-02]: Generator is pure TypeScript (no DB/network) — enables isolated vitest testing without mocking
- [Phase 08-02]: fill_lyric disabled when < 3 vocab entries in song (can't form 4 unique options)
- [Phase 08-02]: Distractor dedup uses trim+lowercase normalization to prevent synonym collisions
- [Phase 08-03]: isSessionForSong guards against stale cross-song sessions in ExerciseTab
- [Phase 08-03]: Exercise bundle lazy-loaded via React.lazy — keeps initial song page fast
- [Phase 08.1-01]: QA test DB strategy — dedicated TEST_DATABASE_URL on the same Neon project (not ephemeral, not dev DB with test users)
- [Phase 08.1-01]: TEST_USER_ID constant 'test-user-e2e' — single string used everywhere; seedTestUser() seam reserved for Clerk auth
- [Phase 08.1-01]: SEEDED_SLUGS = again-yui + red-swan-yoshiki-feat-hyde + mayonaka-no-orchestra-aqua-timez (last is geo-restricted for plan 08.1-07 regression)
- [Phase 08.1-01]: Zero-flake policy enforced at playwright.config.ts (retries:0, single line) — plan 08.1-08 audits via grep
- [Phase 08.1-01]: Custom plain-ASCII Playwright Reporter — terminal-first; HTML report opt-in via `npm run test:report`
- [Phase 08.1-01]: test:all chains test:seed FIRST so the suite aborts early on stale catalog (saves the 15-min budget)
- [Phase 08.1-02]: Determinism test asserts length-stability + per-type bounds (not exact ordering) — Fisher-Yates shuffle is unseeded today; tightens automatically when generator gains a seeded shuffle
- [Phase 08.1-02]: Thin-pool 3-distractor invariant encoded as `it.fails` (not deleted) — flips RED automatically the moment generator gains a fallback for empty JLPT pool
- [Phase 08.1-02]: Access tests derive FREE/PREMIUM lists programmatically from EXERCISE_FEATURE_FLAGS — no test edits needed when Phase 10 adds premium types
- [Phase 08.1-02]: deriveStars test imports from @/lib/db/schema (not @/lib/db/index) — preserves the no-DB-in-unit-layer invariant for plan 08.1-08 grep audit
- [Phase 08.1-03]: Single global setupFiles entry (tests/integration/setup.ts) instead of vitest projects — loads .env.test/.env.local and redirects DATABASE_URL → TEST_DATABASE_URL before any DB-touching import resolves; safe for unit tests since they don't read DATABASE_URL
- [Phase 08.1-03]: Per-file describe.skip guard when TEST_DATABASE_URL is unset — keeps `npm run test:integration` green pre-provisioning instead of failing at import time
- [Phase 08.1-03]: information_schema invariant test asserts `user_song_progress` has NO `stars` column — locks the read-time star derivation decision at the schema level; a future refactor that adds the column will fail this test loudly
- [Phase 08.1-03]: Direct route handler invocation in integration tests (`import { GET } from "@/app/.../route"` + `new NextRequest`) — no Next.js dev server, ~3s faster per run, exercises the same handler the framework would invoke
- [Phase 08.1-03]: Defensive `Array.isArray(raw) ? raw : (raw.rows ?? [])` pattern for drizzle .execute(sql) — neon-http return shape varies by query and silently masks failures otherwise
- [Phase 08.1]: [Phase 08.1-04]: TV-pack skip heuristic = version_type='tv' AND lesson IS NULL — matches the 60 pending-WhisperX rows without needing a new schema flag
- [Phase 08.1]: [Phase 08.1-04]: Single source of truth for YouTube probe — fetchVideosMetadata + classifyAvailability stay in scripts/lib/youtube-search.ts; no scripts/lib/youtube-availability.ts created (would be empty proxy)
- [Phase 08.1]: [Phase 08.1-04]: Geo-check exit semantics — GONE always fails; GEO fails by default; --allow-geo flag is operator's regional escape (CI deterministic, no IP probing)
- [Phase 08.2-01]: RATING_WEIGHTS locked: meaning_vocab=4, vocab_meaning=3, fill_lyric=3, reading_match=2
- [Phase 08.2-01]: Reveal hatch (revealedReading=true) always forces rating=1 regardless of correct flag
- [Phase 08.2-01]: Relearning state collapses to TIER_LEARNING (2) — pure state-driven tier, no stability thresholds
- [Phase 08.2-01]: ScheduledUpdate matches user_vocab_mastery scalar columns 1:1 for direct Drizzle spread in Plan 02
- [Phase 08.2-02]: recordVocabAnswer uses db.transaction() — both upsert and log insert succeed or both roll back
- [Phase 08.2-02]: Distractors never persisted — caller invariant; only target vocabItemId writes to DB
- [Phase 08.2-02]: Cold-start missing mastery row defaults to Tier 1 (state=0); no backfill per CONTEXT
- [Phase 08.2-02]: vocab-mastery detail never 404 on missing mastery — synthesized new-word shape returned
- [Phase 08.2-02]: vocab-tiers batch enforces max 200 IDs to prevent over-fetching
- [Phase 08.1-05]: Real YouTube iframe in E2E (no postMessage stubs on critical sync path) — CONTEXT-locked; cross-origin player surfaced via window.__kbPlayer test gate
- [Phase 08.1-05]: Test-only instrumentation gated EXCLUSIVELY on NEXT_PUBLIC_APP_ENV === 'test' (single-condition; never OR'd with NODE_ENV) — applies to __kbPlayer + data-start-ms + __kbExerciseStore
- [Phase 08.1-05]: 1500ms verse-highlight regression floor in E2E (not the 250ms perception target — that stays a manual check to avoid CI flake)
- [Phase 08.1-05]: Sync tests test.skip() (not fail) when YouTube iframe unreachable — graceful geo-restriction fallback per CONTEXT
- [Phase 08.1-05]: data-verse-number + data-active are unconditional (cheap + useful in dev devtools); only data-start-ms (raw timing) sits behind the test-env gate
- [Phase 08.1-06]: window.__kbExerciseStore gated single-condition NEXT_PUBLIC_APP_ENV === 'test' (no NODE_ENV fallback) — production bundle tree-shakes the dead branch
- [Phase 08.1-06]: No data-correct attribute in production DOM — tests read correctAnswer via the window hook only; data-* attrs carry IDs/state, never answers
- [Phase 08.2]: VocabInfo type added to generator.ts so renderer components don't depend on full VocabEntry
- [Phase 08.2]: distractorVocab map keyed by surface string on Question enables TierText for options without extra fetch
- [Phase 08.2]: FeedbackPanel vocab block built with TierText forceTier1 + MasteryDetailPopover for always-Tier-1 invariant
- [Phase 08.1-07]: Route-intercept (page.route abort + 404 fulfill) for geo-fallback testing — deterministic, exercises both watchdog and onError paths
- [Phase 08.1-07]: YouTubeEmbed 15s WATCHDOG_MS with functional setState guard — covers iframe-never-loads case where neither onReady nor onError fires
- [Phase 08.1-07]: Locked fallback copy committed in BOTH YouTubeEmbed and the spec — copy changes must update both files (brittle by design)
- [Phase 08.1-07]: Single-gate static check colocated in regression-stale-lesson-data.test.ts — avoids shipping an undeclared regression-single-gate.test.ts artifact
- [Phase 08.1-07]: Premium-gate test.fixme is intentional Phase 10 follow-up (server-side checkExerciseAccess routing) — not a test bug
- [Phase 08.1-07]: Cross-song leak round-trip (BOTH directions) proves preservation as well as rejection — Song A->B refuses + B->A still resumes
- [Phase 08.3]: Nullable jsonb mnemonic/kanji_breakdown columns — NULL means not yet enriched, Wave 2 skip signal
- [Phase 08.3]: No indexes on new columns — sequential scan faster for 705-row mnemonic IS NULL filter
- [Phase 08.3-03]: Inline enrich sub-schemas in lesson.ts avoid cross-module runtime import for generation
- [Phase 08.3-03]: mnemonic + kanji_breakdown optional in VocabEntrySchema — legacy lessons still validate
- [Phase 08.3]: 08.3-02: inline client.messages.create (NOT Batch API) for vocab enrichment — user locked preference
- [Phase 08.3]: 08.3-02: isNull(mnemonic) sole skip gate — kanji_breakdown IS NULL valid for kana-only words
- [Phase 08.3]: moreAccordionOpen in Zustand resets on startSession preventing cross-song UI leakage
- [Phase 08.3]: Server enrichment batch: collect IDs, single SELECT WHERE id IN, merge into VocabEntry
- [Phase 08.1-end-to-end-qa-suite]: [Phase 08.1-08]: Quarantine grepInvert override uses env-var-driven sentinel ('__never_match_kb_quarantine_sentinel__') — Playwright AND-combines grep + grepInvert and rejects empty --grep-invert, so neutralizing the config-level invert via env var is the only way to opt quarantined tests INTO a run
- [Phase 08.1-end-to-end-qa-suite]: [Phase 08.1-08]: measure-suite-runtime.ts uses fastest-first layer order (test:qa -> test:unit -> test:integration -> test:e2e) — regression in fast layer kills the run before E2E starts the dev server, saving ~10 min per failed run
- [Phase 08.1-end-to-end-qa-suite]: [Phase 08.1-08]: PR job runs test:ci-pr (no E2E) — explicit speed/cost tradeoff; nightly is the only place E2E + 15-min budget gate live; concurrency-cancels in-flight runs on the same ref to save runner minutes
- [Phase 08.1-end-to-end-qa-suite]: [Phase 08.1-08]: home + songs-browse scenarios from app.spec.ts ported to standalone tests/e2e/home-and-browse.spec.ts (6 tests) BEFORE deletion — plan 05's player-*.spec.ts only covered /songs/[slug], not / and /songs
- [Phase 08.3]: test:qa:enrichment exits 1 pre-enrichment by design — gates DESIGNED to fail until seed:enrich-vocab runs
- [Phase 08.3-05]: tests/unit/ added to vitest include; MIN_WORDS=5 MAX_WORDS=25 bounds locked per CONTEXT.md
- [Phase 08.4-learn-phase-session-pacing-for-new-vocabulary]: LearnCard is 100% props-driven — no Zustand imports; session coupling deferred to Plan 04
- [Phase 08.4-learn-phase-session-pacing-for-new-vocabulary]: tts.ts uses Web Speech API (browser-native); no external TTS service or API key needed
- [Phase 08.4]: skip_learning DEFAULT false = do NOT skip (cards show) — column polarity matches CONTEXT default-ON behavior
- [Phase 08.4]: states map in vocab-tiers additive — existing callers destructuring only tiers unaffected
- [Phase 08.4]: tts.ts already existed from 08.4-02 pre-commit with all required exports
- [Phase 08.4]: getUserPrefs returns raw stored value; getEffectiveCap is sole premium enforcement point
- [Phase 08.4]: isPremium exported from userPrefs.ts as single subscriptions query source of truth
- [Phase 08.4]: isPremium imported from userPrefs.ts — no inline subscriptions query on profile page (single abstraction)
- [Phase 08.4]: Profile page: PLACEHOLDER_USER_ID matches existing app auth TODO pattern; Clerk auth deferred to Phase 10
- [Phase 08.4]: React hooks before hydration guard in ExerciseTab — useEffect cannot follow conditional return
- [Phase 08.4]: Cap filter applied at ExerciseTab call-site before buildQuestions, not inside generator
- [Phase 11-cross-song-vocabulary]: state IN (1,2,3) for known check everywhere — NOT state >= 2 (Pitfall 1)
- [Phase 11-cross-song-vocabulary]: REVIEW_NEW_DAILY_CAP=20: researcher recommendation, matches Phase 08.4 premium ceiling / 1.5
- [Phase 11-cross-song-vocabulary]: Phase-local 3-bucket tier→state mapping in getVocabularyDashboard diverges from tier.ts (deliberate, dashboard-local only)
- [Phase 11-02]: No router.refresh() for KnownWordCount — client refetches narrow GET endpoint; justFinished predicate on Zustand questions+currentIndex detects session end
- [Phase 11-02]: Zero-state pill renders "New to you" (not "0/12") — less discouraging per CONTEXT
- [Phase 11-02]: songId threaded as explicit prop on SongContent — SongMeta has no id field; VersionData.id is song-version UUID not song UUID
- [Phase 11-03]: GlobalLearnedCounter visible to ALL users (free + premium) — hiding from free users reduces conversions per CROSS-03 CONTEXT
- [Phase 11-03]: No emoji in GlobalLearnedCounter — project CLAUDE.md convention; documented inline
- [Phase 11-03]: Async RootLayout in layout.tsx — GlobalLearnedCounter DB read makes all routes dynamic; acceptable per-request is the feature
- [Phase 11-03]: seenInSongs hidden for single-song words; current song included in multi-song list sorted title ASC
- [Phase 11-03]: MasteryDetail type defined and exported directly from vocab-mastery API route file
- [Phase 11-04]: Path B 3-bucket split (state 2=Mastered, 3=Known, 1=Learning) in VocabularyList — NOT tierFor() — divergence documented in paragraph-length JSDoc
- [Phase 11-04]: In-memory FREE_PREVIEW_LIMIT=20 slice vs SQL LIMIT — single query, accurate total for CTA; revisit if scale degrades
- [Phase 11-04]: getVocabularySources private to page.tsx — page-local only, not exported from queries.ts
- [Phase 11-04]: SeenInExpander lazy fetch + useState cache — one API hit per word per session, no O(N) page-load storms
- [Phase 11-05]: QuestionCard/FeedbackPanel WRAPPED (not reused) because both call useExerciseSession(); wrappers copy JSX and swap stores; refactoring deferred
- [Phase 11-05]: hashVocabId polynomial rolling hash (base 31, bitwise-OR 0, Math.abs) for deterministic exercise-type rotation in review queue
- [Phase 11-05]: consumeNewCardBudget uses INSERT...ON CONFLICT DO UPDATE with CASE for atomic daily-counter rollover at UTC midnight; no cron job needed
- [Phase 11-05]: users.new_card_cap (Phase 08.4, per-session, user-tunable) and users.review_new_today (Phase 11, per-day, fixed at REVIEW_NEW_DAILY_CAP) are independent columns with distinct semantics
- [Phase 11-05]: daily_new_card_cap_reached error-code contract: ReviewSession catches, prunes new cards, refetches /api/review/budget, shows non-blocking toast; card NOT marked answered
- [Phase 11-05]: /api/review/queue includes vocabData inline (Record<id,VocabRow>) to avoid per-card roundtrip in ReviewSession
- [Phase 09-kana-trainer]: Plan 09-01: KanaMode lives in src/lib/kana/types.ts (not in any UI component) so wave-3 plans 09-04 / 09-05 stay parallel-safe
- [Phase 09-kana-trainer]: Plan 09-01: KANA_CHART hardcoded with Modified Hepburn (no wanakana dep) — single source of truth for hiragana/katakana/romaji
- [Phase 09-kana-trainer]: Plan 09-01: char count locked at 104 (plan stated 105 but row breakdown sums to 104 — n-row was double-counted in the plan)
- [Phase 09-kana-trainer]: Plan 09-01: ROW_UNLOCK_MASTERY_PCT (0.8) and ROW_UNLOCK_MIN_STARS (5) tuning constants exported from chart.ts — re-tuning is a 2-line edit
- [Phase 09]: Plan 09-03: Persist key kitsubeat-kana-mastery-v1 (versioned for forward migration)
- [Phase 09]: Plan 09-03: applyAnswer delegates to applyStarDelta from mastery.ts (single source of truth for KANA-03 +1/-2 clamp)
- [Phase 09]: Plan 09-03: No nudgeShown flag — banner derives purely from sessionsCompleted (cleaner; no bookkeeping)
- [Phase 09]: Plan 09-03: __kbKanaStore window hook gated single-condition NEXT_PUBLIC_APP_ENV==='test' (no NODE_ENV fallback — production tree-shakes)
- [Phase 09-kana-trainer]: [Plan 09-02]: applyStarDelta clamped [0,10] (KANA-03); +1 correct, -2 wrong
- [Phase 09-kana-trainer]: [Plan 09-02]: isRowMastered uses Math.ceil(N * 0.8) so ya-row (3 chars) needs all 3 at >= 5 stars
- [Phase 09-kana-trainer]: [Plan 09-02]: computeUnlockedRows uses break (not continue) — non-contiguous mastery does NOT skip ahead
- [Phase 09-kana-trainer]: [Plan 09-02]: weightFor anchor 0->10, 5->5, 10->1 with 5:1 ratio between mid and ceiling locked by test (KANA-05)
- [Phase 09-kana-trainer]: [Plan 09-02]: buildKanaSession returns [] on empty pool (no throw); duplicates allowed by design (with-replacement weighted draw)
- [Phase 09-kana-trainer]: [Plan 09-02]: buildDistractors keeps 'script' param on signature (currently unused) — reserved for future cross-script confusable variants
- [Phase 09-kana-trainer]: Plan 09-04: /kana page is a Client Component with hydration-skeleton (animate-pulse) — pattern lifted from src/app/songs/[slug]/components/ExerciseTab.tsx; SSR with persisted localStorage would mismatch (RESEARCH Pitfall 1)
- [Phase 09-kana-trainer]: Plan 09-04: NO checkExerciseAccess / requireAuth on /kana — FREE-03 invariant, verified by grep audit; page-level JSDoc reworded so the literal-text audit returns 0 matches
- [Phase 09-kana-trainer]: Plan 09-04: KANA_SIGNUP_NUDGE_AFTER_SESSIONS=3 (locked from RESEARCH Open Question 4); banner has no /signup CTA wired — Phase 3 auth lands the destination, banner alone is the nudge
- [Phase 09-kana-trainer]: Plan 09-04: Mode state is component-local (NOT persisted) — resets on reload by design; mode persistence out of scope for v1
- [Phase 09-kana-trainer]: Plan 09-04: KanaTile + ModeToggle are pure props-driven (no store import); only KanaGrid + SignupNudge subscribe to useKanaProgress — keeps tile/toggle reusable in any future surface (e.g. session UI, summary screen)
- [Phase 09-kana-trainer]: Plan 09-05: SESSION_LENGTH=20 questions per drill (locked module-level const)
- [Phase 09-kana-trainer]: Plan 09-05: startSnapshot ref captured on first hydrated render — mid-session unlocks fire RowUnlockModal but DON'T expand the current pool (next session puts the new row into rotation)
- [Phase 09-kana-trainer]: Plan 09-05: sessionStorage handoff key kitsubeat-kana-last-session shape={mode:KanaMode, log:AnswerLog[], unlocked:string[]} — single-use ephemeral, NOT localStorage
- [Phase 09-kana-trainer]: Plan 09-05: KanaMode imported from @/lib/kana/types in BOTH session/page.tsx and KanaSession.tsx — no sibling-plan UI import; preserves wave-3 plans 09-04/09-05 parallelism
- [Phase 09-kana-trainer]: Plan 09-05: 0-star path uses setStars(script,glyph,1) NOT applyAnswer — KANA-04 is "exactly 1 star" not "+1 from current"
- [Phase 09-kana-trainer]: Plan 09-05: queueMicrotask wraps unlock-detection diff so useKanaProgress.getState() reads the post-applyAnswer store
- [Phase 09-kana-trainer]: Plan 09-05: One RowUnlockModal per question (loop break) — multi-row simultaneous unlock collapses to first
- [Phase 09-kana-trainer]: Plan 09-05: sessionStorage.setItem moved into useEffect (not inline-during-render, deviation from plan text) — avoids React StrictMode double-write; same key/shape preserved
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-02: Ref-based dispatch (not state) for PlayerContext.seekTo/play/pause — consumed by 13 files incl. verse-sync TokenSpan; registration must not ripple re-renders. Wrappers use empty-deps useCallback; apiRef.current lookup on each call.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-02: Single _registerApi(bundle) call instead of planner's four discrete setters (setSeekTo/setPlay/setPause/setIsReady) — atomic register/clear prevents desync; comment preserves the planner's pattern name.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-02: embedState promoted from YouTubeEmbed-local to PlayerContext (Pitfall 3) — Plan 10-04 Listening Drill reads embedState === 'error' to render fallback without importing YouTubeEmbed internals.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-02: seekAndPlay keeps pause->seek->50ms->play sequencing INSIDE the debounce fn (not three separate context wrappers) — one atomic replay verb for consumers; inner api-null short-circuit handles mid-debounce tear-down.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-02: SEEK_DEBOUNCE_MS=400ms + SEEK_TO_PLAY_DELAY_MS=50ms locked at module-level (10-RESEARCH Pitfall 2 empirical values).
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-02: setEmbedState typed Dispatch<SetStateAction<EmbedState>> (not (v:EmbedState)=>void) — preserves YouTubeEmbed watchdog functional-updater race guard against onReady-in-same-tick.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-02: Added @vitejs/plugin-react + jsdom + @testing-library/react + @testing-library/jest-dom as devDeps (Rule-3 blocking) — pre-10-02 tests were pure TS on vitest node env; testing React context requires DOM + JSX transform.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-02: Per-file `// @vitest-environment jsdom` directive over globbing — vitest v4 removed environmentMatchGlobs; node remains fast default for pure TS tests.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-02: IS_REACT_ACT_ENVIRONMENT=true at top of .tsx test files — silences React 19 act() stderr spam without pulling in RTL's act wrapper.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-02: __kbPlayer test gate (Plan 08.1-05 single-condition NEXT_PUBLIC_APP_ENV === 'test') preserved verbatim — PlayerContext imperative API sits ALONGSIDE, not in place of, the e2e instrumentation.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-02: Probe consumer pattern for context tests — tiny `<Probe>` component captures ctx into a module-level ref on each render; tests invoke `getCtx().seekTo(...)` between act() blocks.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-01: Migration numbered 0007 (not 0006) — 0006_review_daily_counter.sql already existed from Phase 11-05. Inline comment in the migration documents the rename.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-01: deriveStars signature: ex6_best_accuracy OPTIONAL (nullable) — preserves backward compat for legacy callers; missing treated as 0 (Star 3 unreachable without Ex 6 data).
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-01: Counter-increment lives in Plan 06 saveSessionResults/recordVocabAnswer, NEVER in checkExerciseAccess — prevents Pitfall 5 double-increment on session resume.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-01: Already-touched song always passes the song_quota gate (re-entry = not 11th distinct touch) — userHasTouchedSong consulted before count check.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-01: Premium bypass is a short-circuit — counter reads skipped entirely for premium users. Simplicity + perf.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-01: QUOTA_LIMITS lives in feature-flags.ts (not access.ts) — tests import and assert the exact 10/3 values without reaching into the gate fn.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-01: stars.test.ts from plan text merged into existing derive-stars.test.ts (from Phase 08.1-02) — avoids two suites owning deriveStars. All plan requirements landed (21 cases incl. Star 3 + ordering + deriveBonusBadge).
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-01: 12 generator stub markers (3×makeQuestion + 3×extractField + 3×makeExplanation) + 3 ExerciseSession = 15 total (plan stated 6 minimum; TypeScript exhaustiveness required the extractField + makeExplanation stubs).
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-01: resetTestProgress in tests/support/test-db.ts extended to clear user_exercise_song_counters so Phase 10 integration tests stay hermetic.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-01: RATING_WEIGHTS extended to 7 entries — grammar_conjugation=4, listening_drill=3, sentence_order=4. Production > recognition > surface invariant preserved.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-01: Wave-1 type widening pattern — union + Question interface + stubs all in ONE plan so wave-2 plans 10-03/04/05 only REPLACE stub bodies (no type churn, no merge conflicts under parallel execution).
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-04: ListeningDrillCard consumes usePlayer() imperative API (seekTo/play/isReady/embedState) — NO raw YT ref, NO window.__kbPlayer in production bundle
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-04: embedState='error' fallback is a hard dead-end — locked-copy message only, no onSkip/Skip/Next, no silent fill_lyric substitution. Star 3 unreachable on that song until iframe works (CONTEXT-locked).
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-04: Replay uses discrete seekTo()+play() (NOT seekAndPlay) — human-tap feedback responsiveness; seekAndPlay's 400ms debounce is for programmatic bursts, not UI clicks.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-04: listeningReplays session slice is telemetry-only — reset on startSession, NEVER fed to FSRS. CONTEXT-locked 'unlimited replays, no penalty'.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-04: buildQuestions emits listening_drill ONLY when >=1 verse has start_time_ms>0 (hasTimedVerses gate); makeQuestion returns null for vocab without timed verse. Zero-emission clean-skip on untimed songs.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-05: Sentence Order is verse-centric (per-verse loop in buildQuestions, not per-vocab); distractors=[]; empty-string vocabItemId sentinel for Plan 10-06 to skip per-vocab mastery writes
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-05: SENTENCE_ORDER_TOKEN_CAP=12 exported from generator.ts — per-verse filter (not per-song gate); audit script confirms 83.8% of songs have >=3 eligible verses (above 80% threshold, no follow-up)
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-05: initSentenceOrder no-ops on existing pool (reload-safe via zustand persist); UUIDs stamped at shuffle time so no data-position/data-correct-index in DOM (Pitfall 1 immune)
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-05: Stable zustand selectors — slice Record<id,T[]> then derive by id (inline  trips React 19 getSnapshot-cache warning)
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-03: V1_CONJUGATION_FORMS = 4 drillable families (past_affirmative/te_form/negative/tai_form); compound families (shimau, conditional_*, obligation) deferred — mini-conjugator would triple in size. past_negative ships as adjacent-form distractor only, not a drilled target.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-03: classifyConjugationForm required because parseConjugationPath returns raw per-song annotations (601 distinct 'families' from 607 exemplars). Canonical 23-family classifier keyed off conjugated-suffix regex + label heuristics; 'other'/'stem'/'clause_marker' excluded from V1 selection as catch-all buckets (286+44+6 = 336/607 absorbed).
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-03: Grammar Conjugation driven off lesson.grammar_points[] (not vocabulary[]). VocabEntry has no grammar_point back-ref; buildQuestions gains a third concentric loop (per-grammar-point). Synthetic VocabEntry with empty-string vocabItemId sentinel when grammar point's base doesn't match a vocab entry — same sentinel as Plan 10-05 sentence_order.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-03: Same-verb wrong distractor = adjacent-form flip via ADJACENT_FORM map (past_affirmative↔past_negative polarity-flip; te_form↔negative / tai_form↔te_form category-flip). Beginners fumble negation before form category, so polarity-first is the higher-signal error. 2 alternate-verb distractors from sameJlptPool filtered to part_of_speech === 'verb'.
- [Phase Phase 11]: jlptPools built in one combined SQL query excluding queued IDs to prevent self-distractor cross-contamination
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-06: Advanced Drills mode card always renders for ALL users (CONTEXT-locked) — gate decides at click time, not render time. Hiding card reduces conversions per FREE-05.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-06: getAdvancedDrillAccess is the thin server-action wrapper preserving Phase 08.1-07 single-gate contract — UI never imports EXERCISE_FEATURE_FLAGS or checkExerciseAccess (grep verified 0 matches).
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-06: Counter-increment dual-path — per-answer in recordVocabAnswer for FSRS-backed types + end-of-session safety-net in saveSessionResults for empty-vocabItemId callers (sentence_order + synthetic grammar_conjugation). All three paths idempotent via ON CONFLICT DO NOTHING.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-06: Server-side re-check + refund in recordVocabAnswer — insert first, re-count after. On non-premium overshoot, DELETE overshoot row + throw QuotaExhaustedError. RESEARCH Pitfall 6 trade-off: one answer of slippage possible — documented in past-tense upsell copy.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-06: buildQuestions gains optional typeFilter: ExerciseType[] — honored in per-vocab + per-verse (sentence_order) + per-grammar-point (grammar_conjugation) loops. Omitted filter preserves pre-Plan-06 full-emission behavior (generator tests 23/23 green without modification).
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-06: test.fixme UNFIXED in regression-premium-gate.spec.ts — replaced with live QuotaExhaustedError test (seeds 10 listening counter rows, invokes recordVocabAnswer on 11th song, asserts throw + refund). Synthetic UNKNOWN-type marker replaces grammar_conjugation as the 'premium default' target since grammar_conjugation is now a real song_quota type.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-07: Star 3 reuses the existing Stars 1/2 confetti + star-shine code path verbatim (Plan 08-04 primitive). No new animation library, no new CSS keyframes. StarDisplay already widened in Plan 10-01; Plan 10-07 adds only the JSDoc lock.
- [Phase 10-advanced-exercises-full-mastery]: Plan 10-07: bonus badge transition gets a subtle callout (muted amber text, no animation), NOT confetti. CONTEXT-locked — stars remain primary signal, bonus is secondary.
- [Phase 10-07]: Star 3 reuses Plan 08-04 confetti primitive verbatim; no new animation library or CSS keyframes per CONTEXT lock
- [Phase 10-07]: QuotaExhaustedError moved to lib/exercises/errors.ts — 'use server' files cannot export non-async values (Next.js 15 constraint)
- [Phase 10-07]: getAllSongs uses correlated subqueries (not LEFT JOIN) for per-user accuracy; matches existing tv-preferred youtube_id selector pattern
- [Phase 12-learning-path-and-gamification]: Milestone fires only on streak advance not same-day repeat
- [Phase 12-learning-path-and-gamification]: applyDailyCap exported for Plan 04 direct use
- [Phase 12]: content jsonb typed as plain jsonb in schema.ts; Plan 03 narrows to RewardSlotContent union
- [Phase 12]: Researcher starter picks all fail basic-tier check; SUBSTITUTION NEEDED flagged for Plan 03
- [Phase 12]: Migration applied via tsx neon script; drizzle-kit push has interactive prompt blocking automation
- [Phase 12-learning-path-and-gamification]: Starter songs: under-the-tree-sim/misa-no-uta-aya-hirano/yume-wo-kanaete-doraemon-mao (user option-b)
- [Phase 12-learning-path-and-gamification]: AnimeSceneContent.media_url typed string|null — Phase 21 INSERTs without code change

### Pending Todos

- [Enforce full Japanese-line coverage in lesson prompt](todos/pending/2026-04-16-enforce-full-japanese-line-coverage-in-lesson-prompt.md) — tooling — lesson prompt skips filler Japanese lines (~30s stale highlight on sign-flow; likely systemic)
- [Replace 19 remaining geo-restricted YouTube videos](todos/pending/2026-04-16-replace-19-remaining-geo-restricted-youtube-videos.md) — tooling — `npm run audit:geo:replace` hit quota after 2/21; run again after quota reset (~2000 units needed)
- [Label song page sections so lesson is discoverable](todos/pending/2026-04-16-label-song-page-sections-so-lesson-is-discoverable.md) — ui — song page has no "Lesson" label; users think lesson is missing (surfaced QAing Sign 2026-04-16)
- [Amend bogus "--help" commit message on 3109fcf](todos/pending/2026-04-16-amend-bogus-help-commit-message.md) — tooling — commit 3109fcf has literal message "--help" (CLI mis-parse); content is harmless Phase 7 doc cleanup, just needs message reword while still local

### Blockers/Concerns

- Phase 1: Lyric copyright strategy requires legal review for US and Japan markets
- Phase 1: Pipeline execution blocked pending env setup: YOUTUBE_API_KEY, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, ANTHROPIC_API_KEY
- v2.0 Phase 7: [RESOLVED] Conjugation audit complete — 91% structured, 9% unstructured (pattern labels). Exercise eligibility filter now well-defined.
- v2.0 Phase 8: Distractor pool is thin until 30+ songs are seeded — validateDistractorPool() fallback to same-JLPT-level words needed
- Phase 08.1-01: TEST_DATABASE_URL not yet provisioned — operator must create separate Neon DB, run `npm run seed:dev` against it, and `npm run test:seed` before plans 08.1-03 / 08.1-06 / 08.1-07 execute (plans 02 and 04 are pure unit/script and can run without).
- Phase 08.1-03: 16 new integration tests are authored but currently SKIPPED end-to-end — operator must complete TEST_DATABASE_URL provisioning (create DB, db:push migrations, npm run seed:dev, npm run test:seed) for them to actually exercise assertions. Suite is hermetic and will activate automatically once env is set; no test code change needed.
- Phase 08.1-05: Pre-existing 500 on /songs/[slug] blocks live spec runs — `Localizable` (Record<lang,string>) is being rendered as React child in VerseBlock, TokenPopup, VocabularySection, GrammarSection. Specs ARE authored + committed; will pass once the rendering bug is fixed. See deferred-items.md in phase dir.
- Phase 08.1-06: Pre-existing Localizable rendering bug in LyricsPanel/VerseBlock blocks ALL exercise E2E specs from running live; specs are sound and committed but pass requires fixing Localizable consumers (wrap with localize() helper)
- Phase 08.1-07: Same Localizable rendering blocker continues to gate live E2E runs of regression-cross-song-leak / regression-premium-gate (UI tests) / regression-geo-fallback. Integration spec regression-stale-lesson-data.test.ts runs live (9/10 passing + 1 DB-gated skip); E2E specs are sound and committed; one Localizable fix unblocks plans 05/06/07 simultaneously.
- Phase 08.3-02: ANTHROPIC_API_KEY not set — script ships ready but operator must set key (https://console.anthropic.com API Keys → .env.local) then run `npm run seed:enrich-vocab` to enrich ~705 vocabulary_items rows.
- Phase 08.1-08: CI workflow .github/workflows/qa-suite.yml is INERT until operator adds TEST_DATABASE_URL as a GitHub Actions repo secret (Settings → Secrets and variables → Actions). PR job will fail at the test:seed step without it. Once added, first PR exercises pr-checks; first 06:00 UTC tick exercises nightly-full.
- Phase 08.1-08: Live `npm run test:measure` end-to-end run NOT exercised in this environment — same TEST_DATABASE_URL + Localizable bug blockers from plans 05/06/07. The 15-min budget assertion is implemented and TS-clean; first true verification happens once those blockers clear.

## Session Continuity

Last session: 2026-04-18
Stopped at: **Completed Phase 10 Plan 07 — Phase 10 END-TO-END DONE.** StarDisplay (already widened 0|1|2|3 in Plan 10-01) gets a JSDoc lock confirming Star 3 reuses the Stars 1/2 `animate`-prop code path + the canvas-confetti dynamic-import burst at `stars > prevStarsRef.current` — CONTEXT-locked: no new animation library, no new CSS keyframes, no new @keyframes in globals.css. SessionSummary flips the callout to "You earned 3 stars — song mastered!" when `newStarEarned && stars === 3` (Stars 1/2 keep "You earned Star {stars}!"); new `bonusUnlocked = !saving && bonusBadge && !previousBonusBadge` branch surfaces a single-line muted amber `<p>Bonus mastery unlocked!</p>` with zero animation — stars remain primary, bonus is secondary. saveSessionResults returns new `{bonusBadge, previousBonusBadge}` pair computed via `deriveBonusBadge({ex5,ex7})` applied to BOTH the pre-upsert row (before GREATEST merges this session's ex5/ex7) AND the post-upsert row — Pitfall 7 symmetric with stars/previousStars. SongMasteredBanner (32-line diagonal amber ribbon top-right of thumbnail, rotated 45°, 100×100 overlay, "MASTERED" tracking-widest) + BonusBadgeIcon (33-line inline 16×16 4-point violet-400 sparkle SVG adjacent to stars, hover-tooltip "Bonus mastery: Grammar Conjugation + Sentence Order") ship as catalog decorations — violet deliberate so users don't misread bonus as a fourth star. getAllSongs now accepts optional userId; supplying it adds six correlated subqueries joining ex1_2_3/ex4/ex5/ex6/ex7 best_accuracy + completion_pct via tv-preferred ORDER BY CASE — same thumbnail-version contract the existing youtube_id subquery uses, single round-trip for the 200-row catalog. SongCard reworked to derive `stars = deriveStars({ex1_2_3,ex4,ex6})` + `bonus = deriveBonusBadge({ex5,ex7})` at render time; `showMasteryBanner = showProgress && stars===3` renders SongMasteredBanner BEFORE the OP-ED pill for visual priority; `showBonusBadge = showProgress && bonus` renders BonusBadgeIcon inline trailing StarDisplay via `gap-1.5`. Unused `progress` prop removed (only call site was passing song-only). Unauthenticated path: null accuracy fields + null completion_pct → showProgress=false → no ribbon, no badge, no stars row (CONTEXT invariant). /songs/page.tsx threads PLACEHOLDER_USER_ID='test-user-e2e' through getAllSongs matching /songs/[slug]/page.tsx pattern. Song detail page unchanged — does NOT currently fetch user_song_progress for header display (plan's "if SSR fetches progress" condition was false). Sidecar fix during execution moved Plan 10-06's QuotaExhaustedError class export out of `"use server"` exercises.ts into new `src/lib/exercises/errors.ts` module + swapped import sites in exercises.ts + regression-premium-gate.spec.ts — unblocks `npm run build` (was failing at webpack parse). Build now passes end-to-end (21 routes, 102 kB shared JS, production bundle emitted). 263 unit tests green / 1 expected fail / 14 skipped (no regressions from any change). Commits 0306fde (Task 1 — StarDisplay JSDoc + SessionSummary callouts + SongMasteredBanner + BonusBadgeIcon + saveSessionResults bonusBadge return fields), 39f83dc (Task 2 — getAllSongs userId join + SongCard render-time derivation + /songs page PLACEHOLDER_USER_ID). Phase 10 complete 7/7.
Resume file: Phase 10 done. Next phase candidates: remaining v1.0 Phase 1 plans (6/8 complete), or Phase 12+ features.
