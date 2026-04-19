# Song Ingestion SOP

Standard process for adding a new anime song to KitsuBeat with both **TV** and **full** versions, with explicit checks at every gate to prevent the sync-failure modes we've hit before.

## Principles

- **Studio audio only.** Never accept live versions, fan covers, remixes, or AMVs — they have crowd noise, missing verses, and re-arranged chorus structure that destroy WhisperX timing and lyrics alignment.
- **Lyrics must match the audio cut.** A "full" lyrics file paired with a "TV cut" video will misalign every verse after the truncation point.
- **TV is a derivation, not a re-fetch.** Per `feedback_tv_lesson_alignment`, TV lessons are LCS-aligned subsets of the full lesson. Don't regenerate.
- **Inline LLM, not Batch API.** Per `feedback_inline_llm_generation`. Run lesson generation in-session.
- **Every gate has a rollback.** Anything that touches the DB runs in a transaction; anything that touches a cache file is idempotent.

## Sync failure modes & checks

| # | Failure | Symptom in app | Gate that catches it |
|---|---------|----------------|----------------------|
| 1 | Wrong YouTube source (live/cover/remix/AMV) | Karaoke highlight drifts; words don't match audio | Gate 2: scoring penalties + manual top-3 review |
| 2 | Lyrics from different cut than video | First verse syncs, then drift after first chorus | Gate 4: word-count alignment check |
| 3 | WhisperX hallucinated words on instrumental | Phantom highlights in intro/outro | Gate 5: per-segment confidence threshold |
| 4 | WhisperX detected wrong language | Tokens unparseable; romaji is gibberish | Gate 5: forced `--language ja`, post-check kuroshiro parse rate |
| 5 | TV cut has different verse order than full | LCS alignment fails | Gate 6: LCS coverage ≥ 70% |
| 6 | Lyrics text has typos / wrong romanization | Tokenizer drops tokens | Gate 4: kuroshiro parse rate ≥ 95% |
| 7 | YouTube video later removed (link rot) | App shows blank player | Gate 8: pre-insert oEmbed check |
| 8 | LRC line breaks don't match WhisperX segments | Highlight skips lines | Gate 7: visual UAT in dev |
| 9 | Wrong year_launched / artist | Genius search misses → false pending_whisper | Gate 1: cross-reference 2 sources before adding to candidates |
| 10 | Lesson skips "filler" Japanese lines | Lyric panel highlight stays stale for 5-30s of playback | Gate 7a: line-coverage audit (every JP line maps to ≥1 verse) |
| 11 | Lesson tokens emitted in romaji instead of kana/kanji | LCS alignment to TV lyrics fails at 0% overlap; LyricsPanel match fails | Gate 7: script-variant check (reject if >5% tokens are latin-only) |
| 12 | TV YouTube video contains only voiceover / silence / wrong song | WhisperX transcribes the outro "ご視聴ありがとうございました"; 0% LCS vs full | Gate 2: score the TV candidate's audio content (reject on >50% non-song duration) |
| 13 | English interjection splits Japanese into <6-char chunks | Audit reports false-negative unmatched even after verse added | Gate 7a: always include English-in-Japanese tokens as `grammar: "other"` |

## The 8 gates

### Gate 1 — Curation (manual review of new candidates)

**Input:** Candidate row `{slug, title, artist, anime, season_info, year_launched}`.

**Checks (must all pass before promoting to manifest):**
- `slug` is unique against `data/songs-manifest.json` and `data/songs-candidates.json`.
- `title` + `artist` cross-referenced against MAL/AniDB/Wikipedia (at least 2 of 3 agree).
- `season_info` matches the OP/ED number on the source (e.g. AniDB).
- `year_launched` matches the original anime air date, not a re-release.

**Tooling:** Add to `data/songs-candidates.json` first. Promote to `data/songs-manifest.json` after Gate 1 passes.

### Gate 2 — YouTube selection (full + TV)

**Tool:** `scripts/seed/09-find-tv-size.ts` (already implements scoring with `live`/`cover`/`remix` penalties).

**Checks:**
- **Full version**: duration 180-360s (3-6 min). Penalize anything outside.
- **TV version**: duration 60-150s (1-2.5 min).
- Score ≥ 30 to auto-accept. Score 0-29 → log for manual review. Score < 0 → reject.
- Title contains anime name OR `OP`/`ED`/`opening`/`ending` keyword.
- Channel is on `PREFERRED_CHANNELS` list OR title contains `creditless`/`ncop`/`nced`/`tv size`/`official`.
- **Reject if title contains:** `live`, `cover`, `remix`, `nightcore`, `karaoke`, `instrumental`, `8d`, `slowed`, `reverb`, `acoustic` (unless studio acoustic confirmed).

**Output:** `youtube_id` (full) and `youtube_id_short` (TV) on `songs` row. Run `10-prepare-tv.ts` to materialize TV stub.

### Gate 3 — Lyrics fetch (full version only)

**Tool:** `scripts/seed/02-fetch-lyrics.ts` (LRCLIB → Genius → pending_whisper fallback).

**Checks:**
- Prefer LRCLIB (synced LRC available — best for sync).
- If Genius: kuroshiro-tokenize and verify ≥ 95% of tokens parse.
- If pending_whisper: WhisperX will fill it (Gate 5).

**Do NOT fetch lyrics for the TV cut.** TV lyrics are derived in Gate 6.

### Gate 4 — Lyrics-vs-source consistency

**Run after Gate 3, before Gate 5.**

**Checks:**
- Word count of fetched lyrics within 30% of expected (3-5 min studio song ≈ 200-500 words).
- No HTML/footnote artifacts (`[Verse 1]`, `[Chorus]`, `[1]`, `<i>` etc.) — strip if present.
- kuroshiro parse rate ≥ 95% of tokens.

**Failure action:** Re-fetch from alternate source, or mark `pending_whisper`.

### Gate 5 — WhisperX timing extraction (full + TV)

**Tool:** `scripts/seed/04-extract-timing.py --batch <manifest> --output-dir <timing-cache>`.

**Force these flags (must be set in `run-whisperx.ts`):**
- `--language ja` (never auto-detect — JP songs with English chorus get mis-detected).
- `--model large-v3` (smaller models miss particles).
- `--align_model` Japanese-specific.

**Per-song checks after extraction:**
- Output JSON not empty.
- ≥ 80% of detected words have non-zero duration.
- No segment with avg word duration > 1.5s (likely hallucination on instrumental).
- For TV cut: total duration within 10% of YouTube duration.

**Then:** `04b-backfill-whisper-lyrics.ts --version <tv|full>` reconstructs `raw_lyrics` for any `pending_whisper` entries.

### Gate 6 — TV lesson derivation (NOT regeneration)

**Tool:** `scripts/seed/10b-derive-tv-lessons.ts`.

**Approach:** LCS-align TV lyrics against full lesson; filter full lesson to only verses present in TV.

**Checks:**
- LCS coverage ≥ 70% (TV is genuinely a subset of full).
- Verse count in derived TV lesson > 0.

**Failure action:** Manual review. Either the TV cut comes from a different recording (rare) or the WhisperX TV transcription is broken — re-run Gate 5 with cleaner audio.

### Gate 7 — Lesson generation (full version only)

**Tool:** `scripts/seed/03-generate-content.ts` (inline, not Batch).

**Prompt requirements (enforced in `scripts/lib/lesson-prompt.ts` §1):**
- Every Japanese lyric line maps to ≥ 1 verse (coverage rule). Choruses collapse to a single verse; only English-only lines and instrumental markers may be omitted.
- Verse order matches song flow (important — `LyricsPanel.buildVerseTiming` walks verses sequentially against `synced_lrc`).

**Checks (already in `06-qa-agent.ts`):**
- Every verse has ≥ 1 vocab item.
- Every grammar point has an example.
- JLPT level assigned.
- No empty translations.

**Script-variant check (new, prevents romaji-bug):**
- Count tokens whose `surface` is latin-only (`/^[A-Za-z0-9\s]+$/`). Must be < 5% of total verse tokens. If higher, the LLM mis-rendered the lyrics as romaji — reject and regenerate.

### Gate 7a — Lesson-line coverage audit

**Tool:** `scripts/seed/audit-lesson-coverage.ts` (run per slug after Gate 7, before Gate 8).

**What it does:** normalises every Japanese lyric line (same regex as `LyricsPanel.buildVerseTiming`) and checks each is a substring of some verse's concatenated-token blob (or matches via 6-char sliding window).

**Pass criterion:** `unmatched = 0` for this slug in `data/lesson-coverage-audit.csv`.

**Fail recovery (surgical insertion, no re-gen cost):**
1. Write `.planning/verse-patches/<slug>.json` with new verses + insertion markers:
   ```json
   { "patches": [{ "after_original": N, "verse": { "tokens": [...], "translations": {...}, "literal_meaning": {...}, "start_time_ms": 0, "end_time_ms": 0 } }] }
   ```
2. Run `npx tsx scripts/seed/apply-verse-patch.ts <slug>` — splices into `data/lessons-cache/<slug>.json`, renumbers `verse_number` sequentially.
3. Re-run the audit — slug must hit 0 unmatched. (If not, see edge cases below.)
4. Reload into DB: `npx tsx scripts/sync-lessons-to-song-versions.ts --slug=<slug>`.

**Edge cases to watch (all encountered in the 2026-04-19 retrofit):**
- **English interjections splitting Japanese** (`HEYHEY! 人間傘下 HEYHEY! 人間不安感`, `Dancin' 心臓の Bloody`): include the English as `grammar: "other"` tokens in the verse, otherwise the 6-char overlap fails across the split.
- **Parenthetical furigana** (`この瞬間(とき)を`, `《心臓(いのち)》 見送って`): normalize strips `()` but the furigana text survives in the lyric line. Include both the kanji and the kana reading as separate tokens (e.g. tokens include both `瞬間` and `とき`).
- **Unusual bracket characters** (`《 》` book-quote markers): the normalize regex doesn't strip them. Include them as "other" tokens so the verse blob contains them, OR add to the normalize regex in both the audit AND `LyricsPanel.buildVerseTiming` for consistency.
- **Verses with `start_time_ms: 0, end_time_ms: 0`** on new patches are acceptable — timing comes from `synced_lrc` matching at render time, not from these fields.

### Gate 8 — Pre-insert verification + DB write

**Pre-insert:**
- oEmbed-check both `youtube_id`s still resolve (`https://www.youtube.com/oembed?url=...`).
- Schema-validate full lesson JSON against `scripts/types/lesson.ts`.

**DB write:** `05-insert-db.ts --version full` then `--version tv`. Wrap each song in a transaction.

**Post-insert visual UAT (dev server):**
- `npm run dev`, open the song, scrub to 3 timestamps (intro, mid-chorus, outro). Highlight position must match audio within 200ms at every checkpoint.
- Toggle TV ↔ Full. Both render. Both highlight correctly.

## Batch execution order

For N new songs, run gates in this order to maximize parallelism and minimize cost:

```
Gate 1 (manual)
  ↓
Gate 2 full      Gate 2 TV     ← parallel, both use YouTube quota
  ↓                ↓
Gate 3 (lyrics)    │
  ↓                │
Gate 4             │
  ↓                ↓
Gate 5 full      Gate 5 TV     ← parallel, both run WhisperX
  ↓                ↓
Gate 7           Gate 6 (derive from full)
  ↓                ↓
Gate 7a (audit)    │
  ↓                ↓
              Gate 8
```

## Cost ceilings (per song)

- **YouTube quota:** ~200 units (full search + TV search).
- **WhisperX:** ~2-4 min on GPU per version, so ~4-8 min total.
- **LLM (lesson gen):** ~$0.30 with Sonnet, ~$1.50 with Opus.
- **Disk:** ~10 MB cache per song.

For 100 new songs: ~20k YouTube quota (2 days at default 10k/day), ~10h WhisperX, ~$30-150 LLM.

## When to abort

Stop the batch and report if any of:
- YouTube quota error (resume next day).
- > 20% of songs in the batch fail Gate 2 (likely a query format bug).
- WhisperX OOM or model load failure (likely env issue, not data).
- Any DB transaction fails (corrupted schema or migration drift).
