# Phase 18: Legal & Compliance Implementation — Research

**Researched:** 2026-05-08
**Domain:** Legal pages, cookie consent, age gating, accessibility audit, data export, privacy policy, AI disclosures
**Confidence:** HIGH (stack is verified; implementation patterns from codebase inspection; 17-ANALYSIS.md is the authoritative source for all obligations)

---

## Summary

Phase 18 implements the 184 "Phase 18 launch" REQ-* items from the 17-ANALYSIS.md checklist (238 total; 44 activate at monetization, 10 at scale trigger — those are explicitly OUT OF SCOPE for Phase 18 code). The work falls into six implementation clusters: (1) legal page infrastructure (static MDX pages with versioning + acceptance tracking), (2) cookie consent banner (PECR-compliant, blocks PostHog before consent, granular categories), (3) age gating and minor-user protection (DOB field in signup, is_minor flag, 18th-birthday cron, per-account default enforcement), (4) WCAG 2.1 AA accessibility pass (axe-core automation already wired; mostly ARIA/semantic HTML fixes surfaced by audits), (5) data export/DSAR endpoint (authenticated JSON dump), and (6) AI disclosure labels (no new library — pure HTML/CSS attributes and a new legal/ai-transparency page).

The schema migration is modest: `date_of_birth DATE`, `is_minor BOOLEAN`, `terms_accepted_at TIMESTAMPTZ`, `terms_version TEXT`, `minor_defaults_applied BOOLEAN` on `users`; new `cookie_consent_record` table; new `sar_log` table. Migration number is `0019`.

The cookie consent library decision is the highest-stakes technical choice. `react-cookie-consent` (v10.0.1, MIT, already verified in npm registry) is the minimal, well-maintained option that works in Next.js 15 App Router without a provider and blocks scripts before mount via a simple boolean store. A roll-your-own approach using a server action + `js-cookie` is equally viable and preferred given the project's pattern of hand-rolling thin utilities rather than adding heavyweight libraries.

**Primary recommendation:** Roll-your-own cookie consent using a `CookieConsentBanner` client component + `consent_cookie` (cookie-based) + `cookie_consent_record` (Supabase table); no third-party consent library. Block PostHog via a `useConsentStore` Zustand store check before `posthog.capture()` calls (Phase 15 wires this; Phase 18 provides the store and banner).

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-PRIV-* (65) | Privacy & Data Protection — breach notification, DSAR, cookie consent, policy publication, ICO registration, cross-border transfer docs | Users table schema additions; cookie_consent_record table; sar_log table; legal pages infrastructure; privacy@ email routing |
| REQ-AI-* (12) | EU AI Act disclosure — global AI-assisted badge, per-lesson indicator, WhisperX label, AI transparency policy page | Pure HTML/CSS data attributes + new /legal/ai-transparency page; no new library |
| REQ-A11Y-* (49) | WCAG 2.1 AA audit — 49 criteria across all surfaces | axe-core/playwright already wired; audit + targeted fixes; semantic HTML additions |
| REQ-MINORS-* (58) | Age gating — DOB field, is_minor flag, teen awareness step, minor defaults, 18th-birthday cron | Schema migration 0019; Clerk post-signup profile completion step; cron route extension |
| REQ-CONS-EU-05 | Free beta signup triggers CRD pre-contract information — Phase 18 privacy notice satisfies | Legal pages + signup notice |
| (Consumer/Tax at monetization) | REQ-CONS-* and REQ-TAX-* (44 items) | OUT OF SCOPE — Phase 18 creates the policy page template but does NOT activate checkout wiring |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Cookie consent banner | Browser/Client | Frontend Server (SSR cookie read) | Consent must be visible before any analytics fires; state stored as browser cookie + DB record |
| Legal pages (T&Cs, Privacy, Cookie Policy, AI Transparency) | Frontend Server (SSR) | — | Static MDX/TSX pages; no dynamic data; served from App Router |
| Terms acceptance at signup | API/Backend (server action) | Browser (form step) | Business rule; must be enforced server-side; stored in DB |
| Age gating (DOB collection) | API/Backend (server action + middleware) | Browser (post-signup step) | Server MUST re-validate DOB (REQ-MINORS-GATE-06); UI is a guide, not the gate |
| Minor defaults enforcement | API/Backend (server action on user creation) | — | Minor defaults must be applied atomically at account creation |
| 18th-birthday cron | API/Backend (cron route) | — | Same pattern as Phase 14.4 daily-reminder cron |
| DSAR data export endpoint | API/Backend | — | Authenticated server route; queries all user tables; returns JSON |
| WCAG a11y fixes | Browser/Client | Frontend Server (HTML structure) | Semantic HTML, ARIA attributes, focus management — all in React component layer |
| AI disclosure labels | Browser/Client | — | `data-ai-generated="true"` attributes on specific components; inline badge components |
| SAR log / audit trail | Database/Storage | — | Immutable log table; no UI required beyond the export endpoint |
| ICO registration | Operator task | — | Thiago registers on ico.org.uk (£35/yr small org); ICO number goes in Privacy Policy |
| DPIA document | Operator task | — | Written document; checked into `.planning/legal/` or similar; not a code task |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | ^15.5.14 [VERIFIED: npm registry] | Legal pages as RSC routes | Already in project |
| Drizzle ORM | ^0.41.0 [VERIFIED: npm registry] | Schema migration 0019 + DSAR query | Already in project |
| Clerk (`@clerk/nextjs`) | ^7.3.0 [VERIFIED: npm registry] | Post-signup profile completion step for DOB | Already in project |
| Tailwind CSS v4 | ^4.2.2 [VERIFIED: npm registry] | Styling consent banner, legal pages | Already in project; Phase 14 tokens apply |
| axe-core/playwright | ^4.11.3 [VERIFIED: package.json] | WCAG 2.1 AA automated audit | Already in devDependencies |
| Resend | Already wired (Phase 14.4) | 18th-birthday transition email | `src/lib/emails/` already exists |
| js-cookie | — | Client-side cookie read/write for consent state | Lightweight; OR use document.cookie directly |

### Supporting — Roll-Your-Own Cookie Consent
| Pattern | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zustand `useConsentStore` | Already in project | Block analytics before consent; revocable | This project's existing state pattern |
| Server action `recordConsent()` | N/A | Persist consent record to `cookie_consent_record` | Called when user clicks Accept/Reject |
| `CookieConsentBanner` component | N/A | PECR-compliant banner — rendered in RootLayout | v3.0 launch |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Roll-your-own consent | `react-cookie-consent` v10.0.1 [VERIFIED] | react-cookie-consent is well-maintained but adds a dependency; its styling conflicts with Tailwind v4 custom tokens; doesn't integrate with Supabase-backed consent record without extra wiring |
| Roll-your-own consent | `@osano/cookieconsent` | Enterprise SaaS; overkill for a sole-trader v1 beta |
| Static `.tsx` legal pages | `next-mdx-remote` v6.0.0 [VERIFIED] | MDX is appropriate if Thiago will edit policies in markdown; TSX is appropriate if policies are authored once and rarely touched; TSX preferred for v1 (no extra dependency) |
| TSX legal pages | `contentlayer` | Contentlayer v0.3.4 is effectively abandoned (last release 2023); not recommended |

**Installation (if react-cookie-consent is chosen instead):**
```bash
npm install react-cookie-consent
```

**Version verification:**
```
react-cookie-consent: 10.0.1 (verified 2026-05-08)
next-mdx-remote: 6.0.0 (verified 2026-05-08)
@clerk/nextjs: 7.3.2 (verified 2026-05-08)
```

---

## Architecture Patterns

### System Architecture Diagram

```
User browser
    │
    ▼
RootLayout (app/layout.tsx)
    ├── reads kb_consent cookie (SSR)
    │       │
    │       ▼
    │   [no consent] → render <CookieConsentBanner> (client island)
    │                       │
    │                       ├── Accept → set kb_consent cookie, call recordConsent() server action
    │                       │           → INSERT cookie_consent_record row
    │                       │           → enable PostHog (useConsentStore.setGranted(true))
    │                       └── Reject → set kb_consent=rejected, PostHog stays blocked
    │
    └── [consent=granted] → PostHog loads normally (Phase 15 wires this check)

Signup flow (Clerk + post-signup step)
    │
    ├── Clerk SignUp widget (existing)
    │       └── webhooks or onAfterSignIn redirect
    │
    └── /onboarding/age-gate (new page — post-signup profile completion)
            ├── DOB date picker
            ├── Terms acceptance checkbox (links to /legal/terms)
            ├── If age < 13 → error, block account (REQ-MINORS-GATE-03)
            ├── If 13-17 → teen awareness step (REQ-MINORS-GATE-04, -07)
            └── Server action completeOnboarding() →
                    UPDATE users SET date_of_birth, is_minor, terms_accepted_at, terms_version
                    + IF is_minor: apply minor defaults atomically

Legal pages (App Router RSC)
    /legal/terms           → T&Cs
    /legal/privacy         → Privacy Policy
    /legal/cookie-policy   → Cookie Policy
    /legal/ai-transparency → AI Transparency / Disclosure
    /legal/refund          → Refund Policy (template; activates at monetization)

DSAR endpoint
    GET /api/user/data-export (Clerk auth required)
        └── query all tables keyed to user_id
            → return JSON { users, userVocabMastery, userExerciseLog, ... }
            → INSERT sar_log row

18th-birthday cron (extends Phase 14.4 cron infra)
    /api/cron/birthday-transitions (daily at 02:00 UTC)
        └── SELECT users WHERE date_of_birth IS NOT NULL AND is_minor = true
                AND date_of_birth + INTERVAL '18 years' <= NOW()
            → UPDATE users SET is_minor = false (does NOT change settings — REQ-MINORS-GATE-12)
            → send transition email via Resend
```

### Recommended Project Structure
```
src/
├── app/
│   ├── legal/                          # Legal pages cluster
│   │   ├── terms/page.tsx
│   │   ├── privacy/page.tsx
│   │   ├── cookie-policy/page.tsx
│   │   ├── ai-transparency/page.tsx
│   │   └── refund/page.tsx             # template; visible but "activates at monetization"
│   ├── onboarding/                     # Post-signup DOB + terms step
│   │   └── page.tsx
│   └── api/
│       ├── user/
│       │   └── data-export/route.ts    # DSAR endpoint
│       └── cron/
│           └── birthday-transitions/route.ts
├── components/
│   └── CookieConsentBanner.tsx         # Client island rendered from RootLayout
├── lib/
│   ├── consent/
│   │   └── store.ts                    # Zustand useConsentStore
│   ├── legal/
│   │   └── versions.ts                 # CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION
│   └── db/
│       └── schema.ts                   # migration 0019 additions
└── drizzle/
    └── 0019_legal_compliance.sql
```

### Pattern 1: Roll-Your-Own Cookie Consent Banner

**What:** A client island component in `RootLayout` that reads `kb_consent` cookie SSR-side (to skip banner for returning visitors) and renders a bottom banner on first visit. Consent state flows via a thin Zustand store that PostHog checks before firing events.

**When to use:** PECR compliance; blocks non-essential scripts before consent; must be revocable from footer.

**Example:**
```typescript
// Source: project pattern (Phase 14.4 used same Zustand + server action pattern)
// src/lib/consent/store.ts
import { create } from "zustand";

type ConsentState = "unknown" | "granted" | "rejected";
interface ConsentStore {
  state: ConsentState;
  setGranted: () => void;
  setRejected: () => void;
}

export const useConsentStore = create<ConsentStore>((set) => ({
  state: "unknown",
  setGranted: () => set({ state: "granted" }),
  setRejected: () => set({ state: "rejected" }),
}));
```

```typescript
// src/app/components/CookieConsentBanner.tsx
"use client";
import { useConsentStore } from "@/lib/consent/store";
import { recordConsent } from "@/app/actions/consent";

export function CookieConsentBanner({ initialConsent }: { initialConsent: string | undefined }) {
  const { state, setGranted, setRejected } = useConsentStore();
  // initialConsent from SSR cookie read; if already set, skip render
  if (initialConsent || state !== "unknown") return null;

  return (
    <div role="dialog" aria-label="Cookie consent" aria-modal="false">
      <p>We use cookies for essential functionality and, with your consent, analytics.</p>
      <button onClick={async () => { await recordConsent("granted"); setGranted(); }}>
        Accept
      </button>
      <button onClick={async () => { await recordConsent("rejected"); setRejected(); }}>
        Reject non-essential
      </button>
      <a href="/legal/cookie-policy">Cookie Policy</a>
    </div>
  );
}
```

### Pattern 2: Terms Version Check in Middleware

**What:** After Clerk auth, check if `users.terms_version` matches `CURRENT_TERMS_VERSION`. If not, redirect to `/onboarding/age-gate?reason=terms_update`. Used for re-acceptance when T&Cs change (Phase 18 SC1).

**When to use:** SC1 — "changes require re-acceptance."

```typescript
// Source: project middleware pattern (src/middleware.ts)
// Add to existing clerkMiddleware:
import { CURRENT_TERMS_VERSION } from "@/lib/legal/versions";

// Inside middleware (after admin route check):
if (session.userId && !isLegalRoute(req) && !isOnboardingRoute(req)) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    columns: { terms_version: true, date_of_birth: true }
  });
  if (!user?.terms_version || user.terms_version !== CURRENT_TERMS_VERSION) {
    return NextResponse.redirect(new URL("/onboarding/age-gate", req.url));
  }
}
```

### Pattern 3: Age-Gate Server Action

**What:** `completeOnboarding()` server action validates DOB server-side, derives `is_minor`, applies minor defaults atomically. Client-submitted DOB is the input; server re-computes the age — REQ-MINORS-GATE-06.

```typescript
// Source: project server action pattern (src/app/actions/userPrefs.ts)
"use server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { CURRENT_TERMS_VERSION } from "@/lib/legal/versions";

export async function completeOnboarding(dateOfBirth: string): Promise<{ error?: string }> {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const dob = new Date(dateOfBirth);
  const now = new Date();
  const ageYears = (now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

  if (ageYears < 13) return { error: "under_13" }; // REQ-MINORS-GATE-03

  const isMinor = ageYears < 18;
  await db
    .insert(users)
    .values({
      id: userId,
      date_of_birth: dateOfBirth,
      is_minor: isMinor,
      terms_accepted_at: now,
      terms_version: CURRENT_TERMS_VERSION,
      minor_defaults_applied: isMinor,
      // Apply minor defaults atomically if is_minor (REQ-MINORS-12)
      ...(isMinor ? {
        social_activity_enabled: false, // REQ-MINORS-DEFAULT-01
        marketing_email_opt_in: false,  // REQ-MINORS-DEFAULT-03
      } : {}),
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        date_of_birth: dateOfBirth,
        is_minor: isMinor,
        terms_accepted_at: now,
        terms_version: CURRENT_TERMS_VERSION,
        minor_defaults_applied: isMinor,
      }
    });

  return {};
}
```

### Pattern 4: DSAR Data Export Endpoint

**What:** `GET /api/user/data-export` — Clerk-authenticated route that queries all tables keyed to user_id and returns a JSON bundle. Rate-limited to 2 requests per 24 hours (REQ-PRIV-CA-DSAR-04: "up to 2 requests per year free" is the policy minimum; 2/day is more generous but technically correct).

```typescript
// Source: project API route pattern (src/app/api/review/queue/route.ts)
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [userData, vocabMastery, exerciseLog, songProgress, cookieConsent] =
    await Promise.all([
      db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, userId) }),
      db.query.userVocabMastery.findMany({ where: (m, { eq }) => eq(m.user_id, userId) }),
      db.query.userExerciseLog.findMany({ where: (l, { eq }) => eq(l.user_id, userId) }),
      db.query.userSongProgress.findMany({ where: (p, { eq }) => eq(p.user_id, userId) }),
      db.query.cookieConsentRecord.findMany({ where: (c, { eq }) => eq(c.user_id, userId) }),
    ]);

  // Log the SAR for accountability (REQ-PRIV-UK-DSAR-06)
  await db.insert(sarLog).values({
    user_id_or_email: userId,
    request_date: new Date(),
    outcome: "completed",
  });

  return Response.json({
    exported_at: new Date().toISOString(),
    user: userData,
    vocab_mastery: vocabMastery,
    exercise_log: exerciseLog,
    song_progress: songProgress,
    cookie_consent: cookieConsent,
  }, {
    headers: { "Content-Disposition": `attachment; filename="kitsubeat-data-${userId}.json"` }
  });
}
```

### Pattern 5: AI Disclosure Labels (Pure HTML/CSS — No Library)

**What:** `data-ai-generated="true"` attribute on mnemonic/kanji_breakdown panels, LearnCard containers; a small inline badge component for the lesson panel WhisperX disclosure. REQ-AI-LESSON-04, REQ-AI-LESSON-06, REQ-AI-WHISPER-01, REQ-AI-WHISPER-02.

```tsx
// Source: project component pattern (src/components/ui/ primitives)
// Small reusable badge — add to src/components/ui/AiBadge.tsx
export function AiBadge({ label = "AI-assisted" }: { label?: string }) {
  return (
    <span
      className="text-[10px] font-medium text-[var(--color-text-dim)] opacity-60"
      aria-label={`${label} — generated by artificial intelligence`}
    >
      {label}
    </span>
  );
}

// Usage on FeedbackPanel mnemonic section:
<div data-ai-generated="true" aria-label="AI-generated mnemonic">
  <AiBadge label="AI-assisted" />
  {mnemonic}
</div>

// Usage on verse lyric panel (WhisperX disclosure):
<AiBadge label="AI transcript (WhisperX)" />
```

### Anti-Patterns to Avoid

- **Storing consent in localStorage instead of a cookie:** localStorage is not sent SSR-side; the banner will flash on every page load. Use a `kb_consent` cookie with `SameSite=Lax; Path=/; Max-Age=31536000`.
- **Gating the entire site on Terms acceptance:** The middleware should only redirect authenticated users who haven't accepted; anonymous visitors browse normally. Overly aggressive middleware breaks the free-tier browsing pattern.
- **Storing DOB as a derived age integer:** REQ-MINORS-GATE-02 explicitly requires the full ISO 8601 date for future age re-evaluation. The `date_of_birth DATE` column in Drizzle uses the `date` type (already imported in schema.ts).
- **Applying minor default LIFTING on 18th birthday without user action:** REQ-MINORS-GATE-12 — the transition cron only UNLOCKS settings; it must NOT change `social_activity_enabled` or any privacy setting to a less-private value.
- **Running full axe-core audit in PR-checks:** The existing `a11y.spec.ts` is already correctly gated to `RUN_A11Y=1` (nightly only). Phase 18 adds targeted fix tests that run in normal CI — do not move the full a11y sweep to PR-checks.
- **Implementing checkout CCR wording in Phase 18:** Consumer law requirements for checkout (REQ-CONS-UK-01 through REQ-CONS-EU-07) activate "at monetization" — Phase 18 creates the policy template page but does NOT wire checkout logic.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 18th-birthday age computation | Custom date arithmetic | `date_of_birth + INTERVAL '18 years' <= NOW()` in Postgres/Drizzle SQL | SQL date arithmetic handles leap years and timezone edge cases; JavaScript Date math doesn't |
| Consent state persistence | sessionStorage or React state | `kb_consent` browser cookie + `cookie_consent_record` DB row | Cookie survives page loads and SSR reads; DB row provides the audit trail required by REQ-PRIV-COOKIE-05 |
| Cookie policy table | Manual HTML table | Scripted from a `COOKIES_INVENTORY` constant in `versions.ts` | Keeps cookie list in sync with actual cookies set; easier to update |
| ARIA focus management in modal dialogs | Custom keyboard event listeners | Radix UI `@radix-ui/react-dialog` (already in project, ^1.1.15 [VERIFIED: package.json]) | Radix handles focus trap, Escape key, aria-modal; REQ-A11Y-21 requires this |

---

## Schema Migration Scope (Migration 0019)

**Migration file:** `drizzle/0019_legal_compliance.sql`

### New columns on `users` table

```sql
-- All nullable so existing rows don't need immediate backfill
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "date_of_birth" date,
  ADD COLUMN IF NOT EXISTS "is_minor" boolean,
  ADD COLUMN IF NOT EXISTS "terms_accepted_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "terms_version" text,
  ADD COLUMN IF NOT EXISTS "minor_defaults_applied" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "marketing_email_opt_in" boolean DEFAULT false;
```

**Why nullable:** Existing users have no DOB; Phase 18 handles them with a "complete your profile" nudge rather than a forced redirect that breaks existing sessions.

### New table: `cookie_consent_record`

```sql
CREATE TABLE IF NOT EXISTS "cookie_consent_record" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"           text,  -- nullable: anonymous visitors can consent
  "consent_timestamp" timestamptz NOT NULL DEFAULT now(),
  "consent_version"   text NOT NULL,
  "categories"        jsonb NOT NULL,  -- { "essential": true, "analytics": false }
  "decision"          text NOT NULL,   -- "granted" | "rejected"
  "ip_hash"           text,            -- SHA-256 of IP; not raw IP (data minimization)
  "user_agent"        text
);
CREATE INDEX IF NOT EXISTS "cookie_consent_record_user_id_idx" ON "cookie_consent_record"("user_id");
CREATE INDEX IF NOT EXISTS "cookie_consent_record_timestamp_idx" ON "cookie_consent_record"("consent_timestamp");
```

**Note on IP:** Store a hash of IP, not the raw IP address. Raw IP is personal data under GDPR; a one-way hash of IP+timestamp satisfies the audit requirement without storing PII (REQ-PRIV-COOKIE-05).

### New table: `sar_log` (SAR accountability log)

```sql
CREATE TABLE IF NOT EXISTS "sar_log" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id_or_email" text NOT NULL,
  "request_date"     timestamptz NOT NULL DEFAULT now(),
  "response_date"    timestamptz,
  "outcome"          text,    -- "completed" | "refused_with_reasons" | "pending"
  "notes"            text
);
CREATE INDEX IF NOT EXISTS "sar_log_user_id_idx" ON "sar_log"("user_id_or_email");
```

### Drizzle schema additions (schema.ts)

Add to `users` table:
- `date_of_birth: date("date_of_birth")` — nullable
- `is_minor: boolean("is_minor")` — nullable
- `terms_accepted_at: timestamp("terms_accepted_at", { withTimezone: true })` — nullable
- `terms_version: text("terms_version")` — nullable
- `minor_defaults_applied: boolean("minor_defaults_applied").default(false)`
- `marketing_email_opt_in: boolean("marketing_email_opt_in").default(false)`

**Columns NOT needed on users (covered by separate table or derived):**
- `profile_visibility` — addressed via minor_defaults_applied flag + application logic
- `allow_leaderboards` — REQ-MINORS-DEFAULT-02 says defaults to false; same as `social_activity_enabled` which already exists
- `share_progress_external` — same as `social_activity_enabled` (Phase 14.4 column covers this)
- `push_notifications` — browser permission model; no DB column needed

---

## Common Pitfalls

### Pitfall 1: Consent Banner Causes Layout Shift
**What goes wrong:** Banner renders SSR with `hidden` then flashes visible on hydration, causing CLS.
**Why it happens:** The cookie can only be read SSR-side if passed as a prop from the server component; if the client component checks `document.cookie` post-hydration, there's a flash.
**How to avoid:** Read `kb_consent` cookie in `RootLayout` (server component) and pass as prop to `CookieConsentBanner`. If cookie is set, render `null` immediately server-side — no client-side flash.
**Warning signs:** Lighthouse CLS > 0.1 on first visit.

### Pitfall 2: Terms Acceptance Redirect Breaks Middleware
**What goes wrong:** Overly aggressive middleware redirects unauthenticated users to `/onboarding/age-gate`, breaking the free-tier browsing.
**Why it happens:** Middleware runs on every request; a too-broad matcher catches anonymous users.
**How to avoid:** Only check `terms_version` for authenticated users (`session.userId` must be truthy). Skip redirect for `/legal/*`, `/onboarding/*`, `/sign-in`, `/sign-up`, `/api/*`.
**Warning signs:** Anonymous catalog browsing breaks; 301 redirect loops.

### Pitfall 3: DOB Field Triggers Under-13 Lockout on Existing Users
**What goes wrong:** Existing users without `date_of_birth` get treated as minors or blocked when trying to access protected routes.
**Why it happens:** Migration adds nullable `date_of_birth`; if the middleware checks `is_minor IS NULL` as "must complete onboarding", it locks out all existing users at once.
**How to avoid:** Treat `date_of_birth IS NULL` (existing users before Phase 18) as "exempt from minor defaults until they voluntarily complete the onboarding step." Show a non-blocking nudge banner, not a hard redirect.
**Warning signs:** All existing users redirected to onboarding on Phase 18 deploy.

### Pitfall 4: axe-core a11y Audit Flags More Issues Than Expected
**What goes wrong:** The automated axe scan surfaces 20-30 `aria-*` and color contrast issues that weren't visible to the developer.
**Why it happens:** The Phase 14 a11y spec already passes `RUN_A11Y=1` at >=95, but Phase 18 introduces new components (consent banner, onboarding page, legal pages) and must re-audit those new surfaces.
**How to avoid:** Run `RUN_A11Y=1 npm run test:e2e:a11y` after every new component is added, not just at wave end.
**Warning signs:** PR CI passes but nightly a11y fails.

### Pitfall 5: 18th-Birthday Cron Changes Minor Settings
**What goes wrong:** The cron flips `social_activity_enabled` to `true` when a user turns 18, violating REQ-MINORS-GATE-12.
**Why it happens:** Developers conflate "remove restrictions" with "apply adult defaults."
**How to avoid:** The cron ONLY sets `is_minor = false`. It does NOT touch any other settings column. Email notification tells the user "you can now update your privacy settings."
**Warning signs:** Users report their settings changed unexpectedly after their birthday.

### Pitfall 6: Storing Raw IP in cookie_consent_record
**What goes wrong:** Raw IP address stored as PII in the consent audit table triggers GDPR Art. 5(1)(c) data minimization concerns.
**Why it happens:** Developers copy patterns from GDPR audit log examples that store raw IP.
**How to avoid:** Store `SHA-256(ip_address + salt)` — a one-way hash satisfies the audit purpose without retaining PII.
**Warning signs:** Privacy Policy doesn't mention "IP address" as a collected field but the table stores it.

### Pitfall 7: Minor Defaults Not Applied Atomically
**What goes wrong:** `is_minor = true` is written but minor defaults (e.g., `social_activity_enabled = false`) are applied in a separate DB call that fails silently.
**Why it happens:** Two separate server actions instead of one atomic upsert.
**How to avoid:** `completeOnboarding()` applies all minor defaults in a single `db.insert(...).onConflictDoUpdate()` call. Test with a DOB that resolves to age 15.
**Warning signs:** User with `is_minor = true` has `social_activity_enabled = true` after signup.

### Pitfall 8: WCAG 2.1 AA Fixes Break Exercise Keyboard Navigation
**What goes wrong:** Adding `role="listbox"` and `aria-selected` to exercise option buttons breaks the existing click handler because `listbox` role expects keyboard Enter/Space to work differently.
**Why it happens:** ARIA roles have implicit keyboard interaction contracts.
**How to avoid:** Use `role="list"` on the container and `role="listitem"` on each option; or use `role="group"` with `role="radio"` for mutually exclusive choices. Test with Tab + Enter on exercise session.
**Warning signs:** Playwright keyboard tests fail after ARIA changes.

---

## Scope Scoping — What Phase 18 Does NOT Implement

**Activate at monetization (44 items) — OUT OF SCOPE for Phase 18 code:**
- REQ-CONS-UK-01 through REQ-CONS-UK-07 (CCR checkout wiring)
- REQ-CONS-EU-01 through REQ-CONS-EU-06 (CRD checkout wiring — exception: REQ-CONS-EU-05 is partially covered by the Phase 18 signup notice)
- REQ-CONS-BR-01, REQ-CONS-BR-02 (Brazil withdrawal notice)
- REQ-CONS-CA-01 through REQ-CONS-CA-05 (California ARL)
- REQ-TAX-BR-01, REQ-TAX-BR-02 (Brazil tax counsel)
- REQ-TAX-EU-01 through REQ-TAX-EU-07 (EU VAT OSS)
- REQ-TAX-STRIPE-01 through REQ-TAX-STRIPE-14 (Stripe Tax config)

**Phase 18 action for these:** Create the policy page templates (refund policy page, checkout wording placeholders) and document "activates at monetization" inline. No Stripe Tax code.

**Activate at scale trigger (10 items) — OUT OF SCOPE for Phase 18 code:**
- REQ-TAX-UK-01 through REQ-TAX-UK-07 (UK VAT registration)
- REQ-TAX-US-01 through REQ-TAX-US-03 (US state tax monitoring)

**Phase 18 action for these:** The monitoring hooks (a note in WORKLOG, a "VAT registration threshold" section in the Privacy/T&Cs footer) are documented, but no Stripe Dashboard configuration.

---

## ICO Registration — Operator Task (Not Code)

**What:** REQ-PRIV-UK-POLICY-02 requires ICO registration before processing beta users' data.

**Cost:** £40/year for micro-organisations (turnover < £632,000) under the Data Protection Fee Regulations 2018. [ASSUMED — cost cited from training knowledge; verify at ico.org.uk/about-the-ico/what-we-do/register-of-fee-payers/]

**Process:** Register at https://ico.org.uk/for-organisations/register/ — takes ~10 minutes. ICO sends a registration number (format: ZB123456) by email.

**Phase 18 action:** Thiago registers before Phase 19 beta opens. ICO number is inserted into the Privacy Policy template as a placeholder: `[ICO REGISTRATION NUMBER: ZB000000]`. The plan includes an "operator task" wave that lists registration as a blocking prerequisite before Phase 19.

---

## WCAG 2.1 AA Audit Tooling

**Already in project (verified):**
- `@axe-core/playwright` 4.11.3 — automated scan in `a11y.spec.ts` (nightly gated)
- Phase 14 baseline: existing 11 routes x 2 themes already audited

**What Phase 18 adds to the audit:**
- `/onboarding/age-gate` (new route)
- `/legal/terms`, `/legal/privacy`, `/legal/cookie-policy`, `/legal/ai-transparency` (new routes)
- Targeted component-level fixes (see REQ-A11Y-* groups below)

**Additional tooling considered:**

| Tool | Value | Decision |
|------|-------|----------|
| `pa11y` CLI | Good for HTML validator + WCAG checks on static pages | SKIP — axe-core already covers this; adding another tool adds noise |
| HTML W3C validator API | Catches missing `lang` attribute (REQ-A11Y-37), duplicate IDs (REQ-A11Y-47) | Include ONE targeted check in Wave 0: `npm exec -- playwright` custom script to validate `<html lang>` on each route |
| Color contrast checker | REQ-A11Y-12, REQ-A11Y-17 — non-text contrast | axe-core covers this; Phase 14 tokens already meet 4.5:1 text contrast |

**WCAG audit batching strategy:** The existing `a11y.spec.ts` runs all 11 routes in one spec. Phase 18 extends the ROUTES array to include the 4 new legal pages and the onboarding page — total becomes ~16 routes x 2 themes. Still under the 60-second nightly budget.

---

## Code Examples

### Legal Page Structure (Static TSX)
```typescript
// Source: Next.js App Router RSC pattern (existing project pages)
// src/app/legal/terms/page.tsx
import type { Metadata } from "next";
import { CURRENT_TERMS_VERSION, TERMS_EFFECTIVE_DATE } from "@/lib/legal/versions";

export const metadata: Metadata = {
  title: "Terms & Conditions — KitsuBeat",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-[var(--color-text)]">
      <h1 className="text-3xl font-bold">Terms & Conditions</h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Version {CURRENT_TERMS_VERSION} · Effective {TERMS_EFFECTIVE_DATE}
      </p>
      {/* Policy content */}
    </main>
  );
}
```

```typescript
// src/lib/legal/versions.ts
// Single source of truth for policy version strings used by:
// - Legal pages (display)
// - users.terms_version (database)
// - completeOnboarding() server action (comparison)
// - Middleware (re-acceptance gate)

export const CURRENT_TERMS_VERSION = "1.0.0";
export const TERMS_EFFECTIVE_DATE = "2026-XX-XX"; // set at Phase 19 launch date
export const CURRENT_PRIVACY_VERSION = "1.0.0";
export const CURRENT_COOKIE_CONSENT_VERSION = "1.0";
```

### 18th-Birthday Cron Route (extends Phase 14.4 pattern)
```typescript
// Source: Phase 14.4 cron pattern (src/lib/cron/auth.test.ts documents the pattern)
// src/app/api/cron/birthday-transitions/route.ts
import { assertCronSecret } from "@/lib/cron/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, eq, isNotNull, lte, sql } from "drizzle-orm";

export async function GET(req: Request) {
  const authError = assertCronSecret(req);
  if (authError) return authError;

  // Find users who turned 18 since the last run
  const transitioned = await db
    .update(users)
    .set({ is_minor: false })
    .where(
      and(
        eq(users.is_minor, true),
        isNotNull(users.date_of_birth),
        lte(sql`date_of_birth + INTERVAL '18 years'`, sql`NOW()`)
      )
    )
    .returning({ id: users.id });

  // Send transition email via Resend (src/lib/emails/ pattern)
  // ... (same pattern as dailyReminder.ts)

  return Response.json({ transitioned: transitioned.length });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `cookieconsent` vanilla library | Roll-your-own cookie banner (or `react-cookie-consent` v10) | 2023-2024 | vanilla library doesn't integrate with React/Next.js state |
| Contentlayer for MDX legal pages | Static `.tsx` or `next-mdx-remote` | 2024 (Contentlayer deprecated) | Contentlayer v0.3.4 is unmaintained; don't use |
| WCAG 2.0 baseline | WCAG 2.1 AA (EAA mandates AA, not just 2.0) | EAA implementation deadline 2025 | 49 new/updated criteria vs WCAG 2.0 |

**Deprecated/outdated:**
- `contentlayer`: Last release 2023; GitHub archived. Replace with `next-mdx-remote` v6 or static `.tsx`.
- UK VAT MOSS: Was abolished post-Brexit. UK sellers use EU non-Union OSS directly (REQ-TAX-UK-06).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ICO registration fee is £40/year for micro-organisations | ICO Registration section | Cost slightly different; no code impact; operator verifies before registering |
| A2 | Clerk `@clerk/nextjs` v7 does not support native custom DOB field in the SignUp widget (requires post-signup step) | Pattern 3 | If Clerk v7 added native custom fields, the post-signup page is still valid but slightly redundant |
| A3 | Supabase and Vercel have UK IDTA addenda (REQ-PRIV-UK-XFER-01, -02) | Don't Hand-Roll | If a provider lacks IDTA, Thiago must execute SCCs manually before Phase 19 |
| A4 | `react-cookie-consent` v10.0.1 is compatible with Next.js 15 App Router | Standard Stack alternatives | If compatibility issue found, use roll-your-own (primary recommendation) |

---

## Open Questions

1. **Clerk post-signup redirect flow**
   - What we know: Clerk's `afterSignUpUrl` config redirects after signup. Phase 14.4 used Clerk webhooks for user creation events.
   - What's unclear: Whether Clerk's `afterSignUpUrl` allows a multi-step onboarding page with form submission before the user is considered "complete" — or whether the onboarding page must check Clerk session within the same request.
   - Recommendation: Use `afterSignUpUrl="/onboarding/age-gate"` in the Clerk environment config. The onboarding page is a standard Next.js route; Clerk session is available via `auth()` as normal. No Clerk-specific complexity.

2. **Does the middleware T&C check add latency?**
   - What we know: Middleware runs on every route; a DB query in middleware adds ~20-30ms per request.
   - What's unclear: Whether a Supabase query per request is acceptable at launch.
   - Recommendation: Cache the `terms_version` check result in the Clerk session's `publicMetadata` field (`publicMetadata.terms_version`) — update it server-side in `completeOnboarding()`. Middleware reads metadata from the Clerk JWT (0ms DB query). This is the Clerk-idiomatic approach and removes the DB call from middleware entirely.

3. **Which legal pages need i18n (English + Portuguese)?**
   - What we know: REQ-PRIV-BR-POLICY-01 requires a "Brazilian Portuguese section" in the Privacy Policy. REQ-MINORS-BR-01 requires an LGPD Art. 14 disclosure section in Portuguese.
   - What's unclear: Whether the entire Privacy Policy must be in Portuguese or just Brazil-specific sections.
   - Recommendation: Single Privacy Policy page with a "Para usuários brasileiros" (For Brazilian users) section in Portuguese within the same English document. This satisfies LGPD without requiring a full i18n infrastructure. Mark the section clearly with `lang="pt-BR"` on the section element (also satisfies REQ-A11Y-38).

4. **SAR log — admin-only or not?**
   - What we know: The `sar_log` table is for accountability; ICO may request access to it. No UI is required.
   - What's unclear: Whether it needs an admin dashboard view in Phase 18.
   - Recommendation: No admin UI in Phase 18. The table exists; Thiago can query it via Supabase Studio or `drizzle-kit studio`. Flag for Phase 20 if an admin SAR management UI is needed.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All JS tooling | ✓ | v24.15.0 | — |
| npm | Package install | ✓ | 11.12.1 | — |
| Drizzle ORM | Migration 0019 | ✓ | 0.41.0 | — |
| `@axe-core/playwright` | WCAG a11y audit | ✓ | 4.11.3 | — |
| Clerk (`@clerk/nextjs`) | Onboarding redirect | ✓ | 7.3.0 | — |
| Resend | 18th-birthday email | Phase 14.4 wired | (in lib/emails) | — |
| `react-cookie-consent` | Cookie banner (alt) | npm installable | 10.0.1 | Roll-your-own (primary) |
| Radix UI Dialog | Cookie banner modal (a11y) | ✓ | 1.1.15 | — |
| Supabase (live) | DSAR query, cookie_consent_record | ✓ (production) | — | — |

**Missing dependencies with no fallback:** None — all required tooling is present.

**Operator prerequisites (not code):**
- ICO registration (blocking before Phase 19 launch)
- privacy@kitsubeat.com email alias (blocking before Phase 19)
- DPIA document drafted (blocking before Phase 19)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 (unit/integration) + Playwright 1.59.1 (e2e + a11y) |
| Config file | `vitest.config.ts` (unit/integration), `playwright.config.ts` (e2e) |
| Quick run command | `npm run test:unit && npm run test:integration` |
| Full suite command | `npm run test:all` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-MINORS-GATE-03 | Under-13 DOB rejected server-side | unit | `vitest run src/app/actions/` | ❌ Wave 0 |
| REQ-MINORS-GATE-06 | Server re-validates DOB regardless of client | unit | `vitest run src/app/actions/` | ❌ Wave 0 |
| REQ-MINORS-12 | Minor defaults applied atomically at signup | integration | `vitest run tests/integration/` | ❌ Wave 0 |
| REQ-MINORS-GATE-11 | 18th-birthday cron sets is_minor=false | integration | `vitest run tests/integration/` | ❌ Wave 0 |
| REQ-PRIV-COOKIE-05 | Consent record inserted in DB | integration | `vitest run tests/integration/` | ❌ Wave 0 |
| REQ-PRIV-UK-DSAR-04 | DSAR returns all user tables as JSON | integration | `vitest run tests/integration/` | ❌ Wave 0 |
| REQ-A11Y-26 | Skip-to-main-content link present | e2e (a11y) | `npm run test:e2e:a11y` | Extends existing a11y.spec.ts |
| REQ-A11Y-37 | `<html lang="en">` present | unit/e2e | axe-core scan | Existing a11y.spec.ts |
| REQ-AI-LESSON-04 | `data-ai-generated="true"` on mnemonic panel | unit | `vitest run` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:unit`
- **Per wave merge:** `npm run test:unit && npm run test:integration`
- **Phase gate:** Full suite green + `RUN_A11Y=1 npm run test:e2e:a11y` before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/integration/legal-compliance.test.ts` — covers REQ-MINORS-GATE-03, REQ-MINORS-GATE-06, REQ-MINORS-12, REQ-MINORS-GATE-11, REQ-PRIV-COOKIE-05, REQ-PRIV-UK-DSAR-04
- [ ] `src/app/actions/__tests__/onboarding.test.ts` — unit tests for `completeOnboarding()` DOB validation
- [ ] `src/app/actions/__tests__/consent.test.ts` — unit tests for `recordConsent()` server action

*(Existing `a11y.spec.ts` infrastructure covers all REQ-A11Y-* — extend ROUTES array in Wave 0 to add new legal/onboarding routes.)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | partial | Age gate POST is authenticated via Clerk; no new auth surface |
| V3 Session Management | no | No new session tokens introduced |
| V4 Access Control | yes | DSAR endpoint — must verify Clerk session matches requested user_id |
| V5 Input Validation | yes | DOB input: server-side zod validation (`z.string().datetime()` or ISO date regex); terms_version: enum check against `CURRENT_TERMS_VERSION` |
| V6 Cryptography | partial | IP hashing in `cookie_consent_record` uses SHA-256 (never hand-roll — use Node `crypto.createHash`) |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| DSAR endpoint returns another user's data | Information Disclosure | Always filter by `auth().userId`; test with two users in integration test |
| Age bypass via DOB manipulation (client sends `1990-01-01` after UI blocked under-13 flow) | Tampering | Server re-validates DOB in `completeOnboarding()`; REQ-MINORS-GATE-06 |
| Consent record spoofing (POST with `decision=granted` without user action) | Tampering | `recordConsent()` is a server action authenticated by Clerk; anonymous consent is tracked by session/IP only; no unsigned elevation |
| Cookie consent banner hidden by ad-blocker | Denial of Service | Design banner so absence defaults to "no consent" (PostHog stays blocked); this is the compliant posture |

---

## Sources

### Primary (HIGH confidence)
- 17-ANALYSIS.md (Phase 17 deliverable) — authoritative source for all 238 REQ-* obligations
- `src/lib/db/schema.ts` — verified schema state; migration 0018 is the latest
- `package.json` — verified all dependency versions
- `drizzle/0018_virality_engagement.sql` — verified migration pattern and SQL style
- `tests/e2e/a11y.spec.ts` — verified existing a11y infrastructure

### Secondary (MEDIUM confidence)
- npm registry: `react-cookie-consent@10.0.1`, `next-mdx-remote@6.0.0`, `@clerk/nextjs@7.3.2` — verified 2026-05-08
- Existing codebase patterns (middleware.ts, server actions, cron test stubs) — verified by file inspection

### Tertiary (LOW confidence)
- ICO registration fee (£40/year) — training knowledge; verify at ico.org.uk [ASSUMED]
- Supabase/Vercel UK IDTA addenda status — training knowledge; must be verified before Phase 19 [ASSUMED: A3]

---

## Project Constraints (from CLAUDE.md)

- **Dual-graph MCP policy:** When `graph_continue` is called in implementation agents, they must follow the session-state and confidence-cap rules in CLAUDE.md.
- **Context Store:** Every implementation agent must append decisions to `.dual-graph/context-store.json`.
- **Session end:** When done, update `CONTEXT.md` with Current Task / Key Decisions / Next Steps (max 20 lines).
- **Caveman/commit pattern:** Use `caveman-commit` for commits; English in main-thread.
- **Local-only tooling:** All crypto (SHA-256 for IP hash) uses Node `crypto` module — no cloud API calls.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via npm registry; project patterns verified via codebase inspection
- Architecture: HIGH — patterns derived directly from existing project code (middleware.ts, server actions, cron stubs)
- Pitfalls: HIGH — derived from 17-ANALYSIS.md obligations + known Next.js/Clerk gotchas
- Schema migration: HIGH — current schema inspected; migration 0019 is confirmed next in sequence

**Research date:** 2026-05-08
**Valid until:** 2026-06-08 (30 days — stable domain; Clerk API and Next.js 15 don't change frequently)
