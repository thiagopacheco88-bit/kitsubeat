# Spike Wrap-Up Summary

**Date:** 2026-05-17
**Spikes processed:** 1
**Feature areas:** Anime Vocabulary Quiz Video
**Skill output:** `.claude/skills/spike-findings-kitsubeat/`

## Processed Spikes

| # | Name | Verdict | Feature Area |
|---|------|---------|--------------|
| 001 | anime-vocab-quiz-video | VALIDATED | Social media video |

## Key Findings

- HyperFrames (HTML → MP4) is the right tool for quiz card videos — no build step, pure HTML/CSS/GSAP
- Split-voice audio is required: Edge TTS `ja-JP-NanamiNeural` for Japanese, ElevenLabs Sarah for English, stitched with ffmpeg
- Kanji in TTS text causes Mandarin mispronunciation — always use hiragana in the `jp` field
- Options show romaji only; kanji appears only on the reveal card
- 5 questions = ~77s = fine for IG Reels + TikTok, too long for YouTube Shorts (60s cap)
- Only two things change per new anime video: the `QUESTIONS` array (JS) and the `WORDS` array (generate-audio.js)
