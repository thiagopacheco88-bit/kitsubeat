#!/usr/bin/env python3
"""Quiz poster v4 — 4 variants, icon only in nav, forced single row."""
import base64, os

project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

with open(os.path.join(project_dir, 'public', 'apple-touch-icon.png'), 'rb') as f:
    icon_b64 = base64.b64encode(f.read()).decode()
icon_uri = "data:image/png;base64," + icon_b64

with open(os.path.join(project_dir, 'public', 'logo.png'), 'rb') as f:
    logo_b64 = base64.b64encode(f.read()).decode()
logo_uri = "data:image/png;base64," + logo_b64

HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>KitsuBeat Quiz Poster v4</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
<style>
:root {
  --bg:       #0E0E0E;
  --bg2:      #111111;
  --card:     #191919;
  --card2:    #1E1E1E;
  --border:   rgba(255,255,255,0.06);
  --border-s: rgba(255,255,255,0.10);
  --text:     #F5F5F4;
  --muted:    rgba(245,245,244,0.56);
  --dim:      rgba(245,245,244,0.40);
  --accent:   #dc2626;
  --accent-r: #ef4444;
  --green-bg: rgba(34,197,94,0.12);
  --green-rg: rgba(34,197,94,0.25);
  --green:    #22c55e;
  --r-md: 12px; --r-lg: 14px; --r-xl: 16px; --r-2xl: 18px; --r-pill: 9999px;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: #060606;
  min-height: 100vh;
  display: flex; flex-direction: column; align-items: flex-start;
  padding: 48px 32px 72px;
  font-family: Inter, system-ui, sans-serif;
  color: var(--text);
}

.page-lbl { font-size: 10px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: var(--dim); margin-bottom: 5px; }
.page-sub  { font-size: 11px; color: rgba(245,245,244,0.18); margin-bottom: 44px; }

/* Force single row with horizontal scroll */
.row {
  display: flex;
  flex-direction: row;
  gap: 20px;
  align-items: flex-start;
  overflow-x: auto;
  padding-bottom: 16px;
  width: 100%;
}
.col { display: flex; flex-direction: column; align-items: center; gap: 12px; flex-shrink: 0; }
.col-lbl { font-size: 9px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(245,245,244,0.2); }

/* 9:16 poster — 290×515 */
.p {
  width: 290px; height: 515px;
  border-radius: 18px; overflow: hidden; position: relative;
  background: var(--bg);
  box-shadow: 0 24px 60px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.05);
}

/* ── SHARED ATOMS ── */
.nav {
  position: absolute; top: 0; left: 0; right: 0; height: 44px;
  background: var(--bg); border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 13px; z-index: 30;
}
.nav-icon { width: 26px; height: 26px; border-radius: 7px; overflow: hidden; flex-shrink: 0; }
.nav-icon img { width: 100%; height: 100%; object-fit: cover; }
.nav-right { font-size: 9px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); }
.progress-strip { position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: var(--border); }
.progress-fill  { height: 100%; border-radius: var(--r-pill); background: var(--accent); }

.cover { position: absolute; left: 0; right: 0; background: var(--card2); overflow: hidden; }
.cover-ph {
  width: 100%; height: 100%; background: var(--card2);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
}
.cover-note { font-size: 40px; color: var(--dim); line-height: 1; }
.cover-hint { font-size: 8px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(245,245,244,0.14); font-weight: 600; }
.cover-vig {
  position: absolute; bottom: 0; left: 0; right: 0; height: 55%;
  background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.62) 100%);
}
.cover-meta { position: absolute; bottom: 8px; left: 12px; }
.cover-title  { font-size: 12px; font-weight: 700; color: #F5F5F4; font-family: "Noto Sans JP", sans-serif; }
.cover-artist { font-size: 9px; color: rgba(245,245,244,0.7); margin-top: 1px; }
.op-badge {
  position: absolute; top: 8px; right: 8px;
  background: rgba(0,0,0,0.72); color: white;
  font-size: 8px; font-weight: 700; padding: 2px 6px; border-radius: var(--r-pill);
}

.ex-card {
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--r-xl); padding: 11px;
  display: flex; flex-direction: column; gap: 8px;
}
.ex-header { display: flex; align-items: center; justify-content: space-between; }
.ex-tag   { font-size: 8px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--dim); font-weight: 600; }
.ex-level { background: var(--green-bg); border: 1px solid var(--green-rg); border-radius: var(--r-pill); padding: 2px 7px; font-size: 8px; font-weight: 600; color: var(--text); }
.ex-q     { font-size: 11px; color: var(--muted); line-height: 1.5; font-weight: 500; }
.ex-q strong { color: var(--text); font-weight: 700; }

.opts { display: flex; flex-direction: column; gap: 5px; }
.opt {
  border-radius: var(--r-md); border: 1px solid var(--border);
  background: var(--card2); padding: 8px 11px;
  display: flex; align-items: center; gap: 8px;
}
.opt.correct { border-color: var(--green-rg); background: var(--green-bg); }
.opt.wrong   { border-color: rgba(220,38,38,0.45); background: rgba(220,38,38,0.08); }
.opt-k {
  width: 18px; height: 18px; border-radius: 5px;
  background: rgba(255,255,255,0.04); border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: 7px; font-weight: 700; color: var(--dim); flex-shrink: 0;
}
.opt.correct .opt-k { background: rgba(34,197,94,0.15); border-color: var(--green-rg); color: var(--green); }
.opt.wrong   .opt-k { background: rgba(220,38,38,0.15); border-color: rgba(220,38,38,0.4); color: var(--accent-r); }
.opt-t { font-size: 11px; color: var(--muted); }
.opt.correct .opt-t { color: var(--text); }

.tabbar {
  position: absolute; bottom: 0; left: 0; right: 0; height: 44px;
  background: var(--bg); border-top: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-around; padding: 0 12px;
}
.tab    { font-size: 14px; color: var(--dim); }
.tab.on { color: var(--accent); }

.feedback {
  border-radius: var(--r-md); border: 1px solid var(--border);
  background: var(--bg2); padding: 9px 11px;
  display: flex; flex-direction: column; gap: 5px;
}
.fb-ok  { font-size: 11px; font-weight: 700; color: var(--green); }
.fb-ln  { height: 6px; border-radius: var(--r-pill); background: rgba(245,245,244,0.06); }
.btn-p  {
  background: var(--accent); color: white; font-size: 10px; font-weight: 700;
  padding: 7px 13px; border-radius: var(--r-lg); letter-spacing: 0.05em;
  box-shadow: 0 5px 14px rgba(220,38,38,0.32); align-self: flex-end;
}


/* ── VARIANT D — FULL CARD ── */
.vd-card {
  position: absolute; top: 16px; left: 12px; right: 12px; bottom: 16px;
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--r-2xl); overflow: hidden;
}
.vd-art { width: 100%; height: 198px; background: var(--card2); position: relative; overflow: hidden; }
.vd-art-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.vd-art-note { font-size: 48px; color: var(--dim); }
.vd-art-vig { position: absolute; bottom: 0; left: 0; right: 0; height: 50%; background: linear-gradient(180deg, transparent 0%, rgba(25,25,25,0.8) 100%); }
.vd-brand {
  position: absolute; top: 8px; left: 8px;
  display: flex; align-items: center; gap: 5px;
  background: rgba(0,0,0,0.55); backdrop-filter: blur(10px);
  padding: 3px 7px 3px 4px; border-radius: 7px; border: 1px solid rgba(255,255,255,0.08);
}
.vd-brand-ic { width: 16px; height: 16px; border-radius: 4px; overflow: hidden; }
.vd-brand-ic img { width: 100%; height: 100%; object-fit: cover; }
.vd-brand-nm { font-size: 8px; font-weight: 700; color: rgba(245,245,244,0.75); }
.vd-op { position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.7); color: white; font-size: 8px; font-weight: 700; padding: 2px 6px; border-radius: var(--r-pill); }
.vd-art-meta { position: absolute; bottom: 8px; left: 12px; }
.vd-art-title  { font-size: 13px; font-weight: 700; color: #F5F5F4; font-family: "Noto Sans JP", sans-serif; }
.vd-art-artist { font-size: 9px; color: rgba(245,245,244,0.65); margin-top: 1px; }
.vd-body { padding: 13px 13px 14px; display: flex; flex-direction: column; gap: 10px; }
.vd-header { display: flex; align-items: center; justify-content: space-between; }
.vd-tag   { font-size: 8px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--dim); font-weight: 700; }
.vd-level { background: var(--green-bg); border: 1px solid var(--green-rg); border-radius: var(--r-pill); padding: 2px 7px; font-size: 8px; font-weight: 600; color: var(--text); }
.vd-q     { font-size: 11px; color: var(--muted); line-height: 1.5; }
.vd-q strong { color: var(--text); font-weight: 700; }
.vd-opts { display: flex; flex-direction: column; gap: 5px; }
.vd-opt { border-radius: var(--r-md); border: 1px solid var(--border); background: var(--card2); padding: 7px 10px; display: flex; align-items: center; gap: 8px; }
.vd-opt-k { width: 17px; height: 17px; border-radius: 5px; background: rgba(255,255,255,0.04); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: 700; color: var(--dim); flex-shrink: 0; }
.vd-opt-t { font-size: 10px; color: var(--muted); }
.vd-sep   { height: 1px; background: var(--border); }
.vd-footer { display: flex; align-items: center; justify-content: space-between; }
.vd-anime-l { font-size: 7px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--dim); margin-bottom: 2px; }
.vd-anime-n { font-size: 12px; font-weight: 700; color: var(--text); }
</style>
</head>
<body>

<div class="page-lbl">KitsuBeat · Quiz Poster v4</div>
<div class="page-sub">4 on-brand variants · scroll sideways if needed</div>

<div class="row">

  <!-- A — IDLE QUIZ -->
  <div class="col">
    <div class="col-lbl">A — Idle Quiz</div>
    <div class="p">
      <div class="nav">
        <div class="nav-icon"><img src="ICON_URI" alt="KitsuBeat"></div>
        <div class="nav-right">Quiz #47</div>
        <div class="progress-strip"><div class="progress-fill" style="width:40%"></div></div>
      </div>
      <div class="cover" style="top:44px;height:172px">
        <div class="cover-ph"><div class="cover-note">♪</div><div class="cover-hint">Anime artwork</div></div>
        <span class="op-badge">OP 4</span>
        <div class="cover-vig"></div>
        <div class="cover-meta"><div class="cover-title">Blue Bird</div><div class="cover-artist">Ikimonogakari</div></div>
      </div>
      <div style="position:absolute;top:228px;left:0;right:0;bottom:44px;padding:11px 12px;display:flex;flex-direction:column;gap:9px">
        <div class="ex-card">
          <div class="ex-header"><span class="ex-tag">Song Quiz</span><span class="ex-level">beginner</span></div>
          <div class="ex-q">Which <strong>anime</strong> is this opening theme from?</div>
          <div class="opts">
            <div class="opt"><div class="opt-k">A</div><span class="opt-t">Naruto Shippuden</span></div>
            <div class="opt"><div class="opt-k">B</div><span class="opt-t">Sword Art Online</span></div>
            <div class="opt"><div class="opt-k">C</div><span class="opt-t">Attack on Titan</span></div>
          </div>
        </div>
      </div>
      <div class="tabbar"><span class="tab on">🏠</span><span class="tab">📚</span><span class="tab">⭐</span><span class="tab">👤</span></div>
    </div>
  </div>

  <!-- B — COVER DOMINANT -->
  <div class="col">
    <div class="col-lbl">B — Cover Dominant</div>
    <div class="p">
      <div class="nav">
        <div class="nav-icon"><img src="ICON_URI" alt="KitsuBeat"></div>
        <div class="nav-right">Quiz #47</div>
        <div class="progress-strip"><div class="progress-fill" style="width:40%"></div></div>
      </div>
      <div class="cover" style="top:44px;height:218px">
        <div class="cover-ph" style="background:linear-gradient(160deg,#181818 0%,#1e1e1e 60%,#141414 100%)">
          <div class="cover-note" style="font-size:56px">♪</div>
          <div class="cover-hint">Anime artwork</div>
        </div>
        <span class="op-badge">OP 4</span>
        <div class="cover-vig"></div>
        <div class="cover-meta"><div class="cover-title">Blue Bird</div><div class="cover-artist">Ikimonogakari</div></div>
      </div>
      <div style="position:absolute;top:272px;left:0;right:0;bottom:44px;padding:12px 12px;display:flex;flex-direction:column;gap:9px">
        <div style="font-size:9px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:var(--accent-r);display:flex;align-items:center;gap:7px">
          <span style="display:block;width:12px;height:1px;background:var(--accent);flex-shrink:0"></span>
          Which anime is this from?
        </div>
        <div class="ex-card" style="gap:7px">
          <div class="opts">
            <div class="opt"><div class="opt-k">A</div><span class="opt-t">Naruto Shippuden</span></div>
            <div class="opt"><div class="opt-k">B</div><span class="opt-t">Sword Art Online</span></div>
          </div>
        </div>
      </div>
      <div class="tabbar"><span class="tab on">🏠</span><span class="tab">📚</span><span class="tab">⭐</span><span class="tab">👤</span></div>
    </div>
  </div>

  <!-- C — ANSWER REVEALED -->
  <div class="col">
    <div class="col-lbl">C — Answer Revealed</div>
    <div class="p">
      <div class="nav">
        <div class="nav-icon"><img src="ICON_URI" alt="KitsuBeat"></div>
        <div class="nav-right">Quiz #47</div>
        <div class="progress-strip"><div class="progress-fill" style="width:55%"></div></div>
      </div>
      <div class="cover" style="top:44px;height:155px">
        <div class="cover-ph"><div class="cover-note">♪</div><div class="cover-hint">Anime artwork</div></div>
        <span class="op-badge">OP 4</span>
        <div class="cover-vig"></div>
        <div class="cover-meta"><div class="cover-title">Blue Bird</div><div class="cover-artist">Ikimonogakari</div></div>
      </div>
      <div style="position:absolute;top:211px;left:0;right:0;bottom:44px;padding:10px 12px;display:flex;flex-direction:column;gap:8px">
        <div class="ex-card" style="gap:8px">
          <div class="ex-header"><span class="ex-tag">Song Quiz</span><span class="ex-level">beginner</span></div>
          <div class="ex-q">Which <strong>anime</strong> is this opening theme from?</div>
          <div class="opts">
            <div class="opt correct"><div class="opt-k">A</div><span class="opt-t">Naruto Shippuden</span></div>
            <div class="opt wrong"><div class="opt-k">B</div><span class="opt-t">Sword Art Online</span></div>
            <div class="opt"><div class="opt-k">C</div><span class="opt-t">Attack on Titan</span></div>
          </div>
        </div>
        <div class="feedback">
          <div class="fb-ok">Correct!</div>
          <div class="fb-ln" style="width:78%"></div>
          <div class="fb-ln" style="width:55%;margin-top:2px"></div>
          <div class="btn-p" style="margin-top:3px">Continue →</div>
        </div>
      </div>
      <div class="tabbar"><span class="tab on">🏠</span><span class="tab">📚</span><span class="tab">⭐</span><span class="tab">👤</span></div>
    </div>
  </div>

  <!-- D — FULL CARD -->
  <div class="col">
    <div class="col-lbl">D — Full Card</div>
    <div class="p">
      <div class="vd-card">
        <div class="vd-art">
          <div class="vd-art-ph"><div class="vd-art-note">♪</div></div>
          <div class="vd-art-vig"></div>
          <div class="vd-brand">
            <div class="vd-brand-ic"><img src="ICON_URI" alt="KitsuBeat"></div>
            <div class="vd-brand-nm">KitsuBeat</div>
          </div>
          <span class="vd-op">OP 4</span>
          <div class="vd-art-meta"><div class="vd-art-title">Blue Bird</div><div class="vd-art-artist">Ikimonogakari</div></div>
        </div>
        <div class="vd-body">
          <div class="vd-header"><span class="vd-tag">Song Quiz</span><span class="vd-level">beginner</span></div>
          <div class="vd-q">Which <strong>anime</strong> is this opening theme from?</div>
          <div class="vd-opts">
            <div class="vd-opt"><div class="vd-opt-k">A</div><div class="vd-opt-t">Naruto Shippuden</div></div>
            <div class="vd-opt"><div class="vd-opt-k">B</div><div class="vd-opt-t">Sword Art Online</div></div>
            <div class="vd-opt"><div class="vd-opt-k">C</div><div class="vd-opt-t">Attack on Titan</div></div>
          </div>
          <div class="vd-sep"></div>
          <div class="vd-footer">
            <div><div class="vd-anime-l">From</div><div class="vd-anime-n">Naruto Shippuden</div></div>
            <div class="btn-p">Play clip</div>
          </div>
        </div>
      </div>
    </div>
  </div>

</div>
</body>
</html>"""

HTML = HTML.replace("ICON_URI", icon_uri).replace("LOGO_URI", logo_uri)

out = os.path.join(project_dir, 'public', 'quiz-poster-v4.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(HTML)
print(f"Written: {out} ({len(HTML):,} bytes)")
