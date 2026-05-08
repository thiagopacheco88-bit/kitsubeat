/**
 * Phase 11.5: Admin route gate.
 * Phase 18: Terms version gate (SC1 — T&Cs accepted at signup; changes require re-acceptance).
 *
 * Per D-01 (LOCKED): /admin/* is localhost-only. Public catalog (/, /songs/*) is on Vercel
 * and MUST NOT be touched by this middleware — config.matcher is scoped to /admin/:path* ONLY
 * (NOT the Clerk-recommended catch-all matcher — that would break Vercel public routes
 * if Clerk env vars are absent; see RESEARCH §9 Pitfall 15).
 *
 * Per D-04: non-admin → redirect("/") with NO 401/403 (route existence is not disclosed).
 */

import { clerkMiddleware, createRouteMatcher, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAdminEmail, parseAdminEmails } from "@/lib/admin/admin-allowlist";
import { CURRENT_TERMS_VERSION } from "@/lib/legal/versions";

const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);

/**
 * Phase 18: Routes excluded from the terms version gate (Pitfall 2 guard).
 * Skipping /legal/*, /onboarding/*, /sign-in/*, /sign-up/*, /api/* prevents
 * redirect loops and broken unauthenticated browsing.
 */
const isLegalOrOnboardingRoute = createRouteMatcher([
  "/legal(.*)",
  "/onboarding(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // 1. Admin gate (existing — unchanged logic, restructured from early-return)
  if (isAdminRoute(req)) {
    const session = await auth();
    if (!session.userId) {
      // Logged-out → redirect to /sign-in with redirect_url back to the admin route.
      // (Per D-04 we don't 401 — funneling through the generic sign-in flow doesn't reveal
      // which route triggered the redirect.)
      const signIn = new URL("/sign-in", req.url);
      signIn.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(signIn);
    }

    // currentUser() is not allowed in middleware in Clerk 7.x — use the backend client.
    const client = await clerkClient();
    const user = await client.users.getUser(session.userId);
    const email =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses?.[0]?.emailAddress;
    const allowlist = parseAdminEmails(process.env.CLERK_ADMIN_EMAILS);

    if (!isAdminEmail(email, allowlist)) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Allowed — let request through
    return;
  }

  // 2. Terms version gate (Phase 18 addition — SC1 re-acceptance on T&Cs change).
  //
  // Skips: /legal/*, /onboarding/*, /sign-in/*, /sign-up/*, /api/* (Pitfall 2 guard).
  // Only runs for authenticated users — anonymous visitors always pass through (T-18-04-02).
  // Reads terms_version from Clerk JWT publicMetadata — 0ms DB query (T-18-04-03 mitigation;
  // RESEARCH Open Question 2 resolution: completeOnboarding() caches version in JWT claims).
  if (!isLegalOrOnboardingRoute(req)) {
    const session = await auth();
    if (session.userId) {
      const publicMeta = session.sessionClaims?.publicMetadata as
        | Record<string, string>
        | undefined;
      const termsVersion = publicMeta?.terms_version;
      if (!termsVersion || termsVersion !== CURRENT_TERMS_VERSION) {
        return NextResponse.redirect(new URL("/onboarding/age-gate", req.url));
      }
    }
  }
});

export const config = {
  // Catch-all (excluding static assets) so clerkMiddleware() runs on every
  // request — required for `currentUser()` to work in the root layout (e.g.
  // for the admin nav link on the public home page).
  //
  // RESEARCH §9 Pitfall 15 mitigation: the middleware function ABOVE early-returns
  // for non-admin routes BEFORE calling auth(), so missing Clerk env vars don't
  // crash public-catalog requests — only /admin/* invokes Clerk APIs.
  matcher: [
    // Canonical Clerk v5 catch-all that skips static asset URLs (any path
    // containing a "." extension) and Next internals. The middleware function
    // above early-returns for non-admin routes, so public-catalog requests
    // never invoke Clerk APIs even though clerkMiddleware() runs.
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
