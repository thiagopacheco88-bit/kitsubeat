---
id: SEED-003
status: dormant
planted: 2026-04-28
planted_during: post-snap-rollback session, after spot-check-full-onsets surfaced 24 catalog-wide player-drift slugs
trigger_when: SEED-001 (fix untimed full-version lessons) is being scoped, OR a "full-version timing quality" milestone is opened
scope: Medium-Large
---

# SEED-003: Port NW Alignment to Full-Version Pipeline

The TV pipeline (Phase 11.2) replaced per-verse LCS with global Needleman-Wunsch alignment of WhisperX text against verse text. The full-version pipeline still relies on LRCLIB synced_lrc + a single per-song `lyrics_offset_ms`, which fails on three observed song classes:

1. **Internally inconsistent LRC** (24 songs surfaced 2026-04-28 by `spot-check-full-onsets --all --player-path`) — per-verse drift up to 17s; one offset can't shim it.
2. **Repeating-section disambiguation** (kokoro-no-chizu-boystyle confirmed UAT-broken) — chorus repeats with identical lyrics; LRC matcher picks wrong instance.
3. **WhisperX false-positives at song edges** (passion-hikaru-utada confirmed UAT-broken) — WhisperX detected ambient/instrumental noise at 588ms; onset-only snap can't text-disambiguate that from real verse 1 at ~33s.

## Why a heuristic snap doesn't generalize

A 2026-04-28 attempt to fix class (1) by stripping `synced_lrc` and snapping `verse.start_time_ms` to nearest WhisperX word boundary worked on 1 of 5 UAT-tested songs (hikari-hikaru-utada). The other 4 broke in different ways (passion: false-positive WhisperX; iris: long verses + last-verse fallback; niji: multiple issues; period: missing verses 4+ + over-long). Rolled back catalog-wide. **Snapshot artefacts and snap script kept in repo for targeted future use.**

The principled fix is text-aware alignment. NW already exists in `scripts/seed/10b-derive-tv-lessons-nw.ts` for TV. The work for full-version:

- **Reuse:** `scripts/seed/10b-derive-tv-lessons-nw.ts` core NW logic, `normRomaji`, `tokenAlignText`, `snapVerseOnsetToWordBoundary`, kuroshiro setup
- **Adapt:** parameterize on `version_type` so the same script can produce both TV-cut and full-version lesson timings
- **New:** `scripts/seed/10d-derive-full-lessons-nw.ts` (or extend 10b with `--version full`) — input: `data/songs-manifest.json` + `data/timing-cache-stem/{slug}.json` + verse text from existing lesson; output: writes `verse.start_time_ms` and `verse.end_time_ms` directly into the lesson JSONB
- **Loader:** the existing 10c-load pattern; or write directly to DB

Estimated 5-7 plans, similar shape to Phase 11.2.

## Cohort to target (priority order)

The 24 catalog-wide player-path FAILs from `data/full-onset-report-playerpath-all.json` are the immediate test set:

passion-hikaru-utada, the-hero-jam-project, kokoro-no-chizu-boystyle, rewrite-asian-kung-fu-generation, no-boy-no-cry-stance-punks, period-chemistry, katharsis-tk-from-ling-tosite-sigure, call-your-name-gv-gemie, colors-flow, overfly-luna-haruna, iris-eir-aoi, 12-makoto-kawamoto, alones-aqua-timez, one-last-kiss-hikaru-utada, undo-cool-joke, imagination-spyair, we-gotta-power-hironobu-kageyama, believe-folder5, the-world-nightmare, itterasshai-ai-higuchi, mountain-a-go-go-too-captain-straydum, niji-no-oto-eir-aoi, makafushigi-adventure-hiroki-takahashi, niji-no-kanata-ni-reona

Plus the 12 from the original spot-check that overlapped with audit-full-lessons flags:
tobira-no-mukou-e-yellow-generation, vogel-im-kafig-cyua, stars-w-o-d, under-the-tree-sim, hikari-hikaru-utada (already great — sanity check), harukaze-scandal, tk-0n-ttn-mika-kobayashi, just-awake-fear-and-loathing-in-las-vegas, chikai-hikaru-utada, hope-namie-amuro, brand-new-world-d-51, the-rumbling-sim

Total: ~36 full-version songs. Coincides heavily with SEED-001's broken-bucket; bundling makes sense.

## Verification gate

After NW-derived timing is written:
- `spot-check-full-onsets --all --player-path` — should pass ≥75% per-song (audit metric)
- **Mandatory human UAT** on at minimum 5 representatives across structural classes (chorus-heavy, instrumental-break, normal). Audit alone is circular when fix and gate share a data source. See `feedback_audit_uat_circularity.md` in user memory.

## Breadcrumbs

- [scripts/seed/10b-derive-tv-lessons-nw.ts](../../scripts/seed/10b-derive-tv-lessons-nw.ts) — TV NW deriver, the model
- [scripts/seed/spot-check-full-onsets.ts](../../scripts/seed/spot-check-full-onsets.ts) — gate; `--player-path` mode required
- [scripts/seed/snap-full-onsets.ts](../../scripts/seed/snap-full-onsets.ts) — heuristic snap; keep as targeted tool, not catalog-wide fix
- [scripts/seed/restore-snap-full-onsets.ts](../../scripts/seed/restore-snap-full-onsets.ts) — reversibility
- [.planning/seeds/SEED-001-fix-untimed-full-version-lessons.md](SEED-001-fix-untimed-full-version-lessons.md) — sister problem (no LRC at all); same NW deriver could repair both
- [data/full-onset-report-playerpath-all.json](../../data/full-onset-report-playerpath-all.json) — the 24-slug player-path FAIL list
- Snapshots from the failed snap attempt: `.planning/snap-full-onsets-snapshot.json`, `-batch2.json`, `-v2.json` — committed; data is original-LRC state

## Notes

- **Coincidence of catastrophic offsets in SEED-003 cohort** is informative: tk-0n-ttn-mika-kobayashi had `lyrics_offset_ms=-36095`, niji-no-kanata=`+25980`, vogel=`-32930`, etc. These weren't user-applied calibrations; they were original LRCLIB data being severely mis-aligned with the YouTube audio version. NW would not have this problem because alignment is content-driven, not start-marker-driven.
- **WhisperX false-positives** (passion's 588ms ghost word) need NW's text-agreement requirement to reject. Pure onset alignment can't distinguish a real first lyric from background noise.
- **Chorus repeats** (kokoro-no-chizu) need NW's global alignment to disambiguate. Local LRC matching picks the first text match it sees.
