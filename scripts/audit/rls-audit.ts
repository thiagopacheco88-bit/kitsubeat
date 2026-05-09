#!/usr/bin/env tsx
/**
 * RLS Audit Script — Phase 16 SC-1
 * Queries Neon Postgres to find tables in the 'public' schema that are missing RLS.
 * Exit code: 0 = all tables have RLS enabled; 1 = one or more tables missing RLS.
 *
 * Run: npx tsx scripts/audit/rls-audit.ts
 * Requires: DATABASE_URL environment variable pointing to Neon Postgres.
 */

import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL!);

interface TableRlsRow {
  schemaname: string;
  tablename: string;
  rowsecurity: boolean;
}

async function main() {
  console.log("Running RLS audit against Neon Postgres...\n");

  const tablesWithoutRls = await sql<TableRlsRow[]>`
    SELECT schemaname, tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
      AND rowsecurity = false
    ORDER BY tablename
  `;

  if (tablesWithoutRls.length === 0) {
    console.log("All public tables have RLS enabled.");
    process.exit(0);
  }

  console.error(`${tablesWithoutRls.length} table(s) are missing RLS:\n`);
  for (const row of tablesWithoutRls) {
    console.error(`  - ${row.schemaname}.${row.tablename}`);
  }
  console.error("\nRun the RLS migration (drizzle/0020_rls_policies.sql) to fix.");
  process.exit(1);
}

main().catch((err) => {
  console.error("Audit script failed:", err);
  process.exit(1);
});
