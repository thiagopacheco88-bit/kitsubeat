#!/usr/bin/env python3
"""Countdown animation — KitsuBeat icon + 3 orbiting dots + 3-2-1 countdown."""
import base64, os

project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

with open(os.path.join(project_dir, 'public', 'apple-touch-icon.png'), 'rb') as f:
    icon_b64 = base64.b64encode(f.read()).decode()
icon_uri = "data:image/png;base64," + icon_b64

HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>KitsuBeat Countdown</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: #0E0E0E;
  width: 1080px; height: 1920px;
  overflow: hidden;
  font-family: Inter, system-ui, sans-serif;
  display: flex; align-items: center; justify-content: center;
}

/* Preview wrapper — scaled down for screen viewing */
.preview {
  transform: scale(0.32) translateZ(0);
  transform-origin: center center;
  width: 1080px; height: 1920px;
  position: relative;
}

/* Dark background — same as app */
.bg { position: absolute; inset: 0; background: #0E0E0E; }

/* Subtle grid — same as app card pattern */
.grid-tex {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 60px 60px;
}

/* Radial glow from center — red, same as --shadow-hero-glow */
.center-glow {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 900px; height: 900px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(220,38,38,0.10) 0%, transparent 65%);
  animation: pulse-glow 3s ease-in-out infinite;
}
@keyframes pulse-glow {
  0%, 100% { opacity: 0.6; transform: translate(-50%,-50%) scale(1); }
  50%       { opacity: 1;   transform: translate(-50%,-50%) scale(1.12); }
}

/* Orbit ring — visible guide for dots */
.orbit-ring {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 560px; height: 560px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.04);
}

/* KitsuBeat icon — center */
.icon-wrap {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 180px; height: 180px;
  border-radius: 44px;
  overflow: hidden;
  box-shadow:
    0 0 0 2px rgba(220,38,38,0.25),
    0 0 60px rgba(220,38,38,0.18),
    0 30px 80px rgba(0,0,0,0.6);
  animation: icon-breathe 3s ease-in-out infinite;
}
@keyframes icon-breathe {
  0%, 100% { transform: translate(-50%,-50%) scale(1);    box-shadow: 0 0 0 2px rgba(220,38,38,0.25), 0 0 60px rgba(220,38,38,0.18), 0 30px 80px rgba(0,0,0,0.6); }
  50%       { transform: translate(-50%,-50%) scale(1.04); box-shadow: 0 0 0 3px rgba(220,38,38,0.40), 0 0 90px rgba(220,38,38,0.28), 0 30px 80px rgba(0,0,0,0.6); }
}
.icon-wrap img { width: 100%; height: 100%; object-fit: cover; }

/* Orbiting dots — 3 dots, 120° apart, rotating */
.orbit {
  position: absolute;
  top: 50%; left: 50%;
  width: 0; height: 0;
  animation: spin 3s linear infinite;
}
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.orbit-2 { animation-delay: -1s; }
.orbit-3 { animation-delay: -2s; }

.dot {
  position: absolute;
  width: 32px; height: 32px;
  border-radius: 50%;
  background: #dc2626;
  box-shadow: 0 0 20px rgba(220,38,38,0.6), 0 0 40px rgba(220,38,38,0.3);
  /* Place on orbit radius */
  transform: translate(-50%, -50%) translateX(280px);
  animation: dot-pulse 3s ease-in-out infinite;
}
@keyframes dot-pulse {
  0%, 100% { transform: translate(-50%,-50%) translateX(280px) scale(1);    opacity: 0.9; }
  50%       { transform: translate(-50%,-50%) translateX(280px) scale(1.25); opacity: 1; }
}

/* Dot 2 — slightly smaller, different color intensity */
.orbit-2 .dot {
  width: 22px; height: 22px;
  background: rgba(220,38,38,0.6);
  box-shadow: 0 0 14px rgba(220,38,38,0.5);
  animation-delay: -0.5s;
}

/* Dot 3 */
.orbit-3 .dot {
  width: 28px; height: 28px;
  background: rgba(220,38,38,0.8);
  box-shadow: 0 0 18px rgba(220,38,38,0.55);
  animation-delay: -1s;
}

/* Dot trails */
.dot::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(220,38,38,0.3);
  animation: trail 3s ease-in-out infinite;
  transform: scale(1.8);
  filter: blur(6px);
}
@keyframes trail {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 0.7; }
}

/* Countdown number */
.countdown {
  position: absolute;
  top: 50%; left: 50%;
  font-family: Inter, system-ui, sans-serif;
  font-size: 420px;
  font-weight: 800;
  color: rgba(245,245,244,0.035);
  letter-spacing: -0.06em;
  transform: translate(-50%, -50%);
  line-height: 1;
  pointer-events: none;
  animation: count-cycle 3s steps(1, end) infinite;
}
@keyframes count-cycle {
  0%   { content: '3'; }
  33%  { content: '2'; }
  66%  { content: '1'; }
}
/* Visible countdown — smaller, positioned below icon */
.count-display {
  position: absolute;
  top: calc(50% + 160px);
  left: 50%;
  transform: translateX(-50%);
  font-size: 72px;
  font-weight: 800;
  color: rgba(245,245,244,0.35);
  letter-spacing: -0.04em;
  animation: count-step 3s steps(1, end) infinite;
  font-variant-numeric: tabular-nums;
}
/* We animate opacity on children for each number */
.count-inner {
  display: flex; gap: 24px; align-items: center;
}
.cn {
  width: 72px; height: 72px;
  border-radius: 20px;
  border: 2px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.03);
  display: flex; align-items: center; justify-content: center;
  font-size: 42px; font-weight: 800;
  color: rgba(245,245,244,0.25);
  font-variant-numeric: tabular-nums;
}
.cn.active {
  border-color: rgba(220,38,38,0.4);
  background: rgba(220,38,38,0.08);
  color: #ef4444;
  box-shadow: 0 0 24px rgba(220,38,38,0.18);
}

/* Animating which digit is "active" */
.cn-3 { animation: step3 3s steps(1, end) infinite; }
.cn-2 { animation: step2 3s steps(1, end) infinite; }
.cn-1 { animation: step1 3s steps(1, end) infinite; }

@keyframes step3 {
  0%        { border-color: rgba(220,38,38,0.4); background: rgba(220,38,38,0.08); color: #ef4444; box-shadow: 0 0 24px rgba(220,38,38,0.18); }
  33.33%    { border-color: rgba(255,255,255,0.06); background: rgba(255,255,255,0.03); color: rgba(245,245,244,0.25); box-shadow: none; }
  100%      { border-color: rgba(255,255,255,0.06); background: rgba(255,255,255,0.03); color: rgba(245,245,244,0.25); box-shadow: none; }
}
@keyframes step2 {
  0%        { border-color: rgba(255,255,255,0.06); background: rgba(255,255,255,0.03); color: rgba(245,245,244,0.25); box-shadow: none; }
  33.33%    { border-color: rgba(220,38,38,0.4); background: rgba(220,38,38,0.08); color: #ef4444; box-shadow: 0 0 24px rgba(220,38,38,0.18); }
  66.66%    { border-color: rgba(255,255,255,0.06); background: rgba(255,255,255,0.03); color: rgba(245,245,244,0.25); box-shadow: none; }
  100%      { border-color: rgba(255,255,255,0.06); background: rgba(255,255,255,0.03); color: rgba(245,245,244,0.25); box-shadow: none; }
}
@keyframes step1 {
  0%        { border-color: rgba(255,255,255,0.06); background: rgba(255,255,255,0.03); color: rgba(245,245,244,0.25); box-shadow: none; }
  66.66%    { border-color: rgba(255,255,255,0.06); background: rgba(255,255,255,0.03); color: rgba(245,245,244,0.25); box-shadow: none; }
  66.67%    { border-color: rgba(220,38,38,0.4); background: rgba(220,38,38,0.08); color: #ef4444; box-shadow: 0 0 24px rgba(220,38,38,0.18); }
  100%      { border-color: rgba(220,38,38,0.4); background: rgba(220,38,38,0.08); color: #ef4444; box-shadow: 0 0 24px rgba(220,38,38,0.18); }
}

/* "Think fast" label above the icon */
.think-label {
  position: absolute;
  top: calc(50% - 200px);
  left: 50%;
  transform: translateX(-50%);
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(245,245,244,0.2);
  white-space: nowrap;
  animation: label-pulse 3s ease-in-out infinite;
}
@keyframes label-pulse {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1; }
}

/* "Choose your answer" below digit row */
.choose-label {
  position: absolute;
  top: calc(50% + 290px);
  left: 50%;
  transform: translateX(-50%);
  font-size: 22px;
  font-weight: 500;
  letter-spacing: 0.1em;
  color: rgba(245,245,244,0.15);
  white-space: nowrap;
}

/* Preview label */
.preview-note {
  position: fixed;
  top: 12px; left: 50%; transform: translateX(-50%);
  background: rgba(245,245,244,0.08);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 999px;
  padding: 6px 16px;
  font-size: 11px;
  color: rgba(245,245,244,0.4);
  letter-spacing: 0.08em;
  z-index: 100;
  font-family: Inter, sans-serif;
}
</style>
</head>
<body>

<div class="preview-note">Preview scaled to 32% — actual render: 1080×1920</div>

<div style="display:flex;align-items:center;justify-content:center;width:100vw;height:100vh;background:#060606">
<div class="preview">
  <div class="bg"></div>
  <div class="grid-tex"></div>
  <div class="center-glow"></div>
  <div class="orbit-ring"></div>

  <!-- 3 orbiting dots at 120° offsets -->
  <div class="orbit">
    <div class="dot"></div>
  </div>
  <div class="orbit orbit-2" style="animation-delay:-1s">
    <div class="dot"></div>
  </div>
  <div class="orbit orbit-3" style="animation-delay:-2s">
    <div class="dot"></div>
  </div>

  <!-- Centre icon -->
  <div class="icon-wrap">
    <img src="ICON_URI" alt="KitsuBeat">
  </div>

  <!-- Think fast label -->
  <div class="think-label">Choose your answer</div>

  <!-- 3 · 2 · 1 digit tiles below -->
  <div style="position:absolute;top:calc(50% + 155px);left:50%;transform:translateX(-50%)">
    <div class="count-inner">
      <div class="cn cn-3">3</div>
      <div class="cn cn-2">2</div>
      <div class="cn cn-1">1</div>
    </div>
  </div>

</div>
</div>

</body>
</html>"""

HTML = HTML.replace("ICON_URI", icon_uri)

out = os.path.join(project_dir, 'public', 'quiz-countdown.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(HTML)
print(f"Written: {out} ({len(HTML):,} bytes)")
