/**
 * Phase 11.5: Admin route gate.
 *
 * Per D-01 (LOCKED): /admin/* is localhost-only. Public catalog (/, /songs/*) is on Vercel
 * and MUST NOT be touched by this middleware — config.matcher is scoped to /admin/:path* ONLY
 * (NOT the Clerk-recommended catch-all matcher — that would break Vercel public routes
 * if Clerk env vars are absent; see RESEARCH §9 Pitfall 15).
 *
 * Per D-04: non-admin → redirect("/") with NO 401/403 (route existence is not disclosed).
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAdminEmail, parseAdminEmails } from "@/lib/admin/admin-allowlist";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isAdminRoute(req)) return; // pass-through for everything outside /admin/*

  const session = await auth();
  if (!session.userId) {
    // Logged-out → redirect to / (no leaked 401)
    return NextResponse.redirect(new URL("/", req.url));
  }

  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress;
  const allowlist = parseAdminEmails(process.env.CLERK_ADMIN_EMAILS);

  if (!isAdminEmail(email, allowlist)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Allowed — let request through
});

export const config = {
  // Scope STRICTLY to /admin/* — do NOT use the Clerk catch-all matcher.
  // RESEARCH §9 Pitfall 15: catch-all + missing Clerk env vars = Vercel public deploy breaks.
  matcher: ["/admin/:path*"],
};
