---
created: 2026-04-16T06:36:55.768Z
title: Replace 19 remaining geo-restricted YouTube videos
area: tooling
files:
  - scripts/backfill-geo-check.ts
  - scripts/lib/youtube-search.ts
  - data/geo-audit-report.csv
---

## Problem

19 songs in `song_versions` still reference YouTube videos that are JP-only (official Japanese music videos with `regionRestriction.allowed = ["JP"]`). Users outside Japan see "Video unavailable — The uploader has not made this video available in your country" on these lesson pages.

Today's `npm run audit:geo:replace` run hit the daily YouTube API quota (10,000 units) after successfully replacing only 2 of 21 restricted videos:

- `freedom-home-made-kazoku`: `ZQ7Sr43I7dk` → `EqkafQvvzSY` (verified global)
- `forget-me-not-reona`: `7m6xp2QE3Zw` → `KpzX87czSY4` (verified global)

The quota was mostly already consumed by prior pipeline runs today. Each replacement costs ~101 units (1 search + 1 videos.list call), so the remaining 19 need ~2000 units.

Full list of restricted songs in `data/geo-audit-report.csv` (filter column `tier = restricted`).

## Solution

**Tomorrow (after YouTube quota resets at midnight Pacific Time):**
```bash
npm run audit:geo:replace
```

The script will re-audit the DB, find the 19 still-restricted videos, and attempt replacements. Progress is saved to `data/geo-audit-report.csv`. Fully idempotent — safe to re-run if quota runs out again.

**If faster turnaround needed:** Create a second API key in a separate Google Cloud project — each GCP project has its own 10k/day quota, which can double throughput.

**Verification:** After replacement, confirm each new video has `regionRestriction: null` and `embeddable: true` via the `/videos` endpoint (see pattern in the verification call run on 2026-04-16 for the 2 replacements above).
