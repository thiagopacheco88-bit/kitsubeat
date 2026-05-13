#!/usr/bin/env python3
"""
04e-retry-whisperx-english.py — Retry WhisperX with language auto-detection
for songs where Japanese-mode produced fewer than MIN_WORDS words.

English-language anime tracks (Attack on Titan OSTs, English OPs/EDs) fail in
Japanese mode because Whisper refuses to transcribe English as Japanese. Running
with language=None lets Whisper detect the language and transcribe properly,
giving these songs usable word-level timing.

Reads:  data/timing-cache-stem/{slug}.json  (existing Japanese-mode output)
Writes: data/timing-cache-stem/{slug}.json  (overwrites if improvement found)
        data/timing-cache-stem/{slug}.json.ja-bak  (backup of original)

Only overwrites when the auto-detected run produces more words than the original.

Usage:
    python scripts/seed/04e-retry-whisperx-english.py --dry-run
    python scripts/seed/04e-retry-whisperx-english.py
    python scripts/seed/04e-retry-whisperx-english.py --min-words 30
    python scripts/seed/04e-retry-whisperx-english.py slug1 slug2
"""

import argparse
import json
import os
import shutil
import sys
import time
from pathlib import Path

STEM_DIR = "data/timing-cache-stem"
VOCAL_STEM_DIR = "data/vocal-stems"
PUBLIC_AUDIO_DIR = "public/audio"
MIN_WORDS_DEFAULT = 50
LOW_CONFIDENCE_THRESHOLD = 0.6


def run_whisperx_auto(audio_path: str, batch_size: int = 8) -> list[dict]:
    """Run WhisperX with language=None (auto-detect). Returns word list."""
    import whisperx

    try:
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu"
    except ImportError:
        device = "cpu"

    compute_type = "float16" if device == "cuda" else "int8"
    print(f"  [whisperx-auto] device={device} compute_type={compute_type}")

    model = whisperx.load_model("large-v3", device, compute_type=compute_type)
    audio = whisperx.load_audio(audio_path)

    print(f"  [whisperx-auto] transcribing with language=None ...")
    result = model.transcribe(audio, batch_size=batch_size)
    detected_lang = result.get("language", "unknown")
    print(f"  [whisperx-auto] detected language: {detected_lang}")

    del model
    try:
        import gc; gc.collect()
        if device == "cuda":
            import torch; torch.cuda.empty_cache()
    except Exception:
        pass

    # Use detected language for alignment model
    align_model, metadata = whisperx.load_align_model(
        language_code=detected_lang, device=device
    )
    aligned = whisperx.align(
        result["segments"], align_model, metadata, audio, device,
        return_char_alignments=False,
    )

    words = []
    for seg in aligned.get("word_segments", []):
        entry = {
            "word": seg.get("word", ""),
            "start": round(seg.get("start", 0.0), 3),
            "end": round(seg.get("end", 0.0), 3),
            "score": round(seg.get("score", 0.0), 4),
        }
        if entry["score"] < LOW_CONFIDENCE_THRESHOLD:
            entry["low_confidence"] = True
        words.append(entry)

    return words


def find_audio(slug: str) -> str | None:
    """Find the best available audio: vocal stem > public mp3."""
    stem = os.path.join(VOCAL_STEM_DIR, f"{slug}.wav")
    if os.path.exists(stem):
        return stem
    mp3 = os.path.join(PUBLIC_AUDIO_DIR, f"{slug}.mp3")
    if os.path.exists(mp3):
        return mp3
    return None


def process_slug(slug: str, min_words: int, dry_run: bool, batch_size: int) -> str:
    """
    Check if slug qualifies for retry and optionally run it.
    Returns: 'skip_ok' | 'skip_no_audio' | 'skip_sufficient' | 'improved' | 'no_gain' | 'error'
    """
    stem_path = os.path.join(STEM_DIR, f"{slug}.json")
    if not os.path.exists(stem_path):
        return "skip_no_stem"

    with open(stem_path, "r", encoding="utf-8") as f:
        existing = json.load(f)

    existing_words = existing.get("words", [])
    if len(existing_words) >= min_words:
        return "skip_sufficient"

    audio = find_audio(slug)
    if not audio:
        return "skip_no_audio"

    print(f"\n  existing words: {len(existing_words)} (< {min_words}) — retrying with auto-detect")
    print(f"  audio: {audio}")

    if dry_run:
        return "would_retry"

    try:
        t0 = time.time()
        new_words = run_whisperx_auto(audio, batch_size=batch_size)
        elapsed = round(time.time() - t0, 1)
        print(f"  [result] {len(new_words)} words in {elapsed}s")

        if len(new_words) <= len(existing_words):
            print(f"  [no_gain] auto-detect produced {len(new_words)} vs existing {len(existing_words)} — keeping original")
            return "no_gain"

        # Backup original
        bak_path = stem_path + ".ja-bak"
        if not os.path.exists(bak_path):
            shutil.copy2(stem_path, bak_path)

        # Overwrite with improved output
        low_conf = sum(1 for w in new_words if w.get("low_confidence"))
        total = len(new_words)
        avg = round(sum(w["score"] for w in new_words) / total, 4) if total else 0.0

        payload = {
            **existing,
            "words": new_words,
            "low_confidence_count": low_conf,
            "total_words": total,
            "avg_confidence_score": avg,
            "whisper_language": "auto",
        }
        with open(stem_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

        print(f"  [write] {stem_path} ({len(existing_words)} → {total} words)")
        return "improved"

    except Exception as e:
        print(f"  [error] {type(e).__name__}: {e}", file=sys.stderr)
        return "error"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("slugs", nargs="*", help="Specific slugs (default: all in stem cache)")
    parser.add_argument("--min-words", type=int, default=MIN_WORDS_DEFAULT,
                        help=f"Retry songs with fewer than N words (default: {MIN_WORDS_DEFAULT})")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--batch-size", type=int, default=8)
    args = parser.parse_args()

    if args.slugs:
        slugs = args.slugs
    else:
        slugs = sorted(f.replace(".json", "") for f in os.listdir(STEM_DIR) if f.endswith(".json"))

    print(f"[config] min_words={args.min_words}  dry_run={args.dry_run}  candidates={len(slugs)}")
    print("=" * 66)

    counts = {}
    for i, slug in enumerate(slugs, 1):
        result = process_slug(slug, args.min_words, args.dry_run, args.batch_size)
        counts[result] = counts.get(result, 0) + 1
        if result not in ("skip_sufficient",):
            print(f"[{i}/{len(slugs)}] {slug}: {result}")

    print("\n" + "=" * 66)
    print("[done]", "  ".join(f"{k}={v}" for k, v in sorted(counts.items())))
    if args.dry_run:
        retries = counts.get("would_retry", 0)
        print(f"  {retries} songs would be retried — rerun without --dry-run to apply")


if __name__ == "__main__":
    main()
