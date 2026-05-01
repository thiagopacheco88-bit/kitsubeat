---
phase: 14
slug: ux-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-01
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Sourced from `14-RESEARCH.md` § "Validation Architecture (Nyquist)".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Unit framework** | Vitest 4.1.4 + @testing-library/react 16.3.2 + jsdom 29.0.2 |
| **Integration framework** | Vitest 4.1.4 against Neon test DB (`tests/integration/setup.ts`) |
| **E2E framework** | Playwright 1.59.1 (`playwright.config.ts`) — single chromium project, zero-flake (zero retries) |
| **Lint framework** | ESLint 9 (Wave 0 install) — flat `eslint.config.mjs` + custom plugin `eslint-plugins/kitsubeat-tokens/` |
| **Audit framework** | Plain `tsx` script — `scripts/audit/token-compliance.ts` — exit-0/1 contract |
| **A11y framework** | `@axe-core/playwright@4.11.3` (Wave 0 install) — wraps Playwright runtime |
| **Bundle gate** | `size-limit@12.1.0` + `@size-limit/preset-app@12.1.0` (Phase 13 — already wired) |
| **Lighthouse** | `npm run lighthouse:baseline` — informational for Phase 14 (D-29); Phase 19 entry-gate input |
| **Quick run command** | `npm run lint && npm run test:unit` (~10s) |
| **Full suite command** | `npm run test:all` (15-min budget per Phase 08.1) |
| **Estimated runtime** | quick ~10s · per-wave ~3 min · phase-gate ~15 min |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint && npm run test:unit` (~10s)
- **After every plan wave:** Run `npm run lint && npx tsx scripts/audit/token-compliance.ts && npm run test:unit && npm run test:integration && npm run size`
- **Before `/gsd-verify-work`:** Full `npm run test:all` green + `npm run size` green + manual visual walkthrough at 390×844 and 1280×900 in BOTH themes
- **Max feedback latency:** 10 seconds (per-task) · 3 minutes (per-wave) · 15 minutes (phase-gate)

---

## Per-Task Verification Map

> Populated during planning — each task gets a row tied to a Wave 0 test file or a manual gate.
> The planner must ensure no 3 consecutive tasks pass without an automated verification touch.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 14-XX-XX | XX | X | REQ-X | T-14-XX / — | (per task) | unit/integration/E2E | `(per task)` | ❌ W0 / ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*This table is populated as plans land — update during plan-phase wave breakdown.*

---

## Phase Requirements → Test Map (from RESEARCH §Validation Architecture)

| Req | Behavior to validate | Test type | Automated command | File | Wave 0 Gap |
|-----|----------------------|-----------|-------------------|------|------------|
| 1 (tokens) | `globals.css` defines all tokens listed in SPEC §A; toggling `data-theme` flips colors w/o reflow | manual + visual | (visual review via `__dev/states`) | (no file — manual) | — |
| 1 (tokens) | All tokens reach Tailwind via `@theme` block — utility classes resolve correctly | E2E | `npx playwright test theme-toggle.spec.ts` | `tests/e2e/theme-toggle.spec.ts` | ❌ W0 |
| 2 (lint gate) | `npm run lint` fails on a deliberately-introduced raw hex in a non-allowlisted file | unit | `node eslint-plugins/kitsubeat-tokens/__tests__/no-raw-tokens.test.js` | `eslint-plugins/kitsubeat-tokens/__tests__/no-raw-tokens.test.js` | ❌ W0 |
| 2 (audit) | `npx tsx scripts/audit/token-compliance.ts` exits 0 on green main; exits 1 on planted violation | smoke | `npx tsx scripts/audit/token-compliance.ts` | `scripts/audit/token-compliance.ts` | ❌ W0 |
| 3 (Button) | Renders all 9 variant×size combinations correctly | unit | `npx vitest run src/components/ui/__tests__/Button.test.tsx -x` | `src/components/ui/__tests__/Button.test.tsx` | ❌ W0 |
| 3 (Card) | Renders all 3 variants correctly | unit | `npx vitest run src/components/ui/__tests__/Card.test.tsx -x` | `src/components/ui/__tests__/Card.test.tsx` | ❌ W0 |
| 3 (Badge) | Renders all 4 variants correctly | unit | `npx vitest run src/components/ui/__tests__/Badge.test.tsx -x` | `src/components/ui/__tests__/Badge.test.tsx` | ❌ W0 |
| 3 (Modal) | Opens/closes via Trigger; ESC closes; backdrop closes; focus trapped | unit (jsdom) + E2E | `npx vitest run src/components/ui/__tests__/Modal.test.tsx -x` | `src/components/ui/__tests__/Modal.test.tsx` | ❌ W0 |
| 4 (surfaces) | Every in-scope surface visually matches Claude Design output (or D-22 token-only swap) | manual | (visual walkthrough) | (no file — manual) | — |
| 5 (mobile) | No horizontal scroll at 390×844 on every in-scope route | E2E | `npx playwright test mobile-parity.spec.ts` | `tests/e2e/mobile-parity.spec.ts` | ❌ W0 |
| 5 (mobile) | All interactive elements ≥44×44px on mobile | E2E | `npx playwright test mobile-parity.spec.ts -g "tap targets"` | (same file) | ❌ W0 |
| 6 (motion) | `docs/motion-catalog.md` exists with 12 entries × 5 fields | smoke | `npx tsx scripts/audit/motion-catalog-completeness.ts` | (Wave 0 — small script) | ❌ W0 |
| 6 (motion) | `prefers-reduced-motion: reduce` skips all cataloged animations | E2E | `npx playwright test reduced-motion.spec.ts` | `tests/e2e/reduced-motion.spec.ts` | ❌ W0 |
| 7 (states) | `__dev/states` route renders all 24 states without error in dev/test env | E2E | `npx playwright test dev-states.spec.ts` | `tests/e2e/dev-states.spec.ts` | ❌ W0 |
| 7 (states) | `__dev/states` returns 404 in production env | unit | `npx vitest run src/app/__dev/states/__tests__/gate.test.ts` | `src/app/__dev/states/__tests__/gate.test.ts` | ❌ W0 |
| 8 (a11y) | Zero serious/critical axe violations on each in-scope route × 2 themes | E2E (nightly initially) | `npx playwright test a11y.spec.ts` | `tests/e2e/a11y.spec.ts` | ❌ W0 |
| 8 (a11y) | Lighthouse a11y ≥95 per surface | manual | `npm run lighthouse:baseline` | (manual baseline per Phase 13 D-15) | — |
| 9 (theme) | `setThemePreference` writes the `users.theme_preference` column | integration | `npx vitest run tests/integration/theme-persistence.test.ts -x` | `tests/integration/theme-persistence.test.ts` | ❌ W0 |
| 9 (theme) | `kb_theme` cookie + SSR sets `<html data-theme>` correctly | E2E | `npx playwright test theme-toggle.spec.ts` | `tests/e2e/theme-toggle.spec.ts` | ❌ W0 |
| 9 (theme) | First visit reads `prefers-color-scheme` (no cookie set) | E2E | `npx playwright test theme-toggle.spec.ts -g "prefers-color-scheme"` | (same file) | ❌ W0 |
| (carry D-23) | `size-limit` budget on `/songs/[slug]` stays ≤50 KB gzipped | smoke | `npm run size` | `.size-limit.cjs` | ✅ (Phase 13) |

---

## Wave 0 Requirements

The following test infrastructure does NOT exist yet and MUST land in Wave 0 before any other tasks proceed:

- [ ] `eslint.config.mjs` — flat config + custom plugin import (req 2)
- [ ] `eslint-plugins/kitsubeat-tokens/index.js` — custom rule implementation (req 2)
- [ ] `eslint-plugins/kitsubeat-tokens/__tests__/no-raw-tokens.test.js` — rule's own test fixtures (req 2)
- [ ] `scripts/audit/token-compliance.ts` — grep audit (req 2)
- [ ] `scripts/audit/motion-catalog-completeness.ts` — catalog completeness gate (req 6)
- [ ] `tests/e2e/mobile-parity.spec.ts` — mobile viewport spec (req 5)
- [ ] `tests/e2e/a11y.spec.ts` — axe-core integration, gate to nightly initially (req 8)
- [ ] `tests/e2e/theme-toggle.spec.ts` — SSR cookie round-trip (req 9)
- [ ] `tests/e2e/reduced-motion.spec.ts` — prefers-reduced-motion verification (req 6)
- [ ] `tests/e2e/dev-states.spec.ts` — `__dev/states` smoke test (req 7)
- [ ] `tests/integration/theme-persistence.test.ts` — DB column round-trip (req 9)
- [ ] `src/components/ui/__tests__/Button.test.tsx` — variant coverage (req 3)
- [ ] `src/components/ui/__tests__/Card.test.tsx` — variant coverage (req 3)
- [ ] `src/components/ui/__tests__/Badge.test.tsx` — variant coverage (req 3)
- [ ] `src/components/ui/__tests__/Modal.test.tsx` — interaction coverage (req 3)
- [ ] `src/components/ui/__tests__/EmptyState.test.tsx` — variant coverage (req 7)
- [ ] `src/app/__dev/states/__tests__/gate.test.ts` — production gate test (req 7)
- [ ] `docs/motion-catalog.md` — 12 entries × 5 fields (req 6 — content, not infra)
- [ ] Framework install: `npm install --save-dev eslint eslint-config-next @axe-core/playwright`
- [ ] Dependency install: `npm install @radix-ui/react-dialog class-variance-authority tailwind-merge clsx`
- [ ] Capture baseline: `npm run size` BEFORE adding any deps (per RESEARCH Open Risk #4)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual fidelity per surface (token swap or full design migration) | 4 (surfaces) | Pixel-level visual review can't be assertion-tested without designed visual baselines for each surface (only `/` has Claude Design) | Open each in-scope surface at 390×844 and 1280×900 in both themes via `__dev/states` and direct route navigation; compare against Claude Design (where available) or against the home design's visual language (D-22) |
| Lighthouse a11y ≥95 per surface | 8 (a11y) | Lighthouse runner is not deterministic enough for CI; baseline-only per Phase 13 D-15 | `npm run lighthouse:baseline` after wave 5+ completes; compare per-route a11y scores to floor (95) |
| Light theme color values feel right | 1 (tokens) | Subjective — D-03 values are estimates without designer input | Visual walkthrough of every in-scope surface in light theme; if anything reads cold/dim/wrong, log to Phase 14.1 backlog |
| Reduced-motion spot-check on `star-shine` / `level-pop` keyframes | 6 (motion) | The global `@media` override may leave start-state transforms visible; needs devtools confirmation | In Chrome devtools, set "Emulate CSS prefers-reduced-motion: reduce", trigger star-earn and level-up flows, confirm no broken visual state |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references in this doc
- [ ] No watch-mode flags in CI (per Phase 13 D-18 three-layer discipline)
- [ ] Feedback latency: per-task ≤10s, per-wave ≤3 min, phase-gate ≤15 min
- [ ] `nyquist_compliant: true` set in frontmatter after Wave 0 lands

**Approval:** pending — flips to `approved YYYY-MM-DD` when all sign-off boxes are checked.
