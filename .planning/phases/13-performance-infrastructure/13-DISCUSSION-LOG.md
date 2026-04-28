# Phase 13: Performance Infrastructure — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in [13-CONTEXT.md](./13-CONTEXT.md) — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 13-performance-infrastructure
**Areas discussed:** Cache mechanism, Iframe defer mechanism, Bundle tooling & CI, Lighthouse baseline capture
**SPEC.md:** Loaded (3 requirements, ambiguity 0.084 / gate ≤0.20). Discussion focused on HOW only.

---

## Cache Mechanism

### Q1 — Cache shape: how should the lesson body cross-request cache be wired on /songs/[slug]?

| Option | Description | Selected |
|---|---|---|
| A: Static + revalidateTag (Recommended) | Remove force-dynamic; route becomes static; lesson edits call `revalidateTag('song:${slug}')`; eliminates cold-SSR cost AND DB queries on cache hit | ✓ |
| B: unstable_cache wrapper, page stays dynamic | Wrap getSongBySlug + vocab enrichment query; page keeps force-dynamic; saves Neon round-trips but cold-SSR cost remains | |
| Hybrid: A + unstable_cache too | Static page + cache the underlying queries too (belt + suspenders) | |

**User's choice:** A: Static + revalidateTag (Recommended)
**Notes:** Option B preserves cold-SSR work for no proportional gain. Option A is decisive — kills both DB and cold-SSR cost.

### Q2 — Cache invalidation: when should `revalidateTag('song:${slug}')` be called?

| Option | Description | Selected |
|---|---|---|
| Tag-only on lesson edit (Recommended) | Wire revalidateTag at every lesson-mutating code path; no TTL | ✓ |
| Tag + safety-net TTL (24h) | Same tags + `revalidate: 86400` so missed invalidations self-heal | |
| TTL-only | Just `revalidate: 3600`, skip the tag | |

**User's choice:** Tag-only on lesson edit (Recommended)
**Notes:** Cleanest semantics; cache is correct iff every writer revalidates. Risk acknowledged: a future writer that forgets revalidate causes stale lessons. Mitigation: centralise lesson-write surface.

### Q3 — Per-user data decoupling: how should <KnownWordCount> stop poisoning the cached page?

| Option | Description | Selected |
|---|---|---|
| Client-fetch via existing /api/review/known-count (Recommended) | <KnownWordCount> turns into a client component; fetches on mount with skeleton | ✓ |
| Sibling Server Component with Suspense | Stream the per-user component via Suspense; per-user data still hits Neon | |
| Both — server first paint + client refetch | Server-component for first paint + client effect for staleness after exercises | |

**User's choice:** Client-fetch via existing /api/review/known-count (Recommended)
**Notes:** API route already exists; component already takes `initial` prop. Minimal change, ships fastest.

### Q4 — Cache acceptance test surface: how should the "0 Neon queries on 2nd request" assertion be implemented?

| Option | Description | Selected |
|---|---|---|
| Integration test: instrumented Neon client (Recommended) | Test-only query-counter shim; two sequential renders; assert counter = 0 on 2nd; revalidateTag → counter non-zero on 3rd | ✓ |
| Server-Timing header assertion | Emit Server-Timing on /songs/[slug]; Playwright reads header to assert hit/miss + query count | |
| Manual + dev-time check only | Reload in dev, watch Neon dashboard; no automated regression coverage | |

**User's choice:** Integration test: instrumented Neon client (Recommended)
**Notes:** Lives in `npm run test:integration` per the test-verify rule. Counter shims around `src/lib/db/index.ts:39` Neon HTTP wrapper.

---

## Iframe Defer Mechanism

### Q5 — Defer mechanism: IntersectionObserver lazy-mount or facade pattern?

| Option | Description | Selected |
|---|---|---|
| A: IntersectionObserver lazy-mount (Recommended) | Placeholder until container enters viewport; iframe mounts on IO trigger; UX identical to today | ✓ |
| B: Facade (poster + click-to-play) | YT thumbnail + play button; iframe + YT API JS never load until user clicks; biggest perf win but UX change | |
| Both — facade on mobile, IO on desktop | Two paths; LCP measurement becomes form-factor dependent | |

**User's choice:** A: IntersectionObserver lazy-mount (Recommended)
**Notes:** Facade pattern deferred; revisit in Phase 14 if A doesn't move LCP enough at Phase 19 entry gate.

### Q6 — Placeholder appearance: what renders in the iframe's slot before mount?

| Option | Description | Selected |
|---|---|---|
| Plain skeleton box, same dimensions (Recommended) | aspect-video bg-zinc-800 animate-pulse; zero extra requests; zero CLS | ✓ |
| Blurred YouTube thumbnail | i.ytimg.com thumbnail blurred behind placeholder; visually richer but adds an image request | |
| Empty space — dimensions reserved, nothing rendered | Reserve aspect-ratio box, render nothing; fastest but feels broken | |

**User's choice:** Plain skeleton box, same dimensions (Recommended)
**Notes:** Phase 14 polish can swap the visual without touching defer logic.

### Q7 — IntersectionObserver `rootMargin`: how aggressively should the iframe pre-mount?

| Option | Description | Selected |
|---|---|---|
| rootMargin: '200px' (Recommended) | Mounts within 200px of viewport; smooth UX, real defer past first paint | ✓ |
| rootMargin: '0px' (strict viewport) | Maximum defer; visible "video loading" delay when player enters view | |
| rootMargin: '50%' (preload almost immediately) | Loads on most desktop layouts; only defers on mobile | |

**User's choice:** rootMargin: '200px' (Recommended)
**Notes:** Balances perf (defers iframe past first paint) with UX (no scroll → wait → play stutter).

### Q8 — Practice tab interaction: what happens when ListeningDrill `play()` fires before iframe mount?

| Option | Description | Selected |
|---|---|---|
| Force-mount iframe when Practice tab opens (Recommended) | ExerciseTab opens → bypass IO gate; drills always work | ✓ |
| Rely on existing embedState='loading' fallback | No force-mount; spec needs to scroll player into view before opening Practice; test friction | |
| Force-mount when ANY player API method is called | Hook into PlayerContext imperative API; covers all callers | |

**User's choice:** Force-mount iframe when Practice tab opens (Recommended)
**Notes:** Listening Drill E2E (`advanced-drill-quota.spec.ts` + Phase 10 spec) must remain green. Implementation surface (context flag vs imperative call) is planner's discretion.

---

## Bundle Tooling & CI

### Q9 — Bundle measurement tool: what enforces the 50 KB gzipped budget?

| Option | Description | Selected |
|---|---|---|
| size-limit + @next/bundle-analyzer (Recommended) | size-limit for hard CI gate; bundle-analyzer behind ANALYZE=true for human investigation | ✓ |
| Hand-rolled tsx parsing .next/build-manifest.json | Zero deps; brittle to Next minor version manifest changes | |
| bundlewatch | Older de-facto tool; less actively maintained than size-limit | |

**User's choice:** size-limit + @next/bundle-analyzer (Recommended)

### Q10 — PR feedback surface: how should bundle size be reported on PRs?

| Option | Description | Selected |
|---|---|---|
| size-limit-action: PR comment + status check (Recommended) | andresz1/size-limit-action@v1; sticky PR comment with measured size + delta + status check gate | ✓ |
| Status check only | No PR comment; less visible signal | |
| Custom comment via gh CLI | Maximum control; reinventing the action | |

**User's choice:** size-limit-action: PR comment + status check (Recommended)
**Notes:** Workflow needs `permissions: { pull-requests: write }` for comment to land.

### Q11 — Budget scope: strict /songs/[slug] only, or also other routes?

| Option | Description | Selected |
|---|---|---|
| Strict /songs/[slug] only (Recommended) | Honor SPEC verbatim; other routes have no hard gate | ✓ |
| Strict song page + advisory for / and /songs | Adds informational entries for Phase 19 gate routes | |
| Add budgets for all critical routes now | Lock in /, /songs, /songs/[slug] budgets together | |

**User's choice:** Strict /songs/[slug] only (Recommended)
**Notes:** Broader budget table deferred to Phase 19 entry gate; SPEC explicitly defers per-route budgets.

### Q12 — Workflow integration: how should the bundle check fit into qa-suite.yml?

| Option | Description | Selected |
|---|---|---|
| Extend pr-checks job (Recommended) | Add npm run build + npm run size to existing job; reuses checkout + cache | ✓ |
| New dedicated bundle-check job | Cleaner separation; ~2 min extra PR cycle time | |
| Run only on file paths that affect bundle | paths: filter; status check appears 'skipped' on filtered PRs | |

**User's choice:** Extend pr-checks job (Recommended)
**Notes:** No `paths:` filter — bundle check always runs for consistent status check column.

### Q13 — size-limit measurement target: what file paths represent /songs/[slug] First Load JS?

| Option | Description | Selected |
|---|---|---|
| size-limit's --why + Next preset (Recommended) | @size-limit/preset-app with glob patterns for content-hashed Next chunks | ✓ |
| Hand-rolled tsx reading .next/build-manifest.json | Authoritative but brittle to Next minor versions | |
| Parse next build stdout in CI | Easiest to write; stdout format undocumented | |

**User's choice:** size-limit's --why + Next preset (Recommended)
**Notes:** Exact path set derived once from a fresh `next build` and recorded in `.size-limit.cjs` with a comment pointing at the build output that established it.

---

## Lighthouse Baseline Capture

### Q14 — Baseline scope: which routes get a Lighthouse run?

| Option | Description | Selected |
|---|---|---|
| Home + catalog + song page (Recommended) | /, /songs, /songs/[slug] — the three Phase 19 entry-gate routes | ✓ |
| Song page only | Smallest baseline; no data for / and /songs | |
| All major user-facing routes | /, /songs, /songs/[slug], /path, /vocabulary, /review — most data, includes noise | |

**User's choice:** Home + catalog + song page (Recommended)
**Notes:** Informational only — NOT a Phase 13 exit criterion.

### Q15 — Lighthouse run conditions: device profile and source environment?

| Option | Description | Selected |
|---|---|---|
| Mobile + desktop, against localhost:7000 prod build (Recommended) | Both presets against `npm run build && npm run start`; matches Phase 19's eventual setup | ✓ |
| Mobile only, localhost:7000 prod | Phase 19 only gates on mobile; faster | |
| Mobile + desktop, against deployed Vercel preview | Real-user network; introduces deployment + region variability | |

**User's choice:** Mobile + desktop, against localhost:7000 production build (Recommended)
**Notes:** Mobile is the Phase 19 gate target (Moto G4 4G profile, ≥85 perf, LCP <2.5s, TTI <3.5s).

### Q16 — Where should the Lighthouse baseline numbers live?

| Option | Description | Selected |
|---|---|---|
| 13-SUMMARY.md baseline table + raw JSON in artifact dir (Recommended) | Score table in SUMMARY + raw lighthouse JSON in lighthouse-baseline/ for Phase 19 audit-level diff | ✓ |
| 13-SUMMARY.md table only, no raw JSON | Headline numbers only; lose audit-list detail | |
| Standalone LIGHTHOUSE-BASELINE.md doc | Dedicated doc; SPEC AC says SUMMARY.md records the baseline | |

**User's choice:** 13-SUMMARY.md baseline table + raw JSON in artifact dir (Recommended)
**Notes:** SPEC AC #11 says Phase 13 SUMMARY.md records the local Lighthouse baseline.

### Q17 — Which song slug should be the Lighthouse target for /songs/[slug]?

| Option | Description | Selected |
|---|---|---|
| A median-bundle representative song (Recommended) | npm script picks median-by-lesson-JSON-byte-size; slug recorded in SUMMARY for reproducibility | ✓ |
| The catalog's heaviest song | Pessimistic upper bound; most users never hit it | |
| Hardcode a known-stable slug (e.g., 'gurenge') | Maximally reproducible; drifts as content evolves | |

**User's choice:** A median-bundle representative song (Recommended)
**Notes:** Picker writes chosen slug to `lighthouse-baseline/target-song.txt` so Phase 19 can re-run against the same target.

---

## Closing prompt

### Q18 — Done with discussion?

**User's choice:** "go with recommendations" → mapped to "I'm ready for context"
**Notes:** No additional gray areas requested. Proceed to write CONTEXT.md.

---

## Claude's Discretion (locked in CONTEXT.md)

- Exact React/Next.js shape of the "force-mount when Practice opens" wiring (D-08)
- Skeleton primitive choice — new `<Skeleton>` UI primitive or inline classes (D-06)
- RPC for triggering revalidateTag from the seed scripts (D-02) — direct call vs server-action vs API route
- Median-song picker implementation (D-17) — JS script vs SQL vs hardcode after one-time inspection

## Deferred Ideas (locked in CONTEXT.md `<deferred>`)

- Facade-style click-to-play YouTube replacement → revisit Phase 14 if D-05 isn't enough at Phase 19 gate
- `force-dynamic` audit on routes that don't need it → Phase 20
- `getAllSongs` correlated-subquery audit → Phase 20
- `getSongBySlug` two-query collapse → Phase 20
- Neon HTTP retry-wrapper tuning → Phase 16 IR runbook
- Per-route bundle budgets for /, /songs, /path, /vocabulary, /review, /kana → Phase 19 entry gate
- OG image `metadataBase` fix → Phase 18
- Lighthouse mobile ≥85 / LCP <2.5s / TTI <3.5s on Moto G4 4G → Phase 19 entry gate (per SPEC)

---

*Phase: 13-performance-infrastructure*
*Discussion logged: 2026-04-28*
