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
