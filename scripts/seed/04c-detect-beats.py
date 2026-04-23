#!/usr/bin/env python3
"""
04c-detect-beats.py — librosa beat/tempo extraction for Kitsubeat.

Produces per-song beat grids that the backfill step snaps verse/line breaks
to, so reconstructed lyrics from WhisperX respect musical bar boundaries
instead of raw silence gaps alone.

Output:
    data/beat-cache/{song_slug}.json
    {
      "song_slug": "...",
      "tempo_bpm": 134.0,
      "beats_s": [0.45, 0.90, 1.34, ...]
    }

Usage:
    python scripts/seed/04c-detect-beats.py --all
    python scripts/seed/04c-detect-beats.py --slug guren-no-yumiya-linked-horizon
    python scripts/seed/04c-detect-beats.py --slug-file data/pending-slugs.txt
"""

import argparse
import json
import sys
from pathlib import Path

import librosa

ROOT = Path(__file__).resolve().parent.parent.parent
AUDIO_DIR = ROOT / "public" / "audio"
OUTPUT_DIR = ROOT / "data" / "beat-cache"


def detect_one(slug: str, audio_path: Path, output_path: Path) -> dict:
    """Load audio, run librosa beat_track, write a compact JSON summary.

    librosa.beat.beat_track is HMM-based; it estimates a single tempo for the
    song and returns beat-frame indices. For J-pop / anime OPs this is
    reliable — these songs are almost always in a stable 4/4.
    """
    y, sr = librosa.load(str(audio_path), sr=None, mono=True)
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    beats_s = librosa.frames_to_time(beat_frames, sr=sr).tolist()
    # librosa may return numpy scalars — cast for clean JSON.
    tempo_bpm = float(tempo) if not hasattr(tempo, "item") else float(tempo.item())
    payload = {
        "song_slug": slug,
        "tempo_bpm": round(tempo_bpm, 2),
        "beats_s": [round(b, 3) for b in beats_s],
    }
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", help="single song slug")
    parser.add_argument("--slug-file", help="newline-delimited file of slugs")
    parser.add_argument("--all", action="store_true", help="process every mp3 in public/audio/")
    parser.add_argument("--force", action="store_true", help="overwrite existing cache files")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    slugs: list[str] = []
    if args.slug:
        slugs = [args.slug]
    elif args.slug_file:
        slugs = [l.strip() for l in Path(args.slug_file).read_text().splitlines() if l.strip()]
    elif args.all:
        slugs = sorted(p.stem for p in AUDIO_DIR.glob("*.mp3"))
    else:
        parser.error("must pass --slug, --slug-file, or --all")

    print(f"beat-detect: {len(slugs)} song(s)")
    ok = skipped = missing = failed = 0
    for i, slug in enumerate(slugs, 1):
        audio = AUDIO_DIR / f"{slug}.mp3"
        out = OUTPUT_DIR / f"{slug}.json"
        if not audio.exists():
            print(f"  [{i}/{len(slugs)}] {slug}  audio missing — skip", file=sys.stderr)
            missing += 1
            continue
        if out.exists() and not args.force:
            skipped += 1
            continue
        try:
            res = detect_one(slug, audio, out)
            print(
                f"  [{i}/{len(slugs)}] {slug}  tempo={res['tempo_bpm']} bpm  beats={len(res['beats_s'])}"
            )
            ok += 1
        except Exception as e:  # noqa: BLE001 — we want every failure logged, not crashed
            print(f"  [{i}/{len(slugs)}] {slug}  FAIL — {e}", file=sys.stderr)
            failed += 1

    print()
    print(f"summary: ok={ok} skipped={skipped} missing={missing} failed={failed}")


if __name__ == "__main__":
    main()
