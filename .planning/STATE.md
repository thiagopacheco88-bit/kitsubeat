# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-14)

**Core value:** Users can watch an anime song and understand exactly what every word means — with furigana, translation, grammar breakdown, and vocabulary categorization synced to the music as it plays.
**Current focus:** v2.0 Phase 09 — Kana Trainer (1/6 plans complete); Phase 11 Plan 05 (/review queue) deferred

## Current Position

Phase: 09 of 11 (Kana Trainer) — In Progress
Plan: 1 of 6 complete; next: Phase 09 Plan 02
Status: Plan 09-01 complete — kana reference data module shipped: src/lib/kana/types.ts (KanaChar/KanaRow/Script/RowKind/KanaMode/MasteryMap), src/lib/kana/chart.ts (KANA_CHART with 104 entries — 46 base + 20 dakuten + 5 handakuten + 33 yoon — plus HIRAGANA_ROWS/KATAKANA_ROWS and ROW_UNLOCK tuning constants), src/lib/kana/__tests__/chart.test.ts (12 invariant tests passing). Commits de8d2f6, 018899e, c63d88c.
Last activity: 2026-04-18 — Plan 09-01 complete (Wave 1). Authoritative kana data + types + invariant suite ready for downstream plans 09-02..09-06.

Progress: [████████████] v1.0 Phase 1 in progress (6/8 plans); v2.0 Phase 08.1 COMPLETE (8/8 plans); v2.0 Phase 08.2 COMPLETE (3/3 plans); v2.0 Phase 08.3 COMPLETE (5/5 plans); v2.0 Phase 08.4 in progress (3/5 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 13
- Average duration: 8 min
- Total execution time: 1.66 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-content-pipeline | 6/8 | 60 min | 10 min |
| 08.1-end-to-end-qa-suite | 8/8 | 66 min | 8 min |
| 08.2-fsrs-progressive-disclosure | 3/3 | 16 min | 5 min |

**Recent Trend:**
- Last 7 plans: 08.1-05 (11 min), 08.1-06 (14.5 min), 08.2-03 (8 min), 08.1-07 (7 min), 08.1-08 (9 min), 11-04 (4 min), 09-01 (3 min)
- Trend: improving (09-01 landed in 3 min — pure data + types + tests, no DB or runtime concerns; deviation 1 caught a plan-level off-by-one before it shipped)

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
| Phase 09-kana-trainer P01 | 3 | 3 tasks | 3 files |
| Phase 09-kana-trainer P01 | 3 | 3 tasks | 3 files |

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
- [Phase 09-kana-trainer]: Plan 09-01: KanaMode lives in src/lib/kana/types.ts (not in any UI component) so wave-3 plans 09-04 / 09-05 stay parallel-safe
- [Phase 09-kana-trainer]: Plan 09-01: KANA_CHART hardcoded with Modified Hepburn (no wanakana dep) — single source of truth for hiragana/katakana/romaji
- [Phase 09-kana-trainer]: Plan 09-01: char count locked at 104 (plan stated 105 but row breakdown sums to 104 — n-row was double-counted in the plan)
- [Phase 09-kana-trainer]: Plan 09-01: ROW_UNLOCK_MASTERY_PCT (0.8) and ROW_UNLOCK_MIN_STARS (5) tuning constants exported from chart.ts — re-tuning is a 2-line edit

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
Stopped at: Completed Phase 09 Plan 01 — kana reference data module (types.ts, chart.ts, chart.test.ts). KANA_CHART has 104 entries (46 base + 20 dakuten + 5 handakuten + 33 yoon); 12 invariant tests passing. Plan 11 Plan 05 (/review queue) remains deferred.
Resume file: .planning/phases/09-kana-trainer/09-02-PLAN.md
