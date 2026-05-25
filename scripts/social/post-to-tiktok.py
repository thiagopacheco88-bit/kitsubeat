#!/usr/bin/env python3
"""Post a KitsuBeat anime quiz video to TikTok via ADB.

Usage:
    python scripts/post-to-tiktok.py <series-key> <part-number>

Examples:
    python scripts/post-to-tiktok.py one-piece 3
    python scripts/post-to-tiktok.py naruto 1

The script handles everything automatically and pauses ONCE for you to
select the correct sound on the phone. All other steps are deterministic.
"""
import json, subprocess, time, sys, io, xml.etree.ElementTree as ET
from pathlib import Path
from datetime import date

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# ── Config ────────────────────────────────────────────────────────────────────
CATALOG     = Path("videos/catalog.json")
VIDEOS_DIR  = Path("videos")
DEVICE_PATH = "/sdcard/Movies/kitsubeat-post.mp4"

CAPTION_TMPL = (
    "{label} vocab quiz #{part} - Can you get 5/5?\n"
    "{words}\n"
    "Learn Japanese through anime - kitsubeat.com\n"
    "#japanese #learnJapanese #japaneseVocab #anime"
)

# ── ADB helpers ───────────────────────────────────────────────────────────────
def adb(*args):
    return subprocess.run(["adb"] + list(args), capture_output=True)

def tap(x, y, delay=1.2):
    adb("shell", "input", "tap", str(x), str(y))
    time.sleep(delay)

def swipe_tap(x, y, delay=2.0):
    """Swipe-in-place — more reliable than input tap for TikTok's Publicar."""
    adb("shell", "input", "swipe", str(x), str(y), str(x), str(y), "50")
    time.sleep(delay)

def keyevent(code, delay=0.4):
    adb("shell", "input", "keyevent", str(code))
    time.sleep(delay)

def type_text(text, delay=0.4):
    safe = text.replace("'", "'\"'\"'")
    subprocess.run(["adb", "shell", f"input text '{safe}'"], capture_output=True)
    time.sleep(delay)

def dump_ui():
    adb("shell", "uiautomator", "dump", "--compressed", "/sdcard/post.xml")
    xml = adb("shell", "cat", "/sdcard/post.xml").stdout.decode("utf-8", errors="replace")
    try:
        return ET.fromstring(xml)
    except Exception:
        return None

def find_node(root, text=None, desc=None):
    if root is None:
        return None
    for n in root.iter("node"):
        t, d = n.get("text", ""), n.get("content-desc", "")
        if text and text.lower() in t.lower():
            return n
        if desc and desc.lower() in d.lower():
            return n
    return None

def center(node):
    p = node.get("bounds", "").replace("][", ",").replace("[", "").replace("]", "").split(",")
    x1, y1, x2, y2 = map(int, p)
    return (x1 + x2) // 2, (y1 + y2) // 2

def pause(msg):
    print(f"\n{'='*60}\n{msg}\n{'='*60}")
    input("Press Enter when ready... ")
    print()

# ── Catalog helpers ───────────────────────────────────────────────────────────
def load_part(series_key, part_num):
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    series = catalog.get(series_key)
    if not series:
        keys = list(catalog.keys())
        sys.exit(f"Series '{series_key}' not found. Available: {keys}")
    matches = [p for p in series["parts"] if p["part"] == part_num]
    if not matches:
        sys.exit(f"Part {part_num} not found for '{series_key}'")
    return catalog, series, matches[0]

def build_caption(series, part):
    words = " . ".join(w["romaji"] for w in part["words"])
    return CAPTION_TMPL.format(label=series["label"], part=part["part"], words=words)

def find_clean_render(folder):
    """Return the most recent render file with no baked-in music/suffix."""
    renders_dir = VIDEOS_DIR / folder / "renders"
    if not renders_dir.exists():
        sys.exit(f"Renders dir not found: {renders_dir}")
    skip = ("_music", "_yt", "_sagas")
    clean = [f for f in renders_dir.glob("*.mp4") if not any(s in f.name for s in skip)]
    if not clean:
        sys.exit(f"No clean render in {renders_dir}. Files: {list(renders_dir.glob('*.mp4'))}")
    return max(clean, key=lambda f: f.stat().st_mtime)

def mark_posted(catalog, series_key, part_num):
    for part in catalog[series_key]["parts"]:
        if part["part"] == part_num:
            if part["posted"].get("tiktok") is None:
                part["posted"]["tiktok"] = {}
            part["posted"]["tiktok"]["date"] = str(date.today())
            break
    CATALOG.write_text(json.dumps(catalog, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  catalog.json → {series_key} part {part_num} TikTok posted {date.today()}")

# ── Main flow ─────────────────────────────────────────────────────────────────
def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)

    series_key = sys.argv[1]
    part_num   = int(sys.argv[2])

    catalog, series, part = load_part(series_key, part_num)
    caption    = build_caption(series, part)
    tiktok_sound = series.get("tiktok_sound", series.get("music", ""))

    print(f"\n{'='*60}")
    print(f"  Series : {series['label']} — Part {part_num}")
    print(f"  Sound  : {tiktok_sound or '(not set — you will choose manually)'}")
    print(f"\n  Caption:\n")
    for line in caption.split("\n"):
        print(f"    {line}")
    print(f"{'='*60}\n")

    # ── 0. Push video ─────────────────────────────────────────────────────────
    render = find_clean_render(part["folder"])
    print(f"Video: {render.name}")
    print("Pushing to device...")
    r = adb("push", str(render), DEVICE_PATH)
    if r.returncode != 0:
        sys.exit(f"adb push failed:\n{r.stderr.decode()}")
    print("  Done.\n")

    # ── 1. Pre-flight check ───────────────────────────────────────────────────
    pause("Verify @kitsubeat is logged in on TikTok, then press Enter.")

    # ── 2. Launch TikTok + tap + ──────────────────────────────────────────────
    print("Launching TikTok...")
    adb("shell", "am", "start", "-n",
        "com.zhiliaoapp.musically/com.ss.android.ugc.aweme.main.MainActivity")
    time.sleep(4)

    print("Tapping + (Create)...")
    tap(540, 2136, 3)

    # ── 3. Gallery → Movies ───────────────────────────────────────────────────
    print("Opening gallery...")
    tap(95, 2126, 2.5)

    root = dump_ui()
    movies = find_node(root, text="Movies") or find_node(root, text="Filmes")
    if not movies:
        print("  Folder not visible, opening dropdown...")
        recentes = find_node(root, text="Recentes")
        tap(*center(recentes), 1.5) if recentes else tap(514, 151, 1.5)
        root = dump_ui()
        movies = find_node(root, text="Movies") or find_node(root, text="Filmes")

    if not movies:
        sys.exit("Could not find Movies folder — check phone screen and retry")
    cx, cy = center(movies)
    print(f"  Movies at ({cx},{cy})")
    tap(cx, cy, 2.5)

    # ── 4. Select video → clip editor ─────────────────────────────────────────
    print("Selecting video...")
    tap(305, 629, 2)

    root = dump_ui()
    seguinte = find_node(root, text="Seguinte")
    if seguinte:
        cx, cy = center(seguinte)
        tap(cx, cy, 4)
    else:
        tap(795, 2143, 4)  # fallback known coord

    # ── 5. Add sound (manual pause) ───────────────────────────────────────────
    sound_instructions = f"ADD SOUND on the phone:\n"
    if tiktok_sound:
        sound_instructions += f"  → {tiktok_sound}\n"
    sound_instructions += (
        "  1. Tap 'Sons' / 'Adicionar som' at top of clip editor\n"
        "  2. Select the correct sound\n"
        "  3. Tap the video area to close the sound panel\n"
        "  (Do NOT tap Seguinte yet)"
    )
    pause(sound_instructions)

    # ── 6. Seguinte → posting screen ──────────────────────────────────────────
    print("Going to posting screen...")
    tap(795, 2143, 4)

    root = dump_ui()
    ok = find_node(root, text="OK")
    if ok:
        print("  Dismissing modal...")
        tap(*center(ok), 2)
        root = dump_ui()

    # ── 7. Type caption ───────────────────────────────────────────────────────
    print("Typing caption...")
    root = dump_ui()
    field = next((n for n in root.iter("node") if "EditText" in n.get("class", "")), None) if root else None
    if field:
        tap(*center(field), 1)
    else:
        tap(344, 449, 1)

    lines = caption.split("\n")
    for i, line in enumerate(lines):
        print(f"  [{i+1}] {line}")
        type_text(line)
        if i < len(lines) - 1:
            keyevent(66, 0.3)   # ENTER between lines

    time.sleep(1)

    # Verify
    root = dump_ui()
    for n in (root.iter("node") if root else []):
        if "EditText" in n.get("class", ""):
            actual = n.get("text", "")
            missing = [t for t in ["#japanese", "#learnJapanese", "#japaneseVocab", "#anime"]
                       if t not in actual]
            if missing:
                print(f"  WARNING: missing hashtags: {missing}")
            else:
                print("  Caption verified ✓")
            break

    # ── 8. Publicar ───────────────────────────────────────────────────────────
    print("Dismissing keyboard...")
    keyevent(111, 0.8)
    tap(540, 1200, 1)

    print("Tapping Publicar...")
    swipe_tap(798, 2060, 5)

    root = dump_ui()
    if find_node(root, text="Publicar"):
        print("\nWARNING: Still on posting screen.")
        print("Tap Publicar manually on the phone, then run:")
        print(f"  python scripts/post-to-tiktok.py {series_key} {part_num} --mark-only")
    else:
        print("\nPosted! ✓")
        mark_posted(catalog, series_key, part_num)

if __name__ == "__main__":
    # --mark-only: just update catalog without running the flow
    if "--mark-only" in sys.argv:
        sys.argv.remove("--mark-only")
        _, series_key, part_num = sys.argv
        catalog, _, _ = load_part(series_key, int(part_num))
        mark_posted(catalog, series_key, int(part_num))
    else:
        main()
