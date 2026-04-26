# Adding Songs to KitsuBeat — Operator Quick-Start

The add-song pipeline turns a YouTube ID + romanised title into a fully-timed,
lesson-attached song row in the catalog. The 8-gate procedure is documented in
full in [docs/SONG_INGESTION_SOP.md](SONG_INGESTION_SOP.md) — this file is the
fast lookup for "I want to do X — what command do I run?"

## Before you start

- **`.env.local`** present at repo root with `DATABASE_URL` set to the Neon Postgres URL.
  Never paste the actual URL into this README — keep it in `.env.local` only.
- **Python venv activated:** prefix every WhisperX command with `PATH=".venv/Scripts:$PATH"`
  (Windows). Without this, `whisperx` fails with `WinError 2` at `load_audio`.
- **Node.js 22+** on PATH. Default install location: `C:\Program Files\nodejs`.
- **≥ 6 GB free RAM** if running WhisperX with `large-v3`. Use `--model medium` on 4 GB;
  close Claude Code, browser, and IDE before any overnight batch.
- **Optional:** set `TEST_DATABASE_URL` to a separate Neon DB so integration tests do not
  touch the dev catalog.

## Common scenarios

| Intent | Command(s) | SOP gates touched |
|---|---|---|
| Add 1 new song | `npx tsx scripts/seed/01-build-manifest.ts && bash scripts/seed/run-pending-batch.sh` | [Gate 1](SONG_INGESTION_SOP.md#gate-1--curation-manual-review-of-new-candidates) → [Gate 8](SONG_INGESTION_SOP.md#gate-8--pre-insert-verification--db-write) |
| Add a batch of N songs | `bash scripts/seed/run-pending-batch.sh` | All 8 gates |
| Resume pending_whisper backlog | `bash scripts/seed/overnight-orchestrator.sh` | [Gate 5](SONG_INGESTION_SOP.md#gate-5--whisperx-timing-extraction-full--tv) onward |
| Add only the TV cut for an existing song | `npx tsx scripts/seed/10-prepare-tv.ts --slug=<slug>` | [Gate 6](SONG_INGESTION_SOP.md#gate-6--tv-lesson-derivation-not-regeneration) only |
| Replace a geo-blocked or live-version YouTube ID | `npx tsx scripts/seed/06-qa-geo-check.ts --slug=<slug>` then re-run from Gate 2 | [Gate 2](SONG_INGESTION_SOP.md#gate-2--youtube-selection-full--tv) + [Gate 8](SONG_INGESTION_SOP.md#gate-8--pre-insert-verification--db-write) |

**Notes on run-pending-batch.sh and overnight-orchestrator.sh:**
- Both scripts run the `yt_id` audit gate (`npx tsx scripts/seed/audit-yt-ids.ts`) as their
  final step. If any duplicate YouTube IDs exist across slugs, the batch exits non-zero.
- `05-insert-db.ts` wraps each song in `db.transaction()`. A failure on any single song
  rolls back only that song's rows — other songs in the batch are unaffected.

## Deeper dive

For gate-level detail, failure modes, and recovery procedures, see
[docs/SONG_INGESTION_SOP.md](SONG_INGESTION_SOP.md). For the audit script that
catches cross-song YouTube ID duplicates, see
[`scripts/seed/audit-yt-ids.ts`](../scripts/seed/audit-yt-ids.ts).
