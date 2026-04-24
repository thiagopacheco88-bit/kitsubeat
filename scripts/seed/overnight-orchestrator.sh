#!/usr/bin/env bash
# overnight-orchestrator.sh — Autonomous post-repass data-prep chain.
#
# Waits for the 3 ab-worker.py shards to finish phase 3, then chains every
# downstream step so the user can sleep while the pipeline completes. Each
# step logs into data/overnight-orchestrator.log; any non-zero exit is
# recorded but does not halt the chain (each step is independently useful).
#
# Chained steps:
#   1. 04b-backfill-whisper-lyrics.ts    (rebuild lyrics for pending_whisper)
#   2. 03b-validate-lyrics-vs-whisper.ts (reclassify REJECT/REVIEW on new timings)
#   3. ab-compare-kcov-full.ts           (full-catalog A/B report)
#   4. validate-retime.ts                (read-only lesson alignment check)
#   5. retime-lesson-from-whisperx.ts    (realign existing lessons to new timings)
#   6. audit-lesson-coverage.ts          (flag lessons with gaps)
#   7. 05-insert-db.ts                   (sync everything to DB)
#
# Usage:
#   bash scripts/seed/overnight-orchestrator.sh > data/overnight-orchestrator.log 2>&1 &
#   disown
#
# Output summary at data/overnight-summary.json on completion.

set -o pipefail

export PATH=".venv/Scripts:/c/Program Files/nodejs:$PATH"
export PYTHONIOENCODING=utf-8

LOG="data/overnight-orchestrator.log"
SUMMARY="data/overnight-summary.json"

log() { printf '[overnight %s] %s\n' "$(date -Iseconds)" "$*"; }

# Run a step; never fail the chain. Record exit code into step_status array.
declare -A step_status
run_step() {
  local name=$1; shift
  log "=== STEP $name: starting ==="
  "$@"
  local rc=$?
  step_status[$name]=$rc
  log "=== STEP $name: exit=$rc ==="
}

log "=== overnight orchestrator START ==="

# ── Wait for workers ───────────────────────────────────────────────────────
log "Waiting for 3 workers to finish (checkpoints: '=== worker N finished ===' in each log)"
while :; do
  done=0
  for i in 0 1 2; do
    if grep -q "=== worker $i finished ===" "data/ab-worker-$i.log" 2>/dev/null; then
      done=$((done+1))
    fi
  done
  log "workers done: $done/3"
  [ "$done" -ge 3 ] && break
  sleep 300  # 5-min poll
done
log "All 3 workers finished."

# Guard: refresh 04c beat cache in case any new audio surfaced during the repass.
run_step "04c-detect-beats" \
  .venv/Scripts/python.exe scripts/seed/04c-detect-beats.py --all

# ── Step 1: backfill lyrics for pending_whisper songs ──────────────────────
run_step "04b-backfill-lyrics" \
  npx tsx --tsconfig tsconfig.scripts.json scripts/seed/04b-backfill-whisper-lyrics.ts

# ── Step 2: re-run lyrics-vs-whisper validator (may flip some to REJECT/REVIEW) ─
run_step "03b-validate-lyrics-vs-whisper" \
  npx tsx --tsconfig tsconfig.scripts.json scripts/seed/03b-validate-lyrics-vs-whisper.ts

# ── Step 3: full-catalog kCov delta report ─────────────────────────────────
run_step "ab-compare-kcov-full" \
  npx tsx --tsconfig tsconfig.scripts.json scripts/seed/ab-compare-kcov-full.ts

# ── Step 4: validate-retime (read-only) ────────────────────────────────────
run_step "validate-retime" \
  npx tsx --tsconfig tsconfig.scripts.json scripts/seed/validate-retime.ts

# ── Step 5: retime existing lessons to new timings ─────────────────────────
run_step "retime-lesson-from-whisperx" \
  npx tsx --tsconfig tsconfig.scripts.json scripts/seed/retime-lesson-from-whisperx.ts

# ── Step 6: lesson coverage audit ──────────────────────────────────────────
run_step "audit-lesson-coverage" \
  npx tsx --tsconfig tsconfig.scripts.json scripts/seed/audit-lesson-coverage.ts

# ── Step 7: sync to DB ─────────────────────────────────────────────────────
run_step "05-insert-db" \
  npx tsx --tsconfig tsconfig.scripts.json scripts/seed/05-insert-db.ts

# ── Final summary ──────────────────────────────────────────────────────────
lessons=$(ls data/lessons-cache/*.json 2>/dev/null | grep -vE '\.bak$|\.presplit' | wc -l)
stems=$(ls data/vocal-stems/*.wav 2>/dev/null | wc -l)
stem_timings=$(ls data/timing-cache-stem/*.json 2>/dev/null | wc -l)
prod_timings=$(ls data/timing-cache/*.json 2>/dev/null | wc -l)
beat_caches=$(ls data/beat-cache/*.json 2>/dev/null | wc -l)
backups=$(ls data/timing-cache/_pre-demucs/*.json 2>/dev/null | wc -l)

# Build step_status JSON
statuses="{"
first=1
for step in "${!step_status[@]}"; do
  [ $first -eq 0 ] && statuses+=","
  statuses+="\"$step\":${step_status[$step]}"
  first=0
done
statuses+="}"

cat > "$SUMMARY" <<JSON
{
  "completed_at": "$(date -Iseconds)",
  "steps": $statuses,
  "counts": {
    "lessons_in_cache": $lessons,
    "stems_on_disk": $stems,
    "stem_timings": $stem_timings,
    "prod_timings": $prod_timings,
    "beat_caches": $beat_caches,
    "backed_up_originals": $backups
  }
}
JSON

log "=== overnight orchestrator DONE ==="
log "summary: $SUMMARY"
log "lessons_in_cache=$lessons  stems=$stems  stem_timings=$stem_timings  backups=$backups"
