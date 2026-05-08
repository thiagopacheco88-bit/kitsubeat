# Phase 18 — Operator Checklist

Pre-Phase-19 launch tasks that require human action (not code).

## 1. ICO Registration (BLOCKING — must complete before Phase 19)

Requirement: REQ-PRIV-UK-POLICY-02

Steps:
1. Go to: https://ico.org.uk/for-organisations/register/
2. Select "Data Controller" registration
3. Select micro-organisation fee tier (turnover < £632,000) — approximately £40/year
4. Complete registration — you'll receive an ICO number (format: ZB123456) by email within minutes
5. Open src/app/legal/privacy/page.tsx
6. Replace `[ICO REGISTRATION NUMBER: ZB000000]` with your actual number
7. Commit + deploy

## 2. Email Aliases (BLOCKING — must complete before Phase 19)

Requirement: REQ-PRIV-UK-POLICY-03, REQ-MINORS-29

- Create privacy@kitsubeat.com (for GDPR/LGPD SAR and data protection enquiries)
- Create support@kitsubeat.com (for general support + under-13 age error contact)
- Send a test email to each alias; confirm receipt
- Update RESEND_API_KEY in Vercel if not already set (required for birthday-transitions cron email)

## 3. DPIA Document (BLOCKING — must complete before Phase 19)

Requirement: REQ-MINORS-04, REQ-MINORS-05

Complete a Data Protection Impact Assessment covering:
- Processing of children's (13-17) personal data
- LGPD Art. 14 assessment for Brazilian minor users (REQ-MINORS-BR-02)
- Risk assessment for FSRS behavioral scheduling on minor accounts
- Proposed mitigations (minor defaults, 18th-birthday transition, no behavioral advertising)

Save as: .planning/legal/DPIA.md (not committed to public repo — gitignore if needed)

## 4. Supabase + Vercel IDTA Verification (before Phase 19)

Requirement: REQ-PRIV-UK-XFER-01, REQ-PRIV-UK-XFER-02

- Verify Supabase has a UK IDTA addendum: https://supabase.com/docs/guides/platform/shared-responsibility-model
- Verify Vercel has a UK IDTA or SCCs addendum for UK data processing
- If neither has IDTA: execute Standard Contractual Clauses manually before Phase 19 beta opens

## 5. Terms & Conditions Effective Date

Before Phase 19 launch:
- Set TERMS_EFFECTIVE_DATE in src/lib/legal/versions.ts to the Phase 19 launch date
- Format: "YYYY-MM-DD" (e.g., "2026-06-01")

## 6. CRON_SECRET Environment Variable

- Verify CRON_SECRET is set in Vercel environment variables
- The birthday-transitions cron (and existing daily-reminder + weekly-recap) requires this secret
- Set in Vercel Dashboard → Settings → Environment Variables

## Checklist Summary

- [ ] ICO registration number obtained and inserted in privacy page
- [ ] privacy@kitsubeat.com alias live and tested
- [ ] support@kitsubeat.com alias live and tested
- [ ] DPIA document drafted and saved to .planning/legal/DPIA.md
- [ ] Supabase + Vercel IDTA/SCCs verified
- [ ] TERMS_EFFECTIVE_DATE set to Phase 19 launch date
- [ ] CRON_SECRET set in Vercel
- [ ] RESEND_API_KEY set in Vercel
