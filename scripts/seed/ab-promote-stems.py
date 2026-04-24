#!/usr/bin/env python3
"""
ab-promote-stems.py — Swap stem-based timing-cache into production.

For each slug, backup the original timing JSON and overwrite it with the
stem-based output. Preserves `youtube_id` from the original (stem output
doesn't know it) so downstream consumers keep working.

Usage:
    python scripts/seed/ab-promote-stems.py --pilot
    python scripts/seed/ab-promote-stems.py slug1 slug2 ...
    python scripts/seed/ab-promote-stems.py --all     # every slug with a stem entry

Rollback:
    cp data/timing-cache/_pre-demucs/{slug}.json data/timing-cache/{slug}.json
"""

import argparse
import json
import os
import shutil
import sys
from pathlib import Path

ORIG_DIR = "data/timing-cache"
STEM_DIR = "data/timing-cache-stem"
BACKUP_DIR = "data/timing-cache/_pre-demucs"

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


def promote_one(slug: str) -> str:
    """Returns one of: promoted, no_stem, no_orig, error."""
    orig_path = os.path.join(ORIG_DIR, f"{slug}.json")
    stem_path = os.path.join(STEM_DIR, f"{slug}.json")
    backup_path = os.path.join(BACKUP_DIR, f"{slug}.json")

    if not os.path.exists(stem_path):
        return "no_stem"

    # Back up the original (if present) before overwriting.
    if os.path.exists(orig_path):
        Path(BACKUP_DIR).mkdir(parents=True, exist_ok=True)
        if not os.path.exists(backup_path):
            shutil.copy2(orig_path, backup_path)

        with open(orig_path, encoding="utf-8") as f:
            orig = json.load(f)
        youtube_id = orig.get("youtube_id", "")
    else:
        youtube_id = ""

    with open(stem_path, encoding="utf-8") as f:
        stem = json.load(f)

    # Preserve youtube_id; stem entries were written without it.
    if not stem.get("youtube_id") and youtube_id:
        stem["youtube_id"] = youtube_id

    with open(orig_path, "w", encoding="utf-8") as f:
        json.dump(stem, f, ensure_ascii=False, indent=2)

    return "promoted"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("slugs", nargs="*", help="Slugs to promote")
    parser.add_argument("--pilot", action="store_true", help="Use the 8-song pilot set")
    parser.add_argument(
        "--all",
        action="store_true",
        help="Promote every slug that has a data/timing-cache-stem/{slug}.json entry",
    )
    args = parser.parse_args()

    if args.all:
        slugs = sorted(
            fn[:-5] for fn in os.listdir(STEM_DIR) if fn.endswith(".json")
        )
    elif args.slugs:
        slugs = args.slugs
    elif args.pilot:
        slugs = PILOT_SLUGS
    else:
        parser.error("provide slugs, --pilot, or --all")

    print(f"[config] orig={ORIG_DIR}  stem={STEM_DIR}  backup={BACKUP_DIR}  slugs={len(slugs)}")
    print("=" * 66)

    counts = {"promoted": 0, "no_stem": 0, "no_orig": 0, "error": 0}
    for i, slug in enumerate(slugs, 1):
        try:
            outcome = promote_one(slug)
        except Exception as e:
            print(f"[{i}/{len(slugs)}] {slug}  ERROR: {type(e).__name__}: {e}", file=sys.stderr)
            counts["error"] += 1
            continue

        counts[outcome] += 1
        marker = {"promoted": "[ok]", "no_stem": "[skip]", "no_orig": "[warn]"}[outcome]
        print(f"[{i}/{len(slugs)}] {marker} {slug}  ({outcome})")

    print()
    print("=" * 66)
    print(
        f"[done] promoted={counts['promoted']}  skipped_no_stem={counts['no_stem']}  "
        f"warn_no_orig={counts['no_orig']}  errors={counts['error']}"
    )
    print(f"Originals backed up to: {BACKUP_DIR}/")
    sys.exit(0 if counts["error"] == 0 else 1)


if __name__ == "__main__":
    main()
