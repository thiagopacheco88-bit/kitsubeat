#!/usr/bin/env python3
"""
download-missing-audio.py — Fetch YouTube audio for every manifest song that
doesn't yet have public/audio/{slug}.mp3 on disk.

Reads data/audio-download-queue.json (built by the planning step) and shells
out to yt-dlp for each entry. Runs serially with a small inter-request sleep
to stay polite to YouTube and to leave CPU/disk for any Demucs worker that
might be running concurrently — yt-dlp is network-bound and doesn't compete
much with Demucs (CPU-bound), so the two pipelines run cleanly in parallel.

Idempotent: skips slugs whose mp3 already exists, and retries the rest.

Usage:
    python scripts/seed/download-missing-audio.py
    python scripts/seed/download-missing-audio.py --queue data/audio-download-queue.json --sleep 2
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

AUDIO_DIR = "public/audio"
DEFAULT_QUEUE = "data/audio-download-queue.json"
LOG_PATH = "data/download-missing-audio.log"


def yt_dlp_path() -> str:
    """Prefer the venv binary on Windows, fall back to PATH lookup."""
    local = os.path.abspath(os.path.join(".venv", "Scripts", "yt-dlp.exe"))
    if os.path.exists(local):
        return local
    return shutil.which("yt-dlp") or "yt-dlp"


def download_one(yt_dlp: str, slug: str, youtube_id: str, log) -> bool:
    out_path = os.path.join(AUDIO_DIR, f"{slug}.mp3")
    if os.path.exists(out_path):
        log(f"  [cache] {slug} — mp3 already on disk")
        return True

    url = f"https://www.youtube.com/watch?v={youtube_id}"
    cmd = [
        yt_dlp,
        "--extract-audio",
        "--audio-format", "mp3",
        "--audio-quality", "0",
        "-o", out_path,
        url,
    ]
    log(f"  [run] yt-dlp {slug}  (yid={youtube_id})")
    t0 = time.time()
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as e:
        # yt-dlp prints a clean error message on stderr; surface the last line.
        stderr_tail = (e.stderr or "").strip().splitlines()[-1:]
        log(f"  [error] {slug} — yt-dlp rc={e.returncode}: {stderr_tail[0] if stderr_tail else '(no stderr)'}")
        return False
    elapsed = round(time.time() - t0, 1)
    if not os.path.exists(out_path):
        log(f"  [error] {slug} — yt-dlp claimed success but mp3 missing")
        return False
    size_mb = round(os.path.getsize(out_path) / (1024 * 1024), 2)
    log(f"  [ok] {slug} ({elapsed}s, {size_mb} MB)")
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--queue", default=DEFAULT_QUEUE)
    parser.add_argument("--sleep", type=float, default=2.0,
                        help="Seconds to sleep between requests (default 2)")
    args = parser.parse_args()

    Path(AUDIO_DIR).mkdir(parents=True, exist_ok=True)

    if not os.path.exists(args.queue):
        print(f"queue not found: {args.queue}", file=sys.stderr)
        sys.exit(1)

    with open(args.queue, encoding="utf-8") as f:
        items = json.load(f)

    yt_dlp = yt_dlp_path()
    print(f"yt-dlp: {yt_dlp}")
    print(f"queue:  {args.queue}  ({len(items)} entries)")
    print(f"sleep:  {args.sleep}s between requests")
    print("=" * 64, flush=True)

    def log(msg: str) -> None:
        print(msg, flush=True)

    ok = 0
    skipped = 0
    failed = 0

    for i, item in enumerate(items, 1):
        slug = item["slug"]
        yid = item["youtube_id"]
        log(f"[{i}/{len(items)}] {slug}")

        # Pre-existing cache? Don't sleep, don't count as work.
        if os.path.exists(os.path.join(AUDIO_DIR, f"{slug}.mp3")):
            log(f"  [cache] {slug} — mp3 already on disk")
            skipped += 1
            continue

        success = download_one(yt_dlp, slug, yid, log)
        if success:
            ok += 1
        else:
            failed += 1

        # Inter-request sleep — only between actual network calls.
        if i < len(items):
            time.sleep(args.sleep)

    print("=" * 64)
    print(f"Downloaded: {ok}")
    print(f"Cached:     {skipped}")
    print(f"Failed:     {failed}")
    print(f"Total:      {len(items)}")


if __name__ == "__main__":
    main()
