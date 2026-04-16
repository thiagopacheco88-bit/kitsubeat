# Requirements: KitsuBeat v2.0 — Exercise & Learning System

**Defined:** 2026-04-14
**Core Value:** Users actively learn and retain Japanese through comprehensive exercises tied to anime songs and scenes, with mastery tracking across all content.
**Depends on:** v1.0 Phases 1-4 complete (content pipeline, player, auth/catalog, payments)

## v2.0 Requirements

Requirements for milestone v2.0. Each maps to roadmap phases.

### Exercise Engine

- [x] **EXER-01**: User can complete Vocab→Meaning exercises (show Japanese word, pick correct meaning from 4 options) for any song
- [x] **EXER-02**: User can complete Meaning→Vocab exercises (show meaning, pick correct Japanese word from 4 options) for any song
- [x] **EXER-03**: User can complete Reading Match exercises (match kanji/kana to correct romaji reading) for any song
- [x] **EXER-04**: User can complete Fill-the-Lyric exercises (hear verse playing, pick the blanked-out word) for any song
- [ ] **EXER-05**: User can complete Grammar Conjugation exercises (given base form + context, pick correct conjugated form) for songs with structured conjugation data
- [ ] **EXER-06**: User can complete Listening Drill exercises (hear verse audio without lyrics, identify the target word) for any song
- [ ] **EXER-07**: User can complete Sentence Order exercises (rebuild a scrambled verse by tapping tokens in correct order) for any song
- [ ] **EXER-08**: User receives immediate feedback after each answer with explanation of why the answer is correct/incorrect
- [ ] **EXER-09**: User can resume incomplete exercise sessions across browser refreshes
- [x] **EXER-10**: Exercise distractors are generated from same-song vocabulary or same-JLPT-level words, never random

### Star & Mastery System

- [ ] **STAR-01**: User sees a 3-star rating for each song reflecting their exercise mastery level
- [x] **STAR-02**: Star 1 is earned when vocab recognition exercises (Ex 1+2+3) are passed at >=80%
- [x] **STAR-03**: Star 2 is earned when Fill-the-Lyric exercise (Ex 4) is passed at >=80%
- [ ] **STAR-04**: Star 3 is earned when Listening Drill exercise (Ex 6) is passed at >=80%
- [ ] **STAR-05**: User sees per-song completion percentage on the song card and song page
- [ ] **STAR-06**: Sentence Order (Ex 7) and Grammar Conjugation (Ex 5) contribute to a bonus mastery badge, not gated on stars

### Kana Trainer

- [ ] **KANA-01**: User can drill hiragana recognition (see kana, pick correct romaji from 4 options) in a standalone trainer
- [ ] **KANA-02**: User can drill katakana recognition in the same trainer interface
- [ ] **KANA-03**: Each kana character has a 10-star mastery level; correct answer adds 1 star, wrong answer removes 2 stars (minimum 0)
- [ ] **KANA-04**: Characters at 0 stars appear with the answer pre-shown (learning mode) and award 1 star for acknowledgment
- [ ] **KANA-05**: Characters at 10 stars (mastered) appear at 1/5th normal frequency but still appear
- [ ] **KANA-06**: Kana are introduced row-by-row (a-row, ka-row, etc.) — user must reach threshold on current row before next row unlocks
- [ ] **KANA-07**: Trainer sessions are 20-question rounds with weighted random selection based on star level
- [ ] **KANA-08**: Dakuten, handakuten, and combo kana (ya/yu/yo variants) are included as separate unlockable rows

### Cross-Song Vocabulary

- [ ] **CROSS-01**: User sees how many vocabulary words they already know from other songs when viewing a song page ("You know 8/12 words")
- [ ] **CROSS-02**: User sees which songs share a vocabulary word ("Seen in: Attack on Titan OP, Demon Slayer OP")
- [ ] **CROSS-03**: User sees a global counter of unique Japanese words learned across all songs
- [ ] **CROSS-04**: Mastering a word in one song automatically reflects in all other songs containing that word
- [ ] **CROSS-05**: User can view a vocabulary dashboard showing all learned words, their mastery level, and source songs

### Anime Scenes

- [ ] **SCENE-01**: User can study iconic anime scenes/speeches (e.g., Pain's speech, AoT pre-battle speeches, One Piece narrator intros) with the same lesson structure as songs (tokens, vocabulary, grammar, translations)
- [ ] **SCENE-02**: Anime scenes have embedded video clips (YouTube) with synced text display
- [ ] **SCENE-03**: All 7 exercise types work on anime scene content identically to song content
- [ ] **SCENE-04**: Anime scenes appear in the catalog alongside songs with a "Scene" content type tag
- [ ] **SCENE-05**: User's vocabulary mastery from scenes contributes to cross-song tracking (shared vocabulary identity)

### Anime Cultural Vocabulary

- [ ] **CULT-01**: User can access a standalone "Anime Vocabulary" drill mode featuring vocabulary taught through anime cultural references (Naruto elements to weekdays, Pokemon names to vocabulary, character names to numbers)
- [ ] **CULT-02**: Cultural vocabulary drills use the same exercise mechanics (multiple choice, star mastery) as song exercises
- [ ] **CULT-03**: When a vocabulary word appears in song/scene exercises that has a known anime cultural reference, a contextual hint is shown (e.g., "water — think Suiton in Naruto, Suicune in Pokemon")
- [ ] **CULT-04**: Cultural vocabulary is organized by anime series/theme (Naruto elements, Pokemon creatures, Dragon Ball references, etc.)

### Freemium Architecture

- [x] **FREE-01**: Exercise system is built with a premium gate abstraction so individual features can be toggled free/premium without code changes
- [x] **FREE-02**: Per-song exercises (all 7 types) are free for all users
- [ ] **FREE-03**: Kana trainer is free for all users
- [ ] **FREE-04**: Cross-song SRS review queue is premium-only (view-only counts are free)
- [ ] **FREE-05**: Listening drills are free for first 3 songs, then premium-gated
- [x] **FREE-06**: Free/premium boundaries are enforced at the data access layer, not hidden UI elements

### Data Quality

- [x] **DATA-01**: Grammar conjugation paths are audited and converted to structured format (parseable into question/answer pairs) for all songs with grammar data
- [x] **DATA-02**: A normalized vocabulary identity table exists with UUIDs, enabling cross-song word matching by (surface, reading) composite key
- [ ] **DATA-03**: Anime scene content is generated through the same Claude API pipeline as songs, with equivalent quality validation

## v3.0 Requirements (Deferred)

### Payments & Billing

- **PAY-01**: User can subscribe via Stripe for premium access
- **PAY-02**: Webhook handling updates plan state immediately after payment
- **PAY-03**: Premium unlock is instant without re-login

### Social & Gamification

- **SOC-01**: User can see personal streaks and daily goals
- **SOC-02**: User can view async leaderboards per song

### Advanced Content

- **ADV-01**: User-submitted song requests via voting system
- **ADV-02**: PWA with offline exercise caching

## Out of Scope

| Feature | Reason |
|---------|--------|
| Handwriting/stroke order practice | Separate product; low ROI for music/scene-based learners |
| Hearts/lives system | Duolingo's most-complained feature; punishes committed learners |
| IME typing input (kana keyboard) | Mobile friction; multiple choice is primary input |
| Social leaderboards | Requires moderation infrastructure; personal bests sufficient for v2.0 |
| Full Anki-style card editing | Anki already does this better; opinionated auto-SRS preferred |
| Native mobile app | Web-first; responsive design covers mobile |
| Real-time multiplayer | WebSocket infrastructure for small audience; defer to proven traction |
| Stripe payments implementation | Deferred to v3.0; v2.0 builds freemium architecture/gates only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 7 | Complete |
| DATA-02 | Phase 7 | Complete |
| EXER-01 | Phase 8 | Complete |
| EXER-02 | Phase 8 | Complete |
| EXER-03 | Phase 8 | Complete |
| EXER-04 | Phase 8 | Complete |
| EXER-08 | Phase 8 | Pending |
| EXER-09 | Phase 8 | Pending |
| EXER-10 | Phase 8 | Complete |
| STAR-01 | Phase 8 | Pending |
| STAR-02 | Phase 8 | Complete |
| STAR-03 | Phase 8 | Complete |
| STAR-05 | Phase 8 | Pending |
| FREE-01 | Phase 8 | Complete |
| FREE-02 | Phase 8 | Complete |
| FREE-06 | Phase 8 | Complete |
| KANA-01 | Phase 9 | Pending |
| KANA-02 | Phase 9 | Pending |
| KANA-03 | Phase 9 | Pending |
| KANA-04 | Phase 9 | Pending |
| KANA-05 | Phase 9 | Pending |
| KANA-06 | Phase 9 | Pending |
| KANA-07 | Phase 9 | Pending |
| KANA-08 | Phase 9 | Pending |
| FREE-03 | Phase 9 | Pending |
| EXER-05 | Phase 10 | Pending |
| EXER-06 | Phase 10 | Pending |
| EXER-07 | Phase 10 | Pending |
| STAR-04 | Phase 10 | Pending |
| STAR-06 | Phase 10 | Pending |
| FREE-05 | Phase 10 | Pending |
| CROSS-01 | Phase 11 | Pending |
| CROSS-02 | Phase 11 | Pending |
| CROSS-03 | Phase 11 | Pending |
| CROSS-04 | Phase 11 | Pending |
| CROSS-05 | Phase 11 | Pending |
| FREE-04 | Phase 11 | Pending |
| SCENE-01 | Phase 12 | Pending |
| SCENE-02 | Phase 12 | Pending |
| SCENE-03 | Phase 12 | Pending |
| SCENE-04 | Phase 12 | Pending |
| SCENE-05 | Phase 12 | Pending |
| CULT-01 | Phase 12 | Pending |
| CULT-02 | Phase 12 | Pending |
| CULT-03 | Phase 12 | Pending |
| CULT-04 | Phase 12 | Pending |
| DATA-03 | Phase 12 | Pending |

**Coverage:**
- v2.0 requirements: 47 total
- Mapped to phases: 47
- Unmapped: 0

---
*Requirements defined: 2026-04-14*
*Last updated: 2026-04-14 — traceability populated after roadmap creation (Phases 7-12)*
