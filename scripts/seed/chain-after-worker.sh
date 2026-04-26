#!/usr/bin/env bash
# chain-after-worker.sh — Wait for the single Demucs+WhisperX worker to finish,
# wait for the audio-download pass to finish, then chain every downstream step
# so the user can ignore the pipeline until the kCov uplift hits the DB.
#
# Triggered by:
#   bash scripts/seed/chain-after-worker.sh > data/chain-pipeline.log 2>&1 &
#   disown
#
# Steps (each step's exit code is recorded; chain never aborts on a non-zero
# exit because every step is independently useful):
#   1. Wait for ab-worker-single.log to log "=== worker N finished ==="
#   2. Wait for download-missing-audio.log to print "Total:" (terminal line)
#   3. If new mp3s landed during the wait: re-run ab-build-rank + ab-worker
#      on the freshly-downloaded songs (second wave)
#   4. 04b-backfill-whisper-lyrics.ts — rebuild lyrics for any pending_whisper
#   5. 03b-validate-lyrics-vs-whisper.ts — fresh kCov on stem-quality data
#   6. 05-insert-db.ts — push canonical_lyrics + whisper_lyrics to Neon
#
# All output appended to data/chain-pipeline.log; final summary at
# data/chain-summary.json.

set -o pipefail

export PATH=".venv/Scripts:/c/Program Files/nodejs:$PATH"
export PYTHONIOENCODING=utf-8

WORKER_LOG="data/ab-worker-single.log"
DOWNLOAD_LOG="data/download-missing-audio.log"
SUMMARY="data/chain-summary.json"
QUEUE_FILE="data/ab-queue-full-coverage.txt"
WAVE2_QUEUE="data/ab-queue-wave2.txt"

log() { printf '[chain %s] %s\n' "$(date -Iseconds)" "$*"; }

declare -A step_status
run_step() {
  local name=$1; shift
  log "=== STEP $name: starting ==="
  "$@"
  local rc=$?
  step_status[$name]=$rc
  log "=== STEP $name: exit=$rc ==="
}

log "=== chain-after-worker START ==="

# ── Step 1: wait for the Demucs+WhisperX worker ────────────────────────────
log "Waiting for worker (looking for '=== worker N finished ===' in $WORKER_LOG)"
while :; do
  if grep -q "=== worker .* finished ===" "$WORKER_LOG" 2>/dev/null; then
    log "Worker finished."
    break
  fi
  sleep 300  # 5-min poll
done

# ── Step 2: wait for the audio-download pass ──────────────────────────────
if [ -f "$DOWNLOAD_LOG" ]; then
  log "Waiting for download pass (looking for 'Total:' line in $DOWNLOAD_LOG)"
  while :; do
    if grep -q "^Total:" "$DOWNLOAD_LOG" 2>/dev/null; then
      log "Download pass finished."
      break
    fi
    sleep 120  # 2-min poll
  done
else
  log "No download log present — skipping download wait."
fi

# ── Step 3: detect newly-downloaded mp3s and queue a second wave ──────────
log "Building wave-2 queue from any mp3s downloaded after the wave-1 cutoff..."
node -e "
const fs = require('fs');
const m = require('./data/songs-manifest.json');
const wave1Slugs = new Set(
  fs.readFileSync('$QUEUE_FILE','utf8')
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith('#'))
);
const wave2 = [];
for (const s of m) {
  if (wave1Slugs.has(s.slug)) continue;
  const audio = fs.existsSync('public/audio/' + s.slug + '.mp3');
  const stem  = fs.existsSync('data/timing-cache-stem/' + s.slug + '.json');
  if (audio && !stem) wave2.push(s.slug);
}
fs.writeFileSync('$WAVE2_QUEUE', wave2.join('\n') + (wave2.length ? '\n' : ''));
console.log('wave-2 size:', wave2.length);
"

WAVE2_COUNT=$(wc -l < "$WAVE2_QUEUE" 2>/dev/null | tr -d ' ')
if [ -n "$WAVE2_COUNT" ] && [ "$WAVE2_COUNT" -gt 0 ]; then
  log "Wave 2: $WAVE2_COUNT songs to process via ab-worker..."
  run_step "ab-worker-wave2" python scripts/seed/ab-worker.py --shard-file "$WAVE2_QUEUE" --worker-id 8
else
  log "No wave-2 songs — all downloaded mp3s already have stem timing or queue is empty."
fi

# ── Step 4: rebuild lyrics for any pending_whisper that finally got timing ─
run_step "04b-backfill-lyrics" npx tsx --tsconfig tsconfig.scripts.json scripts/seed/04b-backfill-whisper-lyrics.ts

# ── Step 5: fresh kCov verdicts on stem-quality data ──────────────────────
run_step "03b-validate" npx tsx --tsconfig tsconfig.scripts.json scripts/seed/03b-validate-lyrics-vs-whisper.ts

# ── Step 6: push canonical_lyrics + whisper_lyrics to Neon ────────────────
run_step "05-insert-db" npx tsx --tsconfig tsconfig.scripts.json scripts/seed/05-insert-db.ts

# ── Summary ───────────────────────────────────────────────────────────────
log "=== chain-after-worker DONE ==="

stems_count=$(ls data/timing-cache-stem/ 2>/dev/null | wc -l | tr -d ' ')
mp3s_count=$(ls public/audio/*.mp3 2>/dev/null | wc -l | tr -d ' ')

cat > "$SUMMARY" <<JSON
{
  "completed_at": "$(date -Iseconds)",
  "wave2_size": ${WAVE2_COUNT:-0},
  "step_status": {
$(for k in "${!step_status[@]}"; do printf '    "%s": %d,\n' "$k" "${step_status[$k]}"; done | sed '$ s/,$//')
  },
  "counts": {
    "stem_timings": $stems_count,
    "audio_mp3s": $mp3s_count
  }
}
JSON

log "summary: $SUMMARY"
log "stems on disk: $stems_count   audio mp3s: $mp3s_count"
