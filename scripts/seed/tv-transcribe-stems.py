#!/usr/bin/env python3
"""
tv-transcribe-stems.py — WhisperX large-v3 ja transcription on TV vocal stems.

Reads data/vocal-stems-tv/htdemucs/{slug}/vocals.wav (produced by
tv-demucs-isolate.py) and writes data/timing-cache-tv-stem/{slug}.json in the
same schema as data/timing-cache-tv/ and data/timing-cache-stem/. The output
is consumed by 10b-derive-tv-lessons-nw.ts for Needleman-Wunsch alignment.

Mirrors ab-transcribe-stems.py but with TV-specific input/output paths.
Reuses run_whisperx() and write_timing_json() from 04-extract-timing.py via
importlib so the TV transcription stays apples-to-apples with production.

Usage:
    # All TV slugs whose stem exists
    python scripts/seed/tv-transcribe-stems.py --all

    # Explicit slugs
    python scripts/seed/tv-transcribe-stems.py sign-flow kaguya-sama

    # Re-transcribe even if JSON already exists
    python scripts/seed/tv-transcribe-stems.py sign-flow --force

    # Lower batch size on RAM-constrained machines
    python scripts/seed/tv-transcribe-stems.py --all --batch-size 4

Input:
    data/vocal-stems-tv/htdemucs/{slug}/vocals.wav

Output:
    data/timing-cache-tv-stem/{slug}.json   (same schema as data/timing-cache)
"""

import argparse
import glob
import importlib.util
import os
import sys
import time
from pathlib import Path

STEM_DIR = "data/vocal-stems-tv"
OUT_DIR = "data/timing-cache-tv-stem"
EXTRACT_MODULE_PATH = "scripts/seed/04-extract-timing.py"
DEMUCS_MODEL = "htdemucs"


def load_extractor():
    """Dynamically import 04-extract-timing.py (leading digit blocks normal import).

    Mirrors ab-transcribe-stems.py::load_extractor() verbatim.
    """
    spec = importlib.util.spec_from_file_location("extract_timing", EXTRACT_MODULE_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {EXTRACT_MODULE_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> None:
    # -------------------------------------------------------------------------
    # WhisperX environment setup — MUST happen BEFORE load_extractor() is called.
    # -------------------------------------------------------------------------

    # Per memory feedback_whisperx_needs_venv_scripts_on_path: WhisperX fails
    # with WinError 2 at load_audio if .venv/Scripts is not on PATH. Inject it.
    venv_scripts = os.path.join(os.getcwd(), ".venv", "Scripts")
    if os.path.isdir(venv_scripts) and venv_scripts not in os.environ.get("PATH", ""):
        os.environ["PATH"] = venv_scripts + os.pathsep + os.environ.get("PATH", "")

    # Per SPEC.md constraint: PYTHONIOENCODING=utf-8 mandatory; without it
    # WhisperX fails on Japanese console output on Windows.
    os.environ["PYTHONIOENCODING"] = "utf-8"

    # -------------------------------------------------------------------------
    # Argument parsing
    # -------------------------------------------------------------------------
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "slugs",
        nargs="*",
        help="Slug(s) to transcribe. Use --all to process every available stem.",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help=(
            "Process every slug whose stem exists in "
            f"{STEM_DIR}/{DEMUCS_MODEL}/*/vocals.wav"
        ),
    )
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

    if not args.slugs and not args.all:
        parser.error("provide one or more slugs, or --all to process all available stems")

    # -------------------------------------------------------------------------
    # Resolve slug list
    # -------------------------------------------------------------------------
    if args.all:
        # Glob for all vocal.wav stems and derive slug from parent directory name
        stem_pattern = os.path.join(STEM_DIR, DEMUCS_MODEL, "*", "vocals.wav")
        stem_paths = glob.glob(stem_pattern)
        slugs = sorted(Path(p).parent.name for p in stem_paths)
        if not slugs:
            print(
                f"[warn] no stems found in {STEM_DIR}/{DEMUCS_MODEL}/*/vocals.wav",
                file=sys.stderr,
            )
            sys.exit(0)
    else:
        slugs = args.slugs

    # -------------------------------------------------------------------------
    # Load extractor module
    # -------------------------------------------------------------------------
    extractor = load_extractor()
    # Override module-level state the same way 04-extract-timing.py does in main()
    extractor.BATCH_SIZE = args.batch_size
    print(
        f"[config] model={extractor.WHISPER_MODEL}  batch_size={extractor.BATCH_SIZE}  "
        f"language={extractor.WHISPER_LANGUAGE}  out={OUT_DIR}"
    )
    print("=" * 66)

    Path(OUT_DIR).mkdir(parents=True, exist_ok=True)

    ok_count = 0
    fail_count = 0
    skip_count = 0

    for i, slug in enumerate(slugs, 1):
        print(f"\n[{i}/{len(slugs)}] {slug}")

        # Step 1: Resolve stem path
        stem_path = os.path.join(STEM_DIR, DEMUCS_MODEL, slug, "vocals.wav")
        out_path = os.path.join(OUT_DIR, f"{slug}.json")

        if not os.path.exists(stem_path):
            print(
                f"  [skip] stem not found: {stem_path}  "
                f"(run tv-demucs-isolate.py {slug} first)",
                file=sys.stderr,
            )
            fail_count += 1
            continue

        # Step 2: Idempotent skip-if-exists
        if os.path.exists(out_path) and not args.force:
            print(f"  [cache] already transcribed: {out_path}")
            skip_count += 1
            continue

        # Step 3: Transcribe
        t0 = time.time()
        try:
            words = extractor.run_whisperx(stem_path)
            # youtube_id is not known here; leave it empty (mirrors ab-transcribe-stems.py)
            extractor.write_timing_json(slug, "", words, OUT_DIR)
            elapsed = round(time.time() - t0, 1)
            print(f"  [ok] {len(words)} words ({elapsed}s) -> {out_path}")
            ok_count += 1
        except Exception as e:
            print(
                f"  [error] {slug} failed: {type(e).__name__}: {e}",
                file=sys.stderr,
            )
            fail_count += 1

    print()
    print("=" * 66)
    print(
        f"[done] ok={ok_count}  skipped={skip_count}  failed={fail_count}  total={len(slugs)}"
    )
    sys.exit(0 if fail_count == 0 else 1)


if __name__ == "__main__":
    main()
