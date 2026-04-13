# KitsuBeat

## What This Is

KitsuBeat is a web-based Japanese learning tool that uses anime opening and ending songs to teach language through music. Users watch embedded YouTube videos alongside synced lyrics with furigana, translations, grammar explanations, and color-coded vocabulary — turning passive anime fandom into active language learning. Multi-language lesson support makes it a universal music-based language learning tool.

## Core Value

Users can watch an anime song and understand exactly what every word means — with furigana, translation, grammar breakdown, and vocabulary categorization synced to the music as it plays.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Curated library of 200 top anime OP/ED songs with complete lesson content
- [ ] Embedded YouTube player with verse-by-verse synchronized lyrics
- [ ] AI chatbox for natural language song search within the curated library
- [ ] Search results flow with thumbnail, title, artist, anime before loading lesson
- [ ] Furigana reading aid on all kanji in lyrics
- [ ] Multi-language translation support (English, Portuguese, Spanish, etc.)
- [ ] Language selector for choosing lesson language
- [ ] Pre-generated verse-by-verse explanations (grammar, cultural context, nuances) via Claude API
- [ ] Vocabulary sections split by grammatical category (nouns, verbs, adjectives, adverbs, particles, expressions)
- [ ] Color-coded lyrics by word category (nouns=blue, verbs=red, adjectives=green, adverbs=orange, particles=grey)
- [ ] User accounts with authentication for progress tracking
- [ ] Responsive layout — video left/lyrics right on desktop, video top/lyrics bottom on mobile
- [ ] Verse Coverage Agent — automated QA checking all verses have lyrics, furigana, translation, and explanation
- [ ] Freemium model — free tier with limited songs, paid tier for full library access

### Out of Scope

- Custom YouTube link pasting (user-submitted songs) — defer to v2, focus on curated quality first
- Native mobile apps — web-first, responsive design covers mobile for now
- Line-by-line karaoke sync — verse-by-verse is sufficient for v1, karaoke precision deferred
- Social features (sharing, leaderboards) — defer to v2 for virality layer
- Spaced repetition / flashcards — defer to v2, focus on the core music+lesson experience
- Audio extraction from YouTube — violates ToS, using embedded player instead

## Context

- **Target audience:** Western anime fans wanting to understand their favorite songs AND serious Japanese learners using music as a study method. Both casual and dedicated learners.
- **Virality angle:** Anime community is highly engaged and shares niche tools. Song-based learning has emotional resonance that traditional flashcard apps lack.
- **Content pipeline:** All 200 songs will have lessons pre-generated using Claude API before launch. This means consistent quality and no per-request AI costs for curated content.
- **Multi-language play:** While Japanese is the primary language being learned, lessons can be delivered in any language (Portuguese, Spanish, English, etc.), making this a global product from day one.
- **YouTube integration:** Using YouTube's official iframe embed API — legal, shows the actual video with ads, and gives access to the vast library of officially uploaded anime music.

## Constraints

- **Legal**: Must use YouTube iframe embed API — no audio extraction or ToS violations
- **Content quality**: All 200 songs must have complete, reviewed lesson content before launch — no partial lessons
- **AI provider**: Claude API for all content generation (translations, explanations, vocabulary categorization)
- **Platform**: Web application first, responsive design for mobile browsers
- **Freemium**: Free tier must be compelling enough to drive word-of-mouth while paid tier has clear value

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Embed YouTube player (not extract audio) | Legal compliance with YouTube ToS, access to official uploads | — Pending |
| Pre-generate all lesson content for 200 songs | Consistent quality, no per-request AI costs, faster UX | — Pending |
| Claude API for content generation | Quality of Japanese language analysis and explanations | — Pending |
| Curated library only for v1 (no custom links) | Polish and quality control over breadth | — Pending |
| Verse-by-verse sync (not line-by-line) | Simpler to implement, sufficient for learning experience | — Pending |
| Accounts required (not open access) | Enable progress tracking, freemium gating, user retention metrics | — Pending |
| AI-generated lyrics (not database-sourced) | Cheaper, more flexible, covers niche songs databases may miss | — Pending |

---
*Last updated: 2026-04-06 after initialization*
