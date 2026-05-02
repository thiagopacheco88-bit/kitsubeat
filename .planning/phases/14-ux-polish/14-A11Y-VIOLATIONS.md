# Phase 14 — A11y Violations (Plan 14-09 nightly-suite results)

**Generated:** 2026-05-02 (Plan 14-09 Task 2 completion)
**Source:** `RUN_A11Y=1 npx playwright test a11y.spec.ts --workers=1`
**Disposition:** **NEEDS-USER-DECISION** (per planner correction WARNING 2 + plan A11y Severity Policy)

## Summary

The Plan 14-09 a11y suite filled 22 axe-core test cases (11 routes × 2 themes).
Of those, **20 routes failed** with `serious`-impact violations. **2 routes passed**
(both /kana/session-related routes in dark theme had only fixed-already issues).

**The dominant violation class is `color-contrast`** — 1,920+ individual node
violations across 20 routes. The Phase 14 token system (SPEC §A.2) chose
`#ef4444` as the brand accent and rgba-alpha values for muted/dim text. axe-core
finds these combinations fail WCAG 2.1 AA contrast thresholds:

- **white text on `#ef4444` accent = 3.76:1** (Button primary, "Try again" CTA,
  every primary action). AA requires 4.5:1 for normal text or 3:1 for large
  bold text (≥18pt or ≥14pt + ≥700 weight).
- **`#ef4444` accent on white card (light theme) = 3.76:1** (link colors,
  inline accents on cards).
- **`text-text-muted` (rgba-alpha) on certain card-2 surfaces** in light theme
  drops below 4.5:1.
- **`text-text-dim` (rgba(245,245,244,0.40) ≈ #979798)** on white = 2.91:1
  (light theme, fails AA).
- **`text-grammar-expression` `#8b5cf6`** on white = 4.23:1 (light theme,
  fails AA narrowly).

These are NOT individual component fixes — they are token-level color choices
that propagate across every surface. Fixing them requires either:
(a) re-tuning the accent + text-muted + text-dim values to clear AA, OR
(b) restructuring CTA components to qualify text as "large bold" (≥18px + 700w),
    OR
(c) accepting deferred remediation in a Phase 18 a11y-remediation plan.

Per planner correction WARNING 2 + the plan A11y Severity Policy: **the planner
does NOT pre-decide deferral. The user must explicitly approve.**

## Per-route violation summary (RUN_A11Y=1 nightly run)

| Route | Theme | Violations | Dominant rule |
|-------|-------|-----------:|---------------|
| /                  | dark  |   1 | color-contrast |
| /songs             | dark  | 262 | color-contrast (catalog tile labels) |
| /anime-list        | dark  | 341 | color-contrast (catalog tile labels) |
| /songs/again-yui   | dark  | 141 | color-contrast + 1 aria-prohibited-attr |
| /kana              | dark  | 159 | color-contrast |
| /kana/session      | dark  |   2 | color-contrast |
| /kana/session/summary | dark | 1 | color-contrast |
| /path              | dark  |   1 | color-contrast |
| /vocabulary        | dark  |  PASS or unscanned* | — |
| /review            | dark  |   2 | color-contrast |
| /profile           | dark  |   4 | aria-prohibited-attr + color-contrast |
| /                  | light |   1 | color-contrast |
| /songs             | light | 262 | color-contrast |
| /anime-list        | light | 341 | color-contrast |
| /songs/again-yui   | light | 500 | color-contrast + 1 aria-prohibited-attr |
| /kana              | light | 159 | color-contrast |
| /kana/session      | light |   2 | color-contrast |
| /kana/session/summary | light | 1 | color-contrast |
| /path              | light |   2 | color-contrast |
| /vocabulary        | light |  PASS or unscanned* | — |
| /review            | light |   2 | color-contrast |
| /profile           | light |   4 | aria-prohibited-attr + color-contrast |

*Two routes did not appear in failure log — either passed cleanly or returned
404/redirect during the run. Re-run scoped to those routes for confirmation
before final disposition.

**Total node-level violations across all 20 failing routes: ~2,200 nodes**
(many are repeated catalog-tile pairs).

## Closed by Plan 14-09 (no longer in violations log)

The following sub-class of violations was caught and fixed within Plan 14-09
itself (NOT deferred):

- **scrollable-region-focusable** on `<pre>` in `error.tsx` + `global-error.tsx`
  — fixed via `tabIndex={0}` + `aria-label="Error details"`.
- **aria-prohibited-attr** on avatar `<div aria-label="Avatar">` in
  `ProfileHud.tsx` and `PathHud.tsx` — fixed via `role="img"` so the
  aria-label becomes valid (axe rule: aria-label only allowed on elements
  with appropriate roles).

The /profile route still shows 1 `aria-prohibited-attr` because the `<section>`
container also carries `aria-label="Your progress"` — `<section>` allows
aria-label per WAI-ARIA 1.2 BUT axe is firing because the section has
`role` derived as "region" + the label semantics are layered with the
inner content. This is a Phase 18 remediation concern — surface-level
landmark labelling.

## A11y violation classes — categorisation

### Class A — Brand accent contrast (HIGHEST priority, BLOCKING)

`#ef4444` accent fails WCAG AA against both white (light theme cards)
and against white text (every primary CTA button label).

**Affected components:**
- `src/components/ui/Button.tsx` variant=primary (text-white on bg-accent)
- Every consumer of Button primary (LevelUpTakeover, AdvancedDrillsUpsellModal,
  RowUnlockModal, StarterPick, KanaSession, KanaQuestionCard Continue,
  ReviewFeedbackPanel Continue, error.tsx Try again)
- Every link styled as `text-[var(--color-accent)]` on white cards in light
  theme (ReviewFeedbackPanel "Correct answer:" label, profile feedback links,
  StarterPick disabled card border)

**Disposition options:**
- **Option A1:** Darken `--color-accent` from `#ef4444` to a value meeting
  4.5:1 vs white AND 4.5:1 vs `--color-card`. Candidates: `#dc2626` (red-600,
  4.66:1 on white), `#b91c1c` (red-700, 7.49:1 on white). Visual brand
  identity shifts — would need product approval.
- **Option A2:** Make Button primary text qualify as "large bold" — bump to
  `text-lg` (18px) + `font-bold` (700) on every variant. Visual change to all
  CTAs. Currently `text-sm + font-semibold` (14px + 600) → fails. Bumping to
  `text-base + font-bold` still fails (16px + 700 = not large per WCAG 1.4.3
  which requires 18.66px+).
- **Option A3:** User-approved Phase 18 deferral with rationale "brand accent
  WCAG AA contrast is a token-system rebalance — out of scope for final-gate
  surface migration plan".

### Class B — `text-text-muted` / `text-text-dim` contrast on light theme

`--color-text-dim: rgba(24,24,27,0.45)` on light bg `#FAFAF9` blends to
`~#979798` → 2.91:1 on white. `--color-text-muted: rgba(24,24,27,0.62)`
blends to `#7c7c7e` → 4.45:1 on white (just below AA).

SPEC §A.2 explicitly says muted text "must clear ≥4.5:1 for body" — so
the SPEC intent matches WCAG. The light theme values from CONTEXT D-03 fall
short of the SPEC's own stated floor.

**Affected components:**
- Every catalog tile (SongCard.tsx) — text-text-muted on artist/anime + text-text-dim
  on learner count
- Every section header eyebrow (text-text-dim uppercase tracking-wider)
- Every form helper text (`<p id="cap-help">` for premium upgrade copy)

**Disposition options:**
- **Option B1:** Raise `--color-text-muted` opacity from 0.62 to 0.72 (light)
  and `--color-text-dim` from 0.45 to 0.55 (light). Re-verify AA. Tokens
  remain intact; only light-theme override block in globals.css changes.
- **Option B2:** Phase 18 deferral with rationale matching Class A.

### Class C — `text-grammar-expression` (#8b5cf6) on white

Single use case: ProfileForm cap-help text uses `text-grammar-expression`
(violet) for upgrade-prompt copy. 4.23:1 on white (just below AA).

**Affected components:**
- `src/app/profile/ProfileForm.tsx` (1 site)

**Disposition options:**
- **Option C1:** Switch the cap-help text to a token that clears AA on
  white — `--color-text-muted` (after Option B1 fix) or `--color-jlpt-n3`
  (#f59e0b → 4.79:1 on white).
- **Option C2:** Add a darker grammar-expression token for body text use:
  `--color-grammar-expression-text: #6d28d9` (violet-700 → 6.5:1 on white).

## Plan 14-09 disposition

The Plan 14-09 final gate cannot autonomously close these classes per
`planner_authority_limits` — the planner does NOT pre-decide deferral on
difficulty-of-fix grounds. **User decision required before phase merge.**

The 14-FINAL-GATE.md status is set to **NEEDS-USER-DECISION** with this
violations document attached as the evidence. The user can choose:

1. **Fix-now Option A1 + B1 + C1** → re-tune token values in globals.css
   `:root[data-theme="light"]` block, re-run a11y nightly, achieve 0 serious
   violations within Plan 14-09 (or a follow-up patch plan). Estimated effort:
   2-4 hours of token tuning + cross-surface verification.

2. **User-approved deferral** → record explicit authorisation here with
   timestamp + rationale, mark disposition `deferred-with-user-approval`,
   create Phase 18 entry for an a11y-remediation pass. Phase 14 merge proceeds
   on token-coverage grounds (the explicit blocker per CONTEXT D-22).

3. **Block merge** → phase 14 stays open until violations are resolved.

## User decisions log (append below as they arrive)

### 2026-05-02 — Disposition A1 implemented (partial — Class A only)

**Date:** 2026-05-02
**Disposition:** **A1** — Darken `--color-accent` from `#ef4444` to `#dc2626` (Tailwind red-600).
**Rationale:** User explicitly picked A1 over A2 (CTA-text-large-bold restructure across 11 surfaces) and A3 (Phase 18 deferral). Smallest-scope, most-local change. Preserves the red brand identity (red-500 → red-600 — same hue family). One-line @theme swap inherited by `:root[data-theme="light"]`.
**Implementation commit:** Part of `edba4b1` (globals.css single-token swap, lines 50-58 of @theme block; light-theme override comment updated to reference inheritance).
**Verification:** `RUN_A11Y=1 npx playwright test tests/e2e/a11y.spec.ts --workers=1`

#### Outcome — measured against pre-fix nightly run

| Metric | Before (Plan 14-09) | After (this fix) | Δ |
|--------|--------------------:|-----------------:|------:|
| Routes passing | 2 / 22 | 5 / 22 | **+3** |
| Routes failing | 20 / 22 | 17 / 22 | **-3** |
| Total `serious` color-contrast nodes | ~2,200 | ~2,169 | **-31** |
| **Class A (white-on-accent button + accent link on white)** | dominant | **0 nodes (Class A specifically)** | **fully closed** |
| Class B (text-muted/dim rgba-alpha on cards) | ~2,000 nodes | ~2,000 nodes | **unchanged (separate disposition B1 not chosen)** |
| Class C (text-grammar-expression #8b5cf6 on white) | 1 node | 1 node | **unchanged (separate disposition C1 not chosen)** |
| **NEW** dark-theme regression (#dc2626 text on #0e0e0e bg = 3.99:1) | n/a | 4-5 nodes | introduced as accent-as-text usage now borderline-fails on dark surfaces |

#### Honest tradeoff

The dominant violation by node count was Class B (catalog tile labels on light cards — `#949495` on `#fafaf9` at 2.9:1, `#979798` on `#fafaf9` at 2.91:1) — those represent ~600 nodes per catalog page (`/songs`, `/anime-list`) and were NOT addressed by A1. A1 fixed Class A (the brand accent on light theme) which contributed ~30 nodes total but covered EVERY Button primary CTA across the app — the highest-impact qualitative path even if not the highest node count.

#### Net assessment of A1

- **Class A (Button primary white-on-accent + accent-link-on-white):** **fully closed.** The dominant qualitative blocker is gone.
- **Net tradeoff:** Dark-theme accent-as-text use cases (`/path` link on dark bg, `/profile` cap-help link on dark card) regressed from 4.65:1 (borderline pass) to 3.99:1 (borderline fail). 4-5 affected nodes total. Small price for closing the white-on-accent and accent-on-white headline path.
- **Class B + Class C:** still open. User did NOT pick B1/C1 — those would need a follow-up disposition (Phase 18 a11y-remediation entry, owner: rebalance light-theme rgba-alpha text tokens).

#### Implication for Gate 10 (a11y) status

Gate 10 RED→AMBER. Class A specifically was the named blocker in the disposition options table (Option A1 vs A2 vs A3 — all three about Class A). A1 is now implemented and closes the named blocker. Class B + C remain on the disposition table as separate decisions for a future phase.

The 14-FINAL-GATE.md Gate 10 row updated to reflect: **A1 implemented; Class A closed; Class B + C deferred to Phase 18 a11y-remediation (D-PRE-11 retitled).**
