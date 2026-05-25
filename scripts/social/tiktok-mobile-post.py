#!/usr/bin/env python3
"""
TikTok mobile post via ADB.
Pushes clean video + thumbnail to phone, opens TikTok, adds sound,
types caption, sets cover, posts.

Usage:
  python scripts/tiktok-mobile-post.py --dir videos/one-piece-quiz-2
"""

import subprocess, time, json, os, sys, re, xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime

# Force UTF-8 stdout on Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

TIKTOK_PKG = "com.zhiliaoapp.musically"
SHOTS_DIR  = Path("scripts/mobile-shots")
SHOTS_DIR.mkdir(parents=True, exist_ok=True)

# ── ADB primitives ───────────────────────────────────────────────────────────

def adb(*args, capture=True, timeout=60):
    cmd = ["adb"] + list(args)
    r = subprocess.run(cmd, capture_output=True, timeout=timeout)
    if capture:
        return r.stdout.decode("utf-8", errors="replace").strip()
    return r

def shot(label="step"):
    ts = datetime.now().strftime("%H%M%S")
    path = SHOTS_DIR / f"{label}_{ts}.png"
    data = subprocess.run(["adb", "exec-out", "screencap", "-p"], capture_output=True).stdout
    path.write_bytes(data)
    print(f"  📸 {path}")
    return str(path)

def tap(x, y, label=""):
    print(f"  tap ({x},{y}) {label}")
    adb("shell", "input", "tap", str(x), str(y))
    time.sleep(0.7)

def swipe(x1, y1, x2, y2, ms=400):
    adb("shell", "input", "swipe", str(x1), str(y1), str(x2), str(y2), str(ms))
    time.sleep(0.6)

def key(code):
    adb("shell", "input", "keyevent", str(code))
    time.sleep(0.3)

KEYCODE_BACK   = 4
KEYCODE_ENTER  = 66
KEYCODE_DEL    = 67
KEYCODE_CTRL_A = 277  # select all (some keyboards)

# ── UIAutomator element finder ───────────────────────────────────────────────

def ui_dump():
    adb("shell", "uiautomator", "dump", "--compressed", "/sdcard/ui.xml")
    xml = adb("shell", "cat", "/sdcard/ui.xml")
    try:
        return ET.fromstring(xml)
    except Exception as e:
        print(f"  ⚠ ui_dump parse error: {e}")
        return None

def _bounds_center(bounds_str):
    nums = list(map(int, re.findall(r"\d+", bounds_str)))
    if len(nums) == 4:
        return (nums[0] + nums[2]) // 2, (nums[1] + nums[3]) // 2
    return None

def find_node(text=None, desc=None, res_id=None, exact=False):
    root = ui_dump()
    if root is None:
        return None
    for node in root.iter("node"):
        t = node.get("text", "")
        d = node.get("content-desc", "")
        r = node.get("resource-id", "")
        match = True
        if text:
            match = match and (t == text if exact else text.lower() in t.lower())
        if desc:
            match = match and (d == desc if exact else desc.lower() in d.lower())
        if res_id:
            match = match and res_id in r
        if match and (text or desc or res_id):
            return _bounds_center(node.get("bounds", ""))
    return None

def wait_tap(text=None, desc=None, res_id=None, timeout=20, label="", exact=False):
    target = text or desc or res_id
    print(f"  ⏳ waiting for [{target}]...")
    for i in range(timeout):
        pos = find_node(text=text, desc=desc, res_id=res_id, exact=exact)
        if pos:
            tap(*pos, label=label or target)
            return True
        time.sleep(1)
    shot(f"timeout_{target}")
    print(f"  ✗ timeout — could not find [{target}]")
    return False

def element_visible(text=None, desc=None, res_id=None):
    return find_node(text=text, desc=desc, res_id=res_id) is not None

def wait_visible(text=None, desc=None, timeout=30):
    target = text or desc
    for _ in range(timeout):
        if element_visible(text=text, desc=desc):
            return True
        time.sleep(1)
    return False

# ── Text input ───────────────────────────────────────────────────────────────

def clear_field():
    """Select all + delete in a focused text field."""
    key(KEYCODE_CTRL_A)
    time.sleep(0.2)
    # Also try triple-tap to select all text
    adb("shell", "input", "keyevent", "--longpress", str(KEYCODE_DEL))
    time.sleep(0.3)

def type_text_lines(text):
    """
    Type multi-line text via ADB input text.
    Handles line breaks by sending them as ENTER keypresses.
    Emoji and non-ASCII chars are replaced with safe versions.
    """
    # Clean text for ADB: remove emoji, keep ASCII + common unicode
    def clean(s):
        # Remove emoji ranges
        cleaned = re.sub(r"[\U00010000-\U0010ffff]", "", s)
        # Remove zero-width joiners and variation selectors
        cleaned = re.sub(r"[‍️]", "", cleaned)
        # Replace special punctuation with ASCII equivalents
        cleaned = cleaned.replace("→", "->").replace("·", "-").replace("•", "-")
        # Escape shell-problematic chars
        cleaned = cleaned.replace("'", "").replace('"', "").replace("`", "").replace("\\", "")
        # Replace spaces with %s for adb input text
        cleaned = cleaned.replace(" ", "%s")
        return cleaned.strip()

    lines = text.split("\n")
    for i, line in enumerate(lines):
        safe = clean(line)
        if safe:
            adb("shell", "input", "text", safe)
            time.sleep(0.3)
        if i < len(lines) - 1:
            key(KEYCODE_ENTER)

# ── Main posting flow ────────────────────────────────────────────────────────

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dir", required=True, help="Quiz video folder, e.g. videos/one-piece-quiz-2")
    args = parser.parse_args()

    quiz_dir = Path(args.dir)
    social_f = quiz_dir / "social.json"
    if not social_f.exists():
        sys.exit(f"No social.json in {quiz_dir}")

    social   = json.loads(social_f.read_text(encoding="utf-8"))
    caption  = social["caption"]
    sound    = social.get("tiktokSound", "")

    # Find clean render (no _music, _yt, _sagas suffix)
    renders = sorted((quiz_dir / "renders").glob("*.mp4"), reverse=True)
    clean   = next((f for f in renders if not any(s in f.name for s in ("_music", "_yt", "_sagas"))), None)
    if not clean:
        sys.exit("No clean MP4 found in renders/")

    thumbnail = quiz_dir / "thumbnail.png"

    W, H = 1080, 2340
    CX = W // 2

    print(f"\n📱 TikTok Mobile Post")
    print(f"   Video:     {clean.name}")
    print(f"   Sound:     {sound}")
    print(f"   Thumbnail: {'✓' if thumbnail.exists() else '✗ (skipping)'}")
    print(f"   Caption:\n{caption}\n")

    # ── Step 1: Push files ────────────────────────────────────────────────
    print("📤 Pushing files to device...")
    REMOTE_VIDEO = "/sdcard/Movies/kitsubeat-post.mp4"
    REMOTE_THUMB = "/sdcard/Pictures/kitsubeat-thumb.png"

    r = subprocess.run(["adb", "push", str(clean.resolve()), REMOTE_VIDEO],
                       capture_output=True, text=True, timeout=120)
    print(f"  video: {(r.stdout + r.stderr).strip().splitlines()[-1]}")
    if thumbnail.exists():
        r = subprocess.run(["adb", "push", str(thumbnail.resolve()), REMOTE_THUMB],
                           capture_output=True, text=True, timeout=30)
        print(f"  thumb: {(r.stdout + r.stderr).strip().splitlines()[-1]}")

    # Media scan so TikTok gallery sees the files
    for f in [REMOTE_VIDEO, REMOTE_THUMB]:
        adb("shell", "am", "broadcast",
            "-a", "android.intent.action.MEDIA_SCANNER_SCAN_FILE",
            "-d", f"file://{f}")
    time.sleep(2)
    print("  Files pushed ✓")

    # ── Step 2: Wake + unlock screen ─────────────────────────────────────
    print("\n[*] Waking screen...")
    adb("shell", "input", "keyevent", "224")   # KEYCODE_WAKEUP
    time.sleep(1)
    # Try swipe-up unlock (no-op if PIN required)
    adb("shell", "input", "swipe", "540", "1800", "540", "800", "300")
    time.sleep(1)

    # Wait until the screen is actually unlocked (keyguard dismissed)
    print("  Waiting for screen unlock (unlock your phone if prompted)...")
    for _ in range(60):
        locked = adb("shell", "dumpsys", "window", "|", "grep", "mDreamingLockscreen")
        if "true" not in locked.lower():
            break
        time.sleep(1)
    else:
        # Final check via display state
        pass

    # Simpler check: if keyguard is showing, prompt user
    kg = adb("shell", "dumpsys", "activity", "|", "grep", "-i", "keyguard")
    if "showing=true" in kg or "isShowing=true" in kg:
        print("\n  *** Please unlock your phone now, then press Enter ***")
        input()
    time.sleep(1)
    shot("00-unlocked")

    # ── Step 3: Launch TikTok ─────────────────────────────────────────────
    print("\n[*] Launching TikTok...")
    adb("shell", "am", "force-stop", TIKTOK_PKG)
    time.sleep(1)
    adb("shell", "monkey", "-p", TIKTOK_PKG, "-c", "android.intent.category.LAUNCHER", "1")
    time.sleep(5)
    shot("01-launched")

    # ── Step 3: Tap the + (Create) button ────────────────────────────────
    print("\n➕ Tapping Create button...")
    # The + button is in the bottom nav bar, center
    if not wait_tap(desc="Create video", timeout=10):
        # Fallback: tap bottom center nav
        tap(CX, H - 110, "bottom + button")
    time.sleep(2)
    shot("02-create")

    # ── Step 4: Switch to Upload tab ──────────────────────────────────────
    print("\n📁 Switching to Upload...")
    if not wait_tap(text="Upload", timeout=10):
        # Some TikTok versions say "Gallery" or "Upload video"
        wait_tap(text="Gallery", timeout=5)
    time.sleep(2)
    shot("03-upload-tab")

    # ── Step 5: Select the video ──────────────────────────────────────────
    print("\n🎬 Selecting video...")
    # The video should appear in the gallery (Movies folder)
    # Try to find it by tapping the first item in the gallery
    # or by navigating to Movies / All videos
    # First try to switch to "Videos" or "All" tab if present
    for tab in ["Videos", "All", "Movies"]:
        if element_visible(text=tab):
            wait_tap(text=tab, timeout=5)
            time.sleep(1)
            break

    # The pushed file should be the newest video — it'll be first in the grid
    # Grid items are hard to target by text, so tap first cell (~top-left of gallery)
    # Grid typically starts around y=400, cells are ~180px wide on 1080 screen
    time.sleep(1)
    shot("04-gallery")

    # Try UIAutomator to find the video by name, else tap first grid cell
    pos = find_node(text="kitsubeat-post") or find_node(desc="kitsubeat-post")
    if pos:
        tap(*pos, "video by name")
    else:
        # Tap first thumbnail in the grid (top-left area of gallery)
        # Gallery grid typically starts at y~400 on 2340 screen
        tap(90, 500, "first gallery item")

    time.sleep(2)
    shot("05-video-selected")

    # ── Step 6: Next → clip editor ────────────────────────────────────────
    print("\n▶ Tapping Next...")
    wait_tap(text="Next", timeout=10)
    time.sleep(3)
    shot("06-clip-editor")

    # ── Step 7: Add sound ─────────────────────────────────────────────────
    if sound:
        print(f"\n🎵 Adding sound: {sound}...")

        # Look for Sounds button in the clip editor toolbar
        if not wait_tap(text="Sounds", desc="Sounds", timeout=10):
            wait_tap(text="Add sound", timeout=5)
        time.sleep(2)
        shot("07-sound-panel")

        # Search for the sound
        search_pos = find_node(desc="Search") or find_node(text="Search sounds") or find_node(res_id="search")
        if search_pos:
            tap(*search_pos, "search box")
        else:
            # Try tapping a search icon at top of panel
            tap(CX, 300, "search area")
        time.sleep(1)

        adb("shell", "input", "text", sound.replace(" ", "%s"))
        time.sleep(3)
        shot("08-sound-search")

        # Tap the first search result row (not the + button, the row itself)
        pos = find_node(text=sound) or find_node(desc=sound)
        if pos:
            tap(*pos, "sound result")
        else:
            # Tap left side of first result row (~y=500 in the panel)
            tap(200, 500, "first sound result")
        time.sleep(2)
        shot("09-sound-selected")

        # Confirm / Use this sound if dialog appears
        for confirm in ["Use", "Done", "Confirm", "Add"]:
            if element_visible(text=confirm):
                wait_tap(text=confirm, timeout=5)
                break

        # Save / Done in clip editor
        for done in ["Done", "Save"]:
            if element_visible(text=done):
                wait_tap(text=done, timeout=5)
                break
        time.sleep(2)
        shot("10-sound-done")

    # ── Step 8: Next → posting screen ────────────────────────────────────
    print("\n▶ Tapping Next to posting screen...")
    wait_tap(text="Next", timeout=10)
    time.sleep(3)
    shot("11-post-screen")

    # ── Step 9: Set caption ───────────────────────────────────────────────
    print("\n✏️  Setting caption...")
    # Tap caption field — look for the description/caption input
    cap_pos = (find_node(res_id="caption")
               or find_node(res_id="description")
               or find_node(text="Describe your video")
               or find_node(text="Add a description"))
    if cap_pos:
        tap(*cap_pos, "caption field")
    else:
        # Caption field is usually near top of posting screen
        tap(CX, 300, "caption area")
    time.sleep(0.5)

    # Clear existing placeholder text
    clear_field()
    time.sleep(0.3)

    type_text_lines(caption)
    time.sleep(0.5)
    key(KEYCODE_BACK)  # Close keyboard
    time.sleep(1)
    shot("12-caption-set")

    # ── Step 10: Set cover thumbnail ──────────────────────────────────────
    if thumbnail.exists():
        print("\n🖼  Setting cover thumbnail...")
        if wait_tap(text="Cover", desc="Select cover", timeout=10):
            time.sleep(2)
            shot("13-cover-panel")

            # Tap "Upload photo" to use custom image
            if wait_tap(text="Upload photo", timeout=8):
                time.sleep(2)
                # Navigate to the pushed thumbnail in gallery
                # It should appear as the newest image
                shot("14-cover-gallery")
                # Tap first image in gallery (our thumbnail)
                pos = find_node(desc="kitsubeat-thumb") or find_node(text="kitsubeat-thumb")
                if pos:
                    tap(*pos, "thumbnail image")
                else:
                    tap(90, 500, "first gallery image")
                time.sleep(1)

                # Confirm selection
                for confirm in ["Select", "Done", "OK", "Use"]:
                    if element_visible(text=confirm):
                        wait_tap(text=confirm, timeout=5)
                        break
                time.sleep(1)
                shot("15-cover-set")
            else:
                print("  ⚠ 'Upload photo' not found — skipping thumbnail")
        else:
            print("  ⚠ Cover option not found — skipping thumbnail")
        time.sleep(1)

    # ── Step 11: Post ─────────────────────────────────────────────────────
    shot("16-pre-post")
    print("\n🚀 Posting...")

    posted = False
    for label in ["Post", "Publicar", "Publish"]:
        pos = find_node(text=label, exact=True)
        if pos:
            tap(*pos, f"Post button [{label}]")
            posted = True
            break

    if not posted:
        print("  ✗ Post button not found — please tap Post manually")
        shot("post-button-missing")
        return

    time.sleep(6)
    shot("17-posted")
    print("\n✅ Done! Check TikTok for the posted video.")
    print(f"\n📋 Full caption (verify in app):\n{caption}")


if __name__ == "__main__":
    main()
