---
phase: 01-content-pipeline
plan: 03
subsystem: pipeline
tags: [whisperx, yt-dlp, python, typescript, timing, word-alignment, karaoke, audio]

# Dependency graph
requires:
  - phase: 01-01
    provides: "scripts/types/manifest.ts: SongManifestSchema with slug + youtube_id per song"
  - phase: 01-02
    provides: "data/lyrics-cache/{slug}.json: source=pending_whisper songs needing lyrics reconstruction"
provides:
  - "scripts/seed/04-extract-timing.py: Python CLI — yt-dlp download + WhisperX CTC forced alignment; outputs word-level timing JSON; single-song and batch modes with checkpoint/resume"
  - "scripts/lib/run-whisperx.ts: TypeScript wrapper with WordTiming + TimingResult types; runWhisperXForSong(), runWhisperXBatch(), readTimingCacheForSong()"
  - "scripts/seed/04b-backfill-whisper-lyrics.ts: backfill script — reads timing-cache words, reconstructs raw_lyrics, re-tokenizes via kuroshiro, writes back to lyrics-cache"
  - "requirements.txt: Python pip dependencies for timing pipeline"
  - "data/timing-cache/{slug}.json: word-level timing per song (generated at runtime)"
  - "public/audio/{slug}.mp3: audio files for Plan 05 timing editor waveform"
affects: [01-04, 01-05, 01-06]

# Tech tracking
tech-stack:
  added:
    - whisperx>=3.1.1
    - yt-dlp>=2024.1.0
    - faster-whisper>=1.0.0
    - torch>=2.0.0
    - torchaudio>=2.0.0
    - pyannote.audio>=3.1.0
  patterns:
    - "Python script with argparse: single-song and --batch modes with --force flag"
    - "Checkpoint/resume at both Python level (skip if JSON exists) and TypeScript level"
    - "Device detection: cuda if torch.cuda.is_available() else cpu; float16 for GPU, int8 for CPU"
    - "Low-confidence flagging: score < 0.6 adds low_confidence=true per word"
    - "Silence gap heuristic: 500ms gap between words triggers newline in reconstructed lyrics"
    - "TypeScript wrapper returns null on Python non-zero exit — pipeline continues"

key-files:
  created:
    - scripts/seed/04-extract-timing.py
    - scripts/lib/run-whisperx.ts
    - scripts/seed/04b-backfill-whisper-lyrics.ts
    - requirements.txt
  modified: []

key-decisions:
  - "Low-confidence threshold at 0.6: words below this score get low_confidence=true flag, enabling timing editor to prioritize review"
  - "mp3 retained in public/audio/ after extraction (not deleted): Plan 05 timing editor uses wavesurfer.js waveform rendering"
  - "500ms silence gap heuristic for newlines: approximates lyric line structure from timing data without access to original lyrics"
  - "TypeScript wrapper returns null on failure (not throw): single-song failures should not abort batch pipeline runs"
  - "runWhisperXBatch uses promisified exec with 12-hour timeout: batch of 200 songs on CPU can take hours"

patterns-established:
  - "Python+TypeScript shelling pattern: Python does ML-heavy work, TypeScript wraps for pipeline integration via child_process"
  - "Null-return error strategy for pipeline steps: non-fatal failures return null, caller logs and continues"
  - "Reconstruction from timing data: when source text unavailable, reconstruct from alignment output (imperfect but functional)"

requirements-completed: [CONT-09]

# Metrics
duration: 4min
completed: 2026-04-06
---

# Phase 1 Plan 03: WhisperX Timing Extraction Pipeline Summary

**Python WhisperX pipeline with yt-dlp audio download and CTC forced alignment producing word-level `{ word, start, end, score }` timestamps; TypeScript wrapper for pipeline integration; backfill script to reconstruct raw_lyrics for pending_whisper songs**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-06T16:00:34Z
- **Completed:** 2026-04-06T16:04:00Z
- **Tasks:** 3
- **Files modified:** 4 created, 0 modified

## Accomplishments

- Python extraction script with single-song CLI and `--batch` mode for all 200 songs; checkpoint/resume skips already-cached songs; low-confidence flagging for words with alignment score < 0.6; mp3 copied to `public/audio/` for Plan 05 wavesurfer.js waveform; device auto-detection (CUDA/CPU with appropriate compute types)
- TypeScript wrapper (`run-whisperx.ts`) exports `WordTiming` and `TimingResult` types used by Plan 05 timing editor and Plan 06 DB insertion; `runWhisperXForSong()` returns null on Python failure keeping batch pipeline alive
- Backfill script (`04b-backfill-whisper-lyrics.ts`) reconstructs `raw_lyrics` from WhisperX word arrays using 500ms silence gap heuristic for line breaks; re-tokenizes via kuroshiro; updates `source` from `pending_whisper` to `whisper` — ensures Plan 04 content generation always has non-empty lyrics

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the Python WhisperX timing extraction script** - `6c02d9e` (feat)
2. **Task 2: Create TypeScript wrapper for invoking WhisperX from the pipeline** - `749ed93` (feat)
3. **Task 3: Backfill lyrics-cache for pending_whisper songs from WhisperX output** - `b7e02a2` (feat)

## Files Created/Modified

- `scripts/seed/04-extract-timing.py` — Python CLI: yt-dlp download + WhisperX model load + forced alignment + word extraction + JSON output; `--batch` mode processes full manifest; `--force` flag to re-process cached songs
- `scripts/lib/run-whisperx.ts` — TypeScript wrapper: `WordTiming`, `TimingResult` types; `runWhisperXForSong()`, `runWhisperXBatch()`, `readTimingCacheForSong()` exported
- `scripts/seed/04b-backfill-whisper-lyrics.ts` — Backfill script: reads pending_whisper lyrics-cache entries, reads timing-cache words, reconstructs raw_lyrics, re-tokenizes via kuroshiro, writes updated lyrics-cache with `source: "whisper"`
- `requirements.txt` — Python dependencies: whisperx, yt-dlp, faster-whisper, torch, torchaudio, pyannote.audio

## Decisions Made

- Low-confidence threshold set at 0.6 (plan-specified): words with WhisperX alignment score below this are flagged with `low_confidence: true` for the timing editor to prioritize review
- mp3 files retained in `public/audio/{slug}.mp3` after extraction: Plan 05 wavesurfer.js timing editor needs the audio for waveform rendering; original tmp copy removed after copy
- 500ms silence gap heuristic for lyric line breaks: no canonical line structure is available from transcription alone; 500ms is a common sentence-boundary threshold for Japanese speech
- TypeScript wrapper returns `null` on Python non-zero exit rather than throwing: single-song WhisperX failures (e.g., regional geo-block, corrupted audio) should not abort a 200-song batch run
- `runWhisperXBatch` uses promisified `exec` with 12-hour timeout: CPU-only WhisperX on 200 songs can take 3–8 hours; synchronous `execSync` would block the event loop

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Before running the timing extraction pipeline:

```bash
# Install Python dependencies
pip install -r requirements.txt

# Single song (test)
python scripts/seed/04-extract-timing.py <slug> <youtube_id>

# Full batch (requires songs-manifest.json from Plan 01)
python scripts/seed/04-extract-timing.py --batch data/songs-manifest.json

# Backfill pending_whisper songs after batch completes
npx tsx scripts/seed/04b-backfill-whisper-lyrics.ts
```

GPU note: WhisperX with `large-v3` on CPU is significantly slower. For 200 songs, a GPU (CUDA 11.8+) is strongly recommended.

## Next Phase Readiness

- Plan 04 (content generation): all songs will have non-empty `raw_lyrics` + `tokens` in lyrics-cache after backfill runs; `data/timing-cache/{slug}.json` provides word-level timing as input to Claude Batch API
- Plan 05 (timing editor): `WordTiming` and `TimingResult` types exported from `run-whisperx.ts` ready for import; `public/audio/{slug}.mp3` will exist for wavesurfer.js waveform rendering
- Plan 06 (DB insertion): `TimingResult` type from `run-whisperx.ts` can be imported directly for inserting timing data into the songs table `timing_data` JSONB column
- Operational dependency: full pipeline requires GPU for practical execution time on 200 songs; YouTube yt-dlp download is subject to geo-restrictions and rate limiting

---
*Phase: 01-content-pipeline*
*Completed: 2026-04-06*
