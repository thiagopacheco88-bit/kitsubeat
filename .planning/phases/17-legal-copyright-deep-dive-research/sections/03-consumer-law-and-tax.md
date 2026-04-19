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
