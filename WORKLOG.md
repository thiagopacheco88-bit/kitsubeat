# KitsuBeat Worklog

Track actual deliveries to ground future pace estimates in real data.

## How to use this file

- **Add an entry every working day** (or at minimum, every day you ship something)
- **Hours are rough** — "~3h evening session" is fine, "morning + afternoon, ~6h total" is fine
- **Shipped = what merged, not what you tried** — half-done work goes in Notes
- **Update the dashboard** at the top when you cross a milestone

---

## Pace Dashboard

| Metric | Value | As of |
|---|---|---|
| Project start | 2026-04-12 | filesystem |
| Days elapsed | 20 | 2026-05-02 |
| Active dev days | 15 | (5 idle: Apr 20-22, 25, 29) |
| Phases closed | 24 of 33 | + Phase 14.1 verified today |
| Hours delivered (estimated) | ~312 / 422 | **~74% of total scope** |
| Active phases | 14.2 (SPEC'd), 14.4 (INTENT, blocked), 14.5 (roadmap), 11.6-13 (gap closure) | v3.0 redesign chain: 14.2 → 14.3 → 14.4 |
| Total scope grew | +117h since Apr 28 | +11.6, +14.1, +14.2 NEW, +14.3 NEW, +14.4 NEW, +14.5 NEW |
| Deferred | Phase 6 (Anki Export) | Merged into Phase 18 GDPR data export |
| Current target launch | late June 2026 | beta-validated (50 signups + 20% day-7) |
| Hard stop | October 2026 | baby due |

**Velocity:** ~11-13 hours/active-day; 21 phases closed in 20 calendar days. Scope keeps growing alongside delivery — % done stable around 67% as new decimals appear (11.5, 11.6).

---

## Phase Timeline (current)

| # | Phase | Planned | Actual | Description | Status | Hrs | Hrs Done | % Done | % Total |
|---|---|---|---|---|---|---:|---:|---:|---:|
| **v1.0** | | | | | | | | | |
| 1 | Content Pipeline | — | 2026-04-13 | 200-song lesson seeding via Claude Batch + WhisperX | ✓ Done | 12 | 12 | 100% | 3.1% |
| 2 | Player Experience | — | 2026-04-13 | YouTube player + furigana + grammar color + verse sync | ✓ Done | 10 | 10 | 100% | 2.6% |
| 3 | Auth + Catalog + Freemium | — | 2026-04-13 | Supabase auth, song browse, DB-layer freemium gate | ✓ Done | 8 | 8 | 100% | 2.1% |
| 4 | AI Search + Payments | — | 2026-04-13 | Semantic search, Lemon Squeezy checkout | ✓ Done | 6 | 6 | 100% | 1.6% |
| 5 | Exercises + Gamification (legacy) | — | 2026-04-13 | Superseded by Phase 12 | ✓ Done | 4 | 4 | 100% | 1.0% |
| 6 | Anki Export | DEFER | — | Merged into Phase 18 GDPR data export | ⏸ Deferred | 2 | 0 | 0% | 0.5% |
| **v2.0** | | | | | | | | | |
| 7 | Data Foundation | 2026-04-15 | 2026-04-15 | Vocab UUIDs, FSRS schema, conjugation parser | ✓ Done | 6 | 6 | 100% | 1.6% |
| 8 | Exercise Engine + Stars | 2026-04-16 | 2026-04-16 | 4 exercise types, Zustand sessions, 2-star mastery | ✓ Done | 12 | 12 | 100% | 3.1% |
| 8.1 | E2E QA Suite | 2026-04-17 | 2026-04-17 | Playwright + Vitest + 15-min budget | ✓ Done | 10 | 10 | 100% | 2.6% |
| 8.2 | FSRS Progressive Disclosure | 2026-04-17 | 2026-04-17 | Per-vocab FSRS, 3-tier display | ✓ Done | 6 | 6 | 100% | 1.6% |
| 8.3 | Mnemonic + Kanji Breakdown | 2026-04-18 | 2026-04-18 | 705 vocab rows enriched | ✓ Done | 8 | 8 | 100% | 2.1% |
| 8.4 | Learn Phase + Session Pacing | 2026-04-18 | 2026-04-18 | LearnCard, skip_learning, new-card cap | ✓ Done | 6 | 6 | 100% | 1.6% |
| 9 | Kana Trainer | 2026-04-18 | 2026-04-18 | Hiragana/katakana row-unlock, 10-star mastery | ✓ Done | 8 | 8 | 100% | 2.1% |
| 10 | Advanced Exercises | 2026-04-18 | 2026-04-18 | Conjugation, listening drill, sentence order, Star 3 | ✓ Done | 10 | 10 | 100% | 2.6% |
| 11 | Cross-Song Vocabulary | 2026-04-18 | 2026-04-18 | /vocabulary dashboard, /review queue | ✓ Done | 8 | 8 | 100% | 2.1% |
| 11.1 | Add-Song Pipeline | 2026-04-26 | 2026-04-26 | Durable CLI: discovery → lyrics → lesson → DB | ✓ Done | 8 | 8 | 100% | 2.1% |
| 11.2 | TV-Derive Rework (Demucs + NW) | 2026-05-03 | 2026-04-30 | Repaired 60 TV songs with Needleman-Wunsch — 7 plans + spot-check + rollout | ✓ Done | 22 | 22 | 100% | 5.7% |
| 11.3 | Fix Untranslated JP Verses | 2026-04-27 | 2026-04-27 | 970 broken verses re-translated (inline-Claude pivot) | ✓ Done | 10 | 10 | 100% | 2.6% |
| 11.4 | Visual Vocabulary Foundation | 2026-04-30 | 2026-04-28 | image_url column + LearnCard/FeedbackPanel render + 50-image curate set | ✓ Done | 5 | 5 | 100% | 1.3% |
| 11.5 | Admin Lyrics Editor | 2026-05-08 | 2026-05-02 | 10 plans: schema, clerk gate, route shell, verse editor, AI fill, publish, swap-video, flag-broken, regenerate-lessons | ✓ Done | 18 | 18 | 100% | 4.7% |
| 11.6 | Beginner-Focused Practice Redesign | 2026-05-08 | 2026-05-02 | VERIFIED 16/18 reqs. 12/13 plans done — 3-track ExerciseTab, dual FSRS cards, ComfyUI infra, Unsplash auto-fetcher, dual-card review queue, verse-domination UI. 11.6-13 (~3h gap closure) pending | 🟡 In flight (no blocker) | 35 | 32 | 91% | 9.1% |
| **v3.0** | | | | | | | | | |
| 12 | Learning Path + Gamification | 2026-04-19 | 2026-04-19 | XP, streaks, levels, /path route, cosmetics | ✓ Done | 10 | 10 | 100% | 2.6% |
| 13 | Performance Infrastructure | 2026-05-05 | 2026-04-30 | CI bundle budgets, lesson cache, IO-deferred YouTube iframe | ✓ Done | 12 | 12 | 100% | 3.1% |
| 14 | UX Polish | 2026-05-04 | 2026-05-02 | VERIFIED 8/9 SPEC-REQs (a11y A1 resolved). 10 plans: Wave 0 infra, primitives, theme tokens, dark/light, motion, 11 surface migrations | ✓ Done | 33 | 33 | 100% | 8.6% |
| 14.1 | Redesign Path | 2026-05-04 | 2026-05-03 | VERIFIED 8/8 SPEC-REQs (5 human UAT items pending). 13 plans done across 5 waves — CA-hybrid /path redesign with PathHeader, HeroProgress, ContinueAnchor, KanaCheckpointNode, LanternStreak, TierDivider, cover-art PathNode | ✓ Done | 20 | 20 | 100% | 4.9% |
| 14.2 | Redesign Home (/) | 2026-05-05 | — | NEW — SPEC'd today, 9 reqs (home page redesign follow-on to Phase 14.1) | 🟢 Ready (deps done) | 12 | 1 | 5% | 2.9% |
| 14.3 | Redesign Lesson (/songs/[slug]) | 2026-05-07 | — | NEW — roadmap only, no directory yet. Densest surface (12 components) — music-player feel for lyrics, game feel for exercises | 🔴 Blocked by 14.2 | 15 | 0 | 0% | 3.6% |
| 14.4 | Virality + Engagement | 2026-05-09 | — | INTENT.md only. Depends on **14.1 ✓ + 14.2 + 14.3 + Clerk plan tier definition** — must inherit full visual vocabulary | 🔴 Blocked by 14.2, 14.3 | 15 | 0 | 1% | 3.6% |
| 14.5 | Iconography + Brand Revamp | 2026-05-08 | — | NEW — added to roadmap today; no directory yet. Depends on Phase 14.1 ✓ — parallelizable with 14.2 / 14.3 | 🟢 Ready (deps done) | 10 | 0 | 1% | 2.4% |
| 15 | Analytics + Error Tracking | 2026-05-11 | — | PostHog/Plausible funnel + Sentry + consent gating. Depends on Phase 14 ✓ | 🟢 Ready (deps done) | 10 | 0 | 0% | 2.5% |
| 16 | Security Review + IR | 2026-05-13 | — | RLS audit, rate limits, secrets scan, runbook. Roadmap deps Phase 15 but RLS independent | 🟢 Ready (parallel-safe) | 12 | 0 | 0% | 2.9% |
| 17 | Legal Research (DIY) | 2026-05-14 | — | 5/6 plans drafted; execute + 17-06 consolidation. Pure research — no code dep | 🟢 Ready (research is independent) | 10 | 3 | 30% | 2.5% |
| 18 | Legal Implementation | 2026-05-18 | — | T&Cs, privacy, cookie consent, DMCA, WCAG 2.1 AA, Anki/GDPR export. **Needs Phase 17 research output** | 🔴 Blocked by Phase 17 | 22 | 0 | 0% | 5.4% |
| 19 | Beta Launch + GTM | 2026-05-20† | — | Landing, 3 channels, 50 signups / 20% day-7 return. Needs Phase 18 (legal docs) + Phase 13 perf gate ✓ | 🔴 Blocked by Phase 18 | 15 | 0 | 0% | 3.7% |
| 20 | Test Coverage Pass | 2026-06-19 | — | Critical-path integration tests + ADRs + strict types. Needs Phase 19 real-usage data | 🔴 Blocked by Phase 19 | 12 | 0 | 0% | 2.9% |
| **TOTAL** | **33 phases** | | **24 closed + 4 active** | | | **422** | **312** | **74%** | **100%** |

†Phase 19 dev finishes ~May 22; beta-validation gate is calendar-bound 4 weeks → realistic launched-and-validated date ≈ **2026-06-19**.

## Status legend

- ✓ **Done** — verified or substantively shipped
- 🟡 **In flight** — actively being executed, no blocker
- 🟢 **Ready** — all dependencies met, can be picked up now
- 🔴 **Blocked** — waiting on a specific upstream phase
- ⏸ **Deferred** — explicitly punted (Phase 6 → folded into 18)

## What you can pick up right now (parallel-safe)

If you want to maximize parallelism while 14.1 finishes and 11.6-13 closes, these phases have **all dependencies met** and can be started in any order:

1. **Phase 14.4** (Virality + Engagement) — needs SPEC → plan → execute. ~15h.
2. **Phase 15** (Analytics + Error Tracking) — Phase 14 done. ~10h.
3. **Phase 16** (Security Review + IR) — RLS work doesn't actually require Phase 15. ~12h.
4. **Phase 17** (Legal Research) — pure research, independent. ~7h remaining (5/6 plans drafted).

Phases 18-20 form a strict serial chain after that: 17 → 18 → 19 → (4-week wait) → 20.

---

## Active / queued

### Phase 11.5 — Admin Lyrics Editor (in flight)
- SPEC'd 2026-05-01, 23 requirements locked
- Estimated 12h, 0% executed
- Next: `/gsd-discuss-phase 11.5 --auto` → plan → execute

### Phase 14 — UX Polish (in flight)
- SPEC'd 2026-05-01, 9 requirements locked, ambiguity 0.17
- Estimated 25h, 0% executed
- Next: `/gsd-discuss-phase 14 --auto` → plan → execute
- Blocker for Phase 19 launch (visual baseline before measurement)

---

## Daily entries

### 2026-05-01 (Fri) — TODAY
- **Hours:** TBD
- **Shipped:** Phase 11.5 SPEC (23 reqs, admin lyrics editor). Phase 14 SPEC (9 reqs, UX polish, ambiguity 0.17). Phase 13 docs closed.
- **Phase status:** 11.5 + 14 queued for plan/execute; v3.0 launch path active
- **Commits:** 3

### 2026-04-30 (Wed)
- **Hours:** TBD
- **Shipped:** **Phase 13 (Performance Infrastructure) VERIFIED** (13/13 source-level + 3 runtime UAT items). 6 code review fixes (CR-01, WR-01..05). Lighthouse baseline captured.
- **Phase status:** 13 closed; 11.2 also closed via SUMMARY chain
- **Commits:** 11

### 2026-04-29 (Tue) — IDLE

### 2026-04-28 (Mon)
- **Hours:** TBD (huge worktree-parallel day)
- **Shipped:** **Phase 11.4 (Visual Vocabulary Foundation) closed** — all 3 plans (schema + UI + curate). **Phase 13 plans 13-01 to 13-04 executed in parallel** via 4 worktree agents. Phase 11.2 plans 11.2-06 + 11.2-07 closeout (spot-check + rollout).
- **Phase status:** 11.2 + 11.4 closed; 13 wave-3 in flight
- **Commits:** 52
- **Notes:** Migration numbered 0014 (not 0009 — popularity_rank schema drift on `db:generate`). VocabEntrySchema uses `.optional()` not `.nullable()` (image_url has no semantic null state).

### 2026-04-27 (Sun)
- **Hours:** TBD
- **Shipped:** **Phase 11.3 (Untranslated JP Verses) VERIFIED** — 970 verses re-translated via inline-Claude pivot. Human UAT 3/3 Vercel spot-checks passed.
- **Phase status:** 11.3 closed
- **Notes:** Pivot from Ollama → inline-Claude saved the phase.

### 2026-04-27 (Mon)
- **Hours:** TBD
- **Shipped:** **Phase 11.3 (Untranslated JP Verses) VERIFIED** — all 970 verses re-translated via inline-Claude pivot (Ollama install failed, SPEC-REQ overrides accepted). Human UAT: 3/3 Vercel spot-checks passed.
- **Phase status:** 11.3 closed; 11.2 still in flight
- **Notes:** Pivot from Ollama → inline-Claude saved the phase. Translation-aware idempotency tests added (ME-01).

### 2026-04-26 (Sun)
- **Hours:** TBD
- **Shipped:** **Phase 11.1 (Add-Song Pipeline) VERIFIED** (11/11 must-haves, 1-day phase). 11.2 + 11.3 SPECs. Started 11.2-02 NW core. 11.3 inline-translation work.
- **Phase status:** 11.1 closed; 11.2 in flight; 11.3 in flight
- **Commits:** 21
- **Notes:** Caught catalog-wide TV-derive issue → 11.2. Discovered 970 broken JP verses → 11.3.

### 2026-04-25 (Sat) — IDLE

### 2026-04-24 (Fri)
- **Hours:** TBD
- **Shipped:** Phase 13 split into 13 (infra) + 19 (measurement gate). Cold-start retry wrapper for neon-http. Autonomous overnight orchestrator for post-repass data pipeline.
- **Commits:** 6

### 2026-04-23 (Thu)
- **Hours:** TBD
- **Shipped:** Lyrics-pipeline: retime validator, per-verse TV alignment, beat-tracked backfill, TV intro trim. run-pending-batch stall threshold 30m → 90m.
- **Commits:** 5

### 2026-04-20 → 2026-04-22 — IDLE (3 days)

### 2026-04-19 (Sat)
- **Hours:** TBD
- **Shipped:** **Phase 12 (Learning Path & Gamification) complete**. Phase 17 legal research — 5/6 plans drafted. v3.0 milestone scaffolding. Phase 17 context.
- **Commits:** 50

### 2026-04-18 (Fri)
- **Hours:** TBD (huge day)
- **Shipped:** **Phase 8.4 closeout**. **Phase 9 (Kana Trainer) closeout** (5/6 plans). **Phase 10 (Advanced Exercises) complete** (7/7 plans). **Phase 11 (Cross-Song Vocabulary) complete** (5/5 plans). Cleanup-error-handling pass 6.
- **Commits:** 95

### 2026-04-17 (Thu)
- **Hours:** TBD (huge day)
- **Shipped:** Mobile layout stabilization. **Phase 8.1 (E2E QA suite) complete** (8/8 plans). **Phase 8.2 (FSRS progressive disclosure) complete** (3/3 plans). neon-http callback-tx fix.
- **Commits:** 87

### 2026-04-16 (Wed)
- **Hours:** TBD
- **Shipped:** **Phase 8 plans 1-4 (Exercise Engine)** — schema, generator, UI, session summary. zustand + canvas-confetti.
- **Commits:** 21

### 2026-04-15 (Tue)
- **Hours:** TBD
- **Shipped:** **Phase 7 (Data Foundation) complete** — vocab UUIDs, FSRS presets, conjugation parser, vocabulary backfill. Phase 8 plan drafted.
- **Commits:** 13

### 2026-04-14 (Mon)
- **Hours:** TBD
- **Shipped:** v2.0 milestone scaffolding — 47 requirements, roadmap (6 phases), domain research.
- **Commits:** 4

### 2026-04-13 (Sun)
- **Hours:** TBD
- **Shipped:** **Initial commit** — v1.0 base (player, auth, payments, 200-song pipeline).
- **Commits:** 1
- **Notes:** v1.0 was built between 2026-04-12 (oldest file) and 2026-04-13 (first commit). Probably 1-2 intense days.

---

## Ongoing entry template

Copy-paste for new days:

```
### YYYY-MM-DD (Day)
- **Hours:** ~Xh
- **Shipped:** <one line — phase, plan, or feature that landed>
- **Phase status:** <what's in flight, what's blocked>
- **Notes:** <optional — surprises, decisions, blockers>
```
