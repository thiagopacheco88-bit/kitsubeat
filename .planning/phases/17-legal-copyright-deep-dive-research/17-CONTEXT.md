# Phase 17: Legal & Copyright Deep-Dive (Research) - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Produce a standalone research document covering copyright (YouTube embeds, lyrics licensing, WhisperX derivatives, anime clips), privacy law (UK-GDPR, EU-GDPR, LGPD, CCPA), UK/EU consumer law (14-day cancel, digital-content waiver, refund templates), tax (UK VAT, EU VAT OSS/IOSS, place-of-supply, Stripe Tax configuration), EU AI Act disclosure obligations (WhisperX + LLM-generated lessons), and EAA / WCAG 2.1 AA accessibility — scoped to what a **UK sole trader** with a **UK + Brazilian + global free-beta audience** needs to implement Phase 18 without a lawyer, with explicit flags for items requiring legal consultation later.

**Founder context anchoring scope:**
- UK tax resident (London); entity = UK Sole Trader for beta, UK Ltd at ~£30–50k/yr
- Free beta under sole trader — no payments yet, but payments research is in-scope (see tax decision)
- Brazilian audience material (creator background + Portuguese translation support)
- No lawyer for v1; doc must be implementable DIY
- v4.0 Phase 21 = anime scenes (future copyright surface, light coverage now)

**Phase 17 produces:** research document + requirements checklist. Phase 18 implements against it (T&Cs, Privacy, cookie consent, data export, DMCA, refund policy, WCAG AA, age gating, support channel).

</domain>

<decisions>
## Implementation Decisions

### Document structure & handoff format
- **Single analysis document** — one long-form MD file with numbered sections per topic (copyright, UK-GDPR, EU-GDPR, LGPD, CCPA, consumer law, tax, AI Act, EAA/WCAG, age gating). One place to search, one place to update.
- **Prescriptive requirements** for Phase 18 — not principles. Each requirement states the exact obligation ("T&Cs must contain clause X covering Y per [statute § Z]") so Phase 18 implements line-by-line, not interpretively.
- **Lawyer-required flags: both inline marker AND end-of-doc index** — inline `🚩 LAWYER-REQUIRED` callout where the concern arises (so Phase 18 can't miss it), plus a consolidated "Pre-Monetization Legal Review" section at the end (so when a lawyer is eventually hired, the brief is ready as one handoff).
- **Cite every claim with links** — every legal claim, TOS clause, statute reference, precedent case gets a footnote with URL or canonical citation. Audit-trail grade. Builds defensibility if a claim is ever questioned and future-proofs against link rot (canonical citation even if URL changes).

### Jurisdiction priority & depth
- **All four jurisdictions get full treatment** — UK-GDPR, EU-GDPR, LGPD, CCPA all researched to implementation depth. No "lighter" tier.
- **No geo-gating for free beta** — research assumes global signups from day one. "You don't get to pick who signs up": the first French or Brazilian user to sign up triggers GDPR/LGPD applicability. Phase 18 ships all four jurisdictions' obligations at launch.
- **Per-jurisdiction output:** lawful basis per data field, data subject rights + SAR handling process, breach notification timelines, required disclosures, cookie/tracking rules. Each jurisdiction gets a parallel section structure so Phase 18 can diff them.

### Accessibility depth (Claude's call — captured)
- **WCAG 2.1 AA checklist + treat EAA as in-scope.** WCAG 2.1 AA is the EAA technical standard, so implementing AA covers EAA either way. Produce a full WCAG 2.1 AA checklist Phase 18 audits against.
- **Skip the "does kitsubeat qualify as e-commerce under EAA" legal analysis** — lawyer-flag the applicability question for the pre-monetization review. Implementation is the same either way.

### EU AI Act depth (Claude's call — captured)
- **Full disclosure-obligations analysis covering BOTH WhisperX AND Claude-generated lesson content** — not just WhisperX per the literal Success Criteria. LLM-generated lessons (vocab, grammar, translations, explanations) are the larger AI surface by far. Phase 18 needs disclosure rules for the whole product, not just transcripts.
- Covers: Art. 50 transparency obligations, "AI-generated content" labeling requirements, training-data transparency implications, user-facing disclosure UX patterns.

### Copyright rigor & risk posture (Claude's call — captured)
- **Lyrics licensing = highest-risk topic → deep precedent analysis.** Walk through Musixmatch v. Genius (map/trap-street detection), LRCLIB's legal posture, WhisperX transcripts as derivative works, synced-lyrics/karaoke case law. Rate kitsubeat's exposure with the traffic-light system below. Lawyer-flag any 🔴 finding.
- **YouTube embed terms = clause-by-clause with quoted TOS text.** YouTube is the single largest dependency — if embed privileges are revoked, kitsubeat is bricked. Pull literal TOS passages and map each to kitsubeat behavior (e.g., "ToS §X requires branded player → we use youtube-nocookie iframe with no overlay").
- **LRCLIB + other lyric sources = summary + link + "what we're doing about it".** Less surface area than YouTube; summary form.
- **Anime-clip liability (v4.0) = one-page summary + hard lawyer-gate.** Out of v3.0 scope per the "v3.0 launch readiness" frame, but document the biggest risks (Japanese copyright is aggressive; JASRAC/JIMCA; embed-vs-host distinction; educational-use exemption scope). Explicitly mark Phase 21 as `🚩 LAWYER-REQUIRED before planning`.
- **Risk rating system = traffic-light with lawyer-required threshold:**
  - 🟢 **Safe to ship** — current behavior compliant, no action needed
  - 🟡 **Safe with mitigation** — requires a documented process (takedown policy, attribution, opt-out) — Phase 18 implements
  - 🔴 **Lawyer-required before launch** — cannot ship without legal consultation; escalated to end-of-doc index

### Free-beta vs payments-on scope split
- **VAT / tax / Stripe Tax: full research now.** Covers UK VAT rules, EU VAT OSS/IOSS (post-2021 terminology — NOT "MOSS" as the roadmap said), place-of-supply for digital services, US sales tax nexus thresholds, Stripe Tax configuration spec. Rationale: when payments eventually turn on (Phase 19 exit criteria or v4.0 Phase 22), implementation is ready — no second research pass needed.
- **Refund policy: full research + template now.** UK Consumer Contracts Regs 2013, EU Consumer Rights Directive digital-content waiver, produce refund policy template. Phase 18 doesn't publish it for free beta (nothing to refund), but the template sits in the doc as `activate at monetization`.
- **T&Cs + Privacy Policy: full research now** — both are mandatory for free beta (data collection + user obligations trigger them regardless of payment status). Phase 18 publishes both at beta launch.
- **Cookie consent: full research, but implementation depends on Phase 15.** Principles + template in Phase 17; exact cookie banner + script-gating implementation waits on Phase 15 analytics/Sentry choice. Research captures what PECR/ePrivacy require; Phase 15 picks the analytics tool; Phase 18 wires consent to the chosen tool.

### Age gating (Claude's call — captured)
- **Full UK ICO Age Appropriate Design Code (AADC) analysis + implementation spec.**
- Rationale: anime-music-learner audience skews young — a chunk of likely beta users are 13–17. An "18+ only" gate would cut significant market share. Better to implement AADC's 15 standards properly from day one than re-litigate later.
- Deliverable includes: which AADC standards apply to kitsubeat, signup gate design (13+ with parental-awareness flow), data minimization for minors, default privacy settings for under-18 accounts, how this interacts with LGPD (Brazilian minors) and COPPA-like CCPA rules.

### Claude's Discretion (remaining items)
- Exact section ordering and length allocation within the single document
- Depth of case-law citation per topic (as long as every claim has at least one canonical citation)
- How to format the requirements checklist at end of doc (numbered table vs bulleted list) — optimize for Phase 18's ability to check items off

</decisions>

<specifics>
## Specific Ideas

- **"VAT MOSS" is outdated terminology.** The roadmap Success Criterion 4 says "VAT MOSS" — the current scheme is **OSS (One-Stop Shop) / IOSS** post-2021. Research should use current terminology and explicitly note the rename so the doc doesn't look out of date.
- **The WhisperX transcripts are the interesting copyright edge case.** They're derivative works of copyrighted audio. LRCLIB-sourced lyrics have their own (separate) licensing story. Don't conflate the two — they need parallel treatment under different legal frameworks.
- **EU AI Act enforcement timeline matters.** Art. 50 disclosure obligations have a staged timeline (2025–2027 depending on provision). Research should capture which obligations are live at v3.0 launch vs which become live later — affects Phase 18 vs future-phase split.
- **AADC + minors audience is a real scoping consideration, not a paranoid edge case.** Anime fandom demographics include a large 13–17 cohort. Design for it, don't pretend it away.

</specifics>

<deferred>
## Deferred Ideas

- **Full anime-clip (v4.0 Phase 21) legal analysis** — Phase 17 produces one-page summary + hard lawyer-gate. A dedicated research phase before Phase 21 does the full work.
- **Dedicated monetization tax research phase** — if Phase 17's full-tax research proves insufficient when payments turn on, a focused refresh can happen at that time. Not expected to be needed.
- **COPPA applicability (US minors <13)** — CCPA covers <13 implicitly; full COPPA analysis is deferred unless US becomes a priority market post-beta.
- **Music industry licensing (synchronization rights, mechanical royalties)** — only becomes relevant if kitsubeat ever hosts audio rather than embedding YouTube. Out of scope for v3.0 and v4.0; flag only.
- **Trademark / brand protection** (the name "kitsubeat", fox/beat mascot IP) — separate concern from copyright/privacy/tax. Noted as a future admin task, not part of Phase 17 research.

</deferred>

---

*Phase: 17-legal-copyright-deep-dive-research*
*Context gathered: 2026-04-19*
