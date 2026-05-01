# Phase 14: UX Polish — Pattern Map

**Mapped:** 2026-05-01
**Files analyzed:** ~38 new + ~50 modified (50 grouped as surface migrations)
**Analogs found:** 26 / 38 single-file new artefacts have a strong codebase analog; 4 are greenfield (custom ESLint plugin shape, `cookies()` from `next/headers`, `__dev/` route, motion catalog markdown); 8 have a partial analog only.

---

## Migration-number correction (must read before planning)

CONTEXT D-11 / D-26 / `<canonical_refs>` cite `drizzle/0015_user_theme_preference.sql`. **That filename is taken** — `drizzle/0015_admin_lyrics_editor.sql` was committed in Phase 11.5 (verified: `Glob drizzle/*.sql` returns through `0015_admin_lyrics_editor.sql`). Phase 14's migration must be **`drizzle/0016_user_theme_preference.sql`**. Planner should call this out in the wave-0 plan and update the file list everywhere it appears.

---

## File Classification

### Wave 0 — test infra + tooling scaffolding

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `eslint.config.mjs` | config | build-time | (none — flat-config Next 15 idiom; greenfield) | no analog — use RESEARCH §1 skeleton |
| `eslint-plugins/kitsubeat-tokens/index.js` | utility (lint plugin) | AST visit | (none in repo — first ESLint plugin) | no analog — use RESEARCH §1 skeleton |
| `eslint-plugins/kitsubeat-tokens/__tests__/no-raw-tokens.test.js` | test (lint rule) | RuleTester fixtures | (none — first lint test) | no analog — use ESLint 9 RuleTester docs (Pitfall 1) |
| `scripts/audit/token-compliance.ts` | utility (audit script) | file-scan + report | `scripts/audit/verse-token-distribution.ts` | role-match (different data source: file walk vs SQL) |
| `scripts/audit/motion-catalog-completeness.ts` | utility (audit script) | file-scan | `scripts/audit/verse-token-distribution.ts` | role-match |
| `tests/e2e/mobile-parity.spec.ts` | test (E2E) | request-response | `tests/e2e/iframe-defer.spec.ts` | exact (Playwright + `tests/support/fixtures` shape) |
| `tests/e2e/a11y.spec.ts` | test (E2E) | request-response | `tests/e2e/iframe-defer.spec.ts` | exact (same shape; `@axe-core/playwright` is the new lib) |
| `tests/e2e/theme-toggle.spec.ts` | test (E2E) | request-response | `tests/e2e/iframe-defer.spec.ts` | exact |
| `tests/e2e/reduced-motion.spec.ts` | test (E2E) | request-response | `tests/e2e/iframe-defer.spec.ts` | exact |
| `tests/e2e/dev-states.spec.ts` | test (E2E) | request-response | `tests/e2e/iframe-defer.spec.ts` | exact |
| `tests/integration/theme-persistence.test.ts` | test (integration) | CRUD | `tests/integration/gamification.test.ts` | exact (same `describeIfTestDb` + raw-SQL helper shape) |
| `drizzle/0016_user_theme_preference.sql` | migration | DDL | `drizzle/0014_vocab_image_url.sql` (single-column ADD COLUMN) + `drizzle/0015_admin_lyrics_editor.sql` (idempotent guards + DO $$ BEGIN ... EXCEPTION pattern) | exact |

### Wave 1 — primitives + tokens + theme + motion catalog

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/ui/Button.tsx` | component (primitive) | presentational | (no `components/ui/` directory exists; `src/app/components/LevelUpTakeover.tsx:96-103` button shape; CVA pattern is greenfield) | partial — use CVA skeleton from RESEARCH "Code Examples / CVA Button primitive" |
| `src/components/ui/Card.tsx` | component (primitive) | presentational | `src/app/songs/components/SongCard.tsx` (the `Link` wrapper card-shape pattern) | partial — extract shape, drop palette utilities |
| `src/components/ui/Badge.tsx` | component (primitive) | presentational | `src/app/songs/components/SongCard.tsx:148-159` JLPT/difficulty badge inline — and `src/lib/types/lesson.ts::JLPT_COLOR_CLASS` for the level→token map | exact (level map already centralized — primitive just consumes it) |
| `src/components/ui/Modal.tsx` | component (primitive) | event-driven (open/close + ESC + portal) | `src/app/review/UpsellModal.tsx` (closest layout/shape); `src/app/songs/[slug]/components/AdvancedDrillsUpsellModal.tsx` (same shape with `aria-labelledby`); `src/app/components/LevelUpTakeover.tsx:71-77` (a11y attrs) — Radix wrapping is greenfield | partial — combine inline-modal shape with Radix Dialog wrap from RESEARCH "Code Examples / Modal primitive" |
| `src/components/ui/EmptyState.tsx` | component (primitive) | presentational | (no canonical empty-state component exists; `src/app/components/GlobalLearnedCounter.tsx` is the closest "compact info card" pattern) | no strong analog — design from SPEC §A primitives |
| `src/components/ui/Skeleton.tsx` | component (primitive) | presentational | (none — existing `KnownWordCount` skeleton is one-off inline) | no strong analog — design fresh |
| `src/components/ui/__tests__/Button.test.tsx` | test (unit) | render-assert | `src/app/songs/[slug]/components/__tests__/SentenceOrderCard.test.tsx` (header + setup) | exact (jsdom directive + Testing Library shape) |
| `src/components/ui/__tests__/Card.test.tsx` | test (unit) | render-assert | same | exact |
| `src/components/ui/__tests__/Badge.test.tsx` | test (unit) | render-assert | same | exact |
| `src/components/ui/__tests__/Modal.test.tsx` | test (unit) | render-assert + interaction | same | exact |
| `src/components/ui/__tests__/EmptyState.test.tsx` | test (unit) | render-assert | same | exact |
| `src/lib/actions/setThemePreference.ts` | service (server action) | CRUD (validate → upsert) | `src/app/actions/userPrefs.ts::updateUserPrefs` (Phase 12 pref-write shape); also see `getUserPrefs` for read shape | exact — copy `"use server"` + per-key validation + `onConflictDoUpdate` upsert |
| `src/app/__dev/states/page.tsx` | route (RSC) | request-response | (no `__dev/` route exists today; closest is `src/app/songs/components/SongCard.tsx` for read-only RSC shape) | no analog — use RESEARCH §7 skeleton + `notFound()` gate |
| `src/app/__dev/states/__tests__/gate.test.ts` | test (unit/integration) | env gating | (no analog — first env-gated route test) | no analog — assert `notFound()` raises when `NEXT_PUBLIC_APP_ENV === 'production'` |
| `docs/motion-catalog.md` | doc | content | (none — first authoritative motion doc) | no analog — content per SPEC AC #11 (12 entries × 5 fields) |
| `src/app/globals.css` (MOD) | config (stylesheet) | build-time | self (lines 1-60) — extend the existing `@theme` block | exact |
| `src/app/layout.tsx` (MOD) | route (root layout) | request-response | self (lines 25-94) — replace hard-coded `bg-gray-950` body className; add `cookies()` read; add inline script | partial — `cookies()` from `next/headers` is GREENFIELD (RESEARCH Executive Summary #5: zero existing usages) |
| `src/lib/db/schema.ts` (MOD) | model (Drizzle table) | DDL | self (lines 389-417) — append `themePreference: text("theme_preference").notNull().default("system")` after line 414 | exact (matches `soundEnabled` / `hapticsEnabled` Phase 12 convention) |
| `.github/workflows/qa-suite.yml` (MOD) | config (CI) | build-time | self (lines 41-83) — insert `npm run lint` and `npx tsx scripts/audit/token-compliance.ts` steps before `Build (Phase 13)` | exact |
| `package.json` (MOD) | config (deps) | build-time | self | exact |
| `playwright.config.ts` (MOD-optional) | config | build-time | self (line 79) | exact — D-discretion: per-spec `test.use({ viewport })` is simpler (RESEARCH §4 Option B); only modify if a separate `mobile` project is needed |

### Wave 2+ — per-surface migrations (50 files, grouped)

| Surface (route) | Files affected (representative) | Role | Migration analog (within-codebase) |
|-----------------|---------------------------------|------|-----------------------------------|
| `/songs/[slug]` (densest) | `ExerciseTab.tsx` (9 button-shape sites), `SentenceOrderCard.tsx` (9), `GrammarMcqCard.tsx` (4), `SessionSummary.tsx` (4), `ListeningDrillCard.tsx` (4), `AdvancedDrillsUpsellModal.tsx`, `SongLayout.tsx` (`bg-gray-950`) | components | use `Button`/`Card`/`Modal`/`Badge` primitives; replace palette utils with `bg-[var(--color-card)]` etc. |
| `/` | (home composition components) | components | same |
| `/songs` | `src/app/songs/components/SongCard.tsx` (lines 100-167 — full migration target — see "Surface Migration Pattern" below) | component (card) | `Card` primitive + `Badge` primitive consume `JLPT_COLOR_CLASS` |
| `/review` | `src/app/review/UpsellModal.tsx` → `<Modal>` primitive; `ReviewLanding.tsx` (2 sites); FeedbackPanel | components | Modal swap + token migration |
| `/vocabulary` | `vocabulary/FilterControls.tsx` (3 sites); `JlptGapSummary.tsx` (10 sites) | components | token migration |
| `/profile` | profile page sections; HUD; theme toggle component (NEW — Wave 1) | route + components | token migration + integrate `ThemeToggle` |
| `/kana` ×3 | `KanaTile.tsx`, `KanaSession.tsx`, `KanaSessionSummary.tsx` (4 sites), `RowUnlockModal.tsx` (the only `dark:bg-zinc-900` user — Pitfall 7) | components | token migration; rewrite `dark:` variant to direct tokens |
| `/path` | path components | components | token migration |
| `/anime-list` | anime-list components | components | token migration |
| Cross-cutting modals | `AdvancedDrillsUpsellModal.tsx`, `UpsellModal.tsx`, `LevelUpTakeover.tsx`, `RowUnlockModal.tsx` | components | swap inline `<div className="fixed inset-0 ..."> ` shell to `<Modal>` primitive |

**Migration count:** ~50 component files (per RESEARCH §2). Per D-21 sequencing recommendation. Planner: D-22 allows token-only swap when Claude Design output for the surface is missing; phase merge gates on token coverage, not design coverage.

---

## Pattern Assignments

### `drizzle/0016_user_theme_preference.sql` (NEW migration, hand-written per D-26)

**Analog:** `drizzle/0014_vocab_image_url.sql` (simple single-column ADD COLUMN) + `drizzle/0015_admin_lyrics_editor.sql` (idempotent guards / DO $$ BEGIN ... EXCEPTION pattern, comment header style).

**File-header convention** (`drizzle/0014_vocab_image_url.sql:1-2`, `drizzle/0015_admin_lyrics_editor.sql:1-7`):
```sql
-- drizzle/0016_user_theme_preference.sql
-- Phase 14: theme preference column on users (light | dark | system).
--
-- Idempotent: safe to re-apply. ALTER uses ADD COLUMN IF NOT EXISTS guard.
-- Applied manually via: tsx scripts/apply-migrations.ts (NOT drizzle-kit migrate per project convention).
```

**ADD COLUMN pattern** (verbatim from `drizzle/0014_vocab_image_url.sql:4-5`):
```sql
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "theme_preference" text NOT NULL DEFAULT 'system';
```

**CHECK constraint** (per CONTEXT D-11 — locks the enum). Pattern: see `drizzle/0015_admin_lyrics_editor.sql:13-15` for the `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$` idempotent-DDL idiom; for a CHECK constraint use the same shape:
```sql
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_theme_preference_check"
    CHECK ("theme_preference" IN ('system','light','dark'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

**Apply**: `npx tsx scripts/apply-migrations.ts` — runner is `scripts/apply-migrations.ts:66-92` (tracks via `schema_migrations` table; stops on first error; re-runs are no-ops).

---

### `src/lib/db/schema.ts` (MODIFIED — append column to `users`)

**Analog:** self, lines 412-414 (Phase 12 `soundEnabled` / `hapticsEnabled`).

**Insertion site** (after line 414, before `created_at`):
```typescript
  // Phase 12: Audio + haptics preferences (default ON per CONTEXT)
  soundEnabled: boolean("sound_enabled").notNull().default(true),
  hapticsEnabled: boolean("haptics_enabled").notNull().default(true),
  // Phase 14: theme preference — 'system' | 'light' | 'dark' (DB CHECK enforces enum)
  themePreference: text("theme_preference").notNull().default("system"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
```

**Convention** — camelCase TS prop / snake_case DB column matches Phase 12 (D-11 / Code Insights "Phase 12 user-prefs convention").

---

### `src/lib/actions/setThemePreference.ts` (NEW server action)

**Analog:** `src/app/actions/userPrefs.ts` (Phase 12). Imports, validation shape, upsert idiom, and error-throw style all copy from `updateUserPrefs` (lines 60-113).

**CONTEXT-noted location:** the spec calls this `src/lib/actions/setThemePreference.ts` but the existing convention puts user-pref actions at `src/app/actions/userPrefs.ts`. Planner should decide between (a) extending `src/app/actions/userPrefs.ts` (lower deviation, shared file) or (b) new `src/app/actions/themePreference.ts` (CONTEXT shape). Either way, do NOT create a sibling at `src/lib/actions/` — actions live under `src/app/actions/` per existing convention.

**Imports pattern** (verbatim from `src/app/actions/userPrefs.ts:1-10`):
```typescript
"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
```

**Validation + upsert pattern** (model on `src/app/actions/userPrefs.ts:60-113`):
```typescript
const VALID_THEMES = ["system", "light", "dark"] as const;
type ThemePreference = (typeof VALID_THEMES)[number];

export async function setThemePreference(
  userId: string,
  value: ThemePreference
): Promise<void> {
  if (!userId) throw new Error("userId is required");
  if (!VALID_THEMES.includes(value)) {
    throw new Error(`themePreference must be one of: ${VALID_THEMES.join(", ")}`);
  }

  // Upsert: seed defaults if row doesn't exist, otherwise merge patch.
  await db
    .insert(users)
    .values({ id: userId, themePreference: value })
    .onConflictDoUpdate({
      target: users.id,
      set: { themePreference: value, updated_at: new Date() },
    });

  // Cookie write — see Pitfall 10 in RESEARCH (RSC re-render side-effect).
  // Per D-09 the cookie is the SSR source of truth for next request.
  const { cookies } = await import("next/headers");
  const c = await cookies();
  c.set("kb_theme", value, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
    httpOnly: false, // D-08 — client must read for instant toggle
    path: "/",
  });
}
```

**Companion read function** (model on `getUserPrefs` at `src/app/actions/userPrefs.ts:19-50`):
```typescript
export async function getThemePreference(userId: string): Promise<ThemePreference> {
  if (!userId) return "system";
  const rows = await db
    .select({ themePreference: users.themePreference })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return (rows[0]?.themePreference as ThemePreference) ?? "system";
}
```

**Note for planner:** RESEARCH §6 test calls `setThemePreference(TEST_USER_ID, "dark")` and `getThemePreference(TEST_USER_ID)` — these signatures are the contract.

---

### `src/app/layout.tsx` (MODIFIED — `cookies()` SSR read + inline script + remove hard-coded bg)

**Analog (within-file structure):** self, lines 25-94 — keep the `ClerkProvider` + `<html>` + `<head>` + `<body>` skeleton.

**`cookies()` from `next/headers` — GREENFIELD pattern.** RESEARCH Executive Summary #5 confirms zero existing usages. Pitfall 2: `cookies()` is async in Next 15. The `RootLayout` is already `async` (current `layout.tsx:25`).

**Concrete replacement for `layout.tsx:25-32`** (current head section), apply at top of `RootLayout`:
```typescript
import { cookies } from "next/headers";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const stored = cookieStore.get("kb_theme")?.value;
  const initialTheme = stored === "light" || stored === "dark" ? stored : "dark";
  // 'dark' is SSR fallback; inline script below resolves to actual prefs-color-scheme
  // when the stored cookie is 'system' or absent.
```

**Inline no-flash script** (D-09 — verbatim from CONTEXT `<specifics>`; insert as the FIRST child of `<head>` per Pitfall 3):
```tsx
<head>
  <script
    dangerouslySetInnerHTML={{
      __html: `(function(){try{var p=document.cookie.match(/kb_theme=(system|light|dark)/);var v=p?p[1]:'system';if(v==='system')v=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',v);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`,
    }}
  />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  {/* ... existing font links ... */}
</head>
```

**`<html>` attribute** — replace line 32 (`<html lang="en" className={inter.variable}>`) with:
```tsx
<html lang="en" className={inter.variable} data-theme={initialTheme}>
```

**`<body>` className** — replace line 41:
```tsx
// BEFORE
<body className="min-h-screen bg-gray-950 text-gray-100 font-[family-name:var(--font-inter)] antialiased">
// AFTER (token-only)
<body className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-[family-name:var(--font-inter)] antialiased">
```

**Header migration** (lines 42-88): same pattern — replace every `bg-gray-950/80`, `border-gray-800`, `text-gray-400`, `text-red-500` with token vars.

**`<ThemeToggle />` insertion** (D-10): add a new `src/components/ui/ThemeToggle.tsx` and place inside `<div className="flex items-center gap-4 sm:gap-6">` at line 60.

---

### `src/app/globals.css` (MODIFIED — expand `@theme` + add `[data-theme="light"]` + reduced-motion override)

**Analog:** self, lines 1-60. Keep existing JLPT/grammar tokens (lines 7-21) and `star-shine`/`level-pop` keyframes (lines 43-60) verbatim per D-27.

**Three additive blocks** (concrete shape from RESEARCH "Code Examples / Tailwind v4 `@theme` extension"):

1. Extend `@theme {}` block (around line 7-21) with surface/text/border/spacing/radii/shadow/motion tokens — see RESEARCH lines 357-407 for the full block.
2. Add `:root[data-theme="light"]` override block AFTER the `@theme` block (NOT inside — Pitfall 4) — see RESEARCH lines 410-426.
3. Add `@media (prefers-reduced-motion: reduce)` block as the LAST item in the file (D-13) — see RESEARCH lines 433-440.

**Pitfall 4 note:** The light-theme block uses `:root[data-theme="light"]`, NOT a second `@theme {}` block. Tailwind v4 treats `@theme` as additive token *definition* — re-declaring the same variable in a second `@theme` does not override.

**Pitfall 7 note:** `RowUnlockModal.tsx:36` uses `dark:bg-zinc-900` — the only `dark:` variant in the codebase. Easiest fix is rewriting that file to direct tokens (Wave 2). If keeping `dark:`, add `@variant dark (&:where([data-theme=dark], [data-theme=dark] *))` in `globals.css`.

---

### `tests/integration/theme-persistence.test.ts` (NEW integration test)

**Analog:** `tests/integration/gamification.test.ts` (Phase 12 — exact pattern match).

**Header pattern** (verbatim from `tests/integration/gamification.test.ts:1-25`):
```typescript
/**
 * tests/integration/theme-persistence.test.ts
 *
 * Phase 14 req 9 — theme preference DB write + read round-trip.
 *
 * Requires: TEST_DATABASE_URL set + test DB seeded + migration 0016 applied.
 * Skip guard: describe.skip when TEST_DATABASE_URL is absent.
 *
 * Run: TEST_DATABASE_URL=... npm run test:integration -- tests/integration/theme-persistence.test.ts
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { setThemePreference, getThemePreference } from "@/app/actions/userPrefs";
import { getTestDb, resetTestProgress, TEST_USER_ID } from "../support/test-db";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;
```

**Test body shape** — copy structure from RESEARCH §6 (lines 882-932). The `describeIfTestDb` + `beforeEach` reset + raw-SQL assertion idiom is verbatim from `gamification.test.ts:24-25` and `gamification.test.ts:67-114` (the `seedUserGamification` shows the `db.execute(sql\`...\`)` pattern).

**Pitfall:** `db.execute()` returns either `Array<Row>` OR `{ rows: Array<Row> }` depending on the driver — `gamification.test.ts:60-63` shows the canonical normalization:
```typescript
const raw = (await db.execute(sql`SELECT theme_preference FROM users WHERE id = ${TEST_USER_ID}`))
  as unknown as Array<{ theme_preference: string }> | { rows: Array<{ theme_preference: string }> };
const rows = Array.isArray(raw) ? raw : (raw.rows ?? []);
```

---

### `tests/e2e/mobile-parity.spec.ts` / `a11y.spec.ts` / `theme-toggle.spec.ts` / `reduced-motion.spec.ts` / `dev-states.spec.ts` (NEW Playwright specs)

**Analog:** `tests/e2e/iframe-defer.spec.ts` (exact match — recent, single-purpose, named `describe` block, uses fixtures).

**Header pattern** (verbatim from `tests/e2e/iframe-defer.spec.ts:1-15`):
```typescript
/**
 * Phase 14 / SPEC AC #11 — mobile parity at 390×844 viewport.
 *
 * Asserts: no horizontal scroll on every in-scope route; tap targets ≥44×44px.
 */
import { test, expect } from "../support/fixtures";
```

**Per-spec viewport pattern** (RESEARCH §4 Option B — preferred over modifying `playwright.config.ts:79`):
```typescript
test.use({ viewport: { width: 390, height: 844 } });
```

**Cookie-set + navigate pattern** (for `theme-toggle.spec.ts` and `a11y.spec.ts` — model on `tests/e2e/iframe-defer.spec.ts:23-32`, swapping `disableTestForceMount=1` for cookie set):
```typescript
test("dark cookie → html[data-theme=dark]", async ({ page, context }) => {
  await context.addCookies([
    { name: "kb_theme", value: "dark", url: "http://localhost:7000", sameSite: "Lax" },
  ]);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
```

**a11y axe-core pattern** — see RESEARCH §5 (lines 808-862). Key reminder (Pitfall 8): `await page.waitForLoadState("networkidle")` BEFORE running axe — otherwise lazy content (Exercise Tab) is not in the DOM.

**Existing seeded slug for the Wave 1 song-page route:** use `again-yui` (matches `tests/e2e/iframe-defer.spec.ts:16` `const SLUG = "again-yui"; // SEEDED_SLUGS[0] — matches Phase 08.1 test corpus`).

**Test budget warning:** RESEARCH §5 notes 22 a11y test cases (11 routes × 2 themes) is heavy for the 15-min suite budget. Planner should consider gating `a11y.spec.ts` to nightly via `playwright.config.ts:testIgnore` for default runs + a separate npm script.

---

### `src/components/ui/__tests__/Button.test.tsx` (et al — NEW component unit tests)

**Analog:** `src/app/songs/[slug]/components/__tests__/SentenceOrderCard.test.tsx` (closest existing `.tsx` test in the repo — Phase 10 Plan 05).

**Header / setup** (verbatim from `__tests__/SentenceOrderCard.test.tsx:1-21`):
```typescript
// @vitest-environment jsdom
/**
 * Phase 14 — Button primitive variant rendering tests.
 */

// Silence React 19 act() stderr warnings (see Phase 10-02 for rationale)
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Button } from "../Button";
```

**Critical: `// @vitest-environment jsdom` MUST be the very first line.** Per `vitest.config.ts:23-28`: the default environment is `node` and per-file jsdom is opted in via this directive. Without it, `render()` from Testing Library throws.

**Vitest config note:** `vitest.config.ts:50-52` — `setupFiles: ["./tests/integration/setup.ts"]` runs once per worker. This loads `.env.test` → `.env.local` and is benign for unit tests.

---

### `src/components/ui/Button.tsx` (NEW primitive)

**Analog:** No `src/components/ui/` directory exists yet (greenfield). Closest existing button shape is `src/app/components/LevelUpTakeover.tsx:96-103`:
```typescript
<button
  type="button"
  onClick={onDismiss}
  className="mt-4 rounded-xl bg-orange-600 px-8 py-3 text-base font-semibold text-white hover:bg-orange-700 transition-colors"
  data-testid="level-up-continue"
>
  Continue
</button>
```

This is the *anti-pattern* the primitive replaces. Use the **CVA skeleton** from RESEARCH "Code Examples / CVA Button primitive" (lines 446-481). Variants per D-07: `primary | secondary | ghost` × `sm | md | lg`. Default `primary` × `md`.

**Token consumption rule:** Per D-18 the `src/components/ui/` allowlist permits raw values inside CVA variant maps — but the spirit is "tokens-only." The CVA map should reference CSS vars: `bg-[var(--color-accent)] shadow-[var(--shadow-button-red)]` not `bg-red-500`.

---

### `src/components/ui/Card.tsx` (NEW primitive)

**Analog:** `src/app/songs/components/SongCard.tsx:100-167` — current `Link`-as-card pattern with palette utilities. The migration target.

**Existing card shape to extract** (`SongCard.tsx:101-104`):
```typescript
<Link
  href={`/songs/${song.slug}`}
  className="group block overflow-hidden rounded-lg border border-gray-800 bg-gray-900 transition-colors hover:border-gray-600"
>
```

This becomes (after primitive lands):
```typescript
<Card variant="flat" asLink href={`/songs/${song.slug}`}>
  {/* contents */}
</Card>
```

**Variants per D-07:** `flat | elevated | hero` — hero gets the `--shadow-hero-glow` recipe (SPEC §A.6).

**`asChild` polymorphism note:** D-07 explicitly defers `@radix-ui/react-slot` to Phase 18. For Wave 2 the simplest path is two component faces: `<Card>` (renders `<div>`) and `<CardLink>` (renders `<Link>`). Avoid spinning a custom polymorphic-as prop.

---

### `src/components/ui/Badge.tsx` (NEW primitive)

**Analog:** `src/app/songs/components/SongCard.tsx:148-159` (inline JLPT badge) + `src/lib/types/lesson.ts:186-192` (the canonical JLPT level → token-class map).

**Existing inline pattern** (`SongCard.tsx:148-154`):
```typescript
{song.jlpt_level && (
  <span
    className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${JLPT_COLOR_CLASS[song.jlpt_level] ?? "bg-gray-600"}`}
  >
    {song.jlpt_level}
  </span>
)}
```

**Existing JLPT_COLOR_CLASS map** (`src/lib/types/lesson.ts:186-192`) — already centralized; the primitive consumes it:
```typescript
export const JLPT_COLOR_CLASS: Record<string, string> = {
  N5: "bg-jlpt-n5",
  N4: "bg-jlpt-n4",
  N3: "bg-jlpt-n3",
  N2: "bg-jlpt-n2",
  N1: "bg-jlpt-n1",
};
```

**Primitive variants per D-07:** `jlpt | grammar | mono | accent`. JLPT/grammar variants accept a level/category prop and map to `JLPT_COLOR_CLASS` / a parallel `GRAMMAR_COLOR_CLASS` (which planner should add to `src/lib/types/lesson.ts` alongside JLPT_COLOR_CLASS — same shape).

**SPEC §A.2 note:** JLPT badges use 12% alpha bg, 25% alpha ring. Existing `bg-jlpt-n5` etc. are solid colors — the primitive should switch to `bg-[color-mix(in srgb, var(--color-jlpt-n5) 12%, transparent)]` or define new `--color-jlpt-n5-bg` tokens in `globals.css` (cleaner — recommend the latter).

---

### `src/components/ui/Modal.tsx` (NEW primitive — Radix Dialog wrapper)

**Analog:** Three existing inline modals share the structure to consume the primitive:

1. **`src/app/review/UpsellModal.tsx`** — simplest shape (62 lines). Pattern at lines 31-66:
   - Outer `<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" onClick={onClose}>`
   - Inner `<div className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-900 p-6 text-center" onClick={(e) => e.stopPropagation()}>`
   - ESC handler in `useEffect` (lines 20-27).

2. **`src/app/songs/[slug]/components/AdvancedDrillsUpsellModal.tsx`** — adds `aria-labelledby` (lines 60-69) and is the most a11y-correct of the four. ESC handler at lines 41-47.

3. **`src/app/components/LevelUpTakeover.tsx`:71-77** — adds `aria-label` instead of `aria-labelledby`. Confetti integration at lines 35-46.

4. **`src/app/kana/components/RowUnlockModal.tsx`** — uses `dark:bg-zinc-900` (Pitfall 7); also has the confetti dynamic-import pattern at lines 14-23.

**Wrap shape (Radix Dialog) — GREENFIELD** (`@radix-ui/react-dialog` not yet installed). Use the **Modal primitive skeleton from RESEARCH "Code Examples / Modal primitive (D-06) wrapping Radix Dialog"** (lines 485-533).

**Pitfall 5:** Radix `Dialog.Content` MUST contain `<Dialog.Title>` (or `<VisuallyHidden>` wrapping it) or it warns to console. Modal API should require a `title` prop with an `srOnly?: boolean` escape hatch.

**Migration after primitive lands** (Wave 2 transformation):
```typescript
// BEFORE (UpsellModal.tsx:31-66)
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" onClick={onClose}>
  <div className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-900 p-6" onClick={e => e.stopPropagation()}>
    <h2>...</h2>
    {/* body */}
  </div>
</div>

// AFTER
<Modal open={open} onOpenChange={onClose}>
  <ModalContent className="max-w-sm">
    <ModalTitle>Cross-song review is premium</ModalTitle>
    {/* body */}
  </ModalContent>
</Modal>
```

---

### `scripts/audit/token-compliance.ts` (NEW grep audit)

**Analog:** `scripts/audit/verse-token-distribution.ts` — same role (audit script), different data flow (DB query vs file walk). Use it for the **header convention, env loading, exit-code contract, and CLI flag handling**.

**Header convention** (verbatim from `scripts/audit/verse-token-distribution.ts:1-20`):
```typescript
/**
 * Token compliance audit (Phase 14 D-17).
 *
 * Belt-and-suspenders against the ESLint rule. Catches:
 *   - Hex inside template literals the AST visitor missed
 *   - Hex inside string-concat patterns
 *   - Hex inside non-className props (e.g., style={{ color: '#abc' }})
 *
 * Exit codes:
 *   0 — clean. Used by .github/workflows/qa-suite.yml.
 *   1 — violations found.
 *
 * Usage:
 *   npx tsx scripts/audit/token-compliance.ts
 *   npx tsx scripts/audit/token-compliance.ts --json   # machine-readable
 */
```

**Env-load preamble** (verbatim from `scripts/audit/verse-token-distribution.ts:22-29`) — NOT needed for token-compliance (no DB access), but the `__dirname` shim is the project convention:
```typescript
import { fileURLToPath } from "url";
import { resolve } from "path";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
```

**Body shape — file-walk + per-line regex**: see RESEARCH §9 (lines 1042-1109). Patterns + ALLOWLIST + `walk()` generator + `process.exit(violations.length === 0 ? 0 : 1)`.

**Exit-code contract:** `verse-token-distribution.ts:180-183` shows the `main().catch((err) => { console.error(err); process.exit(1); })` wrap — copy this.

---

### `eslint.config.mjs` + `eslint-plugins/kitsubeat-tokens/index.js` (NEW — flat config + custom plugin)

**Analog:** None in this codebase. RESEARCH Executive Summary #3 confirms no ESLint config exists; `package.json:13` `"lint": "next lint"` runs against bundled defaults.

**Use RESEARCH §1 skeletons verbatim:**
- `eslint.config.mjs` — RESEARCH lines 580-606
- `eslint-plugins/kitsubeat-tokens/index.js` — RESEARCH lines 612-669

**Pitfall 1 reminder:** ESLint 9 rejects bare `rules` blocks referencing `meta`/`create` in `eslint.config.mjs`. The rule must live in a plugin module that exports `{ rules: { 'no-raw-tokens': { meta, create } } }`. The local file `eslint-plugins/kitsubeat-tokens/index.js` is imported and registered as a plugin per RESEARCH §1.

**Lint-rule unit test pattern** — use ESLint 9 `RuleTester` (no codebase analog). Test fixtures should cover: `JSXAttribute` literal, `JSXExpressionContainer` template literal, `clsx()` call, `cva()` call. RESEARCH does not skeleton this — planner adds based on the `rule.meta` shape in `eslint-plugins/kitsubeat-tokens/index.js`.

**`package.json` script change** (RESEARCH §1 line 575):
```json
// BEFORE
"lint": "next lint",
// AFTER
"lint": "eslint ."
```

---

### `.github/workflows/qa-suite.yml` (MODIFIED — add lint + audit steps)

**Analog:** self, lines 41-83 (the `pr-checks` job).

**Insertion site:** between line 71 (`Run PR suite`) and line 73 (`Build (Phase 13)`). See RESEARCH §10 lines 1142-1164 for the exact diff.

**Concrete diff** (insert before the `Build (Phase 13 — for bundle measurement)` step at `qa-suite.yml:73`):
```yaml
      - name: Lint (Phase 14 — D-17 token-compliance ESLint rule)
        run: npm run lint

      - name: Token compliance grep audit (Phase 14 — D-17 belt-and-suspenders)
        run: npx tsx scripts/audit/token-compliance.ts
```

**Sequencing rationale (RESEARCH §10):** Lint → audit → build → size-limit. Fast-feedback first; build only if lint passes.

**Time budget:** ~12 seconds added; `pr-checks` currently runs in ~3 min, ceiling is 10 min — adequate.

**Zero-flake policy** (`qa-suite.yml:23-24`): no `continue-on-error: true`. Both new steps must hard-fail.

---

### `src/app/__dev/states/page.tsx` (NEW gated dev route)

**Analog:** None — no `__dev/` route exists today (RESEARCH §7).

**Skeleton from RESEARCH §7** (lines 965-989) is verbatim usable. Key constraint: first line of `export default function` checks `process.env.NEXT_PUBLIC_APP_ENV === "production"` and calls `notFound()`. This integrates with `playwright.config.ts:64` (`NEXT_PUBLIC_APP_ENV: test`) — the route is visible in dev (env undefined) and test (env === 'test'), hidden in production.

**Convention for state-card composition** (D-16): per-surface variants compose `<EmptyState>` and `<Skeleton>` shells. 24 cards total = 7 async surfaces × 3 states + 3 (song page Lesson/Practice/Drills tabs each get their own loading state).

---

### `docs/motion-catalog.md` (NEW — source of truth for 12 entries)

**Analog:** None — first authoritative motion doc.

**Format per D-14 / SPEC AC #11:** 12 entries × 5 fields each (trigger / duration / easing / target / reduced-motion fallback).

**Entries (per RESEARCH summary of SPEC §6):**
1. verse-highlight pulse
2. star-earn shine — *retain existing `star-shine` keyframe at `globals.css:43-50`; document, don't rewrite (D-27)*
3. correct-answer feedback
4. wrong-answer feedback
5. level-up takeover — *retain existing `level-pop` keyframe at `globals.css:53-60`; document, don't rewrite*
6. confetti milestone — uses existing `canvas-confetti` (3 fire sites: `LevelUpTakeover.tsx:39`, `RowUnlockModal.tsx:14`, `StarDisplay.tsx:36`); already passes `disableForReducedMotion: true` per existing pattern (Assumption A6 — verify)
7. page-transition fade
8. hover lift on cards
9. modal enter
10. modal exit
11. toast slide-in
12. skeleton shimmer — D-discretion: planner picks gradient stops

**Catalog reference convention (D-14):** component code comments `/* motion-catalog: hover-lift-card */` so impl → doc link is greppable.

---

## Surface Migration Pattern (Wave 2+)

For per-surface migrations (~50 files per RESEARCH §2), the pattern is **find-and-replace, not rebuild**.

### Representative migration: `src/app/songs/components/SongCard.tsx`

This file demonstrates the full migration shape — applies similarly to all 50 surface files.

**Before** (current `SongCard.tsx:103, 106, 119, 132, 145-146, 156`):
```typescript
className="group block overflow-hidden rounded-lg border border-gray-800 bg-gray-900 transition-colors hover:border-gray-600"
className="relative aspect-video w-full overflow-hidden bg-gray-800"
className="absolute top-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm"
className="truncate text-sm font-semibold text-white"
className="mt-1 truncate text-xs text-gray-400"
className="mt-0.5 truncate text-xs text-gray-500"
className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400"
```

**After** (token-only):
```typescript
className="group block overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] transition-colors hover:border-[var(--color-border-strong)]"
className="relative aspect-video w-full overflow-hidden bg-[var(--color-bg-2)]"
className="absolute top-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-text)] backdrop-blur-sm"
className="truncate text-sm font-semibold text-[var(--color-text)]"
className="mt-1 truncate text-xs text-[var(--color-text-muted)]"
className="mt-0.5 truncate text-xs text-[var(--color-text-dim)]"
className="rounded bg-[var(--color-card-2)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]"
```

**Mapping table (planner: surface this in plan files for executor):**

| Before (palette / arbitrary) | After (token) | Source |
|------------------------------|---------------|--------|
| `bg-gray-950`, `bg-gray-900` | `bg-[var(--color-card)]` or `bg-[var(--color-bg)]` | SPEC §A.2 |
| `bg-gray-800` | `bg-[var(--color-card-2)]` or `bg-[var(--color-bg-2)]` | SPEC §A.2 |
| `border-gray-800`, `border-gray-700` | `border-[var(--color-border)]` | SPEC §A.2 |
| `border-gray-600` | `border-[var(--color-border-strong)]` | SPEC §A.2 |
| `text-white` | `text-[var(--color-text)]` | SPEC §A.2 |
| `text-gray-300`, `text-gray-400` | `text-[var(--color-text-muted)]` | SPEC §A.2 |
| `text-gray-500` | `text-[var(--color-text-dim)]` | SPEC §A.2 |
| `bg-red-600`, `bg-red-500` (CTA) | `bg-[var(--color-accent)] shadow-[var(--shadow-button-red)]` | SPEC §A.6 |
| `text-red-500` (brand text) | `text-[var(--color-accent)]` | SPEC §A.2 |
| Inline modal `<div className="fixed inset-0 ...">` | `<Modal>` primitive | D-06 |
| Inline JLPT/grammar badge | `<Badge variant="jlpt" level={...}>` | D-07 |
| Inline button | `<Button variant="primary">` | D-07 |
| `dark:bg-zinc-900` (only `RowUnlockModal.tsx:36`) | direct token (no `dark:` variant) | Pitfall 7 |

**Sequencing guard (D-21):** Order is `/songs/[slug]` → `/` → `/songs` → `/review` → `/vocabulary` → `/profile` → `/kana ×3` → `/path` → `/anime-list`. Each surface is its own plan file (`14-NN-PLAN.md`). D-22: token-only swap allowed when Claude Design output for the surface is missing — document affected surfaces in `14-VERIFICATION.md` as "token-migrated, design-pending".

---

## Shared Patterns

### Authentication / authorization
**Source:** `src/app/actions/userPrefs.ts:60-65`
**Apply to:** `setThemePreference` action — first lines validate `userId` and reject empty:
```typescript
if (!userId) throw new Error("userId is required");
```
For unauthenticated visitors, the action is not called — the cookie-only path handles them client-side per D-08.

### Error handling
**Source:** `src/app/actions/userPrefs.ts:78-83` — server-side validation throws `Error` with descriptive message:
```typescript
if (!Number.isInteger(patch.newCardCap) || patch.newCardCap < 1) {
  throw new Error("newCardCap must be a positive integer");
}
```
**Apply to:** `setThemePreference` validates `value` is in `["system","light","dark"]` and throws on miss.

### Test gating
**Source:** `tests/integration/gamification.test.ts:24-25`:
```typescript
const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;
```
**Apply to:** `tests/integration/theme-persistence.test.ts` (and any future Phase 14 integration test).

### Per-test cleanup
**Source:** `tests/support/fixtures.ts:90-94`:
```typescript
testUser: async ({}, use) => {
  await use(TEST_USER_ID);
  await resetTestProgress(TEST_USER_ID); // wipes after test
},
```
**Apply to:** any new E2E spec that mutates the user (theme cookie, theme DB column).

### Reduced-motion guard for canvas-confetti
**Source:** existing pattern at `src/app/components/LevelUpTakeover.tsx:39-46` and `src/app/kana/components/RowUnlockModal.tsx:14-23`:
```typescript
void import("canvas-confetti").then(({ default: confetti }) => {
  confetti({
    particleCount: 200,
    spread: 90,
    origin: { y: 0.6 },
    disableForReducedMotion: true, // ← THE guard
  });
});
```
**Apply to:** D-13 confetti suppression. All 3 fire sites (`LevelUpTakeover.tsx:39`, `RowUnlockModal.tsx:14`, `StarDisplay.tsx:36`) already pass `disableForReducedMotion: true`. **Phase 14 verification, not a code change** — but Pitfall 9 / Assumption A6 says verify reliability across browsers; if any drift, add `if (!matchMedia('(prefers-reduced-motion: reduce)').matches)` outer guard.

### Conventional commits
**Source:** project convention (CONTEXT Code Insights "Established Patterns").
**Apply to:** all Phase 14 commits — `feat(14): …`, `chore(14): …`, `test(14): …`.

### `tests/support/fixtures` re-export
**Source:** `tests/e2e/iframe-defer.spec.ts:14`:
```typescript
import { test, expect } from "../support/fixtures";
```
**Apply to:** all new E2E specs (`mobile-parity`, `a11y`, `theme-toggle`, `reduced-motion`, `dev-states`). NOT `import { test, expect } from "@playwright/test"` — the project wraps it for `testUser` + `seededSong` fixtures.

---

## No Analog Found

Files with no close match in the codebase. Planner attaches RESEARCH.md skeletons or external docs:

| File | Role | Data Flow | Reason | Source for skeleton |
|------|------|-----------|--------|---------------------|
| `eslint.config.mjs` | config | build-time | First ESLint flat config in repo | RESEARCH §1 lines 580-606 |
| `eslint-plugins/kitsubeat-tokens/index.js` | utility | AST visit | First custom ESLint plugin | RESEARCH §1 lines 612-669 |
| `eslint-plugins/kitsubeat-tokens/__tests__/no-raw-tokens.test.js` | test | RuleTester | First lint-rule test | ESLint 9 `RuleTester` docs (linked from Pitfall 1) |
| `src/app/__dev/states/page.tsx` | route | request-response | First `__dev/` route | RESEARCH §7 lines 965-989 |
| `src/app/__dev/states/__tests__/gate.test.ts` | test | env-gating | First env-gated route test | New — assert `notFound()` thrown when env=production |
| `docs/motion-catalog.md` | doc | content | First motion catalog | SPEC AC #11 / D-14 (12 entries × 5 fields) |
| `src/components/ui/EmptyState.tsx` | component | presentational | No empty-state component exists | SPEC §A primitives + D-16 composition |
| `src/components/ui/Skeleton.tsx` | component | presentational | Existing skeletons (e.g., `KnownWordCount`) are inline one-offs | D-discretion: CSS `linear-gradient` + `background-position` keyframe |
| `src/components/ui/ThemeToggle.tsx` (Wave 1, header sun/moon) | component | event-driven | First theme-aware UI element | D-10 + D-discretion: Lucide imports or inline SVG; cycles `system → light → dark` |
| `src/lib/theme/cookie.ts` (RESEARCH-recommended) | utility | I/O | First `next/headers cookies()` usage | Pitfall 2 — `await cookies()`; CONTEXT `<specifics>` no-flash script for client-side write |
| `src/lib/theme/resolve.ts` (RESEARCH-recommended) | utility | logic | First `'system'` resolver | Match `matchMedia('(prefers-color-scheme: dark)').matches` (CONTEXT inline-script logic) |

---

## Landmines (planner attention)

### Migration filename collision
`drizzle/0015_admin_lyrics_editor.sql` already exists (Phase 11.5). CONTEXT D-11 / D-26 / canonical_refs all say `drizzle/0015_user_theme_preference.sql` — that's wrong. Use **`drizzle/0016_user_theme_preference.sql`**. Planner: cross-reference every CONTEXT mention of `0015_user_theme_preference` and renumber.

### `cookies()` from `next/headers` is greenfield
RESEARCH Executive Summary #5 + Pitfall 2: zero existing usages. Phase 14 introduces this pattern from scratch. Lands in **TWO** places: `src/app/layout.tsx` (read-only SSR) and `src/app/actions/userPrefs.ts` extension (read + write inside server action). Always `await cookies()` — Next 15 made it async.

### `RowUnlockModal.tsx:36` `dark:bg-zinc-900` — only `dark:` variant in codebase
The only file using Tailwind's `dark:` variant. With `data-theme` attribute switching (D-02), Tailwind v4's `dark:` works only if `@variant dark (&:where([data-theme=dark], [data-theme=dark] *))` is configured. **Easier path** (recommend): rewrite this file to direct token vars (no `dark:` variant) during Wave 2 `/kana` migration.

### prefers-reduced-motion override interacts with existing keyframes
D-13 `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0ms !important; ... } }` correctly nukes existing `star-shine` (`globals.css:43-50`) and `level-pop` (`globals.css:53-60`) animations — they retain their `0%/100%` end state since `animation-iteration-count: 1` lets one frame play. **Verify** by hand-toggling `prefers-reduced-motion: reduce` in devtools after `globals.css` edit; star-earn becomes instant fill, level-pop becomes instant scale-1.

### RSC re-render after cookie write in server action
Pitfall 10: `cookies().set('kb_theme', value)` inside `setThemePreference` triggers Next's RSC re-render. With the optimistic client-side `data-theme` set in `<ThemeToggle>` (D-10), there should be no flicker — but verify in `tests/e2e/theme-toggle.spec.ts` that the `data-theme` attribute does not flash to a wrong value during the round-trip.

### Hand-written migration NOT `drizzle-kit generate`
Per Phase 11.4 D-01 (locked here as D-26). The new `themePreference` column is added to `src/lib/db/schema.ts` — but you do NOT run `npm run db:generate`. Hand-write the SQL in `drizzle/0016_user_theme_preference.sql` (analogous to `drizzle/0014_vocab_image_url.sql`). Apply via `npx tsx scripts/apply-migrations.ts` (`scripts/apply-migrations.ts:66-92`).

### `drizzle-kit` will detect schema drift
After `themePreference` is added to `src/lib/db/schema.ts`, future runs of `npm run db:generate` (which is blocked anyway per D-26) would detect this column. The `schema_migrations` tracker (`scripts/apply-migrations.ts:21-26`) records `0016_user_theme_preference.sql` as applied; future migrations skip it. No drizzle-kit-side action required.

---

## Metadata

**Analog search scope:**
- `src/components/` (does not exist), `src/app/components/` (3 files)
- `src/app/actions/*.ts` (8 files)
- `src/app/kana/components/`, `src/app/songs/`, `src/app/review/`
- `scripts/audit/*.ts` (7 files)
- `scripts/apply-migrations.ts`
- `tests/e2e/*.spec.ts` (16 files)
- `tests/integration/*.test.ts` (10 files)
- `tests/support/fixtures.ts`, `tests/integration/setup.ts`
- `drizzle/*.sql` (16 files)
- `src/lib/db/schema.ts`, `src/lib/types/lesson.ts`
- `src/app/layout.tsx`, `src/app/globals.css`
- `playwright.config.ts`, `vitest.config.ts`, `package.json`
- `.github/workflows/qa-suite.yml`

**Pattern extraction date:** 2026-05-01

**Conformance:**
- All extracted excerpts cite file paths + line numbers.
- All "no analog" cases reference RESEARCH §N skeletons or external docs.
- Migration filename collision (CONTEXT 0015 → actual 0016) flagged at top.
- Per-surface migration pattern documented for `SongCard.tsx` as representative; mapping table generalizes to all ~50 surface files.

*Phase: 14-ux-polish*
*Pattern map written: 2026-05-01*
*Next step: planner consumes this as input for `14-NN-PLAN.md` files.*
