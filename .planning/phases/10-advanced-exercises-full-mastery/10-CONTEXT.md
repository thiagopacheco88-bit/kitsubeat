# Phase 10: Advanced Exercises & Full Mastery - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver three new exercise types on top of the existing Phase 8 exercise engine: Grammar Conjugation, Fill-the-Lyric Listening Drill, and Sentence Order. Award Star 3 when the Listening Drill (Ex 6) passes at >=80%. Grammar Conjugation and Sentence Order contribute to a bonus mastery badge (no stars). Premium gating enforced at the data access layer.

Out of scope: new exercise types beyond these three; changes to existing Phase 8 Ex 1-4; changes to Star 1/2 semantics; new seed-time content pipelines beyond what the exercises require.

</domain>

<decisions>
## Implementation Decisions

### Grammar Conjugation exercise

- **Prompt shape:** Verse with target word blanked + base form shown above it (e.g., verse with `___` where the conjugated verb goes, `食べる →` displayed as scaffold). Anchors to the song and reuses the fill_lyric verse-blank pattern from Phase 08-02.
- **Option generation:** Mixed-distractor strategy — correct conjugation + 1 same-verb wrong conjugation + 2 same-JLPT-level alternate verbs in the target form. Balanced difficulty, more song-like than pure form-only drills.
- **Form coverage for v1:** Driven by what the Phase 7-02 structured-conjugation audit actually supports. Planner/researcher selects the specific forms after reviewing the structured 91% dataset — pick the forms with highest exemplar density first.
- **Unstructured grammar (the 9% from Phase 7-02 audit):** Skip those songs entirely for Grammar Conjugation. Clean boundary. The bonus badge simply remains unreachable on those songs until a future backfill phase.

### Listening Drill exercise

- **Audio scope (Claude's pick):** Full verse plays at normal speed via the existing YouTube iframe. Reuses the Phase 2 verse-sync infrastructure and Phase 08.1-05 test instrumentation. No clip extraction, no bleeping.
- **Lyrics visibility during playback:** Verse text is visible with the target word blanked. Reading scaffold present; only the target word is ear-only. Gentler than pure listening-test, still isolates listening recognition.
- **Replay policy:** Unlimited replays, no penalty. Low friction — matches listening-first learning goal.
- **Audio unavailability fallback:** When YouTubeEmbed's 15s watchdog (Phase 08.1-07) fires or iframe can't load, the listening drill is skipped for that song and the existing fallback message is shown. Star 3 is unreachable on that song until the video works. No silent substitution of Fill-the-Lyric.

### Sentence Order exercise

- **Input mode:** Tap-to-build. Scrambled tokens are shown; tapping a token moves it into an "your answer" row in order. Tapping an answer-row token returns it to the pool. Mobile-first, no dnd library dependency.
- **Translation hint policy:** Hidden by default; user can tap a "Show hint" toggle to reveal the translation. Revealing drops the FSRS rating (same reveal-hatch pattern as Phase 08.2-01's `revealedReading` → rating=1).
- **Scoring:** All-or-nothing for star/rating purposes (consistent with all other Phase 8 exercise types). FeedbackPanel highlights which positions were wrong so the user learns from the mistake.
- **Long verse handling (Claude's pick):** Cap at 12 tokens per sentence-order question. Verses longer than 12 tokens either get excluded from Sentence Order for that song OR get tokenized at sub-clause boundaries (grouping particles/phrases as single draggables) if clause boundaries are available. Research step: assess verse-token distribution in the current catalog before picking one strategy.

### Premium gate + Star 3 flow

- **Free-tier limits (reshapes FREE-05):**
  - **Listening Drill:** free for the user's first **10 distinct songs** attempted. Counter increments on first Ex-6 attempt per song.
  - **Grammar Conjugation + Sentence Order:** **single shared counter**, free for the user's first **3 distinct songs** that touch either exercise type. Counter increments on first attempt per song across the two.
  - Both counters are independent — exhausting the advanced-drills quota (3) does not affect the listening quota (10).
- **Upgrade prompt triggers:**
  - 11th song's Listening Drill tab-open → premium prompt before session starts.
  - 4th song's Grammar Conjugation or Sentence Order tab-open → premium prompt before session starts.
  - Prompt style: full-screen or modal at tab-open (show cost upfront, no wasted time inside a session).
- **Enforcement layer:** At the data access layer, consistent with Phase 08-01's `checkExerciseAccess()` pattern. UI never hides exercises unilaterally — the gate returns a locked response that the UI renders.
- **Star 3 celebration:** Identical confetti + star-glow as Stars 1 and 2 (consistent with Phase 08-04 display). Star 3 additionally pins a persistent **"Song Mastered" badge/banner on the song catalog card** — permanent status marker visible while browsing.
- **Bonus mastery badge (Conjugation + Sentence Order):** Small icon on the song catalog card alongside the 3 stars. Visible in catalog browsing, not just on the song detail page. Icon is subtle — stars remain the primary signal.

### Claude's Discretion

- Exact audio seek/playback mechanics for Listening Drill (reuses YouTube iframe + existing verse timing; implementation details).
- Tokenization strategy for Sentence Order (word-level vs sub-clause grouping) — pending verse-length audit in research.
- Exact conjugation form list — pending audit of Phase 7-02 structured data coverage.
- Distractor-pool API extensions for Grammar Conjugation (reuses or extends the Phase 08-03 JLPT pool endpoint).
- Session integration with existing Phase 8 ExerciseSession (whether Ex 5/6/7 land in the existing Practice tab or a separate surface) — planner's call.
- Exact visual design of the "Song Mastered" banner and the bonus-badge icon.
- FSRS rating details for each new exercise type (lean on Phase 08.2-01 weights model; weights for Ex 5/6/7 added in planning).

</decisions>

<specifics>
## Specific Ideas

- The free-tier limit reshapes roadmap FREE-05 requirement: the original single 3-song listening-drill cap is replaced by two independent counters (10 for listening, 3 shared for conjugation + sentence order). Requirement text should be updated in ROADMAP.md during planning.
- Listening Drill should feel like real listening comprehension, not a memory test — hence lyrics-visible-with-target-blanked, not fully hidden lyrics.
- Sentence Order tap-to-build follows a mobile-first principle — this is consistent with the LearnCard tap-to-dismiss + Phase 08.3 tap-to-reveal mnemonic patterns.
- Grammar Conjugation prompt reuses the verse-with-blank pattern from Phase 08-02 fill_lyric so users don't learn a new UI convention.

</specifics>

<deferred>
## Deferred Ideas

- Tokenization-at-clause-boundaries for long verses — may become its own research/data task if the simple 12-token cap excludes too many verses.
- Backfill for the 9% unstructured grammar songs so they gain Grammar Conjugation coverage — separate phase after audit.
- Profile-page aggregate "bonus badges earned across library" list — not in Phase 10 scope; catalog-card badge is sufficient for now.
- Per-position partial scoring for Sentence Order — rejected for Phase 10 (all-or-nothing stars + detailed feedback is enough) but could revisit if user-testing shows frustration.
- Larger Star 3 animation distinct from Star 1/2 — rejected in favor of the catalog-card "Song Mastered" banner, which is more persistent and visible.

</deferred>

---

*Phase: 10-advanced-exercises-full-mastery*
*Context gathered: 2026-04-18*
