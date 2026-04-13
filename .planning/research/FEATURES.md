# Feature Research

**Domain:** Music-based Japanese language learning web app (anime-focused)
**Researched:** 2026-04-06
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

## Sources

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
*Researched: 2026-04-06*
