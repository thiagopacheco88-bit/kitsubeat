#!/usr/bin/env python3
"""Full TikTok mobile posting flow — video already on device, runs end-to-end."""
import subprocess, time, sys, io, xml.etree.ElementTree as ET

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

def adb(*args):
    return subprocess.run(["adb"] + list(args), capture_output=True)

def adb_out(*args):
    return adb(*args).stdout.decode("utf-8", errors="replace").strip()

def tap(x, y):
    adb("shell", "input", "tap", str(x), str(y))
    time.sleep(0.3)

def keyevent(code):
    adb("shell", "input", "keyevent", str(code))
    time.sleep(0.1)

def type_text(text):
    """Single-quote the text so adb shell treats it as one arg — preserves # and spaces."""
    safe = text.replace("'", "'\"'\"'")
    subprocess.run(["adb", "shell", f"input text '{safe}'"], capture_output=True)
    time.sleep(0.25)

def dump_ui(path="/sdcard/post.xml"):
    adb("shell", "uiautomator", "dump", "--compressed", path)
    xml = adb_out("shell", "cat", path)
    try:
        return ET.fromstring(xml)
    except:
        return None

def find_node(root, text=None, desc=None):
    for node in root.iter("node"):
        t = node.get("text", "")
        d = node.get("content-desc", "")
        if text and text.lower() in t.lower():
            return node
        if desc and desc.lower() in d.lower():
            return node
    return None

def center(node):
    b = node.get("bounds", "")
    parts = b.replace("][", ",").replace("[","").replace("]","").split(",")
    x1, y1, x2, y2 = map(int, parts)
    return (x1+x2)//2, (y1+y2)//2

def wait_and_shot(name, delay=2):
    time.sleep(delay)
    data = subprocess.run(["adb","exec-out","screencap","-p"], capture_output=True).stdout
    open(f"scripts/mobile-shots/{name}.png","wb").write(data)
    print(f"  shot: {name}.png")

# ── Step 1: + button ──────────────────────────────────────────────────────────
print("=== STEP 1: Tap + to create ===")
tap(540, 2150)
wait_and_shot("s1_create", 3)

# ── Step 2: Gallery ───────────────────────────────────────────────────────────
print("=== STEP 2: Tap gallery thumbnail (upload area) ===")
# Gallery hot area bottom-left based on previous session mapping
tap(95, 2126)
wait_and_shot("s2_gallery", 3)

# Navigate to Movies folder if needed
root = dump_ui()
if root:
    movies = find_node(root, text="Movies") or find_node(root, text="Filmes")
    if movies:
        cx, cy = center(movies)
        print(f"  Found Movies folder at ({cx},{cy})")
        tap(cx, cy)
        wait_and_shot("s2_movies", 2)
    else:
        print("  Movies not visible — checking for folder list button")
        # Try tapping the folder name button at top
        tap(200, 160)
        wait_and_shot("s2_folder_dropdown", 2)
        root2 = dump_ui()
        if root2:
            mv = find_node(root2, text="Movies") or find_node(root2, text="Filmes")
            if mv:
                cx, cy = center(mv)
                print(f"  Movies in dropdown at ({cx},{cy})")
                tap(cx, cy)
                wait_and_shot("s2_in_movies", 2)

# ── Step 3: Select video ──────────────────────────────────────────────────────
print("=== STEP 3: Tap video selection circle ===")
tap(307, 403)  # Selection circle center from previous mapping
wait_and_shot("s3_selected", 2)

# Tap Próximo
print("=== STEP 4: Tap Próximo ===")
tap(798, 2098)
wait_and_shot("s4_editor", 3)

# ── Step 5: Add sound ─────────────────────────────────────────────────────────
print("=== STEP 5: Tap Adicionar som ===")
tap(539, 228)
wait_and_shot("s5_sound_panel", 2)

# Tap search in sound panel
print("=== STEP 6: Search for Overtaken ===")
tap(1012, 1136)
wait_and_shot("s6_search", 2)

type_text("Overtaken one piece")
wait_and_shot("s6_typed", 2)
keyevent(66)  # ENTER to search
wait_and_shot("s6_results", 3)

# ── Step 7: Select Epic Version ───────────────────────────────────────────────
print("=== STEP 7: Find and tap Overtaken Epic Version ===")
# First check what's on screen
root = dump_ui()
epic_row = None
if root:
    for node in root.iter("node"):
        t = node.get("text","")
        if "Epic" in t or "epic" in t.lower():
            print(f"  Found Epic node: {repr(t)} at {node.get('bounds')}")
            epic_row = node
            break

if epic_row:
    # Find its add button (ViewGroup to the right)
    cx, cy = center(epic_row)
    # Tap the add button at the right side of the same row
    tap(950, cy)
else:
    print("  Epic Version not immediately visible — scrolling to find it")
    # From previous session: row 5 add button was at (950, 2108)
    # Try scrolling up to expose it
    adb("shell","input","swipe","540","1800","540","1200","400")
    wait_and_shot("s7_scrolled", 2)
    root = dump_ui()
    if root:
        for node in root.iter("node"):
            t = node.get("text","")
            if "Epic" in t:
                print(f"  Found after scroll: {repr(t)}")
                cx, cy = center(node)
                tap(950, cy)
                break
        else:
            print("  Fallback: tapping known coordinates (950, 2108)")
            tap(950, 2108)

wait_and_shot("s7_sound_selected", 2)

# Dismiss sound panel by tapping video area
print("=== STEP 8: Confirm sound ===")
tap(540, 600)
wait_and_shot("s8_confirmed", 2)

# Check if sound is applied
root = dump_ui()
if root:
    overtaken = find_node(root, text="Overtaken")
    if overtaken:
        print(f"  Sound confirmed: {overtaken.get('text','')}")
    else:
        print("  WARNING: Overtaken not visible in header — check screenshot")

# ── Step 9: Tap Seguinte ──────────────────────────────────────────────────────
print("=== STEP 9: Tap Seguinte ===")
tap(798, 2098)
wait_and_shot("s9_posting_screen", 4)

# Dismiss content reuse modal if present
root = dump_ui()
if root:
    ok = find_node(root, text="OK")
    if ok:
        cx, cy = center(ok)
        print(f"  Dismissing modal at ({cx},{cy})")
        tap(cx, cy)
        wait_and_shot("s9_modal_dismissed", 2)

# ── Step 10: Type caption ─────────────────────────────────────────────────────
print("=== STEP 10: Type caption ===")

# Find EditText and tap it
root = dump_ui()
caption_field = None
if root:
    for node in root.iter("node"):
        if "EditText" in node.get("class",""):
            caption_field = node
            break

if caption_field:
    cx, cy = center(caption_field)
    print(f"  Caption field at ({cx},{cy})")
    tap(cx, cy)
else:
    tap(344, 449)

time.sleep(0.8)

# Type lines 1-3 (no hashtag issues)
type_text("One Piece vocab quiz #2 - Can you get 5/5?")
keyevent(66)  # ENTER

type_text("yume . kaigun . kenshi . takara . akuma no mi")
keyevent(66)  # ENTER

type_text("Learn Japanese through anime - kitsubeat.com")
keyevent(66)  # ENTER

print("  Lines 1-3 done")

# ── Hashtags: type all at once, then verify and fix ───────────────────────────
# Type all hashtags as ONE input text call — fastest injection
hashtag_line = "#japanese #learnJapanese #japaneseVocab #anime #onePiece #japaneseQuiz #studyJapanese #animequiz #shorts"
type_text(hashtag_line)
time.sleep(1)

wait_and_shot("s10_caption", 1)

# Verify
root = dump_ui()
if root:
    for node in root.iter("node"):
        if "EditText" in node.get("class",""):
            actual = node.get("text","")
            print(f"\nCAPTION VERIFICATION:")
            print(actual)

            # Check if all hashtags have #
            missing = []
            expected_tags = ["#japanese","#learnJapanese","#japaneseVocab","#anime",
                           "#onePiece","#japaneseQuiz","#studyJapanese","#animequiz","#shorts"]
            for tag in expected_tags:
                if tag not in actual:
                    missing.append(tag)
            if missing:
                print(f"\nMISSING HASHTAGS: {missing}")
            else:
                print("\nAll hashtags present!")
            break

print("\n=== Caption done. Next: edit cover, then post ===")
