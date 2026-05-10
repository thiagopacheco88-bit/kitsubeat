---
phase: 18
slug: legal-compliance-implementation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-08
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 (unit/integration) + Playwright 1.59.1 (e2e + a11y) |
| **Config file** | `vitest.config.ts` (unit/integration), `playwright.config.ts` (e2e) |
| **Quick run command** | `npm run test:unit && npm run test:integration` |
| **Full suite command** | `npm run test:all` |
| **Estimated runtime** | ~90 seconds (unit+integration); ~300s full incl. e2e |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit`
- **After every plan wave:** Run `npm run test:unit && npm run test:integration`
- **Before `/gsd-verify-work`:** Full suite green + `RUN_A11Y=1 npm run test:e2e:a11y`
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| Wave 0 stubs | 01 | 0 | REQ-MINORS-GATE-03 | — | Under-13 DOB rejected server-side | unit | `vitest run src/app/actions/` | ❌ Wave 0 | ⬜ pending |
| Wave 0 stubs | 01 | 0 | REQ-MINORS-GATE-06 | — | Server re-validates DOB regardless of client input | unit | `vitest run src/app/actions/` | ❌ Wave 0 | ⬜ pending |
| Wave 0 stubs | 01 | 0 | REQ-MINORS-12 | — | Minor defaults applied atomically at signup | integration | `vitest run tests/integration/` | ❌ Wave 0 | ⬜ pending |
| Wave 0 stubs | 01 | 0 | REQ-MINORS-GATE-11 | — | 18th-birthday cron sets is_minor=false only | integration | `vitest run tests/integration/` | ❌ Wave 0 | ⬜ pending |
| Wave 0 stubs | 01 | 0 | REQ-PRIV-COOKIE-05 | — | Consent record inserted in DB on Accept/Reject | integration | `vitest run tests/integration/` | ❌ Wave 0 | ⬜ pending |
| Wave 0 stubs | 01 | 0 | REQ-PRIV-UK-DSAR-04 | — | DSAR endpoint returns all user tables as JSON | integration | `vitest run tests/integration/` | ❌ Wave 0 | ⬜ pending |
| Wave 0 stubs | 01 | 0 | REQ-AI-LESSON-04 | — | `data-ai-generated="true"` on mnemonic/kanji_breakdown panel | unit | `vitest run` | ❌ Wave 0 | ⬜ pending |
| Schema push | 01 | 0 | Migration 0019 | — | DB accepts new columns without data loss | integration | `vitest run tests/integration/` | ❌ Wave 0 | ⬜ pending |
| A11y audit | final | gate | REQ-A11Y-26 | — | Skip-to-main link present on all routes | e2e (a11y) | `RUN_A11Y=1 npm run test:e2e:a11y` | ✅ extends existing a11y.spec.ts | ⬜ pending |
| A11y audit | final | gate | REQ-A11Y-37 | — | `<html lang="en">` present on all routes | e2e (a11y) | `RUN_A11Y=1 npm run test:e2e:a11y` | ✅ existing a11y.spec.ts | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/integration/legal-compliance.test.ts` — stubs for REQ-MINORS-GATE-03, REQ-MINORS-GATE-06, REQ-MINORS-12, REQ-MINORS-GATE-11, REQ-PRIV-COOKIE-05, REQ-PRIV-UK-DSAR-04
- [ ] `src/app/actions/__tests__/onboarding.test.ts` — unit stubs for `completeOnboarding()` DOB validation
- [ ] `src/app/actions/__tests__/consent.test.ts` — unit stubs for `recordConsent()` server action

*(Existing `tests/e2e/a11y.spec.ts` infrastructure covers all REQ-A11Y-* — extend ROUTES array in Wave 0 to add new legal/onboarding routes.)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cookie banner does not flash on repeat visits | REQ-PRIV-COOKIE-02 | Requires real browser + cookie inspection | Open app in fresh browser; accept banner; reload; confirm banner absent |
| Legal pages render correctly at max-w-3xl | UI-SPEC Surface 2 | Visual check | Visit /legal/terms in dark + light theme; verify prose layout and footer nav |
| Age-gate DOB date picker works on mobile Safari | REQ-MINORS-GATE-02 | Safari input[type=date] quirks | Open /onboarding/age-gate on iOS Safari; verify date picker renders and submits |
| ICO registration number inserted in Privacy Policy | REQ-PRIV-UK-POLICY-02 | Operator task, not code | Verify `[ICO REGISTRATION NUMBER: ZB000000]` placeholder replaced before Phase 19 |
| privacy@kitsubeat.com email alias live | REQ-PRIV-UK-POLICY-03 | Operator task | Send test email; confirm receipt |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
