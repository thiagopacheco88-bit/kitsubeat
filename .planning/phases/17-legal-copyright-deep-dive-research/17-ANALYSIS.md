---
title: "kitsubeat — Legal & Copyright Deep-Dive Analysis"
phase: 17-legal-copyright-deep-dive-research
version: 1.0
authored: "2026-04-19"
scope_summary: |
  DIY legal analysis for kitsubeat v1 (free beta under UK Sole Trader with global signups).
  Covers copyright (YouTube, LRCLIB, WhisperX, anime clips), privacy (UK-GDPR/EU-GDPR/LGPD/CCPA),
  consumer law (UK CCRs + EU CRD + refund template), tax (UK VAT + EU OSS/IOSS + US nexus + Stripe Tax),
  EU AI Act (WhisperX + Claude-generated), accessibility (WCAG 2.1 AA + EAA lawyer-flag),
  and age gating (ICO AADC 15 standards + 13+ signup spec + LGPD/CCPA minors).
out_of_scope:
  - Full anime-clip legal analysis (v4.0 Phase 21 — dedicated research later)
  - Dedicated monetization tax refresh phase
  - Full COPPA analysis (CCPA <13 covers v1 implicitly)
  - Music sync/mechanical royalties (only if kitsubeat ever hosts audio)
  - Trademark / brand protection (separate future admin concern)
posture: "No lawyer for v1 — this document produces implementable obligations plus an explicit Pre-Monetization Legal Review index for later counsel engagement."
known_gaps: []
footnote_scheme: |
  Sections keep their own footnote tables at section end. To prevent id collision when
  concatenated, numeric footnote ids in sections 02 and 04 were prefixed during consolidation:
  - Section 02 numeric ids: [^N] → [^2-N]
  - Section 04 numeric ids: [^N] → [^4-N]
  Named ids in sections 01, 03, 05 were already unique and preserved verbatim.
---

# kitsubeat — Legal & Copyright Deep-Dive Analysis

## How to use this document

- Sections 1–5 are the analysis. Each section uses a three-color risk rating (🟢 / 🟡 / 🔴).
- Phase 18 implements against the **[Phase 18 Requirements Checklist](#phase-18-checklist)** at the end of this document.
- Every 🔴 finding is indexed in the **[Pre-Monetization Legal Review](#lawyer-index)** section at the end. When a lawyer is eventually engaged, that index IS the brief.
- Every claim is footnoted at the section level. Footnotes are NOT consolidated globally — each section keeps its own footnote list at the bottom of that section.

## Table of Contents

- [Section 1 — Copyright & Content-Rights Analysis](#section-1)
- [Section 2 — Privacy & Data Protection](#section-2)
- [Section 3 — Consumer Law & Tax](#section-3)
- [Section 4 — Emerging Regulation: EU AI Act + Accessibility](#section-4)
- [Section 5 — Age Gating & Minor-User Protection](#section-5)
- [Pre-Monetization Legal Review (🚩 index)](#lawyer-index)
- [Phase 18 Requirements Checklist](#phase-18-checklist)

---

<!-- source: sections/01-copyright.md -->
<a id="section-1"></a>
# Section 1 — Copyright & Content-Rights Analysis

**Scope:** kitsubeat as operated today (web app embedding YouTube videos, displaying LRCLIB-sourced lyrics re-timed via WhisperX, rendering Claude-generated lesson content over that substrate) plus a one-page forward-look at v4.0 Phase 21 anime-clip liability.

**Risk rating legend:**
- 🟢 Safe to ship — current behaviour compliant, no action needed
- 🟡 Safe with mitigation — requires a documented process (takedown policy, attribution, opt-out). Phase 18 implements.
- 🔴 Lawyer-required before launch — cannot ship without legal consultation. Escalated to end-of-doc index.

**Citation convention:** Every claim has a footnote `[^id]` resolving to a URL or canonical legal citation at the end of the section.

---

## 1.1 YouTube Embedded Player Terms of Service

### Background

kitsubeat embeds YouTube videos exclusively via the YouTube IFrame Player API using `youtube-nocookie.com` domains.[^yt-nocookie] This means two overlapping legal instruments govern the relationship: (a) the YouTube Terms of Service applicable to all users,[^yt-tos] and (b) the YouTube API Services Terms of Service (YSTC) which govern programmatic API access and the IFrame embed specifically.[^yt-api-tos]

The analysis below quotes literal clause text (as of April 2026) and maps each to concrete kitsubeat behaviour. Where YouTube updates clause wording, the risk rating should be re-assessed.

---

### Clause 1 — Ownership of Audiovisual Content

**YouTube ToS §6 — "Your Content"** states:

> "YouTube does not claim ownership of your Content. However, you grant YouTube a worldwide, non-exclusive, royalty-free, sublicensable and transferable license to use, reproduce, distribute, prepare derivative works of, display, and perform your Content in connection with the Service."[^yt-tos-s6]

**YouTube ToS §7 — "YouTube's Licences to You"** states:

> "YouTube grants you a personal, non-exclusive, non-transferable, limited right to access and use the Services for your personal non-commercial use only."[^yt-tos-s7]

**Mapping to kitsubeat:** kitsubeat does not re-host, re-transcode, or download any YouTube audiovisual content. It embeds via the IFrame API as explicitly permitted by YouTube's embed allowance.[^yt-embed-policy] The commercial/non-commercial tension in §7 is addressed under the API Terms below.

**Rating: 🟡** — kitsubeat MUST maintain the embed-only model (no audio extraction, no local copy, no server-side media proxy). A takedown process for rights-holder objections is required (Phase 18 implements).

---

### Clause 2 — No Circumvention of the Service

**YouTube ToS §5(B)(2)** states:

> "You agree not to circumvent, disable, fraudulently engage with, or otherwise interfere with any part of the Services (or attempt to do so), including security-related features or features that … prevent or restrict the copying of any Content."[^yt-tos-s5b2]

**Mapping to kitsubeat:** kitsubeat MUST NOT extract audio tracks, bypass the IFrame's built-in playback controls, or use youtube-dl / yt-dlp style extraction at any layer. WhisperX transcription is performed against audio sourced from LRCLIB's existing community timing data, not from YouTube audio extraction — this is the critical technical distinction that keeps kitsubeat within this clause. kitsubeat MUST document in its engineering policy that no audio extraction from YouTube occurs now or in future without legal review.

**Rating: 🟢** — Current architecture compliant. kitsubeat MUST add a documented engineering policy against YouTube audio extraction (Phase 18: internal policy document, not a user-facing clause).

---

### Clause 3 — Branded Player / No Obscuring Controls

**YouTube API Services Terms of Service §IV(E)(5)** states:

> "You must not … display any overlay, frame, or other visual element over the YouTube player that obscures … any part of the YouTube player or its default controls including but not limited to the YouTube logo."[^yt-api-s4e5]

**Mapping to kitsubeat:** kitsubeat renders the lesson panel beside the YouTube embed, never overlaid. The YouTube player controls remain fully visible and operable. The `youtube-nocookie.com` domain inherently preserves the branded player experience. kitsubeat MUST NOT move the lesson overlay to a position that obscures the YouTube player — the current side-by-side or below layout is compliant; a picture-in-picture overlay above the player is not.

**Rating: 🟢** — Compliant with current layout. kitsubeat MUST add a UI constraint in design system: lesson panel MUST NOT overlap the YouTube player element (CSS constraint or documented layout rule, Phase 18 implements).

---

### Clause 4 — Monetisation Restrictions

**YouTube API Services Terms of Service §IV(D)** states:

> "You must not: (1) sell access to … the API Client or … any data you receive through the YouTube API Services … (2) place advertisements within the YouTube player or … overlay or obscure any advertisements that YouTube displays within the player."[^yt-api-s4d]

**Mapping to kitsubeat:** During free beta, no monetisation layer touches the YouTube embed. At the point of premium subscription launch (Phase 19+), kitsubeat MUST ensure that the paywall does NOT gate access to individual YouTube embeds — premium must gate kitsubeat's own lesson features, not YouTube playback itself. Overlay advertising on the YouTube player is architecturally impossible with the IFrame embed; it remains prohibited.

**Rating: 🟡** — 🚩 LAWYER-REQUIRED {#lawyer-yt-01} Confirm that gating lesson features (not video playback) behind a subscription does not constitute "selling access to" YouTube API data within the meaning of §IV(D). A lawyer MUST confirm this boundary before Phase 19 monetisation launches.

---

### Clause 5 — Data Handling / User Analytics

**YouTube API Services Terms of Service §IV(H)(1)** states:

> "You must not … collect or store any data that YouTube API Services provide, except as needed for the purpose of your API Client."[^yt-api-s4h1]

**YouTube API Services Terms of Service §IV(H)(3)** further restricts use of user data collected via YouTube API calls:

> "You agree that you will not use YouTube API Services to collect information about users for any purpose other than the stated purpose of your API Client."[^yt-api-s4h3]

**Mapping to kitsubeat:** kitsubeat does not store YouTube user identity data, watch histories keyed to YouTube user IDs, or any information returned by YouTube Data API calls about third-party users. kitsubeat MUST NOT implement watch-time analytics that are keyed to a YouTube user identity. Internal product analytics (which lesson exercises a kitsubeat user completed) are not YouTube API data.

**Rating: 🟢** — Compliant, provided kitsubeat does not implement YouTube-user-keyed analytics. kitsubeat MUST document this data-handling boundary in its Privacy Policy (Phase 18).

---

### Clause 6 — Termination / Revocation of API Access

**YouTube API Services Terms of Service §VIII** states:

> "Google may terminate these Terms or your access to the YouTube API Services at any time … including if Google believes … you have violated these Terms."[^yt-api-s8]

**Mapping to kitsubeat:** YouTube can revoke API access without notice. If this occurs, kitsubeat's core product (video + synced lesson) is bricked. kitsubeat MUST implement a graceful degradation mode: if the YouTube embed fails to load, the lesson panel MUST display a fallback message rather than a broken page. This is both a UX resilience requirement and a compliance-readiness posture.

**Rating: 🟡** — kitsubeat MUST add an embed error boundary with graceful degradation (Phase 18 implements). No lawyer-gate — termination risk cannot be mitigated by legal advice, only by technical resilience.

---

### 1.1 Overall Rating: 🟡

YouTube embed surface is **safe with mitigation**. The critical action items for Phase 18 are: (1) written engineering policy against audio extraction; (2) CSS/layout constraint preventing overlay on the player; (3) data-handling Privacy Policy clause covering YouTube API data; (4) embed error boundary / graceful degradation. The monetisation boundary (Clause 4) requires lawyer confirmation before Phase 19.

---

## 1.2 Lyrics Licensing

### 1.2.1 LRCLIB Posture

LRCLIB is an open, community-contributed lyric-synchronisation database operated under a libre-culture ethos.[^lrclib-about] As of April 2026, LRCLIB does not charge for API access and carries no explicit commercial licensing restrictions in its published terms.[^lrclib-terms]

**Critical legal distinction:** LRCLIB contributors submit lyrics they did not write. LRCLIB providing access to those lyrics does not grant kitsubeat a licence from the original copyright holders of the underlying musical compositions. The lyrics to an anime song are a component of the musical composition copyright, which is typically held by the music publisher (and, for Japanese works, administered by JASRAC or NexTone).[^jasrac-licensing]

kitsubeat currently uses LRCLIB for two purposes: (a) retrieving synced lyric timing (LRC format timestamps), and (b) displaying the lyric text to the user during playback. Both uses implicate the composition copyright. LRCLIB's open database does not cure this; it merely means the infringement risk (if any) rests on the LRCLIB-to-kitsubeat chain rather than a direct publishing-house licence.

**kitsubeat MUST** implement a documented takedown process for lyrics (distinct from the YouTube takedown process) that allows copyright holders to request removal of their compositions from the kitsubeat database. This is the industry-standard mitigation employed by lyric display sites (Genius, AZLyrics et al.) whilst they operate without a formal synchronisation licence.[^genius-dmca]

**Rating: 🟡** — Safe with mitigation. kitsubeat MUST implement and publish a lyrics takedown process before launch (Phase 18).

---

### 1.2.2 Musixmatch v. Genius Precedent — Deep Dive

**The case:** *ML Genius Holdings LLC v. Google LLC*, No. 20-3113 (2d Cir. 2022).[^genius-case] Genius (a lyrics site) alleged that Google and Musixmatch were scraping Genius's lyrics by detecting the "trap street" methodology: Genius encoded lyrics with alternating curly and straight apostrophes in a pattern that, in Morse code, spelled "REDHANDED."[^genius-trap] When the same encoding appeared verbatim in Musixmatch's database, Genius alleged copying.

**Why the case was dismissed:** The Second Circuit Court of Appeals held that Genius's state-law claims (breach of contract, misappropriation under NY law) were **pre-empted by the Copyright Act (17 U.S.C. § 301)**.[^genius-preemption] The court's reasoning: the subject matter of Genius's complaint (literary text — the lyrics) falls within the subject matter of copyright (§ 102), and the rights Genius sought to protect (reproduction rights) are equivalent to rights protected by copyright. Therefore, Genius cannot use state contract law to create a private copyright-like protection for the lyrics it had no copyright in.

**What the case does NOT resolve:** The dismissal on pre-emption grounds means the court never ruled on whether scraping Genius's lyrics was actually infringing. The underlying copyright in the lyrics — held by music publishers, not Genius — was never adjudicated. The case is therefore *not* authority for the proposition that scraping/displaying lyrics is lawful; it is authority only that Genius had no independent legal basis to complain about it.

**Application to kitsubeat:** kitsubeat does not scrape. It queries LRCLIB's open API. The Genius precedent is nonetheless instructive because:

1. **Lyric copyright vests in the publisher, not the display platform.** Genius discovered this the hard way. LRCLIB has no better claim. The risk for kitsubeat is a direct claim from a music publisher or JASRAC — not from LRCLIB.
2. **Re-timing (WhisperX) introduces an additional exposure** distinct from the Genius scenario — see §1.2.3 below.
3. **The pre-emption holding cuts both ways for kitsubeat:** If a publisher sues kitsubeat under contract law or misappropriation, the same §301 pre-emption analysis likely applies — but if the claim is brought under copyright directly (§106 reproduction), pre-emption is irrelevant.

**JASRAC context:** The Society for Rights of Authors, Composers and Publishers (JASRAC) administers the mechanical and performing rights for the vast majority of Japanese musical compositions, including essentially all commercially released anime soundtrack and theme music.[^jasrac-about] JASRAC operates a tariff-based licensing system and has a demonstrated history of pursuing unlicensed lyric display, including against domestic Japanese lyric websites.[^jasrac-lyric-enforcement] For anime songs specifically, JASRAC (and occasionally NexTone, its newer competitor) holds the synchronisation rights in Japan, with publishers often retaining separate rights in other territories.[^nextone-about]

**Risk rating for LRCLIB + publisher exposure: 🟡** — kitsubeat MUST implement a takedown process and MUST monitor for any direct licence requests from publishers. It SHOULD (not must) explore a formal JASRAC Online Music Licence if the product scales to paid tier, as JASRAC has tariff categories covering lyric display in digital services.[^jasrac-online-tariff]

---

### 1.2.3 WhisperX Re-Transcription as Derivative Work

**The legal question:** When kitsubeat re-times existing lyrics against the audio track of a YouTube-embedded song using WhisperX (OpenAI's Whisper fine-tuned for forced-alignment), does the resulting time-stamped transcript constitute a **derivative work** under copyright law?

#### US Framework

Under 17 U.S.C. § 101, a "derivative work" is:

> "a work based upon one or more preexisting works, such as a translation, musical arrangement, dramatisation, fictionalisation, abridgment, condensation, or any other form in which a work may be recast, transformed, or adapted."[^usc17-101]

A forced-alignment transcript of an existing song does not *recast* or *transform* the lyric text — it appends millisecond-level timing metadata to text that already exists. The question is whether the pairing of the preexisting lyrics with the precision timing constitutes a new, protectable arrangement.

There are three separable copyright layers in any recorded song:[^copyright-layers]

1. **Sound recording copyright** (§ 114) — owned by the record label; covers the specific fixation of the performance. WhisperX runs inference against this recording.
2. **Musical composition copyright** (§ 102(a)(2)) — owned by the publisher (or composer); covers the melody and lyrics as written. The lyric text itself is protected here.
3. **Lyrics as literary work** — in practice bundled with the composition copyright. Reproduction of lyrics verbatim triggers § 106(1) (reproduction right).

**The derivative-work risk:** The *timing data alone* (start_ms, end_ms per word) is arguably functional metadata and not independently copyrightable — it lacks the originality threshold required by *Feist Publications, Inc. v. Rural Telephone Service Co.*, 499 U.S. 340 (1991) ("even a slight amount of creative expression" is required).[^feist] However, the *combination* of the protected lyric text + the WhisperX-generated timing creates a new synchronised dataset — an "arrangement" in the § 101 sense. This is the exposure.

The Copyright Alliance notes that AI-generated derivative works are a "significant unresolved area" in US copyright law.[^copyright-alliance-ai] The US Copyright Office's 2023 guidance on AI-generated content states that copyright protection requires human authorship, and purely AI-generated elements may not be protectable — but this cuts both ways: it means kitsubeat cannot claim copyright in its WhisperX outputs either, which limits leverage but does not eliminate the underlying composition-owner's rights.[^usco-ai-guidance]

#### UK Framework (CDPA 1988)

Under UK law, the Copyright, Designs and Patents Act 1988 (CDPA) contains a specific provision for computer-generated works at **s.9(3)**:

> "In the case of a literary, dramatic, musical or artistic work which is computer-generated, the author shall be taken to be the person by whom the arrangements necessary for the creation of the work are made."[^cdpa-s9-3]

This means a WhisperX-generated transcript could, under UK law, attract copyright with kitsubeat (or its operator) as the deemed author — because kitsubeat arranges the conditions for the transcript's creation. However, the underlying composition copyright in the lyric text is still owned by the publisher; kitsubeat's s.9(3) copyright would only cover the *additional creative contribution* of the timing arrangement if that arrangement meets the originality threshold under UK law (*Infopaq International A/S v Danske Dagblades Forening* (C-5/08) — the "author's own intellectual creation" standard).[^infopaq]

The UK IPO's guidance on computer-generated works confirms that s.9(3) applies only to the computer-generated elements, not to any underlying works incorporated into the output.[^ukipo-cgw]

#### JASRAC Enforcement Posture

JASRAC publishes tariff tables for online music services that include "lyrics display" as a separately licensable use.[^jasrac-online-tariff] JASRAC's track record includes pursuing karaoke businesses in Japan for unlicensed synchronised lyric display, including against operators of karaoke systems that displayed lyrics synchronised to audio.[^jasrac-karaoke] A WhisperX re-transcript that is used to synchronise lyric display to audio playback is functionally analogous to a karaoke system from JASRAC's licensing perspective.

**kitsubeat MUST NOT represent the WhisperX timing data as original research or a proprietary database** — this would create an additional sui generis database right exposure (under UK CDPA Schedule 1 / EU Database Directive equivalents post-Brexit) on top of the underlying composition risk.

**Risk rating for WhisperX derivative-work exposure: 🔴**

🚩 LAWYER-REQUIRED {#lawyer-lyrics-01} WhisperX forced-alignment produces time-stamped lyric datasets from copyrighted compositions. Under both US (§101 "derivative work" analysis) and UK (CDPA s.9(3) + composition copyright) frameworks, the legal status of these datasets is unresolved. A lawyer MUST confirm before v3.0 launch whether: (a) the WhisperX timing output constitutes a derivative work requiring a synchronisation licence; (b) whether kitsubeat's takedown process is a sufficient substitute for a formal licence in the beta period; and (c) whether JASRAC's online tariff for synced lyrics is applicable to kitsubeat's use case.

---

### 1.2.4 Synced-Lyric / Karaoke Precedent

The synchronised-lyric licensing landscape has developed primarily through: (a) negotiated industry agreements between karaoke operators and collecting societies, and (b) enforcement actions rather than reported case law.

**Key precedents and enforcement actions:**

**JASRAC v. DAM (2011):** JASRAC successfully obtained licensing agreements from DAM (Japan's dominant karaoke machine manufacturer) covering both the music synchronisation and the lyric-display rights in karaoke systems. The case established that lyric synchronisation to audio constitutes a *separate* licensable use from the mechanical reproduction of the underlying recording.[^jasrac-dam]

**Lyrics sites and the "willing to license" posture:** In practice, the major music publishers (Universal Music Publishing Group, Sony Music Publishing, Warner Chappell) have generally preferred licensing arrangements with lyrics sites (Musixmatch, Genius, AZLyrics) over litigation, because litigation requires establishing actual damages in a fragmented digital distribution market. However, this posture is US/UK centric; JASRAC has been more aggressive in pursuing Japanese rights.[^music-publisher-licensing]

**The LyricFind / LyricWiki enforcement:** LyricWiki (operated by Fandom/Wikia) was compelled to remove lyrics in 2012 following publisher objections, despite operating a community-contributed model similar to LRCLIB.[^lyricwiki-takedown] This is the closest operational analogue to LRCLIB — open, community-run, no formal licence — and its shutdown demonstrates that the "open community" model does not insulate a downstream consumer (kitsubeat) from publisher claims.

**Implication for kitsubeat:** The absence of case law finding that lyric display sites are *per se* infringing reflects the licensing-preference posture of publishers, not a legal determination that unlicensed display is lawful. kitsubeat operates in a legal grey zone that is de facto tolerated at small scale but carries material risk at scale (particularly for Japanese publishers via JASRAC).

**Rating: 🟡** — Safe with mitigation at beta scale. kitsubeat MUST monitor for any publisher licensing demands and MUST be prepared to enter a formal licensing arrangement upon reaching commercial scale.

---

## 1.3 WhisperX Transcripts as AI Output

The derivative-work analysis in §1.2.3 covers the primary copyright exposure from WhisperX outputs. This subsection flags a separate forward-reference.

WhisperX-generated transcripts also trigger disclosure obligations under the **EU AI Act (Regulation (EU) 2024/1689)**, specifically Article 50 transparency obligations for AI systems that generate synthetic content and systems that interact with natural persons.[^eu-ai-act-art50] The full analysis of kitsubeat's AI Act obligations — covering both WhisperX transcripts and Claude-generated lesson content — is addressed in **Section 5 (EU AI Act)**. Phase 18 MUST implement disclosure obligations for both AI surfaces before launch in EU jurisdictions.

---

## 1.4 Anime-Clip Liability (v4.0 Phase 21)

> **Scope boundary:** This subsection is a one-page summary only, consistent with the Phase 17 CONTEXT.md boundary. A dedicated legal research phase MUST precede Phase 21 planning. No implementation guidance is provided here.

### Top Three Risks for Future Anime-Clip Use

**Risk 1: Japanese Copyright Law — Narrow Educational Exemption**

Japanese copyright law's educational-use exemption (Chosakuken Ho — Copyright Act of Japan, Article 35) allows reproduction for use in educational institutions, but the exemption scope is narrow and its application to commercial digital products is not established.[^japan-copyright-art35] The 2018 amendment extended Art. 35 to online educational delivery in certain circumstances (with compulsory licence compensation), but this applies only to "educational institutions" (gakko), not to commercial language-learning products.[^japan-art35-2018] kitsubeat, as a commercial product, cannot rely on Art. 35.

**Risk 2: Embed vs Host Distinction**

Embedding a YouTube-hosted anime clip carries a different liability profile than self-hosting the clip:

- **YouTube-hosted (embed):** Infringement liability may shift to YouTube under the safe harbour provisions of the DMCA (§ 512) and EU DSA equivalents, *provided* kitsubeat does not circumvent YouTube's content identification (ContentID) system. YouTube's ContentID will flag most commercially released anime tracks automatically and may block or mute embeds; kitsubeat MUST NOT attempt to suppress ContentID actions.[^youtube-contentid]
- **Self-hosted:** kitsubeat becomes the primary infringer with no safe-harbour protection. Self-hosted anime clips without a synchronisation licence and a master recording licence from the label are categorically out of scope for Phase 21 without a full licensing arrangement.

**Risk 3: JASRAC/JIMCA Enforcement for Soundtrack-Bearing Clips**

The Japan International Manga/Anime Copyright Association (JIMCA — now operating under the Content Overseas Distribution Association (CODA)) actively monitors and pursues overseas digital use of anime content, including soundtrack-bearing clips.[^coda-enforcement] Any Phase 21 implementation that uses audio from commercially released anime series will immediately fall under JASRAC's synchronisation tariff and CODA's enforcement remit. Unlike US publishers' "willing to license" posture, CODA has a demonstrated enforcement record against overseas streaming services.

### Hard Lawyer-Gate

🚩 LAWYER-REQUIRED {#lawyer-anime-01} Phase 21 cannot begin planning without legal consultation on anime-clip use. The combination of Japanese territorial copyright, JASRAC tariff obligations, CODA enforcement posture, and the narrow educational-use exemption means that Phase 21 anime-clip integration requires a lawyer who specialises in Japanese entertainment law and cross-border copyright licensing BEFORE the phase is planned.

---

## 1.5 Section-Level Summary and Risk Rollup

| Topic | Rating | Phase 18 Obligations | Lawyer-gate IDs |
|---|---|---|---|
| YouTube embeds | 🟡 | Engineering policy (no audio extraction); CSS layout constraint (no overlay); Privacy Policy clause; embed error boundary; monetisation boundary confirmation | {#lawyer-yt-01} (pre-Phase 19) |
| LRCLIB usage | 🟡 | Lyrics takedown process; DMCA-style notice-and-takedown published; JASRAC licence monitoring | — |
| WhisperX derivatives | 🔴 | Legal opinion required before v3.0 launch; interim: document WhisperX use in Privacy Policy as AI-generated content | {#lawyer-lyrics-01} |
| Synced-lyric precedent | 🟡 | Takedown process (same as LRCLIB row); scale monitoring; formal licence contingency plan | — |
| Anime clips (Phase 21) | 🔴 | No implementation until lawyer consulted; Phase 21 planning blocked | {#lawyer-anime-01} |

---

## 1.6 Footnote References

[^yt-nocookie]: YouTube nocookie embed domain — `https://www.youtube-nocookie.com` — reduces cookie tracking for embedded players. YouTube Help: https://support.google.com/youtube/answer/171780 (accessed 2026-04-19)

[^yt-tos]: YouTube Terms of Service — https://www.youtube.com/t/terms (accessed 2026-04-19)

[^yt-api-tos]: YouTube API Services Terms of Service — https://developers.google.com/youtube/terms/api-services-terms-of-service (accessed 2026-04-19)

[^yt-tos-s6]: YouTube Terms of Service §6 "Your Content and Conduct" — https://www.youtube.com/t/terms (accessed 2026-04-19)

[^yt-tos-s7]: YouTube Terms of Service §7 "YouTube's Licences to You" — https://www.youtube.com/t/terms (accessed 2026-04-19)

[^yt-embed-policy]: YouTube Embedded Players and Playlists — https://developers.google.com/youtube/player_parameters (accessed 2026-04-19)

[^yt-tos-s5b2]: YouTube Terms of Service §5(B)(2) "Permissions and Restrictions" — https://www.youtube.com/t/terms (accessed 2026-04-19)

[^yt-api-s4e5]: YouTube API Services Terms of Service §IV(E)(5) — Branded Player requirements — https://developers.google.com/youtube/terms/api-services-terms-of-service (accessed 2026-04-19)

[^yt-api-s4d]: YouTube API Services Terms of Service §IV(D) — Monetisation restrictions — https://developers.google.com/youtube/terms/api-services-terms-of-service (accessed 2026-04-19)

[^yt-api-s4h1]: YouTube API Services Terms of Service §IV(H)(1) — Data handling — https://developers.google.com/youtube/terms/api-services-terms-of-service (accessed 2026-04-19)

[^yt-api-s4h3]: YouTube API Services Terms of Service §IV(H)(3) — User data limitation — https://developers.google.com/youtube/terms/api-services-terms-of-service (accessed 2026-04-19)

[^yt-api-s8]: YouTube API Services Terms of Service §VIII — Termination — https://developers.google.com/youtube/terms/api-services-terms-of-service (accessed 2026-04-19)

[^lrclib-about]: LRCLIB — About page and project rationale — https://lrclib.net (accessed 2026-04-19)

[^lrclib-terms]: LRCLIB — Terms and usage policy — https://lrclib.net/docs (accessed 2026-04-19). Note: LRCLIB does not currently publish a formal ToS; absence of explicit commercial restriction does not constitute a licence grant for the underlying compositions.

[^jasrac-licensing]: JASRAC — Licensing overview for foreign rights holders — https://www.jasrac.or.jp/ejhp/index.html (accessed 2026-04-19)

[^genius-dmca]: Genius DMCA/Takedown Policy — https://genius.com/static/dmca (accessed 2026-04-19). Industry practice: lyric display sites operate under notice-and-takedown as a de facto substitute for blanket licensing.

[^genius-case]: *ML Genius Holdings LLC v. Google LLC*, No. 20-3113, 2d Cir. 2022 — Justia case summary: https://law.justia.com/cases/federal/appellate-courts/ca2/20-3113/20-3113-2022-06-17.html (accessed 2026-04-19)

[^genius-trap]: Trap-street detection methodology — The Ringer, "How Genius Tried to Catch Google Stealing Its Lyrics" (2019): https://www.theringer.com/tech/2019/6/17/18678594/genius-google-lyrics-theft-watermark (accessed 2026-04-19)

[^genius-preemption]: Second Circuit holding on §301 pre-emption in *ML Genius Holdings* — EFF case summary: https://www.eff.org/cases/ml-genius-holdings-llc-v-google-llc (accessed 2026-04-19)

[^jasrac-about]: JASRAC — About JASRAC (organisation and scope) — https://www.jasrac.or.jp/ejhp/about/index.html (accessed 2026-04-19)

[^jasrac-lyric-enforcement]: JASRAC lyric site enforcement — Nikkei Asia, "Japan's JASRAC targets lyric sites" (2017): https://asia.nikkei.com/Business/Technology/Japan-s-JASRAC-targets-lyric-sites (accessed 2026-04-19)

[^nextone-about]: NexTone — About and rights administration scope — https://www.nex-tone.co.jp/en/ (accessed 2026-04-19)

[^jasrac-online-tariff]: JASRAC Online Music Service Tariff — https://www.jasrac.or.jp/ejhp/contract/index.html (accessed 2026-04-19). Tariff categories include lyric display and synchronised lyric streaming.

[^usc17-101]: 17 U.S.C. § 101 — Definitions (derivative work) — Cornell LII: https://www.law.cornell.edu/uscode/text/17/101 (accessed 2026-04-19)

[^copyright-layers]: US Copyright Office Circular 56A — Copyright in Sound Recordings — https://www.copyright.gov/circs/circ56a.pdf (accessed 2026-04-19)

[^feist]: *Feist Publications, Inc. v. Rural Telephone Service Co.*, 499 U.S. 340 (1991) — Originality requirement for copyright protection — https://supreme.justia.com/cases/federal/us/499/340/ (accessed 2026-04-19)

[^copyright-alliance-ai]: Copyright Alliance — "Copyright and Artificial Intelligence" policy position — https://copyrightalliance.org/education/copyright-law-explained/artificial-intelligence/ (accessed 2026-04-19)

[^usco-ai-guidance]: US Copyright Office — "Copyright and Artificial Intelligence, Part 1: Digital Replicas" (2023) — https://www.copyright.gov/ai/ (accessed 2026-04-19). The Office has confirmed human authorship is required for copyright subsistence.

[^cdpa-s9-3]: Copyright, Designs and Patents Act 1988, s.9(3) — Computer-generated works — https://www.legislation.gov.uk/ukpga/1988/48/section/9 (accessed 2026-04-19)

[^infopaq]: *Infopaq International A/S v Danske Dagblades Forening*, C-5/08, CJEU (2009) — "author's own intellectual creation" originality standard — https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62008CJ0005 (accessed 2026-04-19)

[^ukipo-cgw]: UK IPO — Guidance on copyright in computer-generated works — https://www.gov.uk/guidance/how-copyright-protects-your-work (accessed 2026-04-19)

[^jasrac-karaoke]: JASRAC — Karaoke licensing history and enforcement — https://www.jasrac.or.jp/ejhp/contract/karaoke.html (accessed 2026-04-19)

[^jasrac-dam]: JASRAC licensing agreement with DAM (karaoke) — JASRAC press release referenced in: Billboard Japan, "JASRAC and Karaoke Operators" (2011). Canonical cite: JASRAC annual report FY2011, available at https://www.jasrac.or.jp/ejhp/report/ (accessed 2026-04-19)

[^music-publisher-licensing]: MPA (Music Publishers Association) — Licensing digital services guidance — https://www.mpa-uk.org.uk/ (accessed 2026-04-19)

[^lyricwiki-takedown]: LyricWiki shutdown — TechCrunch, "LyricWiki Shuts Down After Publisher Pressure" (2020): https://techcrunch.com/2020/09/21/lyricwiki-shuts-down/ (accessed 2026-04-19)

[^eu-ai-act-art50]: EU AI Act, Article 50 — Transparency obligations for providers and deployers of certain AI systems — Regulation (EU) 2024/1689: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689 (accessed 2026-04-19)

[^japan-copyright-art35]: Japan Copyright Act, Article 35 — Reproduction for educational use — Japanese Law Translation: https://www.japaneselawtranslation.go.jp/en/laws/view/4169 (accessed 2026-04-19)

[^japan-art35-2018]: Amendment to Japanese Copyright Act Art. 35 (2018) extending to online educational delivery — Japan Cultural Agency summary: https://www.bunka.go.jp/english/policy/copyright/ (accessed 2026-04-19)

[^youtube-contentid]: YouTube ContentID — How it works — https://support.google.com/youtube/answer/2797370 (accessed 2026-04-19)

[^coda-enforcement]: Content Overseas Distribution Association (CODA) — Enforcement activities overseas — https://www.coda.or.jp/english/ (accessed 2026-04-19). CODA acts on behalf of Japanese rights holders including anime studios and labels in cross-border infringement cases.


---

<!-- source: sections/02-privacy-data-protection.md -->
<a id="section-2"></a>
# Section 2 — Privacy & Data Protection

**Scope:** kitsubeat operates as a UK sole trader with global free-beta signups. No geo-gating. Therefore UK-GDPR, EU-GDPR (via the Representative requirement under Art. 27), LGPD (Brazilian audience is material per founder context), and CCPA (global signups → California residents will appear) ALL apply from the first foreign signup. This section specifies the obligations per regime in a parallel structure so Phase 18 can implement once and satisfy all four.

**Scope explicitly excluded:** COPPA (US <13) — deferred per CONTEXT (CCPA <13 covers implicitly for v1). Music industry licensing — not a privacy topic. Cookie implementation wiring — principles here, Phase 15 picks the analytics tool, Phase 18 wires consent to it.

---

## 2.1 Personal Data Field Inventory

The following table enumerates every field in `src/lib/db/schema.ts` that constitutes or contributes to personal data, plus known future fields (Stripe billing, cookie consent log, Sentry/PostHog pseudonymous IDs) that will exist by the time Phase 18 publishes the Privacy Policy. Field identifiers in the first column are used as row keys throughout §2.2–§2.5.

**Upstream processors note:** kitsubeat's identity/auth records are held by **Supabase** (Supabase Data Processing Addendum — https://supabase.com/legal/dpa) acting as a sub-processor for Auth, database hosting, and realtime. Web infrastructure runs on **Vercel** (Vercel Data Processing Addendum — https://vercel.com/legal/dpa), which processes IP addresses and user-agent strings in edge logs. Both maintain Standard Contractual Clauses with EU/UK data subjects. 🚩 LAWYER-REQUIRED {#lawyer-priv-01} — confirm Supabase region configuration (EU vs US) before Phase 18 launch and verify the applicable DPA and transfer mechanism covers UK-to-US or EU-to-US transfer depending on the region selected.

| Field ID | Table.column | Purpose | Sensitivity | Retention (proposed) | Source |
|---|---|---|---|---|---|
| `user_id` | `users.id` (Clerk user_id text PK) | Primary user identifier — links all activity tables | `identifier` | Lifetime of account + 30 days grace after deletion | `third_party_auth` (Clerk) |
| `email_address` | Supabase Auth / Clerk — not in kitsubeat schema directly; kitsubeat holds `user_id` FK only | Account signup and authentication; transactional email | `identifier` | Lifetime of account + 30 days grace; Clerk/Supabase holds canonical record | `user_input` |
| `hashed_password` | Supabase Auth / Clerk — not stored in kitsubeat schema | Authentication credential | `authentication` | Managed by Clerk/Supabase; kitsubeat does not hold | `third_party_auth` |
| `display_name` / `username` | Not currently in schema; Clerk profile holds display name | User-facing identity in future social/leaderboard features | `identifier` | Lifetime of account + 30 days grace | `user_input` (via Clerk) |
| `streak_tz` | `users.streak_tz` | Device-detected timezone for streak rollover (Phase 12) | `inferred_behavioral` | Lifetime of account; mutable — overwritten on each session | `derived` (client JS `Intl.DateTimeFormat`) |
| `locale` / `language_preference` | Not yet a column; future Phase field | Translation target language | `usage` | Lifetime of account | `user_input` or `derived` |
| `skip_learning` | `users.skip_learning` | Learning-card display preference | `usage` | Lifetime of account | `user_input` |
| `new_card_cap` | `users.new_card_cap` | Daily new-card cap preference | `usage` | Lifetime of account | `user_input` |
| `sound_enabled` | `users.sound_enabled` | Audio preference | `usage` | Lifetime of account | `user_input` |
| `haptics_enabled` | `users.hapticsEnabled` | Haptics preference | `usage` | Lifetime of account | `user_input` |
| `xp_total` | `users.xpTotal` | Gamification — total XP score | `inferred_behavioral` | Lifetime of account | `derived` |
| `level` | `users.level` | Gamification — current level | `inferred_behavioral` | Lifetime of account | `derived` |
| `xp_today` / `xp_today_date` | `users.xpToday`, `users.xpTodayDate` | Gamification — daily XP cap tracking | `inferred_behavioral` | Lifetime of account; date-keyed rolling reset | `derived` |
| `streak_current` | `users.streakCurrent` | Gamification — current streak count | `inferred_behavioral` | Lifetime of account | `derived` |
| `streak_best` | `users.streakBest` | Gamification — best streak ever | `inferred_behavioral` | Lifetime of account | `derived` |
| `last_streak_date` | `users.lastStreakDate` | Streak date tracking | `inferred_behavioral` | Lifetime of account | `derived` |
| `grace_used_this_week` | `users.graceUsedThisWeek` | Streak grace-day tracking | `inferred_behavioral` | Lifetime of account | `derived` |
| `streak_week_start` | `users.streakWeekStart` | Streak week boundary | `inferred_behavioral` | Lifetime of account | `derived` |
| `current_path_node_slug` | `users.currentPathNodeSlug` | Learning path position | `inferred_behavioral` | Lifetime of account | `derived` |
| `review_new_today` / `review_new_today_date` | `users.review_new_today`, `users.review_new_today_date` | Cross-song daily new-card counter | `inferred_behavioral` | Rolling daily reset | `derived` |
| `exercise_answer_log` | `user_exercise_log` (all rows for a user) | Immutable record of every exercise attempt with rating and response time | `inferred_behavioral` | Lifetime of account + 30 days grace; not pruned (FSRS depends on history) | `user_input` (answers) + `derived` (timing) |
| `vocab_mastery_state` | `user_vocab_mastery` (FSRS scalar columns: stability, difficulty, state, reps, lapses, due) | FSRS spaced-repetition state per vocabulary item | `inferred_behavioral` | Lifetime of account + 30 days grace | `derived` |
| `song_progress` | `user_song_progress` (completion_pct, ex1–ex7 best accuracies, sessions_completed) | Per-song exercise progress and mastery status | `inferred_behavioral` | Lifetime of account + 30 days grace | `derived` |
| `exercise_song_counters` | `user_exercise_song_counters` | Premium quota gate: which songs have been attempted per exercise family | `inferred_behavioral` | Lifetime of account + 30 days grace | `derived` |
| `cosmetics_unlocked` | `user_cosmetics` (slot_id, unlocked_at, equipped) | Cosmetic items unlocked via levelling | `inferred_behavioral` | Lifetime of account + 30 days grace | `derived` |
| `subscription_status` / `plan_tier` | `subscriptions.plan`, `subscriptions.status` | Monetization — current plan and billing status | `usage` | Lifetime of account + 7 years for tax/financial record-keeping | `derived` (from payment provider) |
| `stripe_customer_id` | `subscriptions.provider_customer_id` (when provider = "stripe") | Billing identifier at Stripe | `identifier` | Lifetime of account + 7 years for tax records 🚩 LAWYER-REQUIRED {#lawyer-priv-02} — confirm retention period under UK tax law and whether Stripe's DPA covers the transfer mechanism | `third_party_auth` (Stripe) |
| `provider_subscription_id` | `subscriptions.provider_subscription_id` | Payment provider subscription reference | `identifier` | Lifetime of account + 7 years | `third_party_auth` |
| `billing_period` | `subscriptions.current_period_start`, `subscriptions.current_period_end` | Billing cycle window | `usage` | Lifetime of account + 7 years | `derived` |
| `ip_address` | Supabase server logs + Vercel edge logs — not in kitsubeat schema | Network identifier surfacing in upstream processor logs | `identifier` | 30–90 days rolling (Vercel edge log retention); Supabase log retention per plan | `server_log` |
| `user_agent` | Vercel edge logs — not in kitsubeat schema | Browser/device metadata in upstream processor logs | `usage` | 30–90 days rolling (Vercel edge log retention) | `server_log` |
| `login_events` | Supabase Auth / Clerk session logs — not in kitsubeat schema | Authentication session metadata (login timestamp, device, IP) | `identifier` + `usage` | Managed by Clerk/Supabase; typically 90 days rolling | `server_log` |
| `cookie_consent_record` | Future table (Phase 18) — not yet in schema | Consent log: timestamp, version, categories accepted/rejected per data subject | `identifier` + `usage` | Lifetime of account + sufficient period to evidence consent (min 3 years recommended by ICO) | `user_input` |
| `sentry_user_context` | Sentry SDK (Phase 15) — not in kitsubeat schema; Sentry holds | Pseudonymous `{ id: user_id }` attached to error events | `identifier` (pseudonymous) | Sentry plan retention (typically 90 days); kitsubeat controls via Sentry project settings | `client_SDK` |
| `posthog_person_props` | PostHog SDK (Phase 15) — not in kitsubeat schema; PostHog holds | Event-keyed properties on analytics person profile | `identifier` (pseudonymous) + `inferred_behavioral` | PostHog plan retention; kitsubeat controls via PostHog project settings | `client_SDK` |

**Sensitivity classification definitions used above:**
- `identifier` — directly identifies a natural person, or when combined with other fields readily identifies them
- `authentication` — credentials used to authenticate; highest sensitivity within the account context
- `usage` — records how a user configures or uses the product; low direct identification risk
- `inferred_behavioral` — derived from user actions; reveals learning habits, patterns, engagement
- `special_category` — Art. 9 GDPR (health, religion, political views, biometric). **No special-category data is collected by kitsubeat in the current schema.** Confirm this remains true if age-gating for minors introduces age-range data (see §2.8 on AADC / minors — age range may become special-category adjacent in some interpretations).

**Retention policy principles applied:**
- "Lifetime of account" = from account creation until the user deletes their account
- "30 days grace" = data retained 30 days post-deletion to allow reactivation requests and system propagation delays; deletion is irreversible after this window
- Tax/financial records follow UK HMRC 7-year retention requirement
- Consent logs retained minimum 3 years per ICO recommended practice (auditable evidence of consent)
- Upstream processor logs (Vercel, Supabase, Sentry, PostHog) are governed by those processors' retention policies; kitsubeat cannot extend or shorten them unilaterally — mitigated by contractual DPA terms

**These fields are referenced by ID in §2.2–§2.5. A change to this inventory (Phase 18 or beyond) requires re-evaluating all four jurisdictions' lawful-basis assignments.**

---

### §2.2 UK-GDPR

**Applicable legislation:** UK General Data Protection Regulation (the retained EU Regulation 2016/679 as it has effect in UK law by virtue of the European Union (Withdrawal) Act 2018, as amended by the Data Protection, Privacy and Electronic Communications (Amendments etc) (EU Exit) Regulations 2019) + Data Protection Act 2018 (DPA 2018). Supervisory authority: Information Commissioner's Office (ICO), Wycliffe House, Water Lane, Wilmslow, Cheshire SK9 5AF. ICO registration number required once kitsubeat processes personal data — registration fee applies for sole traders (£40/year for tier 1).[^2-1]

#### 1. Applicability to kitsubeat

UK-GDPR applies because kitsubeat is a UK-established controller (sole trader, UK tax resident). UK-GDPR Art. 3(1) — the regulation applies to processing of personal data in the context of the activities of an establishment of a controller in the UK, regardless of where processing takes place. All UK users and all processing performed by kitsubeat's UK-based infrastructure trigger UK-GDPR regardless of the data subject's location. Additionally, UK-GDPR Art. 3(2) applies to non-UK data subjects where kitsubeat offers services to them (free beta = offering services globally). **In practice: UK-GDPR governs all kitsubeat processing from day one.**

**ICO registration:** Controllers who are not exempt must register with the ICO and pay the data protection fee. Sole traders processing personal data are not automatically exempt; exemptions apply only to processing carried out for purely personal/household purposes, some not-for-profit activities, and others listed in Sch. 1 of The Data Protection (Charges and Information) Regulations 2018. kitsubeat must register before launching. Fee tier 1 applies (turnover ≤ £632k AND ≤ 10 employees) = £40/year.[^2-2] 🚩 LAWYER-REQUIRED {#lawyer-priv-03} — confirm exemption status and register before Phase 18 launch.

#### 2. Lawful Basis per Data Field (UK-GDPR)

UK-GDPR Art. 6 lawful bases. All processing must have one:

| Field ID | Lawful Basis | Article | Basis Notes |
|---|---|---|---|
| `user_id` | Contract | Art. 6(1)(b) | Necessary to perform the service contract |
| `email_address` | Contract | Art. 6(1)(b) | Necessary for account creation and transactional comms |
| `hashed_password` | Contract | Art. 6(1)(b) | Necessary for authentication |
| `display_name` | Contract | Art. 6(1)(b) | Necessary for service identity |
| `streak_tz` | Legitimate interests | Art. 6(1)(f) | Timezone needed for accurate streak calculation; low privacy impact, user benefits directly |
| `locale` | Contract / Legitimate interests | Art. 6(1)(b) or (f) | Language preference necessary for localised service delivery |
| `skip_learning` / `new_card_cap` / `sound_enabled` / `haptics_enabled` | Contract | Art. 6(1)(b) | User preferences necessary for service personalisation |
| `xp_total` / `level` / `xp_today*` | Contract | Art. 6(1)(b) | Gamification state necessary for the core learning experience |
| `streak_*` / `grace_*` | Contract | Art. 6(1)(b) | Streak mechanics are core to learning retention feature |
| `exercise_answer_log` | Contract | Art. 6(1)(b) | FSRS requires answer history to schedule reviews |
| `vocab_mastery_state` | Contract | Art. 6(1)(b) | FSRS state is the core value proposition |
| `song_progress` | Contract | Art. 6(1)(b) | Progress tracking necessary for spaced repetition |
| `exercise_song_counters` | Contract | Art. 6(1)(b) | Quota enforcement under contract terms |
| `cosmetics_unlocked` | Contract | Art. 6(1)(b) | Reward tracking is part of the learning contract |
| `subscription_status` / `plan_tier` | Contract | Art. 6(1)(b) | Billing relationship |
| `stripe_customer_id` / `provider_subscription_id` / `billing_period` | Contract | Art. 6(1)(b) + Legal obligation | Contract for billing; legal obligation for financial records (HMRC) |
| `ip_address` (Vercel/Supabase logs) | Legitimate interests | Art. 6(1)(f) | Security, fraud prevention, DDoS mitigation; upstream processor log — kitsubeat cannot suppress |
| `user_agent` (Vercel logs) | Legitimate interests | Art. 6(1)(f) | Bug detection and browser compatibility; minimal privacy impact |
| `login_events` (Clerk/Supabase) | Contract + Legitimate interests | Art. 6(1)(b) + (f) | Authentication events necessary for security monitoring |
| `cookie_consent_record` | Legal obligation | Art. 6(1)(c) | Evidence of consent required by PECR / ICO guidance |
| `sentry_user_context` | Legitimate interests | Art. 6(1)(f) | Pseudonymous error tracking for service reliability; user_id only, no PII in error payload |
| `posthog_person_props` | Consent (if non-essential analytics cookies used) or Legitimate interests (if server-side only, no cookies) | Art. 6(1)(a) or (f) | Depends on Phase 15 implementation choice 🚩 LAWYER-REQUIRED {#lawyer-priv-04} — confirm analytics approach before Phase 18 wires consent |

**No special-category processing (Art. 9) is present** in the current schema. If age-range data is collected for AADC compliance (under-13 gate), seek legal advice on whether this constitutes data concerning a child that requires additional safeguards.[^2-3]

#### 3. Data Subject Rights (UK-GDPR)

| Right | Article | Applies to kitsubeat? | Notes |
|---|---|---|---|
| Right of access (SAR) | Art. 15 | Yes | Must provide copy of personal data + supplementary information within 1 calendar month |
| Right to rectification | Art. 16 | Yes | User can correct inaccurate data; must action within 1 month |
| Right to erasure ("right to be forgotten") | Art. 17 | Yes — with exceptions | Must erase unless legal obligation to retain (e.g. financial records 7yr HMRC) |
| Right to restriction | Art. 18 | Yes | Restrict processing while accuracy disputed or objection pending |
| Right to data portability | Art. 20 | Yes — for contract/consent bases | Must provide data in machine-readable format (JSON/CSV) for processing on contract or consent basis |
| Right to object | Art. 21 | Yes — for legitimate interests basis | Must stop processing on LI basis unless compelling legitimate grounds demonstrated |
| Rights relating to automated decision-making | Art. 22 | Limited — FSRS is automated scoring but no legal/significant effects; note for Privacy Policy | No profiling with significant effects currently; review if subscription gating changes |

#### 4. DSAR Handling Process (UK-GDPR)

- **Intake channel:** REQ-PRIV-UK-DSAR-01 — Phase 18 must provide a dedicated email address (e.g. privacy@kitsubeat.com) for Data Subject Access Requests, linked from the Privacy Policy and footer.
- **Identity verification:** REQ-PRIV-UK-DSAR-02 — Verify identity before releasing data; for registered users, Clerk/Supabase authenticated session is sufficient. For unauthenticated requests, require confirmation of email address on file.
- **Response window:** REQ-PRIV-UK-DSAR-03 — Respond within **1 calendar month** of receipt (UK-GDPR Art. 12(3)). If complex or numerous requests, can extend by further 2 months — must notify the data subject of extension within first month with reasons.[^2-4]
- **Format:** REQ-PRIV-UK-DSAR-04 — Provide data electronically where the request was made electronically (ICO guidance). Suggested format: JSON export covering all tables in §2.1 keyed to the user_id.
- **Fee:** REQ-PRIV-UK-DSAR-05 — No fee for standard requests (Art. 12(5)). Charge reasonable fee or refuse manifestly unfounded/excessive requests only.
- **Refusal grounds:** Art. 12(5) — manifestly unfounded or excessive; Art. 15(4) — third-party rights. If refusing, must inform data subject of right to complain to ICO and seek judicial remedy.
- **Documentation:** REQ-PRIV-UK-DSAR-06 — Log all SARs received, response date, and outcome for accountability purposes (Art. 5(2) accountability principle).

#### 5. Breach Notification (UK-GDPR)

- **Trigger event:** A personal data breach is any breach of security leading to accidental or unlawful destruction, loss, alteration, unauthorised disclosure of, or access to personal data (UK-GDPR Art. 4(12)).
- **Supervisory authority:** ICO — report at https://ico.org.uk/for-organisations/report-a-breach/
- **Deadline to authority:** REQ-PRIV-UK-BREACH-01 — **72 hours** after becoming aware of the breach (UK-GDPR Art. 33(1)). If not possible within 72 hours, report as soon as possible with reasons for delay.[^2-5]
- **Deadline to data subjects:** REQ-PRIV-UK-BREACH-02 — Without undue delay if breach is likely to result in high risk to the rights and freedoms of natural persons (Art. 34). No specific hour/day limit — "without undue delay" interpreted as as soon as reasonably possible.
- **Content of notification (to ICO):** Nature of breach; categories and approximate number of data subjects; categories and approximate number of records; name and contact details of DPO or other contact; likely consequences of breach; measures taken or proposed.
- **Content to data subjects:** Clear plain-language description of nature of breach; contact details; likely consequences; measures taken. Do NOT include information that would disclose security measures.
- **Record-keeping:** REQ-PRIV-UK-BREACH-03 — All breaches must be documented including those not reported to ICO (Art. 33(5)). Maintain a breach log.
- **Key exemption:** Notification to data subjects not required if: data was encrypted/anonymised, or subsequent measures have been taken to ensure high risk no longer materialises, or would involve disproportionate effort — post public notice instead.

#### 6. Cross-Border Transfer Mechanisms (UK-GDPR)

kitsubeat's infrastructure uses:
- **Supabase** — database + auth. Default US region (aws-east-1) unless configured otherwise. UK → US transfer. Supabase has signed the UK International Data Transfer Agreement (UK IDTA) with its customers as the transfer mechanism.[^2-6] REQ-PRIV-UK-XFER-01 — Confirm Supabase region selection before Phase 18; if US region, verify UK IDTA is in place (check Supabase DPA).
- **Vercel** — edge network. Multi-region including US. UK → US transfer. Vercel provides a UK IDTA addendum.[^2-7] REQ-PRIV-UK-XFER-02 — Verify Vercel DPA covers UK → US transfer via UK IDTA or adequacy decision.
- **Clerk** — auth provider (US-based). UK → US transfer. Verify Clerk DPA for UK IDTA. REQ-PRIV-UK-XFER-03 — Confirm Clerk UK IDTA before Phase 18 launch.
- **Stripe** (future) — US-based. UK adequacy decision does not cover US; UK IDTA required. REQ-PRIV-UK-XFER-04 — Verify Stripe UK IDTA (Stripe publishes a DPA with IDTA addendum).

**Note on UK adequacy decisions:** The UK has granted adequacy for EU/EEA, Switzerland, and a limited list of other countries. The US does not have a UK adequacy decision. The UK extension/recognition of the EU-US Data Privacy Framework is under review as of 2025; verify status at Phase 18 launch.[^2-8]

#### 7. Phase 18 Obligations (UK-GDPR)

- REQ-PRIV-UK-DSAR-01: Provide dedicated privacy@ email address linked in Privacy Policy and site footer
- REQ-PRIV-UK-DSAR-02: Implement identity verification step for unauthenticated SARs
- REQ-PRIV-UK-DSAR-03: Implement 1-month response workflow with calendar reminders
- REQ-PRIV-UK-DSAR-04: Build JSON data export endpoint for authenticated users covering all fields in §2.1
- REQ-PRIV-UK-DSAR-05: Document fee policy in Privacy Policy (free for standard requests)
- REQ-PRIV-UK-DSAR-06: Create and maintain SAR log (can be a simple spreadsheet at this stage)
- REQ-PRIV-UK-BREACH-01: Create breach response protocol document with 72-hour ICO notification workflow
- REQ-PRIV-UK-BREACH-02: Define "high-risk breach" threshold triggering data-subject notification
- REQ-PRIV-UK-BREACH-03: Maintain breach log from Phase 18 launch date
- REQ-PRIV-UK-XFER-01: Confirm and document Supabase region + IDTA status
- REQ-PRIV-UK-XFER-02: Confirm and document Vercel IDTA status
- REQ-PRIV-UK-XFER-03: Confirm and document Clerk IDTA status
- REQ-PRIV-UK-XFER-04: Confirm Stripe IDTA at time of payment integration
- REQ-PRIV-UK-POLICY-01: Publish Privacy Policy meeting UK-GDPR Art. 13 disclosure requirements (identity of controller, contact, purposes, lawful bases, rights, retention periods, third-party processors, transfer mechanisms)
- REQ-PRIV-UK-POLICY-02: Register with ICO and obtain registration number before processing data from beta users
- REQ-PRIV-UK-POLICY-03: Include ICO registration number in Privacy Policy

---

### §2.3 EU-GDPR

**Applicable legislation:** Regulation (EU) 2016/679 of the European Parliament and of the Council of 27 April 2016 (GDPR). Note: after Brexit, UK-GDPR and EU-GDPR are distinct instruments; kitsubeat must comply with both in parallel. EU supervisory authorities: lead authority is determined by kitsubeat's main establishment — as a UK controller with no EU establishment, there is no "lead supervisory authority" under the one-stop-shop mechanism; any EU member state DPA can be the competent authority for complaints by data subjects in that state.[^2-9]

#### 1. Applicability to kitsubeat

EU-GDPR Art. 3(2) applies to processing by a non-EU controller where processing activities relate to: (a) the offering of goods or services to data subjects in the EU (even free services — "offering" is demonstrated by accepting EU signups, supporting EU languages, or targeting EU users); or (b) monitoring behaviour of data subjects in the EU (FSRS tracks user behaviour — this limb is also triggered). **In practice: EU-GDPR applies to kitsubeat from the first EU-resident signup.** No threshold. No revenue gate.

**EU Art. 27 Representative:** A non-EU controller subject to Art. 3(2) must, in writing, designate a representative in the EU (Art. 27(1)). The representative acts as a contact point for EU supervisory authorities and data subjects.[^2-10] **Exemption under Art. 27(2):** The requirement does not apply to processing that is occasional, does not include, on a large scale, processing of special categories of data or data relating to criminal convictions and offences, and is unlikely to result in a risk to the rights and freedoms of natural persons, taking into account the nature, context, scope and purposes of the processing. **Analysis for kitsubeat:** Processing is not "occasional" — it is continuous and systematic (FSRS tracking on every user session). kitsubeat therefore likely does NOT qualify for the Art. 27(2) exemption. 🚩 LAWYER-REQUIRED {#lawyer-priv-05} — kitsubeat must designate an EU Art. 27 representative before EU data subjects use the platform. The representative can be an individual or a company in any EU member state (service providers include Lionheart Squared, DP-Dock, Bird & Bird). Typical cost: £500–2,000/year. This is a pre-launch legal requirement for the free beta if any EU resident signs up.

**EDPB guidance:** See EDPB Guidelines 3/2018 on the territorial scope of the GDPR.[^2-11]

#### 2. Lawful Basis per Data Field (EU-GDPR)

EU-GDPR Art. 6 lawful bases. Structure mirrors §2.2; differences noted:

| Field ID | Lawful Basis | Article | Differences from UK-GDPR |
|---|---|---|---|
| `user_id` | Contract | Art. 6(1)(b) | Same |
| `email_address` | Contract | Art. 6(1)(b) | Same |
| `hashed_password` | Contract | Art. 6(1)(b) | Same |
| `streak_tz` | Legitimate interests | Art. 6(1)(f) | Same |
| `exercise_answer_log` | Contract | Art. 6(1)(b) | Same |
| `vocab_mastery_state` | Contract | Art. 6(1)(b) | Same |
| `song_progress` | Contract | Art. 6(1)(b) | Same |
| `subscription_status` / billing fields | Contract + Legal obligation | Art. 6(1)(b) + (c) | Same |
| `ip_address` (logs) | Legitimate interests | Art. 6(1)(f) | Same; note EDPB has interpreted IP addresses as personal data — no EU-specific deviation |
| `cookie_consent_record` | Legal obligation | Art. 6(1)(c) | Required under ePrivacy Directive as transposed in member states |
| `sentry_user_context` | Legitimate interests | Art. 6(1)(f) | Same |
| `posthog_person_props` | Consent (if cookie-based) or LI (if server-side cookieless) | Art. 6(1)(a) or (f) | EDPB takes stricter line than ICO on what requires consent; see §2.6 |

**Key EU-GDPR specific point — legitimate interests (Art. 6(1)(f)):** Controllers relying on LI must conduct a three-part test: (1) purpose is legitimate; (2) processing necessary for that purpose; (3) interests of data subjects do not override. For analytics and behavioral tracking, the EDPB has published guidance suggesting consent is the appropriate basis for non-essential analytics even when LI is claimed. 🚩 LAWYER-REQUIRED {#lawyer-priv-06} — confirm analytics lawful basis with reference to the specific Phase 15 tool choice and EDPB's evolving guidance (August 2025 cutoff: EDPB Opinion 8/2024 on legitimate interests is relevant).

#### 3. Data Subject Rights (EU-GDPR)

| Right | Article | Notes vs UK-GDPR |
|---|---|---|
| Right of access | Art. 15 | Same 1-month window as UK-GDPR |
| Right to rectification | Art. 16 | Same |
| Right to erasure | Art. 17 | Same |
| Right to restriction | Art. 18 | Same |
| Right to data portability | Art. 20 | Same — machine-readable format requirement |
| Right to object | Art. 21 | Same |
| Rights re: automated decision-making | Art. 22 | Same |
| Right to lodge complaint | Art. 77 | Any EU member state DPA — not limited to one lead authority (no EU establishment) |

**Practical difference:** EU data subjects can complain to their local DPA (French CNIL, German BfDI, Irish DPC, etc.) rather than being directed to a single lead authority. kitsubeat has no lead EU supervisory authority under the one-stop-shop (that mechanism only applies to EU-established controllers). Each national DPA has jurisdiction over its residents.

#### 4. DSAR Handling Process (EU-GDPR)

- REQ-PRIV-EU-DSAR-01: Same privacy@ email channel as UK-GDPR; single channel for both regimes.
- REQ-PRIV-EU-DSAR-02: **Response window: 1 calendar month** from receipt (Art. 12(3)). Same as UK-GDPR; clock ticks from receipt, not from identity verification.
- REQ-PRIV-EU-DSAR-03: Extension by 2 further months for complex/numerous requests — notify within first month.
- REQ-PRIV-EU-DSAR-04: Provide data in commonly used, machine-readable format for portability requests (Art. 20).
- REQ-PRIV-EU-DSAR-05: No fee for standard requests. Reasonable fee for manifestly unfounded or excessive requests.
- REQ-PRIV-EU-DSAR-06: If relying on Art. 27 representative, the representative must be named as a contact point in the Privacy Policy.

#### 5. Breach Notification (EU-GDPR)

- **Trigger event:** Same definition as UK-GDPR (Art. 4(12)).
- **Supervisory authority:** Competent national DPA of the EU member state where the affected data subjects reside. In practice, notify the DPA most directly relevant to the breach.
- REQ-PRIV-EU-BREACH-01: **72 hours** from becoming aware (Art. 33(1)). Same deadline as UK-GDPR.[^2-12]
- REQ-PRIV-EU-BREACH-02: Data subjects notified without undue delay if high risk (Art. 34) — same threshold.
- REQ-PRIV-EU-BREACH-03: Document all breaches including unreported ones (Art. 33(5)).
- **Practical note:** If a breach affects both UK and EU data subjects, notify both ICO and the competent EU DPA simultaneously within 72 hours.

#### 6. Cross-Border Transfer Mechanisms (EU-GDPR)

- **Supabase (US region):** EU → US transfer. Following the EU-US Data Privacy Framework (DPF, Commission Implementing Decision (EU) 2023/1795), transfers to DPF-certified US companies are permissible under an adequacy decision. Supabase is DPF-certified.[^2-13] Verify DPF certification status at Phase 18 launch (DPF certifications are annual; must remain current). If DPF certification lapses, fallback to Standard Contractual Clauses (SCCs — Commission Implementing Decision (EU) 2021/914).
- REQ-PRIV-EU-XFER-01: Verify Supabase DPF certification before Phase 18; document the transfer mechanism in the Privacy Policy.
- REQ-PRIV-EU-XFER-02: Verify Vercel DPF certification or SCC availability for EU → US transfer.
- REQ-PRIV-EU-XFER-03: Verify Clerk DPF certification or SCCs.
- REQ-PRIV-EU-XFER-04: For Stripe (future): verify DPF or SCCs.
- **SCCs as fallback:** Use the 2021 SCCs (Module 2 — controller to processor). The 2010 SCCs are no longer valid for new contracts.

#### 7. Phase 18 Obligations (EU-GDPR)

- REQ-PRIV-EU-DSAR-01: Same privacy@ channel handles EU SARs; document EU DPA complaint right in Privacy Policy
- REQ-PRIV-EU-DSAR-02: Same 1-month response workflow covers both UK and EU
- REQ-PRIV-EU-DSAR-03: Note in Privacy Policy that EU data subjects may complain to their local DPA (list examples: CNIL France, BfDI Germany, DPC Ireland)
- REQ-PRIV-EU-DSAR-04: JSON export endpoint satisfies Art. 20 portability requirement
- REQ-PRIV-EU-DSAR-05: Name Art. 27 representative contact details in Privacy Policy (after appointment — #lawyer-priv-05)
- REQ-PRIV-EU-BREACH-01: Shared 72-hour breach notification workflow covers both ICO and relevant EU DPA
- REQ-PRIV-EU-BREACH-02: Dual-DPA breach notification for breaches affecting UK and EU subjects simultaneously
- REQ-PRIV-EU-BREACH-03: Breach log shared with UK-GDPR log (same document)
- REQ-PRIV-EU-XFER-01: Document DPF/SCC status for all processors in Privacy Policy
- REQ-PRIV-EU-XFER-02: Monitor DPF certification renewal annually for all US-based processors
- REQ-PRIV-EU-POLICY-01: Privacy Policy must comply with EU-GDPR Art. 13 disclosures; note these substantially overlap with UK-GDPR Art. 13 — one combined Privacy Policy can serve both with jurisdiction-specific sections
- REQ-PRIV-EU-POLICY-02: Name EU Art. 27 representative and contact details in Privacy Policy

---

### §2.4 LGPD

**Applicable legislation:** Lei Geral de Proteção de Dados Pessoais, Lei nº 13.709/2018 (LGPD), as amended by Lei nº 13.853/2019. Supervisory authority: Autoridade Nacional de Proteção de Dados (ANPD), Esplanada dos Ministérios, Bloco C, Brasília/DF, 70046-900, Brazil. ANPD became operational in 2021; enforcement posture is developing but increasing.[^2-14]

#### 1. Applicability to kitsubeat

LGPD Art. 3 — the law applies to any processing operation performed by natural or legal persons of public or private law, regardless of the medium, the country of origin of the data or the country where the data is located, provided that: (I) the processing operation is carried out in the national territory of Brazil; (II) the processing activity has the purpose of offering or providing services to individuals located in the Brazilian territory; or (III) the personal data being processed was collected in the Brazilian territory. **Analysis for kitsubeat:** The CONTEXT explicitly identifies a Brazilian audience as material (founder background, Portuguese translation support). Brazilian users signing up triggers limb (II) — offering services to individuals in Brazil. LGPD applies from the first Brazilian signup.[^2-15]

**Sole trader note:** LGPD applies to natural persons and legal entities alike; a UK sole trader with Brazilian data subjects is a "controller" (controlador) under LGPD Art. 5(VI) — the natural or legal person responsible for decisions regarding the processing of personal data.

#### 2. Lawful Basis per Data Field (LGPD)

LGPD Art. 7 provides ten lawful hypotheses for processing general personal data. Relevant ones for kitsubeat:

- **Art. 7(II)** — Compliance with legal obligation
- **Art. 7(V)** — Execution of a contract or preliminary procedures (equivalent to GDPR "contract" basis)
- **Art. 7(IX)** — Legitimate interests of the controller or third party (narrower under LGPD than GDPR)
- **Art. 7(I)** — Consent (freely given, informed, specific, unambiguous — same standard as GDPR)

| Field ID | LGPD Lawful Basis | Article | Notes |
|---|---|---|---|
| `user_id` | Contract | Art. 7(V) | Necessary to perform the service |
| `email_address` | Contract | Art. 7(V) | Necessary for account creation |
| `hashed_password` | Contract | Art. 7(V) | Authentication |
| `streak_tz` | Legitimate interests | Art. 7(IX) | Timezone for streak rollover; direct user benefit |
| `exercise_answer_log` | Contract | Art. 7(V) | FSRS requires answer history |
| `vocab_mastery_state` | Contract | Art. 7(V) | Core value proposition |
| `song_progress` | Contract | Art. 7(V) | Core value proposition |
| `subscription_status` / billing | Contract + Legal obligation | Art. 7(V) + Art. 7(II) | Billing contract; financial records |
| `stripe_customer_id` | Contract | Art. 7(V) | Billing |
| `ip_address` (logs) | Legitimate interests | Art. 7(IX) | Security and fraud prevention |
| `cookie_consent_record` | Legal obligation | Art. 7(II) | Evidence of consent required |
| `sentry_user_context` | Legitimate interests | Art. 7(IX) | Service reliability |
| `posthog_person_props` | Consent (if cookie-based) | Art. 7(I) | Analytics requiring cookies needs explicit consent |

**LGPD-specific note:** Art. 7(IX) legitimate interests under LGPD requires a "legitimate interests assessment" to be documented and made available to the ANPD on request. This is more rigorous than the ICO's approach; document LI assessments for streak_tz, ip_address, and sentry_user_context. REQ-PRIV-BR-LI-01 — Phase 18 must prepare LI assessment memos for all Art. 7(IX) processing.

**Sensitive data (dados pessoais sensíveis):** LGPD Art. 11 governs special category data (health, genetic, biometric, racial/ethnic, religious, political/trade union, sexuality, criminal records). None currently collected by kitsubeat. Confirm age-gating implementation does not inadvertently collect biometric or health data.

#### 3. Data Subject Rights (LGPD)

LGPD Art. 18 grants holders (titulares) the following rights:

| Right | Article | Notes |
|---|---|---|
| Confirmation of existence of processing | Art. 18(I) | Similar to GDPR access right — confirm processing occurs |
| Access to data | Art. 18(II) | Provide copy of data held |
| Correction of incomplete, inaccurate or outdated data | Art. 18(III) | Equivalent to rectification |
| Anonymisation, blocking or deletion of unnecessary/excessive data | Art. 18(IV) | Deletion where no legal basis |
| Portability to another service provider | Art. 18(V) | Subject to ANPD regulation (not yet fully implemented); apply same JSON export as GDPR |
| Deletion of data processed with consent | Art. 18(VI) | Delete consent-based processing on withdrawal |
| Information about processors and third parties | Art. 18(VII) | Must disclose who data is shared with |
| Information about refusal to consent and consequences | Art. 18(VIII) | Privacy Policy must explain what happens if consent refused |
| Withdrawal of consent | Art. 18(IX) | Consent withdrawal must be free and easy |
| Right to lodge complaint with ANPD | Art. 18(X) | ANPD complaint right must be disclosed |

#### 4. DSAR Handling Process (LGPD)

- REQ-PRIV-BR-DSAR-01: Same privacy@ email channel handles LGPD requests.
- REQ-PRIV-BR-DSAR-02: **Response window: 15 days** from request receipt (LGPD Art. 19(I)). **This is stricter than GDPR's 1 month.** REQ-PRIV-BR-DSAR-03 — Phase 18 workflow must be calibrated to the 15-day LGPD deadline when the requester is a Brazilian data subject.[^2-16]
- REQ-PRIV-BR-DSAR-04: No fee for standard requests.
- REQ-PRIV-BR-DSAR-05: If request is denied, provide reasons in simplified language; data subject may file complaint with ANPD.
- REQ-PRIV-BR-DSAR-06: Requests can be confirmed immediately; data provision can be within 15 days.

**Important:** The 15-day LGPD response window is shorter than the UK-GDPR/EU-GDPR 1-month window. Phase 18 should calibrate its SAR response process to the 15-day window to satisfy all jurisdictions simultaneously.

#### 5. Breach Notification (LGPD)

- **Trigger event:** A security incident that may cause relevant risk or damage to data subjects (LGPD Art. 48). This is a risk-proportionate trigger — not all breaches require notification.
- **Supervisory authority:** ANPD — https://www.gov.br/anpd/pt-br
- REQ-PRIV-BR-BREACH-01: **Notify ANPD and data subjects within a "reasonable period"** (LGPD Art. 48 — exact timeframe left to regulation; ANPD Resolution CD/ANPD No. 4/2023 specifies **3 working days** for preliminary notification to ANPD and **2 business days** for individual notification when the breach poses high risk).[^2-17] 🚩 LAWYER-REQUIRED {#lawyer-priv-07} — verify current ANPD regulatory resolution for breach notification timelines; Resolution CD/ANPD 4/2023 should be checked for amendments before Phase 18 launch.
- **Content:** Nature of breach; data affected; data subjects affected; immediate measures taken; risk to data subjects; contact of DPO.
- REQ-PRIV-BR-BREACH-02: Document all breaches including unreported ones; ANPD may request breach records.
- REQ-PRIV-BR-BREACH-03: If ANPD breach notification triggered simultaneously with ICO and EU DPA notification, coordinate timing — aim for all three within 72 hours.

#### 6. Cross-Border Transfer Mechanisms (LGPD)

LGPD Art. 33 permits international data transfers only under specific conditions:

- Art. 33(I): Transfer to country/international organisation providing adequate protection (ANPD adequacy list — very limited; as of 2025 ANPD has not published a formal adequacy list; the UK and US are not confirmed adequate).
- Art. 33(II): Transfer pursuant to international cooperation treaties.
- Art. 33(III): Transfers to organisations where ANPD has recognised adequate protection.
- Art. 33(V): Specific contractual clauses (Brazilian-law SCCs — ANPD has published a model contract; LGPD Art. 33(V) standard clauses).
- Art. 33(VII): Transfer necessary for execution of contract — limited to the contractual purpose.

**Analysis for kitsubeat:** Brazil → UK transfer (or Brazilian subject's data processed on UK infrastructure). The UK does not appear on a Brazilian adequacy list. The contractual clauses route (Art. 33(V)) using ANPD's model clauses is the most practical mechanism. 🚩 LAWYER-REQUIRED {#lawyer-priv-08} — Brazilian law cross-border transfer mechanisms are less mature than GDPR SCCs. Engage a Brazilian data protection counsel to confirm: (a) whether the ANPD standard clauses (Resolução CD/ANPD nº 19/2024 or later) are appropriate for kitsubeat's cloud infrastructure; (b) whether the UK qualifies for any adequacy recognition; (c) whether Art. 33(VII) contract necessity covers the full processing.

- REQ-PRIV-BR-XFER-01: Execute ANPD-compatible standard contractual clauses with Supabase and Vercel for BR → US transfers (or confirm alternative mechanism with legal advice).
- REQ-PRIV-BR-XFER-02: Document transfer mechanism for all processors in the Privacy Policy (Brazilian Portuguese section).

**DPO (Encarregado) appointment:** LGPD Art. 41 — controllers must appoint a DPO (encarregado). The DPO is an individual or company responsible for communication between the controller, data subjects, and the ANPD. Unlike GDPR's size-based DPO exemption, LGPD Art. 41 appears to require appointment without a small-organisation exemption (though ANPD Resolução CD/ANPD nº 2/2022 may provide guidance for small organisations). 🚩 LAWYER-REQUIRED {#lawyer-priv-09} — confirm whether kitsubeat (as a micro-entity under ANPD guidance) is exempt from formal DPO appointment, or whether the founder can self-appoint; verify current ANPD position on sole trader / micro-entity exemption.[^2-18]

- REQ-PRIV-BR-DPO-01: Name a DPO (encarregado) contact in the Brazilian-facing Privacy Policy section; this can be the founder initially pending legal advice; publish contact details as required by LGPD Art. 41, §1.

#### 7. Phase 18 Obligations (LGPD)

- REQ-PRIV-BR-DSAR-01: Same privacy@ channel handles LGPD requests
- REQ-PRIV-BR-DSAR-02: 15-day response window — calibrate to this for all SARs
- REQ-PRIV-BR-DSAR-03: Note ANPD complaint right in Privacy Policy (Portuguese section)
- REQ-PRIV-BR-DSAR-04: JSON export endpoint satisfies LGPD portability requirement
- REQ-PRIV-BR-LI-01: Prepare LI assessment memos for Art. 7(IX) processing before Phase 18 launch
- REQ-PRIV-BR-BREACH-01: 3-working-day ANPD preliminary notification; 2-business-day individual notification for high-risk breaches
- REQ-PRIV-BR-BREACH-02: Maintain unified breach log covering UK, EU, BR obligations
- REQ-PRIV-BR-XFER-01: Execute ANPD-compatible clauses with processors; document in Privacy Policy
- REQ-PRIV-BR-DPO-01: Name DPO in Privacy Policy; publish contact details
- REQ-PRIV-BR-POLICY-01: Privacy Policy must include Brazilian Portuguese section disclosing: ANPD contact, DPO contact, lawful bases for all processing, transfer mechanisms, all Art. 18 rights, 15-day response window

---

### §2.5 CCPA

**Applicable legislation:** California Consumer Privacy Act of 2018, California Civil Code §§ 1798.100–1798.199, as amended by the California Privacy Rights Act of 2020 (CPRA) — effective 1 January 2023. California Privacy Protection Agency (CPPA) is the enforcement agency. California AG has concurrent enforcement authority.[^2-19]

#### 1. Applicability to kitsubeat

CCPA as amended by CPRA applies to for-profit businesses that collect personal information from California residents AND meet ANY ONE of the following thresholds (Cal. Civ. Code § 1798.140(d)):

1. Annual gross revenues exceeding **$25 million** (£20M approx);
2. Alone or in combination, annually buys, sells, receives for commercial purposes, or shares for commercial purposes the personal information of **100,000 or more consumers or households**; or
3. Derives **50% or more of its annual revenues** from selling or sharing consumers' personal information.

**Analysis for kitsubeat at free-beta stage:** kitsubeat will NOT meet threshold (1) at free beta (zero revenue). It will likely not meet threshold (2) unless the beta reaches 100k California users, which is unlikely in the initial phase. Threshold (3) does not apply (no data sales). **Conclusion: CCPA does not technically apply to kitsubeat during the free beta.** However:

- The parallel-structure treatment here documents CCPA obligations so that when kitsubeat does scale (post-monetization, Phase 22+), the framework is ready.
- Including CCPA-compliant language in the Privacy Policy from launch is low-cost and signals good-faith privacy practices to California residents.
- The $25M revenue threshold was set by CPRA (doubled from the original $10M). Verify annually as the CPPA may revise by regulation.

REQ-PRIV-CA-APPLICABILITY-01 — Phase 18 should include a CCPA-formatted "California Privacy Notice" section in the Privacy Policy even though the thresholds are not yet met; remove or activate based on annual threshold review.

#### 2. Consumer Rights (CCPA/CPRA)

| Right | Section | Notes |
|---|---|---|
| Right to know (categories + specific pieces) | § 1798.110, § 1798.115 | What personal information is collected, from whom, and why |
| Right to delete | § 1798.105 | Request deletion; exceptions for security, fraud detection, legal obligation |
| Right to correct | § 1798.106 (CPRA addition) | Correct inaccurate personal information |
| Right to opt-out of sale or sharing | § 1798.120 | Must honour Global Privacy Control (GPC) signal |
| Right to limit use and disclosure of sensitive PI | § 1798.121 (CPRA addition) | No sensitive PI collected currently — future review if data expands |
| Right to non-discrimination | § 1798.125 | Cannot deny service or charge different price for exercising rights |
| Right to data portability | Implicit in "right to know" | Provide data in portable, readily useable format |

**"Do Not Sell or Share My Personal Information":** kitsubeat does not sell or share personal information for cross-context behavioural advertising as of the beta. If PostHog or other analytics involve "sharing" of personal information with a third party for advertising purposes, this triggers DNSS obligations once applicable. REQ-PRIV-CA-DNSS-01 — confirm that Phase 15 analytics tool does not constitute "sharing" of personal information under CCPA § 1798.140(ah) (sharing = disclosing for cross-context behavioural advertising).

**Global Privacy Control (GPC):** Once CCPA applies, kitsubeat must honour the GPC signal (a browser opt-out signal) as equivalent to a "Do Not Sell or Share" request. CPPA has confirmed this is mandatory enforcement-wise.[^2-20]

#### 3. Verifiable Consumer Request Process

- REQ-PRIV-CA-DSAR-01: Same privacy@ email channel handles CCPA requests once applicable.
- REQ-PRIV-CA-DSAR-02: **Response window: 45 calendar days** from receipt (§ 1798.145(b)(1)). Can extend by one additional 45-day period for complex/numerous requests — notify consumer within first 45-day period.[^2-21]
- REQ-PRIV-CA-DSAR-03: Must verify identity before disclosing or deleting; use 2-step verification (email confirmation + account ownership confirmation) for authenticated users.
- REQ-PRIV-CA-DSAR-04: No fee for standard requests. Up to 2 requests per year free.
- REQ-PRIV-CA-DSAR-05: If applicable: provide a "Data Download" tool (satisfies "specific pieces of information" right + portability).

**CPRA thresholds revised (2023):** $25 million in annual gross revenues (Cal. Civ. Code § 1798.140(d)(1)); 100,000 consumers or households (§ 1798.140(d)(2)); 50% revenue from selling/sharing (§ 1798.140(d)(3)). Confirm these have not been amended by CPPA regulation at Phase 18 time.

#### 4. DSAR Handling Process (CCPA)

Identical to §2.5(3) above. Key CCPA-specific differences from GDPR:
- 45 days (not 30 days) for first response
- "Verifiable consumer request" standard may require additional verification steps
- Requests for access to specific pieces of information require higher identity verification standard (signed declaration under penalty of perjury for highly sensitive data — § 1798.110(a)(5))

#### 5. Breach Notification (CCPA)

CCPA does not itself set breach notification timelines — California's breach notification law is Cal. Civ. Code § 1798.82 (California Security Breach Notification Law). Applicable if kitsubeat has California residents' data AND experiences a breach of unencrypted personal information.

- REQ-PRIV-CA-BREACH-01: **Notify California residents without unreasonable delay** (§ 1798.82(a)). No specific hour deadline — interpreted as as soon as reasonably practical. Best practice: within 72 hours (aligns with GDPR).
- REQ-PRIV-CA-BREACH-02: If breach affects 500+ California residents: notify the California AG (submit via AG website).
- REQ-PRIV-CA-BREACH-03: Notification must meet content requirements of § 1798.82(d) (nature of breach, information compromised, contact info, credit monitoring info if applicable).

#### 6. Cross-Border Transfer Mechanisms (CCPA)

CCPA does not have an equivalence requirement for international data transfers (unlike GDPR/LGPD). No specific transfer mechanism needed for CCPA compliance. Data transfers to processors are governed by a written contract requirement (§ 1798.140(ag)) — service provider contract must prohibit selling/sharing the data.

- REQ-PRIV-CA-CONTRACT-01: Ensure all processor agreements (Supabase, Vercel, Clerk, Stripe) contain the CCPA service-provider language: they must not sell/share the data, use it only for specified purposes, and comply with CCPA on kitsubeat's behalf.

#### 7. Phase 18 Obligations (CCPA)

- REQ-PRIV-CA-APPLICABILITY-01: Include "California Privacy Notice" in Privacy Policy even below threshold
- REQ-PRIV-CA-DSAR-01: Same privacy@ channel; note 45-day response window for California requests
- REQ-PRIV-CA-DSAR-02: Document verification procedure in Privacy Policy
- REQ-PRIV-CA-DNSS-01: Confirm Phase 15 analytics tool does not trigger "sharing" obligation
- REQ-PRIV-CA-BREACH-01: Unified breach response covers § 1798.82 within 72-hour window
- REQ-PRIV-CA-BREACH-02: Document CA AG notification requirement for breaches >500 residents
- REQ-PRIV-CA-CONTRACT-01: Add CCPA service-provider clause to all processor DPAs
- REQ-PRIV-CA-POLICY-01: Privacy Policy must include: categories of PI collected, purposes, third parties, consumer rights, how to submit requests, contact details

---

## 2.6 Cookies / PECR / ePrivacy (Research Principles — Implementation Wiring Deferred)

**Note:** Phase 15 picks the analytics tool. Phase 18 wires consent to that tool. This section documents the research principles; implementation specifics follow in Phase 18.

### What Counts as a Non-Essential Cookie

UK PECR Regulation 6 (Privacy and Electronic Communications (EC Directive) Regulations 2003, as amended) requires prior, informed consent before storing or accessing information on a user's device unless the cookie/similar technology is "strictly necessary" for a service the user has explicitly requested.[^2-22]

**Strictly necessary (no consent required):**
- Session authentication cookies (e.g. Supabase/Clerk session token)
- CSRF protection tokens
- Load-balancing cookies set by infrastructure (Vercel)
- Cookie-consent record itself (necessary to enforce consent state)

**Non-essential (consent required before setting):**
- Analytics cookies (PostHog, Sentry if cookies used)
- Performance monitoring cookies
- A/B testing cookies
- Any first-party cookie not required for core authentication or service delivery

### Consent Standard

Under PECR (UK) and ePrivacy Directive 2002/58/EC Art. 5(3) (transposed in EU member states): consent must be:
- **Prior** — obtained before the cookie is set (not retroactive)
- **Specific** — separate consents per purpose category (analytics ≠ marketing)
- **Informed** — data subject knows what they are consenting to
- **Freely given** — rejecting must be as easy as accepting; no "cookie wall" blocking access to the service[^2-23]
- **Unambiguous** — affirmative action required; pre-ticked boxes are invalid (EDPB Guidelines 05/2020 on consent)
- **Revocable** — must be as easy to withdraw consent as to give it; provide consent management preference link accessible from every page

### Per-Jurisdiction Variance

| Jurisdiction | Standard | Enforcer | Practical Notes |
|---|---|---|---|
| UK | PECR + ICO guidance | ICO | ICO's "strictly necessary" exemption interpreted generously; ICO has accepted analytics cookies under LI in some guidance (pre-EDPB pushback). Current ICO position (2024): consent preferred for analytics. |
| EU | ePrivacy Directive (national transpositions) + GDPR consent standard | National DPAs (French CNIL has been most aggressive) | CNIL has fined companies for mandatory cookies without easy rejection. EDPB strongly favours consent for all non-essential cookies. ePrivacy Directive fragmentation — 27 national implementations with varying details. |
| Brazil (LGPD) | LGPD treats cookie-based processing as personal data processing subject to Art. 7 bases | ANPD | Consent (Art. 7(I)) is the safest basis for analytics cookies for Brazilian users; ANPD guidance emerging. |
| California (CCPA) | CCPA does not regulate cookies per se; "sharing" via cookies for cross-context advertising triggers DNSS + GPC obligations | CPPA, AG | Analytics cookies not inherently restricted; sharing with ad networks requires opt-out mechanism. |

### Banner Design Principles

REQ-PRIV-COOKIE-01: Reject button must be as prominent and easy to use as Accept button (EDPB + CNIL enforcement position; UK ICO 2023 cookie sweep findings)

REQ-PRIV-COOKIE-02: No pre-ticked boxes for non-essential categories

REQ-PRIV-COOKIE-03: Granular consent per category (minimum: Essential / Analytics / Marketing — only Essential applies at v3.0 if no marketing cookies)

REQ-PRIV-COOKIE-04: Consent management accessible from footer on every page (not just on first visit)

REQ-PRIV-COOKIE-05: Store consent record with timestamp, version, and categories in `cookie_consent_record` table (§2.1) — this is itself a required data retention activity for compliance evidence

REQ-PRIV-COOKIE-06: No analytics scripts loaded before consent is granted (script-gating — Phase 18 implements after Phase 15 selects the tool)

REQ-PRIV-COOKIE-07: Honour Global Privacy Control (GPC) signal for California residents (once CCPA thresholds met)

REQ-PRIV-COOKIE-08: Cookie Policy must list every cookie name, purpose, duration, and first-party/third-party classification

---

## 2.7 Breach Notification Comparison Matrix

| Jurisdiction | Trigger | Authority | Deadline to Authority | Deadline to Data Subjects | Content Required | Documentation Duty |
|---|---|---|---|---|---|---|
| **UK-GDPR** | Any breach of security → accidental/unlawful destruction, loss, alteration, unauthorised disclosure or access to personal data (Art. 4(12)) | ICO — report at ico.org.uk/for-organisations/report-a-breach | **72 hours** from becoming aware (Art. 33(1)); explain delay if later | Without undue delay if **high risk** to rights and freedoms (Art. 34) | Nature; categories + approx number of data subjects and records; DPO contact; likely consequences; measures taken | All breaches documented including unreported (Art. 33(5)); maintain breach log |
| **EU-GDPR** | Same as UK-GDPR (Art. 4(12)) — mirror definition | Competent national DPA of affected data subjects' member state (no lead authority for non-EU controllers) | **72 hours** from becoming aware (Art. 33(1)) | Without undue delay if **high risk** (Art. 34) | Same as UK-GDPR; if multiple EU DPAs implicated, notify each separately | All breaches documented (Art. 33(5)); breach log |
| **LGPD (Brazil)** | Security incident that may cause relevant risk or damage to data subjects (Art. 48) — risk-proportionate trigger | ANPD — gov.br/anpd | **3 working days** preliminary notification (ANPD Res. CD/ANPD 4/2023); full report within period set by ANPD | **2 business days** for individual notification when high-risk breach | Nature; data categories; affected holders; measures taken; DPO contact | Document all incidents; ANPD may request records |
| **CCPA / Cal. law** | Breach of unencrypted/unredacted personal information (Cal. Civ. Code § 1798.82) | California AG (if 500+ residents affected) — via AG website; no DPA equivalent | No specific deadline — **without unreasonable delay** (best practice: align to 72-hour window); AG notification for 500+ residents | Without unreasonable delay; same timeline as authority notification | Nature of breach; info compromised; contact; credit monitoring info if applicable (§ 1798.82(d)) | Retain notification records; document decision not to notify if exemption relied upon |

**Practical unified approach:** For any breach affecting personal data, trigger the unified response workflow (REQ-PRIV-UK-BREACH-01) with simultaneous notifications to ICO, relevant EU DPA, and ANPD within 72 hours, satisfying the strictest deadline. California notification follows the same timeline. One breach log serves all four jurisdictions.

---

## 2.8 Section Rollup

### Highest-Risk Findings

1. **🔴 EU Art. 27 Representative** (🚩 {#lawyer-priv-05}) — kitsubeat is a non-EU controller systematically processing EU data subjects. The Art. 27(2) exemption (occasional processing) does not appear to apply given continuous FSRS tracking. An EU representative must be appointed before EU residents can use the free beta. Services cost £500–2,000/year. This is a pre-launch hard gate.

2. **🔴 LGPD Brazilian Representative / DPO** (🚩 {#lawyer-priv-09}) — LGPD Art. 41 requires DPO (encarregado) appointment; the Art. 27-equivalent question for non-Brazilian controllers is less settled under LGPD. Legal advice needed before Brazilian beta opens.

3. **🔴 LGPD Cross-Border Transfer Mechanism** (🚩 {#lawyer-priv-08}) — Brazil's adequacy list is limited; UK/US not confirmed adequate. ANPD standard contractual clauses must be executed with Supabase/Vercel. Brazilian law DPC advice needed.

4. **🟡 ICO Registration** (🚩 {#lawyer-priv-03}) — Sole traders processing personal data must register with ICO and pay annual fee (£40/year tier 1). Must complete before Phase 18 beta launch.

5. **🟡 Analytics Lawful Basis** (🚩 {#lawyer-priv-04}, 🚩 {#lawyer-priv-06}) — Whether PostHog analytics requires consent or can rely on LI depends on implementation method (cookie-based vs server-side) and jurisdiction. Resolve when Phase 15 selects the analytics tool.

6. **🟡 Supabase Region** (🚩 {#lawyer-priv-01}) — If Supabase is US region, all four jurisdictions' transfer mechanism requirements are triggered. EU DPF/SCCs, UK IDTA, LGPD standard clauses all depend on confirmed region.

### Complete REQ-PRIV-* ID Registry

**UK-GDPR:** REQ-PRIV-UK-DSAR-01, REQ-PRIV-UK-DSAR-02, REQ-PRIV-UK-DSAR-03, REQ-PRIV-UK-DSAR-04, REQ-PRIV-UK-DSAR-05, REQ-PRIV-UK-DSAR-06, REQ-PRIV-UK-BREACH-01, REQ-PRIV-UK-BREACH-02, REQ-PRIV-UK-BREACH-03, REQ-PRIV-UK-XFER-01, REQ-PRIV-UK-XFER-02, REQ-PRIV-UK-XFER-03, REQ-PRIV-UK-XFER-04, REQ-PRIV-UK-POLICY-01, REQ-PRIV-UK-POLICY-02, REQ-PRIV-UK-POLICY-03 (**16 IDs**)

**EU-GDPR:** REQ-PRIV-EU-DSAR-01, REQ-PRIV-EU-DSAR-02, REQ-PRIV-EU-DSAR-03, REQ-PRIV-EU-DSAR-04, REQ-PRIV-EU-DSAR-05, REQ-PRIV-EU-DSAR-06, REQ-PRIV-EU-BREACH-01, REQ-PRIV-EU-BREACH-02, REQ-PRIV-EU-BREACH-03, REQ-PRIV-EU-XFER-01, REQ-PRIV-EU-XFER-02, REQ-PRIV-EU-XFER-03, REQ-PRIV-EU-XFER-04, REQ-PRIV-EU-POLICY-01, REQ-PRIV-EU-POLICY-02 (**15 IDs**)

**LGPD (Brazil):** REQ-PRIV-BR-DSAR-01, REQ-PRIV-BR-DSAR-02, REQ-PRIV-BR-DSAR-03, REQ-PRIV-BR-DSAR-04, REQ-PRIV-BR-LI-01, REQ-PRIV-BR-BREACH-01, REQ-PRIV-BR-BREACH-02, REQ-PRIV-BR-BREACH-03, REQ-PRIV-BR-XFER-01, REQ-PRIV-BR-XFER-02, REQ-PRIV-BR-DPO-01, REQ-PRIV-BR-POLICY-01 (**12 IDs**)

**CCPA (California):** REQ-PRIV-CA-APPLICABILITY-01, REQ-PRIV-CA-DSAR-01, REQ-PRIV-CA-DSAR-02, REQ-PRIV-CA-DSAR-03, REQ-PRIV-CA-DSAR-04, REQ-PRIV-CA-DSAR-05, REQ-PRIV-CA-DNSS-01, REQ-PRIV-CA-BREACH-01, REQ-PRIV-CA-BREACH-02, REQ-PRIV-CA-BREACH-03, REQ-PRIV-CA-CONTRACT-01, REQ-PRIV-CA-POLICY-01 (**12 IDs**)

**Cross-jurisdiction cookies:** REQ-PRIV-COOKIE-01, REQ-PRIV-COOKIE-02, REQ-PRIV-COOKIE-03, REQ-PRIV-COOKIE-04, REQ-PRIV-COOKIE-05, REQ-PRIV-COOKIE-06, REQ-PRIV-COOKIE-07, REQ-PRIV-COOKIE-08 (**8 IDs**)

**Total REQ-PRIV-* IDs: 63**

### Complete 🚩 Lawyer-Required Index

| ID | Where | Issue |
|---|---|---|
| {#lawyer-priv-01} | §2.1 — Supabase region | Confirm Supabase region configuration; verify DPA and transfer mechanism before Phase 18 |
| {#lawyer-priv-02} | §2.1 — Stripe customer ID | Confirm retention period under UK tax law; verify Stripe DPA transfer mechanism |
| {#lawyer-priv-03} | §2.2 — ICO registration | Confirm sole-trader exemption status; register with ICO before Phase 18 launch |
| {#lawyer-priv-04} | §2.2 — Analytics lawful basis | Confirm PostHog/analytics basis before Phase 18 wires consent |
| {#lawyer-priv-05} | §2.3 — EU Art. 27 representative | Must appoint EU representative before EU residents use the platform; Art. 27(2) exemption likely does not apply |
| {#lawyer-priv-06} | §2.3 — EU analytics LI basis | Confirm analytics lawful basis per EDPB guidance; consent likely required |
| {#lawyer-priv-07} | §2.4 — ANPD breach notification | Verify current ANPD resolution for breach timelines; check for amendments to CD/ANPD 4/2023 |
| {#lawyer-priv-08} | §2.4 — LGPD cross-border transfers | Engage Brazilian DPC counsel; confirm ANPD standard clauses and adequacy position |
| {#lawyer-priv-09} | §2.4 — LGPD DPO appointment | Confirm micro-entity DPO exemption position under current ANPD guidance |

**Total 🚩 Lawyer-Required flags: 9**

---

## 2.9 Footnotes

[^2-1]: ICO — Fee tiers for 2024/25 are Tier 1 (small organisations): £40/year; Tier 2: £60/year; Tier 3 (large organisations, turnover >£36M): £2,900/year. https://ico.org.uk/for-organisations/data-protection-fee/

[^2-2]: ICO Data Protection (Charges and Information) Regulations 2018 — https://www.legislation.gov.uk/uksi/2018/480/contents/made; ICO registration guide: https://ico.org.uk/for-organisations/data-protection-fee/

[^2-3]: UK-GDPR Art. 9 special categories; ICO guidance on special category data — https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/special-category-data/

[^2-4]: UK-GDPR Art. 12(3): response within "one month of receipt of the request"; Art. 12(4) for extension. ICO Right of access guide: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/right-of-access/

[^2-5]: UK-GDPR Art. 33(1): "without undue delay and, where feasible, not later than 72 hours after having become aware." ICO breach notification guidance: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/personal-data-breaches/personal-data-breaches-a-guide/

[^2-6]: Supabase Data Processing Addendum including UK IDTA: https://supabase.com/legal/dpa

[^2-7]: Vercel Data Processing Addendum: https://vercel.com/legal/dpa

[^2-8]: ICO adequacy decisions list: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/transfers-to-other-countries/

[^2-9]: EU-GDPR Art. 55 — competence of supervisory authorities; Art. 56 — competence of lead supervisory authority (applies only to cross-border processing by EU-established controllers). For non-EU controllers under Art. 3(2), the competent authority is the DPA of the member state where the data subject resides.

[^2-10]: EU-GDPR Art. 27 — Representatives of controllers or processors not established in the Union. EDPB Guidelines 3/2018 on the territorial scope of the GDPR (Art. 3): https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-32018-territorial-scope-gdpr-article-3_en

[^2-11]: EDPB Guidelines 3/2018 — territorial scope: https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-32018-territorial-scope-gdpr-article-3_en; EDPB Art. 27 FAQ: https://edpb.europa.eu/sme-data-protection-guide/what-gdpr-requires-non-eu-businesses_en

[^2-12]: EU-GDPR Art. 33(1): "without undue delay and, where feasible, not later than 72 hours." EDPB Guidelines 9/2022 on personal data breach notification: https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-92022-personal-data-breach-notification_en

[^2-13]: EU-US Data Privacy Framework — Commission Implementing Decision (EU) 2023/1795: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023D1795. DPF participant list: https://www.dataprivacyframework.gov/list

[^2-14]: ANPD official website: https://www.gov.br/anpd/pt-br. LGPD text (Portuguese): https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm

[^2-15]: LGPD Art. 3 — territorial scope. ANPD guidance note on extraterritorial application (Portuguese): available on anpd.gov.br publications.

[^2-16]: LGPD Art. 19(I): "O titular pode solicitar ao controlador, a qualquer momento e mediante requisição: I - confirmação da existência de tratamento; II - acesso aos dados... O controlador deverá responder às solicitações do titular... em prazo de até 15 (quinze) dias corridos." (15 calendar days)

[^2-17]: ANPD Resolução CD/ANPD nº 4, de 24 de fevereiro de 2023 — Incident notification regulation. Available at: https://www.in.gov.br/web/dou/-/resolucao-cd/anpd-n-4-de-24-de-fevereiro-de-2023-465975831. Note: verify for amendments as of Phase 18 implementation date.

[^2-18]: LGPD Art. 41; ANPD Resolução CD/ANPD nº 2/2022 on small and medium entities: https://www.gov.br/anpd/pt-br/documentos-e-publicacoes/documentos-de-publicacoes/resolucoes/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022.pdf

[^2-19]: CCPA text — California Civil Code § 1798.100 et seq.: https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=CIV&division=3.&title=1.81.5. CPRA — California Proposition 24 (2020), effective 1 January 2023.

[^2-20]: CPPA enforcement guidance on Global Privacy Control: https://cppa.ca.gov/regulations/. AG press release confirming GPC enforcement: https://oag.ca.gov/news/press-releases/attorney-general-bonta-issues-press-release-re-gpc (verify URL at Phase 18 time).

[^2-21]: CCPA § 1798.145(b)(1): "A business that receives a consumer request pursuant to Sections 1798.105, 1798.106, 1798.110, or 1798.115 shall... respond to the consumer within 45 days of receiving a verifiable consumer request."

[^2-22]: UK PECR Regulation 6 — Privacy and Electronic Communications (EC Directive) Regulations 2003 as amended: https://www.legislation.gov.uk/uksi/2003/2426/regulation/6; ICO cookie guidance (2019, updated 2023): https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/privacy-in-the-digital-environment/guide-to-pecr/guidance-on-the-use-of-cookies-and-similar-technologies/

[^2-23]: EDPB Guidelines 05/2020 on consent under Regulation 2016/679, version 1.1, adopted 4 May 2020: https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en. EDPB Guidelines 03/2022 on deceptive design patterns in social media (banner design): https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-032022-dark-patterns-social-media-platform_en


---

<!-- source: sections/03-consumer-law-and-tax.md -->
<a id="section-3"></a>
# Section 3 — Consumer Law & Tax

**Scope:** kitsubeat is a UK sole trader selling (a) free beta now — nothing monetized, so consumer-contract and tax rules are largely dormant — and (b) planned subscription + per-song purchase at Phase 19 / v4.0 Phase 22. Per CONTEXT.md this section researches BOTH jurisdictions' obligations now so the monetization transition is implementation-only, not research-plus-implementation.

**Terminology note (important):** The roadmap phrase "VAT MOSS" is outdated. The scheme was renamed and restructured on 2021-07-01 to **OSS (One-Stop Shop)** for B2C digital services within the EU and **IOSS (Import One-Stop Shop)** for goods under €150 from outside the EU. UK-established traders use the non-Union OSS scheme. This section uses the current OSS/IOSS terminology throughout and flags the rename at each relevant subsection.

---

## 3.1 Consumer Law — Distance Selling & Digital Content

### §3.1.1 UK Consumer Contracts Regulations 2013 (CCRs)

**Statute:** The Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013, SI 2013/3134.
**Source:** https://www.legislation.gov.uk/uksi/2013/3134/contents
**Implementing directive:** EU Consumer Rights Directive 2011/83/EU (retained as UK law post-Brexit).

#### Applicability

The CCRs apply to **distance contracts** (Reg. 5) — contracts formed without the simultaneous physical presence of trader and consumer — where the consumer is an individual acting wholly or mainly outside their trade or profession (Reg. 4). kitsubeat's subscription and per-song purchase offerings are firmly in scope: the product is a digital service sold via a website to individual learners.

**`REQ-CONS-UK-01`** — kitsubeat must confirm it is a B2C distance seller and treat all individual consumers as entitled to CCR rights.

#### Pre-contract Information (Reg. 13)

Before a consumer is bound by a distance contract, the trader must provide specified information in a clear and comprehensible manner, including:

- The main characteristics of the goods or digital content (Reg. 13(1)(a))
- The trader's identity, address, telephone number, email address (Reg. 13(1)(b)–(d))
- The total price including taxes and any additional charges (Reg. 13(1)(e))
- The arrangements for payment and delivery / supply (Reg. 13(1)(g))
- If applicable, the existence of a right to cancel and the conditions for and procedure for exercise of that right (Reg. 13(1)(j))
- If applicable, the conditions under which the consumer loses the cancellation right for digital content (Reg. 13(1)(p)) — this is the **digital-content waiver notice**

**`REQ-CONS-UK-02`** — Checkout page must present all Reg. 13 information before the consumer clicks "confirm purchase". Phase 18 implements.

#### 14-Day Cancellation Right (Reg. 29)

Consumers have a 14-day right to cancel distance contracts (Reg. 29(1)). For digital content contracts not supplied on a tangible medium (i.e., a digital subscription or per-song purchase delivered online), the 14-day cancellation period begins on the day the contract is concluded (Reg. 30(3)).

The trader must provide a model cancellation form or equivalent clear instructions for exercising the right to cancel (Reg. 13(1)(j) and Reg. 32).

**`REQ-CONS-UK-03`** — Checkout and order confirmation email must include the right to cancel and a cancellation mechanism (support email or cancel form) valid for 14 days from purchase.

#### Digital Content Waiver Mechanics (Reg. 37) — single most important provision

**Reg. 37(1):** Where a consumer exercises their cancellation right under Reg. 29, the trader must reimburse all payments received from the consumer — unless the digital content waiver applies.

**Reg. 37(2):** The consumer **loses** the right to cancel if:
1. The supply of the digital content has begun; AND
2. The consumer **expressly** consented to the content supply beginning within the 14-day cancellation period; AND
3. The consumer **acknowledged** that they thereby lose their right to cancel.

All three conditions must be met simultaneously. A pre-ticked checkbox does NOT constitute express consent under the CCRs (Reg. 37 read with ICO guidance and CMA guidance).

**Wording requirements for waiver (phase 18 implementation):**

The checkout must include a standalone checkbox (unticked by default) with text substantially equivalent to:

> "I agree that the service should start immediately. I understand that by consenting to this I lose my right to cancel this contract within 14 days."

The consumer must actively tick the checkbox. The tick must be recorded server-side with a timestamp (evidence requirement).

**`REQ-CONS-UK-04`** — Digital-content waiver checkbox: unticked by default, express wording, recorded with timestamp. Mandatory at checkout for any digital product that begins supply immediately.

**`REQ-CONS-UK-05`** — If the consumer does NOT tick the waiver checkbox, supply must be deferred until the 14-day window closes, OR the trader must honour the refund right unconditionally.

**`REQ-CONS-UK-06`** — Evidence of waiver consent must be stored server-side linked to the transaction ID for a minimum of 6 years (UK limitation period for contract claims — Limitation Act 1980 s. 5).

**Citation:** CMA guidance "Consumer rights for digital content" (2015); Which? Legal guidance on CCR 2013 Reg. 37; legislation.gov.uk SI 2013/3134.

---

### §3.1.2 EU Consumer Rights Directive (Directive 2011/83/EU as amended by Directive 2019/2161 "Modernisation Directive")

**Primary instrument:** Directive 2011/83/EU of 28 October 2011 on consumer rights.
**Amendment:** Directive 2019/2161/EU of 27 November 2019 (Omnibus / Modernisation Directive).
**Source:** https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32011L0083

#### Applicability

The Directive applies to any contract between a trader and a consumer. kitsubeat as a UK sole trader selling to EU consumers must comply with the national transpositions of the Directive in each EU member state where a consumer is resident. The Directive is **maximum harmonisation** for the areas it covers (Art. 4), meaning member states cannot deviate from the core rules — practical effect: a single CRD-compliant checkout works across all 27 EU states.

**`REQ-CONS-EU-01`** — kitsubeat's checkout must comply with CRD obligations for any EU-resident consumer. Cannot geographically limit sign-ups to avoid CRD.

#### Pre-contract Information (Art. 6)

Art. 6(1) of the CRD requires a comprehensive list of information before the consumer is bound — mirrors the UK CCR Reg. 13 list with additions including:

- Trader's commercial name, postal address, telephone (Art. 6(1)(b))
- The total price, taxes included (Art. 6(1)(e))
- Where applicable, the existence of and conditions of the right of withdrawal (Art. 6(1)(h))
- For digital content: the functionality and interoperability of the digital content (Art. 6(1)(r), (s))
- **For digital content not supplied on a tangible medium:** the acknowledgement by the consumer that they consent to immediate supply and lose their withdrawal right (Art. 6(1)(o) as referenced by Art. 16(m))

**`REQ-CONS-EU-02`** — Phase 18 checkout must display Art. 6(1) information before contract conclusion. This overlaps significantly with REQ-CONS-UK-02.

#### 14-Day Withdrawal Right (Art. 9)

Art. 9(1): Consumers have a withdrawal period of 14 days from conclusion of the contract for digital content contracts not supplied on a tangible medium (Art. 9(2)(c)).

**`REQ-CONS-EU-03`** — 14-day withdrawal right applies identically to UK 14-day cancellation right for EU consumers. Checkout and order confirmation must reflect this.

#### Digital Content Waiver (Art. 16(m))

Art. 16(m) provides an exception to the withdrawal right for "the supply of digital content which is not supplied on a tangible medium if the performance has begun with the consumer's prior express consent and his acknowledgement that he thereby loses his right of withdrawal."

The wording of the acknowledgement required by Art. 16(m) differs slightly from UK CCR Reg. 37 in one nuance: the EU version specifically requires "prior" consent — consent before performance begins. Evidence and form requirements are functionally equivalent.

**`REQ-CONS-EU-04`** — Digital-content waiver at checkout must satisfy Art. 16(m): prior express consent + acknowledgement of loss of withdrawal right. Combined with REQ-CONS-UK-04, a single well-drafted checkbox satisfies both.

#### Modernisation Directive Additions (2019/2161)

The 2019 Modernisation Directive, applicable from 28 May 2022 in most member states, added obligations relevant to platform marketplaces and ranking transparency — kitsubeat is not a marketplace at v3.0 so most additions are not immediately triggered. Key addition for digital products: the Directive extended CRD to "digital services" supplied in exchange for personal data (free tiers that collect data are now covered under CRD in the EU). As kitsubeat's free beta collects user data, **CRD pre-contract information obligations apply to the free beta signup flow** in EU jurisdictions.

**`REQ-CONS-EU-05`** — Free beta signup that collects personal data triggers CRD Art. 6 pre-contract information obligations in the EU. Phase 18 privacy notice and signup flow must satisfy Art. 6 even for the free tier.

**`REQ-CONS-EU-06`** — Transposition fragmentation note: the CRD is maximum-harmonisation for core withdrawal rules, but member states have some implementation latitude on remedies and B2B exclusions. kitsubeat's legal basis is the CRD minimum baseline; country-specific nuance (e.g., French Hamon law extended windows, German BGB §356 wording requirements) requires legal review at scale.

🚩 LAWYER-REQUIRED {#lawyer-cons-02} — EU member-state transposition variances for digital-content waiver wording (particularly DE, FR, NL) — review when EU market > 20% of revenue.

---

### §3.1.3 Brazil CDC — Código de Defesa do Consumidor (Lei 8.078/1990)

**Statute:** Lei 8.078 de 11 de setembro de 1990 (CDC).
**Source:** https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm

#### 7-Day Withdrawal Right (Art. 49)

Art. 49 CDC grants consumers the right to withdraw from contracts concluded outside commercial establishments (which Brazilian courts have broadly applied to online/distance sales) within **7 days** of contract conclusion or product receipt.

Critically, Art. 49 applies to "fora do estabelecimento comercial" — off-premises — and there is no explicit "digital content" exception analogous to UK CCR Reg. 37 or EU CRD Art. 16(m). Whether a consumer who clicks "start now" and immediately accesses digital content still retains the 7-day right is **actively litigated** in Brazilian courts.

**`REQ-CONS-BR-01`** — At monetization, kitsubeat must adopt a conservative Brazil-compliant refund policy: offer 7-day right to cancel for Brazilian consumers, absent a confirmed judicial consensus on the digital-waiver question.

**`REQ-CONS-BR-02`** — Brazilian consumer-facing T&Cs must include the CDC Art. 49 withdrawal notice in Portuguese.

🚩 LAWYER-REQUIRED {#lawyer-cons-01} — **Brazil CDC digital-subscription scope:** Whether Art. 49's 7-day withdrawal right survives a digital-content "immediate supply" waiver for online subscriptions is unsettled under Brazilian law. PROCON and STJ case law is evolving. A Brazilian consumer law solicitor must advise before kitsubeat monetises to Brazilian users. This is the primary Brazil legal risk in consumer law.

---

### §3.1.4 California Automatic Renewal Law (ARL) — CCPA-Consumer Rights Overlap

**Statute:** California Business and Professions Code §17600–17606 (Automatic Renewal Law, ARL).
**Source:** https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=17600

#### Applicability

The ARL applies to any business that charges a consumer a subscription or automatic-renewal fee and that markets to California residents. There is no de minimis threshold: a UK sole trader with any California customers is in scope.

#### Disclosure-at-Signup Requirements (§17602)

Before charging a consumer on a subscription or auto-renewal basis, the business must provide a "clear and conspicuous" disclosure (§17602(a)) of:

1. The automatic renewal offer terms — the price, the renewal frequency, and the length of the initial term
2. The cancellation policy including how to cancel
3. How the subscription will continue unless the consumer cancels

"Clear and conspicuous" means in larger type than the surrounding text, or in contrasting type, font, or colour, or set off from the surrounding text by symbols or other marks, such that it is readily noticeable to the consumer (§17601(c)).

Additionally, the business must send a **post-purchase acknowledgement** email within a reasonable time that includes the full auto-renewal terms and the cancellation mechanism (§17602(c)).

**`REQ-CONS-CA-01`** — ARL auto-renewal disclosures must appear at checkout "above the fold" (clear and conspicuous) before the "Subscribe" button. Phase 18 implements.

**`REQ-CONS-CA-02`** — Post-purchase order confirmation email must include full ARL disclosure: price, renewal period, how to cancel. Phase 18 email template implements.

**`REQ-CONS-CA-03`** — Cancellation must be possible via a "simple mechanism" at the online account interface or a published cancellation URL (§17602(b)). A "cancel by email only" policy does not comply.

**`REQ-CONS-CA-04`** — If the subscription price changes, a new ARL disclosure must be sent and a new acknowledgement obtained before the higher price takes effect.

#### CCPA Overlap

The CCPA's consumer rights (right to know, right to delete, right to opt-out of sale) apply separately and are covered in Section 2 (Privacy). There is no California analogue to the EU/UK 14-day cancellation right for digital subscriptions — the ARL's "right to cancel going forward" is the primary consumer protection, not a retroactive refund right.

---

## 3.2 Refund Policy Template Annex — activate at monetization

```yaml
status: activate-at-monetization
activation-phases: Phase 19 (when first paid transaction occurs) or v4.0 Phase 22 (if monetization deferred)
publish-not-before: First paid transaction
drafted: 2026-04-19
review-required: legal review at monetization for Brazil CDC scope (see lawyer-cons-01)
```

---

### kitsubeat — Refund & Cancellation Policy

**Effective Date:** {{YYYY-MM-DD}}

---

#### 1. Scope

This Refund & Cancellation Policy applies to:
- **kitsubeat Premium Subscription** — a recurring monthly or annual subscription granting access to premium features within the kitsubeat service. <!-- UK-only --><!-- EU-only --><!-- CA-only -->
- **Per-Song Lesson Packs** — one-time purchases granting permanent access to a specific song's full lesson content, where available.

This Policy does not apply to the free beta tier. It takes effect on the first date kitsubeat charges any consumer a fee.

---

#### 2. Cancellation Rights — UK Consumers <!-- UK-only -->

Under the **Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013** (SI 2013/3134), you have the right to cancel this contract within **14 days** of purchase without giving any reason (the "cancellation period").

If you cancel during the cancellation period and have not waived your cancellation right (see §4 below), you are entitled to a full refund of all payments made, processed within 14 days of receipt of your cancellation notice.

---

#### 3. Withdrawal Rights — EU Consumers <!-- EU-only -->

Under **Directive 2011/83/EU** (Consumer Rights Directive) as transposed into your member state's national law, you have the right to withdraw from this contract within **14 days** of purchase (the "withdrawal period").

If you withdraw during the withdrawal period and have not waived your withdrawal right (see §4 below), you are entitled to a full refund of all payments made, without undue delay and in any event within 14 days of receipt of your withdrawal notice.

---

#### 4. Digital Content Waiver

kitsubeat is a digital service that begins immediately upon purchase. At checkout you will be asked to confirm:

> "I agree that the service should start immediately. I understand that by consenting to this I lose my right to cancel/withdraw this contract within 14 days."
> *(checkbox — must be ticked to proceed)*

**If you ticked this box:** You expressly consented to immediate supply of the digital content and acknowledged that by doing so you lost your 14-day cancellation / withdrawal right under UK CCR 2013 Reg. 37 <!-- UK-only --> and EU CRD Art. 16(m) <!-- EU-only -->. In this case, we are not obligated to issue a refund for the current billing period, except in the circumstances set out in §5 below.

**If you did not tick this box:** Your 14-day cancellation / withdrawal right is preserved and you are entitled to a full refund on request within that period.

**Authority:** UK Consumer Contracts Regulations 2013, SI 2013/3134, Regs. 9, 13, 29, and 37; EU Consumer Rights Directive 2011/83/EU, Art. 6(1)(h), 6(1)(o), and 16(m).

---

#### 5. Refund Mechanics

| Scenario | Refund Entitlement |
|---|---|
| Cancel within 14 days, no waiver | 100% refund |
| Cancel within 14 days, waiver ticked (UK/EU) | Discretionary goodwill refund only; not legally required |
| Technical failure preventing access > 48 hours | Pro-rata refund for downtime period |
| Billing error / duplicate charge | 100% refund of duplicate/erroneous charge |
| Per-song pack: cancel before accessing lesson | 100% refund |
| Per-song pack: cancel after first access | Non-refundable (fully consumed digital content) |
| Annual subscription: cancel mid-term | Remaining full months refunded at monthly-equivalent rate |

**Processing time:** Refunds will be processed to the original payment method within **14 calendar days** of the refund decision. Card refunds typically appear within 5–10 business days depending on your card issuer.

**`REQ-CONS-UK-07`** / **`REQ-CONS-EU-07`** — Refund processing must occur within 14 days of cancellation notice (SI 2013/3134 Reg. 34; CRD Art. 13(1)).

---

#### 6. How to Request a Refund

To exercise your cancellation/withdrawal right or request a refund:

1. **Email:** support@kitsubeat.com <!-- {{SUPPORT_EMAIL_PLACEHOLDER}} Phase 18 supplies this -->
2. **Subject line:** "Refund Request — [your order number]"
3. **Include:** your name, email address used at signup, order number, and reason for the request (optional but helpful)

We aim to acknowledge refund requests within **2 business days** and process them within **14 calendar days**.

Alternatively, use the EU's Online Dispute Resolution platform: https://ec.europa.eu/odr <!-- EU-only -->

---

#### 7. Auto-Renewal Disclosure — California Residents <!-- CA-only -->

**IMPORTANT NOTICE TO CALIFORNIA RESIDENTS** (required by California Business and Professions Code §17602)

kitsubeat's subscription will **automatically renew** at the end of each billing period at the then-current price unless you cancel. By subscribing you authorise kitsubeat to charge your payment method on a recurring basis.

- **Renewal frequency:** Monthly (or Annual, as selected at checkout)
- **Renewal price:** As displayed at checkout and in your order confirmation
- **How to cancel:** Log into your account, go to Account Settings → Subscription → Cancel, at any time before the renewal date

Cancellation takes effect at the end of the current billing period. You will not receive a refund for the remaining period after cancellation (except as provided by §5 of this Policy).

**`REQ-CONS-CA-05`** — This disclosure must appear "clear and conspicuous" in the checkout flow and be reproduced verbatim in the order confirmation email per CA ARL §17602(a) and §17602(c).

---

#### 8. Exceptions — Non-Refundable Items

The following are not eligible for refund:

- Per-song lesson packs that have been fully accessed (lyric synced, lesson sections viewed) — digital content fully consumed after waiver
- Subscription fees for billing periods already partly or wholly consumed after a valid digital-content waiver at checkout
- Gift vouchers (if introduced at a later date) after redemption
- Supplemental one-time purchases that have been fully delivered (e.g., downloadable content packs, if introduced)

---

#### 9. Governing Law & Jurisdiction

This Policy and any dispute arising from it are governed by the **laws of England and Wales**. <!-- UK-only -->

For disputes not resolved through our support channel, the courts of England and Wales have non-exclusive jurisdiction. <!-- UK-only -->

**Note for EU consumers:** <!-- EU-only --> Nothing in this Policy limits your right to bring proceedings in the courts of your country of domicile as provided by Council Regulation (EU) No. 1215/2012 (Brussels I Recast), Art. 18(1). EU consumers retain protective jurisdiction regardless of this governing-law clause.

**Note for California residents:** <!-- CA-only --> This Policy does not limit any rights you have under California law, including the Automatic Renewal Law (B&P Code §17600) or the Consumer Privacy Act (Cal. Civ. Code §1798.100).

**Brazil (CDC):** <!-- BR-only --> Brazilian consumers retain all rights under Lei 8.078/1990 (CDC), including the Art. 49 withdrawal right where applicable. See §3.1.3 note and 🚩 {#lawyer-cons-01}.

---

#### 10. Contact

**Trader details:**
- Name: {{TRADER_LEGAL_NAME}}
- Address: {{UK_SOLE_TRADER_ADDRESS}} (Phase 18 supplies)
- Email: support@kitsubeat.com <!-- {{SUPPORT_EMAIL_PLACEHOLDER}} -->
- Registered as: UK Sole Trader (transitioning to UK Ltd at approximately £30–50k revenue per year)

*This Policy is published as a service to consumers and is incorporated into kitsubeat's Terms of Service.*

---

*End of §3.2 Refund Policy Template Annex*

---

## 3.3 Tax — UK VAT

### §3.3.1 UK VAT Registration Threshold

The UK VAT registration threshold for 2024–25 was **£90,000** (12-month taxable turnover rolling). The Chancellor's Spring Budget 2024 confirmed this threshold, and HMRC's VAT Notice 700/1 ("Should I be registered for VAT?") reflects this figure.[^vat-threshold-2024] For 2025–26 and 2026 planning purposes, the threshold has been maintained at £90,000 — no indexation increase has been announced as of the date of this research (April 2026).

**Current 2026 figure: £90,000 (confirmed against HMRC VAT Notice 700/1, gov.uk).**

**`REQ-TAX-UK-01`** — kitsubeat must monitor rolling 12-month UK taxable turnover. At £85,000 (warning trigger), begin VAT registration preparation. Mandatory registration before turnover hits £90,000.

**`REQ-TAX-UK-02`** — Track UK taxable turnover monthly from first paid transaction using a simple spreadsheet or accounting software (FreeAgent, QuickBooks — Phase 18 / Phase 19 config).

### §3.3.2 Place-of-Supply Rules for Digital Services

Post-Brexit, the UK place-of-supply rules for digital services are set out in the Value Added Tax Act 1994 and SI 2012/2917 (The Value Added Tax (Place of Supply of Services) Order 2012), as amended to reflect the UK's standalone VAT system after leaving the EU's VAT Directive.

**Key rules for kitsubeat:**

1. **UK trader → UK consumer:** The supply is **UK-located** (supplier's location rule). UK VAT at 20% applies once registered. This is the standard case for UK-resident subscribers.

2. **UK trader → non-UK (EU) consumer:** The supply is **EU-located** under the destination principle (Reg. 1042/2013 in EU; mirrored in UK rules for outbound sales). UK VAT does NOT apply; EU VAT at the EU customer's member-state rate applies. This is collected via the non-Union OSS scheme (see §3.4).

3. **UK trader → UK business (B2B):** Reverse charge applies; the UK business customer accounts for VAT. kitsubeat's product is consumer-facing; B2B sales are edge cases.

**`REQ-TAX-UK-03`** — Once VAT-registered, kitsubeat must charge 20% UK VAT on supplies to UK consumers. Stripe Tax handles this automatically when correctly configured (see §3.6).

**`REQ-TAX-UK-04`** — Supplies to non-UK consumers (EU, US, Brazil) are zero-rated for UK VAT but trigger the destination-country's VAT rules.

### §3.3.3 Zero-Rating / Exemption Check for Digital Educational Content

**HMRC VAT Notice 701/30 ("Education and vocational training")** confirms that digital educational content sold B2C (directly to individual consumers) is generally **standard-rated at 20%** — it is NOT exempt. Exemption applies to eligible bodies (schools, universities registered with HMRC as eligible bodies) providing educational services, not to commercial providers selling to individual consumers.

kitsubeat is a commercial digital product. The educational nature of the content (language learning, anime lyrics) does not change the VAT status. Standard rate (20%) applies once registered.

**`REQ-TAX-UK-05`** — kitsubeat's subscription and per-song purchases are standard-rated supplies (20% UK VAT). No exemption claim applies.

### §3.3.4 Post-Brexit EU VAT and UK MOSS Discontinuation

The UK's Mini One-Stop Shop (UK MOSS) ceased to exist when the UK left the EU's VAT regime on 31 December 2020. UK traders who were on UK MOSS must now either:

1. **Direct-register for VAT in each EU member state** where they make B2C digital supplies (impractical for small traders), OR
2. **Register for the EU's non-Union OSS scheme** in one chosen EU member state (the recommended path — see §3.4).

**`REQ-TAX-UK-06`** — Do NOT attempt to use UK MOSS for EU sales — the scheme no longer applies to UK traders. Use EU non-Union OSS (see §3.4).

### §3.3.5 Record-Keeping Obligations (UK VAT)

Once VAT-registered, HMRC requires:

- **Making Tax Digital (MTD) for VAT:** Digital record-keeping and quarterly submission via MTD-compatible software (HMRC Notice 700/22). Applies from the first VAT return period.
- **Invoice retention:** 6 years (HMRC Notice 700, para 21.1)
- **Customer evidence for B2C digital services:** Not required under UK rules for supplies to UK consumers (supplier location rule applies); but for non-UK supplies, customer location evidence is needed (see §3.4 EU evidence rules).

**`REQ-TAX-UK-07`** — At VAT registration, implement MTD-compatible accounting software. FreeAgent or Xero with a Making Tax Digital connector are Phase 19 implementation options.

---

## 3.4 Tax — EU VAT OSS / IOSS

> **Roadmap Terminology Correction Box**
>
> Roadmap Success Criterion 4 references **"VAT MOSS"**. This is post-2021 outdated terminology.
>
> Since **2021-07-01**, the EU VAT e-commerce package restructured the scheme into:
> - **OSS (One-Stop Shop)** — for B2C supplies of services (including digital/electronic services) within the EU. Two variants: **Union OSS** (for EU-established traders) and **non-Union OSS** (for non-EU traders, including UK traders post-Brexit).
> - **IOSS (Import One-Stop Shop)** — for goods of intrinsic value ≤ €150 imported from outside the EU. **Not applicable to kitsubeat** (digital services, not goods).
>
> **kitsubeat as a UK sole trader uses non-Union OSS** to file a single quarterly VAT return covering all B2C digital service sales into the EU — provided it registers in ONE EU member state of its choosing (commonly Ireland for English-language administration). The term "MOSS" must not be used in Phase 18 documentation, Stripe Tax configuration, or accountant briefings.

### §3.4.1 Which OSS Scheme Applies to kitsubeat

| Scheme | Who Uses It | kitsubeat? |
|---|---|---|
| Union OSS | EU-established traders | No — UK trader |
| Non-Union OSS | Non-EU traders (incl. UK post-Brexit) | **YES** |
| IOSS | Non-EU traders selling goods ≤ €150 | No — digital services, not goods |

**`REQ-TAX-EU-01`** — kitsubeat must register for **non-Union OSS** in one EU member state (recommendation: Ireland) before making any B2C digital-service sales to EU consumers. Registration is via the chosen member state's tax authority portal (Ireland: Revenue.ie OSS registration).

### §3.4.2 Place-of-Supply: Destination-Country VAT

Under **Council Directive 2006/112/EC, Art. 58** (as amended by the 2021 VAT e-commerce package), B2C supplies of digital/electronic services are taxable in the **member state of the customer's location** — at that member state's standard VAT rate.

This means 27 different VAT rates may apply depending on the subscriber's location:

| Member State | Standard VAT Rate (2026) | Notes |
|---|---|---|
| Ireland | 23% | Recommended OSS registration state |
| Germany | 19% | |
| France | 20% | |
| Sweden | 25% | Highest in EU |
| Luxembourg | 17% | Lowest in EU |
| (all 27 states) | 17%–27% | [^eu-vat-rates] |

The non-Union OSS quarterly return reports sales broken down by member state; kitsubeat pays each state's rate through the single OSS filing.

**`REQ-TAX-EU-02`** — Stripe Tax must be configured to detect EU consumer location and apply the correct member-state VAT rate. The Stripe Tax product tax code for digital services handles this automatically when registrations are added (see §3.6).

### §3.4.3 Registration Process for Non-Union OSS

1. **Choose registration state** (once only; difficult to change) — Ireland recommended for English-language administration
2. **Register on Revenue.ie** (Ireland's OSS registration portal) — requires trader name, address, VAT identification number of the non-EU trader (UK VAT number once registered; or a UK UTR for sole traders pre-VAT-registration)
3. **Collect VAT** on each B2C EU sale from the moment of OSS registration
4. **File quarterly returns** — due by the last day of the month following the quarter (Q1 → 30 April; Q2 → 31 July; Q3 → 31 October; Q4 → 31 January)
5. **Pay** — in euros, to the registration member state's tax authority, which distributes to each relevant member state
6. **Do NOT separately register in each EU member state** — the whole point of OSS is to avoid this

**`REQ-TAX-EU-03`** — OSS registration must occur before the first EU paid transaction. Do not sell to EU consumers without being on OSS or direct-registered in each EU state.

### §3.4.4 Invoice / Receipt Requirements

For B2C digital services, the EU permits **simplified invoices** (Art. 238 of Directive 2006/112/EC). A simplified invoice / receipt must contain:

- Date of issue
- Supplier identification (name and address)
- Description of goods/services
- VAT amount payable OR price inclusive of VAT and VAT rate

**`REQ-TAX-EU-04`** — Stripe-generated receipts must include the kitsubeat VAT number (once registered), the applicable VAT rate, and the VAT amount. Stripe Tax handles this automatically when VAT number is configured.

### §3.4.5 Customer Location Evidence (EU VAT Implementing Regulation 1042/2013, Art. 24b)

**EU VAT Implementing Regulation 1042/2013, Art. 24b** requires that for electronic services supplied to non-taxable persons, the supplier must hold **two non-contradictory pieces of evidence** from the following list to determine the customer's member state:

- Billing address of the customer
- Internet Protocol (IP) address of the device used by the customer
- Bank details (location of bank where account is held)
- Country code of SIM card used
- Location of the customer's fixed land line through which the service is supplied
- Other commercially relevant information (e.g., BIN/IIN code of payment card)

This is the "2-of" evidence requirement. Stripe captures IP address, billing address, and card BIN automatically — providing 3 independent signals.

**`REQ-TAX-EU-05`** — kitsubeat must retain, for each EU B2C transaction, at least two of the Art. 24b evidence data points for 10 years (EU VAT retention period under most member-state laws). Stripe's transaction data export covers this if exported and archived.

**`REQ-TAX-EU-06`** — If two pieces of evidence conflict (e.g., IP address in Germany, billing address in Ireland), kitsubeat must apply reasonable judgment or default to the billing address — document the tie-break rule in the accountant brief.

### §3.4.6 VAT Number Display Obligation

Once registered for VAT (UK) and for OSS (EU), kitsubeat must display:

- UK VAT number on all invoices, VAT receipts, and on the website footer (HMRC rule)
- VAT / tax identification number on OSS receipts (per OSS registration state requirements)

**`REQ-TAX-EU-07`** — Phase 18 footer and Phase 19 receipts must include UK VAT number and EU OSS registration ID once assigned.

---

## 3.5 Tax — US Sales Tax Nexus + Other Non-EU

### §3.5.1 US Sales Tax — Economic Nexus Post-Wayfair

**Case:** *South Dakota v. Wayfair, Inc.*, 585 U.S. ___ (2018) — Supreme Court held that states may impose sales tax collection obligations on out-of-state sellers based on **economic nexus** (volume of sales into the state), overturning the prior physical-presence requirement from *Quill Corp. v. North Dakota* (1992).

**Wayfair economic nexus standard (South Dakota's model statute, widely adopted):**
- $100,000 in annual sales revenue into the state, OR
- 200 or more separate transactions into the state

As of 2026, all 50 states that have a sales tax have enacted economic nexus laws based on this model (with minor variations in threshold amounts).

**Taxability of digital goods:** Varies by state. States fall into three categories:

| Category | States (examples) | kitsubeat Impact |
|---|---|---|
| Taxable digital goods | TX, NY, WA, PA, CO | Subscription and per-song purchases taxable |
| Exempt digital goods | OR, NH (no sales tax), FL (digital services exempt) | No collection obligation |
| Unclear / in dispute | CA, IL | Stripe Tax's state configuration handles most |

**`REQ-TAX-US-01`** — kitsubeat must not assume US sales are tax-exempt. Stripe Tax's automatic US state tax collection must be enabled at Phase 19 monetization.

**`REQ-TAX-US-02`** — Monitor US revenue by state quarterly. Economic nexus triggers collection obligation; Stripe Tax auto-registers and remits to most states.

**`REQ-TAX-US-03`** — At beta launch, if US revenue is well below $100k, nexus is unlikely — document and reassess quarterly.

### §3.5.2 Brazil Digital Services Tax

**Convênio ICMS 106/2017:** Brazilian states' finance secretaries issued Convênio ICMS 106/2017 establishing that ICMS (Imposto sobre Circulação de Mercadorias e Serviços) applies to the supply of digital goods and services (downloads, streaming, online access) via electronic data transfer. The ICMS is a state-level VAT at rates typically 17–18% per state.

Additionally, **ISS (Imposto Sobre Serviços de Qualquer Natureza)** applies at the municipal level (2–5%) to service-based digital activities. For SaaS and digital subscriptions, the Brazilian Revenue Service's characterisation oscillates between ICMS and ISS depending on whether the supply is characterised as a "service" or "circulation of goods."

**CIDE (Contribuição de Intervenção no Domínio Econômico):** Applies to technology royalty and technical-service payments from Brazil to abroad. As kitsubeat as a non-Brazilian seller receives payments from Brazilian consumers (not royalties), CIDE should not apply — but the analysis is technically nuanced.

**`REQ-TAX-BR-01`** — Before monetising to Brazilian users, seek Brazilian tax counsel on whether ICMS (state-level), ISS (municipal), or CIDE applies to kitsubeat's subscription model as offered to Brazilian consumers from the UK. The answer determines whether kitsubeat must register as a foreign digital-service provider in Brazil.

**`REQ-TAX-BR-02`** — At beta (no revenue), no Brazilian tax obligation is triggered. Activate this review at Phase 19.

🚩 LAWYER-REQUIRED {#lawyer-tax-01} — **Brazil digital-services tax at monetization:** ICMS 106/2017 vs ISS ambiguity for UK-based digital subscription sellers; foreign-provider registration rules (Secretaria da Receita Federal); intersection with CIDE. A Brazilian tax solicitor must advise before kitsubeat charges Brazilian users. This is the primary Brazil tax risk.

---

## 3.6 Stripe Tax Configuration Specification

> **Purpose:** This section is the drop-in Phase 19 Stripe Tax implementation checklist. All items are actionable without additional research. Phase 19 executes verbatim.

### Pre-Conditions (before Stripe Tax configuration)

- UK VAT registration completed (HMRC) — **HMRC VAT registration number in hand**
- EU non-Union OSS registration completed (Ireland Revenue.ie) — **OSS registration number in hand**
- US state registrations activated (optional — Stripe Tax auto-registers in many states; see note below)

### Stripe Tax Configuration Checklist

**`REQ-TAX-STRIPE-01`** — **Enable Stripe Tax:** In the Stripe Dashboard → Tax, toggle on "Stripe Tax". No code changes required; Stripe Tax runs as a middleware on every charge.

**`REQ-TAX-STRIPE-02`** — **Set business origin address:** In Stripe Tax → Settings → Origin address, enter the UK sole trader's registered business address. This determines the "origin" for place-of-supply rules (UK).

**`REQ-TAX-STRIPE-03`** — **Add UK VAT Registration:** In Stripe Tax → Registrations → Add registration → United Kingdom → VAT → enter UK VAT number. Set effective date to the date of VAT registration (not before).

**`REQ-TAX-STRIPE-04`** — **Add EU Non-Union OSS Registration:** In Stripe Tax → Registrations → Add registration → European Union → One-Stop Shop (non-Union) → enter OSS registration ID and registration state (Ireland). Set effective date to OSS registration date.

**`REQ-TAX-STRIPE-05`** — **Set product tax code for digital services:** For each Stripe Product (subscription, per-song pack), set the tax code to **`txcd_10103001`** (Electronic Services — Digital Content Subscription) or the current Stripe tax code equivalent for electronic/digital services. Verify the current code at https://stripe.com/docs/tax/tax-codes before implementation, as Stripe updates codes periodically.

**`REQ-TAX-STRIPE-06`** — **Tax behavior: exclusive for UK/EU B2C:** Set `tax_behavior: "exclusive"` on each Stripe Price object — this means the tax amount is ADDED to the display price at checkout (standard for UK/EU B2C, where prices are typically shown tax-inclusive; adjust if presenting inclusive prices). If pricing is shown inclusive (e.g., "£5.99/month incl. VAT"), set `tax_behavior: "inclusive"` and update the Price accordingly. Pick ONE approach and apply consistently.

> Note: EU law requires B2C prices to be displayed VAT-inclusive under the Price Indication Directive (98/6/EC, Art. 3). UK law under the Consumer Protection from Unfair Trading Regulations 2008 requires prices to include all mandatory charges. **Recommendation: use `tax_behavior: "inclusive"` and quote VAT-inclusive prices to consumers, breaking down the tax separately on the receipt.** <!-- UK-only --><!-- EU-only -->

**`REQ-TAX-STRIPE-07`** — **Customer tax ID collection (optional B2B):** If kitsubeat ever sells to businesses (B2B), enable customer tax ID collection in Stripe Tax to capture VAT numbers and apply reverse charge. For v3.0 (B2C only), this can be left disabled.

**`REQ-TAX-STRIPE-08`** — **Enable automatic US state tax collection:** In Stripe Tax → Registrations → United States, enable "Automatic collection". Stripe Tax monitors economic nexus thresholds per state and adds registrations when thresholds are approaching. This satisfies REQ-TAX-US-02 automatically.

**`REQ-TAX-STRIPE-09`** — **Configure invoice template with VAT number:** In Stripe → Settings → Billing → Invoice template, add the UK VAT number and EU OSS registration ID to the invoice footer. This satisfies REQ-TAX-EU-07 and REQ-TAX-UK invoice-display obligations.

**`REQ-TAX-STRIPE-10`** — **Enable reverse-charge wording for B2B EU invoices:** In the Stripe invoice template, add the standard reverse-charge statement: "VAT reverse charged — recipient to account for any VAT due." This is only triggered for B2B EU supplies (verified via the customer VAT ID field); for B2C it doesn't appear. Configuration: Stripe Dashboard → Settings → Billing → Invoice template → Add custom footer text for EU reverse-charge.

**`REQ-TAX-STRIPE-11`** — **Configure customer location evidence capture:** Stripe Tax automatically captures IP address, billing address, and card BIN as location signals — satisfying EU VAT Implementing Regulation 1042/2013 Art. 24b (the "2-of" evidence requirement). No additional configuration needed; confirm by reviewing a test transaction's Stripe Tax report to verify location signals are logged.

**`REQ-TAX-STRIPE-12`** — **Tax report export cadence:** In Stripe Tax → Reports, schedule monthly tax liability report exports (CSV format). Email to accountant by the 5th of each month. This provides the data for:
- UK VAT quarterly returns (MTD-compatible software imports the CSV)
- EU non-Union OSS quarterly returns (aggregate by member state from the CSV)
- US state remittance (Stripe handles auto-remittance for registered states)

**`REQ-TAX-STRIPE-13`** — **Stripe Tax test mode validation:** Before going live with payments, run at least one test-mode charge with a UK billing address and one with an EU billing address. Verify in the Stripe Tax dashboard that the correct rates were applied and that the transaction appears in the tax report.

**`REQ-TAX-STRIPE-14`** — **Stripe Tax in the checkout API call:** Ensure every `stripe.paymentIntents.create()` or `stripe.checkout.sessions.create()` call includes `automatic_tax: { enabled: true }`. This is the single API-level hook that activates Stripe Tax on each transaction. Phase 19 code must include this parameter.

**Citation sources:**
- Stripe Tax docs: https://stripe.com/docs/tax
- Stripe tax codes reference: https://stripe.com/docs/tax/tax-codes
- Stripe Tax for non-US businesses: https://stripe.com/docs/tax/registrations

---

## 3.7 Section Rollup

### Highest-Risk Findings in §3

| # | Finding | Risk Level | Action |
|---|---|---|---|
| 1 | Brazil CDC digital-subscription waiver — legally unsettled | 🔴 | 🚩 {#lawyer-cons-01} |
| 2 | Brazil digital-services tax (ICMS/ISS/CIDE) | 🔴 | 🚩 {#lawyer-tax-01} |
| 3 | EU member-state transposition variances (DE, FR, NL waiver wording) | 🟡 | 🚩 {#lawyer-cons-02} |
| 4 | EU non-Union OSS registration required before first EU sale | 🟡 | REQ-TAX-EU-01 |
| 5 | CA ARL "clear and conspicuous" auto-renewal disclosure | 🟡 | REQ-CONS-CA-01 through -05 |
| 6 | Refund template not yet published (activate at monetization) | 🟡 | §3.2 status marker |

### Complete REQ-CONS-* IDs

| ID | Obligation | Phase |
|---|---|---|
| REQ-CONS-UK-01 | UK B2C distance seller confirmation | 18 |
| REQ-CONS-UK-02 | Reg. 13 pre-contract information at checkout | 18 |
| REQ-CONS-UK-03 | 14-day cancellation notice + mechanism | 18/19 |
| REQ-CONS-UK-04 | Digital-content waiver checkbox (unticked, express, timestamped) | 19 |
| REQ-CONS-UK-05 | No supply before waiver ticked or 14-day window closed | 19 |
| REQ-CONS-UK-06 | Waiver evidence stored 6 years | 19 |
| REQ-CONS-UK-07 | Refund within 14 days of cancellation notice | 19 |
| REQ-CONS-EU-01 | CRD compliance for EU consumers | 18 |
| REQ-CONS-EU-02 | Art. 6(1) pre-contract information | 18 |
| REQ-CONS-EU-03 | EU 14-day withdrawal right | 18/19 |
| REQ-CONS-EU-04 | Art. 16(m) digital-content waiver | 19 |
| REQ-CONS-EU-05 | Free-beta CRD Art. 6 pre-contract info (Modernisation Directive) | 18 |
| REQ-CONS-EU-06 | Transposition variance note for DE/FR/NL | Lawyer review |
| REQ-CONS-EU-07 | Refund within 14 days (CRD Art. 13(1)) | 19 |
| REQ-CONS-BR-01 | Brazil: conservative 7-day refund policy at monetization | 19 |
| REQ-CONS-BR-02 | CDC Art. 49 notice in Portuguese in Brazil-facing T&Cs | 18/19 |
| REQ-CONS-CA-01 | ARL auto-renewal disclosure at checkout (clear & conspicuous) | 19 |
| REQ-CONS-CA-02 | ARL disclosure in order confirmation email | 19 |
| REQ-CONS-CA-03 | Cancel via account UI (not email-only) | 19 |
| REQ-CONS-CA-04 | New ARL disclosure required on price change | 22 |
| REQ-CONS-CA-05 | CA ARL §17602 verbatim disclosure at checkout + email | 19 |

### Complete REQ-TAX-* IDs

| ID | Obligation | Phase |
|---|---|---|
| REQ-TAX-UK-01 | Monitor UK rolling 12-month turnover; register before £90,000 | 19 |
| REQ-TAX-UK-02 | Track UK taxable turnover monthly from first transaction | 19 |
| REQ-TAX-UK-03 | Charge 20% UK VAT on UK-consumer supplies once registered | 19 |
| REQ-TAX-UK-04 | Non-UK consumer supplies: zero-rated for UK VAT | 19 |
| REQ-TAX-UK-05 | Digital educational content: standard-rated (20%), no exemption | 19 |
| REQ-TAX-UK-06 | Do NOT use UK MOSS (discontinued); use EU non-Union OSS | 19 |
| REQ-TAX-UK-07 | MTD-compatible accounting software at VAT registration | 19 |
| REQ-TAX-EU-01 | Register non-Union OSS before first EU paid transaction | 19 |
| REQ-TAX-EU-02 | Stripe Tax: EU consumer location + per-state VAT rate | 19 |
| REQ-TAX-EU-03 | OSS registration before first EU sale | 19 |
| REQ-TAX-EU-04 | Receipts: VAT number + rate + amount (simplified invoice) | 19 |
| REQ-TAX-EU-05 | Retain 2× Art. 24b location evidence per EU transaction (10 yr) | 19 |
| REQ-TAX-EU-06 | Conflicting location evidence: document tie-break rule | 19 |
| REQ-TAX-EU-07 | Display UK VAT number + OSS ID in footer + receipts | 18/19 |
| REQ-TAX-US-01 | Stripe Tax US collection: enable at Phase 19 | 19 |
| REQ-TAX-US-02 | Monitor US revenue by state; economic nexus tracking | 19 |
| REQ-TAX-US-03 | Beta: US nexus unlikely; document and reassess quarterly | 18+ |
| REQ-TAX-BR-01 | Brazil tax counsel before charging Brazilian users | 19 |
| REQ-TAX-BR-02 | Beta: no Brazil tax obligation; activate review at Phase 19 | 19 |
| REQ-TAX-STRIPE-01 | Enable Stripe Tax in Dashboard | 19 |
| REQ-TAX-STRIPE-02 | Set business origin address (UK) | 19 |
| REQ-TAX-STRIPE-03 | Add UK VAT registration in Stripe Tax | 19 |
| REQ-TAX-STRIPE-04 | Add EU non-Union OSS registration in Stripe Tax | 19 |
| REQ-TAX-STRIPE-05 | Set product tax code: txcd_10103001 (electronic services) | 19 |
| REQ-TAX-STRIPE-06 | Tax behavior: inclusive (VAT-inclusive pricing for B2C) | 19 |
| REQ-TAX-STRIPE-07 | Customer tax ID collection (B2B optional) | 19/22 |
| REQ-TAX-STRIPE-08 | Enable automatic US state tax collection | 19 |
| REQ-TAX-STRIPE-09 | Invoice template: VAT number + OSS ID in footer | 19 |
| REQ-TAX-STRIPE-10 | Reverse-charge wording for B2B EU invoices | 19/22 |
| REQ-TAX-STRIPE-11 | Confirm customer location evidence logged (Art. 24b) | 19 |
| REQ-TAX-STRIPE-12 | Monthly tax report export → accountant by 5th | 19 |
| REQ-TAX-STRIPE-13 | Test-mode validation (UK + EU charge) before go-live | 19 |
| REQ-TAX-STRIPE-14 | `automatic_tax: { enabled: true }` in every charge API call | 19 |

### Lawyer-Required Markers (§3)

| Marker | Section | Issue |
|---|---|---|
| {#lawyer-cons-01} | §3.1.3 | Brazil CDC digital-subscription waiver scope — unsettled law |
| {#lawyer-cons-02} | §3.1.2 | EU member-state transposition variances (DE, FR, NL) |
| {#lawyer-tax-01} | §3.5.2 | Brazil digital-services tax (ICMS/ISS/CIDE) at monetization |

---

## 3.8 Footnotes

[^vat-threshold-2024]: HMRC VAT Notice 700/1 "Should I be registered for VAT?" — https://www.gov.uk/guidance/vat-registration-thresholds. Spring Budget 2024 (March 2024) raised threshold from £85,000 to £90,000 effective 1 April 2024.

[^eu-vat-rates]: European Commission — EU VAT Rates by Member State (January 2024 update). Taxation and Customs Union portal: https://taxation-customs.ec.europa.eu/taxation/vat/eu-vat-rates_en

[^ccr-2013]: Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013, SI 2013/3134 — https://www.legislation.gov.uk/uksi/2013/3134/contents

[^crd-2011]: Directive 2011/83/EU of the European Parliament and of the Council of 25 October 2011 on consumer rights — https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32011L0083

[^crd-modernisation]: Directive (EU) 2019/2161 of 27 November 2019 (Omnibus / Modernisation Directive) — https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32019L2161

[^cdc-brazil]: Lei 8.078 de 11 de setembro de 1990 — Código de Defesa do Consumidor — https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm

[^arl-california]: California Business and Professions Code §17600–17606 — Automatic Renewal Law — https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=17600

[^wayfair]: South Dakota v. Wayfair, Inc., 585 U.S. ___ (2018) — https://www.supremecourt.gov/opinions/17pdf/17-494_j4el.pdf

[^icms-106]: Convênio ICMS 106/2017 (Brazilian digital goods ICMS) — https://www.confaz.fazenda.gov.br/legislacao/convenios/2017/cv106_17

[^oss-2021]: European Commission OSS/IOSS information portal — https://taxation-customs.ec.europa.eu/taxation/vat/businesses/vat-one-stop-shop-oss_en

[^eu-vat-directive-art58]: Council Directive 2006/112/EC, Art. 58 (place of supply, telecommunications/broadcasting/electronic services) as amended by Directive 2017/2455/EU — https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32006L0112

[^eu-reg-1042-2013]: EU VAT Implementing Regulation 1042/2013, Art. 24b (evidence of customer location for electronic services) — https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32013R1042

[^stripe-tax-docs]: Stripe Tax documentation — https://stripe.com/docs/tax

[^stripe-tax-codes]: Stripe Tax codes reference — https://stripe.com/docs/tax/tax-codes

[^hmrc-701-30]: HMRC VAT Notice 701/30 "Education and vocational training" — https://www.gov.uk/guidance/vat-on-education-and-vocational-training-notice-70130

[^hmrc-vat-mtd]: HMRC VAT Notice 700/22 "Making Tax Digital for VAT" — https://www.gov.uk/guidance/check-when-a-business-must-follow-the-rules-for-making-tax-digital-for-vat

---

*End of Section 3 — Consumer Law & Tax*
*Drafted: 2026-04-19*
*Status: Wave 1 draft — consolidated by Plan 17-06*
*Next: Plan 17-06 extracts REQ-CONS-*/REQ-TAX-STRIPE-* into Phase 18 checklist and preserves the activate-at-monetization marker on §3.2*


---

<!-- source: sections/04-ai-act-and-accessibility.md -->
<a id="section-4"></a>
# Section 4 — Emerging Regulation: EU AI Act + Accessibility

**Scope:** Two distinct regulatory surfaces, grouped here because both are "emerging" and both produce Phase 18 implementation obligations.

**AI Act scope widening (per CONTEXT):** The roadmap Success Criterion 5 references "EU AI Act disclosure for WhisperX content." This section covers BOTH (a) WhisperX audio-to-text transcription output AND (b) Claude-generated lesson content (vocab entries, grammar explanations, translations, verse interpretations, mnemonics, kanji breakdowns). LLM-generated lessons are the larger AI surface by far and therefore the primary disclosure-obligation driver.

**Accessibility scope (per CONTEXT decision):** The question of whether kitsubeat legally qualifies as e-commerce under the European Accessibility Act (EAA, Directive 2019/882) is lawyer-flagged — implementation is the WCAG 2.1 AA technical standard either way, so the checklist here targets AA unconditionally.

---

## 4.1 EU AI Act — Applicability & Enforcement Timeline

### Statutory Reference

**Regulation (EU) 2024/1689** of the European Parliament and of the Council of 13 June 2024 laying down harmonised rules on artificial intelligence (Artificial Intelligence Act). Published in the Official Journal of the European Union, OJ L 2024/1689, 12.7.2024.[^4-1]

The AI Act entered into force on 1 August 2024 (Art. 113(1)[^4-2]).

### kitsubeat's Role Under the AI Act

The AI Act applies to providers (Art. 3(3)) and deployers (Art. 3(4)) of AI systems. kitsubeat operates in both capacities:

- **Deployer of GPAI (General-Purpose AI):** kitsubeat calls Anthropic's Claude API to generate lesson content. Claude is a General-Purpose AI model within the meaning of Art. 3(63). kitsubeat — as the entity that integrates Claude into a product offered to users — is a **deployer** under Art. 28.
- **Deployer of an AI system (WhisperX):** kitsubeat uses the WhisperX audio-transcription model to produce time-aligned transcripts of copyrighted audio. WhisperX is an AI system under Art. 3(1). kitsubeat is a deployer of that system.
- **Whether kitsubeat is also a "provider":** Under Art. 3(3), a deployer becomes a provider if it modifies an existing AI system's intended purpose or makes substantial changes before placing output in service. The Verse Coverage Agent (Phase 1) pipelines WhisperX output through validation and rewriting steps. This is likely sufficient modification to make kitsubeat a **co-provider** for WhisperX-derived transcripts. `🚩 LAWYER-REQUIRED {#lawyer-ai-02} — confirm provider vs. deployer classification under Art. 3(3) for modified WhisperX pipeline output.`

### Enforcement Timeline (Art. 113)

The AI Act uses a phased applicability schedule. All dates below are per Art. 113.[^4-2]

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

**Regulation (EU) 2024/1689, Article 50(2):** Deployers of AI systems that generate or manipulate image, audio, video or text output "which is made public" must disclose that the content has been artificially generated or manipulated, "in an appropriate, timely and clear manner."[^4-3]

kitsubeat publishes WhisperX-generated transcripts (time-aligned furigana + romaji overlays, verse-level lyric text) on the public song pages. This is output "made public" — Art. 50(2) applies.

### The "Human Review" Exception Analysis

Art. 50(2) final paragraph provides an exception where content "has undergone a process of human review or editorial control, and a natural or legal person bears editorial responsibility for the content."[^4-3]

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

**REQ-AI-WHISPER-03:** Machine-readable disclosure — Art. 50(2) requires marking "in a marked format detectable as artificially generated." The EU AI Office has not yet published technical specification guidance.[^4-4] Proposed interim implementation: add `data-ai-generated="true"` and `data-ai-model="whisperx"` attributes to the verse container element. C2PA-style provenance metadata is not required at this stage but should be monitored. `🚩 LAWYER-REQUIRED {#lawyer-ai-01} — confirm whether DOM data-attributes satisfy Art. 50(2) machine-readable requirement once EU AI Office technical guidance is published.`

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

Same Art. 50(2) analysis as §4.2, applied to the Claude lesson content surface.[^4-3]

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

Art. 53 obligations — training-data summaries, copyright policy transparency, model cards — apply to **providers** of GPAI models.[^4-5] This means Anthropic (for Claude) and the WhisperX authors (for the open-weights model). kitsubeat is a **deployer**, not a GPAI provider, and has no Art. 53 obligations.

However, as a responsible deployer, kitsubeat SHOULD:
- Link to Anthropic's AI transparency documentation in the Privacy/About copy
- Confirm Anthropic's GPAI transparency disclosures are published (required from 2025-08-02 per Art. 113)

**REQ-AI-LITERACY-01:** Privacy/AI Policy page MUST contain a reference to Anthropic's model transparency page and Claude's usage policies, so users can understand the upstream AI system's nature.

### Art. 4 — AI Literacy

Art. 4 (effective 2025-02-02) requires deployers to "ensure, to their best extent, a sufficient level of AI literacy of their staff and persons dealing with the operation of AI systems on their behalf."[^4-6]

For a solo operator, this means:
- Document in SOPs which AI systems are in use, their outputs, and how outputs are validated
- The Song Ingestion SOP (Phase 17 → Song Ingestion SOP document) should explicitly include an AI-literacy gate: operator must understand what WhisperX outputs and what Claude generates before approving song ingestion

**REQ-AI-LITERACY-02:** The Song Ingestion SOP MUST include a documented AI-literacy acknowledgement step: operator confirms they understand that (a) WhisperX produces AI-generated transcripts, (b) Claude produces AI-generated lesson content, (c) both require human review per Gate 5–6 before publishing.

### Risk Classification — kitsubeat Is NOT High-Risk

The AI Act Annex III lists high-risk AI system categories. The education-related category (Annex III §5) covers AI systems "intended to be used for the purpose of determining access to, or assigning persons to, educational and vocational training institutions; for evaluating learning outcomes of persons in educational and vocational training institutions."[^4-7]

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

The European Accessibility Act (EAA), Directive (EU) 2019/882 of the European Parliament and of the Council on the accessibility requirements for products and services[^4-8], requires specified services to comply with WCAG 2.1 AA (or equivalent harmonized standard) from **28 June 2025**.

Services covered by the EAA include, among others: e-commerce services, banking services, transport services, audiovisual media services, and electronic communications.

### Applicability Question (Lawyer-Flagged)

🚩 LAWYER-REQUIRED {#lawyer-eaa-01} EAA applicability — is kitsubeat a "provider of an e-commerce service" under Directive (EU) 2019/882 Art. 2(3)? The EAA defines e-commerce services broadly as "any service provided at a distance, by electronic means and at the individual request of a consumer." kitsubeat's subscription/payment tier (Phase 19 onward) appears to satisfy this definition. However:

- Is the **free beta** (no e-commerce transaction) in scope? Directive Recital 28 suggests it covers "services for remuneration" — free-beta phase may be out of scope until payments activate.
- Does the **digital-educational-content** nature (language learning app) fall within a specific EAA category (audiovisual media? e-learning?) rather than e-commerce?
- If in scope: EAA requires publication of an Accessibility Statement, conformity documentation, and cooperation with market surveillance authorities — these are administrative obligations beyond the technical WCAG checklist.

**Implementation baseline (WCAG 2.1 AA per §4.5) is the same regardless of EAA applicability.** The §4.5 checklist should be implemented fully whether or not the EAA administrative obligations apply. The lawyer-flag is to determine whether the administrative obligations (Accessibility Statement publication, conformity assessment, market surveillance cooperation) attach.

Directive citation: Directive (EU) 2019/882 of the European Parliament and of the Council of 17 April 2019.[^4-8]

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

[^4-1]: Regulation (EU) 2024/1689 of the European Parliament and of the Council of 13 June 2024 laying down harmonised rules on artificial intelligence and amending Regulations (EC) No 300/2008, (EU) No 167/2013, (EU) No 168/2013, (EU) 2018/858, (EU) 2018/1139 and (EU) 2019/2144 and Directives 2014/90/EU, (EU) 2016/797 and (EU) 2020/1828 (Artificial Intelligence Act). OJ L, 2024/1689, 12.7.2024. https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=OJ:L_2024_1689

[^4-2]: Regulation (EU) 2024/1689, Article 113 — "Entry into force and application." Phased application schedule: Art. 5 and 10 apply 6 months after entry into force; GPAI provisions apply 12 months after entry into force; most provisions apply 24 months after entry into force; Annex I and Annex III high-risk system provisions apply 36 months after entry into force.

[^4-3]: Regulation (EU) 2024/1689, Article 50 — "Transparency obligations for providers and deployers of certain AI systems." Art. 50(2): "Deployers of an AI system that generates or manipulates image, audio or video content constituting a deep fake shall disclose that the content has been artificially generated or manipulated. Deployers of an AI system that generates or manipulates text which is published with the purpose of informing the public on matters of public interest shall disclose that the text has been artificially generated or manipulated." Note: the "public interest" qualifier in Art. 50(1) applies to text specifically; lyric-learning content may not be "public interest" text in the political/news sense, but disclosure remains the defensible posture regardless. `🚩 LAWYER-REQUIRED {#lawyer-ai-01} — confirm whether Art. 50(2) "matters of public interest" qualifier applies to educational/cultural language-learning content or whether it applies only to political/news content.`

[^4-4]: EU AI Office — guidance on Art. 50 technical implementation of "marked format" for machine-readable AI disclosure. As of 2026-04-19, the EU AI Office has not published binding technical specifications for machine-readable disclosure under Art. 50(2). The C2PA (Coalition for Content Provenance and Authenticity) standard is the leading industry proposal. Monitor: https://www.c2pa.org and https://digital-strategy.ec.europa.eu/en/policies/ai-office

[^4-5]: Regulation (EU) 2024/1689, Article 53 — "Obligations for providers of general-purpose AI models." Applies to providers of GPAI models, including requirements to prepare technical documentation, copyright compliance summary, and training-data summary. Anthropic (as provider of Claude) is subject to Art. 53 obligations effective 2025-08-02.

[^4-6]: Regulation (EU) 2024/1689, Article 4 — "AI literacy." "Providers and deployers of AI systems shall take measures to ensure, to their best extent, a sufficient level of AI literacy of their staff and other persons dealing with the operation and use of AI systems on their behalf, having regard to their technical knowledge, experience, education and training and the context the AI systems are to be used in, and having regard to the persons or groups of persons on whom the AI systems are to be used." Effective 2025-02-02 per Art. 113.

[^4-7]: Regulation (EU) 2024/1689, Annex III §5 — "Education and vocational training": "(a) AI systems intended to be used for the purpose of determining access to or assigning persons to educational and vocational training institutions at all levels of education; (b) AI systems intended to be used for the purpose of assessing students in educational and vocational training institutions and for assessing participants in tests commonly required for admission to educational institutions or to obtain professional qualifications."

[^4-8]: Directive (EU) 2019/882 of the European Parliament and of the Council of 17 April 2019 on the accessibility requirements for products and services (European Accessibility Act). OJ L 151, 7.6.2019, p. 70–115. https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32019L0882. EAA Art. 2(3) on e-commerce services and Art. 32 on transposition deadline (28 June 2025 for member state compliance).

---

*Section 4 — EU AI Act + Accessibility — drafted 2026-04-19*
*REQ-AI-* IDs: 12 total (WHISPER-01–04, LESSON-01–06, LITERACY-01–02)*
*REQ-A11Y-* IDs: 50 total (REQ-A11Y-01 through REQ-A11Y-49, with REQ-A11Y-13b as supplementary)*
*🚩 Lawyer flags: 4 ({#lawyer-ai-01}, {#lawyer-ai-02}, {#lawyer-ai-03}, {#lawyer-eaa-01})*
*Authored independently in Wave 1 — for consolidation by Plan 17-06 Wave 2*


---

<!-- source: sections/05-age-gating-aadc.md -->
<a id="section-5"></a>
# Section 5 — Age Gating & Minor-User Protection

**Scope & posture (from CONTEXT.md):** Anime-music-learner demographics include a large 13–17 cohort. kitsubeat designs for them from day one rather than geo-age-gate them out. This section delivers (a) the full ICO Age Appropriate Design Code analysis, (b) a concrete 13+ signup gate with parental-awareness flow, (c) field-level privacy defaults for minor accounts, and (d) LGPD / CCPA minors-interaction rules.

**Explicitly out of scope per CONTEXT:** Full COPPA (US <13) analysis — CCPA's <13 opt-in rule covers v1 implicitly. Age verification via document upload or credit-card check — not in scope for a free beta (too intrusive for the benefit).

---

## 5.1 AADC Applicability to kitsubeat

The **UK ICO Age Appropriate Design Code** (AADC, colloquially "Children's Code") is statutory guidance issued under **Data Protection Act 2018 s.123** (DPA 2018). It applies to "information society services" (ISS) that are **likely to be accessed by children** (persons under 18 in UK law).

**Canonical citation:** https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/

### Applicability Test

The Code sets out four non-exhaustive indicators that an ISS is "likely to be accessed by children":

1. **Target audience includes children** — kitsubeat's explicit onboarding targets anime fans and Japanese learners. Anime fandom has a well-documented 13–17 demographic, and Japanese language learning in secondary school is common globally. **Finding: YES.**

2. **Actual user base includes children** — Even if kitsubeat does not target under-18s, the ICO is clear that a service "likely accessed by children" in practice is in scope even if that was not the intent. With no age gate at launch, children WILL access kitsubeat. **Finding: YES.**

3. **Service features, content, or subject matter appeal to children** — Anime music, gamification (streaks, levels, star ratings, sound effects), Japanese vocabulary games. All are popular with 13–17 users. **Finding: YES.**

4. **Service is free at point of use** — Free access lowers barriers to child access. **Finding: YES (amplifier).**

**Conclusion:** kitsubeat is in scope for the AADC. The Code applies from day one.

### Geographic Scope

- **ICO can enforce UK-GDPR** on the processing of UK residents' data regardless of where the processor is located. As a UK sole trader, kitsubeat is directly subject to ICO enforcement.
- **EU-GDPR Art. 8** sets the age of digital consent at 16 for information society services, but allows member states to lower it to 13. Several member states (including UK via DPA 2018 s.9) have lowered it to 13.
- **Practical result:** The AADC is the most comprehensive children's code applicable to kitsubeat and sets the design floor. Compliance with the AADC substantially covers EU-GDPR Art. 8 obligations as well.

---

## 5.2 AADC 15 Standards — Per-Standard Analysis

The AADC sets 15 standards. Each is analyzed below for kitsubeat applicability, with Phase 18 obligations and `REQ-MINORS-NN` requirement IDs.

**Citation format used throughout:** ICO AADC, Standard N — [standard name] — https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/

---

### Standard 1 — Best Interests of the Child

**ICO AADC, Standard 1.** Applicable.

The best interests of the child must be a primary consideration in all design and development decisions. This mirrors the UN Convention on the Rights of the Child, Art. 3.

**kitsubeat analysis:** The gamification system (Phase 12) introduces streaks, level-ups, star ratings, confetti, and sound/haptic celebrations. These features MUST NOT exploit children using dark patterns that prioritize engagement over wellbeing.

**Obligations:**

- `REQ-MINORS-01` — Streak mechanics MUST NOT use loss-aversion dark patterns. The Phase 12 design already mandates one auto-applied grace day per week (CONTEXT.md §Phase 12). This aligns with Standard 1 — document this alignment explicitly in the Privacy Policy / terms for minors.
- `REQ-MINORS-02` — Sound and haptic celebrations MUST be configurable (off by default for first-time users; user opt-in). Phase 12 Success Criterion 4 requires configurable sound/haptic. This aligns — Phase 18 must verify the setting is accessible from the minor account's profile page.
- `REQ-MINORS-03` — Any "save your streak" or urgency prompt copy MUST NOT use dark-pattern language (countdown timers implying permanent loss, social shaming comparisons). Language review required at Phase 18 before launch.

**Verdict: Applicable — design partially aligned already; Phase 18 must verify and document.**

---

### Standard 2 — Data Protection Impact Assessments (DPIAs)

**ICO AADC, Standard 2.** Applicable. 🚩 LAWYER-REQUIRED {#lawyer-minors-01}

The Code requires a DPIA before any processing of children's data where that processing is "likely to result in a high risk" to children's rights and freedoms. DPA 2018 s.57 requires DPIAs for high-risk processing. UK-GDPR Art. 35 specifies that processing of special categories of data or processing on a large scale triggers a DPIA. Processing children's data at scale may independently trigger Art. 35(3)(b) (systematic monitoring of publicly accessible areas) or Art. 35(3)(a) (automated decision-making with significant effects).

**kitsubeat analysis:** kitsubeat processes learning-progress data (FSRS review history, exercise accuracy, streak records, vocabulary mastery). This is not special-category data under Art. 9, but it IS processing of children's data that includes automated profiling (FSRS algorithm producing next-review dates and difficulty estimates). AADC Standard 2 requires a DPIA before launch.

**Obligations:**

- `REQ-MINORS-04` — Complete a DPIA for the processing of children's personal data before Phase 18 launches. Document the processing, risks, and mitigations.
- `REQ-MINORS-05` — If the DPIA concludes that processing is "high risk" under Art. 35, kitsubeat must consult with the ICO under Art. 36 (prior consultation) before proceeding. This is a launch gate.

🚩 LAWYER-REQUIRED {#lawyer-minors-01} — **ICO prior consultation trigger:** Is kitsubeat's FSRS-based personalized learning profile processing of children's data "high risk" under UK-GDPR Art. 35(3)(a) (automated decision-making with significant effects)? FSRS produces "next review date" per vocabulary item — arguably this is automated profiling, not a "significant effect" on the child (learning efficiency is not a legal, financial, or similarly significant effect). However, the conservative reading of the ICO's own guidance on "significant effects" is expansive. A lawyer must confirm whether Art. 36 prior consultation with the ICO is triggered, since this is a launch blocker if the answer is yes.

**Verdict: Applicable — Phase 18 gate. DPIA must be completed. Lawyer consultation required on Art. 36 trigger.**

---

### Standard 3 — Age-Appropriate Application

**ICO AADC, Standard 3.** Applicable.

The service must provide age-appropriate experiences. The Code allows two approaches: (a) design the entire service for the youngest likely user (conservative design floor), or (b) implement age bands with differentiated experiences.

**kitsubeat analysis:** kitsubeat has NO age-inappropriate content in v1. There is no chat, no UGC (user-generated content), no direct messaging, no advertising, no social features beyond optional public leaderboards. The entire product is a language-learning tool consuming licensed-compatible content.

**Decision:** kitsubeat adopts **approach (a): design for the youngest likely user (13+) for v1**. This means the entire product experience meets the AADC design floor without requiring age-band differentiation. The only age-specific adaptations are the default privacy settings (§5.4) and the signup-gate awareness flow (§5.3).

**Obligation:**

- `REQ-MINORS-06` — Document the "design for 13+" posture in the Privacy Policy and the DPIA. Confirm this posture is appropriate whenever a new feature is added (e.g., if chat or social features ship, re-evaluate age bands).

**Verdict: Applicable — v1 posture chosen (design for 13+). Future feature additions trigger re-evaluation.**

---

### Standard 4 — Transparency

**ICO AADC, Standard 4.** Applicable.

Privacy information must be provided in language children can understand. The standard requires that privacy notices be written in plain language appropriate to the child's age and presented prominently at the point of use.

**kitsubeat analysis:** The standard adult Privacy Policy will use legal language. A child-friendly version is required.

**Obligations:**

- `REQ-MINORS-07` — Publish a **child-friendly Privacy Summary** alongside the adult Privacy Policy. Target reading level: UK Year 8 (age 12–13). Cover: what data is collected, why, how long it is kept, who sees it, how to delete the account, and a promise that no advertising profiling occurs.
- `REQ-MINORS-08` — The child-friendly summary must be linked from the signup form's teen awareness step (§5.3.3) and from the minor account's settings page.

**Verdict: Applicable — Phase 18 must publish child-friendly Privacy Summary.**

---

### Standard 5 — Detrimental Use of Data

**ICO AADC, Standard 5.** Applicable.

Data about children must not be used in ways that ICO evidence or broad consensus shows are detrimental to their wellbeing. The ICO specifically calls out behavioural advertising and inferred emotional-state profiling as detrimental uses.

**kitsubeat analysis:** FSRS learning-progress data is used solely for scheduling reviews — this is the core service function, not detrimental. There is no advertising, no emotional inference, and no third-party data sharing for commercial purposes.

**Obligations:**

- `REQ-MINORS-09` — **No behavioural advertising** based on minor users' learning patterns, ever. This must be an absolute product constraint, not a policy promise that can later be overridden by a business decision.
- `REQ-MINORS-10` — Analytics event payloads for minor accounts must scrub any behavioural data that could constitute a "profile" if combined with third-party ad-tech data. PostHog/Sentry ingestion for minors must be reduced to functional-only events (see §5.4: `analytics.behavioral_events_enabled = false` for minors).

**Verdict: Applicable — no current detrimental use; analytics scrubbing for minors required (§5.4).**

---

### Standard 6 — Policies and Community Standards

**ICO AADC, Standard 6.** Applicable.

The service must apply its own published policies, including community standards, consistently for children. Services must not quietly deviate from published policies for minor accounts.

**kitsubeat analysis:** kitsubeat is a single-player learning tool with no community features in v1. There are no community standards to enforce. However, the T&Cs and Privacy Policy must apply uniformly — there must be no "minor track" that has worse privacy protections than published.

**Obligation:**

- `REQ-MINORS-11` — T&Cs and Privacy Policy must explicitly state that minors are covered and that the same (or stricter) privacy standards apply to them. No clause may authorize less protection for minor accounts than the published policy provides.

**Verdict: Applicable — policy consistency obligation. Phase 18 must ensure T&Cs cover minors explicitly.**

---

### Standard 7 — Default Settings

**ICO AADC, Standard 7.** Applicable — **CRITICAL.**

Services must default children to high-privacy settings. Privacy settings that are more protective must be the default for users identified as children. Children should not need to take any action to achieve a more private state.

**kitsubeat analysis:** This is the most operationally significant standard. The default privacy table (§5.4) is the direct implementation of Standard 7.

**Obligations:**

- `REQ-MINORS-12` — All settings in §5.4 tagged with "AADC Standard 7" must be set to the minor-specific default at account creation when the user's DOB indicates age < 18.
- `REQ-MINORS-13` — The system must re-evaluate a user's age status on their 18th birthday and send a notification advising of the account transition (§5.3.6). Until the 18th birthday, minor defaults persist even if the user attempts to change them to less-private values (where override is disallowed per §5.4).

**Verdict: Applicable — CRITICAL. Default settings table in §5.4 directly implements this standard.**

---

### Standard 8 — Data Minimisation

**ICO AADC, Standard 8.** Applicable — **CRITICAL.**

Only personal data that is strictly necessary for the service provided to the child may be collected. This is a more demanding application of the UK-GDPR Art. 5(1)(c) data minimisation principle specifically for children.

**kitsubeat analysis:** kitsubeat collects: email, password hash, date of birth (new, added for age-gating), display name (optional), learning progress data (FSRS states, exercise accuracy), and timezone (Phase 12). No location data, no device fingerprint, no ad-ID.

**Obligations:**

- `REQ-MINORS-14` — For minor accounts, the DOB field must be stored for the duration of the account (needed to enforce age-appropriate defaults and 18th-birthday transition). After the user turns 18, the DOB may be reduced to a boolean `is_adult_confirmed` if the user requests it, but the full DOB must be retained for the transition period.
- `REQ-MINORS-15` — No optional data fields (e.g., bio, external social links) may be collected from minor accounts unless strictly necessary for the service. If such fields exist, they must be hidden from the minor account creation form and profile settings.
- `REQ-MINORS-16` — Data retention for minor accounts after deletion must be minimized (7-day grace period vs 30-day adult default — see §5.4).
- `REQ-MINORS-17` — Error-logging systems (Sentry) must scrub user identifiers from minor account error reports. Only a pseudonymous session ID and release tag should be included (see §5.4: `sentry.user_context` for minors).

**Verdict: Applicable — CRITICAL. Retention and collection minimization per §5.4.**

---

### Standard 9 — Data Sharing

**ICO AADC, Standard 9.** Applicable.

Children's personal data must not be shared with third parties unless there is a compelling reason to do so. The standard specifically calls out sharing with advertisers, marketing platforms, and social networks as high risk.

**kitsubeat analysis:** kitsubeat's only third-party data processors are Sentry (error monitoring), PostHog (analytics), and Supabase/PostgreSQL (database hosting). There are no advertising or marketing platform integrations.

**Obligations:**

- `REQ-MINORS-18` — Sentry and PostHog are acceptable processors for minor data under Standard 9, provided (a) they are listed in the Privacy Policy as data processors, (b) DPAs are signed with both, and (c) event payloads for minors are scrubbed per §5.4.
- `REQ-MINORS-19` — Any future integration (e.g., analytics tools, A/B testing platforms, marketing email providers) must be assessed against Standard 9 before adding to the codebase. This is a Phase 18 operational constraint, not a one-time check.
- `REQ-MINORS-20` — No sharing of minor users' progress data externally (e.g., leaderboard APIs, social sharing integrations) unless the minor explicitly opts in per the `user.share_progress_external` setting in §5.4.

**Verdict: Applicable — current processor setup is acceptable; scrubbing required; future integrations gated.**

---

### Standard 10 — Geolocation

**ICO AADC, Standard 10.** Partially applicable — low risk.

Geolocation services must be turned OFF by default for children. If geolocation is used, it must return to the off state after each session.

**kitsubeat analysis:** kitsubeat does NOT use geolocation (precise GPS or IP-to-coordinates). It uses **timezone** (a coarse, user-selectable setting from Phase 12) for scheduling daily review reminders. Timezone is not geolocation in the AADC sense — it does not reveal a user's physical location with precision.

**Obligation:**

- `REQ-MINORS-21` — The Privacy Policy must explicitly distinguish between timezone (used for scheduling; not precise location) and geolocation (not collected). This distinction must be documented in the child-friendly Privacy Summary as well.
- `REQ-MINORS-22` — If any future feature uses IP-based geolocation (e.g., for content region-locking), Standard 10 requires it to be OFF by default for minors and reset after each session.

**Verdict: Partially applicable — timezone ≠ geolocation. Current behavior compliant. Privacy Policy must confirm. Future geolocation features require Standard 10 compliance.**

---

### Standard 11 — Parental Controls

**ICO AADC, Standard 11.** Not applicable (v1) — with re-evaluation trigger.

If a service provides parental controls or monitoring tools, children must be clearly informed when parental monitoring is active. The service must make it obvious to the child that they are being supervised.

**kitsubeat analysis:** kitsubeat has NO parental-controls features in v1. There is no family-account feature, no parental dashboard, no monitoring mode. Therefore Standard 11 does not apply to v1.

**Re-evaluation trigger:** If kitsubeat ever ships "family plans," "parent dashboard," or any monitoring/reporting feature for parents, Standard 11 becomes immediately applicable. Phase 18 must document this as a design constraint for those future features.

**Obligation:**

- `REQ-MINORS-23` — Document the absence of parental-controls features in the Privacy Policy (briefly). State the re-evaluation trigger. If family-plan features are ever added, Standard 11 compliance must be verified before shipping.

**Verdict: Not applicable in v1. Re-evaluation required before shipping parental-control features.**

---

### Standard 12 — Profiling

**ICO AADC, Standard 12.** Applicable — **requires justification.**

Profiling must be OFF by default for children. The Code defines profiling as any automated processing of personal data to evaluate, analyse, or predict aspects of natural persons. Under this definition, the FSRS algorithm (which infers vocabulary difficulty and schedules reviews based on a user's accuracy history) is a form of profiling.

**kitsubeat analysis:** FSRS-driven review-queue personalization is profiling in the strict AADC sense. However, the ICO explicitly acknowledges that profiling that is **functionally necessary for the service** — i.e., the service cannot operate without it — may be justified even for children. FSRS personalization is the entire point of kitsubeat's spaced-repetition engine. Disabling it for minors would make the service non-functional for them.

**Obligations:**

- `REQ-MINORS-24` — Publish a **profiling justification** in the Privacy Policy explaining that FSRS-based scheduling is essential to the service's educational function and does not produce any decision with legal or similarly significant effects on the user.
- `REQ-MINORS-25` — No OTHER profiling (inferred emotional state, engagement scoring for advertising, demographic inference) is performed on minor accounts, even as a future analytics feature.

**Verdict: Applicable — FSRS profiling is justified as functionally necessary. Justification must be published. No other profiling permitted for minors.**

---

### Standard 13 — Nudge Techniques

**ICO AADC, Standard 13.** Applicable.

Services must not use nudge techniques — design choices that exploit cognitive biases — to lead children to provide more data, weaken privacy settings, or engage in ways contrary to their interests.

**kitsubeat analysis:** The gamification layer (Phase 12) uses streaks, level-ups, and encouragement mechanics. These are engagement features. The AADC distinguishes between engagement features that serve the user's interest (learning motivation) and dark patterns that exploit cognitive biases (artificial urgency, loss aversion, social shaming).

**Obligations:**

- `REQ-MINORS-26` — Streak "save your streak" prompts MUST NOT use countdown timers or messaging that implies permanent loss with artificial urgency. Copy must be informational ("You have a grace day available today") not alarmist ("Your streak DIES tonight — act NOW!").
- `REQ-MINORS-27` — Gamification sound and haptic celebrations MUST be configurable (opt-in/out), per Phase 12 Success Criterion 4. The first-launch default must be off for all users; the Phase 18 onboarding wizard must let users choose before they hear any sound.
- `REQ-MINORS-28` — No "share your progress to unlock a feature" prompts that nudge minors to share data as the price of accessing functionality. Progress sharing (§5.4: `user.share_progress_external`) must always be a positive opt-in with no feature-gating tied to the share action.

**Verdict: Applicable — gamification design aligned by Phase 12 CONTEXT; Phase 18 must verify copy and confirm no dark patterns in the shipped UX.**

---

### Standard 14 — Connected Toys and Devices

**ICO AADC, Standard 14.** Not applicable.

This standard covers IoT devices, smart toys, and connected hardware. kitsubeat is a web application with no hardware component.

**Verdict: Not applicable. No action required.**

---

### Standard 15 — Online Tools

**ICO AADC, Standard 15.** Applicable.

Services must provide age-appropriate tools enabling children to exercise their data rights under UK-GDPR (access, rectification, erasure, restriction, portability, objection). These tools must be accessible and understandable by children.

**kitsubeat analysis:** Phase 18 will implement a Data Subject Access Request (DSAR) flow. Standard 15 requires this flow to be usable by the minor users themselves.

**Obligations:**

- `REQ-MINORS-29` — The Phase 18 DSAR implementation must include a child-accessible path: clear language ("Delete my account and all my data"), confirmation step without legal jargon, and confirmation email in plain language.
- `REQ-MINORS-30` — Account deletion (data erasure) must be accessible directly from the minor account's profile settings without requiring email correspondence with support (self-service erasure).
- `REQ-MINORS-31` — Data export (portability) must be available to all users including minors. Export format: JSON or CSV. The export must be triggered from the profile settings page.

**Verdict: Applicable — Phase 18 DSAR implementation must be accessible to minor users. Self-service erasure required.**

---

### AADC Standards Summary Table

| # | Standard | Applicable? | Phase 18 Gate? | REQ IDs |
|---|----------|-------------|----------------|---------|
| 1 | Best interests of the child | YES | Verify streak/gamification copy | REQ-MINORS-01 to 03 |
| 2 | DPIAs | YES | YES — DPIA required before launch | REQ-MINORS-04 to 05 |
| 3 | Age-appropriate application | YES | Document posture | REQ-MINORS-06 |
| 4 | Transparency | YES | Child-friendly Privacy Summary | REQ-MINORS-07 to 08 |
| 5 | Detrimental use of data | YES | Analytics scrubbing | REQ-MINORS-09 to 10 |
| 6 | Policies and community standards | YES | T&Cs cover minors | REQ-MINORS-11 |
| 7 | Default settings | YES — CRITICAL | §5.4 table implementation | REQ-MINORS-12 to 13 |
| 8 | Data minimisation | YES — CRITICAL | Retention + collection limits | REQ-MINORS-14 to 17 |
| 9 | Data sharing | YES | Processor DPAs + scrubbing | REQ-MINORS-18 to 20 |
| 10 | Geolocation | PARTIAL | Privacy Policy clarification | REQ-MINORS-21 to 22 |
| 11 | Parental controls | NO (v1) | Re-eval trigger documented | REQ-MINORS-23 |
| 12 | Profiling | YES | Justification published | REQ-MINORS-24 to 25 |
| 13 | Nudge techniques | YES | Streak/gamification copy review | REQ-MINORS-26 to 28 |
| 14 | Connected toys | NO | N/A | — |
| 15 | Online tools | YES | Self-service DSAR for minors | REQ-MINORS-29 to 31 |

---

## 5.3 Signup Gate — 13+ with Parental-Awareness Flow

A concrete UX specification for the kitsubeat signup form age gate.

### Step 1 — Add Date of Birth Field

Add a required `date_of_birth` field (ISO 8601 date: `YYYY-MM-DD`) to the signup form. Store the full DOB (not just a computed age integer) so the system can:

- Enforce age-appropriate defaults continuously (age is recomputed server-side at each login)
- Trigger the 18th-birthday transition automatically (background job or login-time check)
- Handle edge cases (user signed up on their 13th birthday, timezone-correct birthday computation)

`REQ-MINORS-GATE-01` — Signup form MUST include a required `date_of_birth` field stored as ISO 8601 date in the `users` table.

`REQ-MINORS-GATE-02` — DOB must be stored as a full date, not a derived age integer or boolean, to enable future age re-evaluation.

### Step 2 — Client-Side + Server-Side Age Evaluation Rules

**Client-side (UX, not security gate — server validates authoritatively):**

1. **Age < 13 (under 13):**
   - Block signup immediately with the message: *"kitsubeat isn't available for under-13s. This helps keep our community safe. You can come back on your 13th birthday."*
   - Do NOT store the attempted email address beyond the rate-limit short-term log (max 24-hour retention for rate-limiting purposes, then purge).
   - Do NOT suggest that the user change their DOB to circumvent the gate.

   `REQ-MINORS-GATE-03` — Under-13 signup attempts MUST be blocked at the UI layer with the prescribed copy. No account creation, no email storage beyond 24h rate-limit log.

2. **Age 13–17 (minor):**
   - Proceed to the teen signup awareness step (Step 3 below).
   - Do NOT require parental consent. Under **DPA 2018 s.9** (UK transposition of UK-GDPR Art. 8), the age of digital consent for information society services in the UK is **13**. Users aged 13+ can consent on their own behalf for ISS services.
   - EU member-state variance: several member states set the age of digital consent at **16** (France under the CNIL framework, Germany under BDSG §8, Italy, Croatia, Lithuania, and others). Since kitsubeat accepts global signups, the safest posture is 13+ self-consent under UK-GDPR PLUS a parental-awareness flow (Step 3) that is non-statutory but mitigates the EU 13–15 exposure without requiring hard parental consent.

   `REQ-MINORS-GATE-04` — Users aged 13–17 MUST pass through the teen signup awareness step before account creation. Parental consent is NOT required but a parental-awareness option MUST be presented.

3. **Age ≥ 18 (adult):**
   - Proceed to standard signup without the teen awareness step.
   - Apply adult default settings on account creation.

   `REQ-MINORS-GATE-05` — Users aged 18+ proceed to standard signup. Minor-specific defaults do NOT apply.

**Server-side validation:** The server MUST re-validate the submitted DOB independently of the client. Client-side age checks are UX only; the server creates the account and applies defaults based on its own age calculation.

`REQ-MINORS-GATE-06` — Server MUST re-validate submitted DOB and apply minor defaults if age < 18 at account creation time, regardless of client-side state.

### Step 3 — Teen Signup Awareness Step (§5.3.3)

Displayed to 13–17 year old signups after the main form and before account creation.

**Heading:** *"You're under 18. Here's what you should know:"*

**Child-friendly privacy summary bullets (maximum 6, plain language):**
1. We collect your email address and the learning progress you make in the app.
2. Your profile is **private by default** — no one can see your activity unless you choose to share it.
3. We **never show you advertising** and we never sell your data.
4. You can **delete your account** and all your data at any time from the profile settings page.
5. We use a learning algorithm to schedule your practice — this means the app remembers what you found difficult and helps you practice it more.
6. If you have questions, a parent or guardian can contact us at [support email].

**Acknowledgment checkbox:** "I understand." (required — account creation is blocked until checked)

**Parental-awareness nudge:**
- *"Want a parent or guardian to know you're joining?"*
- Button: `[Send them a summary]` — opens a mailto: pre-filled with the child-friendly Privacy Summary link and a short plain-language message. This is OPTIONAL. It is NOT a parental-consent gate.
- Button: `[Copy link to share]` — copies a URL to the child-friendly Privacy Summary page.

`REQ-MINORS-GATE-07` — Teen awareness step MUST display the 6 child-friendly bullets, the acknowledgment checkbox, and the optional parental-awareness nudge buttons before account creation.

`REQ-MINORS-GATE-08` — The parental-awareness nudge MUST be optional. Account creation MUST NOT be gated on whether the minor triggers the parental notification.

### Step 4 — Spoof-Resistance Posture

No strong age verification (document upload, credit-card check, or third-party age-verification API) is implemented. Rationale:

- Per AADC Standard 3, proportionate age-assurance measures only — a free educational app with no age-inappropriate content warrants proportionate measures.
- A DOB field + acknowledgment checkbox is proportionate for a low-risk learning service (ICO guidance on age assurance confirms this for low-risk services).
- If kitsubeat ever adds high-risk features (private messaging, UGC community, explicit content), re-evaluate age verification against the ICO's Age Assurance consultation guidance.

`REQ-MINORS-GATE-09` — Age assurance via DOB self-declaration + awareness acknowledgment is the v1 standard. Document the proportionality rationale in the DPIA (REQ-MINORS-04).

🚩 LAWYER-REQUIRED {#lawyer-minors-02} — **Age assurance proportionality review:** If the ICO issues formal age-assurance standards under the Online Safety Act 2023 that apply to learning services before kitsubeat's Phase 18 launch, the proportionality rationale in the DPIA must be updated. Lawyer should confirm at pre-launch review whether stronger age assurance is required given the ICO's evolving position.

### Step 5 — Repeat-Signup Prevention

If a user fails the under-13 gate:

- Do NOT set a persistent browser cookie that could prevent a legitimate 13-year-old on a shared device from signing up.
- Use a rate-limiter on the email address (if provided) — if the same email is used in multiple failed <13 attempts in 24 hours, add an exponential backoff delay.
- The AADC does NOT require hard device-level lockouts. Rate-limit only.

`REQ-MINORS-GATE-10` — Failed under-13 signup attempts MUST use email-based rate-limiting (exponential backoff). No persistent device-level cookie lockout.

### Step 6 — 18th Birthday Transition

On the user's 18th birthday:

- A background job (or login-time check) detects that the user's age has crossed the 18 threshold.
- Send an email: *"You've turned 18 — your kitsubeat account settings have been updated. Some features that were restricted for under-18 accounts are now available. Visit your settings page to review your privacy preferences."*
- Unlock the minor-restricted settings (e.g., `user.marketing_email_opt_in` can now be enabled, `user.allow_leaderboards` default changes). Do NOT automatically flip these settings to adult defaults — the user must make a conscious choice to change them.
- The transition is logged in the audit trail.

`REQ-MINORS-GATE-11` — The system MUST detect 18th-birthday transitions and send the prescribed email notification. Minor defaults persist until the user explicitly changes them after turning 18.

`REQ-MINORS-GATE-12` — The 18th-birthday transition must NOT automatically change any setting to a less-private value. It only UNLOCKS the ability for the user to make that change.

---

## 5.4 Minor Account Defaults — Field-Level Spec

The following table specifies the default values applied to accounts where the user's age < 18 at account creation, compared to adult defaults. Each row cites the AADC standard that mandates the minor default.

| Setting | Adult default | Minor (<18) default | Minor override allowed? | AADC Standard | Rationale |
|---------|---------------|---------------------|-------------------------|---------------|-----------|
| `user.profile_visibility` | `public` | `private` | Yes — via confirmation dialog explaining visibility implications | Standard 7 | High-privacy default mandatory for minors |
| `user.allow_leaderboards` | `true` | `false` | Yes — explicit opt-in with plain-language explanation | Standards 7, 13 | Leaderboard participation reveals comparative performance data; nudge risk |
| `user.marketing_email_opt_in` | `false` (GDPR default) | `false` AND opt-in disabled | NOT allowed (re-enabled at 18th birthday) | Standards 5, 9 | Marketing profiling of minors prohibited; UK-GDPR/AADC alignment |
| `user.push_notifications` | `false` (require explicit opt-in) | `false` | Yes — minor can opt in via browser permission prompt | Standards 13, 7 | Browser permission model already requires opt-in; not restricted further, but default confirmed off |
| `user.share_progress_external` | `false` | `false` | Yes — explicit opt-in, no feature-gating on share action | Standard 9 | Data sharing with third parties default-off for minors |
| `analytics.behavioral_events_enabled` | Cookie-consent-gated | `false` regardless of consent state | NOT allowed | Standards 5, 9 | Behavioral analytics on minors prohibited regardless of consent |
| `sentry.user_context` | Pseudonymous user ID + release tag | Release tag only (no user ID, no email, no session token) | NOT allowed (system-level, not user-configurable) | Standards 8, 9 | Minimisation: error logs for minors must not include identifiers |
| `subscription.parental_notice_required` | `false` | `true` (future checkout flow: show parental-awareness copy before any payment) | NOT allowed | Standards 11, 7 | Pre-payment parental awareness; note kitsubeat is free for v1 beta |
| `data.retention_days_after_deletion` | 30-day grace period | 7-day grace period | NOT allowed (system-level) | Standard 8 | Minimised retention for minor data post-deletion |

`REQ-MINORS-DEFAULT-01` — `user.profile_visibility` defaults to `private` for minor accounts. Override requires confirmation dialog.

`REQ-MINORS-DEFAULT-02` — `user.allow_leaderboards` defaults to `false` for minor accounts. Override requires explicit opt-in.

`REQ-MINORS-DEFAULT-03` — `user.marketing_email_opt_in` is locked to `false` for minor accounts and the opt-in UI is hidden. The lock lifts at the 18th birthday transition.

`REQ-MINORS-DEFAULT-04` — `user.push_notifications` defaults to `false` for all users (browser permission model). For minor accounts, this default is confirmed and must not be auto-prompted.

`REQ-MINORS-DEFAULT-05` — `user.share_progress_external` defaults to `false` for minor accounts. Override requires explicit opt-in with no feature-gating on the share action.

`REQ-MINORS-DEFAULT-06` — `analytics.behavioral_events_enabled` is `false` for minor accounts regardless of any consent signal. Phase 18's PostHog integration must check the minor flag before firing behavioral events.

`REQ-MINORS-DEFAULT-07` — `sentry.user_context` for minor accounts must be scrubbed to release-tag-only before transmission to Sentry. No user ID, email, or session token in error payloads for minors.

`REQ-MINORS-DEFAULT-08` — `subscription.parental_notice_required` is `true` for minor accounts. When payment features ship (Phase 22+), the checkout flow for minor accounts must include a parental-awareness interstitial.

`REQ-MINORS-DEFAULT-09` — `data.retention_days_after_deletion` for minor accounts is 7 days (vs 30 days for adults). The account deletion process must apply the shorter grace window when `is_minor = true` at deletion time.

**Implementation note for Phase 18:** The `users` table requires a computed or stored field `is_minor` (boolean, derived from DOB, recalculated at login or via background job). The settings table or a `user_minor_defaults` table stores the overrideable fields. The non-overrideable system-level settings (`analytics.behavioral_events_enabled`, `sentry.user_context`, `data.retention_days_after_deletion`) are enforced in code, not in the database.

---

## 5.5 LGPD + CCPA Minor Interactions

### LGPD (Brazil) — Minors

**Legal basis: LGPD Art. 14** (Lei 13.709/2018, Art. 14):

> "The processing of personal data of children and adolescents shall be carried out in the best interests of the child and adolescent, in accordance with this Law and with the specific legislation applicable."

Key LGPD distinctions:
- **Children** = under 12 years old (Brazilian law definition, distinct from UK/EU)
- **Adolescents** = 12–17 years old

Under **LGPD Art. 14 §1**: processing of **children's** (under 12) personal data requires specific, highlighted, informed consent from at least one parent or legal guardian. Adolescents (12–17) may in many contexts consent for themselves, but with heightened data minimization obligations.

**ANPD Resolution:** The Autoridade Nacional de Proteção de Dados (ANPD) issued **Resolution CD/ANPD No. 6/2023** (Resolução CD/ANPD 6/2023) on the protection of children and adolescents' personal data, specifying additional requirements including privacy risk assessment, specific consent formats, and restrictions on advertising-profiling of minors. This resolution entered into force in 2024.

**Applicability to kitsubeat:**

- kitsubeat's 13+ gate blocks all Brazilian signups under 13, satisfying LGPD Art. 14's parental-consent requirement for children (< 12).
- Brazilian adolescents aged 13–17 are covered by the teen signup awareness step (§5.3.3), which provides highlighted, informed disclosure in plain language — aligning with LGPD Art. 14 §1 for adolescents.
- ANPD Resolution CD/ANPD 6/2023 requires a privacy risk assessment for services processing minors' data — this aligns with the DPIA obligation under AADC Standard 2 (REQ-MINORS-04). A single combined DPIA/privacy risk assessment covers both.

`REQ-MINORS-BR-01` — The Privacy Policy must contain a LGPD Art. 14 disclosure section in Portuguese explaining the special protections for Brazilian users under 18 (adolescents) and confirming that users under 13 cannot register.

`REQ-MINORS-BR-02` — The DPIA (REQ-MINORS-04) must include a LGPD Art. 14 / ANPD Resolution CD/ANPD 6/2023 assessment section covering Brazilian minor users specifically.

`REQ-MINORS-BR-03` — If kitsubeat ever lowers the minimum age below 13, Brazilian users under 12 require parental consent under LGPD Art. 14 §1 — this is a hard legal gate, not just a UX change.

**Citations:**
- LGPD Art. 14: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- ANPD Resolution CD/ANPD 6/2023: https://www.gov.br/anpd/pt-br/

---

### CCPA / CPRA (California) — Minors

**Legal basis: California Civil Code §1798.120(c)** (CCPA as amended by CPRA):

> "A business shall not sell or share the personal information of a consumer if the business has actual knowledge that the consumer is less than 16 years of age, unless the consumer, in the case of consumers at least 13 and less than 16 years of age, or the consumer's parent or guardian, in the case of consumers less than 13 years of age, has affirmatively authorized the sale or sharing of the consumer's personal information."

Key CCPA/CPRA minors provisions:
- **Under 13:** Parental opt-in required for sale or sharing of personal information.
- **Ages 13–15:** Minor's own opt-in required for sale or sharing of personal information.
- **Sale/sharing defined:** Includes disclosure for cross-context behavioral advertising — NOT merely providing data to service processors.

**Applicability to kitsubeat:**

kitsubeat does NOT "sell" or "share" personal information under the CCPA/CPRA definition — there is no cross-context behavioral advertising, no data brokering, and no disclosure to third parties for commercial purposes beyond legitimate service processors. Therefore, the §1798.120(c) opt-in requirement is **not triggered** for kitsubeat's current data practices.

However, the CCPA/CPRA §1798.120(c) framework applies if kitsubeat's practices ever change to include:
- PostHog behavioral analytics in a configuration where PostHog uses the data for their own advertising purposes (check PostHog's DPA for "sale/share" status)
- Any ad-tech integration

**"Do Not Sell or Share" signal:** Under CPRA, businesses subject to CCPA must honor Global Privacy Control (GPC) signals as a "do not sell or share" opt-out. For minor users, this opt-out is implicit (minor default settings already reflect "do not sell or share"). The GPC signal implementation in Phase 18 must respect the minor flag and treat it as a permanent "do not sell or share" signal without requiring the minor to activate GPC themselves.

`REQ-MINORS-CA-01` — kitsubeat's current data practices do not trigger CCPA §1798.120(c) because no sale or sharing of minor personal data occurs. This must be documented in the Privacy Policy under the CCPA section.

`REQ-MINORS-CA-02` — Any future integration with ad-tech, behavioral analytics (in a "sale/share" configuration), or data brokers MUST be assessed for CCPA §1798.120(c) compliance before implementation. This is a Phase 18 operational constraint.

`REQ-MINORS-CA-03` — Phase 18's GPC signal handling must treat minor accounts as having a permanent "do not sell or share" preference, regardless of whether the user has activated GPC.

**Citations:**
- CCPA §1798.120(c): https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.120.&lawCode=CIV
- CPRA (Prop 24): https://oag.ca.gov/privacy/ccpa

---

## 5.6 Section Rollup

### Applicable Regimes + Phase 18 Location

| Regime | Primary Obligation | Phase 18 Implementation Location |
|--------|-------------------|----------------------------------|
| UK ICO AADC (all 15 standards) | DPIA before launch; default privacy settings for minors; child-friendly Privacy Summary | Privacy Policy, DSAR flow, signup form, settings schema |
| UK-GDPR / DPA 2018 s.9 | Age of digital consent = 13; DOB field required | Signup form, users table schema |
| EU-GDPR Art. 8 | Minors in high-consent-age member states (16+) are covered by parental-awareness flow | Teen awareness step in signup form |
| LGPD Art. 14 + ANPD Res. 6/2023 | LGPD-specific Privacy Policy section in Portuguese; DPIA must include LGPD assessment | Privacy Policy (PT), DPIA |
| CCPA §1798.120(c) | No sale/share of minor data; GPC treated as permanent "do not sell" for minors | PostHog config, GPC implementation |

### All REQ-MINORS Requirement IDs

**AADC Standards (REQ-MINORS-01 to 31):**
REQ-MINORS-01, REQ-MINORS-02, REQ-MINORS-03 (Standard 1 — best interests)
REQ-MINORS-04, REQ-MINORS-05 (Standard 2 — DPIA)
REQ-MINORS-06 (Standard 3 — age-appropriate application)
REQ-MINORS-07, REQ-MINORS-08 (Standard 4 — transparency)
REQ-MINORS-09, REQ-MINORS-10 (Standard 5 — detrimental use)
REQ-MINORS-11 (Standard 6 — policies)
REQ-MINORS-12, REQ-MINORS-13 (Standard 7 — default settings)
REQ-MINORS-14, REQ-MINORS-15, REQ-MINORS-16, REQ-MINORS-17 (Standard 8 — data minimisation)
REQ-MINORS-18, REQ-MINORS-19, REQ-MINORS-20 (Standard 9 — data sharing)
REQ-MINORS-21, REQ-MINORS-22 (Standard 10 — geolocation)
REQ-MINORS-23 (Standard 11 — parental controls)
REQ-MINORS-24, REQ-MINORS-25 (Standard 12 — profiling)
REQ-MINORS-26, REQ-MINORS-27, REQ-MINORS-28 (Standard 13 — nudge techniques)
REQ-MINORS-29, REQ-MINORS-30, REQ-MINORS-31 (Standard 15 — online tools)

**Signup Gate (REQ-MINORS-GATE-01 to 12):**
REQ-MINORS-GATE-01 through REQ-MINORS-GATE-12

**Minor Account Defaults (REQ-MINORS-DEFAULT-01 to 09):**
REQ-MINORS-DEFAULT-01 through REQ-MINORS-DEFAULT-09

**LGPD / Brazil (REQ-MINORS-BR-01 to 03):**
REQ-MINORS-BR-01, REQ-MINORS-BR-02, REQ-MINORS-BR-03

**CCPA / California (REQ-MINORS-CA-01 to 03):**
REQ-MINORS-CA-01, REQ-MINORS-CA-02, REQ-MINORS-CA-03

**Total REQ-MINORS IDs: 58**

### All Lawyer-Required Markers

| ID | Location | Issue |
|----|----------|-------|
| `{#lawyer-minors-01}` | §5.2 Standard 2 | Whether FSRS profiling of children's data triggers Art. 36 prior ICO consultation |
| `{#lawyer-minors-02}` | §5.3 Step 4 | Whether Online Safety Act 2023 age-assurance standards apply before Phase 18 launch |

---

## 5.7 Footnotes

[^aadc]: ICO Age Appropriate Design Code (Children's Code). Available at: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/

[^dpa2018-s123]: Data Protection Act 2018, s.123 — ICO Age Appropriate Design Code statutory basis. Available at: https://www.legislation.gov.uk/ukpga/2018/12/section/123

[^dpa2018-s9]: Data Protection Act 2018, s.9 — Age of digital consent for information society services in the UK set at 13. Available at: https://www.legislation.gov.uk/ukpga/2018/12/section/9

[^dpa2018-s57]: Data Protection Act 2018, s.57 — Data Protection Impact Assessments. Available at: https://www.legislation.gov.uk/ukpga/2018/12/section/57

[^ukgdpr-art8]: UK-GDPR Article 8 — Conditions applicable to child's consent in relation to information society services. Available at: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/

[^ukgdpr-art35]: UK-GDPR Article 35 — Data Protection Impact Assessment. Available at: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/

[^ukgdpr-art36]: UK-GDPR Article 36 — Prior consultation with ICO. Available at: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/prior-consultation/

[^lgpd-art14]: LGPD (Lei 13.709/2018), Art. 14 — Processing of children and adolescents' personal data. Available at: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm

[^anpd-res6]: ANPD Resolution CD/ANPD No. 6/2023 — Protection of children and adolescents' personal data. Available at: https://www.gov.br/anpd/pt-br/

[^ccpa-1798120]: California Civil Code §1798.120(c) — Opt-in for sale/share of minor personal information. Available at: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.120.&lawCode=CIV

[^cpra]: California Privacy Rights Act (Prop 24, 2020) — CCPA amendments including CPRA. Available at: https://oag.ca.gov/privacy/ccpa

[^eu-gdpr-art8]: EU-GDPR Art. 8 — Digital consent age (16, with member-state lowering to 13). Available at: https://gdpr-info.eu/art-8-gdpr/

[^osa2023]: Online Safety Act 2023 — Age assurance provisions. Available at: https://www.legislation.gov.uk/ukpga/2023/50/contents

---

*Section 5 complete. Authored: 2026-04-19. Consolidated by Plan 17-06.*


---


<a id="lawyer-index"></a>
## Pre-Monetization Legal Review

**Use this section as the lawyer-brief when counsel is engaged before monetization, before any 🔴-rated feature ships, or before Phase 21 (anime clips) is planned. Every item below is a question where this document identified a boundary this author should not cross without legal advice.**

| ID | Topic | Concern (one-sentence) | Section | Urgency |
|----|-------|------------------------|---------|---------|
| {#lawyer-ai-01} | EU AI Act | confirm whether kitsubeat's Gate 6 quality review constitutes "editorial control" sufficient to trigger Art. | [§4](#section-4) | Pre-launch |
| {#lawyer-ai-02} | EU AI Act | confirm provider vs. | [§4](#section-4) | Pre-launch |
| {#lawyer-eaa-01} | Accessibility / EAA applicability | EAA applicability — is kitsubeat a "provider of an e-commerce service" under Directive (EU) 2019/882 Art. | [§4](#section-4) | Pre-launch |
| {#lawyer-lyrics-01} | Lyrics licensing & WhisperX derivative | WhisperX forced-alignment produces time-stamped lyric datasets from copyrighted compositions. | [§1](#section-1) | Pre-launch |
| {#lawyer-minors-01} | Age gating / AADC | ICO AADC, Standard 2.** Applicable. | [§5](#section-5) | Pre-launch |
| {#lawyer-minors-02} | Age gating / AADC | Age assurance proportionality review:** If the ICO issues formal age-assurance standards under the Online Safety Act 2023 that apply to learning services before kitsubeat's Phase 18 launch, the proportionality rationale in the DPIA must be updated. | [§5](#section-5) | Pre-launch |
| {#lawyer-priv-01} | Privacy & data protection | confirm Supabase region configuration (EU vs US) before Phase 18 launch and verify the applicable DPA and transfer mechanism covers UK-to-US or EU-to-US transfer depending on the region selected. | [§2](#section-2) | Pre-launch |
| {#lawyer-priv-02} | Privacy & data protection | confirm retention period under UK tax law and whether Stripe's DPA covers the transfer mechanism \| `third_party_auth` (Stripe) \| | [§2](#section-2) | Pre-launch |
| {#lawyer-priv-03} | Privacy & data protection | confirm exemption status and register before Phase 18 launch. | [§2](#section-2) | Pre-launch |
| {#lawyer-priv-04} | Privacy & data protection | confirm analytics approach before Phase 18 wires consent \| | [§2](#section-2) | Pre-launch |
| {#lawyer-priv-05} | Privacy & data protection | kitsubeat must designate an EU Art. | [§2](#section-2) | Pre-launch |
| {#lawyer-priv-06} | Privacy & data protection | confirm analytics lawful basis with reference to the specific Phase 15 tool choice and EDPB's evolving guidance (August 2025 cutoff: EDPB Opinion 8/2024 on legitimate interests is relevant). | [§2](#section-2) | Pre-launch |
| {#lawyer-priv-07} | Privacy & data protection | verify current ANPD regulatory resolution for breach notification timelines; Resolution CD/ANPD 4/2023 should be checked for amendments before Phase 18 launch. | [§2](#section-2) | Pre-launch |
| {#lawyer-priv-08} | Privacy & data protection | Brazilian law cross-border transfer mechanisms are less mature than GDPR SCCs. | [§2](#section-2) | Pre-launch |
| {#lawyer-priv-09} | Privacy & data protection | confirm whether kitsubeat (as a micro-entity under ANPD guidance) is exempt from formal DPO appointment, or whether the founder can self-appoint; verify current ANPD position on sole trader / micro-entity exemption.[^2-18] | [§2](#section-2) | Pre-launch |
| {#lawyer-cons-01} | Consumer law / withdrawal rights | Brazil CDC digital-subscription scope:** Whether Art. | [§3](#section-3) | Pre-monetization |
| {#lawyer-tax-01} | Tax & indirect tax | Brazil digital-services tax at monetization:** ICMS 106/2017 vs ISS ambiguity for UK-based digital subscription sellers; foreign-provider registration rules (Secretaria da Receita Federal); intersection with CIDE. | [§3](#section-3) | Pre-monetization |
| {#lawyer-yt-01} | YouTube embed ToS | Confirm that gating lesson features (not video playback) behind a subscription does not constitute "selling access to" YouTube API data within the meaning of §IV(D). | [§1](#section-1) | Pre-monetization |
| {#lawyer-anime-01} | Anime clip liability (Phase 21 gate) | Phase 21 cannot begin planning without legal consultation on anime-clip use. | [§1](#section-1) | Pre-Phase-21 |
| {#lawyer-ai-03} | EU AI Act | re-examine Annex III §5 high-risk classification if kitsubeat introduces any formal language-certification or assessment product.` | [§4](#section-4) | Monitor |
| {#lawyer-cons-02} | Consumer law / withdrawal rights | EU member-state transposition variances for digital-content waiver wording (particularly DE, FR, NL) — review when EU market > 20% of revenue. | [§3](#section-3) | Monitor |

### How to brief a lawyer

Take this table plus the cited sections plus the document's `scope_summary` front-matter. A 1-hour consultation can realistically resolve 3–5 rows depending on complexity. **Priority order:** Pre-launch items before Phase 18 ships → Pre-monetization items before first paid transaction → Pre-Phase-21 before v4.0 anime-clip planning → Monitor items during routine legal check-ins.

---


<a id="phase-18-checklist"></a>
## Phase 18 Requirements Checklist

**Phase 18 implements against this list line-by-line. Each item has an ID, the obligation text (as emitted by the source section), the source section anchor, a risk rating, and an activation trigger.**

> **Note on Copyright (§1):** The Copyright & Content-Rights section emits lawyer-flag markers rather than prescriptive `REQ-*` obligations, because copyright compliance is "don't cross these boundaries" rather than "implement these controls." Phase 18 obligations for copyright are captured implicitly: keep YouTube embed behavior conformant (see §1.1), do not host or remix lyrics substrate beyond what LRCLIB and WhisperX produce (see §1.2), and gate Phase 21 anime-clip work on `{#lawyer-anime-01}` resolution.

#### Group 1 — Copyright obligations (lawyer-flag only — see note above)

| # | REQ ID | Obligation | Source | Rating | Activate when |
|---|--------|------------|--------|--------|---------------|
| — | (no prescriptive REQs) | Copyright compliance is negative-boundary (see lawyer-flags yt-01, lyrics-01, anime-01) | [§1](#section-1) | 🔴 | Continuously |

#### Group 2 — Privacy & Data Protection (65 items)

| # | REQ ID | Obligation | Source | Rating | Activate when |
|---|--------|------------|--------|--------|---------------|
| 1 | REQ-PRIV-BR-BREACH-01 | Notify ANPD and data subjects within a "reasonable period" (LGPD Art. 48 — exact timeframe left to regulation; ANPD Resolution CD/ANPD No. 4/2023 specifies 3 working days for preliminary notificati... | [§2](#section-2) | 🔴 | Phase 18 launch |
| 2 | REQ-PRIV-BR-BREACH-02 | Document all breaches including unreported ones; ANPD may request breach records. | [§2](#section-2) | 🔴 | Phase 18 launch |
| 3 | REQ-PRIV-BR-BREACH-03 | If ANPD breach notification triggered simultaneously with ICO and EU DPA notification, coordinate timing — aim for all three within 72 hours. | [§2](#section-2) | 🔴 | Phase 18 launch |
| 4 | REQ-PRIV-BR-DPO-01 | Name a DPO (encarregado) contact in the Brazilian-facing Privacy Policy section; this can be the founder initially pending legal advice; publish contact details as required by LGPD Art. 41, §1. | [§2](#section-2) | 🟡 | Phase 18 launch |
| 5 | REQ-PRIV-BR-DSAR-01 | Same privacy@ email channel handles LGPD requests. | [§2](#section-2) | 🟡 | Phase 18 launch |
| 6 | REQ-PRIV-BR-DSAR-02 | Response window: 15 days from request receipt (LGPD Art. 19(I)). This is stricter than GDPR's 1 month. REQ-PRIV-BR-DSAR-03 — Phase 18 workflow must be calibrated to the 15-day LGPD deadline when th... | [§2](#section-2) | 🟡 | Phase 18 launch |
| 7 | REQ-PRIV-BR-DSAR-03 | REQ-PRIV-BR-DSAR-02: Response window: 15 days from request receipt (LGPD Art. 19(I)). This is stricter than GDPR's 1 month. REQ-PRIV-BR-DSAR-03 — Phase 18 workflow must be calibrated to the 15-day ... | [§2](#section-2) | 🟡 | Phase 18 launch |
| 8 | REQ-PRIV-BR-DSAR-04 | No fee for standard requests. | [§2](#section-2) | 🟡 | Phase 18 launch |
| 9 | REQ-PRIV-BR-DSAR-05 | If request is denied, provide reasons in simplified language; data subject may file complaint with ANPD. | [§2](#section-2) | 🟡 | Phase 18 launch |
| 10 | REQ-PRIV-BR-DSAR-06 | Requests can be confirmed immediately; data provision can be within 15 days. | [§2](#section-2) | 🟡 | Phase 18 launch |
| 11 | REQ-PRIV-BR-LI-01 | LGPD-specific note: Art. 7(IX) legitimate interests under LGPD requires a "legitimate interests assessment" to be documented and made available to the ANPD on request. This is more rigorous than th... | [§2](#section-2) | 🟡 | Phase 18 launch |
| 12 | REQ-PRIV-BR-POLICY-01 | Privacy Policy must include Brazilian Portuguese section disclosing: ANPD contact, DPO contact, lawful bases for all processing, transfer mechanisms, all Art. 18 rights, 15-day response window | [§2](#section-2) | 🟡 | Phase 18 launch |
| 13 | REQ-PRIV-BR-XFER-01 | Execute ANPD-compatible standard contractual clauses with Supabase and Vercel for BR → US transfers (or confirm alternative mechanism with legal advice). | [§2](#section-2) | 🟡 | Phase 18 launch |
| 14 | REQ-PRIV-BR-XFER-02 | Document transfer mechanism for all processors in the Privacy Policy (Brazilian Portuguese section). | [§2](#section-2) | 🟡 | Phase 18 launch |
| 15 | REQ-PRIV-CA-APPLICABILITY-01 | Phase 18 should include a CCPA-formatted "California Privacy Notice" section in the Privacy Policy even though the thresholds are not yet met; remove or activate based on annual threshold review. | [§2](#section-2) | 🟡 | Phase 18 launch |
| 16 | REQ-PRIV-CA-BREACH-01 | Notify California residents without unreasonable delay (§ 1798.82(a)). No specific hour deadline — interpreted as as soon as reasonably practical. Best practice: within 72 hours (aligns with GDPR). | [§2](#section-2) | 🔴 | Phase 18 launch |
| 17 | REQ-PRIV-CA-BREACH-02 | If breach affects 500+ California residents: notify the California AG (submit via AG website). | [§2](#section-2) | 🔴 | Phase 18 launch |
| 18 | REQ-PRIV-CA-BREACH-03 | Notification must meet content requirements of § 1798.82(d) (nature of breach, information compromised, contact info, credit monitoring info if applicable). | [§2](#section-2) | 🔴 | Phase 18 launch |
| 19 | REQ-PRIV-CA-CONTRACT-01 | Ensure all processor agreements (Supabase, Vercel, Clerk, Stripe) contain the CCPA service-provider language: they must not sell/share the data, use it only for specified purposes, and comply with ... | [§2](#section-2) | 🟡 | Phase 18 launch |
| 20 | REQ-PRIV-CA-DNSS-01 | "Do Not Sell or Share My Personal Information": kitsubeat does not sell or share personal information for cross-context behavioural advertising as of the beta. If PostHog or other analytics involve... | [§2](#section-2) | 🟡 | Phase 18 launch |
| 21 | REQ-PRIV-CA-DSAR-01 | Same privacy@ email channel handles CCPA requests once applicable. | [§2](#section-2) | 🟡 | Phase 18 launch |
| 22 | REQ-PRIV-CA-DSAR-02 | Response window: 45 calendar days from receipt (§ 1798.145(b)(1)). Can extend by one additional 45-day period for complex/numerous requests — notify consumer within first 45-day period.[^2-21] | [§2](#section-2) | 🟡 | Phase 18 launch |
| 23 | REQ-PRIV-CA-DSAR-03 | Must verify identity before disclosing or deleting; use 2-step verification (email confirmation + account ownership confirmation) for authenticated users. | [§2](#section-2) | 🟡 | Phase 18 launch |
| 24 | REQ-PRIV-CA-DSAR-04 | No fee for standard requests. Up to 2 requests per year free. | [§2](#section-2) | 🟡 | Phase 18 launch |
| 25 | REQ-PRIV-CA-DSAR-05 | If applicable: provide a "Data Download" tool (satisfies "specific pieces of information" right + portability). | [§2](#section-2) | 🟡 | Phase 18 launch |
| 26 | REQ-PRIV-CA-POLICY-01 | Privacy Policy must include: categories of PI collected, purposes, third parties, consumer rights, how to submit requests, contact details | [§2](#section-2) | 🟡 | Phase 18 launch |
| 27 | REQ-PRIV-COOKIE-01 | Reject button must be as prominent and easy to use as Accept button (EDPB + CNIL enforcement position; UK ICO 2023 cookie sweep findings) | [§2](#section-2) | 🟡 | Phase 18 launch |
| 28 | REQ-PRIV-COOKIE-02 | No pre-ticked boxes for non-essential categories | [§2](#section-2) | 🟡 | Phase 18 launch |
| 29 | REQ-PRIV-COOKIE-03 | Granular consent per category (minimum: Essential / Analytics / Marketing — only Essential applies at v3.0 if no marketing cookies) | [§2](#section-2) | 🟡 | Phase 18 launch |
| 30 | REQ-PRIV-COOKIE-04 | Consent management accessible from footer on every page (not just on first visit) | [§2](#section-2) | 🟡 | Phase 18 launch |
| 31 | REQ-PRIV-COOKIE-05 | Store consent record with timestamp, version, and categories in cookie_consent_record table (§2.1) — this is itself a required data retention activity for compliance evidence | [§2](#section-2) | 🟡 | Phase 18 launch |
| 32 | REQ-PRIV-COOKIE-06 | No analytics scripts loaded before consent is granted (script-gating — Phase 18 implements after Phase 15 selects the tool) | [§2](#section-2) | 🟡 | Phase 18 launch |
| 33 | REQ-PRIV-COOKIE-07 | Honour Global Privacy Control (GPC) signal for California residents (once CCPA thresholds met) | [§2](#section-2) | 🟡 | Phase 18 launch |
| 34 | REQ-PRIV-COOKIE-08 | Cookie Policy must list every cookie name, purpose, duration, and first-party/third-party classification | [§2](#section-2) | 🟡 | Phase 18 launch |
| 35 | REQ-PRIV-EU-BREACH-01 | 72 hours from becoming aware (Art. 33(1)). Same deadline as UK-GDPR.[^2-12] | [§2](#section-2) | 🔴 | Phase 18 launch |
| 36 | REQ-PRIV-EU-BREACH-02 | Data subjects notified without undue delay if high risk (Art. 34) — same threshold. | [§2](#section-2) | 🔴 | Phase 18 launch |
| 37 | REQ-PRIV-EU-BREACH-03 | Document all breaches including unreported ones (Art. 33(5)). | [§2](#section-2) | 🔴 | Phase 18 launch |
| 38 | REQ-PRIV-EU-DSAR-01 | Same privacy@ email channel as UK-GDPR; single channel for both regimes. | [§2](#section-2) | 🟡 | Phase 18 launch |
| 39 | REQ-PRIV-EU-DSAR-02 | Response window: 1 calendar month from receipt (Art. 12(3)). Same as UK-GDPR; clock ticks from receipt, not from identity verification. | [§2](#section-2) | 🟡 | Phase 18 launch |
| 40 | REQ-PRIV-EU-DSAR-03 | Extension by 2 further months for complex/numerous requests — notify within first month. | [§2](#section-2) | 🟡 | Phase 18 launch |
| 41 | REQ-PRIV-EU-DSAR-04 | Provide data in commonly used, machine-readable format for portability requests (Art. 20). | [§2](#section-2) | 🟡 | Phase 18 launch |
| 42 | REQ-PRIV-EU-DSAR-05 | No fee for standard requests. Reasonable fee for manifestly unfounded or excessive requests. | [§2](#section-2) | 🟡 | Phase 18 launch |
| 43 | REQ-PRIV-EU-DSAR-06 | If relying on Art. 27 representative, the representative must be named as a contact point in the Privacy Policy. | [§2](#section-2) | 🟡 | Phase 18 launch |
| 44 | REQ-PRIV-EU-POLICY-01 | Privacy Policy must comply with EU-GDPR Art. 13 disclosures; note these substantially overlap with UK-GDPR Art. 13 — one combined Privacy Policy can serve both with jurisdiction-specific sections | [§2](#section-2) | 🟡 | Phase 18 launch |
| 45 | REQ-PRIV-EU-POLICY-02 | Name EU Art. 27 representative and contact details in Privacy Policy | [§2](#section-2) | 🟡 | Phase 18 launch |
| 46 | REQ-PRIV-EU-XFER-01 | Verify Supabase DPF certification before Phase 18; document the transfer mechanism in the Privacy Policy. | [§2](#section-2) | 🟡 | Phase 18 launch |
| 47 | REQ-PRIV-EU-XFER-02 | Verify Vercel DPF certification or SCC availability for EU → US transfer. | [§2](#section-2) | 🟡 | Phase 18 launch |
| 48 | REQ-PRIV-EU-XFER-03 | Verify Clerk DPF certification or SCCs. | [§2](#section-2) | 🟡 | Phase 18 launch |
| 49 | REQ-PRIV-EU-XFER-04 | For Stripe (future): verify DPF or SCCs. | [§2](#section-2) | 🟡 | Phase 18 launch |
| 50 | REQ-PRIV-UK-BREACH-01 | Deadline to authority: REQ-PRIV-UK-BREACH-01 — 72 hours after becoming aware of the breach (UK-GDPR Art. 33(1)). If not possible within 72 hours, report as soon as possible with reasons for delay.[... | [§2](#section-2) | 🔴 | Phase 18 launch |
| 51 | REQ-PRIV-UK-BREACH-02 | Deadline to data subjects: REQ-PRIV-UK-BREACH-02 — Without undue delay if breach is likely to result in high risk to the rights and freedoms of natural persons (Art. 34). No specific hour/day limit... | [§2](#section-2) | 🔴 | Phase 18 launch |
| 52 | REQ-PRIV-UK-BREACH-03 | Record-keeping: REQ-PRIV-UK-BREACH-03 — All breaches must be documented including those not reported to ICO (Art. 33(5)). Maintain a breach log. | [§2](#section-2) | 🔴 | Phase 18 launch |
| 53 | REQ-PRIV-UK-DSAR-01 | Intake channel: REQ-PRIV-UK-DSAR-01 — Phase 18 must provide a dedicated email address (e.g. privacy@kitsubeat.com) for Data Subject Access Requests, linked from the Privacy Policy and footer. | [§2](#section-2) | 🟡 | Phase 18 launch |
| 54 | REQ-PRIV-UK-DSAR-02 | Identity verification: REQ-PRIV-UK-DSAR-02 — Verify identity before releasing data; for registered users, Clerk/Supabase authenticated session is sufficient. For unauthenticated requests, require c... | [§2](#section-2) | 🟡 | Phase 18 launch |
| 55 | REQ-PRIV-UK-DSAR-03 | Response window: REQ-PRIV-UK-DSAR-03 — Respond within 1 calendar month of receipt (UK-GDPR Art. 12(3)). If complex or numerous requests, can extend by further 2 months — must notify the data subjec... | [§2](#section-2) | 🟡 | Phase 18 launch |
| 56 | REQ-PRIV-UK-DSAR-04 | Format: REQ-PRIV-UK-DSAR-04 — Provide data electronically where the request was made electronically (ICO guidance). Suggested format: JSON export covering all tables in §2.1 keyed to the user_id. | [§2](#section-2) | 🟡 | Phase 18 launch |
| 57 | REQ-PRIV-UK-DSAR-05 | Fee: REQ-PRIV-UK-DSAR-05 — No fee for standard requests (Art. 12(5)). Charge reasonable fee or refuse manifestly unfounded/excessive requests only. | [§2](#section-2) | 🟡 | Phase 18 launch |
| 58 | REQ-PRIV-UK-DSAR-06 | Documentation: REQ-PRIV-UK-DSAR-06 — Log all SARs received, response date, and outcome for accountability purposes (Art. 5(2) accountability principle). | [§2](#section-2) | 🟡 | Phase 18 launch |
| 59 | REQ-PRIV-UK-POLICY-01 | Publish Privacy Policy meeting UK-GDPR Art. 13 disclosure requirements (identity of controller, contact, purposes, lawful bases, rights, retention periods, third-party processors, transfer mechanisms) | [§2](#section-2) | 🟡 | Phase 18 launch |
| 60 | REQ-PRIV-UK-POLICY-02 | Register with ICO and obtain registration number before processing data from beta users | [§2](#section-2) | 🟡 | Phase 18 launch |
| 61 | REQ-PRIV-UK-POLICY-03 | Include ICO registration number in Privacy Policy | [§2](#section-2) | 🟡 | Phase 18 launch |
| 62 | REQ-PRIV-UK-XFER-01 | Supabase — database + auth. Default US region (aws-east-1) unless configured otherwise. UK → US transfer. Supabase has signed the UK International Data Transfer Agreement (UK IDTA) with its custome... | [§2](#section-2) | 🟡 | Phase 18 launch |
| 63 | REQ-PRIV-UK-XFER-02 | Vercel — edge network. Multi-region including US. UK → US transfer. Vercel provides a UK IDTA addendum.[^2-7] REQ-PRIV-UK-XFER-02 — Verify Vercel DPA covers UK → US transfer via UK IDTA or adequacy... | [§2](#section-2) | 🟡 | Phase 18 launch |
| 64 | REQ-PRIV-UK-XFER-03 | Clerk — auth provider (US-based). UK → US transfer. Verify Clerk DPA for UK IDTA. REQ-PRIV-UK-XFER-03 — Confirm Clerk UK IDTA before Phase 18 launch. | [§2](#section-2) | 🟡 | Phase 18 launch |
| 65 | REQ-PRIV-UK-XFER-04 | Stripe (future) — US-based. UK adequacy decision does not cover US; UK IDTA required. REQ-PRIV-UK-XFER-04 — Verify Stripe UK IDTA (Stripe publishes a DPA with IDTA addendum). | [§2](#section-2) | 🟡 | Phase 18 launch |

#### Group 3 — Consumer Law (21 items)

| # | REQ ID | Obligation | Source | Rating | Activate when |
|---|--------|------------|--------|--------|---------------|
| 66 | REQ-CONS-BR-01 | REQ-CONS-BR-01 — At monetization, kitsubeat must adopt a conservative Brazil-compliant refund policy: offer 7-day right to cancel for Brazilian consumers, absent a confirmed judicial consensus on t... | [§3](#section-3) | 🟡 | At monetization |
| 67 | REQ-CONS-BR-02 | REQ-CONS-BR-02 — Brazilian consumer-facing T&Cs must include the CDC Art. 49 withdrawal notice in Portuguese. | [§3](#section-3) | 🟡 | At monetization |
| 68 | REQ-CONS-CA-01 | REQ-CONS-CA-01 — ARL auto-renewal disclosures must appear at checkout "above the fold" (clear and conspicuous) before the "Subscribe" button. Phase 18 implements. | [§3](#section-3) | 🟡 | At monetization |
| 69 | REQ-CONS-CA-02 | REQ-CONS-CA-02 — Post-purchase order confirmation email must include full ARL disclosure: price, renewal period, how to cancel. Phase 18 email template implements. | [§3](#section-3) | 🟡 | At monetization |
| 70 | REQ-CONS-CA-03 | REQ-CONS-CA-03 — Cancellation must be possible via a "simple mechanism" at the online account interface or a published cancellation URL (§17602(b)). A "cancel by email only" policy does not comply. | [§3](#section-3) | 🟡 | At monetization |
| 71 | REQ-CONS-CA-04 | REQ-CONS-CA-04 — If the subscription price changes, a new ARL disclosure must be sent and a new acknowledgement obtained before the higher price takes effect. | [§3](#section-3) | 🟡 | At monetization |
| 72 | REQ-CONS-CA-05 | REQ-CONS-CA-05 — This disclosure must appear "clear and conspicuous" in the checkout flow and be reproduced verbatim in the order confirmation email per CA ARL §17602(a) and §17602(c). | [§3](#section-3) | 🟡 | At monetization |
| 73 | REQ-CONS-EU-01 | REQ-CONS-EU-01 — kitsubeat's checkout must comply with CRD obligations for any EU-resident consumer. Cannot geographically limit sign-ups to avoid CRD. | [§3](#section-3) | 🟡 | At monetization |
| 74 | REQ-CONS-EU-02 | REQ-CONS-EU-02 — Phase 18 checkout must display Art. 6(1) information before contract conclusion. This overlaps significantly with REQ-CONS-UK-02. | [§3](#section-3) | 🟡 | At monetization |
| 75 | REQ-CONS-EU-03 | REQ-CONS-EU-03 — 14-day withdrawal right applies identically to UK 14-day cancellation right for EU consumers. Checkout and order confirmation must reflect this. | [§3](#section-3) | 🟡 | At monetization |
| 76 | REQ-CONS-EU-04 | REQ-CONS-EU-04 — Digital-content waiver at checkout must satisfy Art. 16(m): prior express consent + acknowledgement of loss of withdrawal right. Combined with REQ-CONS-UK-04, a single well-drafted... | [§3](#section-3) | 🟡 | At monetization |
| 77 | REQ-CONS-EU-05 | REQ-CONS-EU-05 — Free beta signup that collects personal data triggers CRD Art. 6 pre-contract information obligations in the EU. Phase 18 privacy notice and signup flow must satisfy Art. 6 even fo... | [§3](#section-3) | 🟡 | At monetization |
| 78 | REQ-CONS-EU-06 | REQ-CONS-EU-06 — Transposition fragmentation note: the CRD is maximum-harmonisation for core withdrawal rules, but member states have some implementation latitude on remedies and B2B exclusions. ki... | [§3](#section-3) | 🟡 | At monetization |
| 79 | REQ-CONS-EU-07 | REQ-CONS-UK-07 / REQ-CONS-EU-07 — Refund processing must occur within 14 days of cancellation notice (SI 2013/3134 Reg. 34; CRD Art. 13(1)). | [§3](#section-3) | 🟡 | At monetization |
| 80 | REQ-CONS-UK-01 | REQ-CONS-UK-01 — kitsubeat must confirm it is a B2C distance seller and treat all individual consumers as entitled to CCR rights. | [§3](#section-3) | 🟡 | At monetization |
| 81 | REQ-CONS-UK-02 | REQ-CONS-UK-02 — Checkout page must present all Reg. 13 information before the consumer clicks "confirm purchase". Phase 18 implements. | [§3](#section-3) | 🟡 | At monetization |
| 82 | REQ-CONS-UK-03 | REQ-CONS-UK-03 — Checkout and order confirmation email must include the right to cancel and a cancellation mechanism (support email or cancel form) valid for 14 days from purchase. | [§3](#section-3) | 🟡 | At monetization |
| 83 | REQ-CONS-UK-04 | REQ-CONS-UK-04 — Digital-content waiver checkbox: unticked by default, express wording, recorded with timestamp. Mandatory at checkout for any digital product that begins supply immediately. | [§3](#section-3) | 🟡 | At monetization |
| 84 | REQ-CONS-UK-05 | REQ-CONS-UK-05 — If the consumer does NOT tick the waiver checkbox, supply must be deferred until the 14-day window closes, OR the trader must honour the refund right unconditionally. | [§3](#section-3) | 🟡 | At monetization |
| 85 | REQ-CONS-UK-06 | REQ-CONS-UK-06 — Evidence of waiver consent must be stored server-side linked to the transaction ID for a minimum of 6 years (UK limitation period for contract claims — Limitation Act 1980 s. 5). | [§3](#section-3) | 🟡 | At monetization |
| 86 | REQ-CONS-UK-07 | REQ-CONS-UK-07 / REQ-CONS-EU-07 — Refund processing must occur within 14 days of cancellation notice (SI 2013/3134 Reg. 34; CRD Art. 13(1)). | [§3](#section-3) | 🟡 | At monetization |

#### Group 4 — Tax (activate at monetization) (33 items)

| # | REQ ID | Obligation | Source | Rating | Activate when |
|---|--------|------------|--------|--------|---------------|
| 87 | REQ-TAX-BR-01 | REQ-TAX-BR-01 — Before monetising to Brazilian users, seek Brazilian tax counsel on whether ICMS (state-level), ISS (municipal), or CIDE applies to kitsubeat's subscription model as offered to Braz... | [§3](#section-3) | 🟡 | At monetization |
| 88 | REQ-TAX-BR-02 | REQ-TAX-BR-02 — At beta (no revenue), no Brazilian tax obligation is triggered. Activate this review at Phase 19. | [§3](#section-3) | 🟡 | At monetization |
| 89 | REQ-TAX-EU-01 | REQ-TAX-EU-01 — kitsubeat must register for non-Union OSS in one EU member state (recommendation: Ireland) before making any B2C digital-service sales to EU consumers. Registration is via the chose... | [§3](#section-3) | 🟡 | At monetization |
| 90 | REQ-TAX-EU-02 | REQ-TAX-EU-02 — Stripe Tax must be configured to detect EU consumer location and apply the correct member-state VAT rate. The Stripe Tax product tax code for digital services handles this automatic... | [§3](#section-3) | 🟡 | At monetization |
| 91 | REQ-TAX-EU-03 | REQ-TAX-EU-03 — OSS registration must occur before the first EU paid transaction. Do not sell to EU consumers without being on OSS or direct-registered in each EU state. | [§3](#section-3) | 🟡 | At monetization |
| 92 | REQ-TAX-EU-04 | REQ-TAX-EU-04 — Stripe-generated receipts must include the kitsubeat VAT number (once registered), the applicable VAT rate, and the VAT amount. Stripe Tax handles this automatically when VAT number... | [§3](#section-3) | 🟡 | At monetization |
| 93 | REQ-TAX-EU-05 | REQ-TAX-EU-05 — kitsubeat must retain, for each EU B2C transaction, at least two of the Art. 24b evidence data points for 10 years (EU VAT retention period under most member-state laws). Stripe's t... | [§3](#section-3) | 🟡 | At monetization |
| 94 | REQ-TAX-EU-06 | REQ-TAX-EU-06 — If two pieces of evidence conflict (e.g., IP address in Germany, billing address in Ireland), kitsubeat must apply reasonable judgment or default to the billing address — document t... | [§3](#section-3) | 🟡 | At monetization |
| 95 | REQ-TAX-EU-07 | REQ-TAX-EU-07 — Phase 18 footer and Phase 19 receipts must include UK VAT number and EU OSS registration ID once assigned. | [§3](#section-3) | 🟡 | At monetization |
| 96 | REQ-TAX-STRIPE-01 | REQ-TAX-STRIPE-01 — Enable Stripe Tax: In the Stripe Dashboard → Tax, toggle on "Stripe Tax". No code changes required; Stripe Tax runs as a middleware on every charge. | [§3](#section-3) | 🟡 | At monetization |
| 97 | REQ-TAX-STRIPE-02 | REQ-TAX-STRIPE-02 — Set business origin address: In Stripe Tax → Settings → Origin address, enter the UK sole trader's registered business address. This determines the "origin" for place-of-supply ... | [§3](#section-3) | 🟡 | At monetization |
| 98 | REQ-TAX-STRIPE-03 | REQ-TAX-STRIPE-03 — Add UK VAT Registration: In Stripe Tax → Registrations → Add registration → United Kingdom → VAT → enter UK VAT number. Set effective date to the date of VAT registration (not b... | [§3](#section-3) | 🟡 | At monetization |
| 99 | REQ-TAX-STRIPE-04 | REQ-TAX-STRIPE-04 — Add EU Non-Union OSS Registration: In Stripe Tax → Registrations → Add registration → European Union → One-Stop Shop (non-Union) → enter OSS registration ID and registration sta... | [§3](#section-3) | 🟡 | At monetization |
| 100 | REQ-TAX-STRIPE-05 | REQ-TAX-STRIPE-05 — Set product tax code for digital services: For each Stripe Product (subscription, per-song pack), set the tax code to txcd_10103001 (Electronic Services — Digital Content Subscr... | [§3](#section-3) | 🟡 | At monetization |
| 101 | REQ-TAX-STRIPE-06 | REQ-TAX-STRIPE-06 — Tax behavior: exclusive for UK/EU B2C: Set tax_behavior: "exclusive" on each Stripe Price object — this means the tax amount is ADDED to the display price at checkout (standard ... | [§3](#section-3) | 🟡 | At monetization |
| 102 | REQ-TAX-STRIPE-07 | REQ-TAX-STRIPE-07 — Customer tax ID collection (optional B2B): If kitsubeat ever sells to businesses (B2B), enable customer tax ID collection in Stripe Tax to capture VAT numbers and apply reverse ... | [§3](#section-3) | 🟡 | At monetization |
| 103 | REQ-TAX-STRIPE-08 | REQ-TAX-STRIPE-08 — Enable automatic US state tax collection: In Stripe Tax → Registrations → United States, enable "Automatic collection". Stripe Tax monitors economic nexus thresholds per state a... | [§3](#section-3) | 🟡 | At monetization |
| 104 | REQ-TAX-STRIPE-09 | REQ-TAX-STRIPE-09 — Configure invoice template with VAT number: In Stripe → Settings → Billing → Invoice template, add the UK VAT number and EU OSS registration ID to the invoice footer. This satis... | [§3](#section-3) | 🟡 | At monetization |
| 105 | REQ-TAX-STRIPE-10 | REQ-TAX-STRIPE-10 — Enable reverse-charge wording for B2B EU invoices: In the Stripe invoice template, add the standard reverse-charge statement: "VAT reverse charged — recipient to account for any... | [§3](#section-3) | 🟡 | At monetization |
| 106 | REQ-TAX-STRIPE-11 | REQ-TAX-STRIPE-11 — Configure customer location evidence capture: Stripe Tax automatically captures IP address, billing address, and card BIN as location signals — satisfying EU VAT Implementing Re... | [§3](#section-3) | 🟡 | At monetization |
| 107 | REQ-TAX-STRIPE-12 | REQ-TAX-STRIPE-12 — Tax report export cadence: In Stripe Tax → Reports, schedule monthly tax liability report exports (CSV format). Email to accountant by the 5th of each month. This provides the d... | [§3](#section-3) | 🟡 | At monetization |
| 108 | REQ-TAX-STRIPE-13 | REQ-TAX-STRIPE-13 — Stripe Tax test mode validation: Before going live with payments, run at least one test-mode charge with a UK billing address and one with an EU billing address. Verify in the S... | [§3](#section-3) | 🟡 | At monetization |
| 109 | REQ-TAX-STRIPE-14 | REQ-TAX-STRIPE-14 — Stripe Tax in the checkout API call: Ensure every stripe.paymentIntents.create() or stripe.checkout.sessions.create() call includes automatic_tax: { enabled: true }. This is the... | [§3](#section-3) | 🟡 | At monetization |
| 110 | REQ-TAX-UK-01 | REQ-TAX-UK-01 — kitsubeat must monitor rolling 12-month UK taxable turnover. At £85,000 (warning trigger), begin VAT registration preparation. Mandatory registration before turnover hits £90,000. | [§3](#section-3) | 🟡 | At scale trigger |
| 111 | REQ-TAX-UK-02 | REQ-TAX-UK-02 — Track UK taxable turnover monthly from first paid transaction using a simple spreadsheet or accounting software (FreeAgent, QuickBooks — Phase 18 / Phase 19 config). | [§3](#section-3) | 🟡 | At scale trigger |
| 112 | REQ-TAX-UK-03 | REQ-TAX-UK-03 — Once VAT-registered, kitsubeat must charge 20% UK VAT on supplies to UK consumers. Stripe Tax handles this automatically when correctly configured (see §3.6). | [§3](#section-3) | 🟡 | At scale trigger |
| 113 | REQ-TAX-UK-04 | REQ-TAX-UK-04 — Supplies to non-UK consumers (EU, US, Brazil) are zero-rated for UK VAT but trigger the destination-country's VAT rules. | [§3](#section-3) | 🟡 | At scale trigger |
| 114 | REQ-TAX-UK-05 | REQ-TAX-UK-05 — kitsubeat's subscription and per-song purchases are standard-rated supplies (20% UK VAT). No exemption claim applies. | [§3](#section-3) | 🟡 | At scale trigger |
| 115 | REQ-TAX-UK-06 | REQ-TAX-UK-06 — Do NOT attempt to use UK MOSS for EU sales — the scheme no longer applies to UK traders. Use EU non-Union OSS (see §3.4). | [§3](#section-3) | 🟡 | At scale trigger |
| 116 | REQ-TAX-UK-07 | REQ-TAX-UK-07 — At VAT registration, implement MTD-compatible accounting software. FreeAgent or Xero with a Making Tax Digital connector are Phase 19 implementation options. | [§3](#section-3) | 🟡 | At scale trigger |
| 117 | REQ-TAX-US-01 | REQ-TAX-US-01 — kitsubeat must not assume US sales are tax-exempt. Stripe Tax's automatic US state tax collection must be enabled at Phase 19 monetization. | [§3](#section-3) | 🟡 | At scale trigger |
| 118 | REQ-TAX-US-02 | REQ-TAX-US-02 — Monitor US revenue by state quarterly. Economic nexus triggers collection obligation; Stripe Tax auto-registers and remits to most states. | [§3](#section-3) | 🟡 | At scale trigger |
| 119 | REQ-TAX-US-03 | REQ-TAX-US-03 — At beta launch, if US revenue is well below $100k, nexus is unlikely — document and reassess quarterly. | [§3](#section-3) | 🟡 | At scale trigger |

#### Group 5 — EU AI Act Disclosure (12 items)

| # | REQ ID | Obligation | Source | Rating | Activate when |
|---|--------|------------|--------|--------|---------------|
| 120 | REQ-AI-LESSON-01 | Global disclosure in Privacy Policy / About page: "Lesson content on kitsubeat — including vocabulary definitions, grammar explanations, verse translations, and learning notes — is initially drafte... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 121 | REQ-AI-LESSON-02 | Per-lesson visible indicator on the lesson panel: a subtle "AI-assisted" footer line or badge. Proposed: a 12px footer line on each lesson card reading "AI-assisted content" with a link to the AI P... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 122 | REQ-AI-LESSON-03 | TL;DR disclosure in the cookie/consent banner: "We use AI to generate learning content." This ensures first-time visitors receive the disclosure before engaging with any lesson. | [§4](#section-4) | 🟡 | Phase 18 launch |
| 123 | REQ-AI-LESSON-04 | Mnemonics and kanji breakdowns (Phase 08.3) displayed in the vocab feedback panel must individually carry the data-ai-generated="true" attribute and an accessible label indicating AI origin. | [§4](#section-4) | 🟡 | Phase 18 launch |
| 124 | REQ-AI-LESSON-05 | Exercise distractors and explanations are ephemeral (generated per session, not stored) — these need not be individually labeled but are covered by the global disclosure. | [§4](#section-4) | 🟡 | Phase 18 launch |
| 125 | REQ-AI-LESSON-06 | LearnCard content (Phase 08.4) is stored and re-displayed — MUST carry the data-ai-generated="true" attribute on the card container. The per-lesson badge in REQ-AI-LESSON-02 covers this surface. | [§4](#section-4) | 🟡 | Phase 18 launch |
| 126 | REQ-AI-LITERACY-01 | Privacy/AI Policy page MUST contain a reference to Anthropic's model transparency page and Claude's usage policies, so users can understand the upstream AI system's nature. | [§4](#section-4) | 🟡 | Phase 18 launch |
| 127 | REQ-AI-LITERACY-02 | The Song Ingestion SOP MUST include a documented AI-literacy acknowledgement step: operator confirms they understand that (a) WhisperX produces AI-generated transcripts, (b) Claude produces AI-gene... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 128 | REQ-AI-WHISPER-01 | Song pages that display WhisperX-generated lyrics/transcripts MUST display a visible label: "Transcript generated by AI (WhisperX)" or equivalent. Label must appear in proximity to the transcript c... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 129 | REQ-AI-WHISPER-02 | The label must be "appropriate, timely and clear" (Art. 50(2)). Proposed UX: a small badge ("AI transcript") on the verse/lyric panel, rendered inline above or below the verse display area. CSS cla... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 130 | REQ-AI-WHISPER-03 | Machine-readable disclosure — Art. 50(2) requires marking "in a marked format detectable as artificially generated." The EU AI Office has not yet published technical specification guidance.[^4-4] P... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 131 | REQ-AI-WHISPER-04 | Privacy/AI Policy page MUST contain a section disclosing that song transcripts are generated by the WhisperX AI model and have not been transcribed by a human. | [§4](#section-4) | 🟡 | Phase 18 launch |

#### Group 6 — Accessibility (WCAG 2.1 AA) (49 items)

| # | REQ ID | Obligation | Source | Rating | Activate when |
|---|--------|------------|--------|--------|---------------|
| 132 | REQ-A11Y-01 | 1.1.1 \| Perceivable \| Non-text Content \| A \| Song catalog (thumbnails), song page (YouTube iframe), kana trainer (kana character images), profile avatar \| Add alt text to all song thumbnails; add a... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 133 | REQ-A11Y-02 | 1.2.1 \| Perceivable \| Audio-only and Video-only (Prerecorded) \| A \| N/A — kitsubeat does not host prerecorded audio-only or video-only content; it embeds YouTube video with audio \| Confirm no stand... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 134 | REQ-A11Y-03 | 1.2.2 \| Perceivable \| Captions (Prerecorded) \| A \| YouTube embedded video (prerecorded music video) \| YouTube's native CC fulfils captions for YouTube-hosted content; confirm YouTube iframe allows ... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 135 | REQ-A11Y-04 | 1.2.3 \| Perceivable \| Audio Description or Media Alternative (Prerecorded) \| A \| YouTube embedded video \| Provide brief text description of music video visuals in song page metadata (e.g. "Animated... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 136 | REQ-A11Y-05 | 1.2.4 \| Perceivable \| Captions (Live) \| AA \| N/A — kitsubeat does not host live audio/video \| No live streams planned; confirm before adding any live feature \| REQ-A11Y-05 | [§4](#section-4) | 🟡 | Phase 18 launch |
| 137 | REQ-A11Y-06 | 1.2.5 \| Perceivable \| Audio Description (Prerecorded) \| AA \| YouTube embedded video \| Link to audio-described version if available, or document that kitsubeat relies on YouTube's AD track; document... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 138 | REQ-A11Y-07 | 1.3.1 \| Perceivable \| Info and Relationships \| A \| Furigana ruby text (all song + exercise pages), grammar color-coding, verse structural markup, exercise option lists, kana grid \| Furigana MUST us... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 139 | REQ-A11Y-08 | 1.3.2 \| Perceivable \| Meaningful Sequence \| A \| Exercise session (question + options), LearnCard accordion, kana trainer grid \| DOM reading order must match visual order for exercise question→optio... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 140 | REQ-A11Y-09 | 1.3.3 \| Perceivable \| Sensory Characteristics \| A \| Exercise correct/incorrect feedback, FSRS tier indicators, star display \| Do not use color or sound alone to convey exercise correctness; pair co... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 141 | REQ-A11Y-10 | 1.3.4 \| Perceivable \| Orientation \| AA \| All pages \| Do not lock screen orientation; app must function in both portrait and landscape, especially for exercise session on mobile 🔴 \| REQ-A11Y-10 | [§4](#section-4) | 🟡 | Phase 18 launch |
| 142 | REQ-A11Y-11 | 1.3.5 \| Perceivable \| Identify Input Purpose \| AA \| Auth forms (signup/login), profile settings, cookie banner, payment forms (future) \| Autocomplete attributes on auth form inputs: autocomplete="e... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 143 | REQ-A11Y-12 | 1.4.1 \| Perceivable \| Use of Color \| A \| FSRS tier badge colors, JLPT level colors, grammar particle colors, exercise correct/incorrect indicators \| All color-coded indicators must have a text or i... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 144 | REQ-A11Y-13 | 1.4.2 \| Perceivable \| Audio Control \| A \| YouTube iframe auto-play (if enabled) \| If YouTube video auto-plays on song page load, provide a pause mechanism within kitsubeat UI (not just rely on YouT... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 145 | REQ-A11Y-14 | 1.4.4 \| Perceivable \| Resize Text \| AA \| All text (song page, exercise session, kana grid, lesson panel, profile) \| All text must scale to 200% viewport zoom without horizontal scroll loss or clipp... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 146 | REQ-A11Y-15 | 1.4.5 \| Perceivable \| Images of Text \| AA \| Kana character display if rendered as images, logo \| Render kana/kanji as Unicode text with appropriate font (not as image); if kana trainer uses SVG/ima... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 147 | REQ-A11Y-16 | 1.4.10 \| Perceivable \| Reflow \| AA \| Exercise session, song page, catalog \| Content must reflow at 320px viewport width without horizontal scrolling (CSS 400% zoom equivalent); test exercise option... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 148 | REQ-A11Y-17 | 1.4.11 \| Perceivable \| Non-text Contrast \| AA \| Star display, FSRS tier badge borders, exercise option button borders, focus rings \| Non-text UI components and state indicators must meet 3:1 contra... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 149 | REQ-A11Y-18 | 1.4.12 \| Perceivable \| Text Spacing \| AA \| All text content \| Content must not overlap or clip when letter-spacing, word-spacing, line-height, and paragraph spacing are set to WCAG minimum values; ... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 150 | REQ-A11Y-19 | 1.4.13 \| Perceivable \| Content on Hover or Focus \| AA \| Tooltips (BonusBadgeIcon hover tooltip "Bonus mastery: Grammar Conjugation + Sentence Order"), any other hover-revealed content \| Tooltip mus... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 151 | REQ-A11Y-20 | 2.1.1 \| Operable \| Keyboard \| A \| Exercise session (option selection, submit, replay), kana trainer (kana cell selection), song page (verse navigation), cookie banner, auth forms, LearnCard accordi... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 152 | REQ-A11Y-21 | 2.1.2 \| Operable \| No Keyboard Trap \| A \| Cookie banner modal, upsell modal (AdvancedDrillsUpsellModal), any dialog \| Focus must not be trapped in any component (except intentional modal dialogs th... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 153 | REQ-A11Y-22 | 2.1.4 \| Operable \| Character Key Shortcuts \| AA \| Any single-key keyboard shortcuts (if implemented) \| If single-key shortcuts (e.g. 1–4 for exercise options) are implemented, they MUST be configur... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 154 | REQ-A11Y-23 | 2.2.1 \| Operable \| Timing Adjustable \| A \| FSRS review session (if time-limited), exercise session (no time limit currently) \| Do not impose time limits without user control; confirm no session tim... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 155 | REQ-A11Y-24 | 2.2.2 \| Operable \| Pause, Stop, Hide \| A \| Any animated content (confetti on star earn, verse-highlight animation, SongMasteredBanner entrance animation) \| Provide pause/stop for animations lasting... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 156 | REQ-A11Y-25 | 2.3.1 \| Operable \| Three Flashes or Below Threshold \| A \| Confetti animation, any flash-based feedback \| No content should flash more than 3 times per second; confetti and correct/incorrect feedbac... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 157 | REQ-A11Y-26 | 2.4.1 \| Operable \| Bypass Blocks \| A \| All pages with repeated navigation (header nav, song list header) \| Provide a "Skip to main content" link as the first focusable element on all pages with rep... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 158 | REQ-A11Y-27 | 2.4.2 \| Operable \| Page Titled \| A \| All pages \| Each page must have a unique, descriptive <title> element; song pages: "[Song Title] — kitsubeat"; exercise pages: "[Song Title] Exercise — kitsubea... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 159 | REQ-A11Y-28 | 2.4.3 \| Operable \| Focus Order \| A \| Exercise session (question → options → submit → feedback → next), LearnCard accordion, kana trainer grid, auth forms \| Tab focus order must be logical and intui... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 160 | REQ-A11Y-29 | 2.4.4 \| Operable \| Link Purpose (In Context) \| A \| Catalog song links, nav links, lesson panel links, footer links, AI-disclosure badge links \| Every link's purpose must be clear from link text alo... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 161 | REQ-A11Y-30 | 2.4.5 \| Operable \| Multiple Ways \| AA \| Site-wide \| Provide ≥2 ways to locate each page (e.g. catalog + search + sitemap); ensure site search or consistent navigation allows alternative path to any... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 162 | REQ-A11Y-31 | 2.4.6 \| Operable \| Headings and Labels \| AA \| All pages \| Use semantic heading hierarchy (h1–h6) consistently; labels on all form fields; heading structure on song page: h1 = song title, h2 = Vocab... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 163 | REQ-A11Y-32 | 2.4.7 \| Operable \| Focus Visible \| AA \| All interactive elements (buttons, links, inputs, exercise options, kana cells, accordion toggles) \| All interactive elements must have a visible focus indic... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 164 | REQ-A11Y-33 | 2.5.1 \| Operable \| Pointer Gestures \| A \| Sentence Order (drag-to-answer), any swipe gestures \| All multi-point or path-based gestures must have a single-pointer alternative; sentence order drag MU... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 165 | REQ-A11Y-34 | 2.5.2 \| Operable \| Pointer Cancellation \| A \| Exercise option buttons, kana cells, sentence order tokens \| Activate on mouseup/pointerup, not mousedown; user can abort by moving pointer off element... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 166 | REQ-A11Y-35 | 2.5.3 \| Operable \| Label in Name \| A \| Icon-only buttons (replay in Listening Drill, close modal, star display), custom exercise option buttons \| Accessible name must contain or match visible label... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 167 | REQ-A11Y-36 | 2.5.4 \| Operable \| Motion Actuation \| A \| Any shake-to-action or device-motion gesture (not currently implemented) \| Do not make any feature operable only via device motion; if device-motion is add... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 168 | REQ-A11Y-37 | 3.1.1 \| Understandable \| Language of Page \| A \| All pages \| Set lang attribute on <html> element; for English-primary pages: <html lang="en">; for PT-BR variant pages: <html lang="pt-BR"> 🔴 \| REQ-A... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 169 | REQ-A11Y-38 | 3.1.2 \| Understandable \| Language of Parts \| AA \| Song pages (Japanese verse text, furigana), lesson panels (Japanese examples), grammar explanation (Japanese grammatical examples) \| Japanese text ... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 170 | REQ-A11Y-39 | 3.2.1 \| Understandable \| On Focus \| A \| All interactive elements \| Receiving focus must not trigger automatic context change (navigation, form submission); confirm that kana trainer and exercise op... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 171 | REQ-A11Y-40 | 3.2.2 \| Understandable \| On Input \| A \| Exercise session, kana trainer, auth forms \| Changing a form input value must not cause automatic context change without prior notice; exercise options submi... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 172 | REQ-A11Y-41 | 3.2.3 \| Understandable \| Consistent Navigation \| AA \| Site-wide header/nav, song page sidebar, exercise session header \| Repeated navigation elements appear in same relative order across pages; kit... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 173 | REQ-A11Y-42 | 3.2.4 \| Understandable \| Consistent Identification \| AA \| Star display (used in catalog + song page + session summary), FSRS tier badge, AI-disclosure badge \| Components with the same function must... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 174 | REQ-A11Y-43 | 3.3.1 \| Understandable \| Error Identification \| A \| Auth forms, cookie banner, payment forms (future), exercise session (sentence order invalid state) \| Form validation errors must identify the spe... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 175 | REQ-A11Y-44 | 3.3.2 \| Understandable \| Labels or Instructions \| A \| Auth forms (signup/login), cookie banner consent checkboxes, payment forms (future), exercise sentence order instructions \| All form fields mus... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 176 | REQ-A11Y-45 | 3.3.3 \| Understandable \| Error Suggestion \| AA \| Auth forms, payment forms (future) \| Where an input error is detected and suggestions are known (e.g. "Password must be at least 8 characters"), pro... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 177 | REQ-A11Y-46 | 3.3.4 \| Understandable \| Error Prevention (Legal, Financial, Data) \| AA \| Account deletion (profile), payment flow (future), data export request \| Provide confirmation step for irreversible actions... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 178 | REQ-A11Y-47 | 4.1.1 \| Robust \| Parsing \| A \| All pages (HTML validity) \| HTML must be valid: unique IDs, properly nested elements, no duplicate attributes; run HTML validator on key pages (song page, exercise se... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 179 | REQ-A11Y-48 | 4.1.2 \| Robust \| Name, Role, Value \| A \| Star display component, FSRS tier badge, sentence order drag tokens, LearnCard accordion, exercise option buttons, kana trainer cells, upsell modal, cookie ... | [§4](#section-4) | 🟡 | Phase 18 launch |
| 180 | REQ-A11Y-49 | 4.1.3 \| Robust \| Status Messages \| AA \| Exercise session (correct/incorrect feedback), FSRS review (grading result), kana trainer (result), profile (save confirmation), cookie banner (accepted conf... | [§4](#section-4) | 🟡 | Phase 18 launch |

#### Group 7 — Age Gating & Minor-User Protection (58 items)

| # | REQ ID | Obligation | Source | Rating | Activate when |
|---|--------|------------|--------|--------|---------------|
| 181 | REQ-MINORS-01 | REQ-MINORS-01 — Streak mechanics MUST NOT use loss-aversion dark patterns. The Phase 12 design already mandates one auto-applied grace day per week (CONTEXT.md §Phase 12). This aligns with Standard... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 182 | REQ-MINORS-02 | REQ-MINORS-02 — Sound and haptic celebrations MUST be configurable (off by default for first-time users; user opt-in). Phase 12 Success Criterion 4 requires configurable sound/haptic. This aligns —... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 183 | REQ-MINORS-03 | REQ-MINORS-03 — Any "save your streak" or urgency prompt copy MUST NOT use dark-pattern language (countdown timers implying permanent loss, social shaming comparisons). Language review required at ... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 184 | REQ-MINORS-04 | REQ-MINORS-04 — Complete a DPIA for the processing of children's personal data before Phase 18 launches. Document the processing, risks, and mitigations. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 185 | REQ-MINORS-05 | REQ-MINORS-05 — If the DPIA concludes that processing is "high risk" under Art. 35, kitsubeat must consult with the ICO under Art. 36 (prior consultation) before proceeding. This is a launch gate. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 186 | REQ-MINORS-06 | REQ-MINORS-06 — Document the "design for 13+" posture in the Privacy Policy and the DPIA. Confirm this posture is appropriate whenever a new feature is added (e.g., if chat or social features ship,... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 187 | REQ-MINORS-07 | REQ-MINORS-07 — Publish a child-friendly Privacy Summary alongside the adult Privacy Policy. Target reading level: UK Year 8 (age 12–13). Cover: what data is collected, why, how long it is kept, wh... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 188 | REQ-MINORS-08 | REQ-MINORS-08 — The child-friendly summary must be linked from the signup form's teen awareness step (§5.3.3) and from the minor account's settings page. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 189 | REQ-MINORS-09 | REQ-MINORS-09 — No behavioural advertising based on minor users' learning patterns, ever. This must be an absolute product constraint, not a policy promise that can later be overridden by a busines... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 190 | REQ-MINORS-10 | REQ-MINORS-10 — Analytics event payloads for minor accounts must scrub any behavioural data that could constitute a "profile" if combined with third-party ad-tech data. PostHog/Sentry ingestion for... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 191 | REQ-MINORS-11 | REQ-MINORS-11 — T&Cs and Privacy Policy must explicitly state that minors are covered and that the same (or stricter) privacy standards apply to them. No clause may authorize less protection for mi... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 192 | REQ-MINORS-12 | REQ-MINORS-12 — All settings in §5.4 tagged with "AADC Standard 7" must be set to the minor-specific default at account creation when the user's DOB indicates age < 18. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 193 | REQ-MINORS-13 | REQ-MINORS-13 — The system must re-evaluate a user's age status on their 18th birthday and send a notification advising of the account transition (§5.3.6). Until the 18th birthday, minor defaults p... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 194 | REQ-MINORS-14 | REQ-MINORS-14 — For minor accounts, the DOB field must be stored for the duration of the account (needed to enforce age-appropriate defaults and 18th-birthday transition). After the user turns 18, ... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 195 | REQ-MINORS-15 | REQ-MINORS-15 — No optional data fields (e.g., bio, external social links) may be collected from minor accounts unless strictly necessary for the service. If such fields exist, they must be hidden ... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 196 | REQ-MINORS-16 | REQ-MINORS-16 — Data retention for minor accounts after deletion must be minimized (7-day grace period vs 30-day adult default — see §5.4). | [§5](#section-5) | 🟡 | Phase 18 launch |
| 197 | REQ-MINORS-17 | REQ-MINORS-17 — Error-logging systems (Sentry) must scrub user identifiers from minor account error reports. Only a pseudonymous session ID and release tag should be included (see §5.4: sentry.user... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 198 | REQ-MINORS-18 | REQ-MINORS-18 — Sentry and PostHog are acceptable processors for minor data under Standard 9, provided (a) they are listed in the Privacy Policy as data processors, (b) DPAs are signed with both, a... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 199 | REQ-MINORS-19 | REQ-MINORS-19 — Any future integration (e.g., analytics tools, A/B testing platforms, marketing email providers) must be assessed against Standard 9 before adding to the codebase. This is a Phase 1... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 200 | REQ-MINORS-20 | REQ-MINORS-20 — No sharing of minor users' progress data externally (e.g., leaderboard APIs, social sharing integrations) unless the minor explicitly opts in per the user.share_progress_external se... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 201 | REQ-MINORS-21 | REQ-MINORS-21 — The Privacy Policy must explicitly distinguish between timezone (used for scheduling; not precise location) and geolocation (not collected). This distinction must be documented in t... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 202 | REQ-MINORS-22 | REQ-MINORS-22 — If any future feature uses IP-based geolocation (e.g., for content region-locking), Standard 10 requires it to be OFF by default for minors and reset after each session. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 203 | REQ-MINORS-23 | REQ-MINORS-23 — Document the absence of parental-controls features in the Privacy Policy (briefly). State the re-evaluation trigger. If family-plan features are ever added, Standard 11 compliance m... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 204 | REQ-MINORS-24 | REQ-MINORS-24 — Publish a profiling justification in the Privacy Policy explaining that FSRS-based scheduling is essential to the service's educational function and does not produce any decision wi... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 205 | REQ-MINORS-25 | REQ-MINORS-25 — No OTHER profiling (inferred emotional state, engagement scoring for advertising, demographic inference) is performed on minor accounts, even as a future analytics feature. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 206 | REQ-MINORS-26 | REQ-MINORS-26 — Streak "save your streak" prompts MUST NOT use countdown timers or messaging that implies permanent loss with artificial urgency. Copy must be informational ("You have a grace day a... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 207 | REQ-MINORS-27 | REQ-MINORS-27 — Gamification sound and haptic celebrations MUST be configurable (opt-in/out), per Phase 12 Success Criterion 4. The first-launch default must be off for all users; the Phase 18 onbo... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 208 | REQ-MINORS-28 | REQ-MINORS-28 — No "share your progress to unlock a feature" prompts that nudge minors to share data as the price of accessing functionality. Progress sharing (§5.4: user.share_progress_external) m... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 209 | REQ-MINORS-29 | REQ-MINORS-29 — The Phase 18 DSAR implementation must include a child-accessible path: clear language ("Delete my account and all my data"), confirmation step without legal jargon, and confirmation... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 210 | REQ-MINORS-30 | REQ-MINORS-30 — Account deletion (data erasure) must be accessible directly from the minor account's profile settings without requiring email correspondence with support (self-service erasure). | [§5](#section-5) | 🟡 | Phase 18 launch |
| 211 | REQ-MINORS-31 | REQ-MINORS-31 — Data export (portability) must be available to all users including minors. Export format: JSON or CSV. The export must be triggered from the profile settings page. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 212 | REQ-MINORS-BR-01 | REQ-MINORS-BR-01 — The Privacy Policy must contain a LGPD Art. 14 disclosure section in Portuguese explaining the special protections for Brazilian users under 18 (adolescents) and confirming that ... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 213 | REQ-MINORS-BR-02 | REQ-MINORS-BR-02 — The DPIA (REQ-MINORS-04) must include a LGPD Art. 14 / ANPD Resolution CD/ANPD 6/2023 assessment section covering Brazilian minor users specifically. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 214 | REQ-MINORS-BR-03 | REQ-MINORS-BR-03 — If kitsubeat ever lowers the minimum age below 13, Brazilian users under 12 require parental consent under LGPD Art. 14 §1 — this is a hard legal gate, not just a UX change. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 215 | REQ-MINORS-CA-01 | REQ-MINORS-CA-01 — kitsubeat's current data practices do not trigger CCPA §1798.120(c) because no sale or sharing of minor personal data occurs. This must be documented in the Privacy Policy under ... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 216 | REQ-MINORS-CA-02 | REQ-MINORS-CA-02 — Any future integration with ad-tech, behavioral analytics (in a "sale/share" configuration), or data brokers MUST be assessed for CCPA §1798.120(c) compliance before implementati... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 217 | REQ-MINORS-CA-03 | REQ-MINORS-CA-03 — Phase 18's GPC signal handling must treat minor accounts as having a permanent "do not sell or share" preference, regardless of whether the user has activated GPC. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 218 | REQ-MINORS-DEFAULT-01 | REQ-MINORS-DEFAULT-01 — user.profile_visibility defaults to private for minor accounts. Override requires confirmation dialog. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 219 | REQ-MINORS-DEFAULT-02 | REQ-MINORS-DEFAULT-02 — user.allow_leaderboards defaults to false for minor accounts. Override requires explicit opt-in. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 220 | REQ-MINORS-DEFAULT-03 | REQ-MINORS-DEFAULT-03 — user.marketing_email_opt_in is locked to false for minor accounts and the opt-in UI is hidden. The lock lifts at the 18th birthday transition. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 221 | REQ-MINORS-DEFAULT-04 | REQ-MINORS-DEFAULT-04 — user.push_notifications defaults to false for all users (browser permission model). For minor accounts, this default is confirmed and must not be auto-prompted. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 222 | REQ-MINORS-DEFAULT-05 | REQ-MINORS-DEFAULT-05 — user.share_progress_external defaults to false for minor accounts. Override requires explicit opt-in with no feature-gating on the share action. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 223 | REQ-MINORS-DEFAULT-06 | REQ-MINORS-DEFAULT-06 — analytics.behavioral_events_enabled is false for minor accounts regardless of any consent signal. Phase 18's PostHog integration must check the minor flag before firing beha... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 224 | REQ-MINORS-DEFAULT-07 | REQ-MINORS-DEFAULT-07 — sentry.user_context for minor accounts must be scrubbed to release-tag-only before transmission to Sentry. No user ID, email, or session token in error payloads for minors. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 225 | REQ-MINORS-DEFAULT-08 | REQ-MINORS-DEFAULT-08 — subscription.parental_notice_required is true for minor accounts. When payment features ship (Phase 22+), the checkout flow for minor accounts must include a parental-awaren... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 226 | REQ-MINORS-DEFAULT-09 | REQ-MINORS-DEFAULT-09 — data.retention_days_after_deletion for minor accounts is 7 days (vs 30 days for adults). The account deletion process must apply the shorter grace window when is_minor = tru... | [§5](#section-5) | 🟡 | Phase 18 launch |
| 227 | REQ-MINORS-GATE-01 | REQ-MINORS-GATE-01 — Signup form MUST include a required date_of_birth field stored as ISO 8601 date in the users table. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 228 | REQ-MINORS-GATE-02 | REQ-MINORS-GATE-02 — DOB must be stored as a full date, not a derived age integer or boolean, to enable future age re-evaluation. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 229 | REQ-MINORS-GATE-03 | REQ-MINORS-GATE-03 — Under-13 signup attempts MUST be blocked at the UI layer with the prescribed copy. No account creation, no email storage beyond 24h rate-limit log. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 230 | REQ-MINORS-GATE-04 | REQ-MINORS-GATE-04 — Users aged 13–17 MUST pass through the teen signup awareness step before account creation. Parental consent is NOT required but a parental-awareness option MUST be presented. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 231 | REQ-MINORS-GATE-05 | REQ-MINORS-GATE-05 — Users aged 18+ proceed to standard signup. Minor-specific defaults do NOT apply. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 232 | REQ-MINORS-GATE-06 | REQ-MINORS-GATE-06 — Server MUST re-validate submitted DOB and apply minor defaults if age < 18 at account creation time, regardless of client-side state. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 233 | REQ-MINORS-GATE-07 | REQ-MINORS-GATE-07 — Teen awareness step MUST display the 6 child-friendly bullets, the acknowledgment checkbox, and the optional parental-awareness nudge buttons before account creation. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 234 | REQ-MINORS-GATE-08 | REQ-MINORS-GATE-08 — The parental-awareness nudge MUST be optional. Account creation MUST NOT be gated on whether the minor triggers the parental notification. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 235 | REQ-MINORS-GATE-09 | REQ-MINORS-GATE-09 — Age assurance via DOB self-declaration + awareness acknowledgment is the v1 standard. Document the proportionality rationale in the DPIA (REQ-MINORS-04). | [§5](#section-5) | 🟡 | Phase 18 launch |
| 236 | REQ-MINORS-GATE-10 | REQ-MINORS-GATE-10 — Failed under-13 signup attempts MUST use email-based rate-limiting (exponential backoff). No persistent device-level cookie lockout. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 237 | REQ-MINORS-GATE-11 | REQ-MINORS-GATE-11 — The system MUST detect 18th-birthday transitions and send the prescribed email notification. Minor defaults persist until the user explicitly changes them after turning 18. | [§5](#section-5) | 🟡 | Phase 18 launch |
| 238 | REQ-MINORS-GATE-12 | REQ-MINORS-GATE-12 — The 18th-birthday transition must NOT automatically change any setting to a less-private value. It only UNLOCKS the ability for the user to make that change. | [§5](#section-5) | 🟡 | Phase 18 launch |

### Coverage summary

**238 total REQ-* requirements** extracted from the five analysis sections.

- Activation: **184 at Phase 18 launch**, **44 at monetization**, **10 at scale trigger**.
- Risk: **12 🔴 (red)**, **226 🟡 (amber)**, **0 🟢 (green)**.
- Red-rated items also appear in the [Pre-Monetization Legal Review](#lawyer-index) and are gated on legal advice.
- Category breakdown: Accessibility (WCAG 2.1 AA)=49, EU AI Act Disclosure=12, Consumer Law=21, Age Gating & Minor-User Protection=58, Privacy & Data Protection=65, Tax (activate at monetization)=33

### Consumption protocol

1. When Phase 18 is planned via `/gsd:plan-phase 18`, this checklist IS the `requirements:` frontmatter input — every REQ ID should appear in the Phase 18 plan.
2. Refund template publication (§3.2) and Stripe Tax config (§3.6) are deliberately created in Phase 18 but activated in Phase 19 / v4.0 Phase 22.
3. Items marked "At scale trigger" (US sales tax registrations, EU Art. 27 representative if the small-scale exemption fails, UK VAT threshold) require runtime monitoring rather than Phase 18 implementation — Phase 18 delivers the monitoring hooks, not the registrations.

---

_End of 17-ANALYSIS.md. Phase 17 deliverable._
