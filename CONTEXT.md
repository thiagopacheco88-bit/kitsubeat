# Resume Context

## Current Task
Quiz video format for KitsuBeat social (Reels, TikTok, Shorts).

## Key Decisions
- Thumbnail = frame 0 of video; cover on all platforms, barely perceptible on playback
- Thumbnail must match KitsuBeat brand (#0E0E0E, #dc2626, Inter) — not standalone
- Thumbnail content: icon + logo · "Quiz on [Anime] — Part X" · anime logo/art
- Use apple-touch-icon.png (Instagram square icon) in nav, not wordmark alone
- Countdown animation: icon center + 3 red orbiting dots + 3→2→1 tiles

## Next Steps
1. Pick layout from `public/quiz-thumbnail-v1.html` (A/B/C/D)
2. Source real anime logos for placeholders
3. Decide countdown duration (3s now, likely 5–10s needed)
4. Plan video flow: thumbnail → quiz screen → countdown → answer reveal

## Key Artifacts
- `public/quiz-thumbnail-v1.html` — 4 thumbnail layouts
- `public/quiz-countdown.html` — countdown animation
- `scripts/gen-thumbnail-v1.py` — thumbnail generator
- `scripts/gen-countdown-animation.py` — countdown generator
