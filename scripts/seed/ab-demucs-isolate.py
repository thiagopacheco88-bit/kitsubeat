#!/usr/bin/env python3
"""
ab-demucs-isolate.py — Vocal stem isolation for the Demucs+WhisperX A/B test.

Runs htdemucs (Hybrid Transformer Demucs) source separation on a list of
song slugs, extracting the vocal stem for each. The stems are the input to
ab-transcribe-stems.py, which reruns WhisperX on them and writes results to
data/timing-cache-stem/. Comparison is done by ab-compare-kcov.ts.

Usage:
    # Pilot preset (4 INSUFFICIENT_SIGNAL + 4 low-kCov ACCEPT controls)
    python scripts/seed/ab-demucs-isolate.py --pilot

    # Explicit slugs
    python scripts/seed/ab-demucs-isolate.py slug1 slug2 slug3

Input:
    public/audio/{slug}.mp3

Output:
    data/vocal-stems/{slug}.wav

Idempotent: skips slugs whose stem already exists. Uses CPU by default
(torch auto-detect). Demucs htdemucs on CPU is roughly 0.3x realtime.
"""

import argparse
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

AUDIO_DIR = "public/audio"
STEM_DIR = "data/vocal-stems"
DEMUCS_MODEL = "htdemucs"

# Pilot slugs — selected from data/lyrics-validation-report.json on 2026-04-24.
# Includes the 4 INSUFFICIENT_SIGNAL cases (Whisper produced degenerate output,
# likely drowned by music) and the 4 lowest-kCov ACCEPT cases (known-good
# ground truth with measurable headroom).
PILOT_SLUGS = [
    # INSUFFICIENT_SIGNAL — Whisper failed. Can Demucs unlock them?
    "whats-up-people-maximum-the-hormone",
    "speed-analogfish",
    "99-mob-choir",
    "mountain-a-go-go-too-captain-straydum",
    # ACCEPT low-kCov — controls with ground truth. Does stem transcription lift kCov?
    "vivid-vice-who-ya-extended",
    "change-the-world-v6",
    "kick-back-kenshi-yonezu",
    "specialz-king-gnu",
]


def isolate_one(slug: str) -> bool:
    """Run demucs on one slug. Returns True on success, False on failure."""
    mp3_path = os.path.join(AUDIO_DIR, f"{slug}.mp3")
    if not os.path.exists(mp3_path):
        print(f"  [skip] {slug} — source mp3 not found at {mp3_path}", file=sys.stderr)
        return False

    final_stem_path = os.path.join(STEM_DIR, f"{slug}.wav")
    if os.path.exists(final_stem_path):
        print(f"  [cache] {slug} — stem already at {final_stem_path}")
        return True

    # Demucs writes to {out}/{model}/{mp3_stem}/vocals.wav
    demucs_out_dir = STEM_DIR
    nested_path = os.path.join(STEM_DIR, DEMUCS_MODEL, slug, "vocals.wav")

    cmd = [
        sys.executable,  # use the venv python that invoked us
        "-m", "demucs",
        "-n", DEMUCS_MODEL,
        "--two-stems", "vocals",
        "-o", demucs_out_dir,
        mp3_path,
    ]

    print(f"  [demucs] {slug} — separating ...")
    t0 = time.time()
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"  [error] demucs failed for {slug}: {e}", file=sys.stderr)
        return False
    elapsed = round(time.time() - t0, 1)

    if not os.path.exists(nested_path):
        print(f"  [error] {slug} — expected stem not found at {nested_path}", file=sys.stderr)
        return False

    # Flatten: move vocals.wav up and remove the per-song nested dir.
    # Keeping a single-file layout so downstream scripts can just glob {slug}.wav.
    shutil.move(nested_path, final_stem_path)
    nested_dir = os.path.dirname(nested_path)
    try:
        shutil.rmtree(nested_dir)
    except OSError:
        pass

    print(f"  [ok] {slug} — stem at {final_stem_path} ({elapsed}s)")
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("slugs", nargs="*", help="Slugs to isolate (overrides --pilot)")
    parser.add_argument(
        "--pilot",
        action="store_true",
        help="Use the 8-song pilot set defined in PILOT_SLUGS",
    )
    args = parser.parse_args()

    slugs = args.slugs or (PILOT_SLUGS if args.pilot else [])
    if not slugs:
        parser.error("provide slugs or --pilot")

    Path(STEM_DIR).mkdir(parents=True, exist_ok=True)

    print(f"[config] model={DEMUCS_MODEL}  slugs={len(slugs)}  out={STEM_DIR}")
    print("=" * 66)

    ok_count = 0
    fail_count = 0
    for i, slug in enumerate(slugs, 1):
        print(f"\n[{i}/{len(slugs)}] {slug}")
        if isolate_one(slug):
            ok_count += 1
        else:
            fail_count += 1

    # Clean up empty model dir demucs may have left behind
    leftover = os.path.join(STEM_DIR, DEMUCS_MODEL)
    if os.path.isdir(leftover) and not os.listdir(leftover):
        try:
            os.rmdir(leftover)
        except OSError:
            pass

    print()
    print("=" * 66)
    print(f"[done] ok={ok_count}  failed={fail_count}  total={len(slugs)}")
    sys.exit(0 if fail_count == 0 else 1)


if __name__ == "__main__":
    main()
