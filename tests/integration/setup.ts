/**
 * tests/integration/setup.ts — Vitest setup file for the integration layer.
 *
 * Loaded via `setupFiles` in vitest.config.ts BEFORE any test module is imported.
 * Two responsibilities:
 *
 *   1. Load env from .env.test (preferred) then .env.local (fallback) so the
 *      operator can keep TEST_DATABASE_URL in either place. Mirrors the seed
 *      script's loading order in tests/support/seed-test-db.ts.
 *
 *   2. Redirect DATABASE_URL → TEST_DATABASE_URL.
 *      The app's `db` client (src/lib/db/index.ts) reads `process.env.DATABASE_URL`
 *      lazily on first access. Routes and server actions imported by integration
 *      tests resolve to the test DB only if we swap DATABASE_URL BEFORE any of
 *      those modules are imported. Setup files run before test files and before
 *      module-level imports inside them, so this swap is safe.
 *
 *      If TEST_DATABASE_URL is missing, we leave DATABASE_URL untouched and let
 *      the per-file `describe.skip` guards handle the skip — we deliberately do
 *      NOT fall back to the dev DATABASE_URL, since integration tests perform
 *      destructive resets on user_song_progress / user_vocab_mastery.
 *
 * Why a single setup file (not per-test):
 *   - Vitest setup files run once per worker before user test files load.
 *   - dotenv side effects must happen before any DB-touching import resolves.
 *   - The cost is two `dotenv.config()` calls per worker — negligible.
 */

import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Order matters: .env.test wins, .env.local is the fallback (matches the seed script).
const root = process.cwd();
const envTest = resolve(root, ".env.test");
const envLocal = resolve(root, ".env.local");

if (existsSync(envTest)) {
  loadEnv({ path: envTest });
}
if (!process.env.TEST_DATABASE_URL && existsSync(envLocal)) {
  loadEnv({ path: envLocal });
}

// Swap DATABASE_URL → TEST_DATABASE_URL so the lazy `db` proxy resolves to the
// test DB on first access. Skip the swap if TEST_DATABASE_URL is missing — the
// per-file describe.skip guards will handle the skip path cleanly.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
