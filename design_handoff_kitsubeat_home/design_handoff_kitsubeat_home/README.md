# Handoff: KitsuBeat Mobile Home Screen

## Overview
High-fidelity mobile home screen for **KitsuBeat** — a Japanese music-based vocabulary learning app. iOS-style, dark theme. This is the primary landing view after login: greeting, today's featured song, daily stats, a "continue learning" CTA, a horizontal carousel of recently played songs, a word-of-the-day card, and a bottom tab bar.

## About the Design Files
The files in this bundle are **design references created in HTML** — a working prototype showing intended look, layout, and behavior. They are **not production code to copy directly**.

Your task is to **recreate this design in the target codebase's existing environment** (the brief calls for Next.js + Tailwind) using its established patterns, component library, and conventions. If no codebase exists yet, scaffold a Next.js + Tailwind app and implement the design there.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, and interactions are final. Recreate pixel-perfectly using the target codebase's styling approach (Tailwind utility classes are preferred per the brief).

## Screens / Views

### Home screen
- **Purpose**: Give the user a warm re-entry into the app, surface today's learning material, celebrate streak, and provide one obvious next action.
- **Device frame**: 390 × 844 (iPhone 14/15 class). Dark background `#111111`. Content scrolls vertically; bottom nav is pinned.
- **Top-to-bottom layout** (all padding values in px):
  1. **Status bar** (iOS system, 54px reserved at top)
  2. **Header row** — 44px tall logo on the left, flame+streak pill on the right. Padding `8px 20px 18px`.
  3. **Greeting** — two-line stack, padding `8px 20px 18px`.
  4. **Hero card (Today's Track)** — 260px tall, margin `0 20px 22px`, radius 22.
  5. **Stats row** — 3 equal tiles, gap 10, padding `0 20px 18px`.
  6. **Continue Learning CTA** — 60px tall, radius 18, padding `0 20px 26px`.
  7. **Recently played** — section header + horizontal scroll of 5 cards.
  8. **Word of the day** — card, margin `0 20px 28px`.
  9. **Bottom nav** — pinned, 68px floating pill with 34px safe-area padding.

## Components (detailed)

### Header
- Logo: `assets/logo-horizontal.png` (rendered at height 44px, auto width). Apply a soft red drop-shadow: `drop-shadow(0 0 14px rgba(239,68,68,0.32))`. **Use the provided PNG as-is; do not redraw.**
- Streak pill: 34px tall, radius 999, bg `rgba(239,68,68,0.10)`, inner border `rgba(239,68,68,0.25)`. Contains flame icon (16px, `#ef4444`) + streak number in white, 14px, weight 650.

### Greeting
- Line 1: `おかえり、` — 26px, weight 600, color `#ef4444`, Noto Sans JP, `letter-spacing: -0.3`, `text-shadow: 0 0 24px rgba(239,68,68,0.35)`, `line-height: 1.1`.
- Line 2: `Welcome back, Aiko` — 26px, weight 700, color `#F5F5F4`, `letter-spacing: -0.6`, `margin-top: 4`.

### Hero card — Today's Track (full-bleed variant)
- Container: 260px tall, radius 22, `overflow: hidden`. Shadow: `inset 0 0 0 1px rgba(239,68,68,0.35), 0 12px 32px rgba(239,68,68,0.18)` — the red border + outer glow are essential.
- Background album art placeholder (fills entire card): linear-gradient `160deg, oklch(0.52 0.18 20) 0%, oklch(0.38 0.14 18) 45%, oklch(0.22 0.08 18) 100%`. Overlay diagonal stripes at `135deg, rgba(255,255,255,0.06) 0 2px, transparent 2px 18px` for texture.
- **Darken only the bottom ~55%**: absolute-positioned div, `bottom: 0; height: 55%`, `linear-gradient(180deg, transparent 0%, rgba(10,10,10,0.55) 45%, rgba(10,10,10,0.88) 100%)`. This keeps art visible at top.
- Inner red glow: `inset 0 0 60px rgba(239,68,68,0.18)`.
- Top-left eyebrow: `今日の一曲 · TODAY'S TRACK` — 10px mono, `letter-spacing: 1.2`, uppercase, color `rgba(255,255,255,0.72)`. Positioned `top: 14, left: 14`.
- Bottom content row (absolute `left: 18, right: 18, bottom: 16`, flex end-aligned):
  - Left stack: JLPT N3 badge (see badge spec) + `42 WORDS` mono pill (10px mono, radius 999, 1px inner border at `rgba(255,255,255,0.10)`). Then title `夜に駆ける` (22px, weight 700, white, `letter-spacing: -0.3`, `line-height: 1.15`) and subtitle `Yoru ni Kakeru · YOASOBI` (13px, `rgba(245,245,244,0.56)`, `margin-top: 2`).
  - Right: play button — 52 × 52 circle, bg `#ef4444`, white play glyph (18px), shadow `0 6px 20px rgba(239,68,68,0.45)`.

### Hero card — Standard variant (alt via Tweaks)
- 16px padding, radius 22, bg `#191919`, inner border `rgba(255,255,255,0.10)`.
- Red radial glow top-left: `radial-gradient(120% 80% at 20% 0%, rgba(239,68,68,0.18) 0%, transparent 60%)`.
- Eyebrow row (mono): `今日の一曲 · TODAY'S TRACK` left, `NEW` in red with sparkle icon right.
- Content row: 84×84 album art + info column (N3 badge, title 18/700, subtitle `YOASOBI` 12.5px muted, meta `42 WORDS · 4:21` in mono 11) + 48×48 red play button.

### Stats row (3 tiles)
- Each: `flex: 1`, padding `14px 12px`, radius 16, bg `#191919`, inner border `rgba(255,255,255,0.06)`.
- Icon top (16px), value 22/700 (`letter-spacing: -0.5`), label 11px uppercase mono, color `rgba(245,245,244,0.56)`, `letter-spacing: 0.3`.
- Tiles, left→right:
  1. Flame (red) · `47` (value rendered in **red `#ef4444`** — accent tile) · `DAY STREAK`
  2. Book · `23` · `WORDS TODAY`
  3. Lightning · `1,240` · `XP`

### Continue Learning CTA
- Full-width, 60px tall, radius 18, bg `#ef4444`, shadow `0 4px 16px rgba(239,68,68,0.30)`.
- Bold variant (via tweaks): gradient `linear-gradient(180deg, #f87171 0%, #ef4444 100%)` + stronger shadow + inner top highlight.
- Left: 36×36 rounded icon chip, bg `rgba(255,255,255,0.18)`, white play glyph.
- Center: stacked white text — title `Continue learning` (15/650, `letter-spacing: -0.2`), subtitle `Pretender · 5 words remaining` (12, 82% opacity).
- Right: chevron, 14px, white.

### Recently played (horizontal scroll)
- Section header row: title `Recently played` (17/700, `letter-spacing: -0.3`) over subtitle `最近聴いた曲` (11px mono muted, `letter-spacing: 0.4`). Right side: `See all` link (13, muted).
- Cards, 168px wide, gap 12, padding `0 20px 4px`, `overflow-x: auto`. Hide scrollbar.
- **Card**: radius 18, bg `#191919`, padding 10, inner border `rgba(255,255,255,0.06)`.
  - Inner album art: 148 × 148 radius 18, same striped gradient placeholder (`hue` varies per card).
  - JLPT badge pinned `top: 8, right: 8`.
  - Mini play button `right: 8, bottom: 8`: 32 × 32, bg `rgba(17,17,17,0.7)` with `backdrop-filter: blur(10px)`, inner border `rgba(255,255,255,0.15)`.
  - Title 14/650 + artist 11 muted.
  - Progress row: 3px bar at `rgba(255,255,255,0.08)` fill colored by JLPT level, percent text 10 mono right.
- **Data** (ship these in `recentlyPlayed.ts`):
  ```
  [
    { title: 'Pretender',  artist: 'Official HIGE DANdism', level: 'N4', progress: 68, hue: 40, tag: 'J-POP' },
    { title: '夜に駆ける',  artist: 'YOASOBI',              level: 'N3', progress: 42, hue: 20, tag: 'J-POP' },
    { title: '紅蓮華',      artist: 'LiSA',                 level: 'N2', progress: 24, hue: 28, tag: 'ANIME' },
    { title: 'KICK BACK',   artist: '米津玄師',             level: 'N3', progress: 91, hue: 60, tag: 'ROCK' },
    { title: '春よ、来い',  artist: '松任谷由実',           level: 'N5', progress: 100, hue: 140, tag: 'CLASSIC' },
  ]
  ```

### Word of the day
- Card radius 18, bg `#191919`, padding 16, inner border `rgba(255,255,255,0.06)`.
- Top row: eyebrow `今日の単語 · Word of the day` (10 mono uppercase muted) + N4 badge.
- Main: Japanese term `駆ける` in Noto Sans JP, 34px, weight 600, `letter-spacing: -1`, white; alongside romaji `kakeru` (13, muted).
- Grammar chip: 6px verb-red dot + `VERB` (11 mono red, `letter-spacing: 0.6`) + ` · to dash, to run` (13, muted).

### Bottom nav (pinned)
- Wrapper: `position: absolute, bottom: 0`, gradient fade `linear-gradient(180deg, rgba(17,17,17,0) 0%, #111 28%)`, padding `12px 0 34px` (the 34px is the safe-area).
- Pill: margin `0 16px`, height 68, radius 24, bg `rgba(22,22,22,0.92)` with `backdrop-filter: blur(20px) saturate(160%)`, shadow `inset 0 0 0 1px rgba(255,255,255,0.10), 0 10px 28px rgba(0,0,0,0.5)`.
- 4 tabs (equal flex): Home, Songs, Review, Profile.
- **Active state (Home)**:
  - Top red bar: 26 × 3 at `top: 0`, centered, bg `#ef4444`, shadow `0 0 10px rgba(239,68,68,0.7)`.
  - Icon chip: 44 × 28 radius 10, bg `rgba(239,68,68,0.14)`.
  - Icon fill and label: `#ef4444`. Label weight 700.
- **Inactive**: icon outline only in muted, label 10/500 muted.
- All labels: 10px, `letter-spacing: 0.2`.

## Interactions & Behavior
- Tapping any bottom-nav tab switches `active` state (local state for now — wire to router in Next.js: `/`, `/songs`, `/review`, `/profile`).
- Tapping the hero play button starts playback for the featured song.
- Tapping a recently-played card opens that song's detail/lesson route.
- Tapping the Continue CTA resumes the last incomplete lesson.
- Horizontal carousel: native touch scroll (`overflow-x: auto`), scrollbar hidden (`::-webkit-scrollbar { display: none }` + `scrollbar-width: none`).
- No entry animations in this spec — keep it instant and crisp. Optional: 120ms fade-in on mount.

## State Management
Client-side state needed for this screen:
- `user`: `{ name, avatarUrl, streakDays, wordsToday, xp }`
- `featuredSong`: `{ title, titleRomaji, artist, jlptLevel, wordCount, durationSeconds, coverUrl }`
- `continueLesson`: `{ songTitle, wordsRemaining, lessonId }`
- `recentlyPlayed`: array as shown above
- `wordOfDay`: `{ jp, romaji, grammarType: 'noun'|'verb'|'adj', jlptLevel, gloss }`
- `activeTab`: `'home' | 'songs' | 'review' | 'profile'`

Fetch on mount via server component or SWR — these are all read-only for this screen.

## Design Tokens

### Colors
| Token | Value | Use |
|---|---|---|
| `bg` | `#111111` | App background |
| `card` | `#191919` | Card surfaces |
| `card-2` | `#1E1E1E` | (reserved for layered cards) |
| `border` | `rgba(255,255,255,0.06)` | Subtle card borders |
| `border-strong` | `rgba(255,255,255,0.10)` | Prominent borders, nav |
| `text` | `#F5F5F4` | Primary text |
| `muted` | `rgba(245,245,244,0.56)` | Secondary text |
| `dim` | `rgba(245,245,244,0.40)` | Tertiary / meta |
| `accent` | `#ef4444` | Primary red accent |

Grammar color system:
| Type | Value |
|---|---|
| noun | `#3b82f6` |
| verb | `#ef4444` |
| adj  | `#22c55e` |

JLPT levels:
| Level | Value |
|---|---|
| N5 | `#22c55e` |
| N4 | `#3b82f6` |
| N3 | `#f59e0b` |
| N2 | `#f97316` |
| N1 | `#ef4444` |

Badge pattern: `color = JLPT[level]`; background = `${c}1F` (12% alpha hex); inner border = `${c}40` (25% alpha).

### Typography
- UI: `-apple-system, "SF Pro Text", system-ui` (in Next.js use the Inter fallback via `next/font` or keep system stack).
- Japanese: `"Noto Sans JP"` weights 400/500/600/700 (Google Fonts).
- Mono: `ui-monospace, "SF Mono", monospace` — used for eyebrows, meta, percentages.

### Spacing
- Page horizontal padding: 20px.
- Section vertical rhythm: 18–28px between sections.
- Card internal padding: 16px (hero standard, word-of-day) or 10px (song cards).

### Radius
- Cards: 22 (hero), 18 (CTA, song card, word card), 16 (stat tile), 10 (active-icon chip).
- Pills / badges: 999.

### Shadows
- Card borders: `inset 0 0 0 1px <border>`.
- Hero: `inset 0 0 0 1px rgba(239,68,68,0.35), 0 12px 32px rgba(239,68,68,0.18)`.
- Red CTA (subtle): `0 4px 16px rgba(239,68,68,0.30)`.
- Red CTA (bold): `0 8px 24px rgba(239,68,68,0.40), inset 0 1px 0 rgba(255,255,255,0.2)`.
- Play button (hero): `0 6px 20px rgba(239,68,68,0.45)`.
- Nav pill: `inset 0 0 0 1px rgba(255,255,255,0.10), 0 10px 28px rgba(0,0,0,0.5)`.

## Assets
- `assets/logo-horizontal.png` — KitsuBeat horizontal wordmark + fox mascot. Use as-is; render at 44px height. Do not redraw.
- All album art in this prototype is **placeholder** (diagonal-stripe gradient with a small mono label like `J-POP`). Replace with real cover art from your backend; keep the same dimensions and radii.
- All icons are inline SVG (flame, book, zap, home, disc, cards, user, chevron-right, play, sparkle). Feel free to swap for Lucide / Heroicons equivalents — sizes and stroke weights (1.6–1.8) in the JSX are the target.

## Tailwind mapping hints
- `bg-[#111]`, `bg-[#191919]`, `text-[#F5F5F4]`.
- Arbitrary values OK for the `rgba(239,68,68,...)` shadows.
- Add to `tailwind.config.ts`:
  ```ts
  theme: {
    extend: {
      colors: {
        kb: {
          bg: '#111', card: '#191919', accent: '#ef4444',
          n5: '#22c55e', n4: '#3b82f6', n3: '#f59e0b', n2: '#f97316', n1: '#ef4444',
          noun: '#3b82f6', verb: '#ef4444', adj: '#22c55e',
        }
      },
      fontFamily: {
        jp: ['"Noto Sans JP"', 'system-ui'],
        mono: ['ui-monospace', '"SF Mono"', 'monospace'],
      }
    }
  }
  ```

## Files in this bundle
- `KitsuBeat Home.html` — entry HTML, mounts the React prototype.
- `home-screen.jsx` — all KitsuBeat components (Header, Greeting, HeroCard, StatsRow, ContinueCTA, RecentlyPlayed, WordOfDay, BottomNav, KitsuHome). **Primary reference.**
- `ios-frame.jsx` — the device chrome used to preview the design. Not needed in production; included so the developer can run the prototype locally and inspect measurements.
- `assets/logo-horizontal.png` — ship this as-is into `/public`.

## How to run locally
```
# From the handoff folder, serve over any static server, e.g.:
npx serve .
# then open http://localhost:3000/KitsuBeat%20Home.html
```

## Out of scope for this handoff
- Songs / Review / Profile tab content.
- Song detail / lesson player.
- Onboarding, auth, settings.
- Light theme.

Ask if anything is ambiguous before deviating from this spec.
