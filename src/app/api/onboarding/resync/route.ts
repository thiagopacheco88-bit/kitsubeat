"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { CURRENT_TERMS_VERSION } from "@/lib/legal/versions";

/**
 * GET /api/onboarding/resync?redirect_url=<url>
 *
 * Called by the onboarding page when the user already has the current
 * terms version in the DB but the Clerk JWT / kb_terms_done cookie is
 * missing (e.g. new device, Clerk updateUserMetadata silently failed).
 *
 * Route Handlers can set cookies; Server Component pages cannot.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  const redirectUrl = req.nextUrl.searchParams.get("redirect_url") ?? "/";

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const row = await db
    .select({ date_of_birth: users.date_of_birth, terms_version: users.terms_version })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const record = row[0];

  if (record?.date_of_birth && record?.terms_version === CURRENT_TERMS_VERSION) {
    try {
      const client = await clerkClient();
      await client.users.updateUserMetadata(userId, {
        publicMetadata: { terms_version: CURRENT_TERMS_VERSION },
      });
    } catch {
      // Non-fatal — bridge cookie covers the next request
    }

    const cookieStore = await cookies();
    cookieStore.set("kb_terms_done", CURRENT_TERMS_VERSION, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });

    return NextResponse.redirect(new URL(redirectUrl, req.url));
  }

  // DB record incomplete — send back to form so user can complete onboarding
  const fallback = new URL("/onboarding/age-gate", req.url);
  fallback.searchParams.set("redirect_url", redirectUrl);
  return NextResponse.redirect(fallback);
}
