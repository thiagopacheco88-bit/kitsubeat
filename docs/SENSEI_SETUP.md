# Sensei Setup — Admin Lyrics Editor

> The KitsuBeat admin lyrics editor (`/admin/lyrics`) and timing editor (`/admin/timing`)
> are **localhost-only**. The public catalog at https://kitsubeat.com is unaffected by these
> instructions — only run them on a dev machine where you'll be editing.

## One-time setup

### 1. Install Node.js 18+
Download from https://nodejs.org/. Verify with `node --version` (must print v18.x or higher).

### 2. Clone the repo
```bash
git clone https://github.com/<owner>/kitsubeat.git
cd kitsubeat
npm install
```

### 3. Create `.env.local` (copy from .env.example)
```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:
- `DATABASE_URL` — paste the Neon Postgres connection string Thiago shares with you
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — from https://dashboard.clerk.com → API keys
- `CLERK_SECRET_KEY` — from the same Clerk dashboard
- `CLERK_ADMIN_EMAILS` — must include YOUR email address (comma-separated). Thiago will
  add your address to the shared `.env.local` template before he sends it; if it's missing,
  ask him to add it. Example:
  ```
  CLERK_ADMIN_EMAILS=thiagopacheco88@gmail.com,sensei@example.com
  ```

### 4. Start the dev server
```bash
npm run dev
```

Open http://localhost:7000 in your browser. The public catalog should load. Click
"Sign in" (top right) and use your allowlisted email to sign in via Clerk.

### 5. Visit the editor
Navigate to http://localhost:7000/admin/lyrics. You should see the song search.

If you see the public catalog instead (redirected to `/`), it means your email is NOT
on the allowlist — re-check `CLERK_ADMIN_EMAILS` in `.env.local`.

## Per-session

Just run `npm run dev` and visit http://localhost:7000/admin/lyrics.

## Troubleshooting

- **"claude: command not found" on AI fill** — install Claude CLI separately (Thiago
  will document the path on his machine; AI fill features won't work without it).
- **Build fails on Vercel after a code change** — `src/middleware.ts` is matched ONLY
  to `/admin/:path*` so it won't run on public routes; if Vercel complains about Clerk
  env vars, set them as empty strings in the Vercel dashboard.
- **"sign in" loop** — clear browser cookies for `localhost:7000` and retry.

## What's NOT for sensei (Thiago-only ops)

- YouTube video swap (full pipeline rerun) — multi-minute heavy operation
- Regenerate Lessons (multiple AI fill calls in sequence) — same
- Pipeline retry-from-failed-step
