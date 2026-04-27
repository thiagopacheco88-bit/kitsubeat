---
id: SEED-002
status: dormant
planted: 2026-04-27
planted_during: v1.0 — Core Learning Experience, immediately after Phase 11.3 close-out (during human-UAT spot-check of again-yui)
trigger_when: A second song with the "silent intro before song starts" pattern surfaces during catalog QA, OR a "catalog playback quality" sweep is scoped
scope: Small
---

# SEED-002: Video-Playback-Start Offset (skip silent intros without breaking lyric sync)

Add a per-song-version "where the song actually starts in the video" field, plumb it through to the YouTube embed's `start` playerVar so playback auto-seeks past intro silence (band setup, spoken intros, ads-baked-into-the-upload) on first play. Lyric timing is unaffected — the existing `lyrics_offset_ms` infrastructure stays orthogonal.

## Why This Matters

Some YouTube uploads of a song have non-trivial silent or non-musical intros — the band tuning up, a host introducing the song, advertising bumpers — before the actual song begins. The user opens the song page, hits play, and waits N seconds of dead time before any lyrics fire.

Today's only knob, `lyrics_offset_ms`, **does not solve this** — that offset shifts when lyrics highlight relative to the video position (used to align LRCLIB timings to a YouTube cut with extra intro silence). It does not change where playback starts. A user opening a song with 43s of band setup still has to fast-forward manually.

### Confirmed bug pattern

Surfaced 2026-04-27 by the user during Phase 11.3's human-UAT spot-check of `again-yui` on Vercel:

> "Yui Again has the wrong song uploaded. The TV version takes too long to start because they are showing the band getting ready ~43 seconds. Can you put the default to start the video after in a way that doesn't mess up the lyrics?"

`again-yui` (TV version, `youtube_id = JSYRMr5HWAM`, lyrics_offset_ms = 0, 17 verses) is the canonical adversarial case for this seed. There is no current way for the catalog to ship "skip the first 43s on load" without either re-encoding the YouTube upload or adding the feature this seed proposes.

YouTube IFrame API supports `playerVars.start` (in seconds), but [src/app/songs/[slug]/components/YouTubeEmbed.tsx:194-201](../../src/app/songs/[slug]/components/YouTubeEmbed.tsx#L194-L201) currently passes only `rel`, `modestbranding`, `origin` — no `start`. The data side has no field to populate it from either.

## When to Surface

**Trigger candidates** (any one of these is enough):

- A second song with the same intro-silence symptom is reported during catalog QA. One adversarial case (`again-yui`) is enough motivation to design but not enough to scope a phase confidently — the right field shape and UX flow depends on whether 1 song needs this or 30 do.
- A "catalog playback quality" or "song UX polish" sweep is scoped (sibling-domain to SEED-001 but distinct: SEED-001 is verse-timing data backfill; this seed is a player-config feature).
- The user wants to swap the `again-yui` TV version's `youtube_id` to a less-troubled upload AND keep this seed dormant — that's a valid alternative path; this seed is only required if the catalog wants to keep "imperfect uploads with intro silence" as an acceptable input shape.

## Scope Estimate

**Small** — a focused phase, probably 2–3 plans, half-day to a day.

Rough shape (to be refined by `/gsd-spec-phase` when triggered):

1. **Schema migration** — add `playback_start_ms: integer` (default 0, not null) to `song_versions` table. Comment makes the intent crystal clear: "Seek-to position on first play in milliseconds. 0 = start at video t=0 (default). Non-zero values are passed to YouTube IFrame API's `playerVars.start` (converted ms → s) so the player auto-skips intro silence / band setup / spoken intros without affecting lyric_offset_ms semantics."
2. **Frontend wiring** — `SongContent.tsx` passes `playback_start_ms` (or its second-converted equivalent) as a prop to `YouTubeEmbed`; `YouTubeEmbed` adds `start: Math.floor(playback_start_ms / 1000)` to `playerVars` when > 0. Test contract: setting the field to 43000 on a fixture song produces a YT player initialized with `start: 43`.
3. **Operator script** — `scripts/seed/set-playback-start.ts` (mirrors `set-change-miwa-offset.ts` shape). One-off use today, but the right shape for an eventual catalog audit.
4. **Apply to `again-yui` TV** — set `playback_start_ms = 43000` for `JSYRMr5HWAM`. Validate via Vercel spot-check: opening the song should land the YouTube player at ~43s on first play; first verse highlight should fire on cue (no lyric desync).
5. **Audit** — `scripts/debug/audit-intro-silence.ts` (out of scope for this seed but worth flagging): scans the catalog for song_versions where the first verse's `start_time_ms` is > 10000 and `playback_start_ms = 0` — those are the candidates for either a `playback_start_ms` set OR a `youtube_id` swap.

## Out of Scope

### `lyrics_offset_ms` semantics

Existing field is orthogonal — it shifts lyric highlight timing relative to video position (used when LRCLIB timings reference a different audio cut). Do NOT collapse the two fields into one; they solve different problems and combining them would over-load semantics.

### Replacing the `again-yui` TV YouTube ID

Independent decision. The user shared `MLfMrBfqCu8` (their preferred TV version) and `45yi7bopMu0` (their preferred full version) in the planting conversation, but the DB currently has `JSYRMr5HWAM` (TV) and `w5OUAY1j3gQ` (Full). Whether to swap is a content-curation call, not a feature decision. **If the swap happens before this seed triggers, the new TV upload may not need the playback-start offset at all** — in which case this seed stays dormant longer.

### "Skip Intro" UI button

A user-facing "skip intro" button (instead of auto-seek) is a different UX. This seed proposes auto-seek on load because the user explicitly asked for "default to start the video after." If a future phase wants to layer a manual skip button on top, the data model is the same (`playback_start_ms` is the offset to skip to); only the trigger is different (button click vs. on-load).

### Songs with multiple intros / outro pattern

A song with both an intro and an outro that should be skipped is a different problem (needs an end_time_ms or outro_start_ms). Out of scope for this seed; punt to a sibling seed if it surfaces.

### `pokemon-getto-da-ze-rica-matsumoto` / `mezase-pokemon-master-rica-matsumoto`

Per SEED-001's notes, these songs already have known intro-silence issues (spoken intros). They're SEED-001 territory because the underlying problem is verse-timing data, not player configuration. SEED-001 may resolve them via the timing pipeline trimming the intro upstream; if it doesn't, they become candidates for this seed instead. Don't double-fix.

## Breadcrumbs

YouTube IFrame API contract:
- `playerVars.start: number` (seconds) — auto-seeks to that position on player initialization. See https://developers.google.com/youtube/iframe_api_reference#Loading_a_Video_Player

Existing player infrastructure:
- [src/app/songs/[slug]/components/YouTubeEmbed.tsx:194-201](../../src/app/songs/[slug]/components/YouTubeEmbed.tsx#L194-L201) — `new window.YT.Player(div.id, { videoId, playerVars: { rel, modestbranding, origin } })`. The `start` would slot in next to the existing three.
- [src/app/songs/[slug]/components/PlayerContext.tsx](../../src/app/songs/[slug]/components/PlayerContext.tsx) — exposes `seekTo(ms)` via the imperative API; the auto-seek-on-load could either ride YouTube's `start` playerVar (preferred — single round-trip, no flash) or call `seekTo` after `onReady` fires (fallback if `start` produces a pre-seek frame flash).

Existing offset infrastructure (DO NOT confuse with this seed):
- [src/lib/db/schema.ts:121-125](../../src/lib/db/schema.ts#L121-L125) — `lyrics_offset_ms` field comment. Different concern; explicitly orthogonal to this seed's proposed field.
- [scripts/debug/set-change-miwa-offset.ts](../../scripts/debug/set-change-miwa-offset.ts) — pattern for one-off DB writes against a single song's offset. Mirror this shape for the seed's eventual `set-playback-start.ts`.

Trigger artefact:
- Phase 11.3 close-out conversation 2026-04-27, during human-UAT spot-check of `again-yui`. The user's exact words: *"Can you put the default to start the video after in a way that doesn't mess up the lyrics?"*

## Notes

- **Field naming:** `playback_start_ms` is the proposed name. Alternatives considered: `intro_skip_ms` (negative connotation), `video_start_offset_ms` (verbose), `start_ms` (too generic — collides with verse `start_time_ms` mentally). Lock the name during `/gsd-spec-phase`.
- **Default value:** must be 0, not null. Default-non-null + integer keeps the YT.Player init code branchless: `start: Math.floor(playback_start_ms / 1000)` is always defined; the `> 0` check skips conditionally including it in playerVars (because `start: 0` to YouTube means literal "start at second 0" which is the same as omitting it, so we could also always include it — to be decided).
- **Test asymmetry:** the existing `YouTubeEmbed` does not have unit tests (it's heavy iframe + global window mocking). Test the wiring at the data-prop boundary (SongContent passes the right number to YouTubeEmbed) and the YT.Player call shape (mock window.YT.Player and assert the playerVars object); leave the actual YouTube playback assertion to manual / Playwright spot-check.
- **Coupling caveat:** this seed assumes the `start` playerVar reliably skips the intro on first play. If the user has scrubbed the video before clicking play, YouTube ignores `start`. For a song whose default is "skip intro," that's actually correct — manual scrubbing should override the default. If a future phase wants stronger control (always seek, even after manual scrub), it'd need to call `seekTo` from `onReady` instead.
- **Data audit (deferred):** scoping this phase confidently needs the `audit-intro-silence.ts` script to count how many song_versions in the current catalog would benefit. Without that, we don't know if 1 song needs this or 30. The audit is small (~50 LOC) and can be planted ahead of the phase to surface the count.
- **Discovery anchor:** found via human-UAT during Phase 11.3 close. Confirms the hypothesis that **shipping a phase to spot-checkable production state surfaces real bugs that no automated audit catches.** The `audit-untranslated-verses.ts --verify` gate would never have caught this — it only checks structural absence of stub strings, not playback experience.
