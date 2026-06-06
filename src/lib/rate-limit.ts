/**
 * Rate limiting singletons — Phase 16 SC-4
 *
 * Uses Upstash Ratelimit (HTTP-based Redis) for Vercel serverless compatibility.
 * All limits are keyed by authenticated userId (not IP) for accuracy.
 *
 * Pitfall (RESEARCH.md Pitfall 3): Server actions are NOT intercepted by
 * Next.js middleware, so rate limiting for server actions MUST be applied
 * inside the action body using these helpers.
 *
 * Requires env vars: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 * When those vars are absent the limiters fail-open (always allow) rather
 * than crashing with TypeError in Edge functions — Upstash is non-critical
 * infrastructure and should not block core exercise flows.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const upstashConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
);

// No-op limiter: always allows, used when Upstash credentials are absent.
const noopLimiter = {
  limit: async (_id: string) => ({
    success: true as const,
    limit: 0,
    remaining: 0,
    reset: 0,
    pending: Promise.resolve(),
  }),
};

type RatelimitLike = Pick<Ratelimit, "limit">;

let redis: Redis | null = null;
if (upstashConfigured) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

/**
 * Exercise per-answer rate limit: 120 answers/min per userId.
 * Applied to: recordVocabAnswer (server action), vocab-mastery API route, vocab-tiers API route.
 */
export const exerciseRatelimit: RatelimitLike = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(120, "60 s"), analytics: true, prefix: "kitsubeat:exercise" })
  : noopLimiter;

/**
 * Session save rate limit: 10 saves/min per userId.
 * Applied to: saveSessionResults (server action).
 */
export const sessionRatelimit: RatelimitLike = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "60 s"), analytics: true, prefix: "kitsubeat:session" })
  : noopLimiter;

/**
 * LLM/AI proxy rate limit: 10 calls/min per userId.
 * Applied to: any server action making Anthropic API calls.
 */
export const llmRatelimit: RatelimitLike = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "60 s"), analytics: true, prefix: "kitsubeat:llm" })
  : noopLimiter;
