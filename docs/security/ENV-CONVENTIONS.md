# Environment Variable Conventions — KitsuBeat

Last updated: 2026-05-09 (Phase 16 Security Review)

## Rule 1: Never `NEXT_PUBLIC_` on Secrets

Variables with the `NEXT_PUBLIC_` prefix are embedded in the JavaScript bundle at build time and shipped to every browser. Never add `NEXT_PUBLIC_` to any secret.

**Safe to prefix `NEXT_PUBLIC_` (public by design):**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk's public key; safe for browser
- `NEXT_PUBLIC_POSTHOG_TOKEN` — PostHog project token; safe for browser
- `NEXT_PUBLIC_POSTHOG_HOST` — PostHog host URL; safe
- `NEXT_PUBLIC_SENTRY_DSN` — Sentry DSN for client-side error capture; safe

**NEVER prefix `NEXT_PUBLIC_` — these are server secrets:**
- `CLERK_SECRET_KEY` — can impersonate any user
- `DATABASE_URL` — full database access
- `SENTRY_AUTH_TOKEN` — build-time only; source maps + release creation
- `CRON_SECRET` — bypass cron auth
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — rate limit bypass
- `RESEND_API_KEY` — send arbitrary emails

## Rule 2: Build-time vs Runtime Variables

Vercel treats environment variables differently depending on where they are configured:

| Scope | When Evaluated | Where to Add in Vercel |
|-------|---------------|----------------------|
| Build Environment | During `next build` | Vercel → Project → Settings → Environment Variables → check "Build" only |
| Runtime Environment | During request handling | Vercel → Project → Settings → Environment Variables → check "Production" |
| Both | Both | Check both boxes |

**Build-time ONLY (do not add to Runtime):**
- `SENTRY_AUTH_TOKEN` — needed for source map upload during build; not needed at runtime

**Runtime ONLY:**
- `DATABASE_URL`, `CLERK_SECRET_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `RESEND_API_KEY`, `CRON_SECRET`

## Rule 3: .env Files Hierarchy

```
.env.example               — checked into git; documents ALL required vars (no real values)
.env.local                 — gitignored; your local real values (never commit)
.env.sentry-build-plugin   — gitignored; auto-created by Sentry wizard (contains SENTRY_AUTH_TOKEN)
```

Never commit `.env.local` or `.env.sentry-build-plugin` (or `.env.sentry-build-plugin.txt`).

## Complete Secrets Inventory

| Variable | Environment | Server-Only | Risk if Leaked |
|----------|-------------|-------------|----------------|
| `DATABASE_URL` | Runtime | Yes | Critical — full DB read/write |
| `CLERK_SECRET_KEY` | Runtime | Yes | Critical — impersonate any user |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Build + Runtime | No (public) | Low |
| `SENTRY_AUTH_TOKEN` | Build only | Yes | High — Sentry project access |
| `SENTRY_DSN` | Runtime | Yes | Low (no user impact) |
| `NEXT_PUBLIC_SENTRY_DSN` | Build + Runtime | No (public) | Low |
| `SENTRY_ORG` | Build only | Yes | Low |
| `SENTRY_PROJECT` | Build only | Yes | Low |
| `NEXT_PUBLIC_POSTHOG_TOKEN` | Build + Runtime | No (public) | Low |
| `NEXT_PUBLIC_POSTHOG_HOST` | Build + Runtime | No (public) | Low |
| `CRON_SECRET` | Runtime | Yes | Medium — bypass cron auth |
| `UPSTASH_REDIS_REST_URL` | Runtime | Yes | Medium — rate limit bypass |
| `UPSTASH_REDIS_REST_TOKEN` | Runtime | Yes | Medium — rate limit bypass |
| `UNSPLASH_ACCESS_KEY` | Scripts only | Yes | Low |
| `KB_E2E_AUTH_BYPASS` | Test/CI only | Yes | Critical in prod — bypass all auth |
| `RESEND_API_KEY` | Runtime | Yes | Medium — send arbitrary emails |

## Rule 4: Post-Build Verification

After every `npm run build`, run this sanity check to verify no secrets leaked into the bundle:

```bash
grep -r "CLERK_SECRET_KEY\|DATABASE_URL\|SENTRY_AUTH_TOKEN\|UPSTASH_REDIS_REST" .next/static/ 2>/dev/null
```

Should return NO output. If any matches appear, a variable has been accidentally prefixed `NEXT_PUBLIC_` or referenced in client code.

## Rule 5: Rotation Checklist

If a secret is compromised (or suspected):
1. Rotate immediately in the service dashboard (Neon, Clerk, Upstash, Resend, Sentry)
2. Update the secret in Vercel → Settings → Environment Variables
3. Trigger a new Vercel deployment (the old running instances may still have the old value until re-deploy)
4. Follow the IR Runbook at docs/security/IR-RUNBOOK.md for P1/P2 incidents
