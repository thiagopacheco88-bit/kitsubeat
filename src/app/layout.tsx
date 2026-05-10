import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { ClerkProvider, UserButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import "./globals.css";
import GlobalLearnedCounter from "@/app/components/GlobalLearnedCounter";
import MobileNavSheet from "@/app/components/MobileNavSheet";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { PostHogIdentify } from "@/app/components/PostHogIdentify";
import { isAdminEmail, parseAdminEmails } from "@/lib/admin/admin-allowlist";
import { LanternStreak } from "@/app/path/components/LanternStreak";
import { getUserGamificationState, type GamificationState } from "@/lib/db/queries";
import NextTopLoader from "nextjs-toploader";
import { PageTransitionWrapper } from "@/app/components/PageTransitionWrapper";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "KitsuBeat",
  description: "Learn Japanese through anime songs",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "KitsuBeat",
    description: "Learn Japanese through anime songs",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "KitsuBeat",
    description: "Learn Japanese through anime songs",
    images: ["/twitter-image.png"],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Phase 14 D-09 — read kb_theme cookie SSR-side. The inline <script> below
  // resolves 'system' against prefers-color-scheme on the client BEFORE first
  // paint (zero-flash). When the stored value is 'light' or 'dark' we use it
  // directly; otherwise we default to 'dark' for the SSR HTML (the script will
  // reconcile to the user's actual prefers-color-scheme on the client).
  const cookieStore = await cookies();
  const stored = cookieStore.get("kb_theme")?.value;
  const initialTheme: "light" | "dark" = stored === "light" ? "light" : "dark";
  // Phase 18 — read kb_consent cookie SSR-side to prevent CookieConsentBanner flash (Pitfall 1).
  const consentCookie = cookieStore.get("kb_consent")?.value;

  // Admin nav surface: same allowlist as src/middleware.ts so the link only
  // appears for users who can actually reach /admin/*. Guarded so a Clerk
  // outage doesn't 500 the root layout for everyone.
  let isAdmin = false;
  let isSignedIn = false;
  let signedInUserId: string | undefined;
  let state: GamificationState | null = null;
  try {
    const session = await auth();
    isSignedIn = Boolean(session.userId);
    signedInUserId = session.userId ?? undefined;
    if (isSignedIn) {
      const user = await currentUser();
      const email =
        user?.primaryEmailAddress?.emailAddress ??
        user?.emailAddresses?.[0]?.emailAddress;
      isAdmin = isAdminEmail(email, parseAdminEmails(process.env.CLERK_ADMIN_EMAILS));
    }
    if (isSignedIn && signedInUserId) {
      try {
        state = await getUserGamificationState(signedInUserId);
      } catch {
        state = null; // graceful degrade — header still renders without streak chip
      }
    }
  } catch {
    isAdmin = false;
    isSignedIn = false;
    signedInUserId = undefined;
  }

  return (
    <ClerkProvider>
    <html lang="en" className={inter.variable} data-theme={initialTheme}>
      <head>
        {/*
          Phase 14 D-09 zero-flash script — runs before first paint to resolve 'system' theme.
          SECURITY (T-14-03-01): __html is a LITERAL string. NO USER INPUT IS EVER INTERPOLATED.
          Do NOT add ${} expressions inside this script — that would create an XSS surface.
          The regex (kb_theme=(system|light|dark)) constrains the cookie value to the enum
          BEFORE setting the data-theme attribute — even a maliciously-set kb_theme=<script>
          cookie value falls back to 'system' (regex doesn't match).
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=document.cookie.match(/kb_theme=(system|light|dark)/);var v=p?p[1]:'system';if(v==='system')v=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',v);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap"
        />
      </head>
      <body className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-[family-name:var(--font-inter)] antialiased">
        <NextTopLoader color="#dc2626" showSpinner={false} height={2} />
        {/* Phase 18 REQ-A11Y-26 — skip-to-main link; must be first focusable element */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded focus:bg-[var(--color-card)] focus:px-4 focus:py-2 focus:text-sm focus:text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-accent)]"
        >
          Skip to main content
        </a>
        <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-sm">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
            <Link href="/" className="flex shrink-0 items-center gap-2" data-testid="brand-wordmark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" width={26} height={26} alt="" aria-hidden="true" className="rounded-sm" />
              <span className="text-lg font-extrabold tracking-tight" aria-label="KitsuBeat">
                <span className="text-[var(--color-text)]">Kitsu</span>
                <span className="text-[var(--color-accent-readable)]" data-testid="wordmark-emphasis">Beat</span>
              </span>
            </Link>
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="hidden sm:contents">
                <Link
                  href="/path"
                  className="whitespace-nowrap text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
                >
                  Path
                </Link>
                <Link
                  href="/anime-list"
                  className="whitespace-nowrap text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
                >
                  Songs
                </Link>
                <Link
                  href="/kana"
                  className="whitespace-nowrap text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
                >
                  Kana
                </Link>
                <Link
                  href="/journal"
                  className="whitespace-nowrap text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
                >
                  Journal
                </Link>
                <GlobalLearnedCounter />
                {isAdmin && (
                  <Link
                    href="/admin/lyrics"
                    className="whitespace-nowrap text-sm font-medium text-[var(--color-accent-readable)] transition-colors hover:opacity-80"
                    data-testid="nav-admin-lyrics"
                  >
                    Admin
                  </Link>
                )}
                <Link
                  href="/profile"
                  className="whitespace-nowrap text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
                >
                  Profile
                </Link>
              </div>
              <MobileNavSheet isAdmin={isAdmin} isSignedIn={isSignedIn} />
              {isSignedIn ? (
                <>
                  {state && (
                    <div data-testid="global-lantern-streak">
                      <LanternStreak count={state.streak_current} />
                    </div>
                  )}
                  <UserButton />
                </>
              ) : (
                <Link
                  href="/sign-in"
                  className="whitespace-nowrap text-sm font-medium text-[var(--color-accent-readable)] transition-colors hover:opacity-80"
                  data-testid="nav-sign-in"
                >
                  Sign in
                </Link>
              )}
              <ThemeToggle userId={signedInUserId} />
            </div>
          </nav>
        </header>
        {/* Phase 18 — PECR-compliant cookie consent banner (useConsentStore + recordConsent + PostHog opt-in) */}
        <CookieConsentBanner initialConsent={consentCookie} />
        <PostHogIdentify userId={signedInUserId ?? null} />
        <main id="main-content">
          <PageTransitionWrapper>{children}</PageTransitionWrapper>
        </main>
      </body>
    </html>
    </ClerkProvider>
  );
}
