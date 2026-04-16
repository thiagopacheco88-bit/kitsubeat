---
created: 2026-04-16T06:15:04.837Z
title: Enforce full Japanese-line coverage in lesson prompt
area: tooling
files:
  - scripts/lib/lesson-prompt.ts:107
  - scripts/seed/03-generate-content.ts
  - src/app/songs/[slug]/components/LyricsPanel.tsx
  - data/lessons-cache/sign-flow.json
  - data/lyrics-cache/sign-flow.json
---

## Problem

The lesson-generation prompt at [scripts/lib/lesson-prompt.ts:107](scripts/lib/lesson-prompt.ts#L107) (§1 "Verse Segmentation") tells the LLM to collapse repeating choruses into a single verse — correct — but never requires that **every Japanese lyric line** map to at least one verse. As a result the LLM skips "filler" lines that have no strong learning value, and the lyrics panel has nothing to highlight during those windows.

Surfaced while fixing the multi-occurrence sync bug on sign-flow (LyricsPanel.tsx, commit b4b7e68 range). After that fix, the timing algorithm itself is correct: when a verse has no match for the current timestamp, the highlight stays on the previous matched verse. That behavior is acceptable short-term but is a symptom of incomplete lesson data.

Concrete scope for sign-flow — 11 Japanese lines in [data/lyrics-cache/sign-flow.json](data/lyrics-cache/sign-flow.json) have no corresponding verse in [data/lessons-cache/sign-flow.json](data/lessons-cache/sign-flow.json), accounting for ~30s of playback where the highlight is stale:

- 42.28s  その足を引きずりながらも
- 53.34s  気付けば風の音だけが...
- 88.24s  「傷付かない強さよりも 傷つけない優しさを」
- 93.58s  その声はどこか悲しそうで
- 99.24s  掛け違えた ボタンみたいに
- 101.88s こころ身体 離れていった
- 104.64s もう一度 心を掴んで
- 155.79s いつか聞いた あの泣き声は
- 158.47s 間違いなくそう 自分のだった
- 161.28s 全てはこの時のために
- 179.62s 気付いてくれた 君への合図
- 196.14s それなら もう恐れるものはないんだと
- 200.96s 忘れないでね 笑顔の訳を

This is almost certainly systemic — other songs in the catalog likely have similar gaps since the prompt applies globally.

## Solution

**Preferred — pipeline fix + regen:**

1. Update [scripts/lib/lesson-prompt.ts](scripts/lib/lesson-prompt.ts) §1 "Verse Segmentation" to add a coverage requirement: every Japanese lyric line must map to at least one verse; only English-only lines and pure instrumental markers may be omitted. Keep the existing "chorus repeats collapse to one verse" rule.
2. Write a one-off audit script: for each entry in `data/lyrics-cache/*.json`, run the same normalize-and-match logic from [LyricsPanel.tsx](src/app/songs/[slug]/components/LyricsPanel.tsx) `buildVerseTiming` against the paired `data/lessons-cache/*.json` verses. Report unmatched-line count per song.
3. Regenerate lessons for affected songs via [scripts/seed/03-generate-content.ts](scripts/seed/03-generate-content.ts) (or 03b for sequential). Start with sign-flow to validate the prompt change, then batch the rest.
4. Re-run [scripts/seed/05-insert-db.ts](scripts/seed/05-insert-db.ts) and refresh `data/lessons-cache/` for each.

**Fallback — spot-patch sign-flow only:**

Targeted LLM call that accepts the existing lesson + list of missing lines, returns verse objects for just those lines, splice into the verses array, renumber verse_number sequentially, write back. Faster but risks translation/grammar style drift from the original generation and doesn't fix the class of bug.

**Costs / blast radius:**
- Option 1 involves N Claude API calls (one per affected song) and overwrites N rows in the songs/verses DB tables plus N cache files.
- Option 2 is one API call and one DB row/file update.
- Neither is automatic — get user authorization before kicking off.
