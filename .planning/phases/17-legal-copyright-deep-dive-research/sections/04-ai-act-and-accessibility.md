# Section 4 — Emerging Regulation: EU AI Act + Accessibility

**Scope:** Two distinct regulatory surfaces, grouped here because both are "emerging" and both produce Phase 18 implementation obligations.

**AI Act scope widening (per CONTEXT):** The roadmap Success Criterion 5 references "EU AI Act disclosure for WhisperX content." This section covers BOTH (a) WhisperX audio-to-text transcription output AND (b) Claude-generated lesson content (vocab entries, grammar explanations, translations, verse interpretations, mnemonics, kanji breakdowns). LLM-generated lessons are the larger AI surface by far and therefore the primary disclosure-obligation driver.

**Accessibility scope (per CONTEXT decision):** The question of whether kitsubeat legally qualifies as e-commerce under the European Accessibility Act (EAA, Directive 2019/882) is lawyer-flagged — implementation is the WCAG 2.1 AA technical standard either way, so the checklist here targets AA unconditionally.

---

## 4.1 EU AI Act — Applicability & Enforcement Timeline

### Statutory Reference

**Regulation (EU) 2024/1689** of the European Parliament and of the Council of 13 June 2024 laying down harmonised rules on artificial intelligence (Artificial Intelligence Act). Published in the Official Journal of the European Union, OJ L 2024/1689, 12.7.2024.[^1]

The AI Act entered into force on 1 August 2024 (Art. 113(1)[^2]).

### kitsubeat's Role Under the AI Act

The AI Act applies to providers (Art. 3(3)) and deployers (Art. 3(4)) of AI systems. kitsubeat operates in both capacities:

- **Deployer of GPAI (General-Purpose AI):** kitsubeat calls Anthropic's Claude API to generate lesson content. Claude is a General-Purpose AI model within the meaning of Art. 3(63). kitsubeat — as the entity that integrates Claude into a product offered to users — is a **deployer** under Art. 28.
- **Deployer of an AI system (WhisperX):** kitsubeat uses the WhisperX audio-transcription model to produce time-aligned transcripts of copyrighted audio. WhisperX is an AI system under Art. 3(1). kitsubeat is a deployer of that system.
- **Whether kitsubeat is also a "provider":** Under Art. 3(3), a deployer becomes a provider if it modifies an existing AI system's intended purpose or makes substantial changes before placing output in service. The Verse Coverage Agent (Phase 1) pipelines WhisperX output through validation and rewriting steps. This is likely sufficient modification to make kitsubeat a **co-provider** for WhisperX-derived transcripts. `🚩 LAWYER-REQUIRED {#lawyer-ai-02} — confirm provider vs. deployer classification under Art. 3(3) for modified WhisperX pipeline output.`

### Enforcement Timeline (Art. 113)

The AI Act uses a phased applicability schedule. All dates below are per Art. 113.[^2]

| Date | Obligations live | kitsubeat impact |
|------|-----------------|-----------------|
| 2024-08-01 | Regulation enters into force | Awareness only |
| 2025-02-02 | Chapter II Prohibited Practices (Art. 5); AI literacy (Art. 4) | Art. 4 AI-literacy SOP required for internal operators |
| 2025-08-02 | Chapter III GPAI model obligations (Arts. 51–56); AI Office governance (Art. 64) | Anthropic's GPAI transparency disclosures go live; kitsubeat should link to them |
| 2026-08-02 | Chapter V deployer obligations including Art. 50 transparency; most other provisions | **Art. 50 disclosure is LIVE at v3.0 launch (2026 target)** — Phase 18 MUST implement |
| 2027-08-02 | High-risk AI system provisions (Annex III) fully apply | Not applicable to kitsubeat (see §4.4 for classification) |

### Mapping to kitsubeat Phase Assignments

| Obligation | Article | Effective date | kitsubeat applicability | Phase assignment |
|-----------|---------|---------------|------------------------|-----------------|
| AI literacy for operators | Art. 4 | 2025-02-02 | Solo operator must document sufficient AI literacy (SOPs) | Phase 17 research → Phase 18 SOP note |
| Transparency (AI-generated output to users) | Art. 50(1)–(4) | 2026-08-02 | WhisperX transcripts + Claude lesson content | Phase 18 |
| GPAI provider transparency | Art. 53 | 2025-08-02 | Applies to Anthropic/OpenAI, not kitsubeat; link their docs | Phase 18 footer/about |
| High-risk AI obligations | Annex III | 2027-08-02 | NOT applicable (see §4.4) | None |
| Prohibited practices | Art. 5 | 2025-02-02 | No subliminal manipulation, no social scoring — not applicable | Confirm at each major feature |

**Key conclusion for Phase 18:** By v3.0 launch (targeted 2026), Art. 50 disclosure obligations are LIVE. Phase 18 must implement disclosure for both the WhisperX surface and the Claude-lessons surface.

---

## 4.2 Art. 50 Transparency — WhisperX (AI-Generated Text Output)

### Statutory Basis

**Regulation (EU) 2024/1689, Article 50(2):** Deployers of AI systems that generate or manipulate image, audio, video or text output "which is made public" must disclose that the content has been artificially generated or manipulated, "in an appropriate, timely and clear manner."[^3]

kitsubeat publishes WhisperX-generated transcripts (time-aligned furigana + romaji overlays, verse-level lyric text) on the public song pages. This is output "made public" — Art. 50(2) applies.

### The "Human Review" Exception Analysis

Art. 50(2) final paragraph provides an exception where content "has undergone a process of human review or editorial control, and a natural or legal person bears editorial responsibility for the content."[^3]

**kitsubeat pipeline stages for WhisperX output:**
1. WhisperX produces raw transcripts (phoneme-level alignment)
2. Timing editor (automated) adjusts start/end timestamps to verse boundaries
3. Verse Coverage Agent (automated) validates character coverage
4. Human review checkpoint (Song Ingestion SOP, Gate 6) — operator reviews final transcript before publishing

**Assessment:** The pipeline does include a human review checkpoint (Gate 6). However:
- The "editorial control" envisaged by Art. 50(2) refers to a natural person who can modify content, not merely approve/reject a pipeline output
- The review in Gate 6 is quality-gating (does the transcript adequately cover the verses?), not substantive editorial re-authoring of the content
- The AI Office's forthcoming guidance (not yet published as of 2026-04-19) may clarify the threshold — `🚩 LAWYER-REQUIRED {#lawyer-ai-01} — confirm whether kitsubeat's Gate 6 quality review constitutes "editorial control" sufficient to trigger Art. 50(2) exception. Until confirmation, treat as NOT excepted.`

**Risk rating: 🟡 Safe with mitigation** — label transcripts as AI-generated; implement machine-readable metadata flag pending AI Office guidance.

### Disclosure Requirements

**REQ-AI-WHISPER-01:** Song pages that display WhisperX-generated lyrics/transcripts MUST display a visible label: "Transcript generated by AI (WhisperX)" or equivalent. Label must appear in proximity to the transcript content, not buried in footer or privacy policy only.

**REQ-AI-WHISPER-02:** The label must be "appropriate, timely and clear" (Art. 50(2)). Proposed UX: a small badge ("AI transcript") on the verse/lyric panel, rendered inline above or below the verse display area. CSS class `ai-generated-badge`.

**REQ-AI-WHISPER-03:** Machine-readable disclosure — Art. 50(2) requires marking "in a marked format detectable as artificially generated." The EU AI Office has not yet published technical specification guidance.[^4] Proposed interim implementation: add `data-ai-generated="true"` and `data-ai-model="whisperx"` attributes to the verse container element. C2PA-style provenance metadata is not required at this stage but should be monitored. `🚩 LAWYER-REQUIRED {#lawyer-ai-01} — confirm whether DOM data-attributes satisfy Art. 50(2) machine-readable requirement once EU AI Office technical guidance is published.`

**REQ-AI-WHISPER-04:** Privacy/AI Policy page MUST contain a section disclosing that song transcripts are generated by the WhisperX AI model and have not been transcribed by a human.

### Placement Specification for Phase 18

```
Song page → Verse panel header OR footer:
  <span class="ai-generated-badge" data-ai-generated="true" data-ai-model="whisperx">
    AI transcript
  </span>
```

Minimum visible text: "AI transcript" or "AI-generated." Full disclosure in the AI/Privacy Policy. Link from badge to AI Policy anchor `#ai-transcript`.

---

## 4.3 Art. 50 Transparency — Claude-Generated Lesson Content

### Statutory Basis

Same Art. 50(2) analysis as §4.2, applied to the Claude lesson content surface.[^3]

### kitsubeat's Claude-Generated Content Surface

Every kitsubeat lesson is authored entirely by Claude (Anthropic's LLM). The following content types are AI-generated:

| Content type | Produced in | Volume |
|-------------|-------------|--------|
| Vocab entries (meaning, part of speech, JLPT level) | Phase 1 pipeline | ~50–200 per song |
| Grammar explanations (conjugation analysis, particle usage) | Phase 1 pipeline | ~20–80 per song |
| Verse-level translations (EN, PT) | Phase 1 pipeline | 4–20 per song |
| Verse-level natural-language explanations | Phase 1 pipeline | 4–20 per song |
| Mnemonics (Phase 08.3) | Phase 08.3 pipeline | 1 per vocab item |
| Kanji breakdowns (Phase 08.3) | Phase 08.3 pipeline | 1 per kanji-containing vocab |
| LearnCard content (Phase 08.4) | Phase 08.4 pipeline | 1 per vocab item |
| Exercise distractors and explanations (Phase 8, 10) | Runtime (Claude API) | per-session |
| Grammar conjugation exercise questions (Phase 10) | Runtime (Claude API) | per-session |

### "Human Review" Exception — Stronger Case Here

The Claude-lesson pipeline includes:
1. Claude generates structured JSON via the Phase 1 pipeline
2. Verse Coverage Agent (Phase 1) validates semantic coverage and coherence
3. Operator reviews lesson content at Song Ingestion Gate 5–6 before publishing

This represents more substantive human review than the WhisperX pipeline. The operator reads and approves lesson explanations, which are displayed verbatim to users. The exception is "more cleanly" applicable here per CONTEXT guidance.

**Assessment:** Despite the stronger exception argument, the scale of Claude-generated content (every lesson, every vocab entry, every grammar note on every song) makes disclosure the defensible and recommended posture regardless. Relying on the editorial-control exception without legal confirmation creates unnecessary regulatory risk.

**Risk rating: 🟡 Safe with mitigation** — implement global disclosure + per-lesson subtle indicator.

### Disclosure Requirements

**REQ-AI-LESSON-01:** Global disclosure in Privacy Policy / About page: "Lesson content on kitsubeat — including vocabulary definitions, grammar explanations, verse translations, and learning notes — is initially drafted by an AI language model (Claude by Anthropic) and then reviewed by the kitsubeat team."

**REQ-AI-LESSON-02:** Per-lesson visible indicator on the lesson panel: a subtle "AI-assisted" footer line or badge. Proposed: a 12px footer line on each lesson card reading "AI-assisted content" with a link to the AI Policy.

**REQ-AI-LESSON-03:** TL;DR disclosure in the cookie/consent banner: "We use AI to generate learning content." This ensures first-time visitors receive the disclosure before engaging with any lesson.

**REQ-AI-LESSON-04:** Mnemonics and kanji breakdowns (Phase 08.3) displayed in the vocab feedback panel must individually carry the `data-ai-generated="true"` attribute and an accessible label indicating AI origin.

**REQ-AI-LESSON-05:** Exercise distractors and explanations are ephemeral (generated per session, not stored) — these need not be individually labeled but are covered by the global disclosure.

**REQ-AI-LESSON-06:** LearnCard content (Phase 08.4) is stored and re-displayed — MUST carry the `data-ai-generated="true"` attribute on the card container. The per-lesson badge in REQ-AI-LESSON-02 covers this surface.

### Placement Specification for Phase 18

```
Lesson panel footer (every song detail page, lesson section):
  <p class="ai-content-disclosure">
    <a href="/about#ai-content">AI-assisted content</a>
  </p>
```

Cookie/consent banner first-load text: "kitsubeat uses AI to generate learning content. [Learn more]"

---

## 4.4 AI Act — Training-Data Transparency, AI Literacy, and Risk Classification

### Art. 53 GPAI Provider Transparency

Art. 53 obligations — training-data summaries, copyright policy transparency, model cards — apply to **providers** of GPAI models.[^5] This means Anthropic (for Claude) and the WhisperX authors (for the open-weights model). kitsubeat is a **deployer**, not a GPAI provider, and has no Art. 53 obligations.

However, as a responsible deployer, kitsubeat SHOULD:
- Link to Anthropic's AI transparency documentation in the Privacy/About copy
- Confirm Anthropic's GPAI transparency disclosures are published (required from 2025-08-02 per Art. 113)

**REQ-AI-LITERACY-01:** Privacy/AI Policy page MUST contain a reference to Anthropic's model transparency page and Claude's usage policies, so users can understand the upstream AI system's nature.

### Art. 4 — AI Literacy

Art. 4 (effective 2025-02-02) requires deployers to "ensure, to their best extent, a sufficient level of AI literacy of their staff and persons dealing with the operation of AI systems on their behalf."[^6]

For a solo operator, this means:
- Document in SOPs which AI systems are in use, their outputs, and how outputs are validated
- The Song Ingestion SOP (Phase 17 → Song Ingestion SOP document) should explicitly include an AI-literacy gate: operator must understand what WhisperX outputs and what Claude generates before approving song ingestion

**REQ-AI-LITERACY-02:** The Song Ingestion SOP MUST include a documented AI-literacy acknowledgement step: operator confirms they understand that (a) WhisperX produces AI-generated transcripts, (b) Claude produces AI-generated lesson content, (c) both require human review per Gate 5–6 before publishing.

### Risk Classification — kitsubeat Is NOT High-Risk

The AI Act Annex III lists high-risk AI system categories. The education-related category (Annex III §5) covers AI systems "intended to be used for the purpose of determining access to, or assigning persons to, educational and vocational training institutions; for evaluating learning outcomes of persons in educational and vocational training institutions."[^7]

kitsubeat does NOT:
- Determine access to educational institutions
- Evaluate outcomes that affect formal educational qualification or certification
- Issue certificates with legal or formal recognition

kitsubeat is an informal language-learning app. Its AI components (WhisperX + Claude) are not Annex III high-risk.

**HOWEVER:** If kitsubeat ever introduces formal certification (e.g., a JLPT-preparation assessment or a completion certificate), this classification must be re-examined. `🚩 LAWYER-REQUIRED {#lawyer-ai-03} — re-examine Annex III §5 high-risk classification if kitsubeat introduces any formal language-certification or assessment product.`

**Risk rating:**
- 🟡 Claude lesson content disclosure (implement with mitigation — REQ-AI-LESSON-*)
- 🟡 WhisperX transcript disclosure (implement with mitigation + machine-readable metadata pending guidance — REQ-AI-WHISPER-*)
- 🟢 Not-high-risk classification (subject to re-check if formal certification introduced)
- 🟢 AI literacy (solo operator SOP update — low burden)

---

## 4.5 WCAG 2.1 AA Accessibility Checklist

**Reference:** Web Content Accessibility Guidelines (WCAG) 2.1, W3C Recommendation 05 June 2018. https://www.w3.org/TR/WCAG21/

**Scope:** All Level A (30 success criteria) and Level AA (20 success criteria) = 50 rows total. Level AAA is excluded per CONTEXT decision (AA is the EAA technical standard). Every row maps to at least one kitsubeat surface and assigns a Phase 18 obligation with a REQ-A11Y ID.

**Severity marker legend:** 🔴 = known/likely gap requiring immediate Phase 18 attention; no marker = satisfiable by standard implementation or likely already met.

| SC # | Principle | Criterion | Level | kitsubeat surface | Phase 18 obligation | REQ ID |
|------|-----------|-----------|-------|-------------------|---------------------|--------|
| 1.1.1 | Perceivable | Non-text Content | A | Song catalog (thumbnails), song page (YouTube iframe), kana trainer (kana character images), profile avatar | Add `alt` text to all song thumbnails; add `aria-label` to YouTube iframe (`aria-label="Song video player: [Song Title]"`); kana trainer SVG characters must have `aria-label` with romanization + meaning; profile avatar img `alt="[Username]'s avatar"` | REQ-A11Y-01 |
| 1.2.1 | Perceivable | Audio-only and Video-only (Prerecorded) | A | N/A — kitsubeat does not host prerecorded audio-only or video-only content; it embeds YouTube video with audio | Confirm no standalone audio-only clips are served; if audio previews added in future, provide text transcript | REQ-A11Y-02 |
| 1.2.2 | Perceivable | Captions (Prerecorded) | A | YouTube embedded video (prerecorded music video) | YouTube's native CC fulfils captions for YouTube-hosted content; confirm YouTube iframe allows CC controls and is not overridden by kitsubeat wrapper 🔴 | REQ-A11Y-03 |
| 1.2.3 | Perceivable | Audio Description or Media Alternative (Prerecorded) | A | YouTube embedded video | Provide brief text description of music video visuals in song page metadata (e.g. "Animated music video for [Song]"); or confirm audio description track in YouTube CC is available | REQ-A11Y-04 |
| 1.2.4 | Perceivable | Captions (Live) | AA | N/A — kitsubeat does not host live audio/video | No live streams planned; confirm before adding any live feature | REQ-A11Y-05 |
| 1.2.5 | Perceivable | Audio Description (Prerecorded) | AA | YouTube embedded video | Link to audio-described version if available, or document that kitsubeat relies on YouTube's AD track; document limitation in accessibility statement | REQ-A11Y-06 |
| 1.3.1 | Perceivable | Info and Relationships | A | Furigana ruby text (all song + exercise pages), grammar color-coding, verse structural markup, exercise option lists, kana grid | Furigana MUST use `<ruby>/<rt>/<rp>` semantic markup, not CSS pseudo-elements; grammar color-coding (particle colors, JLPT tier colors) MUST be paired with a text label or icon — color alone is insufficient; exercise options MUST be rendered as `<ul><li>` or `<fieldset><legend>` with radio buttons, not bare divs 🔴 | REQ-A11Y-07 |
| 1.3.2 | Perceivable | Meaningful Sequence | A | Exercise session (question + options), LearnCard accordion, kana trainer grid | DOM reading order must match visual order for exercise question→options→feedback; LearnCard accordion content must appear immediately after toggle button in DOM | REQ-A11Y-08 |
| 1.3.3 | Perceivable | Sensory Characteristics | A | Exercise correct/incorrect feedback, FSRS tier indicators, star display | Do not use color or sound alone to convey exercise correctness; pair color (green/red) with text ("Correct!" / "Incorrect") and/or icon; star display must have text equivalent | REQ-A11Y-09 |
| 1.3.4 | Perceivable | Orientation | AA | All pages | Do not lock screen orientation; app must function in both portrait and landscape, especially for exercise session on mobile 🔴 | REQ-A11Y-10 |
| 1.3.5 | Perceivable | Identify Input Purpose | AA | Auth forms (signup/login), profile settings, cookie banner, payment forms (future) | Autocomplete attributes on auth form inputs: `autocomplete="email"`, `autocomplete="current-password"`, `autocomplete="new-password"` as appropriate | REQ-A11Y-11 |
| 1.4.1 | Perceivable | Use of Color | A | FSRS tier badge colors, JLPT level colors, grammar particle colors, exercise correct/incorrect indicators | All color-coded indicators must have a text or icon companion; confirm in exercise session that correct/incorrect is conveyed by text, not color badge alone 🔴 | REQ-A11Y-12 |
| 1.4.2 | Perceivable | Audio Control | A | YouTube iframe auto-play (if enabled) | If YouTube video auto-plays on song page load, provide a pause mechanism within kitsubeat UI (not just rely on YouTube controls) | REQ-A11Y-13 |
| 1.4.3 | Perceivable | Contrast (Minimum) | AA | Verse highlight overlay text vs background, FSRS tier badge text vs badge bg, star display, lesson explanation text, cookie banner text, auth form labels | All text must meet 4.5:1 contrast ratio (3:1 for large text ≥18pt/14pt bold); audit verse-highlight color pair, FSRS badge colors, star color (#FBBF24 amber on white/dark bg) against respective backgrounds 🔴 | REQ-A11Y-13b |
| 1.4.4 | Perceivable | Resize Text | AA | All text (song page, exercise session, kana grid, lesson panel, profile) | All text must scale to 200% viewport zoom without horizontal scroll loss or clipping; use relative units (rem/em) for font sizes; do not set overflow:hidden on text containers 🔴 | REQ-A11Y-14 |
| 1.4.5 | Perceivable | Images of Text | AA | Kana character display if rendered as images, logo | Render kana/kanji as Unicode text with appropriate font (not as image); if kana trainer uses SVG/image for character display, provide text alternative | REQ-A11Y-15 |
| 1.4.10 | Perceivable | Reflow | AA | Exercise session, song page, catalog | Content must reflow at 320px viewport width without horizontal scrolling (CSS 400% zoom equivalent); test exercise option buttons at narrow widths 🔴 | REQ-A11Y-16 |
| 1.4.11 | Perceivable | Non-text Contrast | AA | Star display, FSRS tier badge borders, exercise option button borders, focus rings | Non-text UI components and state indicators must meet 3:1 contrast ratio against adjacent colors; star SVG stroke vs background, badge border vs bg | REQ-A11Y-17 |
| 1.4.12 | Perceivable | Text Spacing | AA | All text content | Content must not overlap or clip when letter-spacing, word-spacing, line-height, and paragraph spacing are set to WCAG minimum values; test on lesson panels with dense Japanese text | REQ-A11Y-18 |
| 1.4.13 | Perceivable | Content on Hover or Focus | AA | Tooltips (BonusBadgeIcon hover tooltip "Bonus mastery: Grammar Conjugation + Sentence Order"), any other hover-revealed content | Tooltip must be dismissible (Escape key), hoverable (pointer can move to tooltip without it disappearing), persistent (remains until focus moves away or user dismisses) 🔴 | REQ-A11Y-19 |
| 2.1.1 | Operable | Keyboard | A | Exercise session (option selection, submit, replay), kana trainer (kana cell selection), song page (verse navigation), cookie banner, auth forms, LearnCard accordion, catalog search/filter | Full keyboard operability for all interactive elements; exercise options MUST be selectable via Tab + Enter/Space or arrow keys; replay button in Listening Drill MUST be keyboard accessible; kana trainer cells MUST be keyboard navigable 🔴 | REQ-A11Y-20 |
| 2.1.2 | Operable | No Keyboard Trap | A | Cookie banner modal, upsell modal (AdvancedDrillsUpsellModal), any dialog | Focus must not be trapped in any component (except intentional modal dialogs that manage focus correctly with Escape-to-close); modals must trap focus within themselves AND allow Escape-to-close | REQ-A11Y-21 |
| 2.1.4 | Operable | Character Key Shortcuts | AA | Any single-key keyboard shortcuts (if implemented) | If single-key shortcuts (e.g. 1–4 for exercise options) are implemented, they MUST be configurable, remappable, or disableable; currently no single-key shortcuts are documented — confirm and document 🔴 | REQ-A11Y-22 |
| 2.2.1 | Operable | Timing Adjustable | A | FSRS review session (if time-limited), exercise session (no time limit currently) | Do not impose time limits without user control; confirm no session timer; if a timer is added in future, provide extend/disable option | REQ-A11Y-23 |
| 2.2.2 | Operable | Pause, Stop, Hide | A | Any animated content (confetti on star earn, verse-highlight animation, SongMasteredBanner entrance animation) | Provide pause/stop for animations lasting > 5 seconds; confetti animation should auto-stop or provide a dismiss mechanism; prefer `prefers-reduced-motion` CSS media query to disable all motion | REQ-A11Y-24 |
| 2.3.1 | Operable | Three Flashes or Below Threshold | A | Confetti animation, any flash-based feedback | No content should flash more than 3 times per second; confetti and correct/incorrect feedback transitions must not produce rapid flicker | REQ-A11Y-25 |
| 2.4.1 | Operable | Bypass Blocks | A | All pages with repeated navigation (header nav, song list header) | Provide a "Skip to main content" link as the first focusable element on all pages with repeated navigation blocks 🔴 | REQ-A11Y-26 |
| 2.4.2 | Operable | Page Titled | A | All pages | Each page must have a unique, descriptive `<title>` element; song pages: "[Song Title] — kitsubeat"; exercise pages: "[Song Title] Exercise — kitsubeat"; catalog: "Songs — kitsubeat" | REQ-A11Y-27 |
| 2.4.3 | Operable | Focus Order | A | Exercise session (question → options → submit → feedback → next), LearnCard accordion, kana trainer grid, auth forms | Tab focus order must be logical and intuitive; exercise session focus must progress question → option buttons → submit; confirm with manual keyboard test 🔴 | REQ-A11Y-28 |
| 2.4.4 | Operable | Link Purpose (In Context) | A | Catalog song links, nav links, lesson panel links, footer links, AI-disclosure badge links | Every link's purpose must be clear from link text alone or from surrounding context; avoid "click here" or "read more" as standalone link text; AI-disclosure badge link text must be descriptive | REQ-A11Y-29 |
| 2.4.5 | Operable | Multiple Ways | AA | Site-wide | Provide ≥2 ways to locate each page (e.g. catalog + search + sitemap); ensure site search or consistent navigation allows alternative path to any page | REQ-A11Y-30 |
| 2.4.6 | Operable | Headings and Labels | AA | All pages | Use semantic heading hierarchy (h1–h6) consistently; labels on all form fields; heading structure on song page: h1 = song title, h2 = Vocabulary / Grammar / Exercises, h3 = individual section headers | REQ-A11Y-31 |
| 2.4.7 | Operable | Focus Visible | AA | All interactive elements (buttons, links, inputs, exercise options, kana cells, accordion toggles) | All interactive elements must have a visible focus indicator; custom CSS must not remove outline without replacement; implement a 2px solid focus ring that meets 3:1 contrast ratio against background 🔴 | REQ-A11Y-32 |
| 2.5.1 | Operable | Pointer Gestures | A | Sentence Order (drag-to-answer), any swipe gestures | All multi-point or path-based gestures must have a single-pointer alternative; sentence order drag MUST have a tap-to-select + tap-to-place alternative 🔴 | REQ-A11Y-33 |
| 2.5.2 | Operable | Pointer Cancellation | A | Exercise option buttons, kana cells, sentence order tokens | Activate on `mouseup`/`pointerup`, not `mousedown`; user can abort by moving pointer off element before releasing | REQ-A11Y-34 |
| 2.5.3 | Operable | Label in Name | A | Icon-only buttons (replay in Listening Drill, close modal, star display), custom exercise option buttons | Accessible name must contain or match visible label text; icon-only buttons must have `aria-label` that matches any tooltip text | REQ-A11Y-35 |
| 2.5.4 | Operable | Motion Actuation | A | Any shake-to-action or device-motion gesture (not currently implemented) | Do not make any feature operable only via device motion; if device-motion is added, provide UI alternative | REQ-A11Y-36 |
| 3.1.1 | Understandable | Language of Page | A | All pages | Set `lang` attribute on `<html>` element; for English-primary pages: `<html lang="en">`; for PT-BR variant pages: `<html lang="pt-BR">` 🔴 | REQ-A11Y-37 |
| 3.1.2 | Understandable | Language of Parts | AA | Song pages (Japanese verse text, furigana), lesson panels (Japanese examples), grammar explanation (Japanese grammatical examples) | Japanese text segments must be marked `lang="ja"` (e.g. `<span lang="ja">食べる</span>`); furigana `<ruby>` elements inherit `lang="ja"` from parent; English translation spans remain without override 🔴 | REQ-A11Y-38 |
| 3.2.1 | Understandable | On Focus | A | All interactive elements | Receiving focus must not trigger automatic context change (navigation, form submission); confirm that kana trainer and exercise options do not auto-advance on focus | REQ-A11Y-39 |
| 3.2.2 | Understandable | On Input | A | Exercise session, kana trainer, auth forms | Changing a form input value must not cause automatic context change without prior notice; exercise options submit on explicit click/key-Enter, not on selection | REQ-A11Y-40 |
| 3.2.3 | Understandable | Consistent Navigation | AA | Site-wide header/nav, song page sidebar, exercise session header | Repeated navigation elements appear in same relative order across pages; kitsubeat header nav must be consistent (catalog, profile, settings always in same position) | REQ-A11Y-41 |
| 3.2.4 | Understandable | Consistent Identification | AA | Star display (used in catalog + song page + session summary), FSRS tier badge, AI-disclosure badge | Components with the same function must be identified consistently; star component accessible name must be "N stars" across all contexts | REQ-A11Y-42 |
| 3.3.1 | Understandable | Error Identification | A | Auth forms, cookie banner, payment forms (future), exercise session (sentence order invalid state) | Form validation errors must identify the specific field and describe the error in text (not just color or icon); e.g. "Email: Please enter a valid email address" | REQ-A11Y-43 |
| 3.3.2 | Understandable | Labels or Instructions | A | Auth forms (signup/login), cookie banner consent checkboxes, payment forms (future), exercise sentence order instructions | All form fields must have a visible `<label>` (not just placeholder text); sentence order exercise must have instruction text "Arrange the words to form the sentence" | REQ-A11Y-44 |
| 3.3.3 | Understandable | Error Suggestion | AA | Auth forms, payment forms (future) | Where an input error is detected and suggestions are known (e.g. "Password must be at least 8 characters"), provide the suggestion in the error message | REQ-A11Y-45 |
| 3.3.4 | Understandable | Error Prevention (Legal, Financial, Data) | AA | Account deletion (profile), payment flow (future), data export request | Provide confirmation step for irreversible actions (account deletion → "Are you sure? This cannot be undone."); allow review before submit on payment | REQ-A11Y-46 |
| 4.1.1 | Robust | Parsing | A | All pages (HTML validity) | HTML must be valid: unique IDs, properly nested elements, no duplicate attributes; run HTML validator on key pages (song page, exercise session, auth forms) as part of Phase 18 audit 🔴 | REQ-A11Y-47 |
| 4.1.2 | Robust | Name, Role, Value | A | Star display component, FSRS tier badge, sentence order drag tokens, LearnCard accordion, exercise option buttons, kana trainer cells, upsell modal, cookie banner | All custom interactive components must expose accessible name, role, and value via ARIA; star display: `role="img" aria-label="3 stars"` or equivalent; drag tokens: `role="option"` with `aria-grabbed`; LearnCard accordion: `<button aria-expanded="true/false">`; kana trainer: `role="gridcell"` or `role="button"` per cell 🔴 | REQ-A11Y-48 |
| 4.1.3 | Robust | Status Messages | AA | Exercise session (correct/incorrect feedback), FSRS review (grading result), kana trainer (result), profile (save confirmation), cookie banner (accepted confirmation) | Status messages that don't receive focus must use `role="status"` (polite) or `role="alert"` (assertive) for screen reader announcement; exercise correct/incorrect feedback MUST use `role="alert"` so VoiceOver/NVDA announces immediately 🔴 | REQ-A11Y-49 |

**WCAG 2.1 AA checklist total: 50 rows (30 Level A + 20 Level AA). Every row has a REQ-A11Y-ID assigned.**

Items marked 🔴 (high-priority gaps): 01-note, 03, 07, 10, 12, 13b, 14, 16, 19, 20, 22, 26, 28, 32, 33, 37, 38, 47, 48, 49 — 20 high-priority items for Phase 18 immediate attention.

---

## 4.6 EAA Applicability (Lawyer-Flagged per CONTEXT)

### European Accessibility Act Overview

The European Accessibility Act (EAA), Directive (EU) 2019/882 of the European Parliament and of the Council on the accessibility requirements for products and services[^8], requires specified services to comply with WCAG 2.1 AA (or equivalent harmonized standard) from **28 June 2025**.

Services covered by the EAA include, among others: e-commerce services, banking services, transport services, audiovisual media services, and electronic communications.

### Applicability Question (Lawyer-Flagged)

🚩 LAWYER-REQUIRED {#lawyer-eaa-01} EAA applicability — is kitsubeat a "provider of an e-commerce service" under Directive (EU) 2019/882 Art. 2(3)? The EAA defines e-commerce services broadly as "any service provided at a distance, by electronic means and at the individual request of a consumer." kitsubeat's subscription/payment tier (Phase 19 onward) appears to satisfy this definition. However:

- Is the **free beta** (no e-commerce transaction) in scope? Directive Recital 28 suggests it covers "services for remuneration" — free-beta phase may be out of scope until payments activate.
- Does the **digital-educational-content** nature (language learning app) fall within a specific EAA category (audiovisual media? e-learning?) rather than e-commerce?
- If in scope: EAA requires publication of an Accessibility Statement, conformity documentation, and cooperation with market surveillance authorities — these are administrative obligations beyond the technical WCAG checklist.

**Implementation baseline (WCAG 2.1 AA per §4.5) is the same regardless of EAA applicability.** The §4.5 checklist should be implemented fully whether or not the EAA administrative obligations apply. The lawyer-flag is to determine whether the administrative obligations (Accessibility Statement publication, conformity assessment, market surveillance cooperation) attach.

Directive citation: Directive (EU) 2019/882 of the European Parliament and of the Council of 17 April 2019.[^8]

---

## 4.7 Section Rollup

### Obligation Counts

| Requirement category | Count | Notes |
|---------------------|-------|-------|
| REQ-AI-WHISPER-* | 4 | WhisperX AI-generated transcript disclosure |
| REQ-AI-LESSON-* | 6 | Claude-generated lesson content disclosure |
| REQ-AI-LITERACY-* | 2 | AI literacy SOP obligations (Art. 4) |
| **Total REQ-AI-*** | **12** | All must be implemented in Phase 18 |
| REQ-A11Y-* | 50 | WCAG 2.1 AA full checklist (30 Level A + 20 Level AA) |
| 🚩 {#lawyer-ai-01} | 1 | Machine-readable AI disclosure format (WhisperX + Art. 50(2) exception) |
| 🚩 {#lawyer-ai-02} | 1 | Provider vs. deployer classification (modified WhisperX pipeline) |
| 🚩 {#lawyer-ai-03} | 1 | Annex III high-risk re-check trigger (if formal certification added) |
| 🚩 {#lawyer-eaa-01} | 1 | EAA e-commerce applicability + administrative obligations |
| **Total 🚩 flags** | **4** | All indexed in Pre-Monetization Legal Review |

### What Phase 18 Must Ship for This Section

**AI Act disclosures (12 REQ-AI-* items):**
1. Add "AI transcript" badge to WhisperX-generated verse panels (REQ-AI-WHISPER-01, 02)
2. Add `data-ai-generated` DOM attributes to transcript containers (REQ-AI-WHISPER-03)
3. Add Privacy/AI Policy section disclosing WhisperX + Claude usage (REQ-AI-WHISPER-04, REQ-AI-LESSON-01)
4. Add "AI-assisted content" footer line on lesson panels (REQ-AI-LESSON-02)
5. Add AI disclosure to cookie/consent banner copy (REQ-AI-LESSON-03)
6. Add `data-ai-generated` attributes to Phase 08.3 mnemonics/kanji, Phase 08.4 LearnCards (REQ-AI-LESSON-04, 06)
7. Add Anthropic transparency link to AI Policy page (REQ-AI-LITERACY-01)
8. Update Song Ingestion SOP with AI-literacy acknowledgement step (REQ-AI-LITERACY-02)

**Accessibility (50 REQ-A11Y-* items — Phase 18 audit + implementation):**
1. Run accessibility audit against §4.5 checklist for all kitsubeat surfaces
2. Priority fixes (🔴 items): keyboard navigation, focus indicators, status messages, language-of-page attributes, ruby semantic markup, contrast ratios, orientation lock
3. Implement "Skip to main content" link on all pages
4. Implement `role="alert"` on exercise feedback messages
5. Add `lang="ja"` to all Japanese text spans
6. Add accessible names to all custom components (star display, kana cells, exercise options)
7. Implement `prefers-reduced-motion` for all animations

**Lawyer actions (4 🚩 flags — pre-monetization review):**
1. `{#lawyer-eaa-01}` — EAA applicability determination (before Phase 19/payments)
2. `{#lawyer-ai-01}` — Art. 50(2) exception + machine-readable format (before v3.0 launch)
3. `{#lawyer-ai-02}` — Provider vs. deployer classification (before v3.0 launch)
4. `{#lawyer-ai-03}` — Future trigger if formal certification added (ongoing)

---

## 4.8 Footnotes

[^1]: Regulation (EU) 2024/1689 of the European Parliament and of the Council of 13 June 2024 laying down harmonised rules on artificial intelligence and amending Regulations (EC) No 300/2008, (EU) No 167/2013, (EU) No 168/2013, (EU) 2018/858, (EU) 2018/1139 and (EU) 2019/2144 and Directives 2014/90/EU, (EU) 2016/797 and (EU) 2020/1828 (Artificial Intelligence Act). OJ L, 2024/1689, 12.7.2024. https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=OJ:L_2024_1689

[^2]: Regulation (EU) 2024/1689, Article 113 — "Entry into force and application." Phased application schedule: Art. 5 and 10 apply 6 months after entry into force; GPAI provisions apply 12 months after entry into force; most provisions apply 24 months after entry into force; Annex I and Annex III high-risk system provisions apply 36 months after entry into force.

[^3]: Regulation (EU) 2024/1689, Article 50 — "Transparency obligations for providers and deployers of certain AI systems." Art. 50(2): "Deployers of an AI system that generates or manipulates image, audio or video content constituting a deep fake shall disclose that the content has been artificially generated or manipulated. Deployers of an AI system that generates or manipulates text which is published with the purpose of informing the public on matters of public interest shall disclose that the text has been artificially generated or manipulated." Note: the "public interest" qualifier in Art. 50(1) applies to text specifically; lyric-learning content may not be "public interest" text in the political/news sense, but disclosure remains the defensible posture regardless. `🚩 LAWYER-REQUIRED {#lawyer-ai-01} — confirm whether Art. 50(2) "matters of public interest" qualifier applies to educational/cultural language-learning content or whether it applies only to political/news content.`

[^4]: EU AI Office — guidance on Art. 50 technical implementation of "marked format" for machine-readable AI disclosure. As of 2026-04-19, the EU AI Office has not published binding technical specifications for machine-readable disclosure under Art. 50(2). The C2PA (Coalition for Content Provenance and Authenticity) standard is the leading industry proposal. Monitor: https://www.c2pa.org and https://digital-strategy.ec.europa.eu/en/policies/ai-office

[^5]: Regulation (EU) 2024/1689, Article 53 — "Obligations for providers of general-purpose AI models." Applies to providers of GPAI models, including requirements to prepare technical documentation, copyright compliance summary, and training-data summary. Anthropic (as provider of Claude) is subject to Art. 53 obligations effective 2025-08-02.

[^6]: Regulation (EU) 2024/1689, Article 4 — "AI literacy." "Providers and deployers of AI systems shall take measures to ensure, to their best extent, a sufficient level of AI literacy of their staff and other persons dealing with the operation and use of AI systems on their behalf, having regard to their technical knowledge, experience, education and training and the context the AI systems are to be used in, and having regard to the persons or groups of persons on whom the AI systems are to be used." Effective 2025-02-02 per Art. 113.

[^7]: Regulation (EU) 2024/1689, Annex III §5 — "Education and vocational training": "(a) AI systems intended to be used for the purpose of determining access to or assigning persons to educational and vocational training institutions at all levels of education; (b) AI systems intended to be used for the purpose of assessing students in educational and vocational training institutions and for assessing participants in tests commonly required for admission to educational institutions or to obtain professional qualifications."

[^8]: Directive (EU) 2019/882 of the European Parliament and of the Council of 17 April 2019 on the accessibility requirements for products and services (European Accessibility Act). OJ L 151, 7.6.2019, p. 70–115. https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32019L0882. EAA Art. 2(3) on e-commerce services and Art. 32 on transposition deadline (28 June 2025 for member state compliance).

---

*Section 4 — EU AI Act + Accessibility — drafted 2026-04-19*
*REQ-AI-* IDs: 12 total (WHISPER-01–04, LESSON-01–06, LITERACY-01–02)*
*REQ-A11Y-* IDs: 50 total (REQ-A11Y-01 through REQ-A11Y-49, with REQ-A11Y-13b as supplementary)*
*🚩 Lawyer flags: 4 ({#lawyer-ai-01}, {#lawyer-ai-02}, {#lawyer-ai-03}, {#lawyer-eaa-01})*
*Authored independently in Wave 1 — for consolidation by Plan 17-06 Wave 2*
