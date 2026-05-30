# Resume Context

## Current Task
X (Twitter) daily posting automation — fully wired and live.

## Key Decisions
- Pre-generated queue (scripts/generate-social-queue.ts → src/data/social-queue.json) — zero Anthropic API cost at runtime
- Quiz posts restructured as 4-tweet thread: Q1 → A1+Q2 → A2+Q3 → A3+CTA; hook: "Common Japanese vocab from anime / Can you get all 3? 🧵"
- X credentials regenerated and added to .env.local + Vercel production; $5 credits added to X developer account

## Next Steps
- Monitor first automatic cron post tomorrow at 09:00 UTC
- Add remaining missing tokens: RESEND_API_KEY, NEXT_PUBLIC_POSTHOG_TOKEN/HOST, UPSTASH_REDIS_REST_URL/TOKEN, THREADS_ACCESS_TOKEN + THREADS_USER_ID
- Regenerate queue around Nov 2026 when current 184-post queue runs out: `npx tsx --tsconfig tsconfig.scripts.json scripts/generate-social-queue.ts`

## Key Artifacts
- `scripts/social/generate-social-queue.ts` — offline queue generator (run locally)
- `src/data/social-queue.json` — 184 pre-generated posts (2026-05-26 → 2026-11-25)
- `src/app/api/cron/social-post/route.ts` — Vercel cron, fires daily at 09:00 UTC
- `scripts/social/post-now.ts` — manual post trigger: `npx tsx --tsconfig tsconfig.scripts.json scripts/social/post-now.ts <date>`
