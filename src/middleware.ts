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
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);
const isAuthRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
const intlMiddleware = createIntlMiddleware(routing);

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

      // Check bridge cookie first — set by completeOnboarding() server action.
      // Clerk JWT claims lag up to 60s after updateUserMetadata; the cookie is the
      // immediate signal that the user just completed onboarding this session.
      const termsDoneCookie = req.cookies.get("kb_terms_done");
      const cookieMatches = termsDoneCookie?.value === CURRENT_TERMS_VERSION;

      if (!cookieMatches) {
        const termsVersion = publicMeta?.terms_version;
        if (!termsVersion || termsVersion !== CURRENT_TERMS_VERSION) {
          const dest = new URL("/onboarding/age-gate", req.url);
          dest.searchParams.set("redirect_url", req.nextUrl.pathname + req.nextUrl.search);
          return NextResponse.redirect(dest);
        }
      }

      // Restore locale from Clerk when no kb_locale cookie is present (new browser /
      // incognito / different device). syncLocaleToClerk() writes publicMetadata.locale
      // whenever the user changes language — here we read it back to honour that choice
      // without requiring the user to re-select on every new session.
      // Only needed for non-default locales; 'en' falls through to intlMiddleware default.
      const VALID_LOCALES = ['en', 'pt-BR', 'es'] as const;
      const localeCookie = req.cookies.get('kb_locale');
      if (!localeCookie) {
        const clerkLocale = publicMeta?.locale;
        if (
          clerkLocale &&
          (VALID_LOCALES as readonly string[]).includes(clerkLocale) &&
          clerkLocale !== 'en' &&
          !req.nextUrl.pathname.startsWith(`/${clerkLocale}`)
        ) {
          const dest = new URL(
            `/${clerkLocale}${req.nextUrl.pathname}${req.nextUrl.search}`,
            req.url
          );
          const res = NextResponse.redirect(dest);
          res.cookies.set('kb_locale', clerkLocale, {
            path: '/',
            maxAge: 60 * 60 * 24 * 365,
            sameSite: 'lax',
          });
          return res;
        }
      }
    }
  }

  // 3. Auth + onboarding routes live at root (not under [locale]),
  // so skip intl middleware to prevent /pt-BR/sign-in or /en/onboarding 404s.
  if (isAuthRoute(req)) {
    return NextResponse.next();
  }
  if (req.nextUrl.pathname.startsWith("/onboarding")) {
    return NextResponse.next();
  }

  // 4. API routes — pass through without locale prefixing.
  // intlMiddleware rewrites /api/* → /en/api/* which has no route match → 404.
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 5. Legal pages live at root (not under [locale]) — pass through without locale prefixing.
  // intlMiddleware would create a redirect loop: /legal/terms → /en/legal/terms → /legal/terms.
  if (req.nextUrl.pathname.startsWith('/legal')) {
    return NextResponse.next();
  }

  // 6. Locale routing — runs last; handles all non-admin, non-auth, non-API routes.
  // next-intl manages Accept-Language detection, kb_locale cookie, and /pt-BR/ /es/ prefixes.
  return intlMiddleware(req);
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
