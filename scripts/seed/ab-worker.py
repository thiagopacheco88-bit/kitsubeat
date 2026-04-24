#!/usr/bin/env python3
"""
ab-worker.py — Process one shard of the full-catalog Demucs+WhisperX repass.

Reads a shard file (one slug per line), then runs three phases on that
shard sequentially:
    1. Isolate vocal stems via Demucs (shells out to python -m demucs per slug)
    2. Transcribe stems via WhisperX (one model load, all slugs in one process)
    3. Promote stems into data/timing-cache/ (backs up originals)

Idempotent — skips a slug at any phase if its output already exists.
Launch N of these in parallel with disjoint shard files for parallelism.

Usage:
    python scripts/seed/ab-worker.py --shard-file data/ab-shard-0.txt --worker-id 0
"""

import argparse
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

AUDIO_DIR = "public/audio"
STEM_DIR = "data/vocal-stems"
STEM_TIMING_DIR = "data/timing-cache-stem"
PROD_TIMING_DIR = "data/timing-cache"
BACKUP_DIR = "data/timing-cache/_pre-demucs"
DEMUCS_MODEL = "htdemucs"
EXTRACT_MODULE_PATH = "scripts/seed/04-extract-timing.py"


def load_extractor():
    spec = importlib.util.spec_from_file_location("extract_timing", EXTRACT_MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def read_shard(path: str) -> list[str]:
    with open(path, encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip() and not line.startswith("#")]


# ── Phase 1: isolate one slug ───────────────────────────────────────────────

def isolate_one(slug: str, log) -> bool:
    mp3 = os.path.join(AUDIO_DIR, f"{slug}.mp3")
    final_stem = os.path.join(STEM_DIR, f"{slug}.wav")
    nested = os.path.join(STEM_DIR, DEMUCS_MODEL, slug, "vocals.wav")

    if os.path.exists(final_stem):
        log(f"  [phase1][cache] stem exists: {slug}")
        return True
    if not os.path.exists(mp3):
        log(f"  [phase1][skip] mp3 missing: {slug}")
        return False

    log(f"  [phase1][run] demucs {slug}")
    t0 = time.time()
    rc = subprocess.run(
        [
            sys.executable, "-m", "demucs",
            "-n", DEMUCS_MODEL,
            "--two-stems", "vocals",
            "-o", STEM_DIR,
            mp3,
        ],
        check=False,
    ).returncode
    elapsed = round(time.time() - t0, 1)
    if rc != 0 or not os.path.exists(nested):
        log(f"  [phase1][error] demucs rc={rc} for {slug} ({elapsed}s)")
        return False

    shutil.move(nested, final_stem)
    try:
        shutil.rmtree(os.path.dirname(nested))
    except OSError:
        pass
    log(f"  [phase1][ok] {slug} ({elapsed}s)")
    return True


# ── Phase 2: transcribe one slug (extractor loaded once, reused) ────────────

def transcribe_one(extractor, slug: str, log) -> bool:
    stem = os.path.join(STEM_DIR, f"{slug}.wav")
    out = os.path.join(STEM_TIMING_DIR, f"{slug}.json")

    if os.path.exists(out):
        log(f"  [phase2][cache] timing exists: {slug}")
        return True
    if not os.path.exists(stem):
        log(f"  [phase2][skip] stem missing: {slug}")
        return False

    log(f"  [phase2][run] whisperx {slug}")
    t0 = time.time()
    try:
        words = extractor.run_whisperx(stem)
        extractor.write_timing_json(slug, "", words, STEM_TIMING_DIR)
        log(f"  [phase2][ok] {slug} words={len(words)} ({round(time.time()-t0,1)}s)")
        return True
    except Exception as e:
        log(f"  [phase2][error] {slug}: {type(e).__name__}: {e}")
        return False


# ── Phase 3: promote one slug ──────────────────────────────────────────────

def promote_one(slug: str, log) -> bool:
    stem = os.path.join(STEM_TIMING_DIR, f"{slug}.json")
    prod = os.path.join(PROD_TIMING_DIR, f"{slug}.json")
    bkp = os.path.join(BACKUP_DIR, f"{slug}.json")

    if not os.path.exists(stem):
        log(f"  [phase3][skip] no stem: {slug}")
        return False

    # Preserve youtube_id from the original if we have one
    youtube_id = ""
    if os.path.exists(prod):
        Path(BACKUP_DIR).mkdir(parents=True, exist_ok=True)
        if not os.path.exists(bkp):
            shutil.copy2(prod, bkp)
        with open(prod, encoding="utf-8") as f:
            youtube_id = json.load(f).get("youtube_id", "")

    with open(stem, encoding="utf-8") as f:
        entry = json.load(f)
    if not entry.get("youtube_id") and youtube_id:
        entry["youtube_id"] = youtube_id

    with open(prod, "w", encoding="utf-8") as f:
        json.dump(entry, f, ensure_ascii=False, indent=2)
    log(f"  [phase3][ok] {slug}")
    return True


# ── Main ───────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--shard-file", required=True, help="Path to shard file (one slug per line)")
    parser.add_argument("--worker-id", type=int, default=0, help="Worker id for log prefix")
    parser.add_argument("--phase", choices=["all", "isolate", "transcribe", "promote"], default="all")
    args = parser.parse_args()

    slugs = read_shard(args.shard_file)
    wid = args.worker_id

    def log(msg: str) -> None:
        # Flush immediately so monitors see progress line-by-line
        print(f"[w{wid}] {msg}", flush=True)

    log(f"shard={args.shard_file}  slugs={len(slugs)}  phase={args.phase}")

    Path(STEM_DIR).mkdir(parents=True, exist_ok=True)
    Path(STEM_TIMING_DIR).mkdir(parents=True, exist_ok=True)

    # ── Phase 1: isolate all ─────────────────────────────────────────────
    if args.phase in ("all", "isolate"):
        log(f"=== phase 1: isolate (n={len(slugs)}) ===")
        t0 = time.time()
        ok = sum(1 for i, s in enumerate(slugs, 1)
                 if (log(f"[{i}/{len(slugs)}] isolate {s}"), isolate_one(s, log))[1])
        log(f"=== phase 1 done  ok={ok}/{len(slugs)}  elapsed={round(time.time()-t0,1)}s ===")

    # ── Phase 2: transcribe all ──────────────────────────────────────────
    if args.phase in ("all", "transcribe"):
        log(f"=== phase 2: transcribe (loading WhisperX once) ===")
        t0 = time.time()
        extractor = load_extractor()
        log(f"[config] model={extractor.WHISPER_MODEL}  batch={extractor.BATCH_SIZE}  lang={extractor.WHISPER_LANGUAGE}")
        ok = sum(1 for i, s in enumerate(slugs, 1)
                 if (log(f"[{i}/{len(slugs)}] transcribe {s}"), transcribe_one(extractor, s, log))[1])
        log(f"=== phase 2 done  ok={ok}/{len(slugs)}  elapsed={round(time.time()-t0,1)}s ===")

    # ── Phase 3: promote all ─────────────────────────────────────────────
    if args.phase in ("all", "promote"):
        log(f"=== phase 3: promote (n={len(slugs)}) ===")
        t0 = time.time()
        ok = sum(1 for s in slugs if promote_one(s, log))
        log(f"=== phase 3 done  ok={ok}/{len(slugs)}  elapsed={round(time.time()-t0,1)}s ===")

    log(f"=== worker {wid} finished ===")


if __name__ == "__main__":
    main()
