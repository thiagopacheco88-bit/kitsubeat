"""
fix-remaining-thin.py
Try lrclib for a set of thin/unsynced songs using multiple search strategies.
Updates data/lyrics-cache/{slug}.json when synced lyrics are found.
"""

import json
import os
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

CACHE_DIR = Path(__file__).parent.parent.parent / "data" / "lyrics-cache"
HEADERS = {"User-Agent": "kitsubeat/0.1.0"}

SONGS = [
    {"title": "Lovers (ラヴァーズ)",          "artist": "7!!",                   "slug": "lovers-7"},
    {"title": "Totsugeki Rock",               "artist": "THE CRO-MAGNONS",        "slug": "totsugeki-rock-the-cro-magnons"},
    {"title": "Yokubou o Sakebe!!!!",         "artist": "OKAMOTO'S",              "slug": "yokubou-o-sakebe-okamotos"},
    {"title": "Romantic Ageru yo",            "artist": "Takahashi Hiroko",       "slug": "romantic-ageru-yo-takahashi-hiroko"},
    {"title": "Yume wo Kanaete Doraemon",     "artist": "mao",                    "slug": "yume-wo-kanaete-doraemon-mao"},
    {"title": "UUUUUS!",                      "artist": "Hiroshi Kitadani",       "slug": "uuuuus-hiroshi-kitadani"},
    {"title": "Viva Rock ~Japanese Side~",    "artist": "Orange Range",           "slug": "viva-rock-japanese-side-orange-range"},
    {"title": "Ima made Nando mo",            "artist": "the Mass Missile",       "slug": "ima-made-nando-mo-the-mass-missile"},
    {"title": "Mayonaka no Orchestra",        "artist": "Aqua Timez",             "slug": "mayonaka-no-orchestra-aqua-timez"},
    {"title": "Rinne -Rondo-",                "artist": "ON/OFF",                 "slug": "rinne-rondo-on-off"},
    {"title": "Mr. SADISTIC NIGHT",           "artist": "Hikaru Midorikawa",      "slug": "mr-sadistic-night-midorikawa-toriumi"},
    {"title": "Kindan no 666",                "artist": "Ryohei Kimura",          "slug": "kindan-no-666-kimura-kishio"},
]


def lrclib_get(params: dict) -> dict | None:
    url = "https://lrclib.net/api/get?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status == 200:
                return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise
    return None


def lrclib_search(title: str, artist: str) -> dict | None:
    q = f"{title} {artist}"
    url = "https://lrclib.net/api/search?" + urllib.parse.urlencode({"q": q})
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status == 200:
                results = json.loads(resp.read().decode("utf-8"))
                for item in results:
                    if item.get("syncedLyrics"):
                        return item
    except urllib.error.HTTPError:
        pass
    return None


def parse_lrc(lrc_text: str) -> list[dict]:
    """Parse LRC format into [{startMs, text}] list."""
    lines = []
    pattern = re.compile(r"\[(\d+):(\d+\.\d+)\]\s*(.*)")
    for line in lrc_text.splitlines():
        m = pattern.match(line.strip())
        if not m:
            continue
        minutes = int(m.group(1))
        seconds = float(m.group(2))
        text = m.group(3).strip()
        if not text:
            continue
        start_ms = round((minutes * 60 + seconds) * 1000)
        lines.append({"startMs": start_ms, "text": text})
    return lines


def try_fetch_synced(title: str, artist: str) -> tuple[list[dict], str] | tuple[None, None]:
    """Try all strategies. Returns (synced_lrc, plain_lyrics) or (None, None)."""

    # Strategy 1: exact get with artist
    data = lrclib_get({"track_name": title, "artist_name": artist})
    if data and data.get("syncedLyrics"):
        lines = parse_lrc(data["syncedLyrics"])
        if lines:
            return lines, data.get("plainLyrics") or ""

    # Strategy 2: search by title only (get requires artist_name)
    title_only_url = "https://lrclib.net/api/search?" + urllib.parse.urlencode({"q": title})
    req2 = urllib.request.Request(title_only_url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req2, timeout=10) as resp:
            if resp.status == 200:
                results = json.loads(resp.read().decode("utf-8"))
                for item in results:
                    if item.get("syncedLyrics"):
                        lines = parse_lrc(item["syncedLyrics"])
                        if lines:
                            return lines, item.get("plainLyrics") or ""
    except urllib.error.HTTPError:
        pass

    # Strategy 3: search endpoint with title+artist
    data = lrclib_search(title, artist)
    if data and data.get("syncedLyrics"):
        lines = parse_lrc(data["syncedLyrics"])
        if lines:
            return lines, data.get("plainLyrics") or ""

    return None, None


def load_cache(slug: str) -> dict | None:
    path = CACHE_DIR / f"{slug}.json"
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_cache(slug: str, data: dict) -> None:
    path = CACHE_DIR / f"{slug}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def main():
    print(f"Checking {len(SONGS)} songs against lrclib...\n")
    fixed = 0
    not_found = 0

    for song in SONGS:
        slug = song["slug"]
        title = song["title"]
        artist = song["artist"]

        print(f"  [{slug}]", end=" ", flush=True)

        synced_lrc, plain_lyrics = try_fetch_synced(title, artist)
        time.sleep(0.3)  # be polite to lrclib

        if not synced_lrc:
            print("NOT FOUND")
            not_found += 1
            continue

        cache = load_cache(slug)
        if cache is None:
            # File doesn't exist — create minimal entry
            cache = {"slug": slug, "title": title, "artist": artist}

        cache["source"] = "lrclib"
        if plain_lyrics:
            cache["raw_lyrics"] = plain_lyrics
        cache["synced_lrc"] = synced_lrc

        save_cache(slug, cache)
        print(f"FIXED ({len(synced_lrc)} lines)")
        fixed += 1

    print(f"\nDone. Fixed: {fixed}  Not found: {not_found}")


if __name__ == "__main__":
    main()
