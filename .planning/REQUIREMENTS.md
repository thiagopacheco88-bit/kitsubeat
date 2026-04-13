# Requirements: KitsuBeat

**Defined:** 2026-04-06
**Core Value:** Users can watch an anime song and understand exactly what every word means — with furigana, translation, grammar breakdown, and vocabulary categorization synced to the music as it plays.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Content Pipeline

- [x] **CONT-01**: 200 anime OP/ED songs curated with metadata (title, artist, anime, JLPT level, difficulty tier)
- [x] **CONT-02**: AI-generated Japanese lyrics for all 200 songs via Claude API
- [x] **CONT-03**: Furigana (ruby text) pre-generated for all kanji in lyrics
- [x] **CONT-04**: Romaji transliteration pre-generated for all lyrics with user toggle
- [x] **CONT-05**: Multi-language translations pre-generated (English, Portuguese, Spanish minimum)
- [x] **CONT-06**: Verse-by-verse explanations pre-generated (grammar, cultural context, nuances)
- [x] **CONT-07**: Vocabulary extracted and categorized by grammatical type (nouns, verbs, adjectives, adverbs, particles, expressions)
- [x] **CONT-08**: Grammar color-coding tags pre-generated per word token (nouns=blue, verbs=red, adjectives=green, adverbs=orange, particles=grey)
- [x] **CONT-09**: Verse timing data (start/end timestamps) for verse-by-verse sync with YouTube playback
- [x] **CONT-10**: JLPT level (N5-N1) and difficulty tier (basic, intermediate, advanced) assigned per song
- [ ] **CONT-11**: Verse Coverage Agent that checks all 200 songs have complete content (lyrics, furigana, romaji, translation, explanation, vocabulary, grammar tags) and flags gaps

### Player Experience

- [ ] **PLAY-01**: Embedded YouTube player via iframe API on song page (left on desktop, top on mobile)
- [ ] **PLAY-02**: Verse-by-verse synced lesson panel beside the player (right on desktop, bottom on mobile)
- [ ] **PLAY-03**: Current verse highlighted/scrolled as song plays (~250ms polling sync)
- [ ] **PLAY-04**: Complete lyrics view below the player with furigana displayed as ruby text
- [ ] **PLAY-05**: Romaji toggle to show/hide romanized pronunciation
- [ ] **PLAY-06**: Language selector to switch translation language (English, Portuguese, Spanish, etc.)
- [ ] **PLAY-07**: Grammar color-coded words in lyrics view by grammatical category
- [ ] **PLAY-08**: Click-to-define on any word in lyrics to show dictionary popup (reading, meaning, part of speech, example usage)
- [ ] **PLAY-09**: Vocabulary section below lyrics split by grammatical category
- [ ] **PLAY-10**: Verse-by-verse explanation section (grammar, cultural context, nuances)
- [ ] **PLAY-11**: Responsive layout — desktop split view, mobile stacked view

### Exercises

- [ ] **EXER-01**: Fill-in-the-blank exercises per song (missing words in lyrics, user fills correct Japanese)
- [ ] **EXER-02**: JP→target language translation exercises per verse
- [ ] **EXER-03**: Target language→JP translation exercises per verse
- [ ] **EXER-04**: Exercise difficulty scales with song JLPT level

### Discovery & Search

- [ ] **DISC-01**: Song catalog page to browse all 200 songs with filters (anime, artist, JLPT level, difficulty)
- [ ] **DISC-02**: AI chatbox for natural language song search (e.g. "Naruto opening 4", "beginner Ghibli songs")
- [ ] **DISC-03**: Search results show thumbnail, title, artist, anime, JLPT level before loading lesson
- [ ] **DISC-04**: JLPT difficulty tags displayed on all song cards and catalog entries

### User Accounts & Profile

- [ ] **USER-01**: User can sign up and log in (email/password)
- [ ] **USER-02**: User session persists across browser refresh
- [ ] **USER-03**: Progress tracking per song (which songs started, verses completed, exercises done)
- [ ] **USER-04**: Personal learning profile showing accumulated vocabulary and grammar rules learned
- [ ] **USER-05**: Each learned term/rule linked back to the song where it was first encountered
- [ ] **USER-06**: One full lesson accessible without login (research shows gating first experience kills retention)

### Gamification

- [ ] **GAME-01**: XP earned from completing lessons, exercises, and song milestones
- [ ] **GAME-02**: User levels based on accumulated XP (visible on profile)
- [ ] **GAME-03**: Progression system tied to JLPT levels (unlock harder songs as user levels up)

### Monetization

- [ ] **MONE-01**: Freemium gating — free tier with limited song access, paid tier for full library
- [ ] **MONE-02**: Subscription plan for full library access (monthly/annual)
- [ ] **MONE-03**: Individual song purchase option (a la carte, permanent unlock)
- [ ] **MONE-04**: Payment integration (Lemon Squeezy or Stripe)

### Export

- [ ] **EXPO-01**: Export song vocabulary to Anki-compatible CSV file
- [ ] **EXPO-02**: Export includes word, reading, meaning, part of speech, and source song

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Social & Community

- **SOCL-01**: Per-verse user comments and notes
- **SOCL-02**: Song ratings and reviews
- **SOCL-03**: Community-contributed translations

### Advanced Learning

- **ADVL-01**: Built-in SRS (spaced repetition) flashcard system
- **ADVL-02**: Line-by-line karaoke sync (word-level highlighting)
- **ADVL-03**: Listening comprehension quizzes (audio-only mode)
- **ADVL-04**: Streaks and daily learning goals

### Platform

- **PLAT-01**: Progressive Web App (PWA) with offline support
- **PLAT-02**: Native mobile apps (iOS/Android)
- **PLAT-03**: Custom YouTube link support (user-pasted songs with on-the-fly lesson generation)

## Out of Scope

| Feature | Reason |
|---------|--------|
| User-uploaded songs / custom lyrics | DMCA liability, content quality degradation — curated only |
| Real-time multiplayer / competitive mode | WebSocket infrastructure overkill for 200-song catalog at launch |
| Full social network (follows, feed, messages) | Infinite product surface, moderation overhead |
| Native mobile app | Web-first with responsive design; native is v2+ |
| Audio extraction from YouTube | Violates YouTube ToS — using embedded player only |
| Full SRS system at launch | 6-8 week project on its own; Anki export covers v1 |
| Verbatim lyric reproduction | Copyright risk — design around grammatical breakdowns and educational paraphrasing |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONT-01 | Phase 1 | Complete |
| CONT-02 | Phase 1 | Complete |
| CONT-03 | Phase 1 | Complete |
| CONT-04 | Phase 1 | Complete |
| CONT-05 | Phase 1 | Pending |
| CONT-06 | Phase 1 | Pending |
| CONT-07 | Phase 1 | Pending |
| CONT-08 | Phase 1 | Pending |
| CONT-09 | Phase 1 | Complete |
| CONT-10 | Phase 1 | Complete |
| CONT-11 | Phase 1 | Pending |
| PLAY-01 | Phase 2 | Pending |
| PLAY-02 | Phase 2 | Pending |
| PLAY-03 | Phase 2 | Pending |
| PLAY-04 | Phase 2 | Pending |
| PLAY-05 | Phase 2 | Pending |
| PLAY-06 | Phase 2 | Pending |
| PLAY-07 | Phase 2 | Pending |
| PLAY-08 | Phase 2 | Pending |
| PLAY-09 | Phase 2 | Pending |
| PLAY-10 | Phase 2 | Pending |
| PLAY-11 | Phase 2 | Pending |
| DISC-01 | Phase 3 | Pending |
| DISC-04 | Phase 3 | Pending |
| USER-01 | Phase 3 | Pending |
| USER-02 | Phase 3 | Pending |
| USER-03 | Phase 3 | Pending |
| USER-04 | Phase 3 | Pending |
| USER-05 | Phase 3 | Pending |
| USER-06 | Phase 3 | Pending |
| DISC-02 | Phase 4 | Pending |
| DISC-03 | Phase 4 | Pending |
| MONE-01 | Phase 4 | Pending |
| MONE-02 | Phase 4 | Pending |
| MONE-03 | Phase 4 | Pending |
| MONE-04 | Phase 4 | Pending |
| EXER-01 | Phase 5 | Pending |
| EXER-02 | Phase 5 | Pending |
| EXER-03 | Phase 5 | Pending |
| EXER-04 | Phase 5 | Pending |
| GAME-01 | Phase 5 | Pending |
| GAME-02 | Phase 5 | Pending |
| GAME-03 | Phase 5 | Pending |
| EXPO-01 | Phase 6 | Pending |
| EXPO-02 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 44 total
- Mapped to phases: 44
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-06*
*Last updated: 2026-04-06 after roadmap creation*
