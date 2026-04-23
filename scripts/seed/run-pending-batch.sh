#!/usr/bin/env bash
# run-pending-batch.sh — End-to-end processing of the 103 pending_whisper
# songs. Assumes the WhisperX extraction batch is either running or done;
# waits for it to finish (checkpoint: all pending songs have timing-cache
# entries OR the tracked WhisperX process is no longer alive), then runs
# downstream steps and writes a single status report when complete.
#
# Chained steps:
#   1. Wait for WhisperX batch completion
#   2. Detect beats on every mp3 in public/audio/  (incremental via --all)
#   3. Backfill lyrics for pending_whisper songs that now have timing
#   4. Validate retime across all lessons with timing (writes reports)
#   5. Emit data/pending-batch-status.json summary
#
# Idempotent: every step is safe to re-run. Beat/backfill skip completed
# entries; the validator is always read-only.

set -euo pipefail

export PATH=".venv/Scripts:/c/Program Files/nodejs:$PATH"

STATUS_FILE="data/pending-batch-status.json"
PENDING_MANIFEST="data/songs-manifest-pending-whisper.json"
TIMING_DIR="data/timing-cache"

log() { printf '[run-pending-batch %s] %s\n' "$(date -Iseconds)" "$*"; }

count_pending_done() {
  local count=0
  while IFS= read -r slug; do
    [ -z "$slug" ] && continue
    [ -f "$TIMING_DIR/$slug.json" ] && count=$((count + 1))
  done < <(node -e "console.log(require('./$PENDING_MANIFEST').map(s=>s.slug).join('\n'))")
  echo "$count"
}

total=$(node -e "console.log(require('./$PENDING_MANIFEST').length)")
log "Waiting for WhisperX batch. Target: $total songs with timing caches."

stable_count=0
stable_threshold=18  # 18 consecutive checks at 5-min intervals = 90min no new song = treat as done
prev_done=-1
while :; do
  done=$(count_pending_done)
  log "progress: $done/$total timing caches present"
  if [ "$done" -ge "$total" ]; then
    log "all $total pending songs transcribed — proceeding"
    break
  fi
  if [ "$done" -eq "$prev_done" ]; then
    stable_count=$((stable_count + 1))
    log "no new progress (stable=$stable_count/$stable_threshold)"
    if [ "$stable_count" -ge "$stable_threshold" ]; then
      log "batch appears stalled — proceeding with $done/$total completed"
      break
    fi
  else
    stable_count=0
  fi
  prev_done=$done
  sleep 300  # 5 minutes
done

# Step 2 — beat detection for every mp3 (new entries only; --force not used).
log "Step 2: librosa beat detection on all mp3s"
.venv/Scripts/python.exe scripts/seed/04c-detect-beats.py --all || log "beat-detect completed with non-zero exit"

# Step 3 — backfill lyrics for newly-transcribed pending_whisper songs.
log "Step 3: backfill pending_whisper lyrics"
npx tsx --tsconfig tsconfig.scripts.json scripts/seed/04b-backfill-whisper-lyrics.ts \
  || log "backfill completed with non-zero exit"

# Step 4 — retime validator (read-only report).
log "Step 4: retime validator"
npx tsx --tsconfig tsconfig.scripts.json scripts/seed/validate-retime.ts \
  || log "validate-retime completed with non-zero exit"

# Step 5 — emit status summary for easy inspection.
log "Step 5: writing status summary"
done=$(count_pending_done)
audio_count=$(ls public/audio/*.mp3 2>/dev/null | wc -l)
beat_count=$(ls data/beat-cache/*.json 2>/dev/null | wc -l)
whisper_source=$(grep -l '"source": "whisper"' data/lyrics-cache/*.json 2>/dev/null | wc -l)
pending_source=$(grep -l '"source": "pending_whisper"' data/lyrics-cache/*.json 2>/dev/null | wc -l)

cat > "$STATUS_FILE" <<JSON
{
  "generated_at": "$(date -Iseconds)",
  "pending_target": $total,
  "pending_transcribed": $done,
  "audio_files": $audio_count,
  "beat_caches": $beat_count,
  "lyrics_source_whisper": $whisper_source,
  "lyrics_source_pending_whisper": $pending_source
}
JSON
log "done — status: $STATUS_FILE"
