---
id: SEED-001
status: dormant
planted: 2026-04-26
planted_during: v1.0 — Core Learning Experience, immediately after Phase 11.1 completion
trigger_when: Phase 11.2 (TV-Derive Rework with Demucs + Needleman-Wunsch) ships its NW alignment pipeline
scope: Medium
---

# SEED-001: Fix Untimed Full-Version Lessons

Backfill `verse.start_time_ms` for the ~80 full-version songs in the catalog that have no `synced_lrc` AND every verse stuck at `start_time_ms = 0`. The player has no timing source for these — they render as "broken sync" or, in some cases, as "last verse highlighted from start, then loses track" (the player's current-verse logic resolves to the last verse with `start_time_ms <= currentTime` when every verse starts at 0).

## Why This Matters

This is a quiet ~25% of the catalog that ships broken karaoke. Discovered on 2026-04-26 while triaging cross-slug `youtube_id` duplicates surfaced by Phase 11.1's new audit gate (`scripts/seed/audit-yt-ids.ts`). What looked like a per-song "wrong yt_id" / "sync offset" bug for `mezase-pokemon-master-rica-matsumoto` and `guren-no-yumiya-linked-horizon` turned out to be representative of an ~80-song bucket. None of these songs can be repaired with `auto-detect-lyrics-offset.ts` — that tool computes `lyrics_offset_ms` as a layer on top of LRCLIB timing, and these songs have no LRCLIB timing to layer on.

The catalog-wide breakdown (from `scripts/debug/audit-zero-verse-timing.ts`, run 2026-04-26 against dev DB):

| Bucket | Count | State |
|--------|-------|-------|
| All verses at `start_time_ms=0` **with** `synced_lrc` | ~80 | Normal — player computes verse timing at runtime via `buildVerseTiming()` |
| All verses at `start_time_ms=0` **without** `synced_lrc` | **~80** | **Broken — this seed's scope** |
| Some verses at `start_time_ms=0` (mixed) | 71 | Partial — handle as part of the same phase |
| All verses with proper timing | 96 | OK |

Total `song_versions`: 329.

This is not a streak-killer in the SPEC sense (no FK violations or crashes), but it is a *learning-killer* — the user can't follow karaoke if the highlight doesn't track the audio. Same severity class as the issues Phase 11.1 closed.

## When to Surface

**Trigger:** Phase 11.2 (TV-Derive Rework with Demucs + Needleman-Wunsch) ships.

11.2 is building the exact alignment infrastructure this needs — Demucs vocal-stem extraction → WhisperX large-v3 ja → Needleman-Wunsch global alignment of WhisperX words against lesson verse text → segment-anchored verse projection. 11.2 applies it to TV cuts; this seed applies the same pipeline to full versions.

This seed should be presented during `/gsd-new-milestone` when the milestone scope matches any of these conditions:
- v1.0 milestone audit (gap-closure pass before milestone close)
- Any milestone touching karaoke quality, audio sync, or lesson-data integrity
- A "catalog repair" or "data backfill" milestone

## Scope Estimate

**Medium** — a phase, not a session.

Rough shape (to be refined by `/gsd-spec-phase` when triggered):
1. **Reuse 11.2's pipeline** — Demucs + WhisperX + NW alignment, modified to accept full-version inputs (no TV trimming, no LCS scatter problem to inherit).
2. **Process the ~80 broken full versions** in batches against existing `data/timing-cache/<slug>.json` files where they already exist (most do, since WhisperX runs in the seed pipeline). Skip songs without timing cache; queue them for re-transcription.
3. **Write `verse.start_time_ms`** back into `lesson.verses[]` JSONB — same shape change Phase 11.2's `10c-load`-equivalent will be doing.
4. **Audit + regression guard** — extend `scripts/debug/audit-zero-verse-timing.ts` (already committed) to assert the all-zero bucket is empty for non-LRC songs after the run. Wire as a final-step `|| exit 1` in batch shells, same pattern as Phase 11.1's `audit-yt-ids.ts`.
5. **Eyeball-verify** — playable spot-check on 8 adversarial songs (same N5/N4/N3/N2 cross-section 11.2 uses for its onset gate; pick from the 80-bucket).

Estimated 5–7 plans following 11.2's structure.

## Breadcrumbs

Audit infra (committed alongside this seed):
- [scripts/debug/audit-zero-verse-timing.ts](../../scripts/debug/audit-zero-verse-timing.ts) — server-side JSONB query that surfaces the ~80 broken song_versions; this is the discovery tool
- [scripts/debug/inspect-verse-timing.ts](../../scripts/debug/inspect-verse-timing.ts) — per-song verse-timing dump; useful for diagnosing individual rows during the phase

Pipeline this seed depends on (from Phase 11.2):
- [.planning/phases/11.2-tv-derive-rework-demucs-nw/11.2-CONTEXT.md](../phases/11.2-tv-derive-rework-demucs-nw/11.2-CONTEXT.md)
- [.planning/phases/11.2-tv-derive-rework-demucs-nw/11.2-SPEC.md](../phases/11.2-tv-derive-rework-demucs-nw/11.2-SPEC.md)
- 11.2's eventual `10c-load`-style writer (will exist once 11.2 ships)

Existing per-song-timing primitives that ALREADY work (use as reference, not as the fix):
- [src/lib/verse-timing.ts](../../src/lib/verse-timing.ts) — `buildVerseTiming()`: maps verses → LRC lines at runtime when `synced_lrc` is present (covers the ~80 *working* all-zero songs, NOT this seed's ~80)
- [scripts/seed/auto-detect-lyrics-offset.ts](../../scripts/seed/auto-detect-lyrics-offset.ts) — `lyrics_offset_ms` calibration; only applies to songs with `synced_lrc` (does NOT solve this seed)
- [scripts/debug/set-change-miwa-offset.ts](../../scripts/debug/set-change-miwa-offset.ts) — hardcoded one-off reference for the offset-write pattern

Trigger artefacts:
- [data/yt-id-audit.csv](../../data/yt-id-audit.csv) — the cross-slug yt_id duplicate audit output that surfaced this; rows for `mezase-pokemon-master-rica-matsumoto`, `guren-no-yumiya-linked-horizon`, `pokemon-getto-da-ze-rica-matsumoto`, `ima-made-nando-mo-the-mass-missile`, `shinkokyuu-super-beaver`, `hajimete-kimi-to-shabetta-gagagasp` are all in this seed's affected bucket

Representative slugs from the broken bucket (use during phase scoping):
- `mezase-pokemon-master-rica-matsumoto` — spoken intro by Rica Matsumoto pushes vocals to ~30s; illustrates the intro-pause case
- `guren-no-yumiya-linked-horizon` — German chants then Japanese vocals at ~36s; illustrates the multi-language-intro case
- `gurenge-lisa`, `idol-yoasobi`, `yuusha-yoasobi`, `shinzou-o-sasageyo-linked-horizon`, `kick-back-kenshi-yonezu` (mixed bag of high-popularity songs in the bucket — these failing is user-visible)

## Notes

- **Coupling caveat:** treat 11.2's "TV cuts only" framing as a temporary scope, not a permanent architectural choice. If 11.2's pipeline can be parameterised on `version_type`, this seed becomes a configuration change + a batch run; if not, this seed needs a small refactor of 11.2 first.
- **Out of scope for this seed:** the *partial-zero* songs (71 of them, e.g. `call-your-name-mpi-casg` with 1/19 zero, `adamas-lisa` with 10/45 zero) — those are a different failure mode (per-verse misalignment) that probably wants a different fix (per-verse re-projection from existing word timings, no full re-transcription needed). Worth scoping into the same phase as a sub-plan.
- **Don't fix dupes' yt_ids first.** `pokemon-getto-da-ze-rica-matsumoto` and `guren-no-zahyou-linked-horizon` (Pokemon Getto and Guren no Zahyou) need correct YT uploads found and re-ingested. That's worth doing as a small dupe-resolution task BEFORE this seed runs — re-ingestion may auto-populate timing if the new pipeline is in place. Otherwise re-ingestion just produces another all-zero row that this seed will then have to repair.
- **Discovery anchor:** this seed exists because Phase 11.1's audit gate worked. Without the cross-slug yt_id audit, none of this would have been visible. Future "data integrity" phases should follow the same audit-first pattern.
