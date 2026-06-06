#!/usr/bin/env python3
"""
05-fetch-subs.py — Download official Japanese subtitles for anime scenes.

Downloads 'ja-orig' (preferred) or 'ja' auto-captions from YouTube, parses
the rolling-caption VTT format into clean timed segments, and saves them to
data/subs-cache/{slug}.json.

Scenes without subs are skipped (WhisperX timing is the fallback).

Usage:
  python scripts/seed/05-fetch-subs.py
  python scripts/seed/05-fetch-subs.py --slug=erwin-final-charge-aot
  python scripts/seed/05-fetch-subs.py --force   # re-download even if cached
"""

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

MANIFEST_PATH = "data/scenes-manifest.json"
SUBS_CACHE_DIR = "data/subs-cache"
TMP_VTT_DIR = "tmp/vtt-downloads"

# Scenes confirmed to have no YouTube subtitles
NO_SUBS_SLUGS: set[str] = set()


def ts_to_ms(ts: str) -> int:
    """'00:00:07.230' -> 7230"""
    ts = ts.strip().split()[0]  # strip align/position metadata
    h, m, rest = ts.split(":")
    s, ms = rest.split(".")
    return (int(h) * 3600 + int(m) * 60 + int(s)) * 1000 + int(ms[:3])


def strip_tags(text: str) -> str:
    """Remove VTT timestamp tags and <c> highlights, return clean text."""
    text = re.sub(r"<\d{2}:\d{2}:\d{2}\.\d{3}>", "", text)
    text = re.sub(r"</?\s*c\s*>", "", text)
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip()


def parse_vtt(vtt_text: str) -> list[dict]:
    """
    Parse YouTube's rolling-caption VTT into clean timed segments.

    YouTube VTT format: each cue contains 1-2 lines. The bottom line is the
    currently-speaking line; the top line (if present) is the previous one
    fading out. Short 0.01s 'transition' cues mark sentence boundaries.
    We group consecutive cues by their bottom line to reconstruct segments.
    """
    blocks = re.split(r"\n{2,}", vtt_text.strip())
    cues = []

    for block in blocks:
        lines = [l for l in block.split("\n") if l.strip()]
        if not lines:
            continue
        timing_line = None
        text_start = 0
        for i, line in enumerate(lines):
            if "-->" in line:
                timing_line = line
                text_start = i + 1
                break
        if not timing_line:
            continue

        parts = timing_line.split("-->")
        try:
            start_ms = ts_to_ms(parts[0])
            end_ms = ts_to_ms(parts[1])
        except (ValueError, IndexError):
            continue

        raw_lines = lines[text_start:]
        clean = [strip_tags(l) for l in raw_lines]
        clean = [l for l in clean if l]
        if not clean:
            continue

        current_line = clean[-1]
        duration_ms = end_ms - start_ms

        cues.append(
            {
                "start_ms": start_ms,
                "end_ms": end_ms,
                "duration_ms": duration_ms,
                "text": current_line,
            }
        )

    # Use only cues that last > 100ms (skip the 0.01s transition artifacts)
    substantive = [c for c in cues if c["duration_ms"] > 100] or cues

    # Group consecutive cues with the same text into segments
    segments = []
    i = 0
    while i < len(substantive):
        line = substantive[i]["text"]
        seg_start = substantive[i]["start_ms"]
        j = i
        while j < len(substantive) and substantive[j]["text"] == line:
            j += 1
        seg_end = substantive[j - 1]["end_ms"]

        if not segments or segments[-1]["text"] != line:
            segments.append(
                {"start_ms": seg_start, "end_ms": seg_end, "text": line}
            )
        i = j

    return segments


def download_vtt(youtube_id: str, slug: str, out_dir: str, force: bool) -> str | None:
    """
    Download ja-orig (then ja) VTT. Returns path to the best vtt found, or None.
    Checks existing files first unless force=True.
    """
    Path(out_dir).mkdir(parents=True, exist_ok=True)

    # Check existing files
    if not force:
        for lang in ("ja-orig", "ja"):
            path = os.path.join(out_dir, f"{slug}.{lang}.vtt")
            if os.path.exists(path):
                print(f"  Using cached VTT: {path}")
                return path

    url = f"https://www.youtube.com/watch?v={youtube_id}"
    out_template = os.path.join(out_dir, slug)

    cmd = [
        "yt-dlp",
        "--write-auto-subs",
        "--sub-langs", "ja-orig,ja",
        "--sub-format", "vtt",
        "--skip-download",
        "--js-runtimes", "node",
        "-o", out_template,
        url,
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, timeout=60)
        if result.returncode != 0:
            err = result.stderr.decode("utf-8", errors="ignore")[:300]
            print(f"  [download-error] {err}")
    except subprocess.TimeoutExpired:
        print("  [download-error] timeout")
        return None

    # Return best available file
    for lang in ("ja-orig", "ja"):
        path = os.path.join(out_dir, f"{slug}.{lang}.vtt")
        if os.path.exists(path):
            return path

    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", help="Process a single scene")
    parser.add_argument("--force", action="store_true", help="Re-download even if cached")
    args = parser.parse_args()

    manifest = json.load(open(MANIFEST_PATH, encoding="utf-8"))
    if args.slug:
        entries = [e for e in manifest if e["slug"] == args.slug]
        if not entries:
            print(f"Slug '{args.slug}' not found.")
            sys.exit(1)
    else:
        entries = [e for e in manifest if e["slug"] not in NO_SUBS_SLUGS]

    Path(SUBS_CACHE_DIR).mkdir(parents=True, exist_ok=True)

    results = {"downloaded": [], "skipped": [], "failed": []}

    print(f"Processing {len(entries)} scene(s)...\n")

    for entry in entries:
        slug = entry["slug"]
        youtube_id = entry["youtube_id"]

        cache_path = os.path.join(SUBS_CACHE_DIR, f"{slug}.json")
        if os.path.exists(cache_path) and not args.force:
            size = os.path.getsize(cache_path)
            print(f"[SKIP] {slug} — already cached ({size} bytes)")
            results["skipped"].append(slug)
            continue

        print(f"[{slug}]")
        vtt_path = download_vtt(youtube_id, slug, TMP_VTT_DIR, args.force)

        if not vtt_path:
            print(f"  [FAIL] No VTT downloaded\n")
            results["failed"].append(slug)
            continue

        vtt_text = open(vtt_path, encoding="utf-8").read()
        segments = parse_vtt(vtt_text)

        if not segments:
            print(f"  [FAIL] VTT parsed to 0 segments\n")
            results["failed"].append(slug)
            continue

        cache = {
            "slug": slug,
            "youtube_id": youtube_id,
            "source": "youtube-auto-captions",
            "sub_lang": "ja-orig" if "ja-orig" in vtt_path else "ja",
            "segment_count": len(segments),
            "segments": segments,
        }
        json.dump(cache, open(cache_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        print(f"  OK  {len(segments)} segments -> {cache_path}\n")
        results["downloaded"].append(slug)

    print("=" * 60)
    print(f"Downloaded: {len(results['downloaded'])}")
    print(f"Skipped (cached): {len(results['skipped'])}")
    print(f"Failed: {len(results['failed'])}")
    if results["failed"]:
        for s in results["failed"]:
            print(f"  - {s}")


if __name__ == "__main__":
    main()
