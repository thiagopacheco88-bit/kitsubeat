import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-jp",
});

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${notoSansJP.variable}`}>
      <body className="min-h-screen bg-gray-950 text-gray-100 font-[family-name:var(--font-inter)] antialiased">
        <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-bold tracking-tight text-white"
            >
              <Image
                src="/logo.png"
                alt="KitsuBeat"
                width={64}
                height={32}
                className="h-8 w-auto"
                unoptimized
              />
              Kitsu<span className="text-red-500">Beat</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link
                href="/songs"
                className="text-sm text-gray-400 transition-colors hover:text-white"
              >
                Songs
              </Link>
            </div>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
