---
created: 2026-04-18T19:00:00.000Z
title: Fix 4 TV-lesson derivation stragglers (upstream data quality)
area: tooling
files:
  - scripts/seed/10b-derive-tv-lessons.ts
  - data/lessons-cache/my-answer-seamo.json
  - data/lessons-cache/mountain-a-go-go-too-captain-straydum.json
  - data/lessons-cache/newsong-tacica.json
  - data/lessons-cache/whats-up-people-maximum-the-hormone.json
  - data/timing-cache-tv/my-answer-seamo.json
  - data/timing-cache-tv/mountain-a-go-go-too-captain-straydum.json
  - data/timing-cache-tv/newsong-tacica.json
  - data/timing-cache-tv/whats-up-people-maximum-the-hormone.json
---

## Problem

4 of 60 TV songs failed `10b-derive-tv-lessons.ts` with `[no_detected_verses]`. All 4 have **0% 4-gram overlap** between the TV WhisperX transcript and the full-version lesson tokens — LCS alignment cannot recover. The other 56 loaded cleanly via `10c-load-tv-lessons.ts` on 2026-04-18.

Each failure has a distinct upstream cause, **not** an alignment bug:

### 1. `my-answer-seamo`
- TV transcript: "だいたいいつも通りにその角を曲がれば人波に紛れ込み溶けてきて..."
- Full lesson tokens: "今出来なくても焦らないで慌てないで..."
- 0% overlap. Either the TV `youtube_id` is a different song, or the TV cut is a completely rearranged alt-version. Verify against the actual YouTube video for the SeamO TV row in `song_versions`.

### 2. `mountain-a-go-go-too-captain-straydum`
- TV transcript (Japanese kana/kanji): "僕たまに僕たまに夢にあふれる人のかけらが山のように見える..."
- Full lesson tokens (**romaji**): "Get upSumimasenBokutama niYumeniyabureruhitonokakeragaYamanoyou nimieru..."
- **Content is the same** — the full lesson tokens were written in romaji instead of Japanese. This is a data-quality bug in the full lesson. Fix: regenerate this full-version lesson with proper kanji/kana tokens (or hand-patch), then re-run 10b.

### 3. `newsong-tacica`
- TV transcript is a YouTube outro voiceover: "ああああああああああご視聴ありがとうございました。" plus silence.
- Full lesson content: "歪なメロディーで出来た愛されるべき生き物だ..."
- The YouTube video WhisperX transcribed may be silent for most of the TV cut (instrumental opening), a karaoke track (no vocals), or credits-heavy. Inspect the video or replace the TV `youtube_id`.

### 4. `whats-up-people-maximum-the-hormone`
- TV transcript: "What'supwithmymind?...アーメンボール!"
- Full lesson: "便利便利万歳人間ほらビリビリ怒らすか..."
- Maximum the Hormone OP1 has heavy English screaming vocals WhisperX typically fails on. TV cut likely does contain the song, but the transcript is unusable. Options: (a) hand-transcribe the TV portion; (b) skip TV variant for this song and only ship full-version; (c) try a different ASR with better metal/screamo tolerance.

## Solution

Case-by-case — don't block the rest of the launch on these 4:

1. **mountain-a-go-go** — fastest fix. Regen full-version lesson (force tokens = Japanese, not romaji). Re-run `10b --slug mountain-a-go-go-too-captain-straydum`, then `10c`.
2. **my-answer-seamo + newsong-tacica** — verify TV `youtube_id` is correct. If wrong, replace via existing TV-video-finder tooling. If correct but content differs / silent, treat as "TV variant unavailable" and mark the TV row somehow (or hand-transcribe).
3. **whats-up-people** — lowest priority. If hand-transcription is too expensive, accept full-only coverage for this song.

**Downstream impact:** for these 4 songs, the TV toggle on the song page will currently have `lesson=NULL` on the TV row, meaning the toggle either won't render or will render with no content. Verify `SongContent.tsx` handles the null-lesson case gracefully in the meantime.
