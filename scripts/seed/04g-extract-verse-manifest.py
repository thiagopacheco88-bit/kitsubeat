#!/usr/bin/env python3
"""
04g-extract-verse-manifest.py — Deterministic verse-coverage auditor and manifest generator.

Extracts every unique Japanese line from synced_lrc and checks whether it maps
to at least one lesson verse. Lines that fail the check are "gaps" — they appear
in the LRC but have no corresponding verse (the player shows no highlight there).

This is the deterministic complement to audit-lesson-coverage.ts:
  - audit-lesson-coverage.ts uses the runtime LyricsPanel verse-timing matcher
  - This script uses character-level CJK/kana overlap — no Node.js required

With --generate, also writes data/verse-manifest/{slug}.json: an ordered list
of required lines for use as a generation pre-processor. Feeding this manifest
into the lesson-prompt tells Claude WHICH lines to include, not WHETHER to include
them — eliminating the class of bug where Claude silently drops Japanese lines.

Usage:
  python scripts/seed/04g-extract-verse-manifest.py                # audit all songs
  python scripts/seed/04g-extract-verse-manifest.py --slug X       # single song
  python scripts/seed/04g-extract-verse-manifest.py --generate     # also write manifests
  python scripts/seed/04g-extract-verse-manifest.py --min-gap 2    # only show ≥N gaps
  python scripts/seed/04g-extract-verse-manifest.py --json         # write JSON report
"""

import argparse
import io
import json
import os
import re
import sys
from pathlib import Path
from typing import Optional

# Force UTF-8 output on Windows so Japanese characters don't crash the console
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ─────────────────────────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────────────────────────

ROOT = Path(__file__).resolve().parents[2]
LYRICS_DIR = ROOT / "data" / "lyrics-cache"
LESSONS_DIR = ROOT / "data" / "lessons-cache"
MANIFEST_DIR = ROOT / "data" / "verse-manifest"

# ─────────────────────────────────────────────────────────────────────────────
# Japanese character detection
# ─────────────────────────────────────────────────────────────────────────────

# Hiragana + Katakana + CJK unified ideographs (kanji) + CJK extension A/B
_JP_RE = re.compile(r"[぀-ゟ゠-ヿ一-鿿㐀-䶿]")


def cjk_chars(text: str) -> set[str]:
    """Return the set of CJK/kana characters in text."""
    return set(_JP_RE.findall(text))


def is_japanese(text: str) -> bool:
    """True if text contains at least one CJK or kana character."""
    return bool(_JP_RE.search(text))


def normalize(text: str) -> str:
    """Strip whitespace and common punctuation for deduplication."""
    return re.sub(r"[\s　、。！？・「」『』（）\-,.!?()'\"〜～…]+", "", text).lower()


# ─────────────────────────────────────────────────────────────────────────────
# Noise filters — lines that are in the LRC but are NOT song lyrics
# ─────────────────────────────────────────────────────────────────────────────

# YouTube outro/credit phrases that appear in LRCs fetched from video audio
_CREDIT_RE = re.compile(
    r"ご視聴ありがとう"       # "thank you for watching"
    r"|チャンネル登録"         # "subscribe"
    r"|高評価.*よろしく"       # "please like"
    r"|概要欄"                 # "description box"
    r"|公式サイト"             # "official site"
)


def is_youtube_credit(text: str) -> bool:
    """True if the line looks like YouTube channel credit text, not song lyrics."""
    return bool(_CREDIT_RE.search(text))


def is_whisperx_char_format(text: str) -> bool:
    """
    Detect space-separated single-character WhisperX output.

    WhisperX sometimes fails to group characters into words, producing output
    like 'こ ん に ち は' instead of 'こんにちは'. These lines are not reliable
    song lyrics — they are transcription artifacts.

    Heuristic: if ≥70% of whitespace-split tokens are single CJK/kana characters
    AND there are at least 4 tokens, it is WhisperX char format.
    """
    tokens = text.split()
    if len(tokens) < 4:
        return False
    cjk_singles = sum(1 for t in tokens if len(t) == 1 and _JP_RE.match(t))
    return (cjk_singles / len(tokens)) >= 0.70


def is_noise(text: str) -> bool:
    """True if the line should be excluded from verse manifest / coverage check."""
    return is_youtube_credit(text) or is_whisperx_char_format(text)


# ─────────────────────────────────────────────────────────────────────────────
# LRC processing
# ─────────────────────────────────────────────────────────────────────────────

def extract_unique_jp_lines(synced_lrc: list[dict]) -> list[dict]:
    """
    Return ordered list of unique Japanese LRC lines.

    - Skips lines with no CJK/kana characters (English filler, La-la-la, etc.)
    - Skips empty lines
    - Deduplicates: same normalized text = chorus repeat; only first occurrence kept.
      Repeats are recorded in the 'repeat_of_ms' field for reference.

    Returns list of dicts: {start_ms, text, repeat_of_ms (None if first occurrence)}
    """
    seen: dict[str, int] = {}  # normalized_text → first startMs
    result = []

    for line in synced_lrc:
        text = (line.get("text") or "").strip()
        if not text or not is_japanese(text):
            continue

        norm = normalize(text)
        if not norm:
            continue

        if is_noise(text):
            continue

        if norm in seen:
            result.append({
                "start_ms": line["startMs"],
                "text": text,
                "repeat_of_ms": seen[norm],
            })
        else:
            seen[norm] = line["startMs"]
            result.append({
                "start_ms": line["startMs"],
                "text": text,
                "repeat_of_ms": None,
            })

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Lesson verse matching
# ─────────────────────────────────────────────────────────────────────────────

def lesson_cjk_pool(lesson: dict) -> set[str]:
    """
    Collect every CJK/kana character that appears in any verse's token surfaces.
    This is the "pool" we check LRC lines against.
    """
    pool: set[str] = set()
    for verse in lesson.get("verses", []):
        for token in verse.get("tokens", []):
            pool.update(cjk_chars(token.get("surface", "")))
    return pool


def is_line_covered(lrc_text: str, pool: set[str], threshold: float = 0.55) -> bool:
    """
    True if at least `threshold` fraction of the LRC line's CJK/kana characters
    appear somewhere in the lesson's token pool.

    threshold=0.55 handles:
      - Slight kanji/kana rendering differences (分かって vs わかって)
      - Lines partially absorbed into a multi-line lesson verse
      - Short lines (e.g. 3-char) where 1 miss = 67% → flag correctly
    """
    chars = cjk_chars(lrc_text)
    if not chars:
        return True  # non-CJK line, treat as covered
    matched = len(chars & pool)
    return (matched / len(chars)) >= threshold


# ─────────────────────────────────────────────────────────────────────────────
# Per-song audit
# ─────────────────────────────────────────────────────────────────────────────

def audit_song(slug: str) -> Optional[dict]:
    """
    Audit one song. Returns a result dict or None if data is missing.

    Result keys:
      slug, total_jp_lines, unique_jp_lines, repeat_lines,
      gaps (list of unmatched unique lines), gap_count, gap_pct
    """
    lrc_path = LYRICS_DIR / f"{slug}.json"
    lesson_path = LESSONS_DIR / f"{slug}.json"

    if not lrc_path.exists() or not lesson_path.exists():
        return None

    try:
        lrc_data = json.loads(lrc_path.read_text(encoding="utf-8"))
        lesson = json.loads(lesson_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None

    synced_lrc = lrc_data.get("synced_lrc") or []
    if not synced_lrc:
        return None

    jp_lines = extract_unique_jp_lines(synced_lrc)
    unique = [l for l in jp_lines if l["repeat_of_ms"] is None]
    repeats = [l for l in jp_lines if l["repeat_of_ms"] is not None]

    pool = lesson_cjk_pool(lesson)

    gaps = [
        l for l in unique
        if not is_line_covered(l["text"], pool)
    ]

    total_jp = len(jp_lines)
    unique_count = len(unique)
    gap_count = len(gaps)
    gap_pct = round(gap_count / unique_count * 100, 1) if unique_count else 0.0

    return {
        "slug": slug,
        "total_jp_lines": total_jp,
        "unique_jp_lines": unique_count,
        "repeat_lines": len(repeats),
        "gap_count": gap_count,
        "gap_pct": gap_pct,
        "gaps": gaps,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Manifest generation
# ─────────────────────────────────────────────────────────────────────────────

def generate_manifest(slug: str, lrc_path: Path) -> Optional[dict]:
    """
    Write data/verse-manifest/{slug}.json — the ordered list of lines Claude
    must produce a verse for, grouped into first-occurrences and repeats.

    Format:
    {
      "slug": "...",
      "required_verses": [           # unique JP lines in song order
        {"start_ms": 380, "text": "激しい雨の向こう かかる虹を見た"}
      ],
      "chorus_repeats": [            # repeated lines (Claude should NOT re-emit)
        {"start_ms": 139140, "text": "永遠を探した 小さな掌", "repeat_of_ms": 72430}
      ]
    }
    """
    try:
        lrc_data = json.loads(lrc_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None

    synced_lrc = lrc_data.get("synced_lrc") or []
    if not synced_lrc:
        return None

    jp_lines = extract_unique_jp_lines(synced_lrc)

    manifest = {
        "slug": slug,
        "required_verses": [
            {"start_ms": l["start_ms"], "text": l["text"]}
            for l in jp_lines if l["repeat_of_ms"] is None
        ],
        "chorus_repeats": [
            {"start_ms": l["start_ms"], "text": l["text"], "repeat_of_ms": l["repeat_of_ms"]}
            for l in jp_lines if l["repeat_of_ms"] is not None
        ],
    }

    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
    out_path = MANIFEST_DIR / f"{slug}.json"
    out_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--slug", help="Audit a single song slug")
    parser.add_argument("--min-gap", type=int, default=1, metavar="N",
                        help="Only print songs with ≥N gap lines (default: 1)")
    parser.add_argument("--generate", action="store_true",
                        help="Also write data/verse-manifest/{slug}.json for each song")
    parser.add_argument("--json", dest="json_out", action="store_true",
                        help="Write full results to data/verse-coverage-audit.json")
    parser.add_argument("--check-romaji", action="store_true",
                        help="Also scan lyrics-cache files for romaji-only content (< 15%% CJK chars)")
    args = parser.parse_args()

    # Collect slugs to process
    if args.slug:
        slugs = [args.slug]
    else:
        slugs = sorted(
            p.stem for p in LESSONS_DIR.glob("*.json")
        )

    results = []
    missing_lrc = 0
    errors = 0

    for slug in slugs:
        result = audit_song(slug)
        if result is None:
            missing_lrc += 1
            continue
        results.append(result)

        if args.generate:
            lrc_path = LYRICS_DIR / f"{slug}.json"
            if lrc_path.exists():
                generate_manifest(slug, lrc_path)

    # Sort by gap_count descending, then gap_pct
    results.sort(key=lambda r: (-r["gap_count"], -r["gap_pct"]))

    # ── Console report ──────────────────────────────────────────────────────
    songs_with_gaps = [r for r in results if r["gap_count"] >= args.min_gap]
    total_unique = sum(r["unique_jp_lines"] for r in results)
    total_gaps = sum(r["gap_count"] for r in results)

    print(f"=== verse-coverage audit ===\n")
    print(f"  Songs audited:      {len(results)}")
    print(f"  Songs with gaps:    {len(songs_with_gaps)}")
    print(f"  Total unique JP:    {total_unique}")
    print(f"  Total gaps:         {total_gaps} ({round(total_gaps/total_unique*100,1) if total_unique else 0}%)")
    if missing_lrc:
        print(f"  Missing LRC/lesson: {missing_lrc} skipped")
    if args.generate:
        print(f"  Manifests written:  data/verse-manifest/ ({len(results)} files)")
    print()

    if not songs_with_gaps:
        print("  ✓ No gaps found.")
        return

    col_w = max(len(r["slug"]) for r in songs_with_gaps)
    header = f"  {'slug':<{col_w}}  gaps  unique  pct    sample gap"
    print(header)
    print("  " + "-" * (len(header) - 2))

    for r in songs_with_gaps:
        if r["gap_count"] < args.min_gap:
            continue
        sample = r["gaps"][0]["text"][:40] if r["gaps"] else ""
        print(
            f"  {r['slug']:<{col_w}}  {r['gap_count']:>4}  {r['unique_jp_lines']:>6}  "
            f"{r['gap_pct']:>4.0f}%  {sample}"
        )
        if args.slug:
            # Verbose: show all gaps for single-song audit
            for gap in r["gaps"]:
                print(f"      {gap['start_ms']:>8}ms  {gap['text']}")

    # ── Romaji check ────────────────────────────────────────────────────────
    if args.check_romaji:
        print("\n=== romaji lyrics check ===\n")
        romaji_hits = []
        for lrc_file in sorted(LYRICS_DIR.glob("*.json")):
            try:
                ldata = json.loads(lrc_file.read_text(encoding="utf-8"))
            except Exception:
                continue
            raw = ldata.get("raw_lyrics") or ""
            if not raw.strip():
                continue
            non_ws = raw.replace(" ", "").replace("\n", "").replace("\t", "")
            if not non_ws:
                continue
            cjk_count = len(_JP_RE.findall(raw))
            ratio = cjk_count / len(non_ws)
            if ratio < 0.15:
                romaji_hits.append({
                    "slug": lrc_file.stem,
                    "source": ldata.get("source", "?"),
                    "cjk_ratio": round(ratio, 3),
                    "preview": raw.replace("\n", " ")[:60],
                })

        if romaji_hits:
            romaji_hits.sort(key=lambda r: r["cjk_ratio"])
            print(f"  {'slug':<45}  {'source':<16}  ratio  preview")
            print("  " + "-" * 100)
            for r in romaji_hits:
                print(f"  {r['slug']:<45}  {r['source']:<16}  {r['cjk_ratio']:.2f}   {r['preview']}")
            print(f"\n  {len(romaji_hits)} song(s) with romaji-only lyrics cache.")
        else:
            print("  ✓ No romaji-only lyrics found.")

    # ── JSON output ─────────────────────────────────────────────────────────
    if args.json_out:
        out_path = ROOT / "data" / "verse-coverage-audit.json"
        out_path.write_text(
            json.dumps(results, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"\n  Report written: {out_path}")


if __name__ == "__main__":
    main()
