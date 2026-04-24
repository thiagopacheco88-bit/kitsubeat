/**
 * src/lib/db/index.ts — Drizzle ORM client for Neon Postgres (serverless HTTP driver).
 *
 * Uses @neondatabase/serverless HTTP client — no persistent connection required.
 * Compatible with Vercel Edge, Next.js server components, and seeding scripts.
 *
 * Two usage patterns:
 *
 * 1. App code (Next.js server components, API routes) — DATABASE_URL set at build time:
 *      import { db } from "@/lib/db";
 *
 * 2. Seeding scripts — need dotenv loaded before DB client is created:
 *      import { getDb } from "../../src/lib/db/index.js";
 *      // ... load dotenv at top of main() ...
 *      const db = getDb();  // call after dotenv loads DATABASE_URL
 */

import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

type DrizzleDb = NeonHttpDatabase;

let _db: DrizzleDb | null = null;

/**
 * Retry wrapper for the Neon HTTP fetch. Neon serverless computes scale to
 * zero when idle; the first request after suspension can fail with a transient
 * "fetch failed" before the compute wakes up. Two quick retries with short
 * backoff turn those cold-starts into a slight latency blip instead of a
 * user-facing error page.
 *
 * Only transient network-layer failures are retried — once the request
 * reaches Neon and returns any HTTP response (even 4xx/5xx), we return it
 * unchanged so SQL errors surface as normal.
 */
const COLD_START_RETRIES = 2;
const COLD_START_BACKOFF_MS = 250;

const fetchWithColdStartRetry: typeof fetch = async (input, init) => {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= COLD_START_RETRIES; attempt++) {
    try {
      return await fetch(input, init);
    } catch (err) {
      lastErr = err;
      if (attempt < COLD_START_RETRIES) {
        await new Promise((r) =>
          setTimeout(r, COLD_START_BACKOFF_MS * (attempt + 1))
        );
      }
    }
  }
  throw lastErr;
};

/**
 * Lazy database client factory.
 *
 * Defers DATABASE_URL validation to first call, allowing seeding scripts to
 * load dotenv before the first DB operation.
 *
 * Returns the same singleton on subsequent calls.
 */
export function getDb(): DrizzleDb {
  if (_db) return _db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (for scripts) or Vercel env vars (for app)."
    );
  }

  // `fetchFunction` is a global-only option on NeonConfig — not accepted on the
  // per-call `neon(url, options)` signature. Assigning to the module-scoped
  // neonConfig applies the cold-start retry to every HTTP fetch this process
  // makes, which is what we want (only one Neon client exists in app code).
  neonConfig.fetchFunction = fetchWithColdStartRetry;
  const sql = neon(url);
  _db = drizzle(sql);
  return _db;
}

/**
 * Pre-initialized db instance for app code.
 *
 * This is a Proxy that defers initialization to first property access,
 * allowing this module to be imported without DATABASE_URL being set yet.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_target, prop) {
    const instance = getDb();
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});
