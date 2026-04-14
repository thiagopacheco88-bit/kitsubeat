# Feature Research

**Domain:** Music-based Japanese language learning web app (anime-focused)
**Researched:** 2026-04-06 (initial) · 2026-04-13 (exercise system milestone update)
**Confidence:** MEDIUM — Core feature categories are HIGH confidence (verified across Musixmatch, LyricsTraining/LingoClip, Lirica, Lingopie, WaniKani, JapanesePod101, Migaku). Specific engagement metrics cited are LOW-MEDIUM confidence (single-source or unverified by official docs).

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in any music language learning product. Missing these = product feels broken or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Synced lyrics display (karaoke-style) | Every competitor (LyricsTraining, Musixmatch, Lingopie) offers time-synced lyrics. Without this, the product is just a lyrics site. | MEDIUM | Requires pre-timed LRC/WebVTT data per song. YouTube IFrame API handles playback sync. Must handle timestamp drift gracefully. |
| Furigana (ruby text) over kanji | Japanese learners expect pronunciation help. Without furigana, beginners cannot read kanji lyrics. Hiragana Lyrics (hiraganalyrics.com) exists specifically because this gap is painful. | LOW | Ruby HTML element + CSS. Furigana can be pre-generated with Claude API at content creation time. Toggle off for intermediate learners. |
| Romaji toggle | LyricsTraining/LingoClip supports Japanese in Romaji. Beginners often need Romaji as training wheels before kana. | LOW | Transliteration library (e.g., wanakana) or pre-generated. Toggle alongside furigana. |
| Multi-language translation display | Musixmatch's core differentiator is dual-language lyrics sync. Users learning Japanese via anime songs need English (and potentially other language) translations. | LOW | Pre-generated translations displayed line-by-line synchronized with playback. |
| YouTube video embed with player controls | Users expect to watch the music video, not just listen. YouTube is where anime songs live — licensing cleared via YouTube embed. | LOW | YouTube IFrame API. Standard integration. |
| Song search / catalog browse | Users need to find songs they want to learn. Competitors offer genre, language, difficulty filters. | MEDIUM | Catalog of 200 songs with metadata filtering. AI chatbox for search is a differentiator on top of this baseline. |
| Vocabulary word click-to-define | Migaku, Language Reactor, and Lingopie all offer click-on-word instant definitions. Users who encounter this once expect it everywhere. | MEDIUM | Requires parsed/tokenized lyrics (MeCab or pre-tokenized with Claude API). Pop-up dictionary overlay. |
| User accounts and progress tracking | WaniKani, JapanesePod101, Duolingo all gate progression behind accounts. Users want to return and pick up where they left off. | MEDIUM | Auth (email + OAuth), saved progress per song, history of learned vocabulary. |
| Mobile-responsive design | 60%+ of language learning app usage is mobile. A non-responsive web app loses half the audience. | MEDIUM | CSS/responsive layout. No native app needed at v1, but the web app must work on mobile browsers. |
| Free tier with genuine value | JapanesePod101, Lingopie, LyricsTraining, Duolingo all operate freemium. Users expect to try before buying — 67% of users prefer this model. | LOW | Define the free tier clearly (see MVP and monetization notes). |

### Differentiators (Competitive Advantage)

Features KitsuBeat can use to stand apart. Not expected by default, but create loyalty when present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Grammar color-coding by grammatical category | No direct competitor does in-line grammar annotation within synchronized lyrics. This turns passive listening into active grammar study. Lirica has grammar "episodic instructions" but they are separate from the lyrics flow. | HIGH | Requires pre-tagged grammatical markup per lyric token (POS tagging). Claude API at content-generation time is the practical path. Needs consistent color legend UI component. |
| Vocabulary breakdown by grammatical category | Breaking vocabulary into nouns, verbs, particles, etc. — sorted and displayed per song — is not offered by LyricsTraining, Musixmatch, or Lirica. Migaku does word-by-word definitions but not categorized vocabulary lists. | MEDIUM | Pre-generated vocabulary tables per song. JSON structure: `{word, reading, meaning, part_of_speech, example_line}`. |
| Anime-specific song curation (200 songs, structured lessons) | LyricsTraining supports Japanese (Romaji only). No competitor has a curated, lesson-structured catalog specifically for anime music. This is the core niche. | HIGH | Content quality is the moat. Each song needs: synced lyrics, furigana, translation, grammar tags, vocabulary list. Pre-generated at content time via Claude API. |
| AI chatbox for song search/recommendations | No direct competitor offers conversational song discovery. This reduces friction for users who don't know what to search — "Find me a beginner song about seasons from Ghibli." | MEDIUM | Claude API streaming chat. Constrained prompt to song catalog metadata. Conversation → song card result. Rate-limit on free tier. |
| Verse-by-verse lesson structure | Breaking songs into verse-level digestible lessons (vs full-song at once) mirrors how JapanesePod101 structures podcast lessons. Reduces overwhelm for beginners. | MEDIUM | UI component that reveals and focuses one verse at a time. Lesson state tracked per user. |
| JLPT difficulty tagging per song | WaniKani's level system is a retention driver — users have a clear ladder to climb. Tagging songs by JLPT level (N5 → N1) gives users a progression goal and helps self-sorting. | LOW | Metadata field per song. JLPT vocabulary coverage analysis per song possible at Claude generation time. Requires editorial judgment per song. |
| SRS vocabulary deck from songs | Migaku's killer feature: one-click save a word from context into flashcards with example sentence and audio clip. Adding this to KitsuBeat turns passive listening into active SRS study — connecting music learning with vocabulary retention. | HIGH | Full SRS system is complex. Simpler v1: export vocabulary list to Anki-compatible CSV. Full v1.x: built-in review queue using FSRS algorithm. |
| Social/community features (song ratings, user notes, comments per verse) | Community-driven content quality improvements (Musixmatch uses 30+ multilingual content managers plus community). Allows users to contribute translations, note cultural context, flag errors. | HIGH | Moderation overhead is the cost. Start with read-only community content (curated notes); add user contribution later. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem like obvious additions but create disproportionate costs or dilute focus.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| User-uploaded songs / custom lyrics | Users want to add their own favorite songs. | Licensing landmine. Any user-uploaded song with synced lyrics creates DMCA liability. LyricsTraining has faced takedowns. Building upload infrastructure and moderation eats roadmap. | Curate 200 songs with clear YouTube embed licensing. Add community song request voting instead — you control what gets added. |
| Full SRS system at launch | Anki and WaniKani prove SRS is valuable. | Building a quality SRS engine (FSRS algorithm, scheduling UI, review interface, streak tracking) is a 6-8 week project on its own. It competes with the core music-learning loop. | Export vocabulary to Anki CSV at launch (1 week). Build in-app SRS in v1.x after core is validated. |
| Real-time multiplayer / competitive mode | LyricsTraining has leaderboards. Gamification drives engagement. | Real-time multiplayer needs WebSocket infrastructure, matchmaking, and anti-cheat. For 200 curated songs the audience is too small at launch. | Async leaderboards (high scores per song) achieve 80% of the social motivation at 10% of the infrastructure cost. |
| AI-generated custom song lessons | Users would love AI-generated lessons for any YouTube URL they paste. | Arbitrary YouTube URLs break the curated quality guarantee. Grammar tagging and furigana accuracy degrade on unprepared content. Moderation and content liability surface again. | Controlled AI generation at content-creation time (your workflow) ensures quality. Add user-requested songs via editorial pipeline, not self-serve automation. |
| Native mobile app (iOS/Android) at launch | Users prefer apps over mobile web. | App store submission, native build pipeline, and platform-specific UX doubles development surface. Progressive Web App (PWA) closes 90% of the gap for a web-first product. | Ship PWA with offline-capable service worker. Native app is v2+ if web traction is proven. |
| Full social network (follows, feed, messages) | Community features increase retention. | Social graph is an infinite product surface. Moderation, trust and safety, feed ranking — each is its own roadmap. | Async community features: per-verse comments, song ratings, vocabulary note sharing. Social without the social graph. |

---

## Feature Dependencies

```
[User Accounts]
    └──requires──> [Progress Tracking]
    └──requires──> [Freemium / Paywall Gating]
    └──enables──>  [SRS Vocabulary Deck]
    └──enables──>  [Streak / Gamification]

[Synced Lyrics Display]
    └──requires──> [YouTube IFrame Embed]
    └──requires──> [LRC/Timestamp Data per song]
    └──enables──>  [Vocabulary Click-to-Define]
    └──enables──>  [Grammar Color-Coding]
    └──enables──>  [Verse-by-Verse Lesson Structure]

[Vocabulary Click-to-Define]
    └──requires──> [Tokenized/Parsed Lyrics]
    └──requires──> [Dictionary Data (JMdict or equivalent)]
    └──enables──>  [SRS Vocabulary Deck]
    └──enables──>  [Vocabulary Breakdown by Category]

[Grammar Color-Coding]
    └──requires──> [POS-Tagged Lyrics (pre-generated)]
    └──enhances──> [Verse-by-Verse Lesson Structure]

[AI Chatbox Song Search]
    └──requires──> [Song Catalog Metadata Schema]
    └──requires──> [Claude API integration]
    └──independent of──> [User Accounts] (can work anonymously, but rate-limited)

[SRS Vocabulary Deck (in-app)]
    └──requires──> [User Accounts]
    └──requires──> [Vocabulary Click-to-Define]
    └──conflicts-with-scope-of──> [Full SRS at launch] (defer to v1.x)

[JLPT Difficulty Tagging]
    └──requires──> [Song Catalog Metadata Schema]
    └──enhances──> [Song Search / Browse]
    └──enables──>  [Personalized Song Recommendations]
```

### Dependency Notes

- **Synced lyrics requires LRC/timestamp data:** This is the hardest content production constraint. Every song in the 200-song catalog needs time-coded lyrics. Pre-generation at content time (not runtime) is the only scalable approach.
- **Grammar color-coding requires POS-tagged lyrics:** MeCab or similar tokenizer can be run at content generation time via Claude API. This is a content pipeline concern, not a user-facing runtime concern.
- **SRS deck conflicts with full SRS at launch:** Building SRS requires user accounts, scheduling logic, review UI, and streak tracking simultaneously. Decompose: v1 = export to Anki CSV. v1.x = built-in review queue.
- **AI chatbox is relatively independent:** It requires the song metadata schema but not the full lesson system. Can ship alongside or slightly before verse-level lessons.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — enough to validate that anime fans will engage with structured song-based Japanese lessons.

- [ ] **YouTube embed + synced karaoke lyrics** — Core experience. If this doesn't work, nothing else matters.
- [ ] **Furigana + Romaji toggle** — Beginner accessibility. Without this, N5 learners cannot engage.
- [ ] **English translation synced line-by-line** — Core learning value. Users need meaning alongside lyrics.
- [ ] **Vocabulary breakdown table per song** — Differentiator #1. Quick-win that separates from LyricsTraining.
- [ ] **Grammar color-coding with legend** — Differentiator #2. Unique to KitsuBeat in this domain.
- [ ] **Song catalog browse with JLPT + genre filters** — Navigation baseline. 200 songs need discovery.
- [ ] **AI chatbox song search** — Differentiator #3. Low-lift if Claude API is already integrated for content generation.
- [ ] **User accounts + progress tracking** — Required for freemium model and return visits.
- [ ] **Freemium gating (first N songs free, premium for full catalog)** — Revenue foundation.
- [ ] **Mobile-responsive design** — Non-negotiable for web in 2026.

### Add After Validation (v1.x)

Add once the core music learning loop is proven to retain users (target: 30%+ week-2 retention).

- [ ] **Vocabulary save + Anki CSV export** — Trigger: users asking "how do I study these words?" in feedback.
- [ ] **Verse-by-verse lesson mode** — Trigger: user research shows people are overwhelmed by full songs.
- [ ] **Streak and daily goal gamification** — Trigger: 30-day retention data shows drop-off at day 7-10.
- [ ] **Async leaderboards (high score per song)** — Trigger: users mention competition in feedback.
- [ ] **Community vocabulary notes per verse** — Trigger: power users want to share insights.

### Future Consideration (v2+)

Defer until product-market fit is established (consistent MRR growth, NPS > 40).

- [ ] **Built-in SRS review queue (FSRS)** — Significant engineering. Only worth building if vocabulary export (v1.x) shows strong usage.
- [ ] **Song request pipeline with community voting** — Requires editorial process and content production scale.
- [ ] **Progressive Web App (PWA) with offline mode** — After mobile web usage data confirms demand.
- [ ] **Social follows / shared vocabulary decks** — After community note feature (v1.x) proves social demand.
- [ ] **Native iOS/Android app** — After web traction is proven and revenue supports dual-platform investment.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| YouTube embed + synced lyrics | HIGH | MEDIUM | P1 |
| Furigana + Romaji toggle | HIGH | LOW | P1 |
| Line-by-line translation | HIGH | LOW | P1 |
| Song catalog browse + filters | HIGH | MEDIUM | P1 |
| User accounts + progress | HIGH | MEDIUM | P1 |
| Vocabulary breakdown table | HIGH | LOW | P1 |
| Grammar color-coding | HIGH | HIGH | P1 |
| AI chatbox search | MEDIUM | MEDIUM | P1 |
| Freemium paywall | HIGH | LOW | P1 |
| Mobile-responsive UI | HIGH | MEDIUM | P1 |
| Vocabulary save + Anki export | MEDIUM | LOW | P2 |
| Verse-by-verse lesson mode | MEDIUM | MEDIUM | P2 |
| Streak / gamification | MEDIUM | MEDIUM | P2 |
| Async leaderboards | LOW | LOW | P2 |
| Community notes per verse | MEDIUM | MEDIUM | P2 |
| Built-in SRS (FSRS) | HIGH | HIGH | P3 |
| PWA offline mode | MEDIUM | HIGH | P3 |
| Song request voting | LOW | MEDIUM | P3 |
| Native app | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | LyricsTraining / LingoClip | Musixmatch | Lirica | Lingopie Music | KitsuBeat Approach |
|---------|---------------------------|------------|--------|----------------|-------------------|
| Synced lyrics | Yes (fill-in-blank game) | Yes (floating lyrics) | Yes (with vocabulary quiz) | Yes (dual-subtitle) | Yes (karaoke-style, verse-focused) |
| Japanese support | Romaji only | Yes (community translations) | No (Spanish/French/German/English/Welsh) | Yes | Yes — furigana, kana, romaji, kanji |
| Furigana | No | No | No | No | Yes — primary differentiator |
| Grammar annotation | No | No | Episodic tips (separate from lyrics) | No | Yes — inline color-coding |
| Vocabulary breakdown | No | Word-by-word translation (premium) | Quiz-based vocabulary | Click-to-define | Pre-generated categorized vocabulary list |
| Anime-specific content | No | Community-sourced, not curated | No | No | Yes — 200 curated anime songs |
| AI search | No | No | No | No | Yes — Claude-powered chatbox |
| SRS flashcards | No | No | No | No | v1: Anki export; v1.x: in-app |
| Free tier | Yes (web, with educator paywall) | Yes (with ads + limits) | Yes (limited songs) | Yes (limited) | Yes (limited songs, no paywall on core lesson) |
| Gamification | Fill-in-blank scoring, leaderboards | None | Quiz scoring | None | Streaks + leaderboards (v1.x) |
| Mobile app | Yes (iOS + Android) | Yes (iOS + Android) | Yes (iOS + Android) | Yes (iOS + Android) | Mobile-responsive web (PWA in v2) |

---

---

# Exercise System Feature Research (Milestone 2: Exercise & Learning System)

**Researched:** 2026-04-13
**Confidence:** HIGH for exercise patterns (cross-verified across WaniKani, Bunpro, Duolingo, LyricsTraining). MEDIUM for freemium conversion rates (sourced from secondary analyses of Duolingo public data).

This section covers the exercise system, kana trainer, cross-song vocabulary tracking, star/mastery ratings, and freemium conversion patterns for the new milestone. All data dependencies reference the existing `Lesson` schema (`tokens`, `vocabulary`, `grammar_points`, `verses`).

---

## Exercise System — Table Stakes

Features users assume any language exercise system has. Missing these makes exercises feel broken.

| Feature | Why Expected | Complexity | Data Dependency |
|---------|--------------|------------|-----------------|
| Vocab → Meaning (surface recognition) | Baseline for every SRS app (Duolingo, WaniKani, Anki). Multiple choice with 4 options. | LOW | `vocabulary[].surface`, `vocabulary[].reading`, `vocabulary[].meaning` |
| Meaning → Vocab (production recall) | WaniKani treats meaning and reading as separate review types for every item — bidirectional recall is baseline. Duolingo research confirms it significantly improves retention. | LOW | Same as above, reversed prompt |
| Reading match (kana ↔ romaji) | Japanese-specific baseline. Reading is a distinct skill from meaning; treating them as one is a known mistake. | LOW | `vocabulary[].reading`, `vocabulary[].romaji` |
| Fill-the-lyric (cloze from lyrics) | LyricsTraining/LingoClip built an entire product on this mechanic. Any music-learning exercise system that omits it fails at its core premise. | MEDIUM | `verses[].tokens`, `verses[].start_time_ms/end_time_ms`, YouTube IFrame API |
| Immediate answer feedback with explanation | Duolingo standard — users expect to see why they were wrong, not just wrong/right binary. | LOW | `vocabulary[].meaning`, `grammar_points[].explanation` |
| Per-song exercise completion percentage | Users need to know "how done" a song is. Absence frustrates completionists; this is a core engagement driver. | MEDIUM | Requires user_exercise_progress DB table |
| Progress persistence (resume between sessions) | Without this, exercises feel pointless. Stateless exercises kill the learning loop. | MEDIUM | Requires user session/progress DB table |
| Multiple choice as default format | Easier entry point; WaniKani and Duolingo both start with recognition before production. | LOW | Distractor generation from other `vocabulary` entries in same song or same JLPT level |

## Exercise System — Differentiators

| Feature | Value Proposition | Complexity | Data Dependency |
|---------|-------------------|------------|-----------------|
| Grammar conjugation drill | No music-learning app does grammar drills tied to the actual song. Bunpro does SRS conjugation but without in-song context. The combination is unique. | HIGH | `grammar_points[].conjugation_path` must be structured (e.g. `plain → て-form`), not free-text. Also needs `verses[].tokens` for in-song example. |
| Sentence order (token scramble) | Reinforces Japanese SOV word order + particle placement using real song lyrics. Authenticated by research showing 56% writing skill improvement. No music-learning competitor does this. | MEDIUM | `verses[].tokens` (already ordered per verse — just scramble for display) |
| Listening drill (audio-only cloze) | LyricsTraining shows lyrics during audio. KitsuBeat's version: hear the segment, no lyrics shown, identify the word. Harder and more valuable. Unique in music learning space. | HIGH | `verses[].start_time_ms/end_time_ms`, YouTube IFrame segment loop, lyrics hidden during playback |
| Cross-song vocabulary tracking | jpdb.io does this across decks — same word in two decks shares SRS state. No music-learning app does this. Learning a word in one song auto-credits it in all other songs where it appears. | HIGH | Requires normalized word identity: `(surface, reading)` as composite key. Requires new `user_vocabulary_progress` table. |
| 3-star mastery system per song | Visual completion signal with tiered difficulty. Star 1 = vocab recognition, Star 2 = fill-the-lyric, Star 3 = listening drill. Drives completionist behavior. | MEDIUM | Derived from per-exercise completion state stored in progress table |
| JLPT-aware exercise ordering | Show N5 vocab exercises before N2 within the same song. Matches learner's stated or inferred level. | MEDIUM | `vocabulary[].jlpt_level`, `tokens[].jlpt_level` — already in schema |
| Context-anchored exercise prompts | Show which song introduced a vocabulary word during exercises: "You heard this in Demon Slayer OP." Emotionally resonant for anime fans. | LOW | `vocabulary[].example_from_song` + song metadata — already in schema |
| Vocabulary seen-count surface | "You've seen この in 12 songs" — uniquely motivating for music-first learners. Turns catalog breadth into a user feature. | MEDIUM | Cross-song JSONB index or materialized view on `(surface, reading)` |

## Exercise System — Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Handwriting / stroke order practice | Traditional Japanese learning includes it; users expect it | Canvas + stroke recognition is a separate product. Low ROI for song-based learners who need reading recognition first. Blocks launch. | Focus on reading recognition. Reference jisho.org for stroke order when users ask. |
| Full Anki-style manual card editing | Power users want custom decks | Creates a separate product; infinite scope. Anki already does this better. | Opinionated automatic SRS that works without configuration. No deck editing UI. |
| IME typing input (kana keyboard) | Bunpro requires typed answers; power users prefer it | Significant mobile friction. IME handling has edge cases. Kills accessibility for casual learners. | Multiple choice and token-tap as primary. Optional type-in toggle for desktop power users only. |
| Hearts/lives system | Duolingo uses it; feels gamified | Duolingo's most complained-about feature. Punishes committed learners. Frustrates, not motivates. | No lives. Allow unlimited attempts with score degradation. |
| Social leaderboards | Gamification best practice | Requires user identity infrastructure + community moderation. Can shame beginners and drive churn in language learning context. | Personal bests + streak stats. No public ranking for initial milestone. |

---

## Exercise Type Detail

### Exercise 1: Vocab → Meaning (Surface Recognition)
- **Format:** Show `surface` + `reading`, pick correct `meaning` from 4 options (3 distractors from same song vocabulary).
- **Data needed:** All exists in `vocabulary[]`.
- **Table stakes:** YES. Star 1 contribution.
- **Complexity:** LOW.

### Exercise 2: Meaning → Vocab (Production Recognition)
- **Format:** Show `meaning` in user's language, pick correct `surface` from 4 options.
- **Data needed:** Same as Ex 1, reversed prompt.
- **Table stakes:** YES. Star 1 contribution.
- **Complexity:** LOW. Note: Duolingo research confirms bidirectional recall substantially improves retention over recognition-only.

### Exercise 3: Reading Match (Kana ↔ Romaji)
- **Format:** Show `reading` (kana), pick correct `romaji` — or vice versa.
- **Data needed:** `vocabulary[].reading`, `vocabulary[].romaji` — all exists.
- **Table stakes:** YES for Japanese learner context. Star 1 contribution.
- **Complexity:** LOW.

### Exercise 4: Fill-the-Lyric (Cloze)
- **Format:** Lyrics display synced to song. One token blanked (prefer vocabulary targets, not random). User picks from 4 options or types.
- **Data needed:** `verses[].tokens`, `verses[].start_time_ms`, `verses[].end_time_ms`, YouTube IFrame API.
- **Key constraint:** Blank vocabulary words specifically — blanking random function words (particles) is confusing without grammar instruction.
- **Table stakes:** YES for a music-learning app. Star 2 contribution.
- **Complexity:** MEDIUM. Data exists; needs YouTube player segment control + token selection logic.

### Exercise 5: Grammar Conjugation Drill
- **Format:** Show verb/adjective in dictionary form + in-song context sentence. User selects correct conjugated form.
- **Data needed:** `grammar_points[].conjugation_path` must be machine-parseable structured format (e.g., `plain → て-form → ている`). Currently may be free-text prose — this is the blocking dependency.
- **Table stakes:** NO. Differentiator.
- **Complexity:** HIGH. Requires `conjugation_path` data quality audit and possible re-generation of grammar data.

### Exercise 6: Listening Drill (Audio-Only Cloze)
- **Format:** Verse audio plays without lyrics displayed. User identifies the word they heard. Segment loops once.
- **Data needed:** `verses[].start_time_ms`, `verses[].end_time_ms`, YouTube player API with segment loop capability.
- **Key constraint:** Must suppress lyrics display during playback — inverts the normal song page behavior.
- **Table stakes:** NO. Differentiator. Star 3 contribution (hardest — completes mastery).
- **Complexity:** HIGH. Requires YouTube IFrame segment isolation + lyrics-hidden playback mode.

### Exercise 7: Sentence Order (Token Scramble)
- **Format:** All tokens from a verse displayed in shuffled order as chips. User taps to reconstruct the sentence.
- **Data needed:** `verses[].tokens` — already ordered, just display shuffled.
- **Table stakes:** NO. Differentiator.
- **Complexity:** MEDIUM. Shuffle + tap-to-build UI; works well on mobile.
- **Research backing:** Scrambled sentence exercises show 56% improvement in syntactic awareness in peer-reviewed research.

---

## Star / Mastery System

**Pattern:** 3-star completion is the dominant gaming pattern (Angry Birds, Duolingo crowns, WaniKani SRS stages). For KitsuBeat, 3 stars maps to exercise difficulty tiers within a song.

| Stars | Requirement | Represents |
|-------|-------------|------------|
| 0 stars | Song explored, no exercises completed | Unstarted |
| 1 star | Exercises 1+2+3 (vocab recognition) passed ≥80% | Word-level recognition |
| 2 stars | Exercise 4 (fill-the-lyric) passed ≥80% | Listening + reading integration |
| 3 stars | Exercise 6 (listening drill) passed ≥80% | Full audio comprehension |

**Sentence order (Ex 7) and grammar drill (Ex 5)** contribute to a bonus mastery score or achievement badge — not gated on stars. They are depth exercises for engaged users.

**Anti-pattern to avoid:** Requiring 100% pass rate for star advancement. WaniKani uses ~60% threshold within a session; Duolingo accepts ~80%. Requiring perfection causes rage-quit. The 80% threshold is supported by industry evidence.

---

## Kana Trainer (Standalone Module)

**What it is:** Hiragana and katakana recognition drills, separate from song exercises, intended as a prerequisite literacy baseline.

**Industry standard approach:**
- Apps like Kana Pro, Real Kana, and WaniKani's early levels all start with kana recognition before any vocabulary work.
- Two modes: recognition (see kana → pick romaji) and reverse (see romaji → pick kana).
- Stage-based introduction: teach one row at a time (a-row, ka-row, etc.), quiz on mastered rows before unlocking next.
- Multiple choice only — no handwriting (see anti-features).

**KitsuBeat implementation:**
- Hiragana first (more common in song lyrics than katakana).
- 46 hiragana + 46 katakana + dakuten/handakuten variants ≈ 112 items total. Pure static data, no song dependency.
- SRS intervals applied to kana items — same scheduling logic as vocabulary exercises.
- Unlock mechanism: completing hiragana trainer unlocks reading exercises (Ex 3) in songs. Recommended as a suggested path, not a hard gate that blocks access for existing learners.
- **Complexity:** MEDIUM. Standalone exercise module; SRS integration needed.

---

## Cross-Song Vocabulary Tracking

**What it is:** When a user learns a word in Song A, that mastery state is shared with Song B if the same word appears there.

**Industry precedent:** jpdb.io does this across user-created decks — words share SRS state across decks automatically. Migaku tracks five word statuses (Unknown/Learning/Known/Ignored/Tracked) globally across all media. No music-learning app has implemented this.

**Implementation challenge:** Word identity. The surface `この` in Song A and `この` in Song B must resolve to the same word identity. Current schema stores vocabulary in JSONB per song version, not in a normalized table. This requires either:
1. A normalized `words` table with UUID, or
2. A JSONB-based identity key: `(surface, reading)` treated as composite key.

**Recommended schema addition:**
```sql
user_vocabulary_progress (
  user_id, surface, reading,
  srs_stage, last_reviewed_at, next_review_at,
  seen_in_song_ids[]  -- for the "seen in 12 songs" surface
)
```

**User-facing surfaces:**
- On song page: "You already know 8 of 12 vocabulary words from other songs" — reduces intimidation before starting.
- On vocabulary item: "Seen in: Attack on Titan OP, Demon Slayer OP 2" — context-rich motivation for anime fans.
- Global counter: "You know 247 unique Japanese words from anime songs."

**Complexity:** HIGH. Requires new DB table + JSONB extraction query (or materialized view) + cross-song identity matching logic.

---

## Freemium Conversion Patterns for Exercise System

**Evidence basis:** Duolingo public data + secondary analysis. MEDIUM confidence on specific conversion rates; HIGH confidence on structural patterns.

**Key findings:**
- Duolingo grew from 3% to 8.8% MAU-to-premium conversion (2020–2024) primarily by switching from time-trigger to value-trigger paywalls.
- Value-trigger paywalls convert at 3.2x the rate of time-trigger paywalls (Duolingo internal data, cited in secondary analysis).
- Subscriptions represented 85% of Duolingo's revenue by Q2 2025. SRS-gated features are strong premium anchors.
- Bunpro is fully paid ($3/month). Migaku is fully paid ($12/month). WaniKani is free for levels 1–3, then paid. The anime/Japanese learner segment accepts paid tools.

**Recommended freemium split for exercise system:**

| Feature | Free Tier | Premium Tier |
|---------|-----------|--------------|
| Per-song exercises (all 7 types) | UNLIMITED | UNLIMITED |
| Kana trainer (complete) | UNLIMITED | UNLIMITED |
| Per-song star/mastery display | YES | YES |
| Per-song completion percentage | YES | YES |
| Listening drills (Ex 6) | First 3 songs only | Unlimited |
| Cross-song SRS review queue | NO | YES |
| Cross-song vocabulary tracking (full SRS) | View-only counts | Full schedule + SRS |
| Ad-free experience | NO | YES |
| Offline exercise caching | NO | YES (future) |

**Rationale:**
- Per-song exercises free = user experiences full value of engaging with a song before ever hitting a paywall. This is the "full experience first, then ask to commit" pattern (Taalhammer model), which avoids the hearts/lives frustration Duolingo gets criticized for.
- Cross-song SRS as the premium anchor: requires infrastructure investment, delivers the long-term retention value proposition ("never forget what you learned"), and is a natural upsell once the user has experienced multiple songs.
- Listening drills gated at 3 free songs: user has already experienced how engaging audio-only drills are, creating genuine desire for unlimited access at the paywall moment.

**Paywall trigger moments (value-trigger pattern):**
1. User completes their first 3-star song → "Unlock SRS review so you never forget this song."
2. User views cross-song tracking count → "Upgrade to track and review these words."
3. User hits the listening drill song limit → upsell appears after completing drill on song 3.

**Anti-patterns to avoid in exercise system:**
- Hearts/lives that interrupt learning flow.
- Streak shields as paid features (punitive, not additive).
- Locking any per-song exercise type behind payment (blocks the discovery loop that drives premium intent).
- Time-trigger paywall after N days (converts at 3x lower rate than value-trigger).

---

## Exercise System Feature Dependencies

```
Kana Trainer
    └──unlocks (recommended path)──> Reading Match (Ex 3)
    └──independent of──> Vocab/Meaning exercises

User Auth + Progress Table
    └──required by──> Exercise completion percentage
    └──required by──> Star/mastery system
    └──required by──> Cross-song vocabulary tracking
    └──required by──> SRS review queue (premium)

Fill-the-Lyric (Ex 4)
    └──requires──> YouTube IFrame segment control
    └──requires──> Token-level cloze selection (vocabulary tokens preferred)

Listening Drill (Ex 6)
    └──requires──> Fill-the-Lyric infrastructure (same segment control)
    └──requires──> Lyrics-hidden playback mode

Grammar Conjugation Drill (Ex 5)
    └──requires──> conjugation_path in structured format (BLOCKER — audit needed)
    └──requires──> In-song example sentence display

Sentence Order (Ex 7)
    └──requires──> verses[].tokens (already exists)
    └──no additional blockers

Cross-Song Vocabulary Tracking
    └──requires──> user_vocabulary_progress DB table (new)
    └──requires──> Word identity normalization across songs
    └──enhances──> Star/mastery system (global mastery, not just per-song)

Freemium Paywall
    └──requires──> User Auth
    └──gates──> Listening Drill (after 3 free songs)
    └──gates──> Cross-Song SRS Review Queue (entirely)
    └──free tier includes──> All 7 exercise types per-song
```

---

## Exercise System MVP

### Launch With (this milestone v1)

- [ ] Exercises 1+2+3 (vocab recognition bidirectional + reading match) — all data exists, lowest complexity
- [ ] Exercise 4 (fill-the-lyric) — requires YouTube segment control, highest table-stakes priority
- [ ] 1-star and 2-star mastery system (vocab + fill-lyric) — visible progress driver
- [ ] User progress persistence (new DB table)
- [ ] Per-song completion percentage on song page
- [ ] Kana trainer (hiragana) as standalone module

### Add After Initial Validation

- [ ] Exercise 7 (sentence order / token scramble) — data exists, medium complexity
- [ ] Katakana trainer extension
- [ ] Cross-song vocabulary count (view-only, no SRS) — requires word identity query
- [ ] Exercise 6 (listening drill) + 3-star mastery — requires YouTube segment isolation

### Defer to Premium/v2

- [ ] Exercise 5 (grammar conjugation) — audit conjugation_path data quality first
- [ ] Full cross-song SRS review queue (premium anchor feature)
- [ ] Freemium paywall implementation

---

## Exercise System Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Vocab recognition exercises (Ex 1+2) | HIGH | LOW | P1 |
| Reading match (Ex 3) | HIGH | LOW | P1 |
| Fill-the-lyric (Ex 4) | HIGH | MEDIUM | P1 |
| 1+2 star mastery system | HIGH | MEDIUM | P1 |
| Progress persistence DB | HIGH | MEDIUM | P1 |
| Kana trainer (hiragana) | HIGH | MEDIUM | P1 |
| Per-song completion % display | HIGH | LOW | P1 |
| Sentence order (Ex 7) | MEDIUM | MEDIUM | P2 |
| Listening drill (Ex 6) + 3-star | HIGH | HIGH | P2 |
| Katakana trainer | MEDIUM | LOW | P2 |
| Cross-song vocab count (view-only) | MEDIUM | HIGH | P2 |
| Grammar conjugation (Ex 5) | MEDIUM | HIGH | P2 |
| Full cross-song SRS queue | HIGH | HIGH | P3 |
| Freemium paywall | HIGH | MEDIUM | P3 |

---

## Exercise System Sources

- [WaniKani SRS Stages — official docs](https://knowledge.wanikani.com/wanikani/srs-stages/) — HIGH confidence
- [WaniKani SRS overview](https://knowledge.wanikani.com/wanikani/srs/) — HIGH confidence
- [Duolingo Flashcards and Review Exercises](https://blog.duolingo.com/review-exercises-help-measure-learner-recall/) — HIGH confidence
- [Bunpro Review (Tofugu, authoritative Japanese learning resource)](https://www.tofugu.com/japanese-learning-resources-database/bunpro/) — HIGH confidence
- [LyricsTraining / LingoClip about page](https://lyricstraining.com/about) — HIGH confidence, direct product observation
- [Migaku vocabulary status tracking](https://migaku.com/blog/japanese/japanese-spaced-repetition) — HIGH confidence, official blog
- [jpdb cross-deck vocabulary tracking](https://jpdb.io/) — MEDIUM confidence, product observation
- [Duolingo Monetization 176% premium growth analysis](https://medium.com/@nicobottaro/monetization-7-lessons-on-how-duolingo-increased-premium-users-by-176-from-3-to-8-8-42e8d63b58f2) — MEDIUM confidence
- [How Duolingo pushes users from freemium to premium (value-trigger)](https://adplist.substack.com/p/how-duolingo-pushes-users-from-freemium) — MEDIUM confidence
- [Scrambled Sentence Game effectiveness — peer-reviewed study 2025](https://isapublisher.com/wp-content/uploads/2025/06/The-Influence-of-Using-Scrambled-Sentence-Game-on-Students-Writing-Skills-and-Motivation.pdf) — MEDIUM confidence
- [Language App Paywalls 2026 analysis](https://languavibe.com/language-app-paywalls/) — MEDIUM confidence
- [Kana Pro — production kana drill app](https://kana.pro/) — MEDIUM confidence, product observation

---

## Original Sources (Initial Research 2026-04-06)

- [LyricsTraining / LingoClip About](https://lyricstraining.com/about) — MEDIUM confidence (official site)
- [LingoClip on Lingoclip.com](https://lingoclip.com/) — MEDIUM confidence (official site)
- [Musixmatch Lyrics Translations announcement](https://medium.com/musixmatch-blog/say-hello-to-lyrics-translations-5388ce41ada3) — MEDIUM confidence (official blog)
- [Musixmatch Wikipedia](https://en.wikipedia.org/wiki/Musixmatch) — MEDIUM confidence
- [Lirica language learning review — Technology in Language Teaching & Learning](https://www.castledown.com/journals/tltl/article/view/1500/312) — MEDIUM confidence (peer-reviewed journal)
- [Lingopie Wikipedia](https://en.wikipedia.org/wiki/Lingopie) — MEDIUM confidence
- [WaniKani SRS Stages](https://knowledge.wanikani.com/wanikani/srs-stages/) — HIGH confidence (official docs)
- [WaniKani SRS](https://knowledge.wanikani.com/wanikani/srs/) — HIGH confidence (official docs)
- [JapanesePod101 Pricing](https://www.japanesepod101.com/pricing) — HIGH confidence (official site)
- [Migaku features overview](https://migaku.com) — MEDIUM confidence (official site)
- [Hiragana Lyrics — gap in Japanese music learning market](https://hiraganalyrics.com/about/) — MEDIUM confidence
- [Duolingo gamification case study](https://trophy.so/blog/duolingo-gamification-case-study) — LOW confidence (third-party analysis)
- [Streaks and milestones gamification — Plotline](https://www.plotline.so/blog/streaks-for-gamification-in-mobile-apps/) — LOW confidence (vendor blog)
- [Freemium monetization strategies — Adapty](https://adapty.io/blog/freemium-app-monetization-strategies/) — LOW confidence (vendor blog)
- [Language learning app statistics — ElectroIQ](https://electroiq.com/stats/language-learning-app-statistics/) — LOW confidence (aggregator)
- [FluentU: SRS language learning guide](https://www.fluentu.com/blog/learn/srs-spaced-repetition-language-learning/) — MEDIUM confidence
- [Migaku sentence mining guide](https://migaku.com/blog/language-fun/sentence-mining-guide-learn-vocabulary-faster) — MEDIUM confidence (official blog)

---

*Feature research for: anime music-based Japanese language learning web app (KitsuBeat)*
*Researched: 2026-04-06 (initial) · 2026-04-13 (exercise system milestone update)*
