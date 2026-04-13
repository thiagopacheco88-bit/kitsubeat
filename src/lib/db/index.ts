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

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

type DrizzleDb = NeonHttpDatabase;

let _db: DrizzleDb | null = null;

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (instance as any)[prop];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});
