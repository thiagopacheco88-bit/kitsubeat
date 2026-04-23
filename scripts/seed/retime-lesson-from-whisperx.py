"""
retime-lesson-from-whisperx.py — Python port of the TS retime script.
Re-derives verse start_time_ms / end_time_ms via LCS-align against WhisperX words.

Usage:
  python retime-lesson-from-whisperx.py <slug> [--dry-run]
"""
import json, sys, math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
slug = next((a for a in sys.argv[1:] if not a.startswith("--")), None)
dry_run = "--dry-run" in sys.argv

if not slug:
    print("usage: retime-lesson-from-whisperx.py <slug> [--dry-run]", file=sys.stderr)
    sys.exit(1)

lesson_path = ROOT / "data" / "lessons-cache" / f"{slug}.json"
timing_path = ROOT / "data" / "timing-cache" / f"{slug}.json"

if not lesson_path.exists():
    print(f"lesson not found: {lesson_path}", file=sys.stderr); sys.exit(1)
if not timing_path.exists():
    print(f"timing not found: {timing_path}", file=sys.stderr); sys.exit(1)

lesson = json.loads(lesson_path.read_text(encoding="utf-8"))
timing = json.loads(timing_path.read_text(encoding="utf-8"))

# Flatten WhisperX words -> per-char timing list
whisper_chars = []  # [{ch, startMs, endMs}]
for w in timing.get("words", []):
    chars = [c for c in w["word"] if c.strip()]
    if not chars:
        continue
    start_s, end_s = w["start"], w["end"]
    dur = (end_s - start_s) / len(chars)
    for i, ch in enumerate(chars):
        whisper_chars.append({
            "ch": ch,
            "startMs": round((start_s + dur * i) * 1000),
            "endMs": round((start_s + dur * (i + 1)) * 1000),
        })

if not whisper_chars:
    print("[retime] no WhisperX chars — aborting", file=sys.stderr)
    sys.exit(1)

print(f"[retime] WhisperX char count: {len(whisper_chars)}, "
      f"first @ {whisper_chars[0]['startMs']}ms, last @ {whisper_chars[-1]['endMs']}ms")

def is_kanji(ch):
    """True for CJK ideographs — excludes common hiragana/katakana particles."""
    cp = ord(ch)
    return (0x4E00 <= cp <= 0x9FFF or  # CJK Unified Ideographs
            0x3400 <= cp <= 0x4DBF or  # CJK Extension A
            0x20000 <= cp <= 0x2A6DF)  # CJK Extension B

def verse_chars(verse):
    text = "".join(t["surface"] for t in verse.get("tokens", []))
    return [c for c in text if c.strip()]

def verse_kanji(verse):
    """Distinctive kanji chars only — used for alignment scoring to avoid hiragana false positives."""
    return [c for c in verse_chars(verse) if is_kanji(c)]

new_timings = []
cursor = 0

for verse in lesson["verses"]:
    all_chars = verse_chars(verse)
    v_chars = verse_kanji(verse)  # use kanji only for matching
    if not all_chars:
        new_timings.append({"verse_number": verse["verse_number"],
                            "start_time_ms": None, "end_time_ms": None, "source": "empty"})
        continue

    # Fall back to all chars if verse has no kanji (e.g. pure hiragana verse)
    if not v_chars:
        v_chars = all_chars

    window_len = min(len(whisper_chars) - cursor, max(20, round(len(all_chars) * 1.5)))
    if window_len <= 0:
        new_timings.append({"verse_number": verse["verse_number"],
                            "start_time_ms": None, "end_time_ms": None, "source": "no-window"})
        continue

    # Before the first successful anchor, search the entire remaining stream.
    # Otherwise cursor-local search keeps us near where we expect the next
    # verse. Songs with long English / romaji lead-ins (99-mob-choir,
    # mountain-a-go-go-too) need the full search to find the first anchor.
    no_anchor_yet = not any(t.get("start_time_ms") is not None for t in new_timings)

    def best_window_for(chars_to_match):
        """Slide a window across the remaining whisper stream; return
        (best_start, best_score, best_end) for the given char set."""
        char_set = set(chars_to_match)
        starts = (len(whisper_chars) - cursor) if no_anchor_yet else min(50, len(whisper_chars) - cursor)
        b_start, b_score, b_end = -1, -1, -1
        for s in range(starts):
            w_start = cursor + s
            w_end = min(len(whisper_chars), w_start + window_len)
            score = sum(1 for i in range(w_start, w_end) if whisper_chars[i]["ch"] in char_set)
            if score > b_score:
                b_score, b_start, b_end = score, w_start, w_end
        return b_start, b_score, b_end, char_set

    # First attempt: kanji-only (strong signal, few false positives).
    best_start, best_score, best_end, v_set = best_window_for(v_chars)
    threshold = max(2, math.floor(len(v_chars) * 0.3))
    matched = best_score >= threshold

    # Fallback: if kanji alignment failed (verse has 0–1 kanji, or the kanji
    # don't appear in whisper), retry with all verse chars (hiragana + katakana
    # + kanji). Hiragana matches are noisier but for verses with no kanji
    # overlap they're the only signal available. Use a stricter 40% threshold
    # since hiragana has more false positives than kanji.
    if not matched:
        fb_start, fb_score, fb_end, fb_set = best_window_for(all_chars)
        fb_threshold = max(4, math.floor(len(all_chars) * 0.4))
        if fb_score >= fb_threshold:
            best_start, best_score, best_end, v_set = fb_start, fb_score, fb_end, fb_set
            matched = True

    if matched:
        first_match = next((i for i in range(best_start, best_end) if whisper_chars[i]["ch"] in v_set), -1)
        # Limit last_match to the dense speech region: stop scanning when there
        # is a gap > 3s between consecutive WhisperX chars (silence / instrumental).
        # Without this, a common kanji (e.g. 今) appearing in the next verse bleeds
        # the end time far past the actual verse speech.
        MAX_SPEECH_GAP_MS = 3000
        speech_end_idx = best_end - 1
        for _i in range(first_match + 1, best_end):
            if whisper_chars[_i]["startMs"] - whisper_chars[_i - 1]["endMs"] > MAX_SPEECH_GAP_MS:
                speech_end_idx = _i - 1
                break
        last_match = next(
            (i for i in range(speech_end_idx, first_match - 1, -1) if whisper_chars[i]["ch"] in v_set),
            first_match,
        )
        if first_match >= 0:
            new_timings.append({
                "verse_number": verse["verse_number"],
                "start_time_ms": whisper_chars[first_match]["startMs"],
                "end_time_ms": whisper_chars[last_match]["endMs"],
                "source": "whisperx-lcs",
            })
            cursor = last_match + 1
            continue

    new_timings.append({"verse_number": verse["verse_number"],
                        "start_time_ms": None, "end_time_ms": None, "source": "unaligned"})

# Extrapolate unaligned verses from aligned neighbors
aligned = [t for t in new_timings if t["start_time_ms"] is not None]
if len(aligned) >= 2:
    aligned_verse_chars = [
        len(verse_chars(lesson["verses"][i]))
        for i, t in enumerate(new_timings) if t["start_time_ms"] is not None
    ]
    total_aligned_chars = sum(aligned_verse_chars)
    total_aligned_ms = aligned[-1]["end_time_ms"] - aligned[0]["start_time_ms"]
    ms_per_char = total_aligned_ms / total_aligned_chars if total_aligned_chars else 100
    print(f"[retime] estimated {ms_per_char:.2f}ms/char from {len(aligned)} aligned verses")

    # Find contiguous runs of unaligned verses and fill each run using its
    # nearest aligned anchor. Multiple consecutive unaligned verses before an
    # anchor are placed backward from that anchor proportionally.
    i = 0
    while i < len(new_timings):
        if new_timings[i]["start_time_ms"] is not None:
            i += 1
            continue
        # Found start of an unaligned run — collect it
        run_start = i
        while i < len(new_timings) and new_timings[i]["start_time_ms"] is None:
            i += 1
        run_end = i  # exclusive; new_timings[run_end] is the first aligned after the run (if exists)

        prev_aligned = run_start - 1  # last aligned before the run (-1 if none)
        next_aligned = run_end        # first aligned after the run (len if none)

        has_prev = prev_aligned >= 0 and new_timings[prev_aligned]["start_time_ms"] is not None
        has_next = next_aligned < len(new_timings)

        if has_prev and not has_next:
            # Tail — extrapolate forward from prev
            cursor_ms = new_timings[prev_aligned]["end_time_ms"] + 100
            for j in range(run_start, run_end):
                v_len = len(verse_chars(lesson["verses"][j]))
                new_timings[j]["start_time_ms"] = cursor_ms
                new_timings[j]["end_time_ms"] = round(cursor_ms + v_len * ms_per_char)
                new_timings[j]["source"] = "extrapolated-forward"
                cursor_ms = new_timings[j]["end_time_ms"] + 100
        elif has_next and not has_prev:
            # Head — extrapolate backward from next, iterating the run in reverse
            cursor_ms = new_timings[next_aligned]["start_time_ms"] - 100
            for j in range(run_end - 1, run_start - 1, -1):
                v_len = len(verse_chars(lesson["verses"][j]))
                end_ms = cursor_ms
                start_ms = max(0, round(end_ms - v_len * ms_per_char))
                new_timings[j]["start_time_ms"] = start_ms
                new_timings[j]["end_time_ms"] = end_ms
                new_timings[j]["source"] = "extrapolated-backward"
                cursor_ms = start_ms - 100
        elif has_prev and has_next:
            # Sandwiched — distribute proportionally between prev end and next start
            budget_ms = new_timings[next_aligned]["start_time_ms"] - new_timings[prev_aligned]["end_time_ms"] - 100
            total_chars = sum(len(verse_chars(lesson["verses"][j])) for j in range(run_start, run_end))
            rate = budget_ms / total_chars if total_chars else ms_per_char
            cursor_ms = new_timings[prev_aligned]["end_time_ms"] + 50
            for j in range(run_start, run_end):
                v_len = len(verse_chars(lesson["verses"][j]))
                new_timings[j]["start_time_ms"] = round(cursor_ms)
                new_timings[j]["end_time_ms"] = round(cursor_ms + v_len * rate)
                new_timings[j]["source"] = "extrapolated-sandwiched"
                cursor_ms = new_timings[j]["end_time_ms"] + 50

# Print table
print("\n[retime] new verse timings:")
print(f"{'v':>4}  {'old_start':>10}  {'new_start':>10}  {'new_end':>10}  {'source'}")
print("-" * 60)
for i, t in enumerate(new_timings):
    old = lesson["verses"][i].get("start_time_ms", "?")
    print(f"{t['verse_number']:>4}  {str(old):>10}  {str(t['start_time_ms']):>10}  {str(t['end_time_ms']):>10}  {t['source']}")

if dry_run:
    print("\n[retime] dry-run; not writing")
    sys.exit(0)

# Apply
for i, verse in enumerate(lesson["verses"]):
    t = new_timings[i]
    if t["start_time_ms"] is not None:
        verse["start_time_ms"] = t["start_time_ms"]
        verse["end_time_ms"] = t["end_time_ms"]

lesson_path.write_text(json.dumps(lesson, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\n[retime] wrote {lesson_path}")
