# Phase 1: Content Pipeline - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Pre-generate all lesson content for 200 anime songs offline via Claude API and validate 100% coverage with the QA agent. This includes: song manifest creation, lyrics sourcing, verse timing data, grammar/vocabulary breakdowns, translations (EN/PT-BR/ES), and a web-based timing editor for corrections. The player UI, user accounts, and discovery features are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Song manifest & sourcing
- Song selection is **popularity-driven** — pull from ranked lists (MyAnimeList, Spotify, AniDB) to select top anime openings/endings
- Lyrics sourced via **dual strategy**: fetch from public lyric APIs first, fall back to AI-generated (Whisper transcription) only when database has no match. Search is done once per song and persisted
- Each song carries: title, artist/band/singer, anime + season info (e.g., "Naruto Shippuden OP 16"), YouTube video ID, genre & mood tags, year launched
- **JLPT difficulty assigned automatically by Claude** during content generation based on vocabulary/grammar analysis — no manual tagging pass

### Verse timing strategy
- **AI-approximated first, manual correction second** — use speech detection (Whisper or similar) to auto-generate initial timestamps, then correct via editor
- Timing granularity is **per word** (karaoke-style) — each word gets its own start/end timestamp
- A **production-grade web-based timing editor** is part of this phase — shows waveform + lyrics, drag-to-adjust word positions. Built as a lasting admin tool for ongoing content additions, not a throwaway dev utility

### Lesson content depth
- Grammar breakdowns are **full depth**: grammar tags (verb, particle, adjective, etc.) with color coding + one-line explanation + full conjugation path (dictionary form → te-form → combined) + JLPT grammar point reference
- Vocabulary categorized **by part of speech** with JLPT level (N5–N1) displayed small on the left of each entry
- Example sentences: **song context is primary** (highlighted), with additional example sentences shown at lower visual prominence
- Verse-by-verse explanations: **literal meaning first, then cultural/emotional context** as a secondary note

### Translation approach
- Translation style is **natural/fluent** — reads naturally in the target language, even if word order differs from Japanese
- Portuguese is **Brazilian Portuguese (PT-BR)**
- Content schema is **extensible** for adding new languages later without regenerating existing content
- Culturally untranslatable concepts (honorifics, onomatopoeia, set phrases): **Claude's discretion per case** — sometimes translate, sometimes keep original with explanation

### Claude's Discretion
- Handling of culturally untranslatable concepts (translate vs. keep original — case by case)
- Exact AI model/service for speech-to-text timing extraction
- Additional example sentence count and difficulty spread per vocabulary word
- Content schema design for language extensibility

</decisions>

<specifics>
## Specific Ideas

- Lyrics sourcing is a layered fallback: public API → database cache → AI transcription as last resort
- The timing editor should be a production admin panel feature, not a dev-only tool — it will be used for ongoing catalog expansion after launch
- JLPT difficulty badges should appear small/subtle next to vocabulary entries, not as the primary grouping
- Song context example should be visually distinct (more prominent) from supplementary examples

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-content-pipeline*
*Context gathered: 2026-04-06*
