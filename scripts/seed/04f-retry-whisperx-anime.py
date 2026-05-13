#!/usr/bin/env python3
"""
04f-retry-whisperx-anime.py — Retry transcription with anime-whisper
(kotoba-tech/kotoba-whisper-v2.0) on Japanese songs where large-v3 produced
low-quality output.

anime-whisper is fine-tuned on 5,300 hours of anime/galgame voice data and
achieves 13.0% CER vs 16.5% for large-v3 on anime-domain audio. It handles
anime vocal style, non-verbal expressions, and faster-paced delivery better.

Strategy:
  1. Target songs with kCov < 0.25 (REVIEW) or < MIN_WORDS (INSUFFICIENT_SIGNAL)
     that have mostly Japanese synced_lrc (< 40% Latin chars).
  2. Transcribe with anime-whisper via HuggingFace transformers pipeline.
  3. Align word-level timestamps with WhisperX wav2vec2 (same as main pipeline).
  4. Write to data/timing-cache-anime/{slug}.json — does NOT overwrite stem cache.
  5. Promote to data/timing-cache-stem/{slug}.json only when word count improves.

First run downloads ~3GB model (kotoba-whisper-v2.0). Cached after that.

Usage:
    python scripts/seed/04f-retry-whisperx-anime.py --dry-run
    python scripts/seed/04f-retry-whisperx-anime.py --pilot       # 5 songs
    python scripts/seed/04f-retry-whisperx-anime.py               # all targets
    python scripts/seed/04f-retry-whisperx-anime.py slug1 slug2   # explicit
    python scripts/seed/04f-retry-whisperx-anime.py --promote     # push winners to stem cache
"""

import argparse
import json
import os
import shutil
import sys
import time
from pathlib import Path

STEM_DIR        = "data/timing-cache-stem"
ANIME_DIR       = "data/timing-cache-anime"
VOCAL_STEM_DIR  = "data/vocal-stems"
PUBLIC_AUDIO_DIR= "public/audio"
LYRICS_DIR      = "data/lyrics-cache"
REPORT_PATH     = "data/lyrics-validation-report.json"

MODEL_ID        = "kotoba-tech/kotoba-whisper-v2.0"
WHISPER_LANG    = "ja"
LOW_CONF_THRESH = 0.6
MIN_WORDS       = 100   # INSUFFICIENT_SIGNAL threshold (same as validation script)
REVIEW_KCOV     = 0.25  # kCov threshold for REVIEW bucket

PILOT_SLUGS = [
    "broken-youth-nico-touches-the-walls",
    "haruka-kanata-asian-kung-fu-generation",
    "whats-up-people-maximum-the-hormone",
    "detekoi-tobikiri-zenkai-power-manna",
    "zetsubou-billy-maximum-the-hormone",
]


# ─────────────────────────────────────────────────────────────────────────────
# Target selection
# ─────────────────────────────────────────────────────────────────────────────

def is_japanese_song(slug: str) -> bool:
    """Return True if the song's synced_lrc is mostly Japanese (< 40% Latin)."""
    path = os.path.join(LYRICS_DIR, f"{slug}.json")
    if not os.path.exists(path):
        return False
    try:
        data = json.loads(open(path, encoding="utf-8").read())
        synced = data.get("synced_lrc") or []
        total = latin = 0
        for line in synced:
            for ch in line.get("text", ""):
                if ch.strip():
                    total += 1
                    if ch.isascii() and ch.isalpha():
                        latin += 1
        return total == 0 or (latin / total) < 0.4
    except Exception:
        return False


def collect_targets() -> list[str]:
    """Return slugs that are Japanese AND (INSUFFICIENT_SIGNAL or REVIEW kCov < threshold)."""
    if not os.path.exists(REPORT_PATH):
        print(f"[warn] {REPORT_PATH} not found — pass explicit slugs instead")
        return []
    report = json.loads(open(REPORT_PATH, encoding="utf-8").read())
    targets = []
    for row in report.get("rows", []):
        bucket = row.get("bucket", "")
        kcov   = row.get("kanji_coverage", 1.0)
        words  = row.get("whisper_word_count", MIN_WORDS)
        slug   = row.get("slug", "")
        if bucket == "INSUFFICIENT_SIGNAL" or (bucket == "REVIEW" and kcov < REVIEW_KCOV):
            if is_japanese_song(slug):
                targets.append(slug)
    return targets


# ─────────────────────────────────────────────────────────────────────────────
# Audio lookup
# ─────────────────────────────────────────────────────────────────────────────

def find_audio(slug: str) -> str | None:
    for path in [
        os.path.join(VOCAL_STEM_DIR, f"{slug}.wav"),
        os.path.join(PUBLIC_AUDIO_DIR, f"{slug}.mp3"),
    ]:
        if os.path.exists(path):
            return path
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Transcription with anime-whisper
# ─────────────────────────────────────────────────────────────────────────────

def load_anime_whisper(device: str, dtype):
    """Load kotoba-whisper-v2.0 via HuggingFace pipeline. Downloads ~3GB on first run."""
    from transformers import pipeline as hf_pipeline
    print(f"  [anime-whisper] loading {MODEL_ID} on {device} ...")
    return hf_pipeline(
        "automatic-speech-recognition",
        model=MODEL_ID,
        torch_dtype=dtype,
        device=device,
        model_kwargs={"attn_implementation": "sdpa"},
    )


def transcribe_anime(pipe, audio_path: str) -> list[dict]:
    """Run anime-whisper transcription. Returns list of {text, start, end} segments."""
    import whisperx
    print(f"  [anime-whisper] transcribing {audio_path} ...")
    # Pre-load audio as numpy array at 16kHz to avoid torchcodec dependency
    audio_array = whisperx.load_audio(audio_path)
    audio_input = {"array": audio_array, "sampling_rate": 16000}
    result = pipe(
        audio_input,
        generate_kwargs={"language": WHISPER_LANG, "task": "transcribe"},
        return_timestamps=True,
    )
    chunks = result.get("chunks", [])
    segments = []
    for chunk in chunks:
        ts = chunk.get("timestamp") or (0.0, 0.0)
        segments.append({
            "text":  chunk.get("text", ""),
            "start": ts[0] or 0.0,
            "end":   ts[1] or 0.0,
        })
    print(f"  [anime-whisper] {len(segments)} segments")
    return segments


# ─────────────────────────────────────────────────────────────────────────────
# WhisperX alignment
# ─────────────────────────────────────────────────────────────────────────────

def align_segments(segments: list[dict], audio_path: str, device: str) -> list[dict]:
    """Run WhisperX wav2vec2 alignment on anime-whisper segments."""
    import whisperx
    print(f"  [whisperx-align] loading alignment model for '{WHISPER_LANG}' ...")
    align_model, metadata = whisperx.load_align_model(
        language_code=WHISPER_LANG, device=device
    )
    audio = whisperx.load_audio(audio_path)
    print(f"  [whisperx-align] aligning {len(segments)} segments ...")
    aligned = whisperx.align(
        segments, align_model, metadata, audio, device,
        return_char_alignments=False,
    )
    words = []
    for seg in aligned.get("word_segments", []):
        entry = {
            "word":  seg.get("word", ""),
            "start": round(seg.get("start", 0.0), 3),
            "end":   round(seg.get("end",   0.0), 3),
            "score": round(seg.get("score", 0.0), 4),
        }
        if entry["score"] < LOW_CONF_THRESH:
            entry["low_confidence"] = True
        words.append(entry)
    return words


# ─────────────────────────────────────────────────────────────────────────────
# Per-slug processing
# ─────────────────────────────────────────────────────────────────────────────

def process_slug(
    slug: str,
    pipe,
    device: str,
    dtype,
    dry_run: bool,
    force: bool,
) -> str:
    """Returns: 'improved' | 'no_gain' | 'skip_no_audio' | 'skip_cached' | 'error'"""
    out_path = os.path.join(ANIME_DIR, f"{slug}.json")
    if os.path.exists(out_path) and not force:
        return "skip_cached"

    audio = find_audio(slug)
    if not audio:
        return "skip_no_audio"

    # Read existing stem word count for comparison
    stem_path = os.path.join(STEM_DIR, f"{slug}.json")
    existing_words = 0
    existing_youtube_id = ""
    if os.path.exists(stem_path):
        try:
            stem = json.loads(open(stem_path, encoding="utf-8").read())
            existing_words = len(stem.get("words", []))
            existing_youtube_id = stem.get("youtube_id", "")
        except Exception:
            pass

    print(f"  audio: {audio}  existing_words: {existing_words}")
    if dry_run:
        return "would_retry"

    try:
        t0 = time.time()

        # Step 1: anime-whisper transcription
        segments = transcribe_anime(pipe, audio)
        if not segments:
            print(f"  [warn] no segments from anime-whisper")
            return "no_gain"

        # Step 2: WhisperX alignment
        words = align_segments(segments, audio, device)
        elapsed = round(time.time() - t0, 1)
        print(f"  [result] {len(words)} words in {elapsed}s  (existing: {existing_words})")

        low_conf = sum(1 for w in words if w.get("low_confidence"))
        total = len(words)
        avg_score = round(sum(w["score"] for w in words) / total, 4) if total else 0.0

        payload = {
            "song_slug":            slug,
            "youtube_id":           existing_youtube_id,
            "words":                words,
            "low_confidence_count": low_conf,
            "total_words":          total,
            "avg_confidence_score": avg_score,
            "whisper_model":        MODEL_ID,
        }

        Path(ANIME_DIR).mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

        verdict = "improved" if total > existing_words else "no_gain"
        print(f"  [{verdict}] wrote {out_path}")
        return verdict

    except Exception as e:
        print(f"  [error] {type(e).__name__}: {e}", file=sys.stderr)
        return "error"


def promote_winners() -> None:
    """
    Copy anime timing to stem cache when it produced more words.
    Creates a .large-v3-bak backup of the original stem file.
    """
    if not os.path.isdir(ANIME_DIR):
        print("[promote] no anime cache dir found")
        return

    promoted = 0
    for f in sorted(os.listdir(ANIME_DIR)):
        if not f.endswith(".json"):
            continue
        slug = f.replace(".json", "")
        anime_path = os.path.join(ANIME_DIR, f)
        stem_path  = os.path.join(STEM_DIR, f"{slug}.json")

        anime_data = json.loads(open(anime_path, encoding="utf-8").read())
        anime_words = len(anime_data.get("words", []))

        existing_words = 0
        if os.path.exists(stem_path):
            existing_words = len(json.loads(open(stem_path, encoding="utf-8").read()).get("words", []))

        if anime_words > existing_words:
            bak = stem_path + ".large-v3-bak"
            if os.path.exists(stem_path) and not os.path.exists(bak):
                shutil.copy2(stem_path, bak)
            shutil.copy2(anime_path, stem_path)
            print(f"  [promote] {slug}: {existing_words} → {anime_words} words")
            promoted += 1
        else:
            print(f"  [keep]    {slug}: anime={anime_words}  stem={existing_words}")

    print(f"\n[promote] promoted {promoted} songs to stem cache")
    if promoted > 0:
        print("  Next: re-run 04d --all --force && 05-insert-db.ts")


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("slugs",     nargs="*", help="Explicit slugs (default: auto-select targets)")
    parser.add_argument("--pilot",   action="store_true", help="Use built-in 5-song pilot set")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force",   action="store_true", help="Re-run even if anime cache exists")
    parser.add_argument("--promote", action="store_true", help="Promote winners to stem cache then exit")
    args = parser.parse_args()

    if args.promote:
        promote_winners()
        return

    if args.slugs:
        slugs = args.slugs
    elif args.pilot:
        slugs = PILOT_SLUGS
    else:
        slugs = collect_targets()

    if not slugs:
        print("[done] no target slugs found")
        return

    print(f"[config] model={MODEL_ID}  targets={len(slugs)}  dry_run={args.dry_run}")
    print("=" * 66)

    if args.dry_run:
        for slug in slugs:
            audio = find_audio(slug)
            print(f"  {slug}: {'has audio' if audio else 'NO AUDIO'}")
        print(f"\n[dry-run] {len(slugs)} songs — rerun without --dry-run to process")
        return

    # Lazy-load device + model (expensive, only when actually running)
    try:
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype  = torch.float16 if device == "cuda" else torch.float32
    except ImportError:
        device = "cpu"
        dtype  = None

    Path(ANIME_DIR).mkdir(parents=True, exist_ok=True)

    print(f"[info] first run downloads ~3GB model — cached after that")
    pipe = load_anime_whisper(device, dtype)

    counts: dict[str, int] = {}
    for i, slug in enumerate(slugs, 1):
        print(f"\n[{i}/{len(slugs)}] {slug}")
        result = process_slug(slug, pipe, device, dtype, dry_run=False, force=args.force)
        counts[result] = counts.get(result, 0) + 1

    print("\n" + "=" * 66)
    print("[done]", "  ".join(f"{k}={v}" for k, v in sorted(counts.items())))
    improved = counts.get("improved", 0)
    if improved > 0:
        print(f"\n  {improved} songs improved — run with --promote to push winners to stem cache")
        print(f"  Then: python scripts/seed/04d-merge-lyrics-timing.py --all --force")
        print(f"  Then: npx tsx scripts/seed/05-insert-db.ts")


if __name__ == "__main__":
    main()
