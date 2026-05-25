#!/usr/bin/env python3
"""Dump TikTok create/gallery screen UI for debugging."""
import subprocess, time, xml.etree.ElementTree as ET, sys

def adb(*args):
    r = subprocess.run(["adb"] + list(args), capture_output=True)
    return r.stdout.decode("utf-8", errors="replace").strip()

def shot(name):
    data = subprocess.run(["adb", "exec-out", "screencap", "-p"], capture_output=True).stdout
    p = f"scripts/mobile-shots/{name}.png"
    open(p, "wb").write(data)
    print(f"  screenshot: {p}")

def dump_ui(label="ui"):
    adb("shell", "uiautomator", "dump", "--compressed", "/sdcard/ui.xml")
    xml = adb("shell", "cat", "/sdcard/ui.xml")
    try:
        root = ET.fromstring(xml)
    except Exception as e:
        print(f"XML parse error: {e}")
        return
    print(f"\n--- UI [{label}] ---")
    for node in root.iter("node"):
        t = node.get("text", "").strip()
        d = node.get("content-desc", "").strip()
        rid = node.get("resource-id", "").split("/")[-1]
        b = node.get("bounds", "")
        if t or d:
            print(f"  [{rid:35}] text={repr(t[:45]):48} desc={repr(d[:40])} {b}")

# Step 1: launch TikTok via am start
print("Launching TikTok...")
adb("shell", "am", "force-stop", "com.zhiliaoapp.musically")
time.sleep(1)
adb("shell", "am", "start", "-n", "com.zhiliaoapp.musically/com.ss.android.ugc.aweme.main.MainActivity")
time.sleep(6)
shot("A-tiktok-home")
dump_ui("tiktok-home")

# Step 2: tap the + (create) button — bottom center of TikTok nav
print("\nTapping + create...")
adb("shell", "input", "tap", "540", "2150")
time.sleep(3)
shot("B-after-create")
dump_ui("after-create")

# Step 3: tap Upload
print("\nTapping Upload...")
adb("shell", "input", "tap", "810", "2150")   # right side of bottom bar — may be Upload
time.sleep(3)
shot("C-after-upload")
dump_ui("gallery")
