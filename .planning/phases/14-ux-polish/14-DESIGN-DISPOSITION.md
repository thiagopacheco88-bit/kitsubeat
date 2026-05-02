# Phase 14 — Design Source Disposition

**Purpose:** Closes SPEC AC #5 ("All 11 in-scope surfaces have a Claude Design output... checked into `design_handoff_phase14/`") in lieu of a `design_handoff_phase14/` directory, per CONTEXT.md D-22 ("the phase merge is NOT blocked on full design coverage; it IS blocked on full token coverage").

## D-19 Zip Triage Finding (executed pre-plan-phase by the orchestrator)

The user dropped two zip files at repo root before Phase 14 planning began:
- `Kitsubeat Design.zip`
- `Kitsubeat Design (1).zip`

The orchestrator extracted both archives and ran a byte-for-byte comparison against the existing on-disk design imports:
- `design_handoff_kitsubeat_home/` (mobile variant)
- `design_handoff_kitsubeat_web/design_handoff_kitsubeat_desktop/` (desktop variant)

**Result:** Both zips are EXACT byte-for-byte duplicates of the already-imported home design (mobile + desktop). They contain ONLY the home surface — NOT fresh design output for the other 10 surfaces.

**Disposition:** Both zips are deleted from repo root by Plan 14-00 Task 0 (this task) — they are stale duplicates. They were never in `.gitignore` and never tracked by git; deletion has zero history impact.

## Per-surface treatment table (CLOSES SPEC AC #5)

| Surface | Design Source | Treatment |
|---------|---------------|-----------|
| `/` (home) | `design_handoff_kitsubeat_home/` (mobile) + `design_handoff_kitsubeat_web/design_handoff_kitsubeat_desktop/` (desktop) | FULL design migration |
| `/songs` | none | D-22 token-only swap |
| `/anime-list` | none | D-22 token-only swap |
| `/songs/[slug]` | none | D-22 token-only swap |
| `/kana` | none | D-22 token-only swap |
| `/kana/session` | none | D-22 token-only swap |
| `/kana/session/summary` | none | D-22 token-only swap |
| `/path` | none | D-22 token-only swap |
| `/vocabulary` | none | D-22 token-only swap |
| `/review` (+ children) | none | D-22 token-only swap |
| `/profile` | none | D-22 token-only swap |

**D-22 token-only swap definition:** Raw hex (e.g., `bg-[#1a1a1a]`), Tailwind palette utilities (e.g., `bg-gray-900`, `text-red-500`), bare white/black (e.g., `bg-white`), and arbitrary px (e.g., `p-[14px]`) are replaced with token references from `src/app/globals.css` `@theme` block. Layout, structure, and component composition are UNTOUCHED — the migration is className-substitution only. Primitives (Button/Card/Badge/Modal/EmptyState/Skeleton) from Plan 14-02 are adopted where the existing component already matches their shape.

## Out-of-scope surfaces (not in the 11-surface coverage)

These are explicitly out-of-scope per SPEC and do NOT need a treatment row above:
- `/admin/**` (operator-facing per D-18; lint-allowlisted)
- `/__dev/**` (dev catalog per D-18; lint-allowlisted)
- `/dashboard` (deprecated stub — DELETED in Plan 14-04 Task 3)
- Framework error fallbacks (`error.tsx`, `global-error.tsx`)

## Phase-merge gate behavior

Per CONTEXT D-22: the Phase 14 merge gate accepts THIS file (14-DESIGN-DISPOSITION.md) as the artifact closing SPEC AC #5. The merge is NOT gated on a `design_handoff_phase14/` directory existing.

The merge IS gated on (verified by Plan 14-09 Task 3 final gate):
- Lint codebase-wide exits 0
- `scripts/audit/token-compliance.ts` exits 0
- `scripts/audit/motion-catalog-completeness.ts` exits 0
- All 11 in-scope mobile-parity tests pass at 390x844
- All 22 a11y tests (11 routes x 2 themes) report zero serious/critical axe violations
- `npm run build` succeeds and `npm run size` keeps `/songs/[slug]` <= 50 KB gzipped (Phase 13 D-23)

Per planner correction: the home surface ALSO ships under D-22 token-only swap as the floor; the FULL design migration treatment is the ceiling — if the executor finds the existing `/` page already structurally matches the design handoff, the work collapses into a token swap only.
