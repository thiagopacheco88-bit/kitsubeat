---
created: 2026-04-16T20:55:17.438Z
title: Label song page sections so lesson is discoverable
area: ui
files:
  - src/app/songs/[slug]/page.tsx
  - src/app/songs/[slug]/components/SongContent.tsx
  - src/app/songs/[slug]/components/SongLayout.tsx
  - src/app/songs/[slug]/components/VocabularySection.tsx
  - src/app/songs/[slug]/components/GrammarSection.tsx
  - src/app/songs/[slug]/components/LyricsPanel.tsx
---

## Problem

Surfaced while QAing the Sign song page on 2026-04-16: the user opened the page expecting a clearly labeled "Lesson" section and concluded the lesson was missing. In reality the lesson IS the song page — it is composed of three pieces with no umbrella label:

1. Clickable lyric tokens at the top (inside [LyricsPanel.tsx](src/app/songs/%5Bslug%5D/components/LyricsPanel.tsx))
2. A collapsible Vocabulary section below the video/lyrics ([VocabularySection.tsx](src/app/songs/%5Bslug%5D/components/VocabularySection.tsx))
3. A collapsible Grammar Points section below that ([GrammarSection.tsx](src/app/songs/%5Bslug%5D/components/GrammarSection.tsx))

There is no separate `/lesson` route or wrapper labeled "Lesson", so first-time users do not realize they are already inside the lesson experience. Both collapsible sections being collapsed by default likely amplifies the "where is the lesson?" confusion.

This is a UX/discoverability concern, **not** a functional regression — content renders correctly. It should be addressed as design polish and must NOT block the upcoming Phase 7.5 QA suite work.

## Solution

Pick one (or stack two):

1. **Visible "Lesson" header** — Add a section header above the lyric/vocab/grammar block on the song page so first-time users immediately see they are inside the lesson. Cheapest fix.
2. **Onboarding hint / first-visit banner** — Brief one-time banner explaining that the lesson is composed of clickable tokens + Vocabulary + Grammar sections. Higher impact but adds dismissal/state plumbing.
3. **Single "Lesson" parent component** — Reorganize collapsible sections under a single visually grouped Lesson container with sub-sections (Lyrics, Vocabulary, Grammar). Most invasive but best information architecture.

Recommend starting with option 1, optionally combined with defaulting Vocabulary section to expanded on first visit. Revisit option 3 if user testing still shows confusion.

**Out of scope:** Adding a separate `/lesson` route — explicitly decided against in v1.0 architecture (song page IS the lesson). Do not introduce a new route to "fix" this.
