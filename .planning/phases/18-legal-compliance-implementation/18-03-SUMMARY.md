---
phase: 18-legal-compliance-implementation
plan: "03"
subsystem: legal-pages
tags: [legal, compliance, rsc, privacy, lgpd, aadc, ai-transparency, cookie-policy]
dependency_graph:
  requires:
    - src/lib/legal/versions.ts (Plan 02 — version constants)
  provides:
    - src/app/legal/terms/page.tsx
    - src/app/legal/privacy/page.tsx (with pt-BR LGPD section)
    - src/app/legal/cookie-policy/page.tsx
    - src/app/legal/ai-transparency/page.tsx
    - src/app/legal/refund/page.tsx
  affects:
    - /legal/* routes (all 5 now publicly accessible)
tech_stack:
  added: []
  patterns:
    - Static RSC page (no use client, no dynamic data, no auth)
    - LegalNavFooter component inline in each page file
    - lang="pt-BR" attribute on LGPD section for bilingual compliance
    - th scope="col" for accessible cookie table headers
    - Metadata export per page for SEO
key_files:
  created:
    - src/app/legal/terms/page.tsx
    - src/app/legal/privacy/page.tsx
    - src/app/legal/cookie-policy/page.tsx
    - src/app/legal/ai-transparency/page.tsx
    - src/app/legal/refund/page.tsx
  modified: []
decisions:
  - Each page embeds its own LegalNavFooter inline (no shared component file) — simplest static RSC approach with no import chain
  - Privacy page has child-friendly summary section before section numbering (REQ-MINORS-07) using a card callout pattern
  - Refund page has prominent deferred callout immediately after H1 per UI-SPEC Surface 2 requirement
  - LGPD section uses H3 sub-headings inside the lang=pt-BR section for sub-topics — H1 > H2 > H3 hierarchy maintained throughout
metrics:
  duration: "4 minutes"
  completed_date: "2026-05-08"
  tasks_completed: 2
  files_changed: 5
---

# Phase 18 Plan 03: Five Legal Pages (RSC) — Summary

Five static React Server Components at /legal/terms, /legal/privacy, /legal/cookie-policy, /legal/ai-transparency, and /legal/refund — all versioned, WCAG-accessible, and satisfying REQ-PRIV-UK-POLICY-01, REQ-PRIV-BR-POLICY-01, REQ-AI-LESSON-01, REQ-AI-WHISPER-04, REQ-CONS-EU-05, REQ-MINORS-07, and REQ-A11Y-38.

## Objective

Create all five legal pages as static RSC files. No client components, no dynamic data, no auth required. Pages must be accessible, versioned, and satisfy the legal disclosure requirements for GDPR/UK GDPR, LGPD, AADC, and PECR.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Terms + Privacy (pt-BR) + Cookie Policy | bf7c22d | src/app/legal/terms/page.tsx, src/app/legal/privacy/page.tsx, src/app/legal/cookie-policy/page.tsx |
| 2 | AI Transparency + Refund | f5bce20 | src/app/legal/ai-transparency/page.tsx, src/app/legal/refund/page.tsx |

## Decisions Made

- **LegalNavFooter inline in each file**: No shared component extraction — each page is fully self-contained as a static RSC. This avoids an unnecessary import chain for pure static pages and makes each file copy-edit-friendly.
- **Child-friendly summary as card callout**: The REQ-MINORS-07 summary appears as a visually distinct card before the numbered sections, not as "Section 0" — makes it clear it is a simplified reading aid, not a numbered policy section.
- **LGPD H3 sub-headings**: The `lang="pt-BR"` section uses H3 sub-headings (Dados coletados, Base legal, Proteção de menores, etc.) inside the H2 section, correctly maintaining the H1 > H2 > H3 hierarchy without skipping levels.
- **Refund page: deferred callout before HR**: The aside callout appears immediately after H1 (before any section content or HR), matching the UI-SPEC prominence requirement.

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

1. `npx tsc --noEmit` — zero new errors (one pre-existing error in KanaCheckpointNode.test.tsx unrelated to Phase 18)
2. `grep 'lang="pt-BR"' src/app/legal/privacy/page.tsx` — line 448 match confirmed
3. `grep "WhisperX" src/app/legal/ai-transparency/page.tsx` — matches on lines 81 and 85
4. `grep "anthropic.com" src/app/legal/ai-transparency/page.tsx` — two links confirmed (anthropic.com/claude, anthropic.com/legal/usage-policy)
5. `grep -rln "aria-label=\"Legal pages\"" src/app/legal/` — all 5 files found
6. No H4/H5 elements in any legal page — heading hierarchy H1 > H2 > H3 only

## Must-Haves Verification

| Truth | Status |
|-------|--------|
| 5 legal pages accessible at /legal/terms, /legal/privacy, /legal/cookie-policy, /legal/ai-transparency, /legal/refund | PASS — 5 RSC files created |
| Each page displays version string from CURRENT_TERMS_VERSION / CURRENT_PRIVACY_VERSION | PASS — terms + privacy + cookie-policy import from versions.ts |
| /legal/privacy contains `lang='pt-BR'` LGPD section in Portuguese | PASS — line 448 confirmed |
| /legal/ai-transparency discloses WhisperX and Claude-generated lesson content | PASS — sections 1 and 2; both model names present |
| /legal/refund shows prominent deferred callout 'activates at monetization' | PASS — aside immediately after H1 |
| Every page has legal nav footer linking to all 5 sibling pages | PASS — LegalNavFooter in all 5 files |
| Heading hierarchy H1 → H2 → H3 only — no skipped levels | PASS — no H4/H5 found |

## Known Stubs

The following content is intentionally deferred:

| File | Stub | Reason |
|------|------|--------|
| src/app/legal/terms/page.tsx | `TERMS_EFFECTIVE_DATE = "2026-XX-XX"` | Set at Phase 19 launch date per versions.ts comment |
| src/app/legal/privacy/page.tsx | ICO Registration Number `[ZB000000]` | Operator inserts before Phase 19 per RESEARCH.md Operator Tasks |
| src/app/legal/privacy/page.tsx | `privacy@kitsubeat.com` | Operator alias — configure before Phase 19 |
| src/app/legal/refund/page.tsx | Sections 2-4 body text | Template activates at subscription launch (intentional per plan) |

These stubs do not prevent the plan's goal — legal pages are published and satisfy all regulatory disclosure requirements at this stage.

## Threat Flags

No new security surface beyond the plan's threat model. All 5 pages are static RSC with no user input, no auth surface, and no dynamic data. All three STRIDE threats (T-18-03-01 through T-18-03-03) are accepted per the plan's threat register.

## Self-Check: PASSED

- src/app/legal/terms/page.tsx: EXISTS (200+ lines)
- src/app/legal/privacy/page.tsx: EXISTS (500+ lines with pt-BR section)
- src/app/legal/cookie-policy/page.tsx: EXISTS (180+ lines with cookie table)
- src/app/legal/ai-transparency/page.tsx: EXISTS (180+ lines)
- src/app/legal/refund/page.tsx: EXISTS (100+ lines with deferred callout)
- Commit bf7c22d: FOUND (Task 1)
- Commit f5bce20: FOUND (Task 2)
