#!/usr/bin/env python3
"""
04d-merge-lyrics-timing.py — Merge official lyrics text with WhisperX word timing.

For songs that have BOTH:
  - data/timing-cache-stem/{slug}.json  (Demucs+WhisperX — proven +0.24 kCov)
  - data/lyrics-cache/{slug}.json with synced_lrc (LRCLIB official timestamps)

Produces data/timing-cache-merged/{slug}.json with:
  - CORRECT text from official LRCLIB lyrics (not Whisper ASR guesses)
  - LINE-level timing from LRCLIB synced_lrc (accurate to ~50ms)
  - WORD-level timing from WhisperX within each line's time window (interpolated)

This is strictly better than either source alone for karaoke-style highlighting:
  - LRCLIB alone: correct text, line-level timing only
  - WhisperX alone: approximate text, word-level timing
  - MERGED: correct text, word-level timing

For songs without synced_lrc (Genius / pending_whisper), the stem timing is
used unchanged — run 04c-generate-synced-lrc.ts first to generate synced_lrc
from WhisperX timing for those songs, then this script covers them too.

Output schema: same as data/timing-cache/{slug}.json (TimingResult).

Usage:
    python scripts/seed/04d-merge-lyrics-timing.py --pilot
    python scripts/seed/04d-merge-lyrics-timing.py --all
    python scripts/seed/04d-merge-lyrics-timing.py slug1 slug2
    python scripts/seed/04d-merge-lyrics-timing.py --all --dry-run

After running:
    Review data/timing-cache-merged/ against data/timing-cache-stem/ using
    03b-validate-lyrics-vs-whisper.ts (point --timing-dir at the merged cache).
    Then run 05-insert-db.ts when satisfied.
"""

import argparse
import json
import os
import sys
from pathlib import Path

STEM_DIR = "data/timing-cache-stem"
LYRICS_DIR = "data/lyrics-cache"
OUT_DIR = "data/timing-cache-merged"

# A pilot set of songs known to have both synced_lrc and stem timing
PILOT_SLUGS = [
    "kick-back-kenshi-yonezu",
    "specialz-king-gnu",
    "hacking-to-the-gate-kanako-ito",
    "change-the-world-v6",
    "period-chemistry",
    "sign-flow",
    "blue-bird-ikimono-gakari",
    "again-yui",
]


# ─────────────────────────────────────────────────────────────────────────────
# Merge logic
# ─────────────────────────────────────────────────────────────────────────────

def find_words_in_window(words: list[dict], start_s: float, end_s: float) -> list[dict]:
    """Return WhisperX words whose start time falls within [start_s, end_s)."""
    return [w for w in words if start_s <= w["start"] < end_s]


def is_romaji_text(synced_lrc: list[dict], threshold: float = 0.5) -> bool:
    """
    Return True if the majority of synced_lrc text is Latin characters (romaji
    or English). Samples ALL lines so songs with a Japanese intro but English
    chorus are also caught. Threshold 0.5: majority Latin = skip.
    """
    total_chars = 0
    latin_chars = 0
    for line in synced_lrc:  # all lines, not just first 10
        for ch in line.get("text", ""):
            if ch.strip():
                total_chars += 1
                if ch.isascii() and ch.isalpha():
                    latin_chars += 1
    if total_chars == 0:
        return False
    return (latin_chars / total_chars) >= threshold


def interpolate_word_timing(
    line_text: str,
    window_start_s: float,
    window_end_s: float,
    whisper_words: list[dict],
) -> list[dict]:
    """
    Produce a list of word-timing dicts for line_text, using whisper_words as
    anchors where they exist and linear interpolation elsewhere.

    Strategy:
    1. Split line_text into tokens (whitespace-split; Japanese words may be
       single characters or multi-char runs — we keep them as WhisperX produced).
    2. If whisper_words count matches official token count: replace text only,
       keep timing.
    3. Otherwise: distribute the official tokens proportionally across the
       window duration, anchored to whisper_words boundaries where available.
    """
    # Tokenise official line text by whitespace (preserves WhisperX-style tokens)
    official_tokens = line_text.strip().split()
    if not official_tokens:
        return []

    window_dur = max(window_end_s - window_start_s, 0.01)
    n = len(official_tokens)

    if whisper_words and len(whisper_words) == n:
        # 1:1 mapping — just replace text, keep timing
        result = []
        for tok, w in zip(official_tokens, whisper_words):
            entry = dict(w)
            entry["word"] = tok
            entry["score"] = round(entry.get("score", 0.0), 4)
            result.append(entry)
        return result

    # Different counts: distribute proportionally across window
    result = []
    for i, tok in enumerate(official_tokens):
        frac_start = i / n
        frac_end = (i + 1) / n
        start_s = round(window_start_s + frac_start * window_dur, 3)
        end_s = round(window_start_s + frac_end * window_dur, 3)
        # Anchor to nearest whisper word boundary if one is close (<200ms)
        if whisper_words:
            nearest = min(whisper_words, key=lambda w: abs(w["start"] - start_s))
            if abs(nearest["start"] - start_s) < 0.2:
                start_s = round(nearest["start"], 3)
                end_s = round(nearest["end"], 3)
        result.append({
            "word": tok,
            "start": start_s,
            "end": end_s,
            "score": 0.8,  # synthetic — not from alignment model
        })
    return result


def merge_one(slug: str) -> dict | None:
    """
    Merge official lyrics + WhisperX timing for one song.
    Returns the merged TimingResult dict, or None if prerequisites are missing.
    """
    stem_path = os.path.join(STEM_DIR, f"{slug}.json")
    lyrics_path = os.path.join(LYRICS_DIR, f"{slug}.json")

    if not os.path.exists(stem_path):
        print(f"  [skip] no stem timing: {stem_path}")
        return None
    if not os.path.exists(lyrics_path):
        print(f"  [skip] no lyrics cache: {lyrics_path}")
        return None

    with open(stem_path, "r", encoding="utf-8") as f:
        stem = json.load(f)
    with open(lyrics_path, "r", encoding="utf-8") as f:
        lyrics = json.load(f)

    synced_lrc = lyrics.get("synced_lrc")
    if not synced_lrc or not isinstance(synced_lrc, list) or len(synced_lrc) == 0:
        print(f"  [skip] no synced_lrc in lyrics cache (run 04c first for Genius songs)")
        return None

    if is_romaji_text(synced_lrc):
        print(f"  [skip] synced_lrc is romaji — Genius returned romanized lyrics, not Japanese")
        return None

    whisper_words: list[dict] = stem.get("words", [])
    no_whisper = len(whisper_words) == 0

    if no_whisper:
        print(f"  [info] stem has 0 words — using synced_lrc timing only")

    source = lyrics.get("source", "")
    raw_lyrics_lines: list[str] = []  # reserved for future clean lyrics source

    # Build merged word list
    merged_words: list[dict] = []
    song_end_s = whisper_words[-1]["end"] if whisper_words else (synced_lrc[-1]["startMs"] / 1000.0 + 30.0)

    for i, line in enumerate(synced_lrc):
        line_start_s = line["startMs"] / 1000.0
        if i + 1 < len(synced_lrc):
            line_end_s = synced_lrc[i + 1]["startMs"] / 1000.0
        else:
            line_end_s = song_end_s + 1.0

        # Prefer raw_lyrics line if available (Genius songs), else synced_lrc text
        if raw_lyrics_lines:
            # Map synced_lrc index → raw_lyrics index proportionally
            raw_idx = round(i * len(raw_lyrics_lines) / len(synced_lrc))
            raw_idx = min(raw_idx, len(raw_lyrics_lines) - 1)
            line_text = raw_lyrics_lines[raw_idx]
        else:
            line_text = line.get("text", "").strip()

        if not line_text:
            continue

        whisper_in_window = find_words_in_window(whisper_words, line_start_s, line_end_s)
        word_entries = interpolate_word_timing(
            line_text, line_start_s, line_end_s, whisper_in_window
        )
        merged_words.extend(word_entries)

    if not merged_words:
        print(f"  [warn] {slug}: produced 0 merged words — check synced_lrc/timing alignment")
        return None

    low_confidence_threshold = 0.6
    low_confidence_count = sum(1 for w in merged_words if w.get("score", 1.0) < low_confidence_threshold)
    total_words = len(merged_words)
    avg_score = round(sum(w.get("score", 0.0) for w in merged_words) / total_words, 4) if total_words > 0 else 0.0

    merge_source = "synced_lrc_only" if no_whisper else (
        "genius+synced_lrc" if raw_lyrics_lines else "lrclib+demucs+whisperx"
    )

    return {
        "song_slug": slug,
        "youtube_id": stem.get("youtube_id", ""),
        "words": merged_words,
        "low_confidence_count": low_confidence_count,
        "total_words": total_words,
        "avg_confidence_score": avg_score,
        "merge_source": merge_source,
    }


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

def collect_all_slugs() -> list[str]:
    """Return all slugs that have stem timing."""
    if not os.path.isdir(STEM_DIR):
        return []
    return sorted(
        f.replace(".json", "")
        for f in os.listdir(STEM_DIR)
        if f.endswith(".json")
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("slugs", nargs="*", help="Explicit slugs to process")
    parser.add_argument("--pilot", action="store_true", help="Use the built-in pilot set")
    parser.add_argument("--all", action="store_true", help="Process all songs with stem timing")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be done without writing")
    parser.add_argument("--force", action="store_true", help="Re-merge even if output already exists")
    args = parser.parse_args()

    if args.all:
        slugs = collect_all_slugs()
    elif args.pilot:
        slugs = PILOT_SLUGS
    elif args.slugs:
        slugs = args.slugs
    else:
        parser.error("provide slugs, --pilot, or --all")
        return

    Path(OUT_DIR).mkdir(parents=True, exist_ok=True)

    print(f"[config] stem={STEM_DIR}  lyrics={LYRICS_DIR}  out={OUT_DIR}")
    print(f"[config] dry_run={args.dry_run}  force={args.force}  songs={len(slugs)}")
    print("=" * 66)

    ok = skip = fail = 0

    for i, slug in enumerate(slugs, 1):
        out_path = os.path.join(OUT_DIR, f"{slug}.json")
        if os.path.exists(out_path) and not args.force:
            print(f"[{i}/{len(slugs)}] {slug}: cached ({out_path})")
            skip += 1
            continue

        print(f"\n[{i}/{len(slugs)}] {slug}")
        result = merge_one(slug)

        if result is None:
            fail += 1
            continue

        print(
            f"  [ok] {result['total_words']} words  "
            f"avg_score={result['avg_confidence_score']}  "
            f"low_conf={result['low_confidence_count']}"
        )

        if not args.dry_run:
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print(f"  [write] {out_path}")
        else:
            print(f"  [dry-run] would write {out_path}")

        ok += 1

    print()
    print("=" * 66)
    print(f"[done] ok={ok}  skipped={skip}  failed={fail}  total={len(slugs)}")
    if args.dry_run and ok > 0:
        print("  (dry-run — rerun without --dry-run to write output)")


if __name__ == "__main__":
    main()
