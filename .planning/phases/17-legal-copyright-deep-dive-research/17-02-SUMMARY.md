---
phase: 17-legal-copyright-deep-dive-research
plan: "02"
subsystem: legal-research
tags: [privacy, gdpr, lgpd, ccpa, uk-gdpr, data-protection, dsar, breach-notification, cookies]
dependency_graph:
  requires: []
  provides:
    - sections/02-privacy-data-protection.md — four-jurisdiction privacy analysis for Phase 18
  affects:
    - .planning/phases/17-legal-copyright-deep-dive-research/17-06-PLAN.md (Wave 2 consolidation)
    - Phase 18 Privacy Policy implementation
    - Phase 18 DSAR workflow
    - Phase 18 cookie consent (after Phase 15 analytics tool selection)
tech_stack:
  added: []
  patterns:
    - Four-jurisdiction parallel structure (UK-GDPR, EU-GDPR, LGPD, CCPA)
    - REQ-PRIV-<JUR>-<TOPIC>-NN prescriptive requirement IDs
    - Lawyer-required flag system with stable {#lawyer-priv-NN} IDs
key_files:
  created:
    - .planning/phases/17-legal-copyright-deep-dive-research/sections/02-privacy-data-protection.md
  modified: []
decisions:
  - "EU Art. 27 representative is a pre-launch hard gate: FSRS continuous tracking disqualifies the Art. 27(2) exemption"
  - "LGPD 15-day DSAR window is the strictest response deadline — all SARs should be targeted to 15 days"
  - "Single unified 72-hour breach notification workflow covers UK-GDPR, EU-GDPR and LGPD simultaneously"
metrics:
  duration_minutes: 6
  tasks_completed: 2
  files_created: 1
  completed_date: "2026-04-19"
---

# Phase 17 Plan 02: Privacy & Data Protection Summary

**One-liner:** Four-jurisdiction privacy analysis (UK-GDPR, EU-GDPR, LGPD, CCPA) with 36-field data inventory, 63 prescriptive REQ-PRIV-* requirements, and 9 lawyer-required flags, in a parallel structure Phase 18 implements line-by-line.

## Files Produced

| File | Lines | Description |
|---|---|---|
| `sections/02-privacy-data-protection.md` | 623 | Full privacy & data-protection section draft |

## Per-Jurisdiction Length (approximate line ranges)

| Section | Lines | Content |
|---|---|---|
| §2.1 Data Field Inventory | ~60 | 36-field table with sensitivity + retention + source |
| §2.2 UK-GDPR | ~105 | 7-part structure; 16 REQ IDs; Art. 6 lawful bases; DSAR 1-month; breach 72h ICO; IDTA |
| §2.3 EU-GDPR | ~95 | 7-part structure; 15 REQ IDs; Art. 27 rep analysis (exemption unavailable); DPF/SCC |
| §2.4 LGPD | ~110 | 7-part structure; 12 REQ IDs; 15-day DSAR; ANPD 3-working-day breach; BR DPO |
| §2.5 CCPA | ~75 | 7-part structure; 12 REQ IDs; $25M/100k thresholds; 45-day DSAR; GPC |
| §2.6 Cookies/PECR | ~45 | 8 REQ-PRIV-COOKIE IDs; per-jurisdiction variance table; banner design principles |
| §2.7 Breach matrix | ~15 | 4-row comparison across all jurisdictions |
| §2.8 Rollup + indexes | ~30 | Risk summary; complete REQ and 🚩 index |
| §2.9 Footnotes | ~30 | 23 citations |

## REQ-PRIV-* IDs Emitted Per Jurisdiction

| Jurisdiction | Count | Prefix |
|---|---|---|
| UK-GDPR | 16 | `REQ-PRIV-UK-` |
| EU-GDPR | 15 | `REQ-PRIV-EU-` |
| LGPD (Brazil) | 12 | `REQ-PRIV-BR-` |
| CCPA (California) | 12 | `REQ-PRIV-CA-` |
| Cross-jurisdiction cookies | 8 | `REQ-PRIV-COOKIE-` |
| **Total** | **63** | |

## Lawyer-Required Flags (🚩) Summary

| ID | Section | Finding | Risk Rating |
|---|---|---|---|
| {#lawyer-priv-01} | §2.1 | Confirm Supabase region + DPA transfer mechanism before Phase 18 | 🔴 |
| {#lawyer-priv-02} | §2.1 | Stripe customer ID retention under UK tax law; verify DPA | 🟡 |
| {#lawyer-priv-03} | §2.2 | ICO sole-trader registration requirement — £40/year; pre-launch | 🟡 |
| {#lawyer-priv-04} | §2.2 | Analytics lawful basis (PostHog/Sentry) — depends on Phase 15 choice | 🟡 |
| {#lawyer-priv-05} | §2.3 | EU Art. 27 representative — hard pre-launch gate; £500–2,000/year | 🔴 |
| {#lawyer-priv-06} | §2.3 | EU analytics LI basis — EDPB opinion 8/2024 suggests consent required | 🟡 |
| {#lawyer-priv-07} | §2.4 | ANPD breach notification timeline — verify CD/ANPD 4/2023 amendments | 🟡 |
| {#lawyer-priv-08} | §2.4 | LGPD cross-border transfer mechanism — Brazilian DPC counsel needed | 🔴 |
| {#lawyer-priv-09} | §2.4 | LGPD DPO appointment — micro-entity exemption status unclear | 🔴 |

**4 red (lawyer-required before launch), 5 amber (implement with care)**

## WebFetch Notes

No live web fetches were performed during this plan execution. All citations use canonical statutory references and stable official URLs recorded at the time of research. All URLs in §2.9 footnotes are to stable government/EU institution domains. Phase 18 implementors should verify the following at implementation time:
- Supabase DPA URL: https://supabase.com/legal/dpa
- Vercel DPA URL: https://vercel.com/legal/dpa
- EU-US DPF participant list: https://www.dataprivacyframework.gov/list
- ANPD Resolution CD/ANPD 4/2023 for any amendments
- CCPA thresholds via CPPA: https://cppa.ca.gov/

## Deviations from Plan

None — plan executed exactly as written. Both tasks (§2.1 inventory + §2.2–§2.9 four-jurisdiction sections) were committed together in a single atomic commit (95da677) since they form one coherent file.

## Commits

| Task | Commit | Description |
|---|---|---|
| Tasks 1 + 2 | 95da677 | feat(17-02): draft privacy & data-protection section — four-jurisdiction parallel structure |

## Self-Check: PASSED

- [x] `sections/02-privacy-data-protection.md` exists and is 623 lines (≥400 required)
- [x] §2.1 header present at line 9
- [x] Data field inventory ≥15 rows (149 raw grep matches — actual distinct field rows = 36)
- [x] Supabase DPA and Vercel DPA cited
- [x] All four jurisdiction headers present (lines 71, 176, 268, 377)
- [x] ANPD cited throughout §2.4
- [x] CCPA $25M/100,000 thresholds cited
- [x] Phase 15 cookie dependency noted in §2.6
- [x] 9 lawyer-required flags with stable {#lawyer-priv-NN} IDs
- [x] REQ IDs: UK=31 occurrences, EU=26, BR=23, CA=20 (each ≥3 minimum)
- [x] Commit 95da677 confirmed in git log
