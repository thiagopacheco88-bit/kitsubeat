# Roadmap: KitsuBeat

## Overview

KitsuBeat is built in six phases that follow strict dependency order: content must exist before the player can render it, the player must prove its learning value before auth adds friction, auth must gate access before payments can charge for it, and exercises layer on top of a proven player. The pipeline is: pre-generate all 200 lessons offline → build the synced player → add accounts and catalog → add AI search and billing → add exercises and gamification → add Anki export. Every phase delivers a complete, independently verifiable capability before the next begins.

v2.0 adds 5 phases (7-11) that transform KitsuBeat from a passive listening tool into an active learning platform: a normalized vocabulary identity layer enables all progress tracking; the exercise engine delivers the core learning loop; a standalone kana trainer runs in parallel; advanced exercises unlock the full 3-star mastery system; cross-song vocabulary tracking becomes the platform differentiator.

v3.0 takes the feature-complete product to launch: a curated beginner→advanced learning path with XP/streaks/levels (gamification replaces the old Phase 12 anime-scene slot); performance, UX polish, analytics/Sentry, security review, and a DIY legal deep-dive (no lawyer for v1); then free beta under a UK sole-trader with tracked GTM channels. v4.0 restores anime scenes as unlock rewards and expands content/community once the product has validated.

## Milestones

- 🚧 **v1.0 Core Learning Experience** - Phases 1-6 (in progress)
- 🚧 **v2.0 Exercise & Learning System** - Phases 7-11 (Phase 12 moved to v4.0)
- 📋 **v3.0 Launch Readiness** - Phases 12-20 (planned — gamified learning path, legal/security hardening, free beta launch under UK sole trader)
- 📋 **v4.0 Content Expansion** - Phase 21+ (post-launch — anime scenes, cultural vocabulary, community, monetization if not already live)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

### v1.0 Core Learning Experience

- [ ] **Phase 1: Content Pipeline** - Pre-generate all lesson content for 200 anime songs offline via Claude API and validate 100% coverage with the QA agent
- [ ] **Phase 2: Player Experience** - Build the synced YouTube player with furigana, grammar color-coding, vocabulary breakdown, and verse-by-verse explanations
- [ ] **Phase 3: Auth, Catalog, and Freemium Gate** - Add user accounts, song catalog browse, progress tracking, and database-layer freemium gating
- [ ] **Phase 4: AI Search and Payments** - Add natural-language song search via semantic embeddings and Lemon Squeezy subscription checkout
- [ ] **Phase 5: Exercises and Gamification** - Add fill-in-the-blank and translation exercises with XP, levels, and JLPT progression gating
- [ ] **Phase 6: Export and Polish** - Add Anki CSV vocabulary export and close any remaining UX gaps

### v2.0 Exercise & Learning System

- [x] **Phase 7: Data Foundation** - Normalize vocabulary identity with UUIDs and audit grammar conjugation paths to unblock all progress tracking (completed 2013-04-15)
- [ ] **Phase 8: Exercise Engine & Star Mastery** - Build the full per-song exercise loop (4 core exercise types) with SRS progress persistence and 2-star mastery
- [ ] **Phase 9: Kana Trainer** - Deliver a standalone hiragana/katakana trainer with row-by-row unlock and SRS-lite 10-star mastery
- [x] **Phase 10: Advanced Exercises & Full Mastery** - Add grammar conjugation, listening drill, and sentence order exercises to complete the 3-star system (completed 2026-04-18)
- [x] **Phase 11: Cross-Song Vocabulary** - Surface vocabulary mastery across all songs and deliver the premium cross-song review dashboard (completed 2026-04-18)
- [ ] **Phase 11.1: Add-Song Pipeline** - INSERTED 2026-04-19 - Durable CLI pipeline for adding new songs end-to-end (discovery → lyrics/timing → lesson → DB) with validation gates surfaced by the TV backfill. Decimal-shifted from "Phase 12" to free the slot for v3.0 gamification. Draft CONTEXT at [.planning/phases/11.1-add-song-pipeline/11.1-CONTEXT.md](phases/11.1-add-song-pipeline/11.1-CONTEXT.md)
- ➡️ **Phase 12: Anime Scenes & Cultural Vocabulary** - **MOVED** to v4.0 as Phase 21 (deferred until after v3.0 launch)

### v3.0 Launch Readiness

- [ ] **Phase 12: Learning Path & Gamification** - Replace "any song, any time" with a curated beginner→advanced path; XP, streaks, levels, unlock gates; scene-reward slots scaffolded for v4.0
- [ ] **Phase 13: Performance & Caching** - FMP <2s mobile 4G; bundle budgets in CI; lesson cache on repeat visits; deferred YouTube iframe
- [ ] **Phase 14: UX Polish** - Design system tokenized; mobile parity; purposeful microinteractions; empty/loading/error states across every surface
- [ ] **Phase 15: Analytics & Error Tracking** - PostHog/Plausible on the funnel (signup → first star → day-7 return); Sentry client+server with source maps; consent-gated
- [ ] **Phase 16: Security Review & Incident Response** - Supabase RLS audit; server-action authz audit; secrets scan; rate limits on writes; written IR runbook
- [ ] **Phase 17: Legal & Copyright Deep-Dive (Research)** - DIY analysis of copyright (YouTube/LRCLIB/WhisperX), UK-GDPR/LGPD/GDPR/CCPA, UK consumer law, VAT MOSS, EU AI Act, EAA — produces requirements checklist
- [ ] **Phase 18: Legal & Compliance Implementation** - T&Cs, Privacy, cookie consent, data export, DMCA/takedown, refund policy, WCAG 2.1 AA baseline, age gating, support channel
- [ ] **Phase 19: Free Beta Launch & GTM** - Landing page, 3 acquisition channels with UTMs, 50+ signups / 20+ complete-session / 20%+ day-7 return; entity-formation decision point
- [ ] **Phase 20: Code Quality & Test Coverage Pass** - Integration tests on critical paths, strict types across shared modules, ADRs, resolve deferred-items backlog

### v4.0 Content Expansion

- [ ] **Phase 21: Anime Scenes & Cultural Vocabulary** - Extend the content universe with iconic anime scenes and anime-anchored cultural vocabulary drills, distributed as Phase 12 unlock rewards (was v2.0 Phase 12)
- [ ] **Phase 23: Native App Decision Point** - Retention-gated go/no-go on a native app (iOS/Android via React Native or PWA-first); decision only, not build. (Phase 22 reserved for Monetization per Phase 19 exit criteria.)

## Phase Details

### Phase 1: Content Pipeline
**Goal**: All 200 anime songs have complete, QA-verified lesson content in the database ready for the player to consume
**Depends on**: Nothing (first phase)
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06, CONT-07, CONT-08, CONT-09, CONT-10, CONT-11
**Success Criteria** (what must be TRUE):
  1. A CLI seeding script reads a 200-song manifest and produces structured lesson JSON (lyrics, furigana tokens, grammar tags, translations, vocabulary) for every song via Claude API
  2. All 200 songs have verse timing data (start/end timestamps) stored in the database scoped to a specific YouTube video ID
  3. Every song has translations in at least English, Portuguese, and Spanish
  4. The Verse Coverage Agent runs against the full catalog and reports zero gaps (missing lyrics, furigana, romaji, translation, explanation, vocabulary, or grammar tags)
  5. 10-20 seeded songs are available in the development database for player development in Phase 2
**Plans:** 8 plans (6 code, 2 gap closure)
Plans:
- [x] 01-01-PLAN.md -- Schema, types, and 200-song manifest builder
- [x] 01-02-PLAN.md -- Lyrics sourcing (LRCLIB/Genius) and kuroshiro tokenization
- [x] 01-03-PLAN.md -- WhisperX timing extraction pipeline
- [x] 01-04-PLAN.md -- Claude Batch API content generation and DB insertion
- [x] 01-05-PLAN.md -- Web-based timing editor admin tool
- [x] 01-06-PLAN.md -- Verse Coverage Agent (QA) and dev seed
- [~] 01-07-PLAN.md -- Pipeline runner and data pipeline execution (steps 1-4) [Task 1 done; Task 2 awaiting env setup]
- [ ] 01-08-PLAN.md -- Content generation, DB population, and full validation

### Phase 2: Player Experience
**Goal**: Users can watch any seeded anime song and understand every word through furigana, grammar color-coding, vocabulary breakdown, and verse-by-verse explanations synced to playback
**Depends on**: Phase 1
**Requirements**: PLAY-01, PLAY-02, PLAY-03, PLAY-04, PLAY-05, PLAY-06, PLAY-07, PLAY-08, PLAY-09, PLAY-10, PLAY-11
**Success Criteria** (what must be TRUE):
  1. User opens a song page and sees the YouTube player (left on desktop, top on mobile) with the lesson panel beside/below it — never overlaid on the video
  2. As the song plays, the current verse is highlighted and scrolled into view within ~250ms of the actual playback position
  3. User can toggle furigana (ruby text over kanji), romaji, and translation language from within the player without reloading
  4. User can click any word in the lyrics to see a dictionary popup with reading, meaning, part of speech, and example usage
  5. Vocabulary section below the lyrics displays all song words split by grammatical category with grammar color-coding matching the lyric display
**Plans**: TBD

### Phase 3: Auth, Catalog, and Freemium Gate
**Goal**: Users can create accounts, browse the full 200-song catalog with filters, and access one complete lesson without signing in — while premium content is gated at the database layer
**Depends on**: Phase 2
**Requirements**: USER-01, USER-02, USER-03, USER-04, USER-05, USER-06, DISC-01, DISC-04
**Success Criteria** (what must be TRUE):
  1. User can open one complete song lesson without creating an account and see the full player experience
  2. User can sign up and log in with email/password; session persists across browser refresh
  3. User can browse all 200 songs on a catalog page filtered by anime, artist, JLPT level, and difficulty; each card shows JLPT difficulty tags
  4. Free-tier user attempting to open a premium song sees an upgrade prompt; premium song lesson data is null at the database layer, not hidden in the UI
  5. Logged-in user can see their learning profile showing songs started, verses completed, exercises done, and vocabulary/grammar rules encountered with links back to source songs
**Plans**: TBD

### Phase 4: AI Search and Payments
**Goal**: Users can find songs through natural language queries and upgrade to paid access with a subscription or per-song purchase
**Depends on**: Phase 3
**Requirements**: DISC-02, DISC-03, MONE-01, MONE-02, MONE-03, MONE-04
**Success Criteria** (what must be TRUE):
  1. User types a natural language query (e.g., "beginner Naruto songs" or "melancholy Ghibli opening") into the AI chatbox and receives ranked song cards showing thumbnail, title, artist, anime, and JLPT level
  2. Logged-in user can subscribe for full library access (monthly or annual) or purchase individual songs permanently via Lemon Squeezy checkout
  3. After successful payment, the user's plan is updated immediately (via webhook) and previously gated premium lessons become accessible without logging out
  4. Free-tier users encounter upgrade prompts at natural value moments (hitting the song limit, using the AI chatbox) without a hard paywall on the first visit
**Plans**: TBD

### Phase 5: Exercises and Gamification
**Goal**: Users can test their understanding of any song through fill-in-the-blank and translation exercises, and accumulate XP and levels that unlock harder songs
**Depends on**: Phase 3
**Requirements**: EXER-01, EXER-02, EXER-03, EXER-04, GAME-01, GAME-02, GAME-03
**Success Criteria** (what must be TRUE):
  1. User can attempt fill-in-the-blank exercises for any song where missing words match the song's JLPT difficulty level
  2. User can attempt Japanese-to-target-language and target-language-to-Japanese translation exercises per verse
  3. Completing lessons, exercises, and song milestones awards XP visible on the user's profile with a current level
  4. Advanced-difficulty songs are locked until the user's level meets the JLPT tier requirement, with a clear indication of what is needed to unlock
**Plans**: TBD

### Phase 6: Export and Polish
**Goal**: Users can export any song's vocabulary to Anki for external review, and all known UX gaps from prior phases are closed
**Depends on**: Phase 5
**Requirements**: EXPO-01, EXPO-02
**Success Criteria** (what must be TRUE):
  1. User can export a song's full vocabulary as an Anki-compatible CSV file containing word, reading, meaning, part of speech, and source song name
  2. The exported CSV imports cleanly into Anki Desktop without formatting errors or missing fields
**Plans**: TBD

---

## v2.0 Exercise & Learning System

**Milestone Goal:** Transform KitsuBeat from a passive listening tool into an active learning platform. Users can drill vocabulary and grammar from any song, train hiragana and katakana to mastery, see how words they have learned appear across multiple songs, study iconic anime scenes, and explore vocabulary anchored to anime cultural references — all gated by a clean freemium architecture enforced at the data layer.

**Depends on:** v1.0 Phases 1-4 complete (content pipeline, player, auth/catalog, payments)

### Phase 7: Data Foundation
**Goal**: A normalized vocabulary identity layer exists and grammar conjugation data is machine-parseable, enabling all downstream progress tracking and exercise generation to work from stable UUIDs rather than fragile text keys
**Depends on**: Phase 6 (v1.0 complete — auth, schema, player all exist)
**Requirements**: DATA-01, DATA-02
**Success Criteria** (what must be TRUE):
  1. Every distinct (surface, reading) vocabulary pair across all song lessons has a stable UUID row in the vocabulary_items table — content corrections do not orphan existing progress rows
  2. The vocab_global materialized view aggregates vocabulary across all song_versions.lesson JSONB and can be refreshed without downtime
  3. Grammar conjugation paths for all songs with grammar data have been audited; structured question/answer pairs can be derived programmatically for at least 80% of conjugation entries
  4. A Drizzle migration creates user_vocab_mastery, user_exercise_log, and subscriptions tables with FSRS scalar columns indexed for due-date queries
**Plans:** 2/2 plans complete
Plans:
- [ ] 07-01-PLAN.md — Schema additions (vocabulary_items, user_vocab_mastery, user_exercise_log, subscriptions, vocab_global mat view), FSRS presets, lesson type updates, and migration generation
- [ ] 07-02-PLAN.md — Conjugation path parser and idempotent vocabulary backfill script (extract, deduplicate, patch JSONB, audit conjugations, refresh mat view)

### Phase 8: Exercise Engine & Star Mastery
**Goal**: Users can complete four core exercise types for any song, receive immediate explanatory feedback, resume sessions across browser refreshes, and earn up to 2 stars per song as mastery is demonstrated
**Depends on**: Phase 7
**Requirements**: EXER-01, EXER-02, EXER-03, EXER-04, EXER-08, EXER-09, EXER-10, STAR-01, STAR-02, STAR-03, STAR-05, FREE-01, FREE-02, FREE-06
**Success Criteria** (what must be TRUE):
  1. User can open any song's exercise page and complete Vocab→Meaning, Meaning→Vocab, Reading Match, and Fill-the-Lyric exercises in sequence — all answer options drawn from same-song vocabulary or same-JLPT-level words, never random
  2. After each answer the user sees immediate feedback explaining why the correct answer is correct, regardless of whether they chose right or wrong
  3. User can close the browser mid-session and return to find their progress exactly where they left it
  4. Song card and song page display a per-song completion percentage that updates after each session
  5. User earns Star 1 when vocab recognition exercises (Ex 1+2+3) pass at >=80%, and Star 2 when Fill-the-Lyric (Ex 4) passes at >=80% — stars are visible on the song card
  6. Premium gate abstraction is in place: feature flags can toggle any exercise type free/premium without code changes; enforcement happens at the data access layer, not the UI
**Plans:** 3/4 plans executed
Plans:
- [ ] 08-01-PLAN.md -- DB schema (user_song_progress), dependencies (zustand, canvas-confetti), feature flags, premium gate abstraction
- [ ] 08-02-PLAN.md -- Exercise question generator (TDD: buildQuestions, pickDistractors, Fisher-Yates shuffle)
- [ ] 08-03-PLAN.md -- Zustand session store, JLPT pool API, exercise UI (config screen, question card, feedback panel, Practice tab)
- [ ] 08-04-PLAN.md -- Session summary, star display with confetti, circular progress ring, SongCard/SongPage integration

### Phase 08.4: Learn phase + session pacing for new vocabulary — presentation step before first exercise, skip_learning user preset, new-card cap per session (INSERTED)

**Goal:** Insert a just-in-time learn card before the first exercise for any New or Relearning vocabulary word (with mnemonic + kanji_breakdown behind a single tap-to-reveal and tap-to-play Japanese TTS), expose a global `skip_learning` user preset (default ON — cards show), and enforce a per-session new-card cap (default 10) gated by a premium-only cap-raising ceiling (30) — all wired into the existing Phase 8 exercise engine with a new `/profile` settings surface.
**Depends on:** Phase 8, Phase 08.2 (FSRS state), Phase 08.3 (KanjiBreakdownSection + mnemonic column)
**Plans:** 5/5 plans complete

Plans:
- [x] 08.4-01-PLAN.md -- Users table migration (0005_user_prefs.sql) + vocab-tiers API states extension + Web Speech TTS helper
- [x] 08.4-02-PLAN.md -- LearnCard component (tap-to-dismiss + "Show more" reveal + speaker icon; no Zustand coupling)
- [x] 08.4-03-PLAN.md -- userPrefs server actions (getUserPrefs + updateUserPrefs + getEffectiveCap premium gate) + session store extensions (learnedVocabIds, introducedNewVocabIds, vocabStates)
- [x] 08.4-04-PLAN.md -- Wiring: ExerciseTab cap filter (parallel prefs+cap+JLPT fetch; filter new/relearning beyond cap pre-buildQuestions) + ExerciseSession JIT LearnCard insertion (skip_learning bypass; currentIndex never advances)
- [x] 08.4-05-PLAN.md -- /profile page (server component) + ProfileForm client component (skip_learning toggle + new_card_cap input; cap disabled for free users)

### Phase 08.3: Mnemonic and kanji breakdown for vocabulary feedback (INSERTED)

**Goal:** Extend `vocabulary_items` with `mnemonic` and `kanji_breakdown` jsonb columns, enrich all ~705 existing rows via inline LLM generation, and render both inside the FeedbackPanel "More" accordion with cross-question persistence. Future songs ship enriched by updating the shared generation prompt. Surgical enrichment only — existing lesson JSONB is untouched.
**Depends on:** Phase 7 (vocabulary_items UUID identity), Phase 8 (exercise engine UI)
**Plans:** 5/5 plans complete

Plans:
- [ ] 08.3-01-PLAN.md -- Schema migration (0004_vocab_enrichment.sql) + drizzle schema + lesson/generator type extensions
- [ ] 08.3-02-PLAN.md -- Enrichment script (scripts/seed/11-enrich-vocab.ts) + Zod validator; inline Messages API, per-row idempotent
- [ ] 08.3-03-PLAN.md -- Forward-generation prompt update in scripts/lib/lesson-prompt.ts + scripts/types/lesson.ts VocabEntrySchema
- [ ] 08.3-04-PLAN.md -- UI: page.tsx SSR join + exerciseSession accordion flag + FeedbackPanel inline accordion + KanjiBreakdownSection
- [ ] 08.3-05-PLAN.md -- QA gate (scripts/seed/12-qa-enrichment.ts) + Vitest unit tests for Zod shape and accordion state

### Phase 08.2: FSRS progressive disclosure (INSERTED)

**Goal:** Wire the dead `user_vocab_mastery` and `user_exercise_log` tables (Phase 7 schema) so each Phase 8 exercise answer persists per-vocab FSRS state, then derive a 3-tier display per word (kanji+furigana+romaji → kanji+furigana → kanji-only) driven by FSRS state — exercise flow only.
**Depends on:** Phase 8
**Plans:** 3/3 plans complete

Plans:
- [ ] 08.2-01-PLAN.md — FSRS core: ratingFor + scheduleReview + tierFor (TDD, pure)
- [ ] 08.2-02-PLAN.md — Server: recordVocabAnswer action + vocab-tiers / vocab-mastery API routes
- [ ] 08.2-03-PLAN.md — UI: TierText, MasteryDetailPopover, ExerciseTab/QuestionCard/FeedbackPanel wiring with leak-override + reveal-reading hatch

### Phase 08.1: End-to-End QA Suite (INSERTED)

**Goal:** Ship the cross-cutting QA test infrastructure (Playwright + Vitest + Node integration + seed QA) that verifies the v1.0 player experience and the v2.0 Phase 8 exercise engine end-to-end before Phase 9 extends the codebase further. Enforces a 15-minute speed budget and a zero-flake policy (retries: 0 everywhere).
**Depends on:** Phase 8
**Plans:** 8/8 plans complete

Plans:
- [x] 08.1-01-PLAN.md -- Test infra scaffolding (playwright + vitest configs, test-DB strategy, fixtures, terminal reporter, npm scripts)
- [x] 08.1-02-PLAN.md -- Vitest unit layer (generator extensions, checkExerciseAccess, deriveStars, distractor picker)
- [x] 08.1-03-PLAN.md -- Node integration layer (jlpt-pool API, saveSessionResults, progress queries, admin songs)
- [x] 08.1-04-PLAN.md -- Seed/content QA extensions (UUID integrity, furigana completeness, geo audit, TV-pack skip)
- [x] 08.1-05-PLAN.md -- Playwright E2E for player flows (load, lesson toggles, sync/seek with real YouTube, panels)
- [x] 08.1-06-PLAN.md -- Playwright E2E for exercise flows (full session, stars+confetti, resume mid-session, FSRS writes)
- [x] 08.1-07-PLAN.md -- Regression guards (cross-song leakage, premium gate bypass, geo fallback, stale lesson data)
- [x] 08.1-08-PLAN.md -- Suite hardening (15-min speed budget enforcement, quarantine convention, CI workflow, docs)

### Phase 9: Kana Trainer
**Goal**: Users can train hiragana and katakana recognition through a standalone drill interface with row-by-row unlocking, a 10-star per-character mastery system, and weighted random session selection — available free to all users
**Depends on**: Phase 7
**Requirements**: KANA-01, KANA-02, KANA-03, KANA-04, KANA-05, KANA-06, KANA-07, KANA-08, FREE-03
**Success Criteria** (what must be TRUE):
  1. User can navigate to /kana and drill hiragana recognition (see kana, pick correct romaji from 4 options) without being signed in
  2. User can switch between hiragana and katakana modes in the same trainer interface
  3. Each character tracks a 10-star mastery level: correct answers add 1 star, wrong answers subtract 2 (floor 0); characters at 0 stars show the answer pre-revealed and award 1 star for acknowledgment; characters at 10 stars appear at 1/5th normal frequency
  4. Kana rows unlock sequentially — user must reach the star threshold on the a-row before the ka-row appears; dakuten, handakuten, and combo rows unlock the same way
  5. Each session is exactly 20 questions with weighted random selection: lower-star characters appear more frequently than higher-star characters
**Plans:** 6 plans
Plans:
- [x] 09-01-PLAN.md — Kana reference data module (chart.ts + types + invariant tests)
- [x] 09-02-PLAN.md — Pure logic: weighted selection + mastery + row-unlock predicate (TDD)
- [x] 09-03-PLAN.md — kanaProgress Zustand store with persist + hydration + test hook
- [x] 09-04-PLAN.md — /kana landing grid + mode toggle + sign-up nudge banner
- [x] 09-05-PLAN.md — Drill session UI: KanaSession + KanaQuestionCard + KanaLearnCard + RowUnlockModal
- [ ] 09-06-PLAN.md — Post-session summary screen + manual end-to-end checkpoint

### Phase 10: Advanced Exercises & Full Mastery
**Goal**: Users can complete grammar conjugation, listening drill, and sentence order exercises, earning Star 3 mastery for a song when listening drills pass at >=80%, with bonus mastery recognition for conjugation and sentence order work
**Depends on**: Phase 8
**Requirements**: EXER-05, EXER-06, EXER-07, STAR-04, STAR-06, FREE-05
**Success Criteria** (what must be TRUE):
  1. User can complete Grammar Conjugation exercises for songs with audited conjugation data — given a base form and context, picking the correct conjugated form from 4 options
  2. User can complete Fill-the-Lyric Listening Drill exercises where the verse audio plays without lyrics shown and the user identifies the target word by ear
  3. User can complete Sentence Order exercises by tapping scrambled verse tokens into the correct sequence
  4. User earns Star 3 when Listening Drill (Ex 6) passes at >=80%; Sentence Order and Grammar Conjugation contribute to a bonus mastery badge visible on the song page but do not gate stars
  5. Listening drills are free for a user's first 10 songs; Grammar Conjugation + Sentence Order share a 3-song free quota (reshapes FREE-05); subsequent access is premium-gated and enforced at the data access layer
**Plans:** 7/7 plans complete
Plans:
- [x] 10-01-PLAN.md — Data layer foundation: migration (ex5/6/7 accuracy cols + user_exercise_song_counters table), ExerciseType union, deriveStars 0-3, deriveBonusBadge, song_quota gate in feature-flags, checkExerciseAccess(songVersionId), counters module
- [x] 10-02-PLAN.md — PlayerContext imperative API (seekTo/play/pause/isReady) wired from YouTubeEmbed; test-only __kbPlayer hook preserved
- [ ] 10-03-PLAN.md — Grammar Conjugation exercise: conjugation audit + pickConjugationOptions + makeQuestion branch + ConjugationCard + ExerciseSession dispatch
- [ ] 10-04-PLAN.md — Listening Drill exercise: makeQuestion branch + ListeningDrillCard wired to PlayerContext + YT watchdog fallback + session replay counter
- [ ] 10-05-PLAN.md — Sentence Order exercise: verse-token audit + makeQuestion branch + SentenceOrderCard tap-to-build + reveal-hatch hint + session store slices
- [ ] 10-06-PLAN.md — Premium gate wiring: ExerciseTab Advanced Drills mode + upsell modal + saveSessionResults ex5/6/7 persistence + counter increment on first answer + unfix Phase 08.1-07 test.fixme
- [ ] 10-07-PLAN.md — Mastery surface: StarDisplay 0-3 + Star 3 confetti reuse + SongMasteredBanner on SongCard + BonusBadgeIcon on SongCard + catalog query extension

### Phase 11: Cross-Song Vocabulary
**Goal**: Users can see how vocabulary they have mastered in one song carries across other songs, track their total unique Japanese words learned, and access a full vocabulary dashboard — with the cross-song SRS review queue as a premium differentiator
**Depends on**: Phase 08.2 (per-vocab FSRS mastery must be persisted before cross-song aggregation is possible)
**Requirements**: CROSS-01, CROSS-02, CROSS-03, CROSS-04, CROSS-05, FREE-04
**Success Criteria** (what must be TRUE):
  1. When a user views a song page they have not yet completed, they see a count of words they already know from other songs ("You know 8/12 words in this song")
  2. When a user views vocabulary details for any word, they see which other songs contain that word ("Seen in: Attack on Titan OP, Demon Slayer OP")
  3. User sees a global counter of unique Japanese words learned across all songs on their profile or dashboard
  4. Mastering a word in one song automatically reflects in all other songs sharing that vocabulary item — mastery is stored against the vocabulary_items UUID, not per-song
  5. Premium users can open a vocabulary dashboard listing all learned words with mastery level and source songs; the cross-song SRS review queue is premium-gated with free users seeing word counts but not the review queue
**Plans:** 6/6 plans complete
Plans:
- [x] 11-01-PLAN.md — Schema migration (review_new_today cols) + five read queries (known-count, global counter, seen-in-songs, dashboard, due-queue) + REVIEW_NEW_DAILY_CAP constant
- [x] 11-02-PLAN.md — Song-page "You know X/Y words" pill: SSR in page.tsx, client refresh component, /api/review/known-count route
- [x] 11-03-PLAN.md — Seen-in-songs on MasteryDetailPopover + global learned counter in header nav and profile page
- [x] 11-04-PLAN.md — /vocabulary dashboard: tier-grouped list, searchParams filters, SeenInExpander, free-tier 20-row preview
- [x] 11-05-PLAN.md — /review route: queue builder (TDD), server actions (startReviewSession/recordReviewAnswer/consumeNewCardBudget), review Zustand store, ReviewLanding + ReviewSession + UpsellModal

---

## v3.0 Launch Readiness

**Milestone Goal:** Take the working product from "feature complete" to "launch ready" — harden security, add gamification that makes the learning loop sticky, polish UX to match the product's depth, instrument observability, clear legal/copyright/compliance blockers from the UK (sole-trader), and run a free beta that produces real validation signal before any monetization work. Target exit: free beta live under UK Sole Trader; entity upgrade (UK Ltd) and payments deferred until validation signal justifies them.

**Depends on:** v2.0 Phases 7-11 complete.

**Founder context (drives several phase choices):**
- Founder lives in London — UK tax resident, so entity lives in UK regardless of target market
- UK Sole Trader for free beta (£0, HMRC self-assessment); migrate to UK Ltd when revenue approaches ~£30-50k/yr
- Not hiring a lawyer for v1 — Phase 17 does DIY analysis with explicit "requires lawyer later" flags
- LGPD still in scope (Brazilian audience via creator background and Portuguese translation support)

### Phase 12: Learning Path & Gamification
**Goal**: Replace "any song, any time" with a curated beginner→advanced path; users see XP, streaks, levels, and diegetic celebrations that make every session feel like measurable forward motion. Scaffolds reward slots that v4.0 Phase 21 fills with anime scenes.
**Depends on**: Phase 11
**Requirements**: TBD
**Success Criteria** (what must be TRUE):
  1. A new learner picks one of 3 starter songs and lands on a curated stepped path that groups songs by the existing `difficulty_tier` ENUM (basic → intermediate → advanced); the recommended next song is highlighted with a path-order XP bonus, but no song is locked by level (existing freemium quotas remain the only access barrier)
  2. Every session ends with XP gained, current streak, level progress, and (when applicable) a preview of the next reward slot to unlock
  3. Streak tracking persists with timezone-aware day rollovers (device timezone, auto-detected) and one auto-applied grace day per week; broken streaks reset silently while the user's all-time best is preserved
  4. Level-ups trigger a full-screen celebratory moment with sound + haptic (configurable) and unlock cosmetic content (avatar borders, profile color themes, badges); reward-slot infrastructure for v4.0 Phase 21 cultural content is scaffolded but invisible until populated
  5. A JLPT mastery + gap-analysis view extends the existing `/vocabulary` dashboard from day 1, surfacing per-tier vocabulary gaps (e.g., "87/180 N5 words mastered")
  6. Song tier (`difficulty_tier`) and vocabulary tier (JLPT `N5–N1`) remain parallel taxonomies — no re-tagging of either; songs use B/I/A on the path, vocab uses JLPT in the gap dashboard
**Decisions captured**: [.planning/phases/12-learning-path-and-gamification/12-CONTEXT.md](phases/12-learning-path-and-gamification/12-CONTEXT.md)
**Research captured**: [.planning/phases/12-learning-path-and-gamification/12-RESEARCH.md](phases/12-learning-path-and-gamification/12-RESEARCH.md)
**Plans:** 3/6 plans executed
Plans:
- [ ] 12-01-PLAN.md — Schema + migration (0008_gamification.sql) + reward-slot seed + starter-pick verification script
- [ ] 12-02-PLAN.md — TDD: XP calculator + level curve + streak state machine + reward-slot filter + analytics stub (pure functions)
- [ ] 12-03-PLAN.md — RewardSlotContent discriminated-union types + cosmetic catalog + starter-song decision checkpoint
- [ ] 12-04-PLAN.md — Extend saveSessionResults (single write boundary) + setStarterSong + SessionSummary XP/streak/level UI + integration tests
- [ ] 12-05-PLAN.md — JLPT gap dashboard on /vocabulary + /profile HUD + sound/haptic settings toggles
- [ ] 12-06-PLAN.md — /path route + StarterPick + LevelUpTakeover + CosmeticsProvider + SFX + E2E spec + human-verify checkpoint

### Phase 13: Performance & Caching
**Goal**: First meaningful paint under 2s on mid-range mobile over 4G; subsequent song loads feel instant; no perceptible lag during exercise interactions.
**Depends on**: Phase 12
**Requirements**: TBD
**Success Criteria**:
  1. Lighthouse mobile performance >=85 on home, catalog, and song pages
  2. Song page LCP <2.5s, TTI <3.5s on throttled 4G / Moto G4 profile
  3. Already-visited song lessons serve from cache on repeat visit (no cold DB hit)
  4. YouTube iframe deferred until in view; lesson panel renders independently of video load
  5. Bundle size budget enforced in CI (song page JS <=200KB gzipped)
**Plans**: TBD

### Phase 14: UX Polish
**Goal**: Visual identity is distinctive and consistent; mobile experience is first-class; microinteractions make the product feel crafted.
**Depends on**: Phase 12
**Requirements**: TBD
**Success Criteria**:
  1. Design system documented and tokenized: colors, type, spacing, radii, shadows, motion — applied consistently
  2. Mobile layout reviewed end-to-end (home, catalog, song, exercise, kana, vocabulary, review, profile) — no horizontal scroll, tap targets >=44px
  3. Key transitions have purposeful motion (verse highlighting, star unlocks, correct/incorrect feedback) with prefers-reduced-motion honored
  4. Empty, loading, and error states designed for every major surface
  5. Dark mode coherent across all custom components (not just CSS var flipping)
**Plans**: TBD

### Phase 15: Analytics & Error Tracking
**Goal**: Every meaningful user event captured in product analytics; every exception surfaces in Sentry with debugging context; funnel metrics are queryable before beta opens.
**Depends on**: Phase 14
**Requirements**: TBD
**Success Criteria**:
  1. PostHog or Plausible tracks: signup, first song opened, first exercise completed, first star, streak start/break, session duration
  2. Sentry captures client + server exceptions with source maps; release tagging wired via CI
  3. Core funnel dashboard exists: signup → first session → first star → day-7 return; queryable by cohort
  4. All tracking respects Phase 18 cookie consent (no events fire before consent on first visit)
  5. Data minimization: no PII in event payloads beyond user ID; IPs truncated at ingest
**Plans**: TBD

### Phase 16: Security Review & Incident Response
**Goal**: Every authenticated endpoint is correctly authorized at the data layer; secrets are audited; rate limits exist on writes; a written incident response plan exists before user data arrives.
**Depends on**: Phase 15
**Requirements**: TBD
**Success Criteria**:
  1. Supabase RLS policies reviewed for every table — deny-by-default; policies match each access pattern
  2. Server action / API surface audited: every route confirms authenticated user matches target user_id before read/write
  3. Secrets scan passes; no secrets in client bundle or git history; .env conventions documented
  4. Rate limits on signup, login, exercise answer submission, and any LLM-proxy endpoint
  5. IR runbook checked in: on-call (you), severity taxonomy, 72h UK-GDPR breach notification timeline, first-response checklist
**Plans**: TBD

### Phase 17: Legal & Copyright Deep-Dive (Research)
**Goal**: Produce a standalone analysis covering copyright, UK-GDPR/LGPD/GDPR/CCPA, UK consumer law, VAT MOSS, EU AI Act, and EAA as they apply to kitsubeat — enough to implement Phase 18 without a lawyer for v1, with explicit flags on items needing legal consultation later.
**Depends on**: Phase 16
**Requirements**: TBD
**Success Criteria**:
  1. Copyright analysis covers: YouTube embed terms, lyrics licensing (LRCLIB history, WhisperX derivative status), synced-lyrics/karaoke precedent (Musixmatch/Genius), anime-clip liability for v4.0 scope
  2. Jurisdiction map: UK-GDPR, GDPR, LGPD, CCPA — lawful basis per data field, data subject rights, SAR handling process
  3. Consumer law: UK Consumer Contracts Regs (14-day cancel + digital-content waiver), EU equivalents, refund policy template
  4. Tax: VAT MOSS rules, place-of-supply for digital services, Stripe Tax configuration plan
  5. Emerging regulation: EU AI Act disclosure for WhisperX content; EAA / WCAG 2.1 AA accessibility baseline
  6. Output: requirements checklist Phase 18 implements against, with explicit "requires lawyer" flags on out-of-scope items
**Context captured**: [.planning/phases/17-legal-copyright-deep-dive-research/17-CONTEXT.md](phases/17-legal-copyright-deep-dive-research/17-CONTEXT.md)
**Plans:** 6 plans
Plans:
- [ ] 17-01-PLAN.md — Copyright section: YouTube ToS clause-by-clause, LRCLIB/Musixmatch v. Genius deep-dive, WhisperX derivative analysis, anime-clip v4.0 lawyer-gate
- [ ] 17-02-PLAN.md — Privacy & data protection: four-jurisdiction parallel treatment (UK-GDPR, EU-GDPR, LGPD, CCPA), data-field inventory, DSAR/breach/cookies
- [ ] 17-03-PLAN.md — Consumer law + tax: UK CCRs, EU CRD, BR CDC, CA ARL, refund template (activate-at-monetization), UK VAT + EU OSS/IOSS (MOSS-rename flag), Stripe Tax config
- [ ] 17-04-PLAN.md — EU AI Act Art. 50 for WhisperX AND Claude-generated lesson content + full WCAG 2.1 AA checklist + EAA applicability lawyer-flag
- [ ] 17-05-PLAN.md — Age gating: full UK ICO AADC 15-standards analysis + 13+ signup gate + minor-account privacy defaults + LGPD/CCPA minors
- [ ] 17-06-PLAN.md — Consolidate into single 17-ANALYSIS.md + Pre-Monetization Legal Review lawyer index + Phase 18 Requirements Checklist (human-verify)

### Phase 18: Legal & Compliance Implementation
**Goal**: Every item identified in Phase 17 is implemented — T&Cs, Privacy, cookie consent, data export, DMCA/takedown, refund policy, accessibility baseline, age gating, support channel all live.
**Depends on**: Phase 17
**Requirements**: TBD
**Success Criteria**:
  1. T&Cs and Privacy Policy published, versioned, and accepted at signup; changes require re-acceptance
  2. PECR-compliant cookie consent banner blocks non-essential scripts until user decides; revocable
  3. LGPD/UK-GDPR data export endpoint: authenticated user can request a JSON/CSV dump of their data within regulated windows
  4. DMCA/takedown email published; intake process documented; content-removal workflow exists
  5. Refund policy explicit on checkout; UK 14-day cancel wording present for UK/EU buyers
  6. WCAG 2.1 AA audit passes for catalog, song, exercise, kana, review surfaces; full keyboard nav; ARIA on custom components
  7. Age gating at signup aligned with UK ICO Age Appropriate Design Code — under-18s blocked or restricted
  8. Support channel: support@ email published with documented response-time commitment (e.g., 48h business days)
**Plans**: TBD

### Phase 19: Free Beta Launch & GTM
**Goal**: Product opens to a limited external audience under the UK sole-trader name; three acquisition channels tested with tracked UTMs; validation signal from behavior, not self-report.
**Depends on**: Phase 18
**Requirements**: TBD
**Success Criteria**:
  1. Marketing landing page describes the product in one sentence, shows a 30-second demo, has a single CTA (join beta)
  2. Three acquisition channels with trackable UTMs — e.g., r/LearnJapanese, a Japanese-learning Discord/forum, personal social; each channel's signup→first-session rate is measurable
  3. 50+ signups within first 4 weeks; 20+ complete at least one full exercise session; day-7 return >20%
  4. Every beta user has an in-product feedback channel plus email; feedback is centralized
  5. Entity-formation decision point: if MRR projection crosses the UK Ltd threshold by week 4, v4.0 Phase 22 (Monetization) unlocks; otherwise continue free beta
**Plans**: TBD

### Phase 20: Code Quality & Test Coverage Pass
**Goal**: Now that the product shape has stabilized under real usage, pay down tech debt — consolidate duplicate patterns, tighten types, improve critical-path test coverage, document architectural decisions.
**Depends on**: Phase 19 (real-usage patterns must be visible before hardening tests)
**Requirements**: TBD
**Success Criteria**:
  1. Critical paths (signup, exercise session save, star derivation, FSRS update, payment webhook if live) have integration tests in CI
  2. Type-check is strict across shared modules — no `any`, explicit return types on exported functions
  3. ADR (Architecture Decision Record) set checked in: why Supabase, FSRS, App Router, Drizzle, UK sole-trader, no-lawyer-for-v1
  4. Deferred-items backlog (08.1 deferred-items.md etc.) resolved or explicitly closed with rationale
**Plans**: TBD

---

## v4.0 Content Expansion

**Milestone Goal:** With an active user base, expand the content universe — anime scenes become real rewards for Phase 12's unlock slots, cultural vocabulary ships, community features surface user progress. Monetization (Stripe + UK Ltd) lands here if it wasn't triggered at Phase 19.

**Depends on:** v3.0 complete with validated product-market signal.

### Phase 21: Anime Scenes & Cultural Vocabulary
**Goal**: Users can study iconic anime scenes with the same exercise and vocabulary mechanics as songs, and access standalone anime cultural vocabulary drills where anime references anchor Japanese word learning — with scene vocabulary contributing to cross-song tracking and scenes distributed as Phase 12 unlock rewards.
**Depends on**: Phase 20, Phase 12 (reward-slot scaffolding)
**Requirements**: SCENE-01, SCENE-02, SCENE-03, SCENE-04, SCENE-05, CULT-01, CULT-02, CULT-03, CULT-04, DATA-03
**Success Criteria** (what must be TRUE):
  1. User can browse anime scenes (Pain's speech, AoT pre-battle, One Piece narrator intros, etc.) alongside songs in the catalog, identified by a "Scene" content type tag
  2. A scene page shows an embedded YouTube clip with synced text display, tokenized vocabulary, grammar breakdown, and translations — identical structure to a song lesson
  3. All 7 exercise types work on scene content: user can earn stars from a scene the same way they earn them from a song
  4. Vocabulary mastered in anime scenes appears in the cross-song vocabulary dashboard and contributes to the global unique-words counter
  5. User can open a standalone "Anime Vocabulary" drill mode organized by anime series/theme and drill cultural vocabulary using the same multiple-choice + star mastery mechanics
  6. When a vocabulary word has a known anime cultural reference, a contextual hint shows inline (e.g., "water — think Suiton in Naruto, Suicune in Pokemon")
  7. Scenes are distributed as Phase 12 unlock rewards rather than dumped into the catalog wholesale
**Plans**: TBD (was v2.0 Phase 12)

### Phase 23: Native App Decision Point
**Goal**: Make an evidence-based decision on whether to ship a native iOS/Android app, stay PWA-only, or defer indefinitely. This phase produces a decision doc, not an app — actual build work, if approved, would be a separate future milestone.
**Depends on**: Phase 19 (needs real beta retention data) + at least 3 months of post-launch usage
**Requirements**: TBD
**Gate criteria (proceed to native only if ALL true)**:
  1. ≥500 monthly active users with ≥20% day-30 return (proves the web product has retention worth porting)
  2. Quantified user demand: ≥10% of active users request a native app unprompted in feedback, OR measurable drop-off attributable to web-only friction (push notifications, offline study, App Store discoverability)
  3. PWA install + web-push have been shipped and measured first — native is only considered if PWA demonstrably under-delivers
  4. Runway / capacity exists for 2-3 months of focused app work plus ongoing dual-platform maintenance (or a clear plan to fund it)
**Success Criteria** (what must be TRUE to close this phase):
  1. A decision document checked in under `.planning/decisions/native-app.md` with one of: GO (scope + tech choice: React Native vs Expo vs native), NO-GO (stay PWA), or DEFER (revisit at next milestone with specific trigger)
  2. If GO: target platforms, MVP scope (read-only vs full parity), store-fee impact on monetization model (15-30% Apple/Google cut), and review-process risk are all documented
  3. If NO-GO or DEFER: the specific retention/demand signals that would flip the decision are written down so this isn't re-litigated on vibes
**Plans**: TBD (placeholder — only planned if gate criteria above are met)
