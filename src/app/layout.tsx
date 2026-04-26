import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";
import GlobalLearnedCounter from "@/app/components/GlobalLearnedCounter";

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
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap"
        />
      </head>
      <body className="min-h-screen bg-gray-950 text-gray-100 font-[family-name:var(--font-inter)] antialiased">
        <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 text-xl font-bold tracking-tight text-white"
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
                Kitsu<span className="text-red-500">Beat</span>
              </span>
            </Link>
            <div className="flex items-center gap-4 sm:gap-6">
              <Link
                href="/anime-list"
                className="whitespace-nowrap text-sm text-gray-400 transition-colors hover:text-white"
              >
                Songs
              </Link>
              <Link
                href="/kana"
                className="whitespace-nowrap text-sm text-gray-400 transition-colors hover:text-white"
              >
                Kana
              </Link>
              <Link
                href="/vocabulary"
                className="whitespace-nowrap text-sm text-gray-400 transition-colors hover:text-white"
              >
                Progress
              </Link>
              <GlobalLearnedCounter />
              <Link
                href="/profile"
                className="whitespace-nowrap text-sm text-gray-400 transition-colors hover:text-white"
              >
                Profile
              </Link>
            </div>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
