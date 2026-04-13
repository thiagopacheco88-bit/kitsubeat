#!/usr/bin/env python3
"""
04-extract-timing.py — WhisperX word-level timing extraction for Kitsubeat

Downloads audio from YouTube via yt-dlp and produces word-level timestamps
via WhisperX CTC forced alignment.

Usage (single song):
    python scripts/seed/04-extract-timing.py <song_slug> <youtube_id>
    python scripts/seed/04-extract-timing.py <song_slug> <youtube_id> --output-dir data/timing-cache

Usage (batch — reads songs-manifest.json):
    python scripts/seed/04-extract-timing.py --batch data/songs-manifest.json
    python scripts/seed/04-extract-timing.py --batch data/songs-manifest.json --output-dir data/timing-cache

Output:
    data/timing-cache/{song_slug}.json
    public/audio/{song_slug}.mp3  (retained for Plan 05 timing editor waveform)

Requirements:
    pip install -r requirements.txt
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

DEFAULT_OUTPUT_DIR = "data/timing-cache"
PUBLIC_AUDIO_DIR = "public/audio"
TMP_DIR = "tmp"
WHISPER_MODEL = "large-v3"
WHISPER_LANGUAGE = "ja"
BATCH_SIZE = 16
LOW_CONFIDENCE_THRESHOLD = 0.6


# ─────────────────────────────────────────────────────────────────────────────
# Audio download
# ─────────────────────────────────────────────────────────────────────────────

def download_audio(youtube_id: str, song_slug: str, tmp_dir: str) -> str:
    """
    Download audio from YouTube via yt-dlp.

    Returns the path to the downloaded mp3 file.
    Raises subprocess.CalledProcessError on failure.
    """
    Path(tmp_dir).mkdir(parents=True, exist_ok=True)
    output_path = os.path.join(tmp_dir, f"{song_slug}.mp3")

    if os.path.exists(output_path):
        print(f"  [cache] Audio already downloaded: {output_path}")
        return output_path

    youtube_url = f"https://www.youtube.com/watch?v={youtube_id}"
    print(f"  [download] Downloading audio from {youtube_url} ...")

    cmd = [
        "yt-dlp",
        "--extract-audio",
        "--audio-format", "mp3",
        "--audio-quality", "0",
        "-o", output_path,
        youtube_url,
    ]

    subprocess.run(cmd, check=True, capture_output=False)
    print(f"  [download] Audio saved to: {output_path}")
    return output_path


# ─────────────────────────────────────────────────────────────────────────────
# WhisperX transcription + alignment
# ─────────────────────────────────────────────────────────────────────────────

def run_whisperx(audio_path: str) -> list[dict]:
    """
    Run WhisperX on the audio file and return word-level timestamps.

    Returns a list of word dicts: { word, start, end, score }
    Detects GPU availability; falls back to CPU with int8 compute_type.
    """
    import whisperx

    # Detect device
    try:
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu"
    except ImportError:
        device = "cpu"

    compute_type = "float16" if device == "cuda" else "int8"
    print(f"  [whisperx] Device: {device}, compute_type: {compute_type}")

    # Load Whisper model
    print(f"  [whisperx] Loading model '{WHISPER_MODEL}' ...")
    model = whisperx.load_model(
        WHISPER_MODEL,
        device,
        compute_type=compute_type,
        language=WHISPER_LANGUAGE,
    )

    # Load audio
    audio = whisperx.load_audio(audio_path)

    # Transcribe
    print(f"  [whisperx] Transcribing (batch_size={BATCH_SIZE}) ...")
    result = model.transcribe(audio, batch_size=BATCH_SIZE, language=WHISPER_LANGUAGE)

    # Free model memory before loading alignment model
    del model
    try:
        import gc
        gc.collect()
        if device == "cuda":
            import torch
            torch.cuda.empty_cache()
    except Exception:
        pass

    # Load alignment model for Japanese
    print(f"  [whisperx] Loading alignment model for '{WHISPER_LANGUAGE}' ...")
    align_model, metadata = whisperx.load_align_model(
        language_code=WHISPER_LANGUAGE,
        device=device,
    )

    # Run forced alignment for word-level timestamps
    print(f"  [whisperx] Running forced alignment ...")
    aligned = whisperx.align(
        result["segments"],
        align_model,
        metadata,
        audio,
        device,
        return_char_alignments=False,
    )

    # Extract words from aligned segments
    words = []
    for segment in aligned.get("word_segments", []):
        word_entry = {
            "word": segment.get("word", ""),
            "start": round(segment.get("start", 0.0), 3),
            "end": round(segment.get("end", 0.0), 3),
            "score": round(segment.get("score", 0.0), 4),
        }
        # Flag low-confidence words per RESEARCH.md Pitfall 1
        if word_entry["score"] < LOW_CONFIDENCE_THRESHOLD:
            word_entry["low_confidence"] = True
        words.append(word_entry)

    print(f"  [whisperx] Extracted {len(words)} words from alignment")
    return words


# ─────────────────────────────────────────────────────────────────────────────
# Output helpers
# ─────────────────────────────────────────────────────────────────────────────

def write_timing_json(
    song_slug: str,
    youtube_id: str,
    words: list[dict],
    output_dir: str,
) -> str:
    """Write timing JSON to {output_dir}/{song_slug}.json. Returns the path."""
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    output_path = os.path.join(output_dir, f"{song_slug}.json")

    low_confidence_count = sum(1 for w in words if w.get("low_confidence"))
    total_words = len(words)
    avg_score = (
        round(sum(w["score"] for w in words) / total_words, 4)
        if total_words > 0
        else 0.0
    )

    payload = {
        "song_slug": song_slug,
        "youtube_id": youtube_id,
        "words": words,
        "low_confidence_count": low_confidence_count,
        "total_words": total_words,
        "avg_confidence_score": avg_score,
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    return output_path


def copy_audio_to_public(tmp_mp3: str, song_slug: str) -> None:
    """
    Copy mp3 from tmp/ to public/audio/ for Plan 05 timing editor waveform.
    Removes the tmp copy after successful copy.
    """
    Path(PUBLIC_AUDIO_DIR).mkdir(parents=True, exist_ok=True)
    dest_path = os.path.join(PUBLIC_AUDIO_DIR, f"{song_slug}.mp3")

    if not os.path.exists(dest_path):
        shutil.copy2(tmp_mp3, dest_path)
        print(f"  [audio] Copied mp3 to: {dest_path}")
    else:
        print(f"  [audio] Public audio already exists: {dest_path}")

    # Clean up tmp copy
    try:
        os.remove(tmp_mp3)
        print(f"  [cleanup] Removed tmp audio: {tmp_mp3}")
    except OSError:
        pass


def print_summary(words: list[dict], song_slug: str) -> None:
    """Print extraction summary to stdout."""
    total = len(words)
    low_conf = sum(1 for w in words if w.get("low_confidence"))
    avg_score = (
        round(sum(w["score"] for w in words) / total, 4) if total > 0 else 0.0
    )
    print(f"\n  [summary] {song_slug}")
    print(f"    Total words:          {total}")
    print(f"    Low-confidence words: {low_conf} ({low_conf/total*100:.1f}%)" if total > 0 else "    Low-confidence words: 0")
    print(f"    Average score:        {avg_score}")


# ─────────────────────────────────────────────────────────────────────────────
# Per-song processing
# ─────────────────────────────────────────────────────────────────────────────

def process_song(
    song_slug: str,
    youtube_id: str,
    output_dir: str,
    tmp_dir: str = TMP_DIR,
    skip_if_cached: bool = True,
) -> bool:
    """
    Full pipeline for one song: download → transcribe → align → write JSON.

    Returns True on success, False on error.
    """
    output_path = os.path.join(output_dir, f"{song_slug}.json")

    # Step 1: Checkpoint/resume — skip if already cached
    if skip_if_cached and os.path.exists(output_path):
        print(f"[skip] {song_slug} — timing cache already exists")
        return True

    print(f"\n{'='*60}")
    print(f"Processing: {song_slug}  (youtube_id={youtube_id})")
    print(f"{'='*60}")

    start_time = time.time()

    try:
        # Step 2: Download audio
        mp3_path = download_audio(youtube_id, song_slug, tmp_dir)

        # Steps 3–6: WhisperX transcription + alignment
        words = run_whisperx(mp3_path)

        # Step 7: Flag low-confidence words (already done in run_whisperx)
        # Step 8: Write timing JSON
        output_path = write_timing_json(song_slug, youtube_id, words, output_dir)
        print(f"  [output] Timing JSON written: {output_path}")

        # Step 9: Copy mp3 to public/audio/ and clean up tmp
        copy_audio_to_public(mp3_path, song_slug)

        # Print summary
        print_summary(words, song_slug)

        elapsed = round(time.time() - start_time, 1)
        print(f"  [done] {song_slug} completed in {elapsed}s")
        return True

    except subprocess.CalledProcessError as e:
        print(f"  [error] yt-dlp failed for {song_slug}: {e}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"  [error] {song_slug} failed: {type(e).__name__}: {e}", file=sys.stderr)
        return False


# ─────────────────────────────────────────────────────────────────────────────
# Batch mode
# ─────────────────────────────────────────────────────────────────────────────

def run_batch(manifest_path: str, output_dir: str) -> None:
    """
    Process all songs in songs-manifest.json sequentially.
    Skips songs already present in timing-cache (checkpoint/resume).
    """
    print(f"[batch] Loading manifest from: {manifest_path}")

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    total = len(manifest)
    print(f"[batch] {total} songs in manifest")

    succeeded = 0
    failed = 0
    skipped = 0

    for i, song in enumerate(manifest, 1):
        slug = song.get("slug", "")
        youtube_id = song.get("youtube_id", "")

        if not slug or not youtube_id:
            print(f"[batch] [{i}/{total}] Skipping — missing slug or youtube_id: {song}")
            skipped += 1
            continue

        cache_path = os.path.join(output_dir, f"{slug}.json")
        if os.path.exists(cache_path):
            print(f"[batch] [{i}/{total}] SKIP {slug} — already cached")
            skipped += 1
            continue

        print(f"[batch] [{i}/{total}] Processing {slug} ...")
        ok = process_song(slug, youtube_id, output_dir)
        if ok:
            succeeded += 1
        else:
            failed += 1

    print(f"\n{'='*60}")
    print(f"[batch] Complete: {succeeded} succeeded, {failed} failed, {skipped} skipped")
    print(f"{'='*60}")


# ─────────────────────────────────────────────────────────────────────────────
# CLI entry point
# ─────────────────────────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="04-extract-timing.py",
        description=(
            "WhisperX word-level timing extraction for Kitsubeat.\n\n"
            "Single song mode:\n"
            "  python 04-extract-timing.py <song_slug> <youtube_id>\n\n"
            "Batch mode:\n"
            "  python 04-extract-timing.py --batch data/songs-manifest.json\n"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    # Single-song positional args (optional — not required when --batch is used)
    parser.add_argument(
        "song_slug",
        nargs="?",
        help="Song slug (e.g. naruto-op1-haruka-kanata)",
    )
    parser.add_argument(
        "youtube_id",
        nargs="?",
        help="YouTube video ID (e.g. dQw4w9WgXcQ)",
    )

    # Batch mode
    parser.add_argument(
        "--batch",
        metavar="MANIFEST_PATH",
        help="Path to songs-manifest.json — processes all songs sequentially",
    )

    # Shared options
    parser.add_argument(
        "--output-dir",
        default=DEFAULT_OUTPUT_DIR,
        metavar="DIR",
        help=f"Directory to write timing JSON files (default: {DEFAULT_OUTPUT_DIR})",
    )
    parser.add_argument(
        "--tmp-dir",
        default=TMP_DIR,
        metavar="DIR",
        help=f"Temp directory for audio download (default: {TMP_DIR})",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-process even if timing cache already exists",
    )

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if args.batch:
        # Batch mode: process all songs from manifest
        if not os.path.exists(args.batch):
            print(f"[error] Manifest not found: {args.batch}", file=sys.stderr)
            sys.exit(1)
        run_batch(args.batch, args.output_dir)

    elif args.song_slug and args.youtube_id:
        # Single-song mode
        ok = process_song(
            song_slug=args.song_slug,
            youtube_id=args.youtube_id,
            output_dir=args.output_dir,
            tmp_dir=args.tmp_dir,
            skip_if_cached=not args.force,
        )
        sys.exit(0 if ok else 1)

    else:
        parser.print_help()
        print(
            "\n[error] Provide either: <song_slug> <youtube_id>  OR  --batch <manifest_path>",
            file=sys.stderr,
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
