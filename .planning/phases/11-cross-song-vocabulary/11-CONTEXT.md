# Phase 11: Cross-Song Vocabulary - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Surface vocabulary mastery across all songs. Deliverables:
1. "You know X/Y" known-word counts on song pages (SSR + live refresh after a session)
2. Per-word "Seen in: [songs]" cross-reference on mastery detail surfaces
3. Global learned-word counter on profile + header nav
4. Vocabulary dashboard listing all known words with mastery metadata (grouped by FSRS tier)
5. Premium cross-song SRS review queue at `/review` with FSRS-style daily limit
6. Freemium gating where free users see motivation surfaces (counter + preview dashboard) but the review queue sits behind the paywall

Mastery identity/propagation is infra already delivered by Phase 08.2 (writes against `vocabulary_items` UUID, not per-song). This phase is surfacing and aggregating that data — no new FSRS or mastery-schema work.

</domain>

<decisions>
## Implementation Decisions

### Known-word counts on song pages
- **"Known" threshold:** FSRS Tier 2+ (kanji+furigana reveal). Matches the existing progressive-disclosure tier ladder; a word is "known" once it has earned its first successful review. Tier 1 (Learning/Relearning) does NOT count.
- **Placement:** Song header, near the title — visible pre-scroll, same horizontal band as play/start buttons.
- **Refresh strategy:** SSR on page load, then client refetches after `saveSessionResults` so newly-mastered words update without a full navigation. Not fully reactive — no subscription/polling.
- **Zero state:** When user has 0 Tier-2+ words for the song, render a "New to you" pill instead of "0/12". Cleaner signaling than a negative zero-count.

### Vocabulary dashboard UX
- **Primary layout:** Grouped by FSRS tier — three stacked sections (Mastered / Known / Learning). Reinforces the tier ladder visually and maps 1:1 to the same tiers used in TierText.
- **Sort/filter controls:**
  - Sort by tier/mastery (most → least or inverse)
  - Filter by tier (T1 only / T2 only / T3 only)
  - Filter by source song
  - (Last-seen sort was NOT selected — omit from v1)
- **Per-word metadata shown:**
  - Source song count + click-through expandable list (satisfies SC-2 "Seen in: [songs]")
  - Part of speech + JLPT level
  - FSRS due date
  - (Tier badge is implicit from the grouped layout — do not duplicate as inline chip)
- **Entry points:** Both header nav link (next to Profile) AND a Profile page section/CTA. Maximizes discoverability; profile entry co-locates with the global learned counter.

### Cross-song SRS review queue
- **Surface:** Dedicated `/review` page with its own session engine. Explicitly NOT reusing ExerciseSession verbatim (ruled out by user). Dedicated route supports deep-linking, bookmarking, and a daily-return cadence.
- **Exercise types in queue:** Meaning→Vocab, Vocab→Meaning, Reading Match. Fill-the-Lyric is EXCLUDED — it requires verse context and doesn't survive decontextualized cross-song review.
- **Session bounds:** FSRS-style daily limit (e.g. 50 new + all due). Classic Anki pattern — realistic for heavy users building daily habit. Exact new-card cap tunable; "all due" is uncapped by design for this phase.
- **Free-tier behavior:** Free users see the "X cards due" count on `/review` but cannot start a session — `Start Review` CTA triggers the upsell modal.

### Free vs premium gating
- **Dashboard access:**
  - Free users see a PREVIEW (e.g. top 20 words) + CTA to upgrade for the full list
  - Premium users see the complete tier-grouped dashboard with all controls
- **Global learned counter:** Free on BOTH profile and header. The counter is a motivation lever that drives upgrade intent ("I've learned 84 words") — hiding it reduces conversions rather than protecting premium value.
- **Upsell placement:** Modal triggered on free user's `Start Review` click on `/review`. No inline banner — relies on natural-value moment when user is already reaching for the feature. (Preview-dashboard CTA is a separate link/button, not a modal — modal is specifically the review-queue gate.)

### Claude's Discretion
- **Gate implementation:** Pick whichever fits cleaner at implementation time — either reuse the `isPremium()` helper from `userPrefs.ts` (Phase 08.4 single-source-of-truth) OR add a `reviewAccess()` helper alongside `checkExerciseAccess()` (mirrors Phase 08.1 one-gate-per-domain pattern). Both are valid; planner/researcher decides based on how the data-layer reads shake out.
- **Preview dashboard composition:** Which 20 words appear in the free-tier preview (most recent? highest tier? random sample of each tier?). Default to "most recently mastered" unless a better UX reason emerges during planning.
- **Daily-limit exact numbers:** New-per-day cap and overall session ceiling — tune during planning; "50 new + all due" is the shape, not a locked number.
- **Header nav placement and layout:** Where exactly the dashboard link sits relative to existing Profile/header items; how the learned counter is rendered (badge vs text). Keep consistent with existing header conventions.
- **Upsell modal copy and visual treatment.**

</decisions>

<specifics>
## Specific Ideas

- The `/review` page is its own destination, not a dashboard sub-view — it's where the daily ritual lives, bookmarkable, shareable from future push reminders.
- Dashboard grouping should visually match the same three-tier ladder used in progressive disclosure (TierText / MasteryDetailPopover) — users recognize the same vocabulary of tiers across the app.
- Global learned counter is a "motivation hook" specifically — its purpose is to expose progress, not to be an analytic stat. Treat it as celebratory.

</specifics>

<deferred>
## Deferred Ideas

- Leech handling (cards failing repeatedly) — not discussed; likely a Phase 13+ polish item.
- Streak mechanics (consecutive days reviewing) — gamification, deferred.
- Push/email review reminders — cross-cutting notification infra, deferred.
- Per-word actions (reset mastery, bury card) — power-user controls, deferred.
- Empty-state / first-visit dashboard copy — planning-time detail.
- Mobile-specific dashboard layout variations beyond standard responsive behavior.
- Last-seen sort on dashboard — explicitly not selected; revisit if users ask for stale-card surfacing.

</deferred>

---

*Phase: 11-cross-song-vocabulary*
*Context gathered: 2026-04-18*
