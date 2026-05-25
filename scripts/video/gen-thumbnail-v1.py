#!/usr/bin/env python3
"""Quiz thumbnail v1 — logo + Quiz on [Anime] + Part X + anime logo area."""
import base64, os

project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

with open(os.path.join(project_dir, 'public', 'apple-touch-icon.png'), 'rb') as f:
    icon_uri = "data:image/png;base64," + base64.b64encode(f.read()).decode()
with open(os.path.join(project_dir, 'public', 'logo.png'), 'rb') as f:
    logo_uri = "data:image/png;base64," + base64.b64encode(f.read()).decode()

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>KitsuBeat Quiz Thumbnail</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+JP:wght@400;700;900&display=swap" rel="stylesheet">
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: 100%; min-height: 100vh;
  background: #060606;
  font-family: Inter, system-ui, sans-serif;
  color: #F5F5F4;
  display: flex; flex-direction: column;
  align-items: center; padding: 48px 24px 72px;
}
.pg-lbl { font-size: 10px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(245,245,244,0.3); margin-bottom: 5px; }
.pg-sub  { font-size: 11px; color: rgba(245,245,244,0.18); margin-bottom: 52px; }
.row { display: flex; gap: 24px; overflow-x: auto; width: 100%; padding-bottom: 16px; }
.col { display: flex; flex-direction: column; align-items: center; gap: 12px; flex-shrink: 0; }
.col-lbl { font-size: 9px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(245,245,244,0.2); }

/* 9:16 poster 290x515 */
.p {
  width: 290px; height: 515px; border-radius: 18px; overflow: hidden; position: relative;
  box-shadow: 0 24px 60px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.05);
}

/* ── shared ── */
.art-ph {
  display: flex; align-items: center; justify-content: center;
  font-size: 72px; color: rgba(245,245,244,0.04);
}
.anime-logo-ph {
  border: 1.5px dashed rgba(245,245,244,0.12); border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.anime-logo-ph span {
  font-size: 8px; letter-spacing: 0.18em; text-transform: uppercase;
  color: rgba(245,245,244,0.2); font-weight: 600;
}
.kb-icon { border-radius: 6px; overflow: hidden; flex-shrink: 0; }
.kb-icon img { width: 100%; height: 100%; object-fit: cover; display: block; }
.part-pill {
  background: #dc2626; color: white;
  font-size: 9px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
  padding: 4px 12px; border-radius: 999px;
  box-shadow: 0 4px 14px rgba(220,38,38,0.35);
}
.quiz-on {
  font-size: 9px; font-weight: 700; letter-spacing: 0.18em;
  text-transform: uppercase; color: rgba(245,245,244,0.32);
}
.anime-name {
  font-size: 28px; font-weight: 900; color: #F5F5F4;
  line-height: 1.05; letter-spacing: -0.02em;
  font-family: "Noto Sans JP", Inter, sans-serif;
}


/* ═════ A — DARK OVERLAY ═════ */
.pa { background: #0c0c12; }
.pa .art { position: absolute; inset: 0; background: linear-gradient(145deg,#18131e,#1a1520 50%,#130f1a); }
.pa .fade {
  position: absolute; bottom: 0; left: 0; right: 0; height: 75%;
  background: linear-gradient(0deg, rgba(12,12,18,1) 0%, rgba(12,12,18,0.88) 38%, rgba(12,12,18,0.3) 68%, transparent 100%);
}
.pa .logo-zone {
  position: absolute; top: 60px; left: 50%; transform: translateX(-50%);
  width: 170px; height: 64px;
}
.pa .content {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 0 22px 28px; z-index: 10;
}
.pa .brand-row {
  display: flex; align-items: center; gap: 7px; margin-bottom: 20px;
}
.pa .brand-logo { height: 14px; width: auto; opacity: 0.8; }
.pa .sep-row {
  display: flex; align-items: center; gap: 10px; margin-top: 12px;
}
.pa .sep-line { flex: 1; height: 1px; background: rgba(255,255,255,0.06); }


/* ═════ B — SPLIT CARD ═════ */
.pb { background: #0E0E0E; }
.pb .art { position: absolute; top: 0; left: 0; right: 0; height: 52%; background: linear-gradient(145deg,#18131e,#1a1520 50%,#130f1a); overflow: hidden; }
.pb .art-border { position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: #dc2626; }
.pb .logo-zone { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-70%); width: 160px; height: 56px; }
.pb .panel { position: absolute; top: 52%; left: 0; right: 0; bottom: 0; background: #0E0E0E; padding: 16px 20px 22px; display: flex; flex-direction: column; justify-content: space-between; }
.pb .top-row { display: flex; align-items: center; justify-content: space-between; }
.pb .brand { display: flex; align-items: center; gap: 6px; }
.pb .brand-logo { height: 12px; width: auto; opacity: 0.7; }
.pb .part-tag { background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.28); border-radius: 999px; padding: 3px 10px; font-size: 9px; font-weight: 800; color: #dc2626; letter-spacing: 0.1em; text-transform: uppercase; }
.pb .foot { display: flex; align-items: center; gap: 7px; }
.pb .dot { width: 4px; height: 4px; border-radius: 50%; background: #dc2626; flex-shrink: 0; }
.pb .tagline { font-size: 10px; color: rgba(245,245,244,0.28); }


/* ═════ C — MINIMAL ═════ */
.pc { background: #0E0E0E; }
.pc .bar { position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: #dc2626; }
.pc .top { position: absolute; top: 0; left: 0; right: 0; padding: 18px 20px; display: flex; align-items: center; gap: 7px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.pc .top-logo { height: 13px; width: auto; opacity: 0.75; }
.pc .body { position: absolute; top: 0; bottom: 0; left: 0; right: 0; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; padding: 0 22px; }
.pc .ghost-num { font-size: 110px; font-weight: 900; color: rgba(245,245,244,0.03); letter-spacing: -0.06em; line-height: 1; margin-bottom: -12px; margin-left: -3px; }
.pc .logo-zone { width: 140px; height: 46px; margin-bottom: 20px; }
.pc .sep { width: 100%; height: 1px; background: rgba(255,255,255,0.06); margin-bottom: 16px; }


/* ═════ D — BOLD FRAME ═════ */
.pd { background: #0c0c12; }
.pd .art { position: absolute; inset: 0; background: linear-gradient(145deg,#18131e,#1e1525 50%,#130f1a); }
.pd .topbar {
  position: absolute; top: 0; left: 0; right: 0;
  padding: 16px 14px;
  display: flex; align-items: center; justify-content: space-between;
  z-index: 10;
  background: linear-gradient(180deg, rgba(12,12,18,0.9) 0%, transparent 100%);
}
.pd .kb-pill {
  display: flex; align-items: center; gap: 6px;
  background: rgba(0,0,0,0.5); backdrop-filter: blur(10px);
  padding: 5px 10px 5px 5px; border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.08);
}
.pd .kb-pill-logo { height: 11px; width: auto; filter: brightness(10); opacity: 0.8; }
.pd .center { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); z-index: 5; }
.pd .logo-zone { width: 180px; height: 68px; }
.pd .card {
  position: absolute; bottom: 14px; left: 12px; right: 12px;
  background: rgba(12,12,18,0.88); border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px; padding: 14px 16px; backdrop-filter: blur(16px); z-index: 10;
}
.pd .quiz-line { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
.pd .quiz-line::before { content:''; width: 10px; height: 1px; background: #dc2626; flex-shrink: 0; }
.pd .quiz-label { font-size: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(245,245,244,0.3); }
.pd .card-name { font-size: 22px; font-weight: 900; color: #F5F5F4; line-height: 1.1; letter-spacing: -0.01em; font-family: "Noto Sans JP", Inter, sans-serif; }
</style>
</head>
<body>

<div class="pg-lbl">KitsuBeat · Quiz Thumbnail</div>
<div class="pg-sub">Logo · "Quiz on [Anime]" · Part X · Anime logo · 4 layouts</div>

<div class="row">

  <!-- A: DARK OVERLAY -->
  <div class="col">
    <div class="col-lbl">A — Dark Overlay</div>
    <div class="p pa">
      <div class="art art-ph">♪</div>
      <div class="anime-logo-ph logo-zone"><span>Anime logo</span></div>
      <div class="fade"></div>
      <div class="content">
        <div class="brand-row">
          <div class="kb-icon" style="width:22px;height:22px"><img src="ICON_URI" alt=""></div>
          <img class="brand-logo" src="LOGO_URI" alt="KitsuBeat">
        </div>
        <div class="quiz-on">Quiz on</div>
        <div class="anime-name">Naruto<br>Shippuden</div>
        <div class="sep-row">
          <div class="sep-line"></div>
          <div class="part-pill">Part 3</div>
          <div class="sep-line"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- B: SPLIT CARD -->
  <div class="col">
    <div class="col-lbl">B — Split Card</div>
    <div class="p pb">
      <div class="art art-ph">♪</div>
      <div class="anime-logo-ph logo-zone"><span>Anime logo</span></div>
      <div class="art-border"></div>
      <div class="panel">
        <div class="top-row">
          <div class="brand">
            <div class="kb-icon" style="width:20px;height:20px"><img src="ICON_URI" alt=""></div>
            <img class="brand-logo" src="LOGO_URI" alt="KitsuBeat">
          </div>
          <div class="part-tag">Part 3</div>
        </div>
        <div>
          <div class="quiz-on" style="margin-bottom:5px">Quiz on</div>
          <div class="anime-name">Naruto<br>Shippuden</div>
        </div>
        <div class="foot">
          <div class="dot"></div>
          <div class="tagline">Can you name all the songs?</div>
        </div>
      </div>
    </div>
  </div>

  <!-- C: MINIMAL -->
  <div class="col">
    <div class="col-lbl">C — Minimal</div>
    <div class="p pc">
      <div class="bar"></div>
      <div class="top">
        <div class="kb-icon" style="width:22px;height:22px"><img src="ICON_URI" alt=""></div>
        <img class="top-logo" src="LOGO_URI" alt="KitsuBeat">
      </div>
      <div class="body">
        <div class="ghost-num">03</div>
        <div class="quiz-on" style="margin-bottom:8px">Quiz on</div>
        <div class="anime-name" style="margin-bottom:20px">Naruto<br>Shippuden</div>
        <div class="anime-logo-ph logo-zone" style="margin-bottom:22px"><span>Anime logo</span></div>
        <div class="sep"></div>
        <div class="part-pill">Part 3</div>
      </div>
    </div>
  </div>

  <!-- D: BOLD FRAME -->
  <div class="col">
    <div class="col-lbl">D — Bold Frame</div>
    <div class="p pd">
      <div class="art art-ph">♪</div>
      <div class="topbar">
        <div class="kb-pill">
          <div class="kb-icon" style="width:20px;height:20px"><img src="ICON_URI" alt=""></div>
          <img class="kb-pill-logo" src="LOGO_URI" alt="KitsuBeat">
        </div>
        <div class="part-pill">Part 3</div>
      </div>
      <div class="center">
        <div class="anime-logo-ph logo-zone"><span>Anime logo</span></div>
      </div>
      <div class="card">
        <div class="quiz-line"><span class="quiz-label">Quiz on</span></div>
        <div class="card-name">Naruto Shippuden</div>
      </div>
    </div>
  </div>

</div>
</body>
</html>"""

HTML = HTML_TEMPLATE.replace("ICON_URI", icon_uri).replace("LOGO_URI", logo_uri)

out = os.path.join(project_dir, 'public', 'quiz-thumbnail-v1.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(HTML)
print(f"Written: {out} ({len(HTML):,} bytes)")
