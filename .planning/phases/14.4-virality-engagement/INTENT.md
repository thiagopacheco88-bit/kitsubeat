# Phase 14.4 — Virality & Engagement (INTENT stub)

**Status:** stub. Run `/gsd-spec-phase 14.4-virality-engagement` to formalize when Phases 14.1 / 14.2 / 14.3 redesigns land.

**Created:** 2026-05-02 (deferred from Phase 14.x design revamps). Renumbered 14.2 → 14.4 on 2026-05-02 to reserve 14.2 (home redesign) and 14.3 (lesson redesign) — see `HUASHU-BRIEFINGS.md` and `_temp/path-redesign/` for the redesign demos.

**Why this phase:** Phase 14 normalized the design system; Phases 14.1 (`/path`), 14.2 (`/`), 14.3 (`/songs/[slug]`) refine the visual language across the three top-priority surfaces. Those revamps explicitly defer two virality concepts because they require new functionality, not just new visuals.

## Scope

### 1. Visible social activity
Source: viral-app-design concepts review, point 5 (Discord active-users reference).

Sub-features (to be triaged in `/gsd-spec-phase`):
- "Now playing" live signals on home (e.g. "12 learners on this song right now")
- Recently-mastered community feed (cross-user, anonymized OK for MVP)
- Follow-a-friend MVP — gated by Clerk org/user-link plan
- Per-song mastery leaderboard (weekly reset, opt-in)

Schema impact: likely new tables (`follows`, `activity_events`, `leaderboard_snapshots`). Realtime delivery via Supabase realtime or polling.

### 2. Streak behavioral hooks
Source: viral-app-design concepts review, point 6b. Visual streak amplification (chip, flames, day-of-week pops) belongs in Phase 14.1; THIS scope covers retention mechanics:

- Daily reminder system: web push (where supported) OR transactional email
- Streak-saver token (one-time recovery, earned via X-day milestone)
- Weekly recap email — vocab learned, songs touched, streak status

## Open questions for `/gsd-spec-phase`
- Social MVP: friends-with-graph or anonymous cohort signals only?
- Push notifs: web push API (Service Worker) or email-only first?
- Streak-saver: free or premium-gated?

## Constraints (locked)
- All social features must be opt-in (privacy by default)
- All retention mechanics must respect reduced-motion + reduced-anxiety patterns (no streak-shaming dark patterns)
- Must inherit Phase 14.1 visual language — cannot ship before 14.1 lands

## Depends on
- Phase 14.1 redesign (must complete first to inherit visual vocabulary)
- Clerk plan tier definition (premium vs free)

## Source
- `HUASHU-BRIEFINGS.md` (the "DEFERRED to Phase 14.4" note in the Virality goals section)
- 6 viral-app-design concept slides reviewed 2026-05-02 (instant feedback / one clear action / frictionless / emotional / visible social / streaks)
