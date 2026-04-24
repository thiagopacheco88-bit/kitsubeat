#!/usr/bin/env python3
"""
ab-transcribe-stems.py — Rerun WhisperX on Demucs vocal stems.

Reads data/vocal-stems/{slug}.wav and writes data/timing-cache-stem/{slug}.json
using the exact same WhisperX model / alignment settings as the production
extractor (04-extract-timing.py). Reuses run_whisperx() and write_timing_json()
from that module via importlib so the A/B comparison stays apples-to-apples.

Usage:
    python scripts/seed/ab-transcribe-stems.py --pilot
    python scripts/seed/ab-transcribe-stems.py slug1 slug2 ...

Output:
    data/timing-cache-stem/{slug}.json   (same schema as data/timing-cache)
"""

import argparse
import importlib.util
import os
import sys
import time
from pathlib import Path

STEM_DIR = "data/vocal-stems"
OUT_DIR = "data/timing-cache-stem"
EXTRACT_MODULE_PATH = "scripts/seed/04-extract-timing.py"

# Same pilot set as ab-demucs-isolate.py
PILOT_SLUGS = [
    "whats-up-people-maximum-the-hormone",
    "speed-analogfish",
    "99-mob-choir",
    "mountain-a-go-go-too-captain-straydum",
    "vivid-vice-who-ya-extended",
    "change-the-world-v6",
    "kick-back-kenshi-yonezu",
    "specialz-king-gnu",
]


def load_extractor():
    """Dynamically import 04-extract-timing.py (leading digit blocks normal import)."""
    spec = importlib.util.spec_from_file_location("extract_timing", EXTRACT_MODULE_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {EXTRACT_MODULE_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("slugs", nargs="*", help="Slugs to transcribe (overrides --pilot)")
    parser.add_argument("--pilot", action="store_true", help="Use the pilot set")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-transcribe even if stem-timing JSON already exists",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=16,
        help="WhisperX batch size (default: 16; lower to 1-4 on low-RAM CPUs)",
    )
    args = parser.parse_args()

    slugs = args.slugs or (PILOT_SLUGS if args.pilot else [])
    if not slugs:
        parser.error("provide slugs or --pilot")

    extractor = load_extractor()
    # Override module-level state the same way 04-extract-timing.py does in main()
    extractor.BATCH_SIZE = args.batch_size
    print(f"[config] model={extractor.WHISPER_MODEL}  batch_size={extractor.BATCH_SIZE}  "
          f"language={extractor.WHISPER_LANGUAGE}  out={OUT_DIR}")
    print("=" * 66)

    Path(OUT_DIR).mkdir(parents=True, exist_ok=True)

    ok_count = 0
    fail_count = 0
    skip_count = 0

    for i, slug in enumerate(slugs, 1):
        print(f"\n[{i}/{len(slugs)}] {slug}")

        stem_path = os.path.join(STEM_DIR, f"{slug}.wav")
        out_path = os.path.join(OUT_DIR, f"{slug}.json")

        if not os.path.exists(stem_path):
            print(f"  [skip] stem not found: {stem_path}")
            fail_count += 1
            continue

        if os.path.exists(out_path) and not args.force:
            print(f"  [cache] already transcribed: {out_path}")
            skip_count += 1
            continue

        t0 = time.time()
        try:
            words = extractor.run_whisperx(stem_path)
            # youtube_id is not known here; we preserve the schema but leave it empty
            extractor.write_timing_json(slug, "", words, OUT_DIR)
            elapsed = round(time.time() - t0, 1)
            print(f"  [ok] {len(words)} words ({elapsed}s) -> {out_path}")
            ok_count += 1
        except Exception as e:
            print(f"  [error] {slug} failed: {type(e).__name__}: {e}", file=sys.stderr)
            fail_count += 1

    print()
    print("=" * 66)
    print(f"[done] ok={ok_count}  skipped={skip_count}  failed={fail_count}  total={len(slugs)}")
    sys.exit(0 if fail_count == 0 else 1)


if __name__ == "__main__":
    main()
