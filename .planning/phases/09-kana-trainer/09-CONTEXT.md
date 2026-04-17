# Phase 9: Kana Trainer - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Standalone `/kana` drill interface for hiragana and katakana recognition with row-by-row unlock, 10-star per-character mastery, and weighted random 20-question sessions. Free to all users (no auth required). Kanji drilling, cross-song review queues, and spaced-repetition calendars are explicitly out of scope.

</domain>

<decisions>
## Implementation Decisions

### Drill interaction & feedback
- Answer input: tap 4 romaji options (one correct, three distractors). Matches Phase 8 multiple-choice pattern.
- Feedback timing: immediate correct/wrong indicator on tap + tap-to-continue. No auto-advance in either direction — full manual pacing.
- 0-star pre-reveal: kana AND romaji both shown; no distractors; single "Got it" button earns 1 star on tap.
- Audio: optional Web Speech TTS button per question (speaker icon). Off by default. Reuses the `tts.ts` helper from Phase 08.4 LearnCard.

### Mastery & row unlock display
- Star visualization: row of 10 small dots/pips under each kana tile; filled dots = earned stars.
- Unlock rule: percentage-of-chars threshold (Claude's Discretion for exact numbers — recommend 80% of row's characters at ≥5 stars). Strict "every char ≥ N" ruled out.
- Unlock ceremony: celebratory modal + confetti on row unlock. Reuses the `canvas-confetti` dependency already installed for Phase 8 star mastery.
- Progress overview location: Claude's Discretion (recommend: full kana grid on `/kana` landing doubles as the dashboard — locked rows greyed, tiles show pip count).

### Session & entry flow
- Session start: grid landing page with "Start session" button. Hiragana/katakana mode toggle is on the landing page (not inside the drill).
- End-of-20-Q summary: accuracy (e.g. "18/20"), per-character star deltas for chars seen this session, new-row unlock callout (if any), and weakest-chars-to-watch list.
- Post-session loop: two CTAs — "Next session" (restart immediately) and "Back to grid" (return to landing/overview).
- Onboarding: zero onboarding. No intro modal, no tutorial session. The 0-star pre-reveal mechanic is self-teaching — first visit starts with every char at 0 stars so the learner sees the answer and taps through.

### Anonymous state + script scope
- Guest persistence: `localStorage` for signed-out users with a sign-up nudge after N sessions ("save forever / sync devices"). Signed-in users write to the database.
- Guest → signed-up migration: on sign-up, merge the localStorage stars into the new account's `user_kana_mastery` rows. No progress loss.
- Hiragana/katakana stars: fully separate. あ and ア have independent 10-star counters and independent row unlocks. Each script is its own skill track.
- Mode switching: three modes — Hiragana, Katakana, Mixed. Mixed pools both scripts into one 20-Q session (draws weighted by per-character mastery across both).

### Claude's Discretion
- Unlock threshold exact numbers (percentage and star target) — recommend 80% of row at ≥5 stars.
- Progress overview layout — recommend the landing-page grid pattern.
- Sign-up nudge cadence (after how many sessions / how prominent).
- Migration implementation specifics, including how it integrates with Phase 3 auth when that lands (this phase may ship with localStorage-only until auth is ready; DB-write path + merge-on-signup can be phased).
- Mixed-mode weighting formula (likely same weighted-random as single-script, applied to combined pool).
- Visual/layout details of the end-session summary (card layout, delta formatting).

</decisions>

<specifics>
## Specific Ideas

- Tap-4-options pattern: mirror the Phase 8 exercise QuestionCard component structure so the muscle memory matches across the app.
- TTS: reuse the `tts.ts` Web Speech API helper created in Phase 08.4 (LearnCard). No new TTS infrastructure.
- Row-unlock confetti: reuse `canvas-confetti` (already a Phase 8 dependency) so unlock moments feel consistent with star-earned moments in the song exercises.
- Progress grid resembles a standard kana chart — locked rows visually dimmed so learners see what's coming next without it feeling hidden.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 09-kana-trainer*
*Context gathered: 2026-04-18*
