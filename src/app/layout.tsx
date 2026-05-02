import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import { ClerkProvider } from "@clerk/nextjs";
import { cookies } from "next/headers";
import "./globals.css";
import GlobalLearnedCounter from "@/app/components/GlobalLearnedCounter";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

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
        <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-sm">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 text-xl font-bold tracking-tight text-[var(--color-text)]"
            >
              <Image
                src="/logo.png"
                alt="KitsuBeat"
                width={64}
                height={32}
                className="h-8 w-auto"
                unoptimized
              />
              <span className="hidden sm:inline">
                Kitsu<span className="text-[var(--color-accent)]">Beat</span>
              </span>
            </Link>
            <div className="flex items-center gap-4 sm:gap-6">
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
                href="/vocabulary"
                className="whitespace-nowrap text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
              >
                Progress
              </Link>
              <GlobalLearnedCounter />
              <Link
                href="/profile"
                className="whitespace-nowrap text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
              >
                Profile
              </Link>
              <ThemeToggle />
            </div>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
    </ClerkProvider>
  );
}
