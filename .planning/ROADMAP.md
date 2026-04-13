# Roadmap: KitsuBeat

## Overview

KitsuBeat is built in six phases that follow strict dependency order: content must exist before the player can render it, the player must prove its learning value before auth adds friction, auth must gate access before payments can charge for it, and exercises layer on top of a proven player. The pipeline is: pre-generate all 200 lessons offline → build the synced player → add accounts and catalog → add AI search and billing → add exercises and gamification → add Anki export. Every phase delivers a complete, independently verifiable capability before the next begins.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Content Pipeline** - Pre-generate all lesson content for 200 anime songs offline via Claude API and validate 100% coverage with the QA agent
- [ ] **Phase 2: Player Experience** - Build the synced YouTube player with furigana, grammar color-coding, vocabulary breakdown, and verse-by-verse explanations
- [ ] **Phase 3: Auth, Catalog, and Freemium Gate** - Add user accounts, song catalog browse, progress tracking, and database-layer freemium gating
- [ ] **Phase 4: AI Search and Payments** - Add natural-language song search via semantic embeddings and Lemon Squeezy subscription checkout
- [ ] **Phase 5: Exercises and Gamification** - Add fill-in-the-blank and translation exercises with XP, levels, and JLPT progression gating
- [ ] **Phase 6: Export and Polish** - Add Anki CSV vocabulary export and close any remaining UX gaps

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

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Content Pipeline | 6/8 | In Progress (checkpoint) |  |
| 2. Player Experience | 0/TBD | Not started | - |
| 3. Auth, Catalog, and Freemium Gate | 0/TBD | Not started | - |
| 4. AI Search and Payments | 0/TBD | Not started | - |
| 5. Exercises and Gamification | 0/TBD | Not started | - |
| 6. Export and Polish | 0/TBD | Not started | - |
