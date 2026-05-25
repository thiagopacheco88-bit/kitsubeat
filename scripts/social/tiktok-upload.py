#!/usr/bin/env python3
"""
TikTok upload via browser-harness.
Called from post-social.ts with globals pre-set via a wrapper script.

Key learnings:
- upload_file + React __reactProps.onChange = working file upload
- Sound: click the ITEM ROW (not the + button) to apply to timeline
- Caption: DraftJS ignores execCommand — use CDP Input.insertText after focusing
- Wrap all JS in IIFEs to avoid cross-call variable conflicts
"""
import time, json, os

video_path = globals().get("TIKTOK_VIDEO_PATH", "")
caption    = globals().get("TIKTOK_CAPTION", "")
sound      = globals().get("TIKTOK_SOUND", "")

if not video_path or not os.path.exists(video_path):
    raise RuntimeError(f"Video file not found: {video_path!r}")

abs_path = os.path.abspath(video_path).replace("\\", "/")
print(f"🎵 TikTok: video = {abs_path}")

# ── 1. Navigate ───────────────────────────────────────────────────────────────
print("🎵 TikTok: navigating to upload...")
tabs = cdp("Target.getTargets", {})
has_tiktok = any("tiktok.com" in t.get("url","") for t in tabs.get("targetInfos",[]) if t.get("type")=="page")
if has_tiktok:
    goto_url("https://www.tiktok.com/tiktokstudio/upload")
else:
    new_tab("https://www.tiktok.com/tiktokstudio/upload")
wait_for_load()
time.sleep(3)
if "login" in page_info().get("url","").lower():
    raise RuntimeError("TikTok is not logged in.")
print("   Logged in ✓")

# ── 2. Upload video ───────────────────────────────────────────────────────────
print("🎵 TikTok: uploading video...")
js("(()=>{const i=document.querySelector('input[type=\"file\"]');if(i)i.style.cssText='opacity:1;display:block;position:fixed;top:0;left:0;width:1px;height:1px';})()")
upload_file('input[type="file"]', abs_path)
js("""(()=>{
  const inp=document.querySelector('input[type="file"]');
  const rk=inp&&Object.keys(inp).find(k=>k.startsWith('__reactProps'));
  if(rk&&inp[rk].onChange) inp[rk].onChange({target:inp,currentTarget:inp,type:'change',nativeEvent:new Event('change')});
})()""")
print(f"   File submitted")
time.sleep(3)

# ── 3. Wait for post editor ───────────────────────────────────────────────────
print("🎵 TikTok: waiting for post editor...")
for attempt in range(90):
    time.sleep(5)
    ready = js("(()=>{const h=!!document.querySelector('[data-contents=\"true\"]'),p=[...document.querySelectorAll('button')].some(b=>/^(post|publicar)$/i.test(b.innerText.trim())),u=document.body.innerText.includes('Select video to upload');return(h&&p&&!u)?'ready':'waiting';})()")
    if ready == 'ready':
        print(f"   Editor ready after ~{(attempt+1)*5}s ✓")
        break
    if attempt % 4 == 0:
        print(f"   Uploading... {(attempt+1)*5}s")
else:
    raise RuntimeError("TikTok upload timed out")
time.sleep(2)

# ── 4. Add sound via clip editor ──────────────────────────────────────────────
# Do sound BEFORE caption — clip editor may reset the description field
if sound:
    print(f"🎵 TikTok: adding sound '{sound}'...")

    # Open Sounds clip editor
    js("(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Sounds');if(b)b.click();})()")
    time.sleep(3)
    path = capture_screenshot()
    print(f"   Clip editor: {path}")

    # Search using React internal onChange
    js(f"""(()=>{{
      const inp=[...document.querySelectorAll('input')].find(i=>i.placeholder&&i.placeholder.toLowerCase().includes('search sounds'));
      if(!inp)return;
      inp.focus();
      const rk=Object.keys(inp).find(k=>k.startsWith('__reactProps'));
      if(rk&&inp[rk].onChange){{
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(inp,{json.dumps(sound)});
        inp[rk].onChange({{target:inp,currentTarget:inp,type:'change',nativeEvent:new Event('change')}});
      }}
    }})()""")
    time.sleep(4)
    path = capture_screenshot()
    print(f"   Results: {path}")

    # Click the sound ITEM ROW — NOT the + button.
    # Clicking + only saves to Favorites. Clicking the item applies it to the timeline.
    applied = js("""(()=>{
      const items=[...document.querySelectorAll('li,[class*="item"]')]
        .filter(el=>el.innerText.toLowerCase().includes('overtaken')&&el.offsetParent!==null);
      if(!items.length)return 'no items found';
      const item=items[0];
      // Click the cover/image area to apply (avoids the + button on the right)
      const cover=item.querySelector('img,[class*="cover"],[class*="thumb"],[class*="avatar"]');
      if(cover){cover.click();return 'clicked cover: '+item.innerText.slice(0,40);}
      // Dispatch click on left side of item (avoids + button on right)
      const r=item.getBoundingClientRect();
      item.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,clientX:r.left+30,clientY:r.top+r.height/2}));
      return 'clicked item left side: '+item.innerText.slice(0,40);
    })()""")
    print(f"   Sound applied: {applied}")
    time.sleep(3)

    path = capture_screenshot()
    print(f"   After apply: {path}")

    # Save clip edit
    js("(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Save');if(b)b.click();})()")
    print("   Saved clip editor")
    time.sleep(3)

# ── 5. Set caption via CDP keyboard input ─────────────────────────────────────
# DraftJS ignores execCommand — CDP Input.insertText simulates real typing
print("🎵 TikTok: setting caption...")
path = capture_screenshot()
print(f"   Post details: {path}")

# Click the description field at its viewport coordinates for native focus
field_pos = js("""(()=>{
  const f=document.querySelector('[data-contents="true"]');
  if(!f)return null;
  const r=f.getBoundingClientRect();
  return JSON.stringify({x:Math.round(r.left+20),y:Math.round(r.top+r.height/2)});
})()""")
print(f"   Caption field pos: {field_pos}")

import json as _json
if field_pos and field_pos != 'null':
    pos = _json.loads(field_pos)
    click_at_xy(pos['x'], pos['y'])
else:
    js("(()=>{const f=document.querySelector('[data-contents=\"true\"]');if(f){f.focus();f.click();}})()")
time.sleep(0.5)

# Select all and delete, then insert caption
js("(()=>{document.execCommand('selectAll');document.execCommand('delete');})()")
time.sleep(0.3)
js(f"(()=>{{document.execCommand('insertText',false,{json.dumps(caption)});}})()")
time.sleep(0.5)

# Verify
cap_check = js("(()=>{const f=document.querySelector('[data-contents=\"true\"]');return f?f.innerText.trim().slice(0,60):'not found';})()")
print(f"   Caption: {cap_check!r}")

# ── 6. Post ───────────────────────────────────────────────────────────────────
print("🎵 TikTok: posting...")
path = capture_screenshot()
print(f"   Pre-post: {path}")

posted = js("""(()=>{
  const btn=[...document.querySelectorAll('button')].find(b=>/^(post|publicar)$/i.test(b.innerText.trim()));
  if(btn){btn.click();return 'clicked Post';}
  return 'Post not found: '+JSON.stringify([...document.querySelectorAll('button')].map(b=>b.innerText.trim()).filter(t=>t).slice(0,10));
})()""")
print(f"   {posted}")
time.sleep(6)

path = capture_screenshot()
print(f"✅ Done: {path}")
