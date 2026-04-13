---
phase: 01-content-pipeline
plan: 07
subsystem: infra
tags: [pipeline, orchestration, checkpoint-resume, env-setup, typescript]

# Dependency graph
requires:
  - phase: 01-content-pipeline
    provides: "All 6 prior plans: manifest builder, lyrics fetch, timing extraction, content gen, DB insertion, QA agent"
provides:
  - "scripts/seed/run-pipeline.ts: pipeline orchestrator with 7-step checkpoint/resume"
  - "npm pipeline script: shortcut for running the orchestrator"
affects: [01-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pipeline orchestrator pattern: step-based execution with isComplete() checks per step"
    - "Env var validation per step before execution — stops early with clear error messages"
    - "--dry-run shows all steps + missing env vars without executing"
    - "--from N skips checkpoint detection for steps before N"
    - "--step N runs only a single step"

key-files:
  created:
    - scripts/seed/run-pipeline.ts
  modified:
    - package.json

key-decisions:
  - "Step 6 (drizzle-kit push) checkpoint detection checks for migration SQL file — proxy for schema push since DB ping would require DATABASE_URL at check time"
  - "Dry-run mode shows env var warnings but does not block — informational only for planning purposes"
  - "Step 4 (backfill) isComplete() returns true when no pending_whisper entries exist — correct behavior since if no lyrics-cache exists, there are no pending entries"

patterns-established:
  - "Pipeline orchestrator: each step defines its own isComplete() check, requiredEnvVars, and command string"

requirements-completed: [CONT-01, CONT-02, CONT-03, CONT-04, CONT-09]

# Metrics
duration: 8min
completed: 2026-04-06
---

# Phase 1 Plan 07: Pipeline Runner and Environment Setup Summary

**7-step pipeline orchestrator with checkpoint/resume, env var validation per step, and --dry-run/--from/--step CLI flags for running the full content pipeline**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-06T18:57:43Z
- **Completed:** 2026-04-06T19:05:00Z
- **Tasks:** 1 of 2 (Task 2 requires human action — env setup and pipeline execution)
- **Files modified:** 2 created/modified

## Accomplishments

- Pipeline runner at `scripts/seed/run-pipeline.ts` orchestrates all 7 content pipeline steps in sequence
- Each step checks for its own output (checkpoint detection) before running — re-running the pipeline skips completed steps automatically
- Env var validation per step: Steps 1 requires YOUTUBE_API_KEY + Spotify creds; Step 5 requires ANTHROPIC_API_KEY; Steps 6-7 require DATABASE_URL
- Dry-run verified: all 7 steps listed, Steps 4 and 6 correctly shown as skipped (migration SQL exists, no pending_whisper entries)

## Task Commits

Each task was committed atomically:

1. **Task 1: Pipeline orchestration script with checkpoint/resume** - `a0d912a` (feat)

Task 2 (configure environment and execute pipeline steps 1-4) requires human action — see checkpoint below.

## Files Created/Modified

- `scripts/seed/run-pipeline.ts` - 7-step pipeline orchestrator: checkpoint detection, env validation, --dry-run/--from/--step flags, summary table
- `package.json` - Added `pipeline` npm script pointing to run-pipeline.ts

## Decisions Made

- Step 6 (drizzle-kit push) uses migration SQL file existence as a checkpoint proxy — avoids requiring DATABASE_URL at check time; user should still re-run `drizzle-kit push` if schema changes
- Dry-run env var warnings are informational, not blocking — allows users to plan which steps need setup without being stopped immediately

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed dry-run blocking on missing env vars**
- **Found during:** Task 1 (pipeline runner dry-run verification)
- **Issue:** Initial implementation validated env vars before showing dry-run output, causing Step 1 to fail immediately with [BLOCK] in dry-run mode — defeating the purpose of dry-run
- **Fix:** Moved env var check after dry-run branch — dry-run now shows steps with [WARN] for missing vars but does not stop
- **Files modified:** scripts/seed/run-pipeline.ts
- **Verification:** `--dry-run` now shows all 7 steps with warning annotations for missing vars
- **Committed in:** `a0d912a` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 bug)
**Impact on plan:** Necessary for correct dry-run behavior. No scope creep.

## Issues Encountered

- None beyond the dry-run env var bug (auto-fixed inline)

## User Setup Required

**Task 2 is blocked pending human action.** The following must be completed before pipeline execution:

### Step A: Add API keys to .env.local

`DATABASE_URL` is already configured. Add the remaining keys:

```
# YouTube Data API v3 — Required for Step 1 (manifest build)
YOUTUBE_API_KEY=your_key_here
# Source: Google Cloud Console -> APIs & Services -> Credentials -> Create API Key
#         Enable: YouTube Data API v3
#         Note: Default quota is 10K units/day. 200 searches = 20K units = 2 days.
#         Check: Google Cloud Console -> APIs & Services -> YouTube Data API v3 -> Quotas

# Spotify Web API — Required for Step 1 (manifest build)
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
# Source: https://developer.spotify.com/dashboard -> Create App -> Client ID + Secret
#         App type: Web API

# Anthropic API — Required for Step 5 (lesson content generation, ~$5-15)
ANTHROPIC_API_KEY=your_key_here
# Source: https://console.anthropic.com -> API Keys -> Create Key
```

### Step B: Enable YouTube Data API v3

Google Cloud Console -> APIs & Services -> Library -> search "YouTube Data API v3" -> Enable

### Step C: Run pipeline steps 1-4

```bash
# From the kitsubeat/ directory:

# Step 1: Build manifest (may need 2 days due to YouTube quota)
npm run pipeline -- --step 1

# Step 2: Fetch lyrics
npm run pipeline -- --step 2

# Step 3: Extract timing (requires Python + WhisperX)
#   Install: pip install -r requirements.txt
npm run pipeline -- --step 3

# Step 4: Backfill pending_whisper entries
npm run pipeline -- --step 4
```

### Verification

After steps 1-4 complete:
- `data/songs-manifest.json` exists with ~200 entries
- `data/lyrics-cache/` has per-song JSON files
- `data/timing-cache/` has per-song timing JSON files

## Next Phase Readiness

- Pipeline runner is ready — run `npm run pipeline -- --dry-run` to see current status at any time
- Steps 1-4 require external API keys and compute time (WhisperX) — see User Setup above
- Step 5 (content generation) and Steps 6-7 (DB push + insert) can run after Steps 1-4 complete
- Plan 01-08 covers Steps 5-7 execution and full validation

---
*Phase: 01-content-pipeline*
*Completed: 2026-04-06*
