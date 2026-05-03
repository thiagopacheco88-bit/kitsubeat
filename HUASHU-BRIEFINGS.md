# Huashu-Design Briefings — KitsuBeat Layout Revamp

**How to use:** After `/exit` and restarting Claude Code, paste one of the briefings below into a new session. Huashu-design will detect the trigger phrases and engage. Run them one at a time (it's a chunky workflow per surface).

**Why this order:** Top 3 surfaces by revamp payoff (per Phase 14 surface ranking). Start with `/path` to learn the tool on a smaller surface, then escalate to the home page (brand-defining), then the densest surface (`/songs/[slug]`).

---

## Shared context (always include)

```
Project: KitsuBeat — web-based Japanese learning tool that teaches language via anime opening/ending songs. Users watch embedded YouTube videos with synced lyrics, furigana, translations, grammar breakdowns, and color-coded vocabulary. Multi-language lesson support.

Stack: Next.js 15 App Router · Tailwind v4 · TypeScript · React 19 · Drizzle/Postgres (Supabase) · Clerk auth · YouTube iframe API.

Audience: Western anime fans wanting to understand favorite songs + serious Japanese learners using music as study method. Mobile-first; 11 in-scope surfaces all responsive.

Design system status: Phase 14 just shipped a full design token system in src/app/globals.css (10 colors × 2 themes, spacing/radii/shadow/motion scales) + 6 primitives in src/components/ui/ (Button, Card, Badge, Modal, EmptyState, Skeleton). Themes: dark default, light override via :root[data-theme="light"]. Brand accent: --color-accent: #dc2626 (Tailwind red-600, AA-clear).

Constraint: Any redesign you propose MUST be implementable in this token system. Don't introduce raw hex / arbitrary px / palette utilities — those are blocked by ESLint kitsubeat-tokens/no-raw-tokens. If you need a new token, propose it as an addition to globals.css.

Brand vibe to preserve: Japanese learning + anime music. Should feel emotionally resonant (mastery moments, song discovery, level-up) — NOT clinical like Duolingo, NOT austere like Anki. Closer to Pokemon GO meets language app.

Read these for current state:
- src/app/globals.css (token system + reduced-motion + light-theme override)
- src/components/ui/* (the 6 primitives + ThemeToggle)
- .planning/phases/14-ux-polish/14-DESIGN-DISPOSITION.md (per-surface treatment record)
- .planning/PROJECT.md (product context)
```

---

## Virality goals (apply to ALL surfaces — paste alongside shared context)

Five engagement principles to weave into every surface redesign. Source: viral-app-design concepts review (2026-05-02).

```
1. Instant feedback loops — every user action gets micro-feedback within ~100ms. Button presses pulse, vocab pills shimmer on unlock, lyric lines indicate scroll-to. Reference: Perplexity's moving dots while loading. KitsuBeat already nails BIG mastery moments (star-shine, confetti) — extend that vocabulary down to small interactions.

2. One clear action — each surface has ONE hero CTA visible above the fold. Other actions are tertiary. Reference: Apple Fitness "press start and move." For /path the hero is "continue your journey"; for / it's "start [featured song]"; for /songs/[slug] it's the play/pause toggle and the next exercise.

3. Frictionless interactions — mobile-first thumb-zone audit. Primary CTAs in bottom-third of viewport; never require a stretch. Tap targets ≥44px. Reference: Waze one-handed driving UX.

4. Emotional design — pacing matches the moment. Mastery = exuberant (current confetti is right). Discovery = warm. Failure-feedback = encouraging not punishing. Reference: Headspace soft-visuals calm the user. Express through Phase 14 tokens — no raw motion values.

5. Streak visibility (visual amplification ONLY in this phase) — streak count must be visible on EVERY surface, not just /path. Persistent header chip; flames/glow when streak is at risk; celebratory pop on day-of-the-week milestones. Reference: Duolingo daily streaks. NOTE: behavioral hooks (push notifs, streak-saver, reminder system) are out of scope here — see Phase 14.2.

DEFERRED to Phase 14.4-virality-engagement (do NOT design these in this revamp):
- Visible social activity ("X people learning this song now", friend feed, leaderboards)
- Streak behavioral systems (push notifs, streak-saver token, weekly recap email)
```

---

## Briefing 1 · `/path` — Learning Path screen

**Why first:** Smallest surface (5 files), recently migrated, gamification-heavy → biggest design philosophy upside per file. Good for learning huashu-design's workflow.

```
Make a hi-fi prototype redesign of the KitsuBeat /path screen.

[paste shared context + virality goals above]

Current state files:
- src/app/path/page.tsx
- src/app/path/components/PathHud.tsx
- src/app/path/components/PathMap.tsx
- src/app/path/components/PathNode.tsx
- src/app/path/components/StarterPick.tsx

What this screen does today:
- Shows the user's structured Japanese learning journey as a node-based "path map" (like a Pokemon route or Candy Crush map)
- Top: PathHud with progress stats (level, XP, streak, current node)
- Middle: PathMap with PathNodes (each node = a song or kana milestone, with star-state showing mastery)
- Bottom: If at start, StarterPick prompts user to pick from 3 starter songs to begin journey

Goals:
- Make the path feel like an adventure map, not a checklist
- Mastery moments (3-star nodes) should feel earned and visible from the path overview
- Path should preview what's ahead (locked/upcoming nodes) without overwhelming
- Mobile-first (390×844 baseline)

Constraints:
- Must use Phase 14 token system. Brand red is #dc2626.
- Must work in BOTH dark and light themes
- Reduced-motion fallback required for any motion
- Cannot break existing data shape (PathState type in src/lib/path/* — read it before designing)

I'm flexible on visual direction. If my brief is unclear, enter Design Direction Advisor mode and propose 3 differentiated philosophies (e.g. one map-game-y, one editorial-Japanese-minimalist, one motion-first). I'll pick.
```

---

## Briefing 2 · `/` (home) — Landing / catalog entry

**Why second:** First impression. Sets the brand vibe. This is what recruiters / interviewers / new users see first. Currently catalog-driven (cards in a grid); could be much louder.

```
Make a hi-fi prototype redesign of the KitsuBeat home screen (route: /).

[paste shared context + virality goals above]

Current state files:
- src/app/page.tsx
- src/app/songs/components/SongCard.tsx (the densest catalog card)
- src/app/songs/components/SongGrid.tsx
- src/app/songs/components/BonusBadgeIcon.tsx
- src/app/songs/components/SongMasteredBanner.tsx
- src/app/components/GlobalLearnedCounter.tsx
- src/app/layout.tsx (header chrome + ThemeToggle)

What this screen does today:
- Header: KitsuBeat logo, nav (Home/Path/Progress/Profile), GlobalLearnedCounter (cross-song vocab learned), ThemeToggle, sign-in
- Main: Grid of SongCards. Each card shows YouTube thumbnail, song title, artist, anime, JLPT pill, OP/ED pill, star count, optional "MASTERED" diagonal ribbon, optional violet bonus-badge sparkle
- Card click → /songs/[slug] (lesson page)
- Authenticated users see star/mastery overlays; unauthenticated see flat cards (no progress UI)

Goals:
- Feel like an anime music streaming service, NOT a flashcard app
- Hero / featured-songs treatment for top 3-5 catalog picks (e.g. "Trending this week", "Newly released", "Picks for your level")
- Mastery moments (3-star songs, bonus-mastery badges) should be celebratory at-a-glance
- Empty state for unauthenticated visitors should sell the value prop in 1-2 seconds
- Mobile-first

Constraints:
- Must use Phase 14 token system. Brand red #dc2626. JLPT level chip colors are token-driven (read globals.css for --color-jlpt-n5..n1)
- Card thumbnail uses YouTube thumbnail URL (16:9 aspect, no client-side image processing)
- Must work in BOTH dark and light themes
- Reduced-motion fallback for any motion
- Existing types: read src/lib/songs/types.ts before designing

If my brief is unclear, enter Design Direction Advisor mode and propose 3 directions (e.g. one Spotify-like editorial, one anime-poster-vibey, one Pokemon-GO-collection-feel). I'll pick.
```

---

## Briefing 3 · `/songs/[slug]` — Lesson + exercise sessions

**Why last:** Densest surface, biggest payoff, but also most complex. Wait until you've seen huashu's output style on briefings 1 and 2 before pointing it here.

```
Make a hi-fi prototype redesign of the KitsuBeat /songs/[slug] screen — the core lesson + exercise experience.

[paste shared context + virality goals above]

Current state files (12 components, all just migrated to tokens in Phase 14-05):
- src/app/songs/[slug]/page.tsx
- src/app/songs/[slug]/components/SongLayout.tsx (top-level layout)
- src/app/songs/[slug]/components/ExerciseTab.tsx (mode picker: Standard / Listening / Advanced Drills)
- src/app/songs/[slug]/components/LearnCard.tsx (vocabulary preview before exercise)
- src/app/songs/[slug]/components/QuestionCard.tsx (generic exercise card)
- src/app/songs/[slug]/components/GrammarMcqCard.tsx (grammar exercise)
- src/app/songs/[slug]/components/SentenceOrderCard.tsx (drag tokens to order)
- src/app/songs/[slug]/components/ListeningDrillCard.tsx (listen + identify)
- src/app/songs/[slug]/components/ConjugationCard.tsx (verb conjugation)
- src/app/songs/[slug]/components/FeedbackPanel.tsx (after-answer feedback)
- src/app/songs/[slug]/components/SessionSummary.tsx (end of session, with star award + bonus badge)
- src/app/songs/[slug]/components/AdvancedDrillsUpsellModal.tsx (premium gate)
- src/app/songs/[slug]/components/KnownWordCount.tsx (Skeleton loader)

What this screen does today:
- Left rail: YouTube embed playing the song, with verse-by-verse synced lyrics scrolling beneath (furigana + translation + grammar pills + color-coded vocab)
- Right rail (or bottom on mobile): ExerciseTab → user picks mode → LearnCard (preview vocab) → exercise cards in sequence → FeedbackPanel after each answer → SessionSummary at end with star award
- Mastery moments: star-shine animation when reaching a new star count, level-pop when leveling up overall, confetti on 3-star
- Mobile: video stacks on top, lyrics + exercises stack below

Goals:
- The lyrics + video panel should feel like a music player (NOT a learning textbook)
- Exercise cards should feel like a game (NOT a quiz)
- The transition from lyrics-mode to exercise-mode should be a gear-shift moment, not a page navigation
- Mastery emotional moments must remain visible (star-shine, level-pop, confetti — these are precious)
- Mobile parity is non-negotiable; desktop adds peripheral info (e.g. mastered-vocab sidebar) but never has primary content the mobile lacks

Constraints:
- Must use Phase 14 token system + 6 primitives + Modal primitive (Radix Dialog) for upsells
- Brand red #dc2626; JLPT colors token-driven; grammar category colors via --color-grammar-* tokens
- Must work in BOTH dark and light themes
- Reduced-motion suppresses confetti + level-pop + star-shine (already wired; preserve the integration points)
- Bundle budget: /songs/[slug] currently 10.33 kB gzipped against 50 kB ceiling — significant headroom but don't blow it

The "5 dimension review" at the end (philosophy consistency / visual hierarchy / detail execution / functionality / innovation) is especially valuable here — please run it after the prototype.

If my brief is unclear, enter Design Direction Advisor mode and propose 3 directions for THIS surface specifically.
```

---

## After huashu produces a direction you like

1. Pick one direction's HTML prototype (huashu will save it under a project-local path, likely `huashu-output/` or similar — confirm where it lands)
2. Capture the chosen prototype path + any tokens / components huashu introduced that aren't yet in your Phase 14 system
3. Run `/gsd-ui-phase 15` (or whatever next phase number you want — likely a 14.x decimal phase like `14.1-redesign-path` or a fresh `15-redesign-iteration`) — that skill will:
   - Read the prototype + Phase 14 design contract
   - Produce a UI-SPEC.md formalizing the chosen direction with falsifiable acceptance criteria
4. Then `/gsd-discuss-phase {N}` → `/gsd-plan-phase {N}` → `/gsd-execute-phase {N}` ships it into actual `src/app/**` edits

This is the **/gsd handoff point** — at step 3 above. Stop here, restart Claude Code, run huashu-design, then come back for /gsd-ui-phase.
