#!/usr/bin/env python3
"""Clear TikTok caption field and type fresh caption."""
import subprocess, time, sys, io, xml.etree.ElementTree as ET

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

def adb(*args, capture=True):
    r = subprocess.run(["adb"] + list(args), capture_output=True)
    if capture:
        return r.stdout.decode("utf-8", errors="replace").strip()

def adb_shell(cmd):
    """Run adb shell with a full quoted command string."""
    subprocess.run(["adb", "shell", cmd], capture_output=True)

def tap(x, y): adb("shell", "input", "tap", str(x), str(y))
def swipe(x1, y1, x2, y2, ms=300): adb("shell", "input", "swipe", str(x1), str(y1), str(x2), str(y2), str(ms))
def keyevent(code): adb("shell", "input", "keyevent", str(code))

def dump_ui(path="/sdcard/uic.xml"):
    adb("shell", "uiautomator", "dump", "--compressed", path)
    xml = adb("shell", "cat", path)
    try:
        return ET.fromstring(xml)
    except:
        return None

def find_nodes(root, text_contains=None, desc_contains=None):
    results = []
    for node in root.iter("node"):
        t = node.get("text", "").lower()
        d = node.get("content-desc", "").lower()
        if text_contains and text_contains.lower() in t:
            results.append(node)
        elif desc_contains and desc_contains.lower() in d:
            results.append(node)
    return results

def node_center(node):
    b = node.get("bounds", "")
    # bounds format: [x1,y1][x2,y2]
    parts = b.replace("][", ",").replace("[", "").replace("]", "").split(",")
    x1, y1, x2, y2 = map(int, parts)
    return (x1 + x2) // 2, (y1 + y2) // 2

def type_text(text):
    safe = text.replace("'", "'\"'\"'")
    subprocess.run(["adb", "shell", f"input text '{safe}'"], capture_output=True)
    time.sleep(0.25)

# STEP 1: Long press to get Select All
print("Step 1: Long press caption field to get context menu...")
swipe(200, 400, 200, 400, 1500)  # long press = swipe in place 1.5s
time.sleep(0.8)

root = dump_ui()
if root:
    # Look for Selecionar tudo (Select All)
    nodes = find_nodes(root, text_contains="selecionar") or find_nodes(root, desc_contains="selecionar")
    if nodes:
        cx, cy = node_center(nodes[0])
        print(f"  Found 'Selecionar tudo' at ({cx},{cy}) — tapping")
        tap(cx, cy)
        time.sleep(0.5)
    else:
        print("  'Selecionar tudo' not found in context menu, dumping visible nodes...")
        for node in root.iter("node"):
            t = node.get("text","").strip()
            d = node.get("content-desc","").strip()
            b = node.get("bounds","")
            if t or d:
                print(f"    text={repr(t[:40])} desc={repr(d[:30])} {b}")
        # Try tapping the "..." overflow button if visible
        more_nodes = find_nodes(root, text_contains="...") or find_nodes(root, desc_contains="mais")
        if more_nodes:
            cx, cy = node_center(more_nodes[0])
            print(f"  Tapping overflow at ({cx},{cy})")
            tap(cx, cy)
            time.sleep(0.5)
            root2 = dump_ui()
            if root2:
                nodes2 = find_nodes(root2, text_contains="selecionar")
                if nodes2:
                    cx2, cy2 = node_center(nodes2[0])
                    print(f"  Found 'Selecionar' at ({cx2},{cy2}) in overflow")
                    tap(cx2, cy2)
                    time.sleep(0.3)

# STEP 2: Delete selected text
print("Step 2: Delete selected text...")
keyevent(67)   # BACKSPACE deletes selection
time.sleep(0.5)

# Verify field is empty
root = dump_ui()
if root:
    for node in root.iter("node"):
        if "EditText" in node.get("class", ""):
            txt = node.get("text","")
            print(f"  Caption now: {repr(txt[:80])}")
            if len(txt) > 5:
                print("  Field not clear! Trying backspace flood...")
                tap(344, 400)
                time.sleep(0.3)
                keyevent(123)
                for _ in range(600):
                    keyevent(67)
                time.sleep(0.5)
            break

# STEP 3: Tap caption field and type fresh caption
print("\nStep 3: Typing caption...")
tap(344, 400)
time.sleep(0.8)

# Lines 1-3 (no hashtag issues)
type_text("One Piece vocab quiz #2 - Can you get 5/5?")
keyevent(66)  # ENTER
print("  Line 1 done")

type_text("yume . kaigun . kenshi . takara . akuma no mi")
keyevent(66)  # ENTER
print("  Line 2 done")

type_text("Learn Japanese through anime - kitsubeat.com")
keyevent(66)  # ENTER
print("  Line 3 done")

# Hashtags: type each one, then press ESCAPE to dismiss autocomplete
hashtags = [
    "#japanese", "#learnJapanese", "#japaneseVocab", "#anime",
    "#onePiece", "#japaneseQuiz", "#studyJapanese", "#animequiz", "#shorts",
]
for i, tag in enumerate(hashtags):
    type_text(tag)
    time.sleep(0.2)
    keyevent(111)  # ESCAPE — dismiss TikTok's hashtag autocomplete panel
    time.sleep(0.15)
    if i < len(hashtags) - 1:
        type_text(" ")
    print(f"  Hashtag {tag} done")

time.sleep(0.5)

# Verify final caption
print("\nVerifying final caption via UIAutomator...")
root = dump_ui()
if root:
    for node in root.iter("node"):
        if "EditText" in node.get("class", ""):
            print("FINAL CAPTION:")
            print(node.get("text", ""))
            break

print("\nDone!")
