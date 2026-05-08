"use server";

/**
 * recordConsent() — cookie consent server action.
 *
 * Records the user's cookie consent decision in:
 *   1. The `cookie_consent_record` DB table (PECR audit trail — REQ-PRIV-COOKIE-05)
 *   2. The `kb_consent` browser cookie (SSR-readable persistence layer)
 *
 * GDPR Art. 5(1)(c) — data minimisation:
 *   IP is stored as SHA-256(ip + salt) — never the raw IP address.
 *
 * Anonymous callers (unauthenticated visitors) are allowed — userId is nullable.
 * Consent is tracked by session/IP hash for pre-signup visitors.
 */

import { createHash } from "crypto";
import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { cookieConsentRecord } from "@/lib/db/schema";
import { CURRENT_COOKIE_CONSENT_VERSION } from "@/lib/legal/versions";

export async function recordConsent(
  decision: "granted" | "rejected"
): Promise<void> {
  // Clerk auth — userId may be null for anonymous visitors (consent is still valid)
  const { userId } = await auth();

  // Read request headers for GDPR audit fields
  const headerStore = await headers();
  const rawIp =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const userAgent = headerStore.get("user-agent") ?? undefined;

  // REQ-PRIV-COOKIE-05 — store SHA-256 hash of IP, NEVER raw IP (GDPR Art. 5(1)(c))
  const ipHash = rawIp
    ? createHash("sha256")
        .update(rawIp + (process.env.CRON_SECRET ?? "kitsubeat-salt"))
        .digest("hex")
    : undefined;

  await db.insert(cookieConsentRecord).values({
    user_id: userId ?? null,
    consent_version: CURRENT_COOKIE_CONSENT_VERSION,
    categories: { essential: true, analytics: decision === "granted" },
    decision,
    ip_hash: ipHash,
    user_agent: userAgent,
  });

  // Set browser cookie via dynamic import (prevents jsdom crash in unit tests)
  // SameSite=Lax; Path=/; MaxAge=1 year; NOT httpOnly (client must read for PostHog gate)
  const { cookies } = await import("next/headers");
  const c = await cookies();
  c.set("kb_consent", decision, {
    maxAge: 60 * 60 * 24 * 365, // 1 year in seconds
    sameSite: "lax",
    httpOnly: false, // client-readable — PostHog gate reads document.cookie
    path: "/",
  });
}
