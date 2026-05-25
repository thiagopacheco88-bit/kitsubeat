import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import Link from "next/link";
import Image from "next/image";
import { ClerkProvider, UserButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import "./globals.css";
import GlobalLearnedCounter from "@/app/components/GlobalLearnedCounter";
import MobileNavSheet from "@/app/components/MobileNavSheet";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguagePicker } from "@/components/ui/LanguagePicker";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { PostHogIdentify } from "@/app/components/PostHogIdentify";
import { isAdminEmail, parseAdminEmails } from "@/lib/admin/admin-allowlist";
import { LanternStreak } from "@/app/path/components/LanternStreak";
import { getUserGamificationState, type GamificationState } from "@/lib/db/queries";
import NextTopLoader from "nextjs-toploader";
import { PageTransitionWrapper } from "@/app/components/PageTransitionWrapper";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kitsubeat.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "KitsuBeat",
  description: "Learn Japanese through anime songs",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "KitsuBeat",
    description: "Learn Japanese through anime songs",
    siteName: "KitsuBeat",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
    locale: "en_US",
    url: SITE_URL,
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

  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'common' });

  return (
    <ClerkProvider>
    <html lang={locale} className={inter.variable} data-theme={initialTheme}>
      <head>
        {/*
          Phase 14 D-09 zero-flash script — runs before first paint.
          SECURITY (T-14-03-01): __html is a LITERAL string. NO USER INPUT IS EVER INTERPOLATED.
          Do NOT add ${} expressions inside this script — that would create an XSS surface.
          Only 'light' is accepted; everything else (including legacy 'system' cookies) → 'dark'.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=document.cookie.match(/kb_theme=(light|dark)/);document.documentElement.setAttribute('data-theme',p&&p[1]==='light'?'light':'dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              '@id': `${SITE_URL}/#organization`,
              name: 'KitsuBeat',
              url: SITE_URL,
              logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
              description: 'Learn Japanese through anime songs',
            }).replace(/</g, '\\u003c'),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              '@id': `${SITE_URL}/#website`,
              name: 'KitsuBeat',
              url: SITE_URL,
              description: 'Learn Japanese vocabulary through anime songs with spaced repetition',
              publisher: { '@id': `${SITE_URL}/#organization` },
            }).replace(/</g, '\\u003c'),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              '@id': `${SITE_URL}/#application`,
              name: 'KitsuBeat',
              url: SITE_URL,
              description: 'Learn Japanese vocabulary through anime songs with interactive lyrics and spaced-repetition flashcards.',
              applicationCategory: 'EducationalApplication',
              operatingSystem: 'Web',
              inLanguage: ['en', 'ja'],
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
              provider: { '@id': `${SITE_URL}/#organization` },
            }).replace(/</g, '\\u003c'),
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-[family-name:var(--font-inter)] antialiased">
        <NextTopLoader color="#dc2626" showSpinner={false} height={2} />
        {/* Phase 18 REQ-A11Y-26 — skip-to-main link; must be first focusable element */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded focus:bg-[var(--color-card)] focus:px-4 focus:py-2 focus:text-sm focus:text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-accent)]"
        >
          {t('skip.toMain')}
        </a>
        <NextIntlClientProvider locale={locale}>
        <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-sm">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
            <Link href="/" className="flex shrink-0 items-center gap-2" data-testid="brand-wordmark">
              <Image src="/logo-transparent.png" width={65} height={65} alt="" aria-hidden="true" />
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
                  {t('nav.path')}
                </Link>
                <Link
                  href="/songs"
                  className="whitespace-nowrap text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
                >
                  {t('nav.songs')}
                </Link>
                <Link
                  href="/kana"
                  className="whitespace-nowrap text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
                >
                  {t('nav.kana')}
                </Link>
                <Link
                  href="/anime"
                  className="whitespace-nowrap text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
                >
                  {t('nav.anime')}
                </Link>
                <Link
                  href="/journal"
                  className="whitespace-nowrap text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
                >
                  {t('nav.journal')}
                </Link>
                <GlobalLearnedCounter />
                {isAdmin && (
                  <Link
                    href="/admin/lyrics"
                    className="whitespace-nowrap text-sm font-medium text-[var(--color-accent-readable)] transition-colors hover:opacity-80"
                    data-testid="nav-admin-lyrics"
                  >
                    {t('nav.admin')}
                  </Link>
                )}
                <Link
                  href="/profile"
                  className="whitespace-nowrap text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
                >
                  {t('nav.profile')}
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
                  {t('nav.signIn')}
                </Link>
              )}
              <ThemeToggle userId={signedInUserId} />
              <LanguagePicker currentLocale={locale as "en" | "pt-BR" | "es"} />
            </div>
          </nav>
        </header>
        {/* Phase 18 — PECR-compliant cookie consent banner (useConsentStore + recordConsent + PostHog opt-in) */}
        <CookieConsentBanner initialConsent={consentCookie} />
        <PostHogIdentify userId={signedInUserId ?? null} />
        <main id="main-content">
            <PageTransitionWrapper>{children}</PageTransitionWrapper>
        </main>
        <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg)] py-6 mt-auto">
          <nav aria-label="Legal and site links" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-sm text-[var(--color-text-muted)]">
            <span>© {new Date().getFullYear()} KitsuBeat</span>
            <ul className="flex flex-wrap gap-4">
              {[
                { href: "/legal/terms", label: "Terms of Service" },
                { href: "/legal/privacy", label: "Privacy Policy" },
                { href: "/legal/cookie-policy", label: "Cookie Policy" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="hover:text-[var(--color-text)] hover:underline transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </footer>
        </NextIntlClientProvider>
      </body>
    </html>
    </ClerkProvider>
  );
}
