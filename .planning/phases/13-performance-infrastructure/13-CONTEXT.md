# Phase 13: Performance Infrastructure — Context

**Gathered:** 2026-04-23
**Status:** Scaffold — awaiting context-gathering session before planning

<domain>
## Phase Boundary

Ship the performance infrastructure whose shape is **independent of visual design**: caching, deferred loading, CI bundle budgets. Deliberately excludes Lighthouse / LCP / TTI *scoring* — those targets were moved to the Phase 19 beta-launch entry gate so we don't measure pages about to be redesigned in Phase 14.

**What this phase IS:**
- **Lesson cache on repeat visit** — already-visited song lessons serve from cache, no cold Neon hit
- **Deferred YouTube iframe** — iframe mounts only when in viewport; lesson panel paints independently of the video load
- **CI bundle budget** — song page JS ≤200KB gzipped, enforced in CI so future work can't silently regress it (and so Phase 14 UX polish is constrained from day one)

**What this phase is NOT:**
- Lighthouse scoring → Phase 19 entry gate
- LCP / TTI target validation → Phase 19 entry gate
- Visual performance (animations, transitions) → Phase 14 UX Polish
- Pipeline / Whisper / LLM throughput → out of scope entirely; those are batch/backend concerns
- DB query optimization in isolation → only the user-facing repeat-visit cache path

</domain>

<rationale>
## Why This Split (Recorded 2026-04-23)

Original Phase 13 bundled infra + scoring into a single phase, sequenced before Phase 14 UX Polish. During scoping we flagged the ordering conflict:

- UX Polish changes the visual shape of the pages we'd be scoring.
- A Lighthouse score set before Phase 14 would immediately drift after it lands.
- But the *infra* parts (CI budget, iframe defer, cache layer) are orthogonal to visual design and actually **constrain** what Phase 14 can ship.

Resolution: narrow Phase 13 to infra only; move the two scoring criteria (Lighthouse ≥85, LCP <2.5s / TTI <3.5s on 4G Moto G4) into a Phase 19 **Entry Gate**. Phase 19 loops back to 13/14 if the gate misses.

Phase numbers 14–20 unchanged.

</rationale>

<decisions>
## Decisions Settled

- **Scope:** infra only (3 success criteria). Scoring deferred.
- **Sequencing:** Phase 13 before Phase 14. The CI bundle budget is a pre-condition for Phase 14 polish, not a post-hoc audit.
- **Measurement gate:** lives in Phase 19 launch entry, not Phase 13 exit.
- **Test-verify every change (locked 2026-04-24):** Every code change in Phase 13 must be verified with the appropriate test layer before it is reported done. `npm run build` passing is NOT sufficient — a type-level fix can still be behavior-wrong. Required layers:
  - DB / server-action / cache changes → `npm run test:integration` (hits Neon via TEST_DATABASE_URL)
  - Client component changes affecting the song page, exercises, or player → `npm run test:e2e` (Playwright)
  - Pure-logic / pure-function changes → `npm run test:unit`
  If a change crosses layers (e.g. iframe defer touches client + server render), run both.

</decisions>

<open_questions>
## Open Questions for Planning Session

The following need user input before plans can be written:

### Caching
- **Strategy:** Next.js `unstable_cache`, React `cache()`, HTTP cache headers at the route level, or a bespoke IndexedDB/localStorage lesson store?
- **Scope:** cache the full lesson JSONB per `song_version_id`, or just the computed derivatives (tokenized furigana, vocab list)?
- **Invalidation:** TTL? manual bump on lesson edit? tied to song_version UUID?
- **Server vs client:** cache server-side (reduce Neon hit) or client-side (reduce round-trip)? Both?

### YouTube iframe defer
- **Mechanism:** IntersectionObserver + lazy mount, or a "facade" pattern (thumbnail + play-click triggers iframe mount)?
- **Interaction with PlayerContext:** Phase 10 introduced an imperative PlayerContext (`seekTo/play/pause/isReady`). How does deferred mount interact with the exercise session's `play` call for listening drills — do we force-mount on first exercise interaction?
- **Fallback:** what renders in the iframe's slot before mount — placeholder image, skeleton, nothing?

### CI bundle budget
- **Tool:** `@next/bundle-analyzer` + `size-limit`? `bundlewatch`? Next's built-in route-level output parsed in CI?
- **Which pages:** song page only (as per success criterion), or also home, catalog, /path, /vocabulary, /review?
- **Budget scope:** first-load JS only, or per-route JS total? Include CSS?
- **Failure mode:** hard-fail the PR, or warn-only until baselines settle?

### Measurement (deferred to Phase 19)
- Even though scoring isn't a Phase 13 criterion, someone needs to capture a **baseline** now so we know the direction of travel. Quick Lighthouse run against localhost:7000 home/catalog/song → one-off, not wired into CI.

</open_questions>

<deferred>
## Deferred

- **Lighthouse ≥85 across home/catalog/song** → Phase 19 Entry Gate
- **LCP <2.5s / TTI <3.5s on Moto G4 4G** → Phase 19 Entry Gate
- **First Meaningful Paint <2s** target wording — original Phase 13 goal sentence; dropped as redundant with LCP once measurement moved to 19
- **Perceived exercise interaction latency** — the original Phase 13 goal mentioned "no perceptible lag during exercise interactions" but that has no crisp infra criterion; if it becomes a problem, addressed reactively in Phase 20 code-quality pass

</deferred>

<project_context>
## Project State (snapshot 2026-04-23)

- **Content blocker precedes this phase:** 192 songs missing lessons (see [CONTEXT.md](../../../CONTEXT.md)); Phase 13 work is unlikely to start until the catalog is closer to full, since measuring perf on a 131-row catalog with incomplete lessons doesn't reflect production shape.
- **Phase 12 completed** 2026-04-19 — XP/streak/level infra and `/path` route landed. Any new bundle-budget rules will need to absorb Phase 12's HUD additions as the baseline, not a regression.
- **Phase 10 PlayerContext** (2026-04-18) — imperative YouTube controls exist; the iframe-defer plan needs to respect this API.

</project_context>

---

*Phase: 13-performance-infrastructure*
*Context scaffolded: 2026-04-23*
