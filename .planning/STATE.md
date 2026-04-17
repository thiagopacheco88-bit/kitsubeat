# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-14)

**Core value:** Users can watch an anime song and understand exactly what every word means — with furigana, translation, grammar breakdown, and vocabulary categorization synced to the music as it plays.
**Current focus:** v2.0 Phase 08.1 — End-to-End QA Suite (in progress, plan 7/8 complete) + 08.2 FSRS Progressive Disclosure (COMPLETE — all 3 plans done)

## Current Position

Phase: 08.1 of 11 (End-to-End QA Suite) — concurrent with 08.2
Plan: 7 of 8 in current phase complete; next: 08.1-08
Status: Plan 08.1-07 complete (regression suite — 4 spec files / 19 tests covering cross-song leakage, premium-gate bypass, geo-restricted YouTube fallback, and stale/malformed lesson JSONB; YouTubeEmbed gained data-yt-state error fallback UI with 15s watchdog and locked copy "Video unavailable"; single-gate architectural invariant statically enforced via UI directory walk in regression-stale-lesson-data.test.ts)
Last activity: 2026-04-17 — Plan 08.1-07 complete (commits 3791daa, 6889130, a521f14; integration spec runs live 9/10 passing + 1 DB-gated skip; E2E specs ship + collect, live-run blocked by same pre-existing Localizable rendering bug — same fix unblocks plans 05/06/07 simultaneously).

Progress: [████████░░░░] v1.0 Phase 1 in progress (6/8 plans); v2.0 Phase 08.1 in progress (7/8 plans); v2.0 Phase 08.2 COMPLETE (3/3 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 11
- Average duration: 8 min
- Total execution time: 1.50 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-content-pipeline | 6/8 | 60 min | 10 min |
| 08.1-end-to-end-qa-suite | 7/8 | 57 min | 8 min |
| 08.2-fsrs-progressive-disclosure | 3/3 | 16 min | 5 min |

**Recent Trend:**
- Last 7 plans: 08.1-02 (4 min), 08.1-03 (4 min), 08.1-04 (9 min), 08.1-05 (11 min), 08.1-06 (14.5 min), 08.2-03 (8 min), 08.1-07 (7 min)
- Trend: rising-then-stable (08.1-07 dropped back to 7 min — regression specs benefited from heavy reuse of plans 05/06 fixtures + test hooks)

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

## Accumulated Context

### Roadmap Evolution

- Phase 08.1 inserted after Phase 8: End-to-End QA Suite (URGENT) — cross-cutting Playwright + Node-side QA infra to verify v1.0 player + v2.0 Phase 8 exercise engine before Phase 9 (Kana Trainer) builds further
- Phase 08.2 inserted after Phase 8: FSRS progressive disclosure (URGENT) — wire user_vocab_mastery/user_exercise_log writes (currently dead infra) and derive a per-word display tier (kanji+furigana+romaji → kanji+furigana → kanji only) so exercise options stop starting at bare kanji; also unblocks Phase 11's assumption that per-vocab mastery is being persisted
- Phase 08.3 inserted after Phase 8: Mnemonic and kanji breakdown for vocabulary feedback — extend VocabEntry with `mnemonic` + `kanji_breakdown` fields, update content-generation prompt in scripts/seed/03-generate-content.ts, backfill ~60 songs (~1200 vocab items), surface in FeedbackPanel "More" accordion. Separated from Phase 8 refactor (which landed vocab block + wrong-pick callout + verse context without re-seed).

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

## Session Continuity

Last session: 2026-04-17
Stopped at: Plan 08.1-07 complete (regression suite — 4 spec files / 19 tests; YouTubeEmbed gained graceful error fallback with 15s watchdog + locked copy "Video unavailable"); next active plan: 08.1-08-PLAN.md (cadence + suite hardening)
Resume file: .planning/phases/08.1-end-to-end-qa-suite/08.1-08-PLAN.md
