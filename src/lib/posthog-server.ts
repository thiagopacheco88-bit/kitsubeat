/**
 * src/lib/posthog-server.ts — PostHog Node.js client singleton for server actions.
 *
 * Uses the lazy singleton pattern from src/lib/db/index.ts.
 *
 * Two usage patterns:
 *
 * 1. Server actions (server-side analytics events — gamification, streak):
 *      import { getPostHogServer } from "@/lib/posthog-server";
 *      getPostHogServer().capture({ distinctId: userId, event: "xp_gained", properties: {...} });
 *
 * 2. Unit tests — mock this module:
 *      vi.mock("./posthog-server", () => ({ getPostHogServer: vi.fn(() => ({ capture: vi.fn() })) }));
 *
 * IMPORTANT: flushAt:1, flushInterval:0 are required for Vercel serverless functions.
 * Without them, events batch in memory and the function terminates before the batch fires.
 *
 * Phase 15 — server-side analytics only. Client-side uses posthog-js via instrumentation-client.ts.
 */
import { PostHog } from "posthog-node";

let _client: PostHog | null = null;

/**
 * Lazy PostHog Node.js client singleton for server actions.
 *
 * flushAt: 1, flushInterval: 0 — required for Vercel serverless functions;
 * events flush immediately instead of batching (functions terminate before batch fires).
 */
export function getPostHogServer(): PostHog {
  if (_client) return _client;

  const key = process.env.NEXT_PUBLIC_POSTHOG_TOKEN;
  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_POSTHOG_TOKEN is not set. Add it to .env.local or Vercel env vars."
    );
  }

  _client = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });

  return _client;
}
