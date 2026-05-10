# Incident Response Runbook — KitsuBeat

**On-call contact:** Thiago Pacheco (thiagopacheco88@gmail.com)
**Last updated:** 2026-05-09 (Phase 16 Security Review)
**Status:** Active — reviewed before user data arrival

> The 72-hour UK-GDPR notification clock starts when you BECOME AWARE of a breach — not when forensic certainty is achieved. Act immediately on suspicion.

---

## Severity Taxonomy

| Level | Description | Example | Response SLA |
|-------|-------------|---------|-------------|
| **P1 — Critical** | User PII exposed; active breach; system fully down | DB credentials leaked to git; mass user data access | Immediate — within 1 hour |
| **P2 — High** | Potential data exposure; partial outage; suspected breach | IDOR vulnerability found; server action accepting arbitrary userId | Same day — within 8 hours |
| **P3 — Medium** | Security misconfiguration; single user affected; degraded service | Rate limit missing; RLS policy gap (not exploited) | Within 48 hours |
| **P4 — Low** | Documentation gap; theoretical vulnerability; non-sensitive data | Missing .env.example entry; low-severity dep CVE | Next sprint |

---

## UK-GDPR 72-Hour Breach Notification Timeline

Source: [ICO — 72 hours: how to respond to a personal data breach](https://ico.org.uk/for-organisations/advice-for-small-organisations/personal-data-breaches/72-hours-how-to-respond-to-a-personal-data-breach/)

| Hour | Action |
|------|--------|
| **0–2h** | **CONTAIN:** Rotate credentials, disable affected endpoint/service, take evidence snapshot |
| **2–8h** | **ASSESS:** What data was exposed? How many users? Is exposure ongoing? |
| **8–48h** | **DETERMINE:** Is this reportable? (Report if there is risk to individual rights/freedoms) |
| **48–72h** | **REPORT to ICO** at https://ico.org.uk/for-organisations/report-a-breach/personal-data-breach/ (online form, ~30 min) |
| **72h+** | **NOTIFY users** if high risk to them (Art. 34 UK GDPR) |
| **Ongoing** | **DOCUMENT** everything: what we knew, when, what we did, and why |

**NOT reportable** (no ICO notification needed):
- Accidental internal email sent to wrong address
- Lost device with no PII or fully encrypted

**IS reportable**:
- DB credentials leaked (possible unauthorized access)
- User PII accessed by other users (IDOR)
- Stolen session tokens with evidence of use

---

## First-Response Checklist (P1 Incident)

### Step 1: CONTAIN

- [ ] Rotate database credentials: Neon Console → [Project] → Settings → Reset Password
- [ ] Rotate Clerk API keys: Clerk Dashboard → API Keys → Revoke + Reissue
- [ ] Rotate Sentry auth token: Sentry → Settings → Auth Tokens → Revoke + New Token
- [ ] Rotate Upstash Redis credentials: Upstash Console → Database → Reset Token
- [ ] If Vercel deployment is the breach vector: Vercel Dashboard → Deployments → Cancel/Rollback
- [ ] Take a snapshot of evidence: Vercel Functions logs, Sentry events, PostHog events (before they expire)

### Step 2: ASSESS

- [ ] What data was exposed? (Users table, exercise logs, vocab mastery, subscriptions, cookie consent)
- [ ] How many users affected? (Run: `SELECT COUNT(DISTINCT user_id) FROM user_exercise_log WHERE updated_at > '[breach timestamp]'`)
- [ ] Is the exposure ongoing or contained?
- [ ] Is this reportable under UK GDPR? (Any risk to individual rights/freedoms = reportable)

### Step 3: NOTIFY (if reportable)

- [ ] **Report to ICO within 72 hours:** https://ico.org.uk/for-organisations/report-a-breach/personal-data-breach/
- [ ] If high risk to individuals: notify affected users via email (Resend) within reasonable time after ICO report
- [ ] Keep a written log of the incident timeline for ICO audit trail (date/time of each action taken)

### Step 4: RECOVER

- [ ] Deploy the fix to production
- [ ] Verify breach is contained (re-run the audit that found the breach)
- [ ] Update this runbook with lessons learned
- [ ] Add postmortem note to WORKLOG.md

---

## Contact List

| Party | Contact Method | Use When |
|-------|---------------|----------|
| **Clerk Support** | https://clerk.com/support | Auth/JWT issues, account compromise, session token concerns |
| **Neon (Postgres)** | console.neon.tech + https://neon.tech/support | DB credential leak, data corruption, connection issues |
| **Vercel Support** | https://vercel.com/support | Deployment issues, environment variable leak, edge function errors |
| **ICO (UK data regulator)** | https://ico.org.uk/for-organisations/report-a-breach/ | UK GDPR breach notification (mandatory within 72h if reportable) |
| **Resend (email)** | https://resend.com/support | Email sending compromise, DMARC/SPF issues |
| **Stripe (payments)** | https://stripe.com/support | Payment data concerns, webhook security |

---

## Data Assets at Risk

Understanding what's in the database helps assess breach severity quickly:

| Table | Contains | Sensitivity |
|-------|----------|-------------|
| `users` | Clerk userId, preferences, theme, streak, XP, date_of_birth (if provided) | HIGH — date_of_birth is PII |
| `user_song_progress` | Progress per song, accuracy, stars | MEDIUM |
| `user_vocab_mastery` | FSRS state per vocab item | LOW |
| `user_exercise_log` | Per-answer timing data | LOW |
| `subscriptions` | user_id + plan + status (NO card data — Stripe handles cards) | MEDIUM |
| `cookie_consent_record` | Consent timestamp + hashed IP | MEDIUM — hashed IP, not raw |
| `sar_log` | Subject access request log | HIGH — confirms user identity |
| `email_sent_log` | Email type + timestamp per user | LOW |

**Note:** KitsuBeat does NOT store credit card data. Stripe handles all payment processing. A Stripe data breach would be Stripe's responsibility to report.

---

## Key Credentials Requiring Rotation in a Breach

| Credential | Rotation Location | Time to Rotate |
|------------|------------------|----------------|
| DATABASE_URL | Neon Console → [Project] → Settings → Reset Connection Password | ~2 min |
| CLERK_SECRET_KEY | Clerk Dashboard → API Keys → Roll Secret Key | ~1 min |
| UPSTASH_REDIS_REST_TOKEN | Upstash Console → Database → Reset Token | ~1 min |
| SENTRY_AUTH_TOKEN | Sentry → Settings → Auth Tokens | ~2 min |
| RESEND_API_KEY | Resend Dashboard → API Keys → Delete + Create | ~2 min |
| CRON_SECRET | Vercel → Environment Variables → Edit + Redeploy | ~5 min |

After rotating any credential: update it in Vercel → Settings → Environment Variables, then trigger a new deployment.

---

## Useful Diagnostic Queries

Run against Neon Postgres (use the SQL editor in Neon Console):

```sql
-- Recent logins / session activity by user count
SELECT DATE(updated_at), COUNT(DISTINCT user_id) as active_users
FROM user_song_progress
WHERE updated_at > NOW() - INTERVAL '7 days'
GROUP BY 1 ORDER BY 1 DESC;

-- Suspicious high-volume writes (possible exploit)
SELECT user_id, COUNT(*) as answer_count
FROM user_exercise_log
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id HAVING COUNT(*) > 500
ORDER BY 2 DESC;

-- Users affected by a potential breach in a time window
SELECT DISTINCT user_id
FROM user_exercise_log
WHERE created_at BETWEEN '[breach_start]' AND '[breach_end]';
```
