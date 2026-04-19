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
