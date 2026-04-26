#!/usr/bin/env python3
"""
tv-demucs-isolate.py — yt-dlp download + htdemucs vocal isolation for TV cuts.

Downloads the TV YouTube cut for each slug, then runs htdemucs (Hybrid
Transformer Demucs) source separation to extract the vocal stem. Output is
consumed by tv-transcribe-stems.py which runs WhisperX large-v3 ja on the
stems to produce data/timing-cache-tv-stem/{slug}.json for the NW derive step.

Mirror of ab-demucs-isolate.py but with TV-specific paths and an added yt-dlp
download step (TV audio is not pre-downloaded into public/audio/).

Usage:
    # All TV songs from manifest
    python scripts/seed/tv-demucs-isolate.py --all

    # Explicit slugs
    python scripts/seed/tv-demucs-isolate.py sign-flow kaguya-sama

    # Re-process even if outputs exist
    python scripts/seed/tv-demucs-isolate.py sign-flow --force

Input:
    data/songs-manifest-tv.json  (produced by 10-prepare-tv.ts)

Output:
    data/audio-tv/{slug}.mp3                          (downloaded TV audio)
    data/vocal-stems-tv/htdemucs/{slug}/vocals.wav    (isolated vocal stem)

Idempotent: skips slugs whose outputs already exist (rerun = zero work).
Demucs htdemucs on CPU is roughly 0.3x realtime.

Security note (T-11.2-01): youtube_id is read from the manifest (trusted
catalog data); subprocess.run invoked with a list (NOT shell=True) so there
is no shell-injection surface.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

import demucs.separate

AUDIO_DIR = "data/audio-tv"
STEM_DIR = "data/vocal-stems-tv"
DEMUCS_MODEL = "htdemucs"
MANIFEST_PATH = "data/songs-manifest-tv.json"


def yt_dlp_path() -> str:
    """Prefer the venv binary on Windows, fall back to PATH lookup.

    Mirrors download-missing-audio.py::yt_dlp_path().
    """
    # Windows venv layout
    local_win = os.path.abspath(os.path.join(".venv", "Scripts", "yt-dlp.exe"))
    if os.path.exists(local_win):
        return local_win
    # Unix venv layout
    local_unix = os.path.abspath(os.path.join(".venv", "bin", "yt-dlp"))
    if os.path.exists(local_unix):
        return local_unix
    return shutil.which("yt-dlp") or "yt-dlp"


def load_manifest() -> dict[str, str]:
    """Return {slug: youtube_id} from data/songs-manifest-tv.json."""
    if not os.path.exists(MANIFEST_PATH):
        print(f"[error] manifest not found: {MANIFEST_PATH}", file=sys.stderr)
        print(
            "[hint]  Run `npx tsx scripts/seed/10-prepare-tv.ts` to generate it.",
            file=sys.stderr,
        )
        sys.exit(1)
    with open(MANIFEST_PATH, encoding="utf-8") as f:
        entries = json.load(f)
    return {e["slug"]: e["youtube_id"] for e in entries}


def download_audio(yt_dlp: str, slug: str, youtube_id: str, force: bool) -> bool:
    """Download TV audio for slug. Returns True on success/skip, False on failure."""
    mp3_path = os.path.join(AUDIO_DIR, f"{slug}.mp3")

    if os.path.exists(mp3_path) and not force:
        print(f"  [skip-download] {slug} — mp3 already at {mp3_path}")
        return True

    url = f"https://youtu.be/{youtube_id}"
    # Use list form (NOT shell=True) — no shell-injection surface (T-11.2-01).
    cmd = [
        yt_dlp,
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", "0",
        "-o", f"{AUDIO_DIR}/{slug}.%(ext)s",
        url,
    ]
    print(f"  [download] {slug}  (yid={youtube_id})")
    t0 = time.time()
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"  [error] yt-dlp failed for {slug}: rc={e.returncode}", file=sys.stderr)
        return False
    elapsed = round(time.time() - t0, 1)

    if not os.path.exists(mp3_path):
        print(f"  [error] {slug} — yt-dlp returned 0 but mp3 missing at {mp3_path}", file=sys.stderr)
        return False

    size_mb = round(os.path.getsize(mp3_path) / (1024 * 1024), 2)
    print(f"  [download-ok] {slug} ({elapsed}s, {size_mb} MB)")
    return True


def isolate_vocals(slug: str, force: bool) -> tuple[bool, float]:
    """Run htdemucs on the TV mp3. Returns (success, elapsed_seconds)."""
    mp3_path = os.path.join(AUDIO_DIR, f"{slug}.mp3")
    if not os.path.exists(mp3_path):
        print(f"  [skip-demucs] {slug} — source mp3 not found at {mp3_path}", file=sys.stderr)
        return False, 0.0

    # TV stems keep the nested htdemucs layout (NOT flattened like ab-demucs-isolate).
    # Downstream scripts expect: data/vocal-stems-tv/htdemucs/{slug}/vocals.wav
    final_stem_path = os.path.join(STEM_DIR, DEMUCS_MODEL, slug, "vocals.wav")

    if os.path.exists(final_stem_path) and not force:
        print(f"  [skip-demucs] {slug} — stem already at {final_stem_path}")
        return True, 0.0

    print(f"  [demucs] {slug} — separating ...")
    t0 = time.time()
    try:
        demucs.separate.main(
            [
                "--two-stems=vocals",
                "-n", DEMUCS_MODEL,
                "-o", STEM_DIR,
                mp3_path,
            ]
        )
    except SystemExit as e:
        if e.code not in (None, 0):
            print(f"  [error] demucs failed for {slug}: exit code {e.code}", file=sys.stderr)
            return False, round(time.time() - t0, 1)
    except Exception as e:
        print(f"  [error] demucs failed for {slug}: {type(e).__name__}: {e}", file=sys.stderr)
        return False, round(time.time() - t0, 1)
    elapsed = round(time.time() - t0, 1)

    if not os.path.exists(final_stem_path):
        print(
            f"  [error] {slug} — expected stem not found at {final_stem_path}",
            file=sys.stderr,
        )
        return False, elapsed

    print(f"  [demucs-ok] {slug} — stem at {final_stem_path} ({elapsed}s)")
    return True, elapsed


def process_one(yt_dlp: str, slug: str, youtube_id: str, force: bool, i: int, total: int) -> bool:
    """Download + isolate one slug. Returns True on full success."""
    print(f"\n[{i}/{total}] {slug}")

    # Check if both outputs already exist (fast idempotent short-circuit)
    mp3_path = os.path.join(AUDIO_DIR, f"{slug}.mp3")
    final_stem_path = os.path.join(STEM_DIR, DEMUCS_MODEL, slug, "vocals.wav")
    if os.path.exists(mp3_path) and os.path.exists(final_stem_path) and not force:
        print(f"  [skip] {slug} (mp3 + stem exist)")
        return True

    t_total = time.time()

    # Step 1: Download TV audio via yt-dlp
    t_dl = time.time()
    dl_ok = download_audio(yt_dlp, slug, youtube_id, force)
    dl_elapsed = round(time.time() - t_dl, 1)
    if not dl_ok:
        return False

    # Step 2: Isolate vocals via htdemucs
    demucs_ok, demucs_elapsed = isolate_vocals(slug, force)
    if not demucs_ok:
        return False

    total_elapsed = round(time.time() - t_total, 1)
    print(f"  [N/A] {slug}  download={dl_elapsed}s  demucs={demucs_elapsed}s  total={total_elapsed}s")
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "slugs",
        nargs="*",
        help="Slug(s) to process. Use --all to process every slug in the manifest.",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Process every slug in data/songs-manifest-tv.json",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download and re-run demucs even if outputs already exist",
    )
    args = parser.parse_args()

    if not args.slugs and not args.all:
        parser.error("provide one or more slugs, or --all to process the full manifest")

    manifest = load_manifest()

    if args.all:
        slugs = list(manifest.keys())
    else:
        slugs = args.slugs

    # Validate requested slugs against manifest
    missing = [s for s in slugs if s not in manifest]
    if missing:
        for s in missing:
            print(f"[warn] slug not in manifest: {s}", file=sys.stderr)
        slugs = [s for s in slugs if s in manifest]
        if not slugs:
            print("[error] no valid slugs to process", file=sys.stderr)
            sys.exit(1)

    Path(AUDIO_DIR).mkdir(parents=True, exist_ok=True)
    Path(os.path.join(STEM_DIR, DEMUCS_MODEL)).mkdir(parents=True, exist_ok=True)

    yt_dlp = yt_dlp_path()
    print(f"[config] model={DEMUCS_MODEL}  slugs={len(slugs)}  yt-dlp={yt_dlp}")
    print(f"[config] audio_dir={AUDIO_DIR}  stem_dir={STEM_DIR}/{DEMUCS_MODEL}")
    print("=" * 66)

    ok_count = 0
    fail_count = 0
    skip_count = 0

    for i, slug in enumerate(slugs, 1):
        mp3_path = os.path.join(AUDIO_DIR, f"{slug}.mp3")
        final_stem_path = os.path.join(STEM_DIR, DEMUCS_MODEL, slug, "vocals.wav")

        # Fast idempotent check before calling process_one
        if os.path.exists(mp3_path) and os.path.exists(final_stem_path) and not args.force:
            print(f"\n[{i}/{len(slugs)}] [skip] {slug} (mp3 + stem exist)")
            skip_count += 1
            continue

        youtube_id = manifest[slug]
        success = process_one(yt_dlp, slug, youtube_id, args.force, i, len(slugs))
        if success:
            ok_count += 1
        else:
            fail_count += 1

    print()
    print("=" * 66)
    print(f"[done] ok={ok_count}  skipped={skip_count}  failed={fail_count}  total={len(slugs)}")
    sys.exit(0 if fail_count == 0 else 1)


if __name__ == "__main__":
    main()
