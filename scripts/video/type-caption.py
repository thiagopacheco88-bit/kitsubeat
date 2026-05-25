#!/usr/bin/env python3
"""Type TikTok caption via ADB — handles hashtag autocomplete by dismissing after each tag."""
import subprocess, time, sys, io

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

def adb(*args):
    subprocess.run(["adb"] + list(args), capture_output=True)

def tap(x, y):
    adb("shell", "input", "tap", str(x), str(y))

def keyevent(code):
    adb("shell", "input", "keyevent", str(code))

def type_text(text):
    """Type text as a single ADB shell command, single-quoted so # and spaces work."""
    safe = text.replace("'", "'\"'\"'")
    subprocess.run(["adb", "shell", f"input text '{safe}'"], capture_output=True)
    time.sleep(0.25)

def type_hashtag(tag):
    """Type a single hashtag and dismiss autocomplete with DPAD_RIGHT."""
    type_text(tag)
    time.sleep(0.15)
    keyevent(22)   # DPAD_RIGHT — moves cursor right, dismisses suggestion dropdown
    time.sleep(0.15)

# --- Main sequence ---

print("Step 1: Tap caption field and clear it...")
tap(344, 449)
time.sleep(0.8)
keyevent(123)   # MOVE_END
time.sleep(0.2)
for _ in range(500):  # clear generously
    keyevent(67)  # BACKSPACE
time.sleep(0.5)

print("Step 2: Type line 1...")
type_text("One Piece vocab quiz #2 - Can you get 5/5?")
keyevent(66)  # ENTER

print("Step 3: Type line 2...")
type_text("yume . kaigun . kenshi . takara . akuma no mi")
keyevent(66)  # ENTER

print("Step 4: Type line 3...")
type_text("Learn Japanese through anime - kitsubeat.com")
keyevent(66)  # ENTER

print("Step 5: Type hashtags one by one with autocomplete dismiss...")
hashtags = [
    "#japanese",
    "#learnJapanese",
    "#japaneseVocab",
    "#anime",
    "#onePiece",
    "#japaneseQuiz",
    "#studyJapanese",
    "#animequiz",
    "#shorts",
]
for i, tag in enumerate(hashtags):
    print(f"  {tag}")
    type_hashtag(tag)
    if i < len(hashtags) - 1:
        type_text(" ")  # space between hashtags
    time.sleep(0.1)

print("\nDone! Verifying...")
time.sleep(0.5)
