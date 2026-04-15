# Phase 8: Exercise Engine & Star Mastery - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the per-song exercise loop with 4 core exercise types (Vocab->Meaning, Meaning->Vocab, Reading Match, Fill-the-Lyric), immediate explanatory feedback, session persistence across browser refreshes, and a 2-star mastery system. Includes premium gate abstraction at the data access layer. Advanced exercises (grammar conjugation, listening drill, sentence order) and Star 3 belong to Phase 10.

</domain>

<decisions>
## Implementation Decisions

### Exercise flow & session structure
- All 4 exercise types are shuffled and interleaved within a single session — no fixed sequential order
- User chooses between a short session and a full (complete) lesson at session start; short sessions award proportionally less completion percentage toward the song
- Session starts with a config screen where the user picks short/full mode; screen shows estimated time and question count
- Session ends with a summary screen showing overall stats (total score, accuracy %, time) plus suggestions: retry this song, try another song, or go to dashboard
- Session summary shows overall stats only — no per-exercise-type breakdown

### Feedback & explanation design
- Default feedback: inline card expansion — the selected answer option expands in-place with green/red indicator and a 1-2 sentence explanation
- A small "More" button in the inline feedback opens a full-screen panel with a detailed explanation, example sentence, and a 'Continue' button
- Tone is teacher-like: warm and educational (e.g., "Great job! は (wa) marks the topic of the sentence, like saying 'as for...' in English.")
- Wrong answers show both the correct answer AND an explanation of why the user's choice was wrong (e.g., "You picked 食べる (to eat) — that's a different verb. The lyric uses 食べた (ate), the past tense form.")

### Progress & completion display
- In-session progress: top progress bar filling left to right + question counter below it (e.g., "5/20")
- Song card in catalog: circular progress ring showing completion percentage (on the song thumbnail or corner)
- Song page exercise progress placement: Claude's discretion
- Stars hidden on unstarted songs (0 stars, 0% progress) — only shown after the user completes at least one session

### Star mastery presentation
- Three star icons in a row below the song title on song cards — filled gold for earned, outline/gray for unearned (classic Angry Birds style)
- Stars hidden on cards until user has started practicing the song
- Earning a new star triggers an animated star fill with a shine animation and brief confetti burst (~1.5s)
- Song page displays clear criteria for the next star (e.g., "Star 2: Complete Fill-the-Lyric at 80%+ accuracy") with current progress toward it

### Claude's Discretion
- Fill-the-Lyric audio replay in feedback (whether to replay the verse moment where the target word appears)
- Exercise progress section placement on the song page (below player, sidebar tab, or other)
- Exact question count for short vs full session modes
- Loading states and transition animations between questions

</decisions>

<specifics>
## Specific Ideas

- Short vs full session choice is about respecting the user's time — a 2-minute practice session should still feel rewarding and move the needle on progress
- The "More" button on feedback is key — most answers get a quick inline explanation, but curious learners can drill deeper without slowing down the flow
- Confetti on star earning should feel celebratory but not cheesy — quick and satisfying, not over-the-top
- Circular progress ring on song cards creates a visual "collection" feel — users can scan their catalog and see where they stand at a glance

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-exercise-engine*
*Context gathered: 2026-04-15*
