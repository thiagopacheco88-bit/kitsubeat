# Resume Context

## Current Task
Phase 14.x design revamp — three huashu-design hi-fi prototypes built and approved for `/path`, `/`, and `/songs/[slug]`. Ready to formalize via GSD and ship surface-by-surface.

## Key Decisions
- **Design language: C+A hybrid "Stage Lights on a Route"** — cover-art-as-background nodes (Direction C / music-app DNA) + tier-themed journey gravitas (Direction A / Pokemon-route metaphor: bamboo/torii/mountain icons, lantern streak, mist on locked, kana foundation cards).
- **Phase numbering:** 14.1 = `/path` redesign · 14.2 = `/` home redesign · 14.3 = `/songs/[slug]` lesson redesign · 14.4 = virality/engagement (social activity + streak behavioral hooks, deferred from revamp).
- **Virality concepts (from 6-slide review):** principles 1+2+3+4+6a baked into briefings; 5 + 6b deferred to 14.4. See `HUASHU-BRIEFINGS.md` "Virality goals" section.

## Next Steps
1. Run `/gsd-spec-phase 14.1-redesign-path` first (smallest surface, validates the token system survives implementation). Demos at `_temp/path-redesign/demo-CA-hybrid.html` (path), `demo-home-CA-hybrid.html`, `demo-lesson-CA-hybrid.html`.
2. After 14.1 ships → 14.2 home → 14.3 lesson → 14.4 virality.
3. Side fix needed first: `/path` runtime errors (missing starter song slugs `misa-no-uta-aya-hirano`, `yume-wo-kanaete-doraemon-mao`, `under-the-tree-sim`) and `/songs/[slug]` title contrast bug — small PR before redesign commits land.

## Key Artifacts
- `HUASHU-BRIEFINGS.md` — 3 ready-to-paste briefings + virality goals section
- `_temp/path-redesign/demo-*.html` — three approved hi-fi prototypes (open in browser)
- `_temp/path-redesign/demo-*.png` + `*-scrolled.png` — static screenshots for review reference
- `.planning/phases/14.4-virality-engagement/INTENT.md` — stub for future virality/engagement phase
- Asset ask outstanding: SVG version of running fox illustration (currently only PNG at `public/logo-horizontal.png`)
