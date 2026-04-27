# Plan 11.2-07 Rollout Log

Started: 2026-04-27T18:37:36Z

## Pre-rollout state
- Plan 06 verdict: SHIP-WITH-FLAGS (user override 2026-04-27)
- 33daafd live in production: confirmed at Task 1 gate (commit on master + remotes/origin/master)
- NW lessons in data/lessons-cache-tv-nw/: 29
- Existing data/lessons-cache-tv/: 56

## Steps

## Sub-step B: Snapshot
- Snapshot file: .planning/phases/11.2-tv-derive-rework-demucs-nw/tv-lessons-pre-rework-snapshot.json
- File size: 2420882 bytes (2.3MB)
- Rows captured: 57
  - Non-null lessons: 55
  - Null lessons: 2 (stragglers snapshotted as null)
- Script note: snapshot-runner.ts (top-level imports variant) wrote file successfully before HTTP body timeout; file validated 57 rows, JSON parses OK.
- Committed in: 51fc75d

## Sub-step C: Snapshot commit
- Committed: 51fc75d (snapshot(11.2): pre-rework TV lessons baseline for rollback)
- Snapshot is in git — D-09 escape hatch is ready.

## Sub-step D: Directory swap
- data/lessons-cache-tv/ → data/lessons-cache-tv-pre-rework/ (count: 56)
- data/lessons-cache-tv-nw/ → data/lessons-cache-tv/ (count: 29)
- data/lessons-cache-tv-nw/ does NOT exist (promoted away)
- Swap verified: canonical=29, pre-rework=56

## Pre-load state
- Snapshot committed at 51fc75d.
- Canonical dir data/lessons-cache-tv/ contains 29 NW-derived lessons.
- Rollback escape hatch ready: `npx tsx .planning/phases/11.2-tv-derive-rework-demucs-nw/restore-tv-lessons-from-snapshot.ts --confirm`
- If needed, filesystem rollback: mv data/lessons-cache-tv data/lessons-cache-tv-nw && mv data/lessons-cache-tv-pre-rework data/lessons-cache-tv
