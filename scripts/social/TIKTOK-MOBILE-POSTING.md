# TikTok Mobile Posting — ADB Playbook

Device: RQCX702YHDX · Screen: 1080×2340 · Package: `com.zhiliaoapp.musically`

## ▶ Automated posting (preferred)

```bash
python scripts/post-to-tiktok.py <series-key> <part-number>

# Examples:
python scripts/post-to-tiktok.py one-piece 3
python scripts/post-to-tiktok.py naruto 1
```

The script does everything automatically. It pauses **once** for you to select the sound manually, then continues to Publicar. When adding a new series, run the first post, note which sound you selected, add `"tiktok_sound"` to that series in `videos/catalog.json`, and subsequent posts will show the hint automatically.

If Publicar doesn't auto-tap at the end, tap it manually then run:
```bash
python scripts/post-to-tiktok.py one-piece 3 --mark-only
```

---

## Manual step-by-step (reference / debugging)

## Pre-flight

```bash
# Push video to device
adb push "videos/<series>/renders/<clean>.mp4" /sdcard/Movies/kitsubeat-post.mp4

# Verify
adb shell "ls -la /sdcard/Movies/kitsubeat-post.mp4"
```

## Navigation Flow

### 1. Open TikTok on @kitsubeat account
```bash
adb shell am start -n com.zhiliaoapp.musically/com.ss.android.ugc.aweme.main.MainActivity
```
⚠️  **Always verify you're on @kitsubeat before starting** — check profile screen.

### 2. Tap + (Create)
```
tap(540, 2136)
```

### 3. Gallery → Movies folder
- Tap gallery thumbnail: `tap(95, 2126)` or bottom-left of camera screen
- Tap folder name **"Recentes"** at ~`(514, 151)` to open folder dropdown
- Tap **"Movies"** at ~`(365, 2072)` — always has exactly 1 item (our video)

### 4. Select video
Selection circle **Button** at `[271,595][339,663]` → center **(305, 629)**
```
tap(305, 629)
# Confirms: "Próximo (1)" appears at bottom
tap(798, 2098)   # Tap Próximo (1) → clip editor
```

### 5. Add Sound — Overtaken Epic Version

⚠️ **Do this step manually — ADB cannot reliably select sounds (FLAG_SECURE blocks UIAutomator on results).**

1. Tap **"Sons"** / **"Adicionar som"** at top of clip editor
2. In the sound panel, go to the **"Para ti"** tab
3. **Row 1** is `Overtaken - Epic Version (from "One Piece")` by Samuel Kim
4. Tap the **+** add button on that row (right side)
5. Confirm: UIAutomator dump shows `Overtaken - Epic Version (from "One Piece")` with `Recortar` button (scissors)
6. Tap the video area to close the sound panel

```bash
# Verify correct sound is applied:
adb shell uiautomator dump --compressed /sdcard/post.xml
adb shell cat /sdcard/post.xml | python3 -c "import sys,xml.etree.ElementTree as ET; [print(n.get('text')) for n in ET.fromstring(sys.stdin.read()).iter('node') if 'Overtaken' in n.get('text','')]"
```

Expected output: `Overtaken - Epic Version (from "One Piece")`
```

### 6. Go to posting screen
```
tap(795, 2143)   # "Seguinte" button
# Dismiss content reuse modal if it appears:
#   "OK" button at ~(540, 2053)
```

### 7. Type caption

**⚠️ ADB `#` limit: TikTok drops `#` after the 4th one per session.**

Keep it to **4 hashtags max** via ADB:
```python
def type_text(text):
    safe = text.replace("'", "'\"'\"'")
    subprocess.run(["adb", "shell", f"input text '{safe}'"], capture_output=True)

# Tap caption field (only when field is EMPTY — fresh posting screen)
tap(344, 449)
time.sleep(0.8)

type_text("One Piece vocab quiz #2 - Can you get 5/5?")
keyevent(66)   # ENTER
type_text("yume . kaigun . kenshi . takara . akuma no mi")
keyevent(66)
type_text("Learn Japanese through anime - kitsubeat.com")
keyevent(66)
type_text("#japanese #learnJapanese #japaneseVocab #anime")  # 4 max
```

**🚨 Never try to clear a dirty caption field — it's unreliable.**
If the field has old content, discard and restart the flow. Caption must be typed **once on an empty field**.

### 8. Post
```
tap(798, 2103)   # "Publicar" button at [551,2036][1046,2171]
```

---

## Known Quirks

| Issue | Cause | Fix |
|-------|-------|-----|
| ADB drops `#` after 4th hashtag | TikTok text field session limit | Max 4 hashtags, or use TikTok's native `# Hashtags` button for more |
| `#anime` breaks all subsequent `#` in same call | TikTok autocomplete chips it | Put `#anime` last in any `type_text` call |
| Screen black on screencap | TikTok FLAG_SECURE on video screens | Use UIAutomator dump instead of screencap |
| DPAD_UP navigates away from posting screen | TikTok intercepts D-pad in EditText | Don't use DPAD_UP — use FORWARD_DELETE from start |
| Caption persists between posting screen visits | TikTok maintains draft state | Start fresh: discard post and redo flow |
| Emoji/→/· drop via `input text` | ADB text injection doesn't support multi-byte unicode | Use ASCII substitutes: `-` for `→`, `.` for `·`, skip emoji |

## Caption Template

```
{Title} vocab quiz #{n} - Can you get 5/5?
{word1} . {word2} . {word3} . {word4} . {word5}
Learn Japanese through anime - kitsubeat.com
#japanese #learnJapanese #japaneseVocab #anime
```

## Sound Map (per series)

| Series | TikTok Sound |
|--------|-------------|
| One Piece | Overtaken – Epic Version (Samuel Kim) |

> Add more series sounds here as you post them.
