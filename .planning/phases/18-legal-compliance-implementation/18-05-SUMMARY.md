---
phase: 18-legal-compliance-implementation
plan: "05"
subsystem: ui-compliance
tags: [legal, compliance, ui, cookie-consent, ai-disclosure, a11y, accessibility, pecr, eu-ai-act]
dependency_graph:
  requires:
    - src/lib/consent/store.ts (Plan 02 — useConsentStore Zustand store)
    - src/app/actions/consent.ts (Plan 02 — recordConsent() server action)
    - src/app/api/user/data-export/route.ts (Plan 02 — DSAR endpoint)
    - src/components/ui/Button.tsx (Phase 14 — Button primitive)
  provides:
    - src/components/ui/AiBadge.tsx (EU AI Act disclosure badge — two label variants)
    - src/components/CookieConsentBanner.tsx (PECR-compliant consent banner client island)
    - src/components/ProfileNudgeBanner.tsx (existing-user profile completion nudge)
    - src/components/DataExportButton.tsx (DSAR data export trigger)
  affects:
    - src/app/layout.tsx (skip-to-main, kb_consent SSR read, CookieConsentBanner wired)
    - src/app/songs/[slug]/components/FeedbackPanel.tsx (data-ai-generated + AiBadge on mnemonic/kanji)
    - src/app/songs/[slug]/components/LearnCard.tsx (data-ai-generated on root container)
tech_stack:
  added:
    - Inline SVG spinner (no lucide-react dep — project pattern)
  patterns:
    - SSR cookie prop → initialConsent guard (Pitfall 1 prevention, T-18-05-04 mitigation)
    - useConsentStore Zustand for consent state; recordConsent() server action for persistence
    - localStorage dismiss pattern for non-blocking UX banners
    - data-ai-generated="true" attribute on AI-generated content containers (EU AI Act)
    - useRef + useEffect focus management for accessibility (focus reject button on mount)
    - Blob URL download pattern (fetch → blob → createObjectURL → anchor.click)
key_files:
  created:
    - src/components/ui/AiBadge.tsx
    - src/components/CookieConsentBanner.tsx
    - src/components/ProfileNudgeBanner.tsx
    - src/components/DataExportButton.tsx
  modified:
    - src/app/layout.tsx (consentCookie SSR read, skip-to-main, CookieConsentBanner)
    - src/app/songs/[slug]/components/FeedbackPanel.tsx (data-ai-generated + AiBadge)
    - src/app/songs/[slug]/components/LearnCard.tsx (data-ai-generated on root)
decisions:
  - Replaced lucide-react Loader2 with inline SVG spinner because lucide-react is not in project dependencies (ThemeToggle already established the inline-SVG pattern for this reason)
  - Kept existing ConsentBanner (PostHog-based) alongside new CookieConsentBanner — both serve different purposes; removal would be a separate task
  - Added data-ai-generated wrapper around entire mnemonic div in FeedbackPanel (including existing Memory tip label) rather than creating a separate inner div — preserves existing visual structure
  - Used _userId parameter rename in ProfileNudgeBanner to satisfy TypeScript no-unused-vars without breaking the public interface
metrics:
  duration: 265s
  completed: 2026-05-08
  tasks_completed: 2
  files_changed: 7
---

# Phase 18 Plan 05: UI Components (Consent, AI Disclosure, Profile Nudge, Data Export) Summary

**One-liner:** PECR consent banner with SSR flash prevention, EU AI Act data-ai-generated disclosure attrs, profile completion nudge, and DSAR export button — all hand-rolled following Phase 14 primitives.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | AiBadge + CookieConsentBanner + RootLayout wiring + skip-to-main | 4097c4d | AiBadge.tsx, CookieConsentBanner.tsx, layout.tsx |
| 2 | ProfileNudgeBanner + DataExportButton + AI disclosure attrs on FeedbackPanel + LearnCard | 87edc8c | ProfileNudgeBanner.tsx, DataExportButton.tsx, FeedbackPanel.tsx, LearnCard.tsx |

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] lucide-react not installed; replaced with inline SVG spinner**
- **Found during:** Task 2 — TypeScript compile error `Cannot find module 'lucide-react'`
- **Issue:** Plan's DataExportButton template imported `Loader2` from `lucide-react`, but that package is not in `package.json` and not installed in `node_modules`
- **Fix:** Replaced with inline `SpinnerIcon` SVG component following the exact same pattern established by `ThemeToggle.tsx` (which explicitly documents "no lucide-react — bundle budget per CONTEXT, no new deps")
- **Files modified:** `src/components/DataExportButton.tsx`
- **Commit:** 87edc8c

---

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` (prod files) | PASS — 0 errors in non-test files |
| `npm run test:unit` | PASS — 657 tests passed, 0 failures |
| `grep "Skip to main content" layout.tsx` | PASS — line 117 |
| `grep "kb_consent" layout.tsx` | PASS — lines 53–54 (SSR read) |
| `grep "CookieConsentBanner" layout.tsx` | PASS — lines 12, 203 |
| `grep "data-ai-generated" FeedbackPanel.tsx` | PASS — lines 193, 200 |
| `grep "data-ai-generated" LearnCard.tsx` | PASS — line 64 |
| `grep "initialConsent" CookieConsentBanner.tsx` | PASS — lines 7, 30, 33, 38, 40, 47 |

---

## Must-Haves Satisfied

- [x] Cookie consent banner renders on first visit (kb_consent absent); returns null if initialConsent set (SSR guard)
- [x] Accept/Reject buttons have min-h-[44px] (Button primitive enforces this)
- [x] AiBadge renders "AI-assisted" on FeedbackPanel mnemonic with data-ai-generated="true" on parent
- [x] AiBadge renders "AI transcript (WhisperX)" variant available (prop-driven)
- [x] LearnCard root has data-ai-generated="true" (REQ-AI-LESSON-06)
- [x] ProfileNudgeBanner dismissible via localStorage (kb_profile_nudge_dismissed)
- [x] DataExportButton fetches /api/user/data-export and browser-downloads JSON
- [x] RootLayout reads kb_consent SSR and passes as initialConsent prop
- [x] Skip-to-main-content link is first focusable element in RootLayout body

---

## Known Stubs

None — all components have live wired behavior. DataExportButton calls the real `/api/user/data-export` endpoint (Plan 02). ProfileNudgeBanner is shown when placed on the `/profile` page — that integration is out of scope for this plan.

---

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced in this plan. All security-relevant operations (recordConsent, data-export) delegate to Plan 02 endpoints already in the threat register.

## Self-Check: PASSED

Files verified:
- src/components/ui/AiBadge.tsx — FOUND
- src/components/CookieConsentBanner.tsx — FOUND
- src/components/ProfileNudgeBanner.tsx — FOUND
- src/components/DataExportButton.tsx — FOUND
- src/app/layout.tsx — MODIFIED (FOUND)
- src/app/songs/[slug]/components/FeedbackPanel.tsx — MODIFIED (FOUND)
- src/app/songs/[slug]/components/LearnCard.tsx — MODIFIED (FOUND)

Commits verified:
- 4097c4d — feat(18-05): AiBadge, CookieConsentBanner, skip-to-main + layout wiring
- 87edc8c — feat(18-05): ProfileNudgeBanner, DataExportButton, AI disclosure attrs
