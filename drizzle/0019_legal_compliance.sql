-- drizzle/0019_legal_compliance.sql
-- Phase 18: Legal & Compliance — all schema changes in one atomic file
--
-- Applied via: tsx scripts/apply-migrations.ts (auto-discovered alphabetically).
-- DO NOT use drizzle-kit migrate — see Phase 11.6 pitfall re: corrupted journal.

BEGIN;

-- 1. Users table extensions (6 new nullable columns)
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "date_of_birth" date,
  ADD COLUMN IF NOT EXISTS "is_minor" boolean,
  ADD COLUMN IF NOT EXISTS "terms_accepted_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "terms_version" text,
  ADD COLUMN IF NOT EXISTS "minor_defaults_applied" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "marketing_email_opt_in" boolean DEFAULT false;

--> statement-breakpoint

-- 2. cookie_consent_record table (PECR audit log; user_id nullable for anonymous visitors)
CREATE TABLE IF NOT EXISTS "cookie_consent_record" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"           text,
  "consent_timestamp" timestamptz NOT NULL DEFAULT now(),
  "consent_version"   text NOT NULL,
  "categories"        jsonb NOT NULL,
  "decision"          text NOT NULL,
  "ip_hash"           text,
  "user_agent"        text
);
CREATE INDEX IF NOT EXISTS "cookie_consent_record_user_id_idx" ON "cookie_consent_record"("user_id");
CREATE INDEX IF NOT EXISTS "cookie_consent_record_timestamp_idx" ON "cookie_consent_record"("consent_timestamp");

--> statement-breakpoint

-- 3. sar_log table (SAR accountability log for ICO/DPA audit trail)
CREATE TABLE IF NOT EXISTS "sar_log" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id_or_email" text NOT NULL,
  "request_date"     timestamptz NOT NULL DEFAULT now(),
  "response_date"    timestamptz,
  "outcome"          text,
  "notes"            text
);
CREATE INDEX IF NOT EXISTS "sar_log_user_id_idx" ON "sar_log"("user_id_or_email");

COMMIT;
