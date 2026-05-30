# /qa-full — Full KitsuBeat QA Suite

Run the complete Playwright end-to-end test suite and report results. Covers all 6 feature areas plus the 60+ existing specs.

---

## Phase 1 — Dev server check

Verify port 7000 is responding. If not, start it:
```bash
npm run dev
```
Wait up to 60 seconds for `http://localhost:7000` to respond before proceeding.

---

## Phase 2 — Playwright automated suite

**Known slow tests (not flakes):**
- `home-and-browse`, `home-above-fold-*`, `home-foundations` use `test.setTimeout(90_000)` — Next.js streaming SSR + Neon cold start delays `DOMContentLoaded` 30–90s in dev. Expected.
- `theme-toggle` optimistic test uses `test.setTimeout(180_000)` — ThemeToggle React hydration takes 60s+ in dev after many prior tests. Expected.
- These are dev-environment characteristics. On Vercel production they load in 1–3s.

**Verify last Vercel build passed before running tests:**
```bash
gh run list --repo thiagopacheco88-bit/kitsubeat --limit 1 --json status,conclusion,headBranch
```
If `conclusion` is `failure`, fix the build first — running a full Playwright suite against a broken deploy wastes time.

**Run the full suite**:
```bash
npx playwright test --reporter=list
```
If any tests require auth bypass (exercise/progress tests), prefix with:
```bash
PLAYWRIGHT_AUTH=true npx playwright test --reporter=list
```

**Parse and report** — after the run, summarise:
- Total passed / failed / skipped
- Which spec files failed and the first failing assertion
- Any tests that hit the 90s timeout (likely flake candidates — investigate if they exceed the budget)
- Coverage gaps: list any of the 6 feature areas with zero passing tests

**On failure** — for each failed test:
- Show the test name and file
- Show the Playwright error message
- Suggest the most likely fix (selector changed, missing data-testid, timing issue)

### Feature areas covered

| Area | Spec files |
|---|---|
| Language switching | `i18n-language-picker`, `i18n-locale-routing`, `i18n-text-deep` |
| Loading & transitions | `loading-transitions`, `reduced-motion`, `home-reduced-motion`, `path-reduced-motion` |
| Admin (all tools) | `admin-auth`, `admin-lyrics-shell`, `admin-deep` |
| Kana full journey | `kana-full-journey`, `path-kana-checkpoint-nav` |
| Locale routing (EN / PT-BR / ES) | `all-pages-revamp` (EN+PT-BR+ES prefix suite), `nav-sweep-all-locales`, `kana-full-journey` (locale nav tests), `i18n-language-picker`, `i18n-locale-routing`, `i18n-text-deep`, `auth-reachability-locale` |
| Path / Trilha | `path-deep-journey`, `path-visual-light`, `path-visual-dark`, `path-a11y`, `path-continue-anchor`, `gamification-path` |
| Token popup & exercises | `token-popup-exercises`, `exercise-session-full`, `exercise-tab-tracks`, `exercise-progress-fsrs`, `exercise-audio` |
| Player | `player-load`, `player-panels`, `player-sync-and-seek`, `player-lesson-toggles`, `iframe-defer` |
| Home | `home-and-browse`, `home-above-fold-auth`, `home-above-fold-unauth`, `home-foundations`, `home-section-narrative` |
| Regression | `regression-geo-fallback`, `regression-cross-song-leak`, `regression-premium-gate`, `flagged-song-404` |

### Quick runs (single area)

```bash
# New gap-filling specs — run in 2 groups to avoid overloading Next.js dev server
npx playwright test loading-transitions admin-deep path-deep-journey
npx playwright test i18n-text-deep kana-full-journey token-popup-exercises

# Only language switching
npx playwright test i18n-

# Only path/trilha
npx playwright test path-

# Only exercises
npx playwright test exercise-

# Only admin
npx playwright test admin-

# With HTML report (open after run)
npx playwright test && npm run test:report
```

---

## Phase 2.5 — Post-deploy production smoke check

Run this after every push that lands on Vercel. Catches missing env vars, DB connection failures, and broken imports that work locally but 500 in production.

```bash
node -e "
const pages = ['/', '/songs', '/anime', '/kana', '/path', '/journal', '/profile'];
const base = 'https://kitsubeat.app';
Promise.all(
  pages.map(p =>
    fetch(base + p, { redirect: 'manual' })
      .then(r => {
        const ok = r.status < 400 || r.status === 302;
        console.log(ok ? '✓' : '✗', r.status, p);
      })
      .catch(e => console.error('✗ FAIL', p, e.message))
  )
);
"
```

Any 500 is a blocker. 302 on `/profile` is expected (auth redirect). Also spot-check one song player:

```bash
node -e "
fetch('https://kitsubeat.app/songs/again-yui')
  .then(r => r.text())
  .then(html => {
    const ok = html.includes('Again') && html.includes('data-theme');
    console.log(ok ? '✓ song player page renders' : '✗ missing expected content');
  });
"
```

---

## Phase 3 — Manual UAT: Test Accounts

Two dedicated accounts should be used. Set them up in Clerk if they don't exist yet.

| Account | Email | Purpose |
|---|---|---|
| Fresh | `qa-fresh@kitsubeat.app` | New user onboarding — created fresh each QA run or kept in a known zero-progress state |
| Veteran | `qa-veteran@kitsubeat.app` | Returning user — has real FSRS history, completed at least one full song session |

> **Resetting the fresh account:** after each QA, either delete + recreate the Clerk user, or clear their FSRS/progress rows in the DB. Goal is state=0 for all vocab on that account.

### 3A — First-run experience (fresh account)

Sign in with `qa-fresh@kitsubeat.app` and verify the following in order:

- [ ] Home page shows the correct unauthenticated → authenticated transition (no flicker, no broken state)
- [ ] Picking a song for the first time shows the onboarding/intro flow (not a blank session)
- [ ] First exercise card shows an **image introduction** for new vocabulary (the image appears on the intro slide before the quiz card)
- [ ] Audio button is hidden until after the first answer (no answer leaking)
- [ ] The first ~3 exercises feel like new vocab introductions, not reviews
- [ ] After finishing the session, the summary screen shows new words learned (not zero)
- [ ] Coming back to the same song immediately after: words just learned (now state=1 Learning) do **not** show their intro image again — only remaining state=0 words trigger intros
- [ ] Repeating the session a third time without answering anything: confirm intro images are not shown for words already advanced past state=0

### 3B — Returning user: review session (veteran account)

Sign in with `qa-veteran@kitsubeat.app` and verify:

- [ ] Home page or Path shows pending review count > 0 if reviews are due
- [ ] Opening the review queue shows FSRS-due words (mature vocab, not fresh new words)
- [ ] Review cards show **no intro image** — the image intro is only for first encounters
- [ ] Answering 「Again」on a review card correctly resets it to Relearning (state=3), not New (state=0)
- [ ] After completing a review session, the due count decreases correctly

---

## Phase 3.5 — Social media cron health

Run this after any deploy or once per week. The X and Threads posting crons can fail silently.

```bash
# Days of posts remaining in queue
node -e "
const q = require('./src/lib/social-queue.json');
const future = q.posts.filter(p => new Date(p.scheduledFor) > new Date() && !p.postedAt);
const last = q.posts.filter(p => p.postedAt).sort((a,b) => new Date(b.postedAt) - new Date(a.postedAt))[0];
console.log('Queued posts remaining:', future.length);
if (future[0]) console.log('Next scheduled:', future[0].scheduledFor, '-', future[0].platform);
if (last) console.log('Last posted:', last.postedAt, '-', last.platform, last.postId ? '✓ has post ID' : '✗ missing post ID (post may have failed)');
if (future.length < 7) console.warn('⚠️  Fewer than 7 posts queued — regenerate soon');
"
```

**Manual check — Vercel cron logs:**
- Go to Vercel → Functions → Cron Jobs
- Confirm `/api/cron/post-social` last run is recent and shows 200
- A silent 500 means the queue has been draining without posts going out
- Check that `postId` fields are being populated in `social-queue.json` after each run (if missing, the post call failed)

**Manual check — platform spot check:**
- Open `https://x.com/kitsubeat` and `https://www.threads.net/@kitsubeat`
- Confirm the most recent post matches the `last posted` timestamp from the script above

---

## Phase 4 — Exercise quality audit

Pick **2 different songs** and run through their exercise sessions. Check all of the following.

### 4A — Exercise ordering

Within a session:
- [ ] New vocab (state=0) always appears **before** reviews (state=2) of the same word
- [ ] Intro cards appear immediately before their corresponding test card (not separated by 5+ other cards)
- [ ] Reviews from other songs are interleaved reasonably (not all front-loaded or all at the end)

### 4B — Audio correctness (listening check)

For each song session:
- [ ] On a **vocab_listen** (listening) exercise: the audio plays the **target word only**, not the full sentence
- [ ] On a **vocab_meaning** or **vocab_reading** exercise: the audio button (when visible post-answer) plays the correct word, matching the kanji/kana shown on the card
- [ ] Audio does not play on a different word than what is displayed (cross-word audio bug)
- [ ] On repeat: pressing audio a second time replays the same word, not silence or a different word

### 4C — Image repetition check (key regression)

This is the most important manual check. The root issue: `introducedNewVocabIds` is in-memory (Zustand). Reloading the page resets it, so a word still at state=0 will show its intro image again.

Run this sequence:
1. Start a song session as the **fresh account** — note which words show intro images
2. Answer 2–3 cards (enough to advance some words to state=1), then navigate away mid-session
3. Return to the same song and start again
4. **Expected:** words you answered (now state=1+) do NOT show intro images again. Words still at state=0 may show intros again — this is acceptable. Words at state=1+ showing intros is a **bug**.
5. Complete the session fully, then immediately click "Start again"
6. **Expected:** no intro images on any word (all words advanced past state=0)

Log any violations with: song name, word, observed behaviour, expected behaviour.

### 4D — Exercise variety check

Run 3 consecutive sessions on the same song:
- [ ] Not all exercises are the same type (should see mix of vocab_meaning, vocab_reading, vocab_listen, grammar)
- [ ] The same question is not asked twice in the same session
- [ ] If you fail a card (press 「Again」), it reappears later in the session — not immediately as the next card

---

## Phase 5 — Foundations mastery integrity

Verify that mastery dots, unlock logic, persistence, and reset behave correctly for both the Kana and Counters modules. Run these checks in a **private / incognito window** or after clicking "Reset progress" so you start from a known zero state.

> **Quick reset path:** `/kana` → "Reset progress" (only visible when any progress exists) → confirm. `/counters` → same. Both clear `localStorage` for their respective keys.

---

### 5A — Zero state (fresh or after reset)

Open `/kana` with no prior progress:
- [ ] All kana tiles show **0 filled dots** — no amber pips anywhere on the grid
- [ ] Only the **a-row** is visible at full opacity; all other rows are dimmed (opacity ~55%)
- [ ] The "Reset progress" button is **not visible** (nothing to reset)

Open `/counters` with no prior progress:
- [ ] All counter tiles show **0 filled dots**
- [ ] Only **hon** is at full opacity; all other counters are dimmed
- [ ] The "Reset progress" button is **not visible**

---

### 5B — Mastery increments correctly

Run a short kana session (hiragana mode). Answer a few questions, then return to `/kana`:
- [ ] Characters you answered **correctly** show more filled dots than before (+1 each correct answer)
- [ ] Characters you answered **wrongly** show fewer dots (−2, floored at 0 — never negative or blank)
- [ ] Characters not asked this session show **the same dot count** as before

Run a counter session. Return to `/counters`:
- [ ] The counters drilled show updated dots matching the same +1/−2 rule
- [ ] Characters/counters you never drilled still show 0 dots

---

### 5C — Persistence across reload

After completing a session and returning to the grid:
- [ ] **Reload the page** (F5 / ⌘R) — all mastery dots remain exactly the same (localStorage survived)
- [ ] Open a second tab to the same route — dots match the first tab
- [ ] Closing the browser and reopening → dots still there

---

### 5D — Unlock threshold

**Kana:** advance the a-row to the unlock threshold (≥80% of a-row chars at ≥5 stars):
- [ ] The **ka-row** transitions from dimmed to full opacity after the threshold is crossed
- [ ] No other row unlocks at the same time (strictly sequential, one row at a time)
- [ ] The unlock is reflected on the grid **without requiring a page reload** (Zustand reactivity)

**Counters:** advance **hon** to ≥5 stars:
- [ ] **mai** transitions from dimmed to full opacity
- [ ] All counters after mai remain dimmed
- [ ] Unlock reflected immediately without reload

---

### 5E — Reset button behaviour

With some progress on `/kana`:
- [ ] "Reset progress" button **is visible** next to the Start session button
- [ ] Clicking it shows a confirmation dialog: *"Reset all kana progress? This cannot be undone."*
- [ ] Cancelling the dialog → no change, dots remain intact
- [ ] Confirming → all dots immediately return to 0, all rows except a-row go back to dimmed, **reset button disappears**

With some progress on `/counters`:
- [ ] "Reset progress" link **is visible** in the grid header
- [ ] Same confirm dialog, same cancel/confirm behaviour
- [ ] After reset: all dots 0, only hon unlocked, reset link gone

---

### 5F — Cross-module isolation

- [ ] Resetting kana progress has **no effect** on counter dots (and vice versa)
- [ ] Completing a counter session does not change any kana star counts
- [ ] `localStorage` key `kitsubeat-kana-mastery-v1` and `kitsubeat-counter-mastery-v1` are independent — verify in DevTools → Application → Local Storage

---

### 5G — Session summary integrity

- [ ] Navigating directly to `/kana/session/summary` (without completing a session) shows **"No session data"** gracefully — no crash, no blank screen
- [ ] Same for `/counters/session/summary`
- [ ] After completing a session and viewing the summary, `sessionsCompleted` increments by **exactly 1** — check via DevTools: `JSON.parse(localStorage.getItem('kitsubeat-kana-mastery-v1')).sessionsCompleted`
- [ ] Starting a second session immediately: the summary from the first session is **overwritten** (not stacked)

---

## Phase 6 — i18n text audit (run for EVERY locale change)

> **Why this failed before:** locale pages had hardcoded EN strings that the Playwright `i18n-text-deep` spec didn't catch because it only checked a subset of routes. Run this checklist whenever any component or page is added or edited.

Switch the app language to **ES** (Spanish) via the language picker, then verify every item below shows Spanish — not English or Portuguese. Repeat for **PT-BR**, then switch back to **EN last**.

### 6A — Global chrome (applies to all pages)

- [ ] Desktop nav links show translated labels: Ruta / Canciones / Anime / Kana / Contadores / Artículos / Perfil (ES) or Trilha / Músicas / Artigos (PT-BR)
- [ ] Mobile hamburger sheet shows the same translated labels (open the sheet at ≤640px viewport)
- [ ] Mobile sheet "Close" button shows "Cerrar" (ES) / "Fechar" (PT-BR)
- [ ] "Sign in" link (signed-out state) shows "Iniciar sesión" (ES) / "Entrar" (PT-BR)
- [ ] Skip-to-main link (Tab on first load) shows translated text, not "Skip to main content"
- [ ] Cookie consent banner (clear `kb_consent` cookie to trigger) shows translated body text and button labels — not English

### 6B — Locale pages

| Route | Element to check | ES expected | PT-BR expected |
|---|---|---|---|
| `/es/songs` | Eyebrow label | Catálogo | Catálogo |
| `/es/songs` | Page heading | Canciones | Músicas |
| `/es/journal` | Eyebrow label | Centro de Contenido | Central de Conteúdo |
| `/es/journal` | Page heading | Blog | Artigos |
| `/es/profile` | Eyebrow label | Cuenta | Conta |
| `/es/profile` | Subheading | Spanish text | Portuguese text |
| `/es/profile` | Data export description | Spanish text | Portuguese text |
| `/es/profile` | Learning preferences heading | Preferencias de aprendizaje | Preferências de aprendizado |
| `/es/anime` | Page heading | Vocabulario Anime | Vocabulário Anime |
| `/es/anime` | Subheading | Spanish text | Portuguese text |

### 6C — Automated coverage check (run before merging any locale-affecting PR)

```bash
# i18n specs — text correctness + routing
# --workers=1 is required: the nav-locale-matrix tests set kb_locale cookies
# that pollute concurrent browser sessions in parallel mode (pre-existing known issue).
npx playwright test i18n- --workers=1
```

Expected: all `i18n-*` specs green. A failure here means a hardcoded string or broken routing was introduced.

### 6D — Translation file parity check

Run this to confirm no locale is missing keys that another has:

```bash
node -e "
const en = require('./src/messages/en/common.json');
const es = require('./src/messages/es/common.json');
const pt = require('./src/messages/pt-BR/common.json');
const flat = (o, p='') => Object.entries(o).flatMap(([k,v]) => typeof v==='object' ? flat(v, p+k+'.') : [p+k]);
const enK = flat(en), esK = flat(es), ptK = flat(pt);
const missingEs = enK.filter(k=>!esK.includes(k));
const missingPt = enK.filter(k=>!ptK.includes(k));
if(missingEs.length) console.log('ES missing:', missingEs);
if(missingPt.length) console.log('PT missing:', missingPt);
if(!missingEs.length && !missingPt.length) console.log('All keys present in all locales ✓');
"
```

Run the same for `songs.json`, `journal.json`, `settings.json`, `exercises.json`, `errors.json`, `path.json`.

---

## Phase 6.5 — Legal + cookie compliance

Run this whenever the footer, layout, or cookie consent component is changed.

**Legal footer links:**
- [ ] Footer is visible on `/`, `/songs`, `/songs/[slug]`, `/kana`, `/anime`, `/profile`, `/journal`
- [ ] Three links present: **Terms of Service**, **Privacy Policy**, **Cookies** — each navigates to its page without 404
- [ ] `/terms`, `/privacy`, `/cookies` all return 200 (not 404 or blank)

**Cookie consent flow** (use a private window or clear `kb_consent` cookie):
- [ ] Banner appears on first visit to any page
- [ ] "Accept" → sets `kb_consent` cookie → banner disappears
- [ ] "Reject" → banner disappears, `kb_consent` is NOT set (or set to "rejected")
- [ ] Reloading after accepting → banner does NOT reappear
- [ ] Reloading after rejecting → banner DOES reappear (no persistent consent stored)
- [ ] Banner text is translated correctly in ES and PT-BR (test via `kb_locale` cookie)

---

## Phase 7 — New features walkthrough

Before each QA run, check what was shipped since the last QA:

```bash
git log --oneline --since="7 days ago"
```

For each new feature listed in the log:
- Identify the user-facing surface (which page / component)
- Walk through the feature manually end-to-end
- Confirm it works for both **fresh** and **veteran** accounts if user-state-dependent
- Confirm it works in **PT-BR, ES, then EN last** if it has any localised text — test EN last so the session ends with `kb_locale=en`

Document each new feature tested with: ✅ pass / ❌ fail / ⚠️ partial — include a one-line observation.

---

## Phase 7 — Anime Vocabulary Carousel

Automated gate first (must be green before any manual steps):

```bash
# Integration: DB queries against live test branch (requires DATABASE_URL / TEST_DATABASE_URL)
npx vitest run tests/integration/anime-vocab.test.ts

# Unit: carousel generator + saveAnimeCarouselSession
npx vitest run src/lib/exercises/__tests__/carousel-generator.test.ts src/app/actions/__tests__/anime-carousel.test.ts
```

Expected: **24/24 pass** (5 integration + 14 generator + 5 server action).

> **DB sync note:** If integration tests fail with `relation "anime_vocab_catalog" does not exist`, the test DB branch is stale. Fix:
> ```bash
> # Apply missing migrations to test branch
> DATABASE_URL="<TEST_DATABASE_URL>" npx tsx --tsconfig tsconfig.scripts.json scripts/migrations/apply-migrations.ts
> # Seed 760 words into test branch
> DATABASE_URL="<TEST_DATABASE_URL>" npx tsx --tsconfig tsconfig.scripts.json scripts/seed/20-seed-anime-vocab.ts
> ```

---

### 7A — Index page (`/anime`)

- [ ] Page renders 6 anime cards — One Piece, Naruto, Bleach, Fullmetal Alchemist, Attack on Titan, Sword Art Online
- [ ] Each card shows: title, word count badge (> 0), at least one JLPT badge
- [ ] Search field filters cards in real time (type "nar" → only Naruto card shows)
- [ ] Clearing search shows all 6 cards again
- [ ] "Anime" link in desktop nav is visible and active-highlighted on `/anime`
- [ ] "Anime" link in mobile nav sheet is present (open hamburger → check)

### 7B — Carousel page (`/anime/naruto`)

- [ ] Page header shows "Naruto" title and word count
- [ ] Vocabulary cards render with: kanji surface, reading (hiragana), romaji, English meaning, JLPT badge, category chip
- [ ] Cards with context notes show the italicised note below the meaning
- [ ] Mastery dots appear on cards for authenticated users (grey = unseen, yellow = learning, green = mature)
- [ ] JLPT filter bar chips: All / N5 / N4 / N3 / N2 / N1 / Anime-specific — clicking each filters correctly
- [ ] "All" chip restores the full word list
- [ ] Category tab bar shows tabs for each category present in Naruto's vocabulary; clicking one filters to that category
- [ ] JLPT filter + category filter compose correctly (both active → intersection of both)
- [ ] "Practice these words" button is visible and labelled; clicking starts the exercise session

### 7C — Exercise session flow

- [ ] After clicking "Practice these words", the carousel view is replaced by the exercise session
- [ ] Progress bar at top shows current question / total count
- [ ] Each question card shows: prompt (kanji or English meaning) and 4 multi-choice buttons
- [ ] `vocab_meaning` questions: prompt = kanji, answers = English meanings
- [ ] `meaning_vocab` questions: prompt = English meaning, answers = kanji surfaces
- [ ] Selecting the correct answer highlights it green; wrong selection highlights red + correct goes green
- [ ] After 1.5 seconds the next question auto-advances (no manual "Next" click needed)
- [ ] ✕ exit button returns to the carousel immediately (mid-session)

### 7D — Session summary

- [ ] After all questions answered, the session summary screen appears
- [ ] Shows emoji (🎯 for ≥ 80%, 📚 for ≥ 50%, 💪 otherwise)
- [ ] Shows "Session complete!" heading + correct / total count
- [ ] Accuracy % stat is correct (e.g. 8/10 → 80%)
- [ ] XP gained stat shows a non-negative number
- [ ] Day streak stat is present
- [ ] "Back to carousel" button returns to the carousel (browse mode restored)

### 7E — Locale routing

Test in this order — **EN last** so the session ends with `kb_locale=en`.

**PT-BR**
- [ ] `/pt-BR/anime` renders 6 anime cards (same data, locale context set)
- [ ] `/pt-BR/anime/naruto` renders the Naruto carousel page without errors
- [ ] Nav "Anime" link at `/pt-BR` prefix routes correctly to `/pt-BR/anime`

**ES**
- [ ] `/es/anime` renders 6 anime cards
- [ ] `/es/anime/naruto` renders the Naruto carousel page without errors
- [ ] Nav "Anime" link at `/es` prefix routes correctly to `/es/anime`

**EN (run last — leaves `kb_locale=en`)**
- [ ] `/anime` renders 6 anime cards
- [ ] `/anime/naruto` renders the Naruto carousel page without errors
- [ ] Nav "Anime" link routes correctly to `/anime`

### 7F — Edge cases

- [ ] `/anime/nonexistent` shows Next.js "This page could not be found" content — page renders notFound() content (HTTP status may show 200 in dev but 404 in prod — this is expected Next.js dev behaviour)
- [ ] `/anime/naruto` with no auth (signed out) still renders correctly (mastery dots absent, practice session still works)
- [ ] Navigating directly to `/anime/naruto` and immediately back (browser back) — no hydration errors in console

---

## Phase 8 — YouTube video availability check

YouTube publishers can block or remove videos at any time. A blocked video shows an error iframe instead of the lesson — silent data rot.

### 8A — Automated scan (run weekly or before any catalog-related deploy)

```bash
# Check all song YouTube IDs via oEmbed — no API key needed.
# Prints BLOCKED / OK / UNKNOWN for each song.
npx tsx --tsconfig tsconfig.scripts.json scripts/audit/check-video-availability.ts
```

> ⚠️ **This script does not exist yet — it needs to be built.** See 8C below for the spec.

Expected output:
```
✓  again-yui             OK   (dQw4w9WgXcQ)
✗  crossing-field-lisa   BLOCKED  (abc123)   ← publisher removed / region-blocked
```

Any `BLOCKED` result is a **P1 issue** — the song must be hidden from the catalog until a replacement video is found.

### 8B — Manual spot check (run for any song flagged by a user)

1. Open the song's player page, e.g. `/songs/crossing-field-lisa`
2. Confirm the YouTube iframe loads (no "Video unavailable" error screen)
3. Press play — video should start within 3s
4. If blocked: go to admin → Content Status and mark the song as unavailable

### 8C — Feature spec (needs to be built)

The following is not yet implemented. Build when flagged songs start appearing in the catalog.

**DB change:** add `is_available boolean NOT NULL DEFAULT true` column to the `songs` table. Migration: `scripts/migrations/add-song-availability.ts`.

**Auto-hide:** all queries that return songs for public pages (`getSongs`, `getFeaturedSong`, `getAnimeSongs`) must add `WHERE is_available = true`. Blocked songs become invisible site-wide without deletion.

**Detection script** (`scripts/audit/check-video-availability.ts`):
```typescript
// For each song in DB:
//   fetch https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json
//   HTTP 200 → available
//   HTTP 401 / 403 / 404 → blocked / removed
// Update is_available in DB for any that changed status.
// Print a summary: N blocked, M newly blocked, K restored.
```

**Admin page** (`/admin/content-status`):
- Table of all songs with columns: Title, Anime, YouTube ID, Status (✓ Available / ✗ Blocked), Last Checked
- "Re-check all" button that runs the availability scan on demand
- Per-row toggle to manually override `is_available` (for edge cases like region-only blocks)
- Blocked songs highlighted in red — one-click to mark as hidden

**QA gate:** after building, run the scan before every catalog deploy and confirm zero regressions.

---

## Phase 9 — Performance / load timing

> **Dev mode is not representative** — Next.js dev skips all optimisations. Run these checks against **production** (`https://kitsubeat.app`) only.

### 9A — Quick TTFB check (after every deploy)

Time-to-first-byte tells you if the Neon DB cold start is hurting real users.

```bash
# Measure TTFB for key pages (requires curl)
for page in "/" "/songs" "/anime" "/kana" "/songs/again-yui"; do
  ttfb=$(curl -s -o /dev/null -w "%{time_starttransfer}" "https://kitsubeat.app$page")
  echo "$ttfb s  $page"
done
```

**Thresholds:**
| Page | TTFB target | Action if exceeded |
|---|---|---|
| `/` | < 3s | Home page SSR is too slow — check Neon cold start and sequential DB calls |
| `/songs` | < 2s | Songs query is slow — check DB indexes |
| `/songs/[slug]` | < 2s | Lesson data query is slow |
| `/anime` | < 1s | Should be fast — mostly static catalog |
| `/kana`, `/path` | < 1s | No DB dependency for anon users |

### 9B — Lighthouse spot check (run monthly or after major layout changes)

```bash
# Requires lighthouse CLI: npm install -g lighthouse
lighthouse https://kitsubeat.app --output=json --output-path=./lighthouse-report.json --chrome-flags="--headless"
node -e "
const r = require('./lighthouse-report.json');
const cats = r.categories;
console.log('Performance:', Math.round(cats.performance.score * 100));
console.log('Accessibility:', Math.round(cats.accessibility.score * 100));
console.log('Best Practices:', Math.round(cats['best-practices'].score * 100));
console.log('SEO:', Math.round(cats.seo.score * 100));
console.log('LCP:', r.audits['largest-contentful-paint'].displayValue);
console.log('CLS:', r.audits['cumulative-layout-shift'].displayValue);
console.log('FCP:', r.audits['first-contentful-paint'].displayValue);
"
```

**Minimum targets:**
| Metric | Target |
|---|---|
| Performance score | ≥ 70 |
| LCP | < 2.5s |
| CLS | < 0.1 |
| Accessibility | ≥ 90 |

CLS failures are the most common regression — usually caused by images loading without explicit dimensions, or fonts causing layout shift. Fix before shipping.

### 9C — Player video load time (manual)

Open any song player on production. Open DevTools → Network tab → filter by `youtube.com`.

- [ ] YouTube iframe embed request returns within 3s
- [ ] Player thumbnail is visible before the iframe loads (no blank white box flash)
- [ ] After clicking play, video starts playing within 5s on a normal connection

If the player takes >5s to start, check whether `iframe-defer` is working correctly — lazy loading should not be activating before the user clicks play.

---

## Playwright notes

- Zero-flake policy: if a test fails once, do not re-run to confirm — investigate the root cause.
- Admin tests skip gracefully when Clerk credentials are not configured — that is expected, not a failure.
- Visual diff tests (`path-visual-light`, `path-visual-dark`, `home-visual-*`) require baseline snapshots. Run with `--update-snapshots` after intentional visual changes only.
- Quarantined tests are excluded by default. Run `npm run test:quarantine` to see them.
- **Home page tests are intentionally slow** (30–90s) in dev mode — this is expected due to streaming SSR + Neon cold start. Do not lower their timeouts.
