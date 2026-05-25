#!/usr/bin/env python3
"""Generate 3 quiz poster alternatives for KitsuBeat."""
import base64, os

script_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(script_dir)

with open(os.path.join(project_dir, 'public', 'logo.png'), 'rb') as f:
    logo_b64 = base64.b64encode(f.read()).decode()
logo_uri = "data:image/png;base64," + logo_b64

HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>KitsuBeat Quiz Poster — 3 Alternatives</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@500;700;800&family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: #080808;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px 64px;
  font-family: Inter, system-ui, sans-serif;
  color: #F5F5F4;
}

h1 {
  font-size: 11px;
  font-weight: 700;
  color: rgba(245,245,244,0.35);
  letter-spacing: 0.22em;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.subtitle {
  font-size: 12px;
  color: rgba(245,245,244,0.2);
  margin-bottom: 52px;
  letter-spacing: 0.04em;
}

.grid {
  display: flex;
  gap: 32px;
  align-items: flex-start;
  flex-wrap: wrap;
  justify-content: center;
}

.card-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(245,245,244,0.25);
}

/* The poster: 9:16 at 360x640 display */
.poster {
  width: 360px;
  height: 640px;
  border-radius: 20px;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
  box-shadow: 0 40px 80px rgba(0,0,0,0.6);
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   A — CINEMATIC
   Dark, immersive, full-bleed art, glass overlay at bottom
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
.poster-a {
  background: #090913;
}
.a-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 130% 60% at 50% 25%, rgba(120,80,200,0.20) 0%, transparent 65%),
    radial-gradient(ellipse 70% 50% at 80% 5%, rgba(220,38,38,0.16) 0%, transparent 55%),
    linear-gradient(180deg, #0d0a18 0%, #0c0818 50%, #090913 100%);
}
/* Simulated anime figure — abstract light shape */
.a-figure {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 420px;
  overflow: hidden;
}
.a-figure-inner {
  position: absolute;
  top: 30px;
  left: 50%;
  transform: translateX(-50%);
  width: 240px;
  height: 340px;
  background:
    radial-gradient(ellipse 50% 70% at 50% 30%, rgba(160,120,255,0.12) 0%, transparent 70%);
  border-radius: 120px 120px 80px 80px;
}
.a-body-shape {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  width: 130px;
  height: 280px;
  background: linear-gradient(180deg, rgba(40,30,70,0.85) 0%, rgba(20,15,40,0.95) 100%);
  clip-path: polygon(
    42% 0%, 58% 0%,
    68% 7%, 70% 18%, 65% 28%,
    72% 34%, 74% 52%, 70% 68%,
    76% 78%, 78% 100%,
    22% 100%, 24% 78%,
    30% 68%, 26% 52%, 28% 34%,
    35% 28%, 30% 18%, 32% 7%
  );
  filter: blur(0.3px);
}
/* Hair wisps */
.a-hair {
  position: absolute;
  top: 52px;
  left: 50%;
  transform: translateX(-50%);
  width: 180px;
  height: 100px;
  background: linear-gradient(180deg, rgba(50,35,90,0.9) 0%, transparent 100%);
  clip-path: polygon(20% 0%, 80% 0%, 90% 60%, 75% 100%, 50% 80%, 25% 100%, 10% 60%);
  filter: blur(1px);
}
.a-glow {
  position: absolute;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(220,38,38,0.12) 0%, rgba(120,80,220,0.06) 50%, transparent 70%);
  filter: blur(30px);
  border-radius: 50%;
}
.a-art-hint {
  position: absolute;
  top: 170px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(245,245,244,0.10);
  white-space: nowrap;
  font-family: Inter, sans-serif;
}
/* Particle dots */
.a-particles {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 400px;
}
.a-dot {
  position: absolute;
  border-radius: 50%;
  background: rgba(200,150,255,0.25);
}

/* Bottom glass panel */
.a-glass {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 320px;
  background: linear-gradient(0deg,
    rgba(9,9,19,0.98) 0%,
    rgba(9,9,19,0.92) 35%,
    rgba(9,9,19,0.6) 65%,
    transparent 100%
  );
}
.a-top-bar {
  position: absolute;
  top: 0; left: 0; right: 0;
  padding: 22px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 20;
}
.a-logo-pill {
  display: flex;
  align-items: center;
  gap: 0;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 999px;
  padding: 7px 13px;
  backdrop-filter: blur(16px);
}
.a-logo-pill img {
  height: 16px;
  width: auto;
}
.a-ep {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(245,245,244,0.35);
  background: rgba(245,245,244,0.05);
  border: 1px solid rgba(245,245,244,0.08);
  border-radius: 6px;
  padding: 5px 10px;
}
.a-content {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  padding: 0 24px 32px;
  z-index: 20;
}
.a-hook {
  font-size: 11px;
  font-weight: 500;
  color: rgba(245,245,244,0.38);
  letter-spacing: 0.08em;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.a-hook::before {
  content: '';
  display: block;
  width: 20px;
  height: 1px;
  background: rgba(220,38,38,0.7);
  flex-shrink: 0;
}
.a-title {
  font-family: 'Space Grotesk', Inter, sans-serif;
  font-size: 38px;
  font-weight: 800;
  color: #F5F5F4;
  line-height: 1.05;
  letter-spacing: -0.025em;
  margin-bottom: 6px;
  text-wrap: balance;
}
.a-artist {
  font-size: 13px;
  font-weight: 500;
  color: rgba(245,245,244,0.45);
  letter-spacing: 0.04em;
  margin-bottom: 22px;
}
.a-sep {
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, rgba(220,38,38,0.5) 0%, rgba(245,245,244,0.05) 60%, transparent 100%);
  margin-bottom: 18px;
}
.a-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.a-anime-l { font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(245,245,244,0.25); margin-bottom: 3px; }
.a-anime-n { font-size: 14px; font-weight: 700; color: rgba(245,245,244,0.75); }
.a-btn {
  width: 42px; height: 42px;
  border-radius: 50%;
  background: #dc2626;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px;
  box-shadow: 0 8px 24px rgba(220,38,38,0.45);
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   B — BOLD POP
   White bg, red circle hero, black band top, graphic type
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
.poster-b { background: #F4F0EB; }

.b-top-band {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 52px;
  background: #0c0c14;
  display: flex;
  align-items: center;
  padding: 0 22px;
  justify-content: space-between;
  z-index: 20;
}
.b-top-band img { height: 18px; width: auto; filter: brightness(10); opacity: 0.85; }
.b-ep-tag {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(245,245,244,0.4);
}

/* Big red circle — the hero visual element */
.b-circle {
  position: absolute;
  top: 36px;
  right: -80px;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  background: #dc2626;
}
/* Dot grid texture */
.b-dots {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(0,0,0,0.07) 1.5px, transparent 1.5px);
  background-size: 18px 18px;
}

/* Art frame */
.b-art-frame {
  position: absolute;
  top: 80px;
  left: 22px;
  width: 170px;
  height: 230px;
  border-radius: 14px;
  background: linear-gradient(135deg, #e2ddd6 0%, #cfc9c0 100%);
  border: 2px solid rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  z-index: 10;
  overflow: hidden;
}
.b-art-inner-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 60%);
}
.b-art-icon { font-size: 40px; opacity: 0.18; position: relative; z-index: 1; }
.b-art-text {
  font-size: 8px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(0,0,0,0.18);
  font-weight: 700;
  position: relative;
  z-index: 1;
}

/* Large question mark — graphic element */
.b-qmark {
  position: absolute;
  top: 50px;
  right: 10px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 280px;
  font-weight: 900;
  color: rgba(255,255,255,0.12);
  line-height: 1;
  z-index: 5;
  pointer-events: none;
}

.b-content {
  position: absolute;
  top: 330px; left: 0; right: 0; bottom: 0;
  padding: 20px 22px 28px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.b-quiz-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.b-badge {
  background: #dc2626;
  color: white;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 4px 9px;
  border-radius: 4px;
}
.b-quiz-q {
  font-size: 11px;
  color: rgba(12,12,20,0.4);
  font-weight: 500;
}
.b-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 42px;
  font-weight: 800;
  color: #0c0c14;
  line-height: 1.0;
  letter-spacing: -0.03em;
}
.b-artist {
  font-size: 15px;
  font-weight: 700;
  color: #dc2626;
  letter-spacing: 0.01em;
}
.b-bottom {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}
.b-anime-card {
  background: #0c0c14;
  border-radius: 10px;
  padding: 10px 14px;
}
.b-al { font-size: 8px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(245,245,244,0.3); margin-bottom: 3px; }
.b-an { font-size: 14px; font-weight: 800; color: #F5F5F4; line-height: 1.15; }
.b-emoji { font-size: 44px; line-height: 1; }


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   C — GAME CARD
   Dark, grid bg, RPG card feel, XP + answer slots
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
.poster-c { background: #10101a; }
.c-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(245,245,244,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(245,245,244,0.025) 1px, transparent 1px);
  background-size: 28px 28px;
}
.c-glow-tr {
  position: absolute; top: 0; right: 0;
  width: 220px; height: 220px;
  background: radial-gradient(circle at top right, rgba(220,38,38,0.14) 0%, transparent 70%);
}
.c-glow-bl {
  position: absolute; bottom: 0; left: 0;
  width: 180px; height: 180px;
  background: radial-gradient(circle at bottom left, rgba(100,60,240,0.10) 0%, transparent 70%);
}

.c-header {
  position: absolute;
  top: 0; left: 0; right: 0;
  padding: 20px 20px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 20;
}
.c-header img { height: 20px; width: auto; filter: brightness(10); opacity: 0.8; }
.c-xp {
  background: rgba(220,38,38,0.12);
  border: 1px solid rgba(220,38,38,0.28);
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 9px;
  font-weight: 800;
  color: #ef4444;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

/* Main card */
.c-card {
  position: absolute;
  top: 66px; left: 16px; right: 16px;
  background: rgba(22,22,32,0.95);
  border: 1px solid rgba(245,245,244,0.07);
  border-radius: 16px;
  overflow: hidden;
  box-shadow:
    0 24px 60px rgba(0,0,0,0.5),
    inset 0 1px 0 rgba(245,245,244,0.05);
}
.c-art {
  width: 100%;
  height: 220px;
  background: linear-gradient(135deg, #181228 0%, #1e1530 60%, #14101e 100%);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.c-art-glow {
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 50% 90%, rgba(220,38,38,0.16) 0%, transparent 65%),
    radial-gradient(ellipse 50% 40% at 20% 15%, rgba(100,60,240,0.10) 0%, transparent 55%);
}
.c-scanlines {
  position: absolute; inset: 0;
  background: repeating-linear-gradient(
    0deg, transparent, transparent 3px,
    rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px
  );
}
.c-art-ph {
  display: flex; flex-direction: column; align-items: center; gap: 10px; z-index: 1;
}
.c-art-ph .pico { font-size: 44px; opacity: 0.18; }
.c-art-ph span {
  font-size: 8px; letter-spacing: 0.22em; text-transform: uppercase;
  color: rgba(245,245,244,0.12); font-weight: 700;
}
/* Bottom gradient bleed from art into body */
.c-art-fade {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 60px;
  background: linear-gradient(0deg, rgba(22,22,32,0.95) 0%, transparent 100%);
}

.c-body {
  padding: 16px 18px 18px;
}
.c-tags {
  display: flex; gap: 7px; margin-bottom: 12px;
}
.c-tag-q {
  background: rgba(220,38,38,0.14);
  border: 1px solid rgba(220,38,38,0.28);
  border-radius: 5px; padding: 3px 7px;
  font-size: 8px; font-weight: 800; color: #ef4444;
  letter-spacing: 0.12em; text-transform: uppercase;
}
.c-tag-op {
  background: rgba(245,245,244,0.04);
  border: 1px solid rgba(245,245,244,0.07);
  border-radius: 5px; padding: 3px 7px;
  font-size: 8px; font-weight: 600; color: rgba(245,245,244,0.3);
  letter-spacing: 0.1em; text-transform: uppercase;
}
.c-q { font-size: 10px; font-weight: 500; color: rgba(245,245,244,0.35); letter-spacing: 0.04em; margin-bottom: 6px; }
.c-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 26px; font-weight: 800;
  color: #F5F5F4; line-height: 1.1;
  letter-spacing: -0.02em; margin-bottom: 4px;
}
.c-artist { font-size: 12px; font-weight: 500; color: rgba(245,245,244,0.4); margin-bottom: 14px; }
.c-stats {
  display: flex; gap: 1px;
  background: rgba(245,245,244,0.04);
  border-radius: 8px; overflow: hidden;
  border: 1px solid rgba(245,245,244,0.04);
}
.c-stat {
  flex: 1; padding: 8px 10px;
  background: rgba(18,18,28,0.9);
  display: flex; flex-direction: column; gap: 2px;
}
.c-stat + .c-stat { border-left: 1px solid rgba(245,245,244,0.04); }
.c-sl { font-size: 8px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(245,245,244,0.22); }
.c-sv { font-size: 11px; font-weight: 700; color: rgba(245,245,244,0.65); }

/* Answer slots below the card */
.c-slots {
  position: absolute;
  left: 16px; right: 16px;
  bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  z-index: 20;
}
.c-slot {
  background: rgba(18,18,28,0.92);
  border: 1px solid rgba(245,245,244,0.06);
  border-radius: 10px;
  padding: 9px 13px;
  display: flex;
  align-items: center;
  gap: 10px;
  backdrop-filter: blur(12px);
}
.c-slot-k {
  width: 22px; height: 22px;
  border-radius: 6px;
  background: rgba(245,245,244,0.05);
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-weight: 800;
  color: rgba(245,245,244,0.25);
  flex-shrink: 0;
}
.c-slot-t { font-size: 11px; color: rgba(245,245,244,0.18); letter-spacing: 0.04em; }
</style>
</head>
<body>

<h1>KitsuBeat · Quiz Poster</h1>
<p class="subtitle">3 thumbnail alternatives · frame 0 of quiz video · 9:16 ratio</p>

<div class="grid">

  <!-- ─── A: CINEMATIC ─── -->
  <div class="card-wrap">
    <div class="label">A — Cinematic</div>
    <div class="poster poster-a">
      <div class="a-bg"></div>
      <div class="a-figure">
        <div class="a-glow"></div>
        <div class="a-figure-inner"></div>
        <div class="a-hair"></div>
        <div class="a-body-shape"></div>
      </div>
      <div class="a-art-hint">anime artwork</div>

      <div class="a-glass"></div>

      <div class="a-top-bar">
        <div class="a-logo-pill"><img src="LOGO_URI_PLACEHOLDER" alt="KitsuBeat"></div>
        <div class="a-ep">Quiz #47</div>
      </div>

      <div class="a-content">
        <div class="a-hook">Can you name this anime?</div>
        <div class="a-title">Blue Bird</div>
        <div class="a-artist">Ikimonogakari</div>
        <div class="a-sep"></div>
        <div class="a-bottom">
          <div>
            <div class="a-anime-l">From the anime</div>
            <div class="a-anime-n">Naruto Shippuden</div>
          </div>
          <div class="a-btn">🎵</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ─── B: BOLD POP ─── -->
  <div class="card-wrap">
    <div class="label">B — Bold Pop</div>
    <div class="poster poster-b">
      <div class="b-dots"></div>
      <div class="b-circle"></div>
      <div class="b-qmark">?</div>

      <div class="b-top-band">
        <img src="LOGO_URI_PLACEHOLDER" alt="KitsuBeat">
        <div class="b-ep-tag">Anime Quiz</div>
      </div>

      <div class="b-art-frame">
        <div class="b-art-inner-glow"></div>
        <div class="b-art-icon">🎌</div>
        <div class="b-art-text">Anime Artwork</div>
      </div>

      <div class="b-content">
        <div class="b-quiz-row">
          <div class="b-badge">Quiz</div>
          <div class="b-quiz-q">Which anime is this from?</div>
        </div>
        <div>
          <div class="b-title">Blue<br>Bird</div>
          <div style="height:6px"></div>
          <div class="b-artist">Ikimonogakari</div>
        </div>
        <div class="b-bottom">
          <div class="b-anime-card">
            <div class="b-al">From</div>
            <div class="b-an">Naruto<br>Shippuden</div>
          </div>
          <div class="b-emoji">🎵</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ─── C: GAME CARD ─── -->
  <div class="card-wrap">
    <div class="label">C — Game Card</div>
    <div class="poster poster-c">
      <div class="c-grid"></div>
      <div class="c-glow-tr"></div>
      <div class="c-glow-bl"></div>

      <div class="c-header">
        <img src="LOGO_URI_PLACEHOLDER" alt="KitsuBeat">
        <div class="c-xp">+50 XP</div>
      </div>

      <div class="c-card">
        <div class="c-art">
          <div class="c-art-glow"></div>
          <div class="c-scanlines"></div>
          <div class="c-art-fade"></div>
          <div class="c-art-ph">
            <div class="pico">🎌</div>
            <span>Anime Artwork</span>
          </div>
        </div>
        <div class="c-body">
          <div class="c-tags">
            <div class="c-tag-q">Quiz</div>
            <div class="c-tag-op">Opening Theme</div>
          </div>
          <div class="c-q">Which anime is this song from?</div>
          <div class="c-title">Blue Bird</div>
          <div class="c-artist">Ikimonogakari</div>
          <div class="c-stats">
            <div class="c-stat"><div class="c-sl">Difficulty</div><div class="c-sv">★★☆</div></div>
            <div class="c-stat"><div class="c-sl">Players</div><div class="c-sv">12.4k</div></div>
            <div class="c-stat"><div class="c-sl">Correct %</div><div class="c-sv">78%</div></div>
          </div>
        </div>
      </div>

      <div class="c-slots">
        <div class="c-slot">
          <div class="c-slot-k">A</div>
          <div class="c-slot-t">Naruto Shippuden</div>
        </div>
        <div class="c-slot">
          <div class="c-slot-k">B</div>
          <div class="c-slot-t">Sword Art Online</div>
        </div>
        <div class="c-slot">
          <div class="c-slot-k">C</div>
          <div class="c-slot-t">Attack on Titan</div>
        </div>
      </div>

    </div>
  </div>

</div>
</body>
</html>"""

# Inject logo
HTML = HTML.replace("LOGO_URI_PLACEHOLDER", logo_uri)

output_path = os.path.join(project_dir, 'public', 'quiz-poster-alternatives.html')
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(HTML)
print(f"Written: {output_path}")
print(f"Size: {len(HTML):,} bytes")
