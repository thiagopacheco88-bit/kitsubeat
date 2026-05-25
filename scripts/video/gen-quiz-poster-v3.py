#!/usr/bin/env python3
"""Quiz poster v3 — 4 on-brand variants, Instagram icon, no streak."""
import base64, os

project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Square app icon (used on Instagram) — apple-touch-icon.png
with open(os.path.join(project_dir, 'public', 'apple-touch-icon.png'), 'rb') as f:
    icon_b64 = base64.b64encode(f.read()).decode()
icon_uri = "data:image/png;base64," + icon_b64

# Horizontal logo for wordmark use
with open(os.path.join(project_dir, 'public', 'logo.png'), 'rb') as f:
    logo_b64 = base64.b64encode(f.read()).decode()
logo_uri = "data:image/png;base64," + logo_b64

HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>KitsuBeat Quiz Poster v3 — 4 Variants</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
<style>
:root {
  --bg:            #0E0E0E;
  --bg2:           #111111;
  --card:          #191919;
  --card2:         #1E1E1E;
  --border:        rgba(255,255,255,0.06);
  --border-s:      rgba(255,255,255,0.10);
  --text:          #F5F5F4;
  --muted:         rgba(245,245,244,0.56);
  --dim:           rgba(245,245,244,0.40);
  --accent:        #dc2626;
  --accent-r:      #ef4444;
  --green:         rgba(34,197,94,1);
  --green-bg:      rgba(34,197,94,0.12);
  --green-ring:    rgba(34,197,94,0.25);
  --r-md:  12px;
  --r-lg:  14px;
  --r-xl:  16px;
  --r-2xl: 18px;
  --r-pill: 9999px;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #060606;
  min-height: 100vh;
  display: flex; flex-direction: column;
  align-items: center;
  padding: 52px 24px 72px;
  font-family: Inter, system-ui, sans-serif;
  color: var(--text);
}
.page-lbl { font-size: 10px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: var(--dim); margin-bottom: 6px; }
.page-sub { font-size: 12px; color: rgba(245,245,244,0.18); margin-bottom: 52px; }
.grid { display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap; justify-content: center; }
.col { display: flex; flex-direction: column; align-items: center; gap: 14px; }
.col-lbl { font-size: 9px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(245,245,244,0.2); }

/* 9:16 poster shell — 335×596 */
.p {
  width: 335px; height: 596px;
  border-radius: 20px; overflow: hidden; position: relative;
  background: var(--bg);
  box-shadow: 0 28px 72px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.05);
  flex-shrink: 0;
}


/* ═══════════════════════════════════════════════════
   SHARED ATOMS (reused across all 4 variants)
═══════════════════════════════════════════════════ */

/* Nav bar — icon left, label right, progress strip at bottom */
.nav {
  position: absolute; top: 0; left: 0; right: 0;
  height: 50px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 30;
}
.nav-left { display: flex; align-items: center; gap: 8px; }
.nav-icon {
  width: 28px; height: 28px; border-radius: 8px; overflow: hidden;
  flex-shrink: 0;
}
.nav-icon img { width: 100%; height: 100%; object-fit: cover; }
.nav-wordmark { height: 14px; width: auto; }
.nav-right {
  font-size: 9px; font-weight: 700; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--dim);
}
.progress-strip {
  position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
  background: var(--border);
}
.progress-fill {
  height: 100%; border-radius: var(--r-pill);
  background: var(--accent);
}

/* Cover panel — YouTube thumbnail style */
.cover {
  position: absolute; left: 0; right: 0;
  background: var(--card2); overflow: hidden;
}
.cover-ph {
  width: 100%; height: 100%;
  background: var(--card2);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 8px;
}
.cover-note { font-size: 52px; color: var(--dim); line-height: 1; }
.cover-hint { font-size: 8px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(245,245,244,0.15); font-weight: 600; }
.cover-vignette {
  position: absolute; bottom: 0; left: 0; right: 0; height: 55%;
  background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.62) 100%);
  pointer-events: none;
}
.cover-meta { position: absolute; bottom: 10px; left: 14px; }
.cover-title { font-size: 14px; font-weight: 700; color: #F5F5F4; font-family: "Noto Sans JP", sans-serif; line-height: 1.2; }
.cover-artist { font-size: 10px; color: rgba(245,245,244,0.7); margin-top: 1px; }
.op-badge {
  position: absolute; top: 10px; right: 10px;
  background: rgba(0,0,0,0.72); color: white;
  font-size: 9px; font-weight: 700;
  padding: 3px 7px; border-radius: var(--r-pill);
}

/* Exercise card */
.ex-card {
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--r-xl); padding: 13px;
  display: flex; flex-direction: column; gap: 10px;
}
.ex-header { display: flex; align-items: center; justify-content: space-between; }
.ex-tag { font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--dim); font-weight: 600; }
.ex-level {
  background: var(--green-bg); border: 1px solid var(--green-ring);
  border-radius: var(--r-pill); padding: 2px 8px;
  font-size: 9px; font-weight: 600; color: var(--text);
}
.ex-q { font-size: 13px; color: var(--muted); line-height: 1.5; font-weight: 500; }
.ex-q strong { color: var(--text); font-weight: 700; }

/* MCQ option */
.opts { display: flex; flex-direction: column; gap: 6px; }
.opt {
  border-radius: var(--r-lg); border: 1px solid var(--border);
  background: var(--card2); color: var(--text);
  padding: 10px 13px; font-size: 12px; font-weight: 500;
  display: flex; align-items: center; gap: 9px;
}
.opt.correct {
  border-color: var(--green-ring);
  background: var(--green-bg);
}
.opt.wrong {
  border-color: rgba(220,38,38,0.5);
  background: rgba(220,38,38,0.08);
}
.opt-k {
  width: 20px; height: 20px; border-radius: 6px;
  background: rgba(255,255,255,0.04); border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: 8px; font-weight: 700; color: var(--dim); flex-shrink: 0;
}
.opt.correct .opt-k { background: rgba(34,197,94,0.15); border-color: var(--green-ring); color: var(--green); }
.opt.wrong .opt-k { background: rgba(220,38,38,0.15); border-color: rgba(220,38,38,0.4); color: var(--accent-r); }
.opt-txt { color: var(--muted); font-size: 12px; }
.opt.correct .opt-txt { color: var(--text); }
.opt.wrong .opt-txt { color: var(--muted); }

/* Tab bar */
.tabbar {
  position: absolute; bottom: 0; left: 0; right: 0;
  height: 50px; background: var(--bg);
  border-top: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-around;
  padding: 0 16px;
}
.tab { font-size: 16px; color: var(--dim); }
.tab.on { color: var(--accent); }

/* Feedback panel (variant C) */
.feedback {
  border-radius: var(--r-lg); border: 1px solid var(--border);
  background: var(--bg2); padding: 11px 13px;
  display: flex; flex-direction: column; gap: 6px;
}
.fb-correct { font-size: 12px; font-weight: 600; color: var(--green); }
.fb-line { height: 7px; border-radius: var(--r-pill); background: rgba(245,245,244,0.06); }
.fb-line.l80 { width: 80%; }
.fb-line.l65 { width: 65%; }
.fb-line.l45 { width: 45%; margin-top: 3px; }

/* CTA button — primary */
.btn-primary {
  background: var(--accent); color: white;
  font-size: 11px; font-weight: 700;
  padding: 9px 16px; border-radius: var(--r-lg);
  letter-spacing: 0.05em;
  box-shadow: 0 6px 18px rgba(220,38,38,0.32);
  align-self: flex-end; white-space: nowrap;
}


/* ═══════════════════════════════════════════════════
   VARIANT A — Idle Quiz
   Standard quiz screen, pre-answer. 3 options, no activity.
═══════════════════════════════════════════════════ */
.va-body {
  position: absolute;
  top: 248px; left: 0; right: 0; bottom: 50px;
  padding: 13px 14px;
  display: flex; flex-direction: column; gap: 10px;
  overflow: hidden;
}


/* ═══════════════════════════════════════════════════
   VARIANT B — Cover Dominant
   Taller art (55%), only 2 options + hook text, more cinematic.
═══════════════════════════════════════════════════ */
.vb-art-glow {
  position: absolute; bottom: -30px; left: 50%; transform: translateX(-50%);
  width: 240px; height: 120px;
  background: radial-gradient(ellipse, rgba(220,38,38,0.10) 0%, transparent 70%);
  filter: blur(10px);
}
.vb-body {
  position: absolute;
  top: 298px; left: 0; right: 0; bottom: 50px;
  padding: 14px 14px;
  display: flex; flex-direction: column; gap: 10px;
  overflow: hidden;
}
.vb-hook {
  font-size: 10px; font-weight: 700; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--accent-r);
  display: flex; align-items: center; gap: 7px;
}
.vb-hook::before { content: ''; width: 14px; height: 1px; background: var(--accent); flex-shrink: 0; }


/* ═══════════════════════════════════════════════════
   VARIANT C — Answer Revealed
   Post-answer state: 1 green (correct), 1 red (wrong pick),
   1 dimmed. Feedback panel below.
═══════════════════════════════════════════════════ */
.vc-body {
  position: absolute;
  top: 230px; left: 0; right: 0; bottom: 50px;
  padding: 13px 14px;
  display: flex; flex-direction: column; gap: 9px;
  overflow: hidden;
}


/* ═══════════════════════════════════════════════════
   VARIANT D — Full Card (no chrome)
   No nav/tabbar. The poster is one big card: art top,
   song info + quiz question in the card body below.
   Cleanest, most "brand asset" feeling.
═══════════════════════════════════════════════════ */
.vd-card {
  position: absolute;
  top: 20px; left: 14px; right: 14px; bottom: 20px;
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--r-2xl); overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5), var(--shadow-card-ring, inset 0 0 0 1px rgba(255,255,255,0.06));
}
.vd-art {
  width: 100%; height: 230px;
  background: var(--card2); position: relative; overflow: hidden;
}
.vd-art-ph {
  width: 100%; height: 100%; background: var(--card2);
  display: flex; align-items: center; justify-content: center;
}
.vd-art-note { font-size: 56px; color: var(--dim); }
.vd-art-vig {
  position: absolute; bottom: 0; left: 0; right: 0; height: 50%;
  background: linear-gradient(180deg, transparent 0%, rgba(25,25,25,0.8) 100%);
}
.vd-art-meta { position: absolute; bottom: 12px; left: 14px; }
.vd-art-title { font-size: 15px; font-weight: 700; color: #F5F5F4; font-family: "Noto Sans JP", sans-serif; }
.vd-art-artist { font-size: 10px; color: rgba(245,245,244,0.65); margin-top: 1px; }
.vd-op { position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; font-size: 9px; font-weight: 700; padding: 3px 7px; border-radius: var(--r-pill); }
/* KitsuBeat icon — small, top left of card art */
.vd-brand {
  position: absolute; top: 10px; left: 10px;
  display: flex; align-items: center; gap: 6px;
  background: rgba(0,0,0,0.55); backdrop-filter: blur(10px);
  padding: 4px 8px 4px 5px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
}
.vd-brand-icon { width: 18px; height: 18px; border-radius: 5px; overflow: hidden; }
.vd-brand-icon img { width: 100%; height: 100%; object-fit: cover; }
.vd-brand-name { font-size: 9px; font-weight: 700; color: rgba(245,245,244,0.75); letter-spacing: 0.04em; }

.vd-body { padding: 16px 16px 18px; display: flex; flex-direction: column; gap: 12px; }
.vd-header { display: flex; align-items: center; justify-content: space-between; }
.vd-tag { font-size: 9px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--dim); font-weight: 700; }
.vd-level { background: var(--green-bg); border: 1px solid var(--green-ring); border-radius: var(--r-pill); padding: 2px 8px; font-size: 9px; font-weight: 600; color: var(--text); }
.vd-q { font-size: 13px; color: var(--muted); line-height: 1.5; }
.vd-q strong { color: var(--text); font-weight: 700; }
.vd-opts { display: flex; flex-direction: column; gap: 6px; }
.vd-opt { border-radius: var(--r-md); border: 1px solid var(--border); background: var(--card2); padding: 9px 12px; display: flex; align-items: center; gap: 9px; }
.vd-opt-k { width: 19px; height: 19px; border-radius: 5px; background: rgba(255,255,255,0.04); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 700; color: var(--dim); flex-shrink: 0; }
.vd-opt-t { font-size: 11px; color: var(--muted); }
.vd-sep { height: 1px; background: var(--border); }
.vd-footer { display: flex; align-items: center; justify-content: space-between; }
.vd-anime-l { font-size: 8px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--dim); margin-bottom: 2px; }
.vd-anime-n { font-size: 13px; font-weight: 700; color: var(--text); }

</style>
</head>
<body>

<div class="page-lbl">KitsuBeat · Quiz Poster v3</div>
<div class="page-sub">4 on-brand variants · Instagram icon · 9:16 thumbnail frame</div>

<div class="grid">

  <!-- ══ A: IDLE QUIZ ══ -->
  <div class="col">
    <div class="col-lbl">A — Idle Quiz</div>
    <div class="p">

      <div class="nav">
        <div class="nav-left">
          <div class="nav-icon"><img src="ICON_URI" alt="KitsuBeat"></div>
          <img class="nav-wordmark" src="LOGO_URI" alt="">
        </div>
        <div class="nav-right">Quiz #47</div>
        <div class="progress-strip"><div class="progress-fill" style="width:40%"></div></div>
      </div>

      <div class="cover" style="top:50px;height:198px">
        <div class="cover-ph">
          <div class="cover-note">♪</div>
          <div class="cover-hint">Anime artwork</div>
        </div>
        <span class="op-badge">OP 4</span>
        <div class="cover-vignette"></div>
        <div class="cover-meta">
          <div class="cover-title">Blue Bird</div>
          <div class="cover-artist">Ikimonogakari</div>
        </div>
      </div>

      <div class="va-body">
        <div class="ex-card">
          <div class="ex-header">
            <span class="ex-tag">Song Quiz</span>
            <span class="ex-level">beginner</span>
          </div>
          <div class="ex-q">Which <strong>anime</strong> is this opening theme from?</div>
          <div class="opts">
            <div class="opt"><div class="opt-k">A</div><span class="opt-txt">Naruto Shippuden</span></div>
            <div class="opt"><div class="opt-k">B</div><span class="opt-txt">Sword Art Online</span></div>
            <div class="opt"><div class="opt-k">C</div><span class="opt-txt">Attack on Titan</span></div>
          </div>
        </div>
      </div>

      <div class="tabbar">
        <span class="tab on">🏠</span>
        <span class="tab">📚</span>
        <span class="tab">⭐</span>
        <span class="tab">👤</span>
      </div>

    </div>
  </div>

  <!-- ══ B: COVER DOMINANT ══ -->
  <div class="col">
    <div class="col-lbl">B — Cover Dominant</div>
    <div class="p">

      <div class="nav">
        <div class="nav-left">
          <div class="nav-icon"><img src="ICON_URI" alt="KitsuBeat"></div>
          <img class="nav-wordmark" src="LOGO_URI" alt="">
        </div>
        <div class="nav-right">Quiz #47</div>
        <div class="progress-strip"><div class="progress-fill" style="width:40%"></div></div>
      </div>

      <div class="cover" style="top:50px;height:248px">
        <div class="cover-ph" style="background:linear-gradient(160deg,#181818 0%,#1e1e1e 60%,#141414 100%)">
          <div class="cover-note" style="font-size:72px">♪</div>
          <div class="cover-hint">Anime artwork</div>
        </div>
        <div class="vb-art-glow"></div>
        <span class="op-badge">OP 4</span>
        <div class="cover-vignette"></div>
        <div class="cover-meta">
          <div class="cover-title">Blue Bird</div>
          <div class="cover-artist">Ikimonogakari</div>
        </div>
      </div>

      <div class="vb-body">
        <div class="vb-hook">Which anime is this from?</div>
        <div class="ex-card" style="gap:9px">
          <div class="opts">
            <div class="opt"><div class="opt-k">A</div><span class="opt-txt">Naruto Shippuden</span></div>
            <div class="opt"><div class="opt-k">B</div><span class="opt-txt">Sword Art Online</span></div>
          </div>
        </div>
      </div>

      <div class="tabbar">
        <span class="tab on">🏠</span>
        <span class="tab">📚</span>
        <span class="tab">⭐</span>
        <span class="tab">👤</span>
      </div>

    </div>
  </div>

  <!-- ══ C: ANSWER REVEALED ══ -->
  <div class="col">
    <div class="col-lbl">C — Answer Revealed</div>
    <div class="p">

      <div class="nav">
        <div class="nav-left">
          <div class="nav-icon"><img src="ICON_URI" alt="KitsuBeat"></div>
          <img class="nav-wordmark" src="LOGO_URI" alt="">
        </div>
        <div class="nav-right">Quiz #47</div>
        <div class="progress-strip"><div class="progress-fill" style="width:55%"></div></div>
      </div>

      <div class="cover" style="top:50px;height:180px">
        <div class="cover-ph">
          <div class="cover-note">♪</div>
          <div class="cover-hint">Anime artwork</div>
        </div>
        <span class="op-badge">OP 4</span>
        <div class="cover-vignette"></div>
        <div class="cover-meta">
          <div class="cover-title">Blue Bird</div>
          <div class="cover-artist">Ikimonogakari</div>
        </div>
      </div>

      <div class="vc-body">
        <div class="ex-card" style="gap:9px">
          <div class="ex-header">
            <span class="ex-tag">Song Quiz</span>
            <span class="ex-level">beginner</span>
          </div>
          <div class="ex-q">Which <strong>anime</strong> is this opening theme from?</div>
          <div class="opts">
            <div class="opt correct"><div class="opt-k">A</div><span class="opt-txt">Naruto Shippuden</span></div>
            <div class="opt wrong"><div class="opt-k">B</div><span class="opt-txt">Sword Art Online</span></div>
            <div class="opt"><div class="opt-k">C</div><span class="opt-txt">Attack on Titan</span></div>
          </div>
        </div>
        <div class="feedback">
          <div class="fb-correct">Correct!</div>
          <div class="fb-line l80"></div>
          <div class="fb-line l65"></div>
          <div class="fb-line l45"></div>
          <div class="btn-primary" style="margin-top:4px">Continue →</div>
        </div>
      </div>

      <div class="tabbar">
        <span class="tab on">🏠</span>
        <span class="tab">📚</span>
        <span class="tab">⭐</span>
        <span class="tab">👤</span>
      </div>

    </div>
  </div>

  <!-- ══ D: FULL CARD ══ -->
  <div class="col">
    <div class="col-lbl">D — Full Card</div>
    <div class="p">

      <div class="vd-card">
        <div class="vd-art">
          <div class="vd-art-ph">
            <div class="vd-art-note">♪</div>
          </div>
          <div class="vd-art-vig"></div>
          <div class="vd-brand">
            <div class="vd-brand-icon"><img src="ICON_URI" alt="KitsuBeat"></div>
            <div class="vd-brand-name">KitsuBeat</div>
          </div>
          <span class="vd-op">OP 4</span>
          <div class="vd-art-meta">
            <div class="vd-art-title">Blue Bird</div>
            <div class="vd-art-artist">Ikimonogakari</div>
          </div>
        </div>
        <div class="vd-body">
          <div class="vd-header">
            <span class="vd-tag">Song Quiz</span>
            <span class="vd-level">beginner</span>
          </div>
          <div class="vd-q">Which <strong>anime</strong> is this opening theme from?</div>
          <div class="vd-opts">
            <div class="vd-opt"><div class="vd-opt-k">A</div><div class="vd-opt-t">Naruto Shippuden</div></div>
            <div class="vd-opt"><div class="vd-opt-k">B</div><div class="vd-opt-t">Sword Art Online</div></div>
            <div class="vd-opt"><div class="vd-opt-k">C</div><div class="vd-opt-t">Attack on Titan</div></div>
          </div>
          <div class="vd-sep"></div>
          <div class="vd-footer">
            <div>
              <div class="vd-anime-l">From the anime</div>
              <div class="vd-anime-n">Naruto Shippuden</div>
            </div>
            <div class="btn-primary">Play clip</div>
          </div>
        </div>
      </div>

    </div>
  </div>

</div>
</body>
</html>"""

HTML = HTML.replace("ICON_URI", icon_uri).replace("LOGO_URI", logo_uri)

out = os.path.join(project_dir, 'public', 'quiz-poster-v3.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(HTML)
print(f"Written: {out}")
print(f"Size: {len(HTML):,} bytes")
