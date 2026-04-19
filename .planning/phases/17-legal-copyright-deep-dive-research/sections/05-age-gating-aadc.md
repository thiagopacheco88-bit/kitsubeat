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
