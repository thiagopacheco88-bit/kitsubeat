#!/usr/bin/env python3
"""Generate 3 on-brand quiz poster alternatives (v2) — real KitsuBeat design tokens."""
import base64, os

project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

with open(os.path.join(project_dir, 'public', 'logo.png'), 'rb') as f:
    logo_b64 = base64.b64encode(f.read()).decode()
logo_uri = "data:image/png;base64," + logo_b64

HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>KitsuBeat Quiz Poster v2 — On-Brand</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
<style>
/* ── KitsuBeat design tokens (verbatim from globals.css) ── */
:root {
  --color-bg:            #0E0E0E;
  --color-bg-2:          #111111;
  --color-card:          #191919;
  --color-card-2:        #1E1E1E;
  --color-border:        rgba(255,255,255,0.06);
  --color-border-strong: rgba(255,255,255,0.10);
  --color-text:          #F5F5F4;
  --color-text-muted:    rgba(245,245,244,0.56);
  --color-text-dim:      rgba(245,245,244,0.40);
  --color-accent:        #dc2626;
  --color-accent-r:      #ef4444;
  --radius-md:  12px;
  --radius-lg:  14px;
  --radius-xl:  16px;
  --radius-2xl: 18px;
  --radius-pill: 9999px;
  --shadow-hero-glow: inset 0 0 0 1px rgba(239,68,68,0.32), 0 16px 40px rgba(239,68,68,0.14);
  --shadow-card-ring: inset 0 0 0 1px rgba(255,255,255,0.06);
  --font-sans: Inter, -apple-system, system-ui, sans-serif;
  --font-jp: "Noto Sans JP", -apple-system, system-ui, sans-serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: #060606;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 52px 24px 72px;
  font-family: var(--font-sans);
  color: var(--color-text);
}

.page-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--color-text-dim);
  margin-bottom: 6px;
}
.page-sub {
  font-size: 12px;
  color: rgba(245,245,244,0.18);
  margin-bottom: 56px;
}

.grid {
  display: flex;
  gap: 28px;
  align-items: flex-start;
  flex-wrap: wrap;
  justify-content: center;
}

.col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
.col-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(245,245,244,0.2);
}

/* 9:16 at 350×622 */
.poster {
  width: 350px;
  height: 622px;
  border-radius: 20px;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
  background: var(--color-bg);
  box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05);
}


/* ════════════════════════════════════════════════════════════
   A — IN-APP SCREEN
   Literally the quiz exercise screen from the app.
   Cover art top (YouTube thumbnail), quiz prompt,
   3 MCQ option buttons in unselected state.
════════════════════════════════════════════════════════════ */
.poster-a { background: var(--color-bg); }

/* Top nav bar — matches app header */
.a-nav {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 52px;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  z-index: 20;
}
.a-nav-logo { height: 18px; width: auto; }
.a-progress-bar-wrap {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 2px;
  background: var(--color-border);
}
.a-progress-fill {
  height: 100%;
  width: 40%;
  background: var(--color-accent);
  border-radius: var(--radius-pill);
}
.a-streaks {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-dim);
}
.a-flame { font-size: 13px; }

/* Cover art — mimics the song card cover panel */
.a-cover {
  position: absolute;
  top: 52px; left: 0; right: 0;
  height: 200px;
  background: var(--color-card-2);
  overflow: hidden;
}
.a-cover-art {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* Placeholder art — matches app's "♪" placeholder */
.a-cover-ph {
  width: 100%;
  height: 100%;
  background: var(--color-card-2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.a-cover-ph-note {
  font-size: 48px;
  color: var(--color-text-dim);
  line-height: 1;
}
.a-cover-ph-label {
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(245,245,244,0.16);
  font-weight: 600;
}
/* OP/ED badge — matches app's absolute top-right badge */
.a-op-badge {
  position: absolute;
  top: 10px; right: 10px;
  background: rgba(0,0,0,0.72);
  color: white;
  font-size: 9px;
  font-weight: 700;
  padding: 3px 7px;
  border-radius: var(--radius-pill);
}
/* Bottom vignette — matches app */
.a-vignette {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 50%;
  background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.55) 100%);
  pointer-events: none;
}
/* Song info overlay on cover — bottom left */
.a-cover-info {
  position: absolute;
  bottom: 10px; left: 14px;
}
.a-cover-title {
  font-size: 14px;
  font-weight: 700;
  color: #F5F5F4;
  font-family: var(--font-jp);
  line-height: 1.2;
}
.a-cover-artist {
  font-size: 10px;
  color: rgba(245,245,244,0.72);
  margin-top: 1px;
}

/* Main content area */
.a-body {
  position: absolute;
  top: 252px; left: 0; right: 0; bottom: 0;
  padding: 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

/* Exercise card — matches GrammarMcqCard outer wrapper */
.a-ex-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.a-ex-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.a-ex-tag {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-text-dim);
  font-weight: 600;
}
.a-level-pill {
  background: rgba(34,197,94,0.12);
  border: 1px solid rgba(34,197,94,0.25);
  border-radius: var(--radius-pill);
  padding: 2px 8px;
  font-size: 9px;
  font-weight: 600;
  color: var(--color-text);
}
/* The quiz question */
.a-question {
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.5;
  font-weight: 500;
}
.a-question strong {
  color: var(--color-text);
  font-weight: 700;
}

/* MCQ option buttons — matches app's button style */
.a-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.a-opt {
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-card-2);
  color: var(--color-text);
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 500;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: border-color 0.15s;
}
.a-opt-key {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: 700;
  color: var(--color-text-dim);
  flex-shrink: 0;
}
.a-opt-text { color: var(--color-text-muted); font-size: 12px; }

/* Bottom bar */
.a-bottom-bar {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 52px;
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  padding: 0 24px;
}
.a-nav-icon {
  font-size: 17px;
  color: var(--color-text-dim);
}
.a-nav-icon.active { color: var(--color-accent); }


/* ════════════════════════════════════════════════════════════
   B — COVER SPOTLIGHT
   CoverCard anatomy exploded to full 9:16.
   Art takes top 58%, info panel bottom 42%.
   Same token set, more cinematic thanks to art dominance.
════════════════════════════════════════════════════════════ */
.poster-b { background: var(--color-bg); }

/* Art zone — 58% height */
.b-art {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 360px;
  background: var(--color-card-2);
  overflow: hidden;
}
.b-art-ph {
  width: 100%;
  height: 100%;
  background: linear-gradient(160deg, #1a1a1a 0%, var(--color-card-2) 60%, #141414 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.b-art-ph-note {
  font-size: 80px;
  color: rgba(245,245,244,0.06);
  line-height: 1;
}
/* Red glow at bottom of art — same as app's hero-glow */
.b-art-bottom-glow {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 160px;
  background: linear-gradient(0deg,
    rgba(14,14,14,1) 0%,
    rgba(14,14,14,0.85) 30%,
    rgba(14,14,14,0.3) 65%,
    transparent 100%
  );
}
/* Subtle red bloom from bottom */
.b-red-bloom {
  position: absolute;
  bottom: -20px; left: 50%;
  transform: translateX(-50%);
  width: 260px; height: 140px;
  background: radial-gradient(ellipse, rgba(220,38,38,0.12) 0%, transparent 70%);
  filter: blur(8px);
}

/* OP/ED tag — top right, matches CoverCard */
.b-op {
  position: absolute;
  top: 14px; right: 14px;
  background: rgba(0,0,0,0.7);
  border: 1px solid rgba(255,255,255,0.08);
  color: white;
  font-size: 9px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: var(--radius-pill);
  backdrop-filter: blur(8px);
}

/* Logo — top left */
.b-logo {
  position: absolute;
  top: 14px; left: 14px;
}
.b-logo img { height: 18px; width: auto; filter: brightness(10); opacity: 0.75; }

/* Info panel — bottom 42% */
.b-info {
  position: absolute;
  top: 360px; left: 0; right: 0; bottom: 0;
  padding: 22px 22px 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.b-quiz-hook {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-accent-r);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.b-quiz-hook::before {
  content: '';
  width: 16px; height: 1px;
  background: var(--color-accent);
  flex-shrink: 0;
}
.b-title {
  font-size: 34px;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-family: var(--font-jp);
  margin-bottom: 6px;
}
.b-artist {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 20px;
}
/* Divider — like app's border-bottom pattern */
.b-sep {
  width: 100%;
  height: 1px;
  background: var(--color-border);
  margin-bottom: 18px;
}
.b-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.b-anime-block {}
.b-anime-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-text-dim);
  margin-bottom: 3px;
}
.b-anime-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
}
/* Play CTA — like app's primary button */
.b-cta {
  background: var(--color-accent);
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 10px 18px;
  border-radius: var(--radius-lg);
  letter-spacing: 0.06em;
  box-shadow: 0 8px 22px rgba(220,38,38,0.35);
  white-space: nowrap;
}


/* ════════════════════════════════════════════════════════════
   C — MINIMAL TYPE
   Ultra-stripped. The brand, the song, the hook.
   No art — just the design system speaking for itself.
   Confident enough to not need decoration.
════════════════════════════════════════════════════════════ */
.poster-c { background: var(--color-bg); }

/* Single red vertical accent bar — left edge */
.c-accent-bar {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--color-accent);
}

/* Logo — top left, standard */
.c-top {
  position: absolute;
  top: 0; left: 0; right: 0;
  padding: 26px 26px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border);
}
.c-top img { height: 18px; width: auto; }
.c-ep-tag {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-text-dim);
}

/* Center — all the content */
.c-center {
  position: absolute;
  top: 70px; left: 0; right: 0; bottom: 0;
  padding: 0 26px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0;
}

/* Huge number — episode / quiz number as typographic hero */
.c-num {
  font-size: 120px;
  font-weight: 800;
  color: rgba(245,245,244,0.04);
  line-height: 1;
  letter-spacing: -0.06em;
  margin-bottom: -16px;
  margin-left: -4px;
}

.c-hook {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-accent-r);
  margin-bottom: 16px;
}

.c-title {
  font-size: 52px;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1.0;
  letter-spacing: -0.03em;
  font-family: var(--font-jp);
  margin-bottom: 12px;
}

.c-artist {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-dim);
  letter-spacing: 0.06em;
  margin-bottom: 40px;
}

/* Horizontal rule — app border pattern */
.c-rule {
  width: 100%;
  height: 1px;
  background: var(--color-border);
  margin-bottom: 28px;
}

/* Anime attribution row */
.c-anime-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 40px;
}
.c-anime-from {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-text-dim);
}
.c-anime-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-muted);
}

/* Answer placeholder rows — hint at the MCQ interaction */
.c-answers {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.c-ans {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-card);
  padding: 11px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.c-ans-key {
  width: 22px; height: 22px;
  border-radius: 6px;
  border: 1px solid var(--color-border-strong);
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-weight: 700;
  color: var(--color-text-dim);
  flex-shrink: 0;
}
.c-ans-line {
  height: 8px;
  border-radius: var(--radius-pill);
  background: rgba(245,245,244,0.05);
  flex: 1;
}
.c-ans-line.w60 { max-width: 60%; }
.c-ans-line.w75 { max-width: 75%; }
.c-ans-line.w45 { max-width: 45%; }

</style>
</head>
<body>

<div class="page-label">KitsuBeat · Quiz Poster v2</div>
<div class="page-sub">On-brand · real design tokens · 9:16 · 350×622 preview</div>

<div class="grid">

  <!-- ─────────── A: IN-APP SCREEN ─────────── -->
  <div class="col">
    <div class="col-label">A — In-App Screen</div>
    <div class="poster poster-a">

      <!-- Nav bar -->
      <div class="a-nav">
        <img class="a-nav-logo" src="LOGO_URI" alt="KitsuBeat">
        <div class="a-streaks"><span class="a-flame">🔥</span> 7</div>
        <div class="a-progress-bar-wrap"><div class="a-progress-fill"></div></div>
      </div>

      <!-- Song cover art -->
      <div class="a-cover">
        <div class="a-cover-ph">
          <div class="a-cover-ph-note">♪</div>
          <div class="a-cover-ph-label">Anime artwork · YouTube thumbnail</div>
        </div>
        <span class="a-op-badge">OP 4</span>
        <div class="a-vignette"></div>
        <div class="a-cover-info">
          <div class="a-cover-title">Blue Bird</div>
          <div class="a-cover-artist">Ikimonogakari</div>
        </div>
      </div>

      <!-- Exercise body -->
      <div class="a-body">
        <div class="a-ex-card">
          <div class="a-ex-header">
            <span class="a-ex-tag">Song Quiz</span>
            <span class="a-level-pill">beginner</span>
          </div>
          <div class="a-question">
            Which <strong>anime</strong> is this opening theme from?
          </div>
          <div class="a-options">
            <div class="a-opt">
              <div class="a-opt-key">A</div>
              <span class="a-opt-text">Naruto Shippuden</span>
            </div>
            <div class="a-opt">
              <div class="a-opt-key">B</div>
              <span class="a-opt-text">Sword Art Online</span>
            </div>
            <div class="a-opt">
              <div class="a-opt-key">C</div>
              <span class="a-opt-text">Attack on Titan</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom nav bar -->
      <div class="a-bottom-bar">
        <span class="a-nav-icon active">🏠</span>
        <span class="a-nav-icon">📚</span>
        <span class="a-nav-icon">⭐</span>
        <span class="a-nav-icon">👤</span>
      </div>

    </div>
  </div>

  <!-- ─────────── B: COVER SPOTLIGHT ─────────── -->
  <div class="col">
    <div class="col-label">B — Cover Spotlight</div>
    <div class="poster poster-b">

      <div class="b-art">
        <div class="b-art-ph">
          <div class="b-art-ph-note">♪</div>
        </div>
        <div class="b-red-bloom"></div>
        <div class="b-art-bottom-glow"></div>
        <span class="b-op">OP 4</span>
        <div class="b-logo"><img src="LOGO_URI" alt="KitsuBeat"></div>
      </div>

      <div class="b-info">
        <div>
          <div class="b-quiz-hook">Name this anime</div>
          <div class="b-title">Blue Bird</div>
          <div class="b-artist">Ikimonogakari</div>
        </div>
        <div>
          <div class="b-sep"></div>
          <div class="b-meta-row">
            <div class="b-anime-block">
              <div class="b-anime-label">From the anime</div>
              <div class="b-anime-name">Naruto Shippuden</div>
            </div>
            <div class="b-cta">Watch now</div>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- ─────────── C: MINIMAL TYPE ─────────── -->
  <div class="col">
    <div class="col-label">C — Minimal Type</div>
    <div class="poster poster-c">

      <div class="c-accent-bar"></div>

      <div class="c-top">
        <img src="LOGO_URI" alt="KitsuBeat">
        <div class="c-ep-tag">Quiz #47</div>
      </div>

      <div class="c-center">
        <div class="c-num">47</div>
        <div class="c-hook">Name the anime →</div>
        <div class="c-title">Blue<br>Bird</div>
        <div class="c-artist">Ikimonogakari</div>
        <div class="c-rule"></div>
        <div class="c-anime-row">
          <div class="c-anime-from">From</div>
          <div class="c-anime-name">Naruto Shippuden</div>
        </div>
        <div class="c-answers">
          <div class="c-ans">
            <div class="c-ans-key">A</div>
            <div class="c-ans-line w75"></div>
          </div>
          <div class="c-ans">
            <div class="c-ans-key">B</div>
            <div class="c-ans-line w60"></div>
          </div>
          <div class="c-ans">
            <div class="c-ans-key">C</div>
            <div class="c-ans-line w45"></div>
          </div>
        </div>
      </div>

    </div>
  </div>

</div>
</body>
</html>"""

HTML = HTML.replace("LOGO_URI", logo_uri)

out = os.path.join(project_dir, 'public', 'quiz-poster-v2.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(HTML)
print(f"Written: {out}")
print(f"Size: {len(HTML):,} bytes")
