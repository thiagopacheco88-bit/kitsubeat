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
- Any tests that hit the 30s timeout (likely flake candidates)
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

## Phase 6 — New features walkthrough

Before each QA run, check what was shipped since the last QA:

```bash
git log --oneline --since="7 days ago"
```

For each new feature listed in the log:
- Identify the user-facing surface (which page / component)
- Walk through the feature manually end-to-end
- Confirm it works for both **fresh** and **veteran** accounts if user-state-dependent
- Confirm it works in **EN, PT-BR, and ES** if it has any localised text

Document each new feature tested with: ✅ pass / ❌ fail / ⚠️ partial — include a one-line observation.

---

## Playwright notes

- Zero-flake policy: if a test fails once, do not re-run to confirm — investigate the root cause.
- Admin tests skip gracefully when Clerk credentials are not configured — that is expected, not a failure.
- Visual diff tests (`path-visual-light`, `path-visual-dark`, `home-visual-*`) require baseline snapshots. Run with `--update-snapshots` after intentional visual changes only.
- Quarantined tests are excluded by default. Run `npm run test:quarantine` to see them.
