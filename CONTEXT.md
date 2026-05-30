# Resume Context

## Current Task
X social post quality improvement loop — 6 rounds complete. Relevance target met (>6). Quality plateau at ~6/10.

## Key Decisions
- Pre-generated queue (scripts/social/generate-social-queue.ts → src/data/social-queue.json) — zero Anthropic API cost at runtime
- Quality ceiling ~6-7/10 with pure algorithmic generation; article posts score 8-10, vocab/quiz ~6
- To reach quality >9: add LLM-powered linguistic insights at generation time (~$5-10 one-time) or hand-curate hooks

## Improvements Made This Session
- Quiz format: withheld-answer arc (Q in T1, lore hints in T2-3, all reveals in T4)
- Hook/CTA rotation cursors — prevents word-for-word repeats across posts
- Proper noun filter fixed (checks primary meaning before slash separator)
- Katakana-only words blocked from vocab threads
- N5 words excluded from N3+ vocab sets when enough higher-level words available
- Article posts prioritize paragraphs with Japanese characters (better learning signal)
- Lore hint length 60 → 120 chars with overflow guard

## Next Steps
- Monitor daily cron posts (09:00 UTC) — first post was 2026-05-26
- Regenerate queue around Nov 2026 when 184-post queue runs out
- For Nov regeneration: consider adding LLM linguistic insights at generation time for vocab/quiz hooks

## Key Artifacts
- `scripts/social/generate-social-queue.ts` — offline queue generator (run locally)
- `src/data/social-queue.json` — 184 pre-generated posts (2026-05-26 → 2026-11-25)
- `src/app/api/cron/social-post/route.ts` — Vercel cron, fires daily at 09:00 UTC
- `scripts/social/post-now.ts` — manual post trigger: `npx tsx --tsconfig tsconfig.scripts.json scripts/social/post-now.ts <date>`
