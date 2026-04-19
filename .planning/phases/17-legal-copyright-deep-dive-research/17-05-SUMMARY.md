---
phase: 17-legal-copyright-deep-dive-research
plan: "05"
subsystem: legal
tags: [aadc, gdpr, lgpd, ccpa, minors, age-gating, ico, children-code, privacy, dpia]

# Dependency graph
requires:
  - phase: 17-legal-copyright-deep-dive-research
    provides: 17-CONTEXT.md with age-gating scope decisions and AADC design mandate
provides:
  - "Full ICO AADC 15-standards analysis with kitsubeat applicability verdicts"
  - "13+ signup gate UX spec with teen awareness step (§5.3)"
  - "Field-level minor account default settings table (9 settings, §5.4)"
  - "LGPD Art. 14 + ANPD Res. 6/2023 and CCPA §1798.120(c) minors coverage (§5.5)"
  - "58 total REQ-MINORS IDs ready for Plan 17-06 extraction"
  - "2 lawyer-required flags for Pre-Monetization Legal Review index"
affects: [17-06-PLAN, phase-18-legal-implementation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "REQ-MINORS-NN pattern for AADC-derived requirements"
    - "REQ-MINORS-GATE-NN pattern for signup gate requirements"
    - "REQ-MINORS-DEFAULT-NN pattern for field-level defaults"
    - "REQ-MINORS-BR-NN pattern for LGPD Brazil requirements"
    - "REQ-MINORS-CA-NN pattern for CCPA California requirements"

key-files:
  created:
    - .planning/phases/17-legal-copyright-deep-dive-research/sections/05-age-gating-aadc.md
  modified: []

key-decisions:
  - "kitsubeat adopts AADC 'design for 13+' posture (approach a) for v1 — no age-band differentiation needed since no age-inappropriate content exists"
  - "Parental consent NOT required for 13–17 signups under DPA 2018 s.9 (UK digital consent age = 13); parental-awareness nudge is optional UX only"
  - "FSRS profiling of minors is justified as functionally necessary; must be documented in Privacy Policy per AADC Standard 12"
  - "DPIA required before Phase 18 launch per AADC Standard 2 / DPA 2018 s.57"
  - "LGPD 13+ gate satisfies Brazilian under-12 parental-consent requirement; adolescent (12–17) path covered by teen awareness step"

patterns-established:
  - "Age gate spec: DOB field stored as full date (not age integer) for 18th-birthday re-evaluation"
  - "Minor defaults enforced server-side; non-overrideable settings enforced in code not DB"
  - "Lawyer-required flags use {#lawyer-minors-NN} anchor for end-of-doc consolidation"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-04-19
---

# Phase 17 Plan 05: Age Gating & Minor-User Protection Summary

**Full ICO AADC 15-standards analysis plus concrete 13+ signup gate, field-level minor account defaults, and LGPD/CCPA minor interaction rules — 58 REQ-MINORS IDs ready for Phase 18 implementation**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-19T11:19:06Z
- **Completed:** 2026-04-19T11:24:04Z
- **Tasks:** 2 (authored as one coherent document)
- **Files modified:** 1

## Accomplishments

- Analyzed all 15 ICO AADC standards with explicit kitsubeat applicability verdicts ("applicable / partially applicable / not applicable") and Phase 18 obligations per standard
- Drafted concrete 13+ signup gate with 6-step UX spec including teen awareness step, parental-awareness nudge (non-statutory), spoof-resistance posture, and 18th-birthday transition flow
- Produced 9-row field-level minor account defaults table with adult vs. minor default, override policy, and AADC standard citation per row
- Covered LGPD Art. 14 + ANPD Resolution CD/ANPD 6/2023 and CCPA §1798.120(c) minors interactions with jurisdiction-specific REQ IDs
- §5.6 rollup aggregates all 58 REQ-MINORS IDs by category, ready for Plan 17-06 extraction into Phase 18 requirements checklist
- Identified 2 lawyer-required flags: Art. 36 ICO prior consultation trigger (FSRS profiling at scale) and OSA 2023 age-assurance applicability

## Signup Gate Flow (ASCII)

```
User enters DOB on signup form
         |
         v
    Age < 13?  ─── YES ──► Block signup
         |                  "Not available for under-13s"
        NO                  Rate-limit email, no data stored
         |
         v
    Age 13–17? ─── YES ──► Teen Awareness Step
         |                  - 6 child-friendly privacy bullets
        NO                  - "I understand" checkbox (required)
         |                  - Optional: share with parent/guardian
         v                  |
    Age ≥ 18               v
         |          Create account with MINOR defaults
         v          (profile_visibility=private, leaderboards=off,
    Standard        marketing=disabled, analytics=off, etc.)
    signup                 |
         |                 v
         v           18th birthday → email notification
    Create account         → minor settings UNLOCK (not auto-changed)
    with ADULT defaults
```

## Total REQ-MINORS IDs by Category

| Category | IDs | Count |
|----------|-----|-------|
| AADC Standards | REQ-MINORS-01 to 31 | 31 |
| Signup Gate | REQ-MINORS-GATE-01 to 12 | 12 |
| Minor Defaults | REQ-MINORS-DEFAULT-01 to 09 | 9 |
| LGPD / Brazil | REQ-MINORS-BR-01 to 03 | 3 |
| CCPA / California | REQ-MINORS-CA-01 to 03 | 3 |
| **Total** | | **58** |

## Lawyer-Required Flags

| Marker | Issue | Priority |
|--------|-------|----------|
| `{#lawyer-minors-01}` | Whether FSRS profiling of children's data at scale triggers UK-GDPR Art. 36 prior ICO consultation (launch blocker if yes) | HIGH — pre-launch |
| `{#lawyer-minors-02}` | Whether Online Safety Act 2023 age-assurance provisions apply before Phase 18 launch and require stronger verification than DOB self-declaration | MEDIUM — monitor |

## Task Commits

Both tasks authored in a single coherent file (one atomic document unit):

1. **Task 1: AADC 15-standards analysis (§5.1–§5.2)** — included in `735504e`
2. **Task 2: Signup gate + defaults + LGPD/CCPA + rollup (§5.3–§5.7)** — included in `735504e`

- `735504e` — feat(17-05): draft age gating & minor-user protection section (§5.1–§5.7)

## Files Created/Modified

- `.planning/phases/17-legal-copyright-deep-dive-research/sections/05-age-gating-aadc.md` — 618-line age gating & minor-user protection section covering AADC 15 standards, signup gate spec, minor account defaults, LGPD/CCPA interactions, rollup, and footnotes

## Decisions Made

- **"Design for 13+" posture adopted for v1** — because kitsubeat has no age-inappropriate content (no chat, UGC, ads, messaging), designing the entire product for the youngest likely user (13+) satisfies AADC Standard 3 without requiring age-band differentiation
- **Parental consent is NOT required for UK 13–17 signups** — DPA 2018 s.9 sets UK digital consent age at 13; the parental-awareness nudge is an optional UX feature, not a statutory consent gate
- **DOB stored as full date, not derived integer** — enables 18th-birthday transition automation and avoids timezone edge cases
- **FSRS profiling is "functionally necessary"** — justified under AADC Standard 12 (ICO allows profiling essential to the service); must be documented in Privacy Policy
- **DPIA is a Phase 18 launch gate** — flagged as REQ-MINORS-04 and REQ-MINORS-05

## Deviations from Plan

None — plan executed exactly as written. Both tasks authored together as a single atomic document as intended.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Plan 17-06 (Wave 2)** can extract all 58 REQ-MINORS IDs from §5.6 rollup into the Phase 18 requirements checklist
- **Phase 18** implements: signup form DOB field + minor defaults schema, teen awareness step UX, DSAR self-service for minors, PostHog analytics scrubbing for minors, Sentry user-context scrubbing for minors, child-friendly Privacy Summary
- **DPIA** must be completed before Phase 18 launch — this is the most significant pre-launch gate identified in this plan
- **Lawyer consultation** required on Art. 36 ICO prior consultation trigger before launch

---
*Phase: 17-legal-copyright-deep-dive-research*
*Completed: 2026-04-19*
