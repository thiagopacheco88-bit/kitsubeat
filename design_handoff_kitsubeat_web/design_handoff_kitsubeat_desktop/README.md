# Handoff: KitsuBeat Desktop Home

## Overview
KitsuBeat is a Japanese language learning app where users learn vocabulary and grammar from J-pop/J-rock/anime songs. This handoff covers the **desktop web home screen** (1280px viewport), adapted from the existing mobile home. It's the logged-in landing page: it surfaces today's featured song, the user's learning progress, recently played songs, and the word of the day.

## About the Design Files
The files in this bundle are **design references created in HTML/React+Babel** — prototypes showing the intended look, layout, and behavior. They are **not production code to copy directly**. The task is to **recreate these HTML designs in the target codebase's existing environment** (Next.js, Remix, Vite + React, etc.) using its established component library, styling conventions, and routing patterns. If no environment exists yet, pick the most appropriate stack for the project.

Two design files are included so you can see both form factors:
- `KitsuBeat Home Desktop.html` + `home-desktop.jsx` — **this handoff's target (desktop, 1280px)**
- `KitsuBeat Home.html` + `home-screen.jsx` + `ios-frame.jsx` — the mobile source design, for reference only

## Fidelity
**High-fidelity.** Exact colors, spacing, typography, and component structure are defined. Recreate pixel-perfectly using the codebase's existing primitives. Tokens below are the source of truth.

---

## Design Tokens

### Colors
```
--kb-bg          #0E0E0E   app background (outer)
--kb-bg-2        #111111   sidebar background
--kb-card        #191919   card fill
--kb-card-2      #1E1E1E   raised card fill (reserved)
--kb-border      rgba(255,255,255,0.06)  default card stroke
--kb-border-st   rgba(255,255,255,0.10)  stronger stroke / dividers
--kb-text        #F5F5F4   primary text
--kb-muted       rgba(245,245,244,0.56)  secondary text
--kb-dim         rgba(245,245,244,0.40)  tertiary / mono eyebrow text
--kb-red         #ef4444   brand accent (single accent — use sparingly)
```

#### Grammar-type colors (used for word tags)
```
noun  #3b82f6
verb  #ef4444
adj   #22c55e
```

#### JLPT level colors (used for level badges)
```
N5  #22c55e
N4  #3b82f6
N3  #f59e0b
N2  #f97316
N1  #ef4444
```
JLPT badges render as: text color = level color, background = `${c}1F` (≈12% alpha), inset 1px ring = `${c}40` (≈25% alpha). Pill shape, `border-radius: 999px`.

### Typography
Font families:
- **SANS (UI):** `-apple-system, "SF Pro Text", "Inter", system-ui, sans-serif`
- **JP (Japanese):** `"Noto Sans JP", -apple-system, system-ui` — weights 400/500/600/700 loaded from Google Fonts
- **MONO (eyebrow labels, keycaps, counters):** `ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace`

Used type scale (desktop):
| Role | Font | Size | Weight | Letter-spacing | Notes |
|---|---|---|---|---|---|
| Page greeting (English) | SANS | 28px | 700 | -0.6 | line-height 1.1 |
| Page greeting (JP) | JP | 15px | 500 | 0.2 | red, subtle glow |
| Hero title (JP) | JP | 44px | 700 | -1.2 | line-height 1.05 |
| Hero subtitle | SANS | 16px | 400 | — | rgba(255,255,255,0.72) |
| Word-of-day kanji | JP | 72px | 600 | -2 | line-height 0.95 |
| Word-of-day romaji | MONO | 18px | 400 | — | muted |
| Section title | SANS | 18px | 700 | -0.3 | |
| Section subtitle (JP) | MONO | 11px | 400 | 0.5 | dim |
| Song card title | JP | 15px | 650 | -0.2 | ellipsize |
| Song card artist | SANS | 12px | 400 | — | muted |
| Nav item | SANS | 14px | 500 / 650 active | -0.1 | |
| Sidebar section label | MONO | 10px | — | 1.2 | UPPERCASE, dim |
| Stat value | SANS | 18–30px | 700 | -0.3 to -0.8 | |
| Stat label | MONO | 10–11px | — | 0.4 | UPPERCASE, muted |

### Radii
```
8   mono chip / kbd
10  small button / segment
12  nav item / top bar inputs
14  song art
16  stat tile / rail cards
18  song card / CTA / rail cards
20  word-of-day card
22  hero corners (mobile) / CTA (mobile)
24  hero corners (desktop)
26  primary rounded button (pill-like)
999 badges / streak pill / chip pills
```

### Shadows / rings (as used)
- Card ring: `inset 0 0 0 1px rgba(255,255,255,0.06)`
- Card ring (stronger): `inset 0 0 0 1px rgba(255,255,255,0.10)`
- Hero red ring + lift: `inset 0 0 0 1px rgba(239,68,68,0.32), 0 16px 40px rgba(239,68,68,0.14)`
- Red inner glow on hero: `inset 0 0 80px rgba(239,68,68,0.18)`
- Primary red button: `0 8px 22px rgba(239,68,68,0.45)`
- Continue CTA: `0 8px 24px rgba(239,68,68,0.28), inset 0 1px 0 rgba(255,255,255,0.15)`
- Logo glow: `filter: drop-shadow(0 0 14px rgba(239,68,68,0.32))`
- Active nav rail indicator: 3px red bar, `box-shadow: 0 0 12px rgba(239,68,68,0.7)`

### Ambient background (outer stage)
Two stacked radial gradients over `#0a0a0a`:
```
radial-gradient(1400px 800px at 10% -10%, rgba(239,68,68,0.06), transparent 60%),
radial-gradient(1100px 700px at 90% 110%, rgba(59,130,246,0.04), transparent 60%)
```

### Placeholder album art
Songs don't yet have real artwork. Placeholder recipe (per song `hue` value):
```
background: linear-gradient(135deg, oklch(0.34 0.08 <hue>) 0%, oklch(0.22 0.06 <hue>) 100%);
overlay:    repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 14px);
inset ring: inset 0 0 0 1px rgba(255,255,255,0.08);
```
Replace with real cover art when available.

---

## Layout (Desktop, 1280px)

Root is a **horizontal flex** container, `width: 1280px`, `min-height: 900px`, `background: var(--kb-bg)`, `border-radius: 14px`, `overflow: hidden`, with the ambient gradients layered underneath (pointer-events: none).

Three columns:

| Column | Width | Notes |
|---|---|---|
| **Sidebar** | `240px` fixed | sticky, full-viewport height, right border `1px` `--kb-border`, bg `--kb-bg-2`, padding `28px 20px 24px` |
| **Main** | fluid (`flex: 1`) | padding `28px 24px 40px`, `min-width: 0` |
| **Right rail** | `280px` fixed | padding `28px 24px 24px 0`, column flex gap `14px`. Optional — hide-able. |

---

## Screens / Views

### 1. Sidebar (240px)

Vertical stack, top → bottom:

1. **Logo** (`assets/logo-horizontal.png`): height `36px`, width auto, padding `0 8px 20px`, `drop-shadow(0 0 14px rgba(239,68,68,0.32))`.
2. **Section label "Menu"** — MONO 10px, uppercase, dim, padding `4px 12px 8px`.
3. **Nav list** — 4 items, gap `4px`. Each item = `SideNavItem`:
   - Height `44px`, padding `0 12px`, radius `12px`, `display: flex; gap: 12px; align-items: center`.
   - Inactive: transparent background, text `--kb-muted`, weight 500.
   - Active: background `rgba(239,68,68,0.12)`, inset ring `rgba(239,68,68,0.22)`, text `--kb-red`, weight 650. Plus a **3px red rail** positioned `left: -16px; top: 10px; bottom: 10px`, radius 2, shadow `0 0 12px rgba(239,68,68,0.7)`.
   - Icons: 20px, stroke 1.8, match text color. Active icons get `fill=color` for filled glyphs (home, disc center, cards rect, user head).
   - Items: `Home` (home icon), `Songs` (disc), `Review` (cards), `Profile` (user).
4. **Flex spacer** pushes the stat card to the bottom.
5. **Stats card** (streak + XP):
   - Container: padding `14`, radius `16`, bg `--kb-card`, inset ring `--kb-border`, column flex gap `12`.
   - Row 1 (streak): 36×36 rounded 12 tile with bg `rgba(239,68,68,0.14)`, inset ring `rgba(239,68,68,0.25)`, flame icon 18px red. Next to it: value `47` (18/700, -0.3), label `DAY STREAK` (MONO 10, muted, uppercase).
   - 1px divider `--kb-border`.
   - Row 2 (XP): same layout but neutral tile bg `rgba(255,255,255,0.04)` + ring `--kb-border`, zap icon 18 muted, value `1,240`, label `TOTAL XP`.

### 2. Top bar (inside main)

Horizontal flex, space-between, gap 20, `margin-bottom: 28px`.

**Left — greeting block:**
- JP line: `おかえり、Aiko` — JP 15/500, `--kb-red`, `text-shadow: 0 0 18px rgba(239,68,68,0.3)`, margin-bottom 4.
- EN line: `Welcome back, Aiko` — SANS 28/700, `-0.6`, `--kb-text`, line-height 1.1.

**Right — search + notifications:**
- **Search field:** height 42, padding `0 14px`, width `300px`, radius 12, bg `--kb-card`, inset ring `--kb-border`. Row: search icon 16 dim, placeholder "Search songs, words, artists…" (SANS 13 dim), spacer, `⌘K` keycap (MONO 10, padding `2px 6px`, radius 4, inset ring `--kb-border-st`).
- **Notifications button:** 42×42, radius 12, bg `--kb-card`, inset ring `--kb-border`, bell icon 18 muted. Red dot indicator 7×7 at `top: 10; right: 11`, shadow `0 0 6px rgba(239,68,68,0.7)`.

### 3. Hero card (today's track)

- Container: height 280, radius 24, relative, overflow hidden, margin-bottom 22.
- Ring + lift: `inset 0 0 0 1px rgba(239,68,68,0.32), 0 16px 40px rgba(239,68,68,0.14)`.
- Layered fills:
  1. Base gradient: `linear-gradient(110deg, oklch(0.52 0.18 20) 0%, oklch(0.38 0.14 18) 50%, oklch(0.22 0.08 18) 100%)`.
  2. Diagonal texture: `repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0 2px, transparent 2px 20px)`.
  3. Left-vignette: `linear-gradient(90deg, rgba(10,10,10,0.75) 0%, rgba(10,10,10,0.45) 40%, transparent 70%)`.
  4. Red inner glow: `inset 0 0 80px rgba(239,68,68,0.18)`.
- Content padding `26px 32px`, column flex, space-between.

Top row:
- Eyebrow: `今日の一曲 · TODAY'S TRACK` — MONO 11, letter-spacing 1.4, uppercase, `rgba(255,255,255,0.75)`.
- Badge pill: `✦ NEW FOR YOU` — sparkle icon 10 + text, MONO 10 white, letter-spacing 1, padding `6px 10px`, radius 999, bg `rgba(239,68,68,0.22)`, inset ring `rgba(239,68,68,0.5)`.

Bottom row (align-end, space-between, gap 24):
- **Left (max-width 560):**
  - Chip row (gap 10): JLPT `N3` badge; then two bordered chips: `42 WORDS` and `4:21` (MONO 11, padding `4px 10px`, radius 999, inset ring white/18%).
  - Title `夜に駆ける` — JP 44/700, `-1.2`.
  - Subtitle `Yoru ni Kakeru · YOASOBI` — SANS 16, `rgba(255,255,255,0.72)`, margin-top 8.
- **Right — two buttons (gap 10):**
  - **Start session** (primary): height 52, padding `0 22px 0 18px`, radius 26, bg `--kb-red`, color white, SANS 14/650, play icon 16, shadow `0 8px 22px rgba(239,68,68,0.45)`.
  - **Preview** (secondary): height 52, padding `0 18px`, radius 26, bg `rgba(255,255,255,0.08)`, inset ring white/18%, backdrop-blur 6, SANS 14/600 white.

### 4. Continue learning CTA (full-width band)

- Button, width 100%, height 72, radius 18, bg `--kb-red`, padding `0 20px`, gap 16, margin-bottom 34.
- Shadow: `0 8px 24px rgba(239,68,68,0.28), inset 0 1px 0 rgba(255,255,255,0.15)`.
- Left: 44×44 round 22 tile, bg `rgba(255,255,255,0.18)`, play icon 16 white.
- Middle: title `Continue learning` (SANS 16/700, -0.2), subtitle `Pretender — 5 words remaining · ~3 min to finish` (SANS 13, opacity 0.85).
- Right: `RESUME ›` — MONO 11, letter-spacing 0.6, opacity 0.9, chev 14 white.

### 5. Recently played — section + 3-column grid

Header row (baseline, space-between, margin-bottom 14):
- Title: `Recently played` (SANS 18/700, -0.3).
- Subtitle: `最近聴いた曲` (MONO 11/0.5 dim).
- Right action: `See all ›` — SANS 13 muted, chev 12 muted.

Grid: `grid-template-columns: repeat(3, 1fr)`, gap 16. 6 cards total (2 rows × 3).

Each **SongCard**:
- Container: bg `--kb-card`, radius 18, padding 12, inset ring `--kb-border`, cursor pointer.
- Art (square): `aspect-ratio: 1 / 1`, radius 14, placeholder gradient (see recipe) using the song's `hue` value. Overlay:
  - Top-right: JLPT badge (small variant, height 20).
  - Bottom-left: tag MONO 10 uppercase in `rgba(255,255,255,0.5)` (e.g. `J-POP`, `ANIME`).
  - Bottom-right: 38×38 round play button, bg `rgba(17,17,17,0.72)`, backdrop-blur 10, inset ring white/15%.
- Body padding `14px 4px 4px`:
  - Title (JP 15/650 -0.2, ellipsize).
  - Artist (SANS 12 muted, ellipsize).
  - Progress row margin-top 12, gap 10: bar (flex 1, height 3, radius 2, bg white/8%) with inner fill width `progress%` colored by JLPT level; then MONO 10 dim `{progress}%`.

Seed data used (hue tuned for each card):
```js
[
  { title: 'Pretender',   romaji: 'Pretender',      artist: 'Official HIGE DANdism', level: 'N4', progress: 68,  hue: 40,  tag: 'J-POP'   },
  { title: '夜に駆ける',    romaji: 'Yoru ni Kakeru', artist: 'YOASOBI',               level: 'N3', progress: 42,  hue: 20,  tag: 'J-POP'   },
  { title: '紅蓮華',        romaji: 'Gurenge',        artist: 'LiSA',                  level: 'N2', progress: 24,  hue: 28,  tag: 'ANIME'   },
  { title: 'KICK BACK',    romaji: 'Kick Back',      artist: '米津玄師',              level: 'N3', progress: 91,  hue: 60,  tag: 'ROCK'    },
  { title: '春よ、来い',    romaji: 'Haru yo, Koi',   artist: '松任谷由実',            level: 'N5', progress: 100, hue: 140, tag: 'CLASSIC' },
  { title: 'Lemon',         romaji: 'Lemon',          artist: '米津玄師',              level: 'N4', progress: 55,  hue: 95,  tag: 'J-POP'   },
]
```

### 6. Word of the day

Header row identical pattern: `Word of the day` / `今日の単語` / action `More words ›`.

Card: padding 24, radius 20, bg `--kb-card`, inset ring `--kb-border`. Internal layout: `grid-template-columns: 1fr 1px 1fr`, gap 24, align-items stretch.

**Left cell:**
- Chip row (gap 10): JLPT `N4` (small), grammar chip with dot: text `VERB · GODAN`, color `--grammar-verb` (`#ef4444`), bg `rgba(239,68,68,0.08)`, inset ring `rgba(239,68,68,0.20)`, MONO 10 uppercase, padding `3px 8px`, radius 999.
- Word: `駆ける` — JP 72/600, `-2`, line-height 0.95.
- Romaji: `kakeru` — MONO 18 muted.
- Gloss: `to dash · to run · to gallop` — SANS 15 text, margin-top 16, line-height 1.45.

**Middle divider:** 1px column, bg `--kb-border`.

**Right cell** (column flex, space-between):
- Eyebrow `EXAMPLE · 例文` — MONO 10/1.2 dim.
- Sentence: `夜の街を<strong>駆け</strong>ていく。` — JP 20, line-height 1.4, `-0.2`. The highlighted `駆け` substring is `--kb-red` weight 600.
- Translation: `I'm dashing through the night-time streets.` — SANS 13 muted.
- Source: `from · 夜に駆ける · YOASOBI` — MONO 11 dim.
- Button row (margin-top 18, gap 8):
  - Primary subtle `+ Add to review`: height 38, padding `0 16px`, radius 10, bg `rgba(239,68,68,0.14)`, text `--kb-red`, inset ring `rgba(239,68,68,0.28)`, SANS 12.5/650.
  - Secondary `Hear it`: same size, bg `rgba(255,255,255,0.04)`, inset ring `--kb-border`, text `--kb-text`, SANS 12.5/600.

### 7. Right rail (280px)

Three stacked cards, gap 14.

**a. Daily goal** (padding 18, radius 18, `--kb-card`, inset `--kb-border`):
- Header row: `Daily goal` (SANS 13/700) + `今日` (MONO 10 dim).
- Ring: 140×140, stroke 10. Track `rgba(255,255,255,0.08)`. Progress stroke: linear gradient `#f87171 → #ef4444` top-left to bottom-right, `stroke-linecap: round`, rotated -90°. Apply `drop-shadow(0 0 8px rgba(239,68,68,0.5))`.
- Centered label: value `23` (SANS 30/700 -0.8) + `/ 40 words` (MONO 11 muted).
- Footer copy (centered, SANS 12 muted): `<b>17 more</b> to hit today's goal` — the count number uses `--kb-text`, weight 600.

**b. Streak week** (padding 16, radius 18, `--kb-card`, inset `--kb-border`):
- Header row: `Streak` + red flame 14 + `47` (SANS 13/700 red).
- 7-column grid gap 8: M T W T F S S. Each day is a column:
  - 26×26 round 13 chip. Done: bg `rgba(239,68,68,0.18)`, inset ring `rgba(239,68,68,0.35)`, inner 8×8 red dot. Not done: transparent bg, inset ring `--kb-border`.
  - Today (index 4 = Fri) gets an extra glow on the dot: `0 0 10px rgba(239,68,68,0.9)`, and its letter is red + bold.
  - Day letter below: MONO 10, dim (or red bold if today).
- Status array used: `[true, true, true, true, true, false, false]`.

**c. This week stats** (padding `4px 18px 14px`, radius 18, `--kb-card`, inset `--kb-border`):
- Header `This week` (SANS 13/700, padding `14 0 6`).
- Rows with bottom border `--kb-border`, vertical padding `12 0`:
  - `Words today` / `今日の単語` — value `23` (red accent).
  - `Songs this week` / `今週の曲` — value `7`.
  - `Review accuracy` / `復習の正確さ` — value `87%`.
- Last row (no border): `JLPT target` / `目標` with JLPT `N3` badge (normal size).

Row label: SANS 13/600 text + MONO 10 dim jp subtitle. Value: SANS 18/700, `-0.4`.

---

## Interactions & Behavior

- **Nav items**: click → route to `/home`, `/songs`, `/review`, `/profile`. Persist active state from router.
- **Hero Start session**: opens the listening/vocab session for the featured song.
- **Hero Preview**: opens a short audio preview modal or inline player.
- **Continue learning CTA**: resumes the in-progress song's session at the next unknown word.
- **Song card click**: opens song detail. The 38×38 play button on the art is a separate click target that starts playback directly (stopPropagation).
- **Word of the day → Add to review**: adds `駆ける` to the user's SRS review deck, with an optimistic toast.
- **Word of the day → Hear it**: plays TTS or pulls the pronunciation audio.
- **Notifications bell**: opens a panel; red dot is driven by unread count > 0.
- **⌘K / Ctrl+K**: opens a command palette / search overlay (implementation up to the app shell).
- **See all / More words**: routes to the full list page.

### Hover / focus states
Not rendered explicitly in the design — apply the codebase's default hover/focus affordances. Suggested:
- Buttons: 4% white overlay on hover, visible focus ring using `--kb-red` at 0.4 alpha, 2px offset.
- Song cards: translate-y(-2px) or slight brighten on hover (120ms ease).
- Nav items: bg `rgba(255,255,255,0.04)` on hover when inactive.

### Animations
- Transitions use 120–200ms ease. Keep motion subtle; the design is dark and the red glow carries most of the visual energy.

---

## State Management

Required client state (exact shape is codebase-specific):
- `user` — `{ name, streak, xp, jlptTarget }`
- `todayTrack` — `{ id, title, romaji, artist, level, wordCount, duration, hue, isNew }`
- `continueSession` — `{ songTitle, wordsRemaining, minutesRemaining }`
- `recentlyPlayed` — array of songs (see seed shape above)
- `wordOfDay` — `{ word, reading, pos, subPos, glosses[], example: { jp, jpHighlight, en }, source: { song, artist } }`
- `dailyGoal` — `{ done, goal }`
- `streakWeek` — array of 7 booleans in Mon→Sun order, plus `todayIndex`
- `weekStats` — `{ wordsToday, songsThisWeek, reviewAccuracy }`
- `notifications.unread` — number

Data fetching: all of the above should load in parallel on route entry. The page is server-renderable; only the ⌘K palette and playback controls need client interactivity.

---

## Assets

- `assets/logo-horizontal.png` — KitsuBeat horizontal wordmark. Used in the sidebar at 36px tall. Apply the red drop-shadow for the subtle glow.
- No icons are imported from a library in the prototype; all icons are inline SVG (flame, play, book, zap, home, disc, cards, user, chevron-right, sparkle, search, bell). Replace with the app's icon set (Lucide, Phosphor, Heroicons, etc.) — match stroke width (1.6–1.8) and sizes (sidebar 20, buttons 14–18).
- Song cover art is **placeholder**. Production should render the real album art with the same rounded corners; if art is missing, fall back to the hue-based gradient recipe.

---

## Files in this bundle

- `KitsuBeat Home Desktop.html` — desktop shell (scaling stage, Tweaks panel, Babel/React setup). **Target design.**
- `home-desktop.jsx` — all desktop components (Sidebar, TopBar, HeroCard, ContinueCTA, RecentlyPlayedGrid, WordOfDay, RightRail, atoms).
- `KitsuBeat Home.html` — mobile shell (reference only).
- `home-screen.jsx` — mobile components (reference only, shows the source system).
- `ios-frame.jsx` — device bezel used by the mobile prototype (reference only; do not ship).
- `assets/logo-horizontal.png` — the logo bitmap.
- `README.md` — this document.

## Implementation notes

- The design was built with inline styles for prototyping speed. Migrate tokens to your styling system (Tailwind theme config, CSS variables, styled-components theme, etc.) — don't port inline styles verbatim.
- `oklch()` is used for placeholder album art. All modern targets support it; if you need a fallback, convert to `hsl()` at build time.
- Noto Sans JP is loaded via Google Fonts; self-host it in production.
- The prototype has a "Tweaks" panel (right-rail shown/hidden, density). Ignore it — it's an iteration tool, not a product feature.
- No responsive breakpoints below 1280 are specified. If the app needs <1280, collapse the right rail first, then the sidebar to icon-only.
