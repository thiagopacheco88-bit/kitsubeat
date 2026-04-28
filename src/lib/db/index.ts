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

// Phase 13 D-04 + D-20: test-only Neon SELECT counter. Counts SQL fragments
// matching `\bsongs\b`, `\bsong_versions\b`, `\bvocabulary_items\b` against
// requests passing through fetchWithColdStartRetry. SINGLE-CONDITION gate on
// process.env.NEXT_PUBLIC_APP_ENV === "test" — NO `||` with NODE_ENV.
// The integration setup at tests/integration/setup.ts sets NEXT_PUBLIC_APP_ENV="test"
// before any module-level db import resolves; CI already sets it at qa-suite.yml:51.
// In dev/prod NEXT_PUBLIC_APP_ENV is unset or "production"/"staging", so the
// entire branch is dead-code-eliminated by Next.js build-time inlining of
// NEXT_PUBLIC_* env vars — zero bundle bytes leak. NODE_ENV is NOT a NEXT_PUBLIC_*
// var, so adding it to the gate would break DCE and leak the shim into the
// production bundle (which would also blow Plan 13-03's 50 KB budget).

interface QueryCounter {
  reset(): void;
  count(table: "songs" | "song_versions" | "vocabulary_items"): number;
}
let _queryCounter: QueryCounter | null = null;

const _countableTables = ["songs", "song_versions", "vocabulary_items"] as const;
type CountableTable = (typeof _countableTables)[number];

const _instrumentedFetch: typeof fetch =
  process.env.NEXT_PUBLIC_APP_ENV === "test"
    ? (() => {
        const counts = new Map<CountableTable, number>(
          _countableTables.map((t) => [t, 0])
        );
        _queryCounter = {
          reset: () => {
            for (const t of _countableTables) counts.set(t, 0);
          },
          count: (t) => counts.get(t) ?? 0,
        };
        const wrapped: typeof fetch = async (input, init) => {
          // Neon HTTP body: { query: "SELECT ...", params: [...] } as JSON string
          try {
            const body = init?.body;
            if (typeof body === "string") {
              for (const t of _countableTables) {
                // word-boundary regex — avoid matching e.g. "user_songs" on "songs"
                const re = new RegExp(`\\b${t}\\b`, "i");
                if (re.test(body)) counts.set(t, (counts.get(t) ?? 0) + 1);
              }
            }
          } catch {
            /* counter is best-effort; never break a request */
          }
          return fetchWithColdStartRetry(input, init);
        };
        return wrapped;
      })()
    : fetchWithColdStartRetry;

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
  // neonConfig applies the instrumented fetch (or cold-start retry in prod) to
  // every HTTP fetch this process makes, which is what we want (only one Neon
  // client exists in app code).
  neonConfig.fetchFunction = _instrumentedFetch;
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

/**
 * Test-only: counts Neon SELECTs against songs / song_versions / vocabulary_items
 * since the last `reset()`. `null` in production builds (dead-code-eliminated).
 */
export const __testQueryCounter = _queryCounter;
