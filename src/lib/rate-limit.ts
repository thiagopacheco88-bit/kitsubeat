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
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Exercise per-answer rate limit: 120 answers/min per userId.
 * Applied to: recordVocabAnswer (server action), vocab-mastery API route, vocab-tiers API route.
 * 120/min is generous for a real learning session (2/second max).
 */
export const exerciseRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(120, "60 s"),
  analytics: true,
  prefix: "kitsubeat:exercise",
});

/**
 * Session save rate limit: 10 saves/min per userId.
 * Applied to: saveSessionResults (server action).
 * A typical session takes 2-5 minutes; 10/min is very permissive.
 */
export const sessionRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,
  prefix: "kitsubeat:session",
});

/**
 * LLM/AI proxy rate limit: 10 calls/min per userId.
 * Applied to: any server action making Anthropic API calls.
 * Grammar exercise generation is the primary consumer.
 */
export const llmRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,
  prefix: "kitsubeat:llm",
});
