---
phase: 01-content-pipeline
plan: 02
subsystem: data-pipeline
tags: [lrclib, genius, kuroshiro, kuromoji, nlp, japanese, lyrics, furigana, romaji, tokenization]

# Dependency graph
requires:
  - phase: 01-content-pipeline/01-01
    provides: "scripts/types/manifest.ts: SongManifestEntrySchema + SongManifestSchema"
provides:
  - "scripts/lib/lrclib.ts: fetchFromLrclib (two-step strategy with/without album_name) + parseLrc LRC format parser"
  - "scripts/lib/genius.ts: searchGenius + fetchGeniusLyrics plain-text scraper"
  - "scripts/lib/kuroshiro-tokenizer.ts: initKuroshiro + tokenizeLyrics → LyricsToken[] with surface/reading/romaji/pos"
  - "scripts/seed/02-fetch-lyrics.ts: CLI pipeline — LRCLIB → Genius → pending_whisper fallback chain with per-song JSON cache"
  - "data/lyrics-cache/{slug}.json: per-song cache with raw_lyrics, synced_lrc, tokens"
affects: [01-03, 01-04, 01-05, 01-06]

# Tech tracking
tech-stack:
  added:
    - kuroshiro@1.2.0
    - "@sglkc/kuromoji@1.1.0"
    - kuroshiro-analyzer-kuromoji
  patterns:
    - "Two-step LRCLIB fetch: try with album_name first (exact match), fallback without album_name (handles single/album name mismatch)"
    - "kuroshiro via KuromojiAnalyzer pointed at @sglkc/kuromoji dict path — avoids Node 18+ async dict loading issue"
    - "Tokenize via kuroshiro._analyzer._analyzer.tokenize() for raw kuromoji tokens; romaji via kuroshiro.convert() per token"
    - "Katakana reading → hiragana via charCodeAt offset 0x60"
    - "p-limit(2) concurrency for polite API usage; checkpoint/resume via existsSync per-song cache check"

key-files:
  created:
    - scripts/lib/lrclib.ts
    - scripts/lib/genius.ts
    - scripts/lib/kuroshiro-tokenizer.ts
    - scripts/seed/02-fetch-lyrics.ts
    - scripts/test-tokenizer.ts
  modified: []

key-decisions:
  - "LRCLIB two-step strategy: album_name first (exact), then no album_name — LRCLIB stores original single/album name, not anime title; without fallback, 100% of songs would fall through to pending_whisper"
  - "Use kuroshiro-analyzer-kuromoji (official adapter) pointed at @sglkc/kuromoji dict instead of directly instantiating @sglkc/kuromoji — avoids building a custom analyzer while still using the Node 18+-compatible fork"
  - "Tokenize per-token romaji via kuroshiro.convert(surface, {to:'romaji'}) rather than tokenizing the whole line — produces correct per-token hepburn without cross-token ambiguity"

patterns-established:
  - "kuroshiro init pattern: createRequire for CJS modules in ESM context; initKuroshiro() singleton with null check guard"
  - "Lyrics cache schema: {slug, title, artist, source, raw_lyrics, synced_lrc, tokens} — matches Plan 04 expected input"
  - "Source attribution preserved in cache: source field tracks lrclib/genius/pending_whisper for provenance"

requirements-completed: [CONT-02, CONT-03, CONT-04]

# Metrics
duration: 6min
completed: 2026-04-06
---

# Phase 1 Plan 02: Lyrics Fetching and kuroshiro Tokenization Pipeline Summary

**LRCLIB → Genius → pending_whisper fallback chain with per-song JSON cache; kuroshiro + @sglkc/kuromoji tokenizer producing hiragana readings and hepburn romaji for all kanji**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-06T15:51:37Z
- **Completed:** 2026-04-06T15:57:40Z
- **Tasks:** 2
- **Files modified:** 5 created, 0 modified

## Accomplishments

- LRCLIB client with two-step fetch strategy (with/without album_name fallback) and `[mm:ss.xx]` LRC parser supporting 2- and 3-digit centisecond fields
- Genius client with API search + HTML scraper extracting lyrics from `data-lyrics-container` divs with BR→newline conversion and HTML entity decoding
- kuroshiro tokenizer using `@sglkc/kuromoji` dict path via `KuromojiAnalyzer` — produces LyricsToken[] with correct hiragana readings (声→こえ) and hepburn romaji (声→koe) for kanji
- Full pipeline script iterating manifest songs with p-limit(2) concurrency, checkpoint/resume (skip existing cache files), and source summary output

## Task Commits

Each task was committed atomically:

1. **Task 1: Create lyrics sourcing clients and kuroshiro tokenizer** - `29fc020` (feat)
2. **Task 2: Create the lyrics fetching + tokenization pipeline script** - `a48c314` (feat)

## Files Created/Modified

- `scripts/lib/lrclib.ts` - LRCLIB API client: two-step fetch (with/without album_name) + LRC `[mm:ss.xx]` parser
- `scripts/lib/genius.ts` - Genius API: search endpoint + HTML lyrics scraper (data-lyrics-container div extraction)
- `scripts/lib/kuroshiro-tokenizer.ts` - kuroshiro + @sglkc/kuromoji wrapper; initKuroshiro() singleton; tokenizeLyrics() → LyricsToken[]
- `scripts/seed/02-fetch-lyrics.ts` - Main pipeline: manifest loader, fallback chain, p-limit concurrency, cache write, summary stats
- `scripts/test-tokenizer.ts` - Verification script for kuroshiro init and tokenization

## Decisions Made

- LRCLIB two-step strategy (with album_name → without): LRCLIB stores the original single or album name (e.g., "Gurenge"), not the anime title (e.g., "Kimetsu no Yaiba"). Without the fallback, every song using the anime title as album_name returns 404 and falls to pending_whisper.
- Used `kuroshiro-analyzer-kuromoji` adapter (official kuroshiro plugin) pointed at `@sglkc/kuromoji` dict path: avoids writing a custom analyzer, retains the Node 18+ compatible fork's dict, and works cleanly with the kuroshiro API.
- Per-token romaji conversion via `kuroshiro.convert(surface, { to: 'romaji', mode: 'normal' })`: converting individual tokens (not whole lines) prevents cross-token ambiguity in hepburn transliteration.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] LRCLIB album_name parameter causes 404 for anime-titled album fields**
- **Found during:** Task 2 (pipeline verification)
- **Issue:** Plan specified passing `anime` as `album_name` to LRCLIB API. LRCLIB stores the original release album name (e.g., "Gurenge" single), not the anime title ("Kimetsu no Yaiba"). Passing the anime title as album_name returns 404 for virtually all anime songs.
- **Fix:** Added two-step fetch strategy in `fetchFromLrclib`: try with album_name first (exact match when LRCLIB does have anime title in album), then retry without album_name.
- **Files modified:** scripts/lib/lrclib.ts
- **Verification:** Test run with "Gurenge" by LiSA and "homura" by LiSA — both returned 200 with synced LRC lyrics; 100 kanji tokens with correct readings verified.
- **Committed in:** `a48c314` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug)
**Impact on plan:** Fix necessary for any LRCLIB match to succeed. Without it, 100% of songs fall through to pending_whisper regardless of LRCLIB coverage. No scope creep.

## Issues Encountered

- kuroshiro is a CommonJS module — used `createRequire(import.meta.url)` in the ESM tokenizer file to import it correctly in the Node `"type": "module"` context.
- kuroshiro-analyzer-kuromoji internally requires vanilla `kuromoji` as a peer dep. Both `kuromoji` (installed via kuroshiro-analyzer-kuromoji) and `@sglkc/kuromoji` are present; we use `@sglkc/kuromoji`'s dict path via the `dictPath` constructor option.

## User Setup Required

Before running `02-fetch-lyrics.ts`, the manifest must exist:
```bash
# First: build the manifest (requires API keys from plan 01-01)
npx tsx scripts/seed/01-build-manifest.ts

# Then: fetch lyrics (GENIUS_API_KEY is optional; LRCLIB requires no key)
GENIUS_API_KEY=your_key npx tsx scripts/seed/02-fetch-lyrics.ts
```

To enable Genius fallback, add to `.env.local`:
```
# Genius Developer Portal: genius.com/api-clients → Create App → Client Access Token
GENIUS_API_KEY=your_client_access_token_here
```

Note: If `GENIUS_API_KEY` is not set, the Genius fallback is silently skipped. Songs not found on LRCLIB will be marked `pending_whisper`.

## Next Phase Readiness

- Plan 01-03 (audio timing / WhisperX) can proceed: `pending_whisper` songs are marked for transcription
- Plan 01-04 (Claude content generation) ready to consume: `data/lyrics-cache/{slug}.json` provides `raw_lyrics` and pre-computed `tokens` (reading + romaji) as input context for each song
- Songs with `synced_lrc` from LRCLIB have millisecond-accurate line timestamps usable for verse boundary hints in Plan 04
- Blocker: manifest must exist before lyrics fetch; manifest build requires YouTube API quota (see Plan 01-01 notes)

## Self-Check: PASSED

- scripts/lib/lrclib.ts: FOUND
- scripts/lib/genius.ts: FOUND
- scripts/lib/kuroshiro-tokenizer.ts: FOUND
- scripts/seed/02-fetch-lyrics.ts: FOUND
- scripts/test-tokenizer.ts: FOUND
- Commit 29fc020: FOUND
- Commit a48c314: FOUND

---
*Phase: 01-content-pipeline*
*Completed: 2026-04-06*
