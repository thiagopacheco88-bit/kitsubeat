"""
instagram-web-post.py — Post a Reel to Instagram via instagram.com (no phone, no API)

Usage (via browser-harness):
  browser-harness < scripts/instagram-web-post.py

Or with custom overrides at the top of this file:
  VIDEO_PATH  — absolute path to the mp4 (Windows path, forward slashes OK)
  CAPTION     — post caption
  MUSIC_TRACK — track name to search in Instagram's music library

Requirements:
  - Chrome is running and browser-harness daemon is connected
  - You are logged into instagram.com in Chrome
"""

import json
import time
import os
import sys

# ─── Config ───────────────────────────────────────────────────────────────────

VIDEO_PATH  = r"C:\Users\thiag\velora-projects\kitsubeat\videos\naruto-quiz\renders\naruto-quiz_2026-05-24_16-58-28_music.mp4"
CAPTION     = """🎌 Naruto Vocabulary Quiz

Can you score 5/5? Drop your answers below 👇

Today's words:
• 影 (kage) — Shadow
• 火影 (hokage) — Fire Shadow
• 術 (jutsu) — Technique / Skill
• 村 (mura) — Village
• 里 (sato) — Hometown Village

Learn Japanese through anime you already love → kitsubeat.com 🦊

#Naruto #LearnJapanese #JapaneseWithAnime #Nihongo #日本語 #AnimeJapanese #JLPT #KitsuBeat #AnimeQuiz #JapaneseVocabulary"""

MUSIC_TRACK = "Silhouette KANA-BOON"

# ─── Helpers ──────────────────────────────────────────────────────────────────

def screenshot(label=""):
    path = capture_screenshot()
    print(f"📸 {label or 'screenshot'}: {path}")
    return path

def wait(secs=1.5):
    time.sleep(secs)

def click_xy(x, y, label=""):
    click_at_xy(x, y)
    if label:
        print(f"  → clicked {label} at ({x}, {y})")
    wait(1.0)

def find_and_click(selector, label=""):
    """Click element by CSS selector via JS."""
    result = js(f"""
        const el = document.querySelector({json.dumps(selector)});
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {{ x: r.left + r.width/2, y: r.top + r.height/2, found: true }};
    """)
    if result and result.get("found"):
        click_at_xy(int(result["x"]), int(result["y"]))
        if label:
            print(f"  → clicked {label}")
        wait(1.0)
        return True
    return False

def wait_for_selector(selector, timeout=20, label=""):
    """Poll until selector appears, return True/False."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        found = js(f"return !!document.querySelector({json.dumps(selector)})")
        if found:
            if label:
                print(f"  ✓ found: {label}")
            return True
        time.sleep(0.8)
    print(f"  ✗ timeout waiting for: {label or selector}")
    return False

# ─── Step 0: Open instagram.com ───────────────────────────────────────────────

print("\n🦊 KitsuBeat Instagram Web Post")
print("=" * 50)
print(f"  Video : {VIDEO_PATH}")
print(f"  Music : {MUSIC_TRACK}")
print(f"  Caption: {CAPTION[:60]}...")
print("")

# Check if instagram.com is already open, otherwise open new tab
page = page_info()
if "instagram.com" not in page.get("url", ""):
    print("📂 Opening instagram.com...")
    new_tab("https://www.instagram.com/")
    wait_for_load()
    wait(2)
else:
    print("✓ Already on instagram.com")

screenshot("initial state")

# ─── Step 1: Click Create / New Post ─────────────────────────────────────────

print("\n[Step 1] Opening Create dialog...")

# Try the "Create" nav item (SVG icon in left sidebar, or text)
# On web it's either an SVG button or a span with "Create"
created = js("""
    // Try to find 'Create' or the '+' button in the nav
    const candidates = Array.from(document.querySelectorAll('a, button, div[role="button"]'));
    const createBtn = candidates.find(el => {
        const text = el.textContent || el.getAttribute('aria-label') || '';
        return text.trim() === 'Create' || text.trim() === 'New post';
    });
    if (createBtn) {
        const r = createBtn.getBoundingClientRect();
        return { x: r.left + r.width/2, y: r.top + r.height/2, found: true, text: createBtn.textContent.trim() };
    }
    return null;
""")

if created and created.get("found"):
    print(f"  Found '{created.get('text')}' button")
    click_at_xy(int(created["x"]), int(created["y"]))
    wait(1.5)
else:
    screenshot("create-button-not-found")
    print("  ⚠ Could not find Create button via JS — take a screenshot to inspect")
    print("  Trying keyboard shortcut...")
    # Instagram web shortcut: no standard shortcut, but we can try clicking known coords
    # Take a screenshot for manual inspection
    screenshot("need-manual-create-click")
    print("\n⚠ MANUAL STEP NEEDED: Please click the 'Create' (+) button in the Instagram nav")
    print("  Then type 'continue' and press ENTER to proceed...")
    line = sys.stdin.readline().strip()
    if line.lower() != "continue":
        print("Aborted.")
        raise SystemExit(0)

screenshot("after-create-click")

# ─── Step 2: Wait for media selector, choose Reel type ───────────────────────

print("\n[Step 2] Waiting for media type selector...")
wait(2)
screenshot("create-dialog")

# Click "Reel" option if shown (vs Post / Story)
reel_clicked = js("""
    const btns = Array.from(document.querySelectorAll('button, div[role="button"], span'));
    const reelBtn = btns.find(el => el.textContent.trim() === 'Reel' || el.textContent.trim() === 'Reels');
    if (reelBtn) {
        const r = reelBtn.getBoundingClientRect();
        if (r.width > 0) {
            return { x: r.left + r.width/2, y: r.top + r.height/2, found: true };
        }
    }
    return null;
""")

if reel_clicked and reel_clicked.get("found"):
    print("  → Found Reel option, clicking...")
    click_at_xy(int(reel_clicked["x"]), int(reel_clicked["y"]))
    wait(1.5)
    screenshot("after-reel-select")
else:
    print("  ℹ No Reel type selector found (might open upload directly)")

# ─── Step 3: Upload video ─────────────────────────────────────────────────────

print("\n[Step 3] Uploading video...")
wait(1)

# Find the hidden file input and set the file
video_path_normalized = VIDEO_PATH.replace("\\", "\\\\")

# Method A: set file directly on the input element
file_set = js(f"""
    const input = document.querySelector('input[type="file"]');
    if (!input) return {{ found: false }};
    return {{ found: true, accept: input.accept }};
""")

if file_set and file_set.get("found"):
    print(f"  ✓ Found file input (accept: {file_set.get('accept', 'any')})")
    # Use CDP setFileInputFiles
    node_id = js("""
        const input = document.querySelector('input[type="file"]');
        return input ? true : false;
    """)
    # Use the CDP command to set files
    result = cdp("DOM.getDocument", {})
    # Find input via CDP
    search = cdp("DOM.querySelectorAll", {
        "nodeId": result["root"]["nodeId"],
        "selector": 'input[type="file"]'
    })
    if search.get("nodeIds"):
        node_id = search["nodeIds"][0]
        cdp("DOM.setFileInputFiles", {
            "nodeId": node_id,
            "files": [VIDEO_PATH]
        })
        print(f"  ✓ File set via CDP: {os.path.basename(VIDEO_PATH)}")
        wait(3)
        screenshot("after-file-set")
    else:
        print("  ✗ CDP could not find file input node")
else:
    print("  ⚠ No file input found — looking for upload area to click...")
    # Try clicking the upload area / drag-drop zone
    upload_area = js("""
        // Look for the upload area or drag-drop zone
        const area = document.querySelector('[role="presentation"], .drag-drop, [data-testid="upload"]');
        if (area) {
            const r = area.getBoundingClientRect();
            return { x: r.left + r.width/2, y: r.top + r.height/2, found: true };
        }
        return null;
    """)
    if upload_area and upload_area.get("found"):
        click_at_xy(int(upload_area["x"]), int(upload_area["y"]))
        wait(1)
    screenshot("upload-area-state")
    print("\n⚠ MANUAL STEP: Please select the video file manually in the file dialog")
    print(f"  File to select: {VIDEO_PATH}")
    print("  Then type 'continue' and press ENTER...")
    sys.stdin.readline()

# Wait for video to process/load in editor
print("  ⏳ Waiting for video to load in editor (up to 30s)...")
for i in range(15):
    time.sleep(2)
    # Check if we're past the upload screen
    in_editor = js("""
        // Look for editor controls (Next button, crop/audio controls)
        const nextBtn = Array.from(document.querySelectorAll('button')).find(
            b => b.textContent.trim() === 'Next'
        );
        return !!nextBtn;
    """)
    if in_editor:
        print("  ✓ Video loaded in editor")
        break
    if i % 3 == 2:
        screenshot(f"waiting-editor-{i}")

screenshot("video-in-editor")

# ─── Step 4: Navigate to audio/music step ─────────────────────────────────────

print("\n[Step 4] Looking for audio / music option...")
wait(1)

# On Instagram web Reels editor, "Add audio" appears as a button or tab
music_found = js("""
    const btns = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"]'));
    const audioBtn = btns.find(el => {
        const t = (el.textContent || el.getAttribute('aria-label') || '').toLowerCase();
        return t.includes('audio') || t.includes('music') || t.includes('add sound');
    });
    if (audioBtn) {
        const r = audioBtn.getBoundingClientRect();
        if (r.width > 0) return { x: r.left + r.width/2, y: r.top + r.height/2, found: true, text: audioBtn.textContent.trim() };
    }
    return null;
""")

if music_found and music_found.get("found"):
    print(f"  → Found '{music_found.get('text')}' button, clicking...")
    click_at_xy(int(music_found["x"]), int(music_found["y"]))
    wait(2)
    screenshot("music-panel-open")

    # Search for the track
    print(f"\n[Step 4b] Searching for music: {MUSIC_TRACK}")
    search_input = js("""
        const inp = document.querySelector('input[placeholder*="Search"], input[type="search"], input[aria-label*="Search"]');
        if (inp) {
            const r = inp.getBoundingClientRect();
            return { x: r.left + r.width/2, y: r.top + r.height/2, found: true };
        }
        return null;
    """)
    if search_input and search_input.get("found"):
        click_at_xy(int(search_input["x"]), int(search_input["y"]))
        wait(0.5)
        # Type the search query
        for char in MUSIC_TRACK:
            cdp("Input.dispatchKeyEvent", {"type": "char", "text": char})
        wait(2)
        screenshot("music-search-results")
        print(f"  ✓ Typed search query: {MUSIC_TRACK}")
        print("\n⚠ QUICK CHECK: Screenshot above shows results. If correct track is visible,")
        print("  type 'continue'. If wrong, type 'skip' to post without music.")
        answer = sys.stdin.readline().strip().lower()
        if answer == "skip":
            print("  Skipping music — posting without audio overlay")
        else:
            # Try to click the first result
            first_result = js("""
                // Click the first track result (usually a list item)
                const items = document.querySelectorAll('li button, [role="listitem"] button, [role="option"]');
                if (items.length > 0) {
                    const r = items[0].getBoundingClientRect();
                    return { x: r.left + r.width/2, y: r.top + r.height/2, found: true };
                }
                return null;
            """)
            if first_result and first_result.get("found"):
                click_at_xy(int(first_result["x"]), int(first_result["y"]))
                wait(1.5)
                screenshot("music-selected")
                print("  ✓ Clicked first track result")
            else:
                screenshot("music-results-no-click")
                print("  ⚠ Could not auto-click result — please click the track manually")
                print("  Type 'continue' when done...")
                sys.stdin.readline()
    else:
        screenshot("no-music-search-input")
        print("  ⚠ Could not find music search input")
        print("  Please search for and select the music manually, then type 'continue'...")
        sys.stdin.readline()
else:
    screenshot("no-audio-button")
    print("  ⚠ No audio button found in editor")
    print(f"  Please add music manually: search '{MUSIC_TRACK}'")
    print("  Type 'continue' when done, or 'skip' to post without music...")
    answer = sys.stdin.readline().strip().lower()

# ─── Step 5: Click "Next" to go to caption screen ────────────────────────────

print("\n[Step 5] Moving to caption screen...")
wait(1)

for attempt in range(3):
    next_clicked = js("""
        const btns = Array.from(document.querySelectorAll('button'));
        const nextBtn = btns.find(b => {
            const t = b.textContent.trim();
            return t === 'Next' || t === 'Share' || t === 'Continue';
        });
        if (nextBtn) {
            const r = nextBtn.getBoundingClientRect();
            if (r.width > 0) return { x: r.left + r.width/2, y: r.top + r.height/2, found: true, text: nextBtn.textContent.trim() };
        }
        return null;
    """)
    if next_clicked and next_clicked.get("found"):
        btn_text = next_clicked.get("text", "Next")
        print(f"  → Clicking '{btn_text}'...")
        click_at_xy(int(next_clicked["x"]), int(next_clicked["y"]))
        wait(2)
        screenshot(f"after-{btn_text.lower()}-{attempt}")
        if btn_text in ("Share", "Post"):
            print(f"\n🎉 Post submitted via '{btn_text}'!")
            break
        break
    wait(1)

# ─── Step 6: Add caption ──────────────────────────────────────────────────────

print("\n[Step 6] Adding caption...")
wait(1)
screenshot("caption-screen")

caption_input = js("""
    // Caption field is usually a textarea or contenteditable div
    const area = document.querySelector(
        'textarea[placeholder*="caption"], textarea[aria-label*="caption"], ' +
        'div[contenteditable][aria-label*="caption"], div[contenteditable][data-lexical-editor]'
    );
    if (area) {
        const r = area.getBoundingClientRect();
        return { x: r.left + r.width/2, y: r.top + r.height/2, found: true, tag: area.tagName };
    }
    return null;
""")

if caption_input and caption_input.get("found"):
    print(f"  → Found caption field ({caption_input.get('tag')})")
    click_at_xy(int(caption_input["x"]), int(caption_input["y"]))
    wait(0.5)
    # Type caption character by character (supports unicode)
    for char in CAPTION:
        cdp("Input.dispatchKeyEvent", {"type": "char", "text": char})
    wait(1)
    screenshot("caption-typed")
    print("  ✓ Caption typed")
else:
    screenshot("no-caption-field")
    print("  ⚠ Could not find caption field — please paste caption manually:")
    print("-" * 60)
    print(CAPTION)
    print("-" * 60)
    print("  Type 'continue' when done...")
    sys.stdin.readline()

# ─── Step 7: Submit / Share ───────────────────────────────────────────────────

print("\n[Step 7] Submitting post...")
wait(1)

share_btn = js("""
    const btns = Array.from(document.querySelectorAll('button'));
    const shareBtn = btns.find(b => {
        const t = b.textContent.trim();
        return t === 'Share' || t === 'Post' || t === 'Done';
    });
    if (shareBtn) {
        const r = shareBtn.getBoundingClientRect();
        if (r.width > 0) return { x: r.left + r.width/2, y: r.top + r.height/2, found: true, text: shareBtn.textContent.trim() };
    }
    return null;
""")

if share_btn and share_btn.get("found"):
    btn_text = share_btn.get("text")
    print(f"  → Clicking '{btn_text}'...")
    click_at_xy(int(share_btn["x"]), int(share_btn["y"]))
    wait(3)
    screenshot("post-submitted")
    print(f"\n✅ Post submitted via '{btn_text}'!")
else:
    screenshot("no-share-button")
    print("  ⚠ Could not find Share/Post button — please click it manually")
    print("  Type 'done' when posted, or 'skip' to exit without updating catalog...")
    answer = sys.stdin.readline().strip().lower()
    if answer == "skip":
        raise SystemExit(0)

print("\n🎉 Done! Naruto Part 1 posted to Instagram.")
print("   Run catalog update manually if needed, or re-run post-reel.mjs with --mark-only")
