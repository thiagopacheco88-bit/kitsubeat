"""
Fix jiyuu-no-tsubasa-linked-horizon lyrics cache using lrclib data.
"""
import json
import re
import urllib.request
from pathlib import Path

CACHE_PATH = Path(__file__).parents[2] / "data" / "lyrics-cache" / "jiyuu-no-tsubasa-linked-horizon.json"
LRCLIB_URL = "https://lrclib.net/api/get?track_name=Jiyuu%20no%20Tsubasa&artist_name=Linked%20Horizon"


def lrc_to_ms(ts: str) -> int:
    """Convert LRC timestamp [MM:SS.xx] to milliseconds."""
    m = re.match(r"(\d+):(\d+)\.(\d+)", ts)
    if not m:
        return 0
    minutes = int(m.group(1))
    seconds = int(m.group(2))
    centiseconds = int(m.group(3))
    return (minutes * 60 + seconds) * 1000 + centiseconds * 10


def parse_synced_lrc(synced_lyrics: str) -> list[dict]:
    """Parse LRC format into list of {startMs, text} dicts."""
    lines = []
    for raw_line in synced_lyrics.strip().splitlines():
        m = re.match(r"\[(\d+:\d+\.\d+)\]\s*(.*)", raw_line)
        if not m:
            continue
        start_ms = lrc_to_ms(m.group(1))
        text = m.group(2).strip()
        lines.append({"startMs": start_ms, "text": text})
    return lines


def main():
    req = urllib.request.Request(LRCLIB_URL, headers={"User-Agent": "kitsubeat/0.1.0"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())

    synced_lrc = parse_synced_lrc(data["syncedLyrics"])
    plain_lyrics = data["plainLyrics"]

    print(f"Fetched {len(synced_lrc)} synced lines from lrclib")

    cache = json.loads(CACHE_PATH.read_text(encoding="utf-8"))

    cache["source"] = "lrclib"
    cache["raw_lyrics"] = plain_lyrics
    cache["synced_lrc"] = synced_lrc

    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Updated {CACHE_PATH}")
    print(f"synced_lrc lines: {len(cache['synced_lrc'])}")


if __name__ == "__main__":
    main()
