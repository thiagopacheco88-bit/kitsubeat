---
phase: 17-legal-copyright-deep-dive-research
plan: 03
subsystem: legal-research
tags: [consumer-law, vat, tax, stripe, uk-ccr, eu-crd, brazil-cdc, california-arl, oss-ioss, gdpr-adjacent]

# Dependency graph
requires:
  - phase: 17-legal-copyright-deep-dive-research
    provides: CONTEXT.md — scope decisions, jurisdiction priorities, tax-now rationale, OSS/IOSS rename flag

provides:
  - UK CCRs SI 2013/3134 analysis with Reg. 37 digital-content waiver implementation spec
  - EU CRD 2011/83/EU + Modernisation Directive 2019/2161 analysis with Art. 16(m) waiver
  - Brazil CDC Art. 49 analysis with lawyer-flag on digital-subscription waiver scope
  - California ARL §17602 auto-renewal disclosure requirements
  - Publish-ready refund policy template (activate-at-monetization, 10 sections, UK/EU/CA markers)
  - UK VAT: £90,000 threshold, place-of-supply rules, HMRC 701/30 standard-rating confirmation
  - EU VAT OSS/IOSS: MOSS→OSS/IOSS rename correction, non-Union OSS spec, Reg. 1042/2013 Art. 24b evidence
  - US Wayfair economic nexus analysis ($100k/200 transactions model)
  - Brazil digital-services tax analysis (ICMS 106/2017 / ISS / CIDE) with lawyer-flag
  - Stripe Tax 14-item configuration checklist (REQ-TAX-STRIPE-01 through -14) — drop-in Phase 19 spec
  - 21 REQ-CONS-* IDs + 19 REQ-TAX-* IDs + 3 lawyer-required markers

affects:
  - Phase 18 (implements REQ-CONS-UK/EU/CA obligations at checkout + refund template when live)
  - Phase 19 (executes REQ-TAX-STRIPE-01 through -14 Stripe Tax config checklist)
  - v4.0 Phase 22 (activates and publishes refund policy template from §3.2)
  - Plan 17-06 (consolidation — extracts all REQ IDs, preserves activate-at-monetization marker)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Refund policy template uses activate-at-monetization frontmatter status marker for deferred publication"
    - "Jurisdiction HTML comment markers (<!-- UK-only --> / <!-- EU-only --> / <!-- CA-only -->) for template branching"
    - "REQ-CONS-*/REQ-TAX-* prescriptive requirement IDs for downstream phase traceability"
    - "Lawyer-required flags: inline {#lawyer-*-NN} marker + §3.7 consolidated index"

key-files:
  created:
    - .planning/phases/17-legal-copyright-deep-dive-research/sections/03-consumer-law-and-tax.md
  modified: []

key-decisions:
  - "MOSS terminology corrected to OSS/IOSS throughout — roadmap Success Criterion 4 used outdated term"
  - "Digital-content waiver (UK CCR Reg. 37 + EU CRD Art. 16(m)) documented as single most important consumer-law obligation for kitsubeat at monetization"
  - "Brazil CDC digital-subscription waiver scope lawyer-flagged — Art. 49 applicability to online subs is unsettled"
  - "Stripe Tax config specced at 14 prescriptive REQ-TAX-STRIPE-NN items so Phase 19 requires no additional research"
  - "Refund template is publish-ready prose (not principles), parked with status: activate-at-monetization"

patterns-established:
  - "Section 3 structure: consumer law (§3.1) + refund template (§3.2) + tax by jurisdiction (§3.3–§3.5) + implementation spec (§3.6) + rollup (§3.7) + footnotes (§3.8)"
  - "Every statutory reference includes SI/Directive number, article/regulation, and gov.uk or eur-lex URL"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-04-19
---

# Phase 17 Plan 03: Consumer Law & Tax Summary

**UK CCRs SI 2013/3134 digital-content waiver spec + EU CRD Art. 16(m) + 14-item Stripe Tax configuration checklist for Phase 19, with MOSS→OSS/IOSS terminology correction and publish-ready refund policy template**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-19T11:18:59Z
- **Completed:** 2026-04-19T11:24:22Z
- **Tasks:** 2
- **Files modified:** 1 created

## Accomplishments

- Drafted 697-line consumer law + tax section covering 4 jurisdictions (UK, EU, Brazil, California) with statutory citations to SI 2013/3134, Directive 2011/83/EU, Lei 8.078/1990, and CA B&P Code §17602
- Produced publish-ready refund policy template with 10 sections, activate-at-monetization status marker, and UK/EU/CA jurisdictional comment markers inline for Phase 18 branching
- Delivered 14-item Stripe Tax configuration checklist (REQ-TAX-STRIPE-01 through -14) as a verbatim Phase 19 implementation spec — Phase 19 requires no additional tax research
- Corrected the roadmap's outdated "VAT MOSS" terminology with a prominent rename box explaining the 2021-07-01 restructuring to OSS (non-Union) / IOSS
- Catalogued 21 REQ-CONS-* and 19 REQ-TAX-* prescriptive requirement IDs plus 3 lawyer-required markers in §3.7 rollup for Plan 17-06 extraction

## Task Commits

1. **Tasks 1 + 2: Draft §3.1–§3.8 (consumer law + tax, combined file creation)** — `e0ae3e5` (feat)

**Plan metadata:** (to be committed with SUMMARY.md)

## Files Created/Modified

- `.planning/phases/17-legal-copyright-deep-dive-research/sections/03-consumer-law-and-tax.md` — 697-line Section 3 covering: §3.1 consumer law (UK/EU/BR/CA), §3.2 refund policy template, §3.3 UK VAT, §3.4 EU VAT OSS/IOSS, §3.5 US + Brazil tax, §3.6 Stripe Tax config, §3.7 rollup, §3.8 footnotes

## Decisions Made

- MOSS terminology corrected to OSS/IOSS throughout — the roadmap cited an outdated term; the rename box in §3.4 explicitly calls this out so Plan 17-06 and future phases don't propagate the error
- Stripe Tax section (§3.6) written as a verbatim implementation checklist (14 REQ-TAX-STRIPE-NN items) rather than guidance — Phase 19 executes without needing additional research
- Refund template written as publish-ready prose with activate-at-monetization marker — parked for Phase 19/22 publication, not released during free beta
- Digital-content waiver (UK CCR Reg. 37 + EU CRD Art. 16(m)) identified as the single most important consumer-law requirement for kitsubeat at monetization — documented with precise checkout wording requirements for Phase 18
- Brazil CDC Art. 49 waiver scope lawyer-flagged ({#lawyer-cons-01}) — Art. 49's applicability to online subscriptions with immediate-supply waiver is actively litigated; cannot implement without Brazilian consumer law advice

## Deviations from Plan

None — plan executed exactly as written. Both tasks completed in the target line range (697 lines total vs. 500–700 combined target).

## Issues Encountered

None. All verification checks passed: §3.1.1–§3.1.4 headers present, SI 2013/3134 cited 8 times, Directive 2011/83/EU cited 6 times, 2019/2161 cited 4 times, activate-at-monetization marker present, 10 refund template sections, UK/EU/CA comment markers (6/6/3), all REQ-CONS-* family IDs, all lawyer-cons-NN markers, all §3.3–§3.8 headers, MOSS→OSS/IOSS rename box, £90,000 threshold, Reg. 1042/2013, Wayfair, 29 REQ-TAX-STRIPE- occurrences, lawyer-tax-01.

## Artifact Summary

| Artifact | Value |
|---|---|
| Total lines | 697 |
| REQ-CONS-UK-* | 7 IDs |
| REQ-CONS-EU-* | 7 IDs |
| REQ-CONS-BR-* | 2 IDs |
| REQ-CONS-CA-* | 5 IDs |
| REQ-TAX-UK-* | 7 IDs |
| REQ-TAX-EU-* | 7 IDs |
| REQ-TAX-US-* | 3 IDs |
| REQ-TAX-BR-* | 2 IDs |
| REQ-TAX-STRIPE-* | 14 IDs |
| Total REQ IDs | 54 |
| Lawyer-required markers | 3 ({#lawyer-cons-01}, {#lawyer-cons-02}, {#lawyer-tax-01}) |
| VAT figures cited | £90,000 (UK threshold, 2026), 17%–27% (EU member-state rates) |
| Key legislation cited | SI 2013/3134, Dir. 2011/83/EU, Dir. 2019/2161, Lei 8.078/1990, CA B&P §17602, Reg. 1042/2013, Dir. 2006/112/EC Art. 58, S.D. v. Wayfair (2018), Convênio ICMS 106/2017 |

## User Setup Required

None — this is a research/documentation plan. No external services or environment variables.

## Next Phase Readiness

- §3.1–§3.2 feeds Plan 17-06 (consolidation) which extracts REQ-CONS-* IDs into the Phase 18 checklist
- §3.6 Stripe Tax checklist is the verbatim Phase 19 implementation spec — no additional research needed
- §3.2 refund template is parked until Phase 19 (first paid transaction) or v4.0 Phase 22 (whichever publishes first)
- Brazil legal risks ({#lawyer-cons-01}, {#lawyer-tax-01}) must be resolved by a Brazilian solicitor before kitsubeat charges Brazilian users

---

## Self-Check

Checking created files and commits exist.

- FOUND: `.planning/phases/17-legal-copyright-deep-dive-research/sections/03-consumer-law-and-tax.md`
- FOUND: commit e0ae3e5

## Self-Check: PASSED

---

*Phase: 17-legal-copyright-deep-dive-research*
*Completed: 2026-04-19*
