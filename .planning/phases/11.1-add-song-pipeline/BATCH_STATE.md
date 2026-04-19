# 25-Song Batch — Pipeline State

Tracks the in-flight ingestion of the 25-song candidates batch. Each fresh Claude session updates the relevant row when work completes.

## Queue (24 songs after dropping `tank-the-seatbelts`)

| # | slug | YT (full) | Lyrics | WhisperX | Lesson | Gate 8 | TV (Gate 2 → 5 → 6 → 8) |
|---|------|-----------|--------|----------|--------|--------|--------------------------|
| 1 | kaikai-kitan-eve | ✅ 1tk1pqwrOys | ✅ canonical | ✅ 10% lc | ✅ | ✅ | ⏸ |
| 2 | vivid-vice-who-ya-extended | ✅ EU6I8TxU6Z4 | ✅ canonical | ✅ 17% lc | ⏸ blocked | ⏸ | ⏸ |
| 3 | specialz-king-gnu | ✅ fhzKLBZJC3w | ✅ | ✅ 29% lc | ⏸ | ⏸ | ⏸ |
| 4 | kick-back-kenshi-yonezu | ✅ M2cckDmNLMI | ✅ | ✅ 23% lc | ⏸ | ⏸ | ⏸ |
| 5 | mixed-nuts-official-hige-dandism | ✅ CbH2F0kXgTY | ✅ | ✅ 15% lc | ⏸ | ⏸ | ⏸ |
| 6 | souvenir-bump-of-chicken | ✅ C9vAUfSEh8Q | ✅ | ✅ 9% lc | ⏸ | ⏸ | ⏸ |
| 7 | kura-kura-ado | ✅ W_fHWaoQwkw | ✅ | ✅ 11% lc | ⏸ | ⏸ | ⏸ |
| 8 | idol-yoasobi | ✅ ZRtdQ81jPUQ | ✅ canonical | ✅ 6% lc | ⏸ | ⏸ | ⏸ |
| 9 | mephisto-queen-bee | ✅ Yo83M-KOc7k | ✅ | ✅ 16% lc | ⏸ | ⏸ | ⏸ |
| 10 | yuusha-yoasobi | ✅ OIBODIPC_8Y | ✅ canonical | ✅ 11% lc | ⏸ | ⏸ | ⏸ |
| 11 | anytime-anywhere-milet | ✅ r105CzDvoo0 | ✅ | ✅ 13% lc | ⏸ | ⏸ | ⏸ |
| 12 | hacking-to-the-gate-kanako-ito | ✅ ZGM90Bo3zH0 (alt) | ✅ | ✅ 9% lc | ⏸ | ⏸ | ⏸ |
| 13 | colors-flow | ✅ H7cykKMpp_I | ✅ | ✅ 13% lc | ⏸ | ⏸ | ⏸ |
| 14 | redo-konomi-suzuki | ✅ R9i8nVS2NCA | ✅ canonical | ✅ 14% lc | ⏸ | ⏸ | ⏸ |
| 15 | styx-helix-myth-and-roid | ✅ tIhL2KHVdgE | ✅ MIXED-OK | ✅ 19% lc | ⏸ | ⏸ | ⏸ |
| 16 | change-the-world-v6 | ✅ Hok551J0Cbc | ✅ | ✅ 24% lc | ⏸ | ⏸ | ⏸ |
| 17 | fukai-mori-do-as-infinity | ✅ qIoDWTF0qSo | ✅ | ✅ 16% lc | ⏸ | ⏸ | ⏸ |
| 18 | the-hero-jam-project | ✅ QImBolnTVH8 | ✅ | ⚠️ 60% lc | ⏸ blocked | ⏸ | ⏸ |
| 19 | 99-mob-choir | ✅ aFPGhSkx7eA | ✅ MIXED-OK | ✅ 29% lc | ⏸ | ⏸ | ⏸ |
| 20 | imagination-spyair | ✅ QbwE7OhmkYc (alt) | ✅ | ✅ 16% lc | ⏸ | ⏸ | ⏸ |
| 21 | phoenix-burnout-syndromes | ✅ b5lsuPxMFmw | ✅ | ✅ 13% lc | ⏸ | ⏸ | ⏸ |
| 22 | papermoon-tommy-heavenly6 | ✅ p2MRCdUDGWQ | ✅ | ✅ 21% lc | ⏸ | ⏸ | ⏸ |
| 23 | love-dramatic-masayuki-suzuki | ✅ oC-tfgouDGk (fan) | ✅ | ✅ 14% lc | ⏸ | ⏸ | ⏸ |
| 24 | bling-bang-bang-born-creepy-nuts | ✅ H6FUBWGSOIc | ✅ MIXED-OK | ✅ 13% lc | ⏸ | ⏸ | ⏸ |

**Legend:** ✅ done · ⏸ pending · ⚠️ flagged · `lc` = % low-confidence WhisperX words

**Quality flags:**
- #18 `the-hero-jam-project` — 60% low-conf with `medium` model. Blocked from lesson gen until re-run with `large-v3` (needs ≥ 6 GB free RAM).
- **Lesson #1 (kaikai-kitan-eve) regenerated from canonical Genius lyrics** (16 verses, 30 vocab, 8 grammar points, N2/advanced). Previous WhisperX-rebuilt version was deleted before regen.
- **5 songs were rescued from WhisperX-rebuild → Genius-canonical** via `scripts/seed/fetch-canonical-lyrics.ts` + `scripts/seed/promote-canonical-lyrics.ts` (Playwright-based scraper, Genius search API). Sources documented in `data/lyrics-canonical/{slug}.txt`.
- **Gate 8 / kaikai-kitan-eve (2026-04-19):** oEmbed + schema + field-checks + DB insert (songs + song_versions version_type=full) passed. Dev server `/songs/kaikai-kitan-eve` returns 200. Human-ear audio-highlight sync (200ms tolerance) + trilingual-toggle visual check still to be spot-confirmed by user in browser.

**Deferred:**
- 107 pre-existing pending YouTube IDs in manifest (separate scope; quota-exhausted on first attempt — query format needs fixing for parenthetical romaji titles like `BACCHIKOI!!! (バッチコイ!!!)`)

## Resume prompts

### Generate next lesson (one at a time)

```
Continue the 25-song batch (.planning/phases/11.1-add-song-pipeline/BATCH_STATE.md).
Generate the next pending lesson (first ⏸ in the Lesson column, skipping ⚠️
blocked ones). Follow Gate 7 in docs/SONG_INGESTION_SOP.md.

For the chosen song:
- Lyrics + tokens: data/lyrics-cache/{slug}.json
- Word-level timing: data/timing-cache/{slug}.json
- Reference quality bar: data/lessons-cache/adamas-lisa.json
- Output: data/lessons-cache/{slug}.json (must validate against LessonSchema in
  scripts/types/lesson.ts)
- Trilingual fields (en, pt-BR, es) on every translation/meaning/explanation
- Tokens stay in kana/kanji (Failure #11); English interjections get
  grammar: "other" (Failure #13)
- Verse boundaries from WhisperX silence gaps; verse start/end_time_ms in ms

After writing, validate with: npx tsx scripts/types/lesson.ts
Then mark the row complete in BATCH_STATE.md and stop. Don't commit.
```

### Run Gate 8 (DB insert) once a song's lesson is ready

```
Run Gate 8 for {slug} per docs/SONG_INGESTION_SOP.md:
1. oEmbed-check the YouTube ID still resolves
2. Schema-validate data/lessons-cache/{slug}.json against LessonSchema
3. Insert into Neon Postgres via npx tsx scripts/seed/05-insert-db.ts (full version)
4. Visual UAT: npm run dev, scrub to 3 timestamps, verify highlight within 200ms
5. Mark Gate 8 complete in BATCH_STATE.md. Don't commit.
```

### Start TV pipeline (only after several full lessons in DB)

```
Run TV pipeline for songs where Gate 8 is ✅ in BATCH_STATE.md:
1. Gate 2 TV: npx tsx scripts/seed/09-find-tv-size.ts --limit N
2. npx tsx scripts/seed/10-prepare-tv.ts (writes songs-manifest-tv.json + stubs)
3. python scripts/seed/04-extract-timing.py --batch data/songs-manifest-tv.json --model medium --batch-size 4
4. npx tsx scripts/seed/04b-backfill-whisper-lyrics.ts --version tv
5. npx tsx scripts/seed/10b-derive-tv-lessons.ts (LCS-derive, no LLM call)
6. npx tsx scripts/seed/05-insert-db.ts --version tv
7. Visual UAT: toggle TV ↔ Full in dev server.
Mark TV cells in BATCH_STATE.md. Don't commit.
```

### Retry 107 pre-existing pending YouTube IDs (next quota-day)

```
The earlier run hit "no result" on all 6 attempts because the search query
"{title} {artist} official" doesn't handle parenthetical romaji like
"BACCHIKOI!!! (バッチコイ!!!) DEV PARADE".

Update scripts/seed/01b-enrich-youtube-ids.ts to:
- Strip parenthetical content before searching
- Try both raw title and stripped title; keep first non-null result
Then re-run without --from-candidates to process the 107 pending entries.
Cost: ~10,700 quota = 1+ days; checkpoints after every search.
```

## Updating this file

When you complete a step, change ⏸ → ✅ and add any anomalies to "Quality flags." Keep this file under 100 lines so it loads cheaply at session start.
