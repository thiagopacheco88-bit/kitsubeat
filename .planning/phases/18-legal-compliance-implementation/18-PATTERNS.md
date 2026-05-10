# Phase 18: Legal & Compliance Implementation — Pattern Map

**Mapped:** 2026-05-08
**Files analyzed:** 17
**Analogs found:** 17 / 17

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `drizzle/0019_legal_compliance.sql` | migration | batch | `drizzle/0018_virality_engagement.sql` | exact |
| `src/lib/db/schema.ts` | model | CRUD | `src/lib/db/schema.ts` (existing users table additions) | exact |
| `src/lib/legal/versions.ts` | utility | transform | `src/lib/exercises/feature-flags.ts` | role-match |
| `src/lib/consent/store.ts` | store | event-driven | `src/stores/exerciseSession.ts` | role-match |
| `src/app/components/CookieConsentBanner.tsx` | component | request-response | `src/app/components/home/StreakSaverToast.tsx` | exact |
| `src/app/actions/consent.ts` | service | CRUD | `src/app/actions/userPrefs.ts` | exact |
| `src/app/onboarding/page.tsx` | component | request-response | `src/app/profile/page.tsx` | role-match |
| `src/app/legal/terms/page.tsx` (+ siblings) | component | request-response | `src/app/songs/page.tsx` (static RSC page) | role-match |
| `src/app/api/user/data-export/route.ts` | controller | CRUD | `src/app/api/review/queue/route.ts` | exact |
| `src/app/api/cron/birthday-transitions/route.ts` | controller | batch | `src/app/api/cron/daily-reminder/route.ts` | exact |
| `src/components/ui/AiBadge.tsx` | component | transform | `src/components/ui/Badge.tsx` | exact |
| `src/components/ProfileNudgeBanner.tsx` | component | event-driven | `src/app/components/home/StreakSaverToast.tsx` | role-match |
| `src/components/DataExportButton.tsx` | component | request-response | `src/app/profile/ProfileForm.tsx` (client form) | role-match |
| `src/app/songs/[slug]/components/FeedbackPanel.tsx` (WCAG fix) | component | request-response | `src/app/songs/[slug]/components/FeedbackPanel.tsx` (self) | exact |
| `src/middleware.ts` (terms version check addition) | middleware | request-response | `src/middleware.ts` (self, admin gate pattern) | exact |
| `tests/integration/legal-compliance.test.ts` | test | batch | `tests/integration/theme-persistence.test.ts` | exact |
| `src/app/actions/__tests__/onboarding.test.ts` | test | CRUD | `tests/integration/activity-events-emission.test.ts` | role-match |

---

## Pattern Assignments

### `drizzle/0019_legal_compliance.sql` (migration, batch)

**Analog:** `drizzle/0018_virality_engagement.sql`

**Header comment pattern** (lines 1–7):
```sql
-- drizzle/0019_legal_compliance.sql
-- Phase 18: Legal & Compliance — all schema changes in one atomic file
--
-- Applied via: tsx scripts/apply-migrations.ts (auto-discovered alphabetically).
-- DO NOT use drizzle-kit migrate — see Phase 11.6 pitfall re: corrupted journal.

BEGIN;
```

**ALTER TABLE + conditional constraint pattern** (lines 9–27):
```sql
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "social_activity_enabled" boolean NOT NULL DEFAULT false,
  ...

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_streak_saver_token_check'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_streak_saver_token_check"
        CHECK (streak_saver_token IN (0, 1));
  END IF;
END $$;
```

**New table + index pattern** (lines 30–56):
```sql
CREATE TABLE IF NOT EXISTS "activity_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  ...
);

CREATE INDEX IF NOT EXISTS "activity_events_created_at_idx"
  ON "activity_events" ("created_at" DESC);
```

**Footer pattern** (line 57):
```sql
COMMIT;
```

**Key rule:** `ADD COLUMN IF NOT EXISTS` for all new user columns (nullable so existing rows don't need backfill). Use `BEGIN; ... COMMIT;` wrapper. Use `--> statement-breakpoint` comment between logical sections.

---

### `src/lib/db/schema.ts` — users table additions + 2 new tables

**Analog:** `src/lib/db/schema.ts` (Phase 14.4 additions at lines 673–731, users table at lines 426–462)

**Import block** (lines 1–21 — already present, no additions needed):
```typescript
import {
  pgTable, pgEnum, pgMaterializedView,
  uuid, text, integer, jsonb, timestamp, date, unique,
  boolean, real, smallint, index, primaryKey, numeric, check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
```

**Adding columns to existing users table** — copy the Phase 14.4 pattern (lines 454–459):
```typescript
// Phase 14.4: Virality & Engagement
social_activity_enabled: boolean("social_activity_enabled").notNull().default(false),
streak_saver_token: integer("streak_saver_token").notNull().default(0),
streak_saver_pending: boolean("streak_saver_pending").notNull().default(false),
```

**New table pattern with indexes** — copy activityEvents table (lines 682–708):
```typescript
export const cookieConsentRecord = pgTable(
  "cookie_consent_record",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: text("user_id"),  // nullable: anonymous visitors
    consent_timestamp: timestamp("consent_timestamp", { withTimezone: true }).defaultNow().notNull(),
    ...
  },
  (table) => [
    index("cookie_consent_record_user_id_idx").on(table.user_id),
    index("cookie_consent_record_timestamp_idx").on(table.consent_timestamp),
  ]
);

export type CookieConsentRecord = typeof cookieConsentRecord.$inferSelect;
```

**Phase comment separator** — each cluster of additions gets a comment banner:
```typescript
// ─── Phase 18: Legal & Compliance ────────────────────────────────────────────
```

---

### `src/lib/legal/versions.ts` (utility, transform)

**Analog:** `src/lib/exercises/feature-flags.ts` (named export constants pattern)

**Full file pattern** — simple named constants file, no imports needed:
```typescript
/**
 * Legal policy version strings — single source of truth.
 * Used by: legal pages (display), users.terms_version (DB),
 * completeOnboarding() (comparison), middleware (re-acceptance gate).
 */
export const CURRENT_TERMS_VERSION = "1.0.0";
export const TERMS_EFFECTIVE_DATE = "2026-XX-XX"; // set at Phase 19 launch date
export const CURRENT_PRIVACY_VERSION = "1.0.0";
export const CURRENT_COOKIE_CONSENT_VERSION = "1.0";
```

No default export. Named exports only — same as feature-flags.ts pattern.

---

### `src/lib/consent/store.ts` (store, event-driven)

**Analog:** `src/stores/exerciseSession.ts` (Zustand store without persist middleware)

**Import pattern** (lines 11–12 of exerciseSession.ts):
```typescript
import { create } from "zustand";
```

**Store shape pattern** — thin state + setter actions, no persist (consent lives in cookie not localStorage):
```typescript
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

**Key difference from exerciseSession.ts:** No `persist` middleware (no localStorage — consent state is in the `kb_consent` cookie and DB, not localStorage). No `_hasHydrated` guard needed — the `initialConsent` SSR prop handles hydration.

---

### `src/app/components/CookieConsentBanner.tsx` (component, request-response)

**Analog:** `src/app/components/home/StreakSaverToast.tsx`

**Directive + import pattern** (lines 1–5 of StreakSaverToast.tsx):
```typescript
"use client";

import { useEffect, useState } from "react";
import { clearStreakSaverPending } from "@/app/actions/userPrefs";
```

**SSR hydration guard pattern** (lines 43–65 of StreakSaverToast.tsx):
```typescript
const [mounted, setMounted] = useState(false);
useEffect(() => {
  setMounted(true);
  // ...
}, []);
if (!mounted || !visible) return null;
```

**For CookieConsentBanner:** Use `initialConsent` prop from server (RootLayout reads `kb_consent` cookie SSR-side) to skip mount flash — no `mounted` guard needed IF server passes prop. If `initialConsent` is set, return `null` immediately.

**ARIA pattern for dialogs** (StreakSaverToast lines 70–88):
```typescript
<div
  role="status"
  aria-live="polite"
  className="fixed ..."
>
```

For the cookie banner use `role="dialog"` + `aria-label="Cookie consent"` (it is a blocking decision, not a notification).

**Button pattern** (lines 79–87 of StreakSaverToast.tsx):
```typescript
<button
  aria-label="Dismiss notification"
  onClick={() => setVisible(false)}
  className="ml-auto flex items-center justify-center ..."
  style={{ minHeight: "44px", minWidth: "44px" }}
>
```

All buttons need `style={{ minHeight: "44px", minWidth: "44px" }}` for WCAG 2.5.5 compliance — same as StreakSaverToast tap target rule.

**Tailwind token discipline** — all colors via `var(--color-*)`, radii via `var(--radius-*)`, shadows via `var(--shadow-*)`. No raw hex values.

---

### `src/app/actions/consent.ts` (service, CRUD)

**Analog:** `src/app/actions/userPrefs.ts`

**"use server" directive + import block** (lines 1–11 of userPrefs.ts):
```typescript
"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, subscriptions } from "@/lib/db/schema";
```

**Server action with auth check pattern** (lines 192–225 of userPrefs.ts — setThemePreference):
```typescript
export async function setThemePreference(
  userId: string,
  value: ThemePreference
): Promise<void> {
  if (!userId) throw new Error("userId is required");
  if (!VALID_THEMES.includes(value)) {
    throw new Error(`themePreference must be one of: ${VALID_THEMES.join(", ")}`);
  }
  await db
    .insert(users)
    .values({ id: userId, themePreference: value })
    .onConflictDoUpdate({
      target: users.id,
      set: { themePreference: value, updated_at: new Date() },
    });
  // Cookie write via dynamic import to keep next/headers out of static dep graph
  const { cookies } = await import("next/headers");
  const c = await cookies();
  c.set("kb_consent", value, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
    path: "/",
  });
}
```

**Key pattern to copy:** Dynamic `import("next/headers")` for cookie writes inside server actions (prevents jsdom crash in unit tests). Return type `Promise<void>` for mutations, `Promise<{ error?: string }>` for actions that can fail with user-facing errors.

---

### `src/app/onboarding/page.tsx` (component, request-response)

**Analog:** `src/app/profile/page.tsx`

**RSC server component with Clerk auth + data fetch pattern** (lines 1–16 of profile/page.tsx):
```typescript
import { getUserPrefs, isPremium } from "@/app/actions/userPrefs";
import { DEFAULT_NEW_CARD_CAP, getCurrentUserId, PREMIUM_NEW_CARD_CAP_CEILING } from "@/lib/user-prefs";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const userId = await getCurrentUserId();
  const [prefs, premium] = await Promise.all([
    getUserPrefs(userId),
    isPremium(userId),
  ]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 text-[var(--color-text)] sm:px-6">
      ...
      <ProfileForm userId={userId} ... />
    </main>
  );
}
```

**Layout token pattern** (profile/page.tsx lines 19–28):
```typescript
<main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 text-[var(--color-text)] sm:px-6">
  <header className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
      Account
    </p>
    <h1 className="mt-1 text-3xl font-bold">Profile</h1>
  </header>
```

For onboarding: same `max-w-2xl` container, same card pattern for each form section, same `text-[var(--color-text)]` base.

---

### `src/app/legal/terms/page.tsx` + sibling legal pages (component, request-response)

**Analog:** `src/app/songs/page.tsx` + `src/app/profile/page.tsx`

**Static RSC page with metadata export** — from RESEARCH.md code examples (the project pattern):
```typescript
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
    </main>
  );
}
```

**No `export const dynamic` needed** — these are fully static (no per-request data). No `"use client"`.

**Prose section pattern** — use `max-w-3xl` (vs `max-w-2xl` for forms) for legal text readability. Semantic heading hierarchy: `<h1>` page title, `<h2>` sections, `<h3>` subsections.

**Brazilian Portuguese section** — `lang="pt-BR"` attribute on the `<section>` element (REQ-A11Y-38 + REQ-PRIV-BR-POLICY-01):
```tsx
<section lang="pt-BR" aria-label="Para usuários brasileiros">
  <h2>Para usuários brasileiros</h2>
  {/* LGPD disclosure in Portuguese */}
</section>
```

---

### `src/app/api/user/data-export/route.ts` (controller, CRUD)

**Analog:** `src/app/api/review/queue/route.ts`

**Route file header + dynamic export** (lines 35–37 of queue/route.ts):
```typescript
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
```

**Clerk auth check pattern** (lines 71–84 of queue/route.ts):
```typescript
export async function GET() {
  const userId = await getCurrentUserId();

  // Auth gate
  const premium = await isPremium(userId);
  if (!premium) {
    return NextResponse.json(
      { error: "premium_required" },
      { status: 403, headers: { "Cache-Control": "private, no-store" } }
    );
  }
```

**For DSAR endpoint:** Replace `isPremium` gate with a Clerk `auth()` check — must be authenticated (any user), but no premium requirement:
```typescript
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  ...
}
```

**Parallel DB query pattern** (lines 86–125 of queue/route.ts):
```typescript
const [userData, vocabMastery, ...] = await Promise.all([
  db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, userId) }),
  db.query.userVocabMastery.findMany({ where: (m, { eq }) => eq(m.user_id, userId) }),
  ...
]);
```

**Response with Content-Disposition** (DSAR-specific, append to Response.json call):
```typescript
return Response.json(payload, {
  headers: {
    "Cache-Control": "private, no-store",
    "Content-Disposition": `attachment; filename="kitsubeat-data-${userId}.json"`,
  },
});
```

---

### `src/app/api/cron/birthday-transitions/route.ts` (controller, batch)

**Analog:** `src/app/api/cron/daily-reminder/route.ts` — exact match

**Full file structure** (daily-reminder/route.ts lines 1–102):

**Header comment + imports** (lines 1–20):
```typescript
/**
 * Phase 18 — 18th-birthday minor→adult transition cron.
 * Runs daily at 02:00 UTC via Vercel Cron.
 * CRITICAL: Do NOT add `export const runtime = "nodejs"` — causes build failures.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertCronSecret } from "@/lib/cron/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, eq, isNotNull, lte, sql } from "drizzle-orm";
```

**`export const dynamic` + auth guard pattern** (lines 22–26):
```typescript
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = assertCronSecret(request);
  if (unauthorized) return unauthorized;
```

**assertCronSecret pattern** (from `src/lib/cron/auth.ts` lines 15–23):
```typescript
export function assertCronSecret(request: NextRequest): Response | null {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}
```

**Response shape** (lines 93–101 of daily-reminder/route.ts):
```typescript
return NextResponse.json({
  ok: true,
  kind: "birthday_transitions",
  users_evaluated: N,
  transitioned: M,
  dry_run: isDryRun,
  duration_ms: Date.now() - startMs,
});
```

**Dry-run guard** (lines 29–30 of daily-reminder/route.ts):
```typescript
const startMs = Date.now();
const isDryRun = !process.env.RESEND_API_KEY;
```

---

### `src/components/ui/AiBadge.tsx` (component, transform)

**Analog:** `src/components/ui/Badge.tsx` — exact match (same directory, same primitive pattern)

**Import + export pattern** (Badge.tsx lines 23–52):
```typescript
import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
```

**AiBadge is simpler than Badge** — no CVA needed (single variant). Copy the `<span>` return pattern:
```typescript
// No "use client" — pure presentational, no hooks
import type { ReactNode } from "react";

interface AiBadgeProps {
  label?: string;
  className?: string;
}

export function AiBadge({ label = "AI-assisted", className }: AiBadgeProps) {
  return (
    <span
      className={`text-[10px] font-medium text-[var(--color-text-dim)] opacity-60 ${className ?? ""}`}
      aria-label={`${label} — generated by artificial intelligence`}
    >
      {label}
    </span>
  );
}
```

**No default export** — named export only, same as Badge.tsx (`export function Badge`).

---

### `src/components/ProfileNudgeBanner.tsx` (component, event-driven)

**Analog:** `src/app/components/home/StreakSaverToast.tsx`

**Client island with dismissible state pattern** (StreakSaverToast lines 15–88):
```typescript
"use client";

import { useEffect, useState } from "react";

export function ProfileNudgeBanner({ userId }: { userId: string }) {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-2)] px-4 py-3"
    >
      ...
      <button
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        style={{ minHeight: "44px", minWidth: "44px" }}
      >
        ×
      </button>
    </div>
  );
}
```

**Key difference from StreakSaverToast:** No auto-dismiss timer. Non-blocking — shows a link to `/onboarding/age-gate` rather than a hard redirect.

---

### `src/components/DataExportButton.tsx` (component, request-response)

**Analog:** Profile form client buttons in `src/app/profile/ProfileForm.tsx`

**Client component with fetch + loading state pattern** (modeled on ProfileForm pattern):
```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function DataExportButton() {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch("/api/user/data-export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "kitsubeat-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="secondary"
      size="md"
      onClick={handleExport}
      disabled={loading}
      aria-label="Download your data"
    >
      {loading ? "Preparing..." : "Download my data"}
    </Button>
  );
}
```

Import `Button` from `@/components/ui/Button` — never inline button styles.

---

### WCAG fixes to `FeedbackPanel.tsx`, `KanjiBreakdownSection.tsx`, `LearnCard.tsx`

**Analog:** `src/app/songs/[slug]/components/FeedbackPanel.tsx` (self) + `src/components/ui/Button.tsx` (tap targets)

**data-ai-generated attribute pattern** (from RESEARCH.md Pattern 5 + Button.tsx ARIA patterns):
```tsx
// FeedbackPanel.tsx mnemonic section — wrap in disclosure div
<div data-ai-generated="true" aria-label="AI-generated mnemonic">
  <AiBadge label="AI-assisted" />
  {question.mnemonic}
</div>
```

**ARIA role pattern for exercise options** — use `role="list"` + `role="listitem"` (not `listbox`/`option` which imply keyboard contracts):
```tsx
<ul role="list" aria-label="Answer choices">
  {choices.map((choice) => (
    <li key={choice} role="listitem">
      <button
        aria-pressed={chosenAnswer === choice}
        style={{ minHeight: "44px" }}
        ...
      >
        {choice}
      </button>
    </li>
  ))}
</ul>
```

**focus-visible ring** — copy from Button.tsx CVA base (line 23):
```typescript
"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
```

Apply to any interactive element that currently lacks a visible focus indicator.

---

### `src/middleware.ts` — terms version check addition

**Analog:** `src/middleware.ts` (self — admin gate pattern, lines 18–43)

**Existing structure to extend** (lines 18–43 of middleware.ts):
```typescript
export default clerkMiddleware(async (auth, req) => {
  if (!isAdminRoute(req)) return; // early-return for non-admin
  const session = await auth();
  if (!session.userId) {
    const signIn = new URL("/sign-in", req.url);
    signIn.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signIn);
  }
  // ... admin email check
});
```

**Addition pattern** — add AFTER the admin gate block, before the final pass-through. Use `createRouteMatcher` for legal/onboarding exclusion:
```typescript
const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);
const isLegalOrOnboardingRoute = createRouteMatcher([
  "/legal(.*)", "/onboarding(.*)", "/sign-in(.*)", "/sign-up(.*)", "/api(.*)"
]);

export default clerkMiddleware(async (auth, req) => {
  // 1. Admin gate (existing — do not change)
  if (isAdminRoute(req)) {
    // ... existing admin logic ...
  }

  // 2. Terms version gate (Phase 18 addition)
  // Only check authenticated users; skip legal/onboarding/API routes
  if (!isLegalOrOnboardingRoute(req)) {
    const session = await auth();
    if (session.userId) {
      // Use Clerk publicMetadata to avoid DB query (RESEARCH open question 2)
      const termsVersion = session.sessionClaims?.publicMetadata?.terms_version as string | undefined;
      if (!termsVersion || termsVersion !== CURRENT_TERMS_VERSION) {
        return NextResponse.redirect(new URL("/onboarding/age-gate", req.url));
      }
    }
  }
});
```

**Critical:** The terms check must ONLY run for `session.userId` truthy AND exclude `/legal/*`, `/onboarding/*`, `/api/*` — see RESEARCH Pitfall 2 (overly aggressive redirect breaks anonymous browsing).

---

### `tests/integration/legal-compliance.test.ts` (test, batch)

**Analog:** `tests/integration/theme-persistence.test.ts` — exact structural match

**Test file header + skip guard pattern** (lines 1–26 of theme-persistence.test.ts):
```typescript
/**
 * tests/integration/legal-compliance.test.ts
 *
 * Phase 18 — completeOnboarding(), recordConsent(), DSAR endpoint round-trips.
 * Requires: TEST_DATABASE_URL set + migration 0019 applied.
 */
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { sql } from "drizzle-orm";

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ set: vi.fn() }),
}));

import { getTestDb, resetTestProgress, TEST_USER_ID } from "../support/test-db";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;
```

**Seed + cleanup pattern** (lines 28–39 of theme-persistence.test.ts):
```typescript
describeIfTestDb("legal compliance", () => {
  beforeEach(async () => {
    await resetTestProgress(TEST_USER_ID);
    const db = getTestDb();
    await db.execute(sql`INSERT INTO users (id) VALUES (${TEST_USER_ID}) ON CONFLICT (id) DO NOTHING`);
  });

  afterAll(async () => {
    await resetTestProgress(TEST_USER_ID);
  });
```

**Test case naming pattern** (lines 40–68 of theme-persistence.test.ts):
```typescript
  it("completeOnboarding rejects under-13 DOB", async () => { ... });
  it("completeOnboarding sets is_minor=true for age 15", async () => { ... });
  it("minor defaults applied atomically", async () => { ... });
  it("18th-birthday transition sets is_minor=false only", async () => { ... });
  it("recordConsent inserts cookie_consent_record row", async () => { ... });
```

---

### `src/app/actions/__tests__/onboarding.test.ts` (test, CRUD)

**Analog:** `tests/integration/activity-events-emission.test.ts` (structure) + `src/lib/cron/auth.test.ts` (unit test pattern)

**Unit test with vi.mock for DB** (activity-events-emission.test.ts lines 14–29):
```typescript
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

async function getTestDb() {
  const { getTestDb: _getTestDb } = await import("../support/test-db");
  return _getTestDb();
}
```

**For pure unit tests of `completeOnboarding()` DOB validation** — no DB needed, mock Clerk `auth()`:
```typescript
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "test-user-123" }),
}));
vi.mock("@/lib/db", () => ({
  db: { insert: vi.fn().mockReturnValue({ onConflictDoUpdate: vi.fn().mockResolvedValue({}) }) },
}));
```

---

## Shared Patterns

### Authentication — Clerk `auth()` in server actions
**Source:** `src/app/actions/userPrefs.ts` lines 65–68 / `src/app/api/review/queue/route.ts` lines 71–84
**Apply to:** `src/app/actions/consent.ts`, `src/app/api/user/data-export/route.ts`
```typescript
import { auth } from "@clerk/nextjs/server";

const { userId } = await auth();
if (!userId) return { error: "Not authenticated" };
```

### Cron auth guard
**Source:** `src/lib/cron/auth.ts` lines 15–23
**Apply to:** `src/app/api/cron/birthday-transitions/route.ts`
```typescript
const unauthorized = assertCronSecret(request);
if (unauthorized) return unauthorized;
```

### DB upsert pattern (insert + onConflictDoUpdate)
**Source:** `src/app/actions/userPrefs.ts` lines 102–119
**Apply to:** `src/app/actions/consent.ts`, `src/app/actions/completeOnboarding.ts`
```typescript
await db
  .insert(users)
  .values({ id: userId, ... })
  .onConflictDoUpdate({
    target: users.id,
    set: { ...fields, updated_at: new Date() },
  });
```

### Cookie write via dynamic next/headers import
**Source:** `src/app/actions/userPrefs.ts` lines 216–224
**Apply to:** `src/app/actions/consent.ts`
```typescript
const { cookies } = await import("next/headers");
const c = await cookies();
c.set("kb_consent", value, {
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax",
  httpOnly: false,
  path: "/",
});
```

### SSR cookie read in RootLayout
**Source:** `src/app/layout.tsx` lines 47–48
**Apply to:** `src/app/layout.tsx` (addition — read `kb_consent` cookie alongside `kb_theme`)
```typescript
const cookieStore = await cookies();
const stored = cookieStore.get("kb_theme")?.value;
const consentCookie = cookieStore.get("kb_consent")?.value; // Phase 18 addition
```

### WCAG tap target — 44px minimum
**Source:** `src/components/ui/Button.tsx` line 37, `src/app/components/home/StreakSaverToast.tsx` line 83
**Apply to:** All new interactive elements in CookieConsentBanner, ProfileNudgeBanner, DataExportButton
```typescript
style={{ minHeight: "44px", minWidth: "44px" }}
```

### Focus ring for interactive elements
**Source:** `src/components/ui/Button.tsx` lines 22–23
**Apply to:** All new buttons that lack focus-visible styling
```typescript
"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
```

### Drizzle parallel query
**Source:** `src/app/page.tsx` lines 46–52
**Apply to:** `src/app/api/user/data-export/route.ts`
```typescript
const [userData, vocabMastery, ...] = await Promise.all([
  db.query.users.findFirst(...),
  db.query.userVocabMastery.findMany(...),
]);
```

### Email send with dry-run guard
**Source:** `src/lib/emails/send.ts` lines 34–73
**Apply to:** `src/app/api/cron/birthday-transitions/route.ts` (birthday transition email)
```typescript
const isDryRun = !process.env.RESEND_API_KEY;
// ... build email payload ...
const result = await sendEmail({ to, subject, html, text, kind, userId });
if (result.sent || result.dry_run) { /* log */ }
```

---

## No Analog Found

All files have close analogs. No entries in this section.

---

## Metadata

**Analog search scope:** `src/app/actions/`, `src/app/api/`, `src/app/components/`, `src/components/ui/`, `src/stores/`, `src/lib/`, `drizzle/`, `tests/integration/`
**Files scanned:** 22 analog files read
**Pattern extraction date:** 2026-05-08
