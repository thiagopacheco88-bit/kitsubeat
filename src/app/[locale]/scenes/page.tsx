import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { getCurrentUserId } from "@/lib/user-prefs";
import { SceneGridLoader } from "./components/SceneGridLoader";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kitsubeat.vercel.app";

export const metadata = {
  title: "Famous Scenes | KitsuBeat",
  description:
    "Learn Japanese from iconic anime dialogues. Study speeches, monologues, and famous moments from Naruto, Attack on Titan, One Piece, and more.",
  alternates: { canonical: `${SITE_URL}/scenes` },
  openGraph: {
    title: "Famous Scenes | KitsuBeat",
    description:
      "Learn Japanese from iconic anime dialogues. Study speeches, monologues, and famous moments.",
    url: `${SITE_URL}/scenes`,
    siteName: "KitsuBeat",
    images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Famous Scenes | KitsuBeat",
    description:
      "Learn Japanese from iconic anime dialogues. Erwin, Pain, Rengoku, and more.",
    images: [`${SITE_URL}/og-image.png`],
  },
};

export default async function ScenesPage({
  params: routeParams,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string }>;
}) {
  const { locale } = await routeParams;
  setRequestLocale(locale);
  const userId = await getCurrentUserId();
  const params = await searchParams;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      <header className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
          Catalog
        </p>
        <h1 className="mt-1 text-3xl font-bold text-[var(--color-text)]">Famous Scenes</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]">
          Iconic anime dialogues — speeches, monologues, final words. Learn the Japanese behind the
          moments that hit hardest.
        </p>
      </header>
      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)]"
                style={{ aspectRatio: "3/4" }}
              />
            ))}
          </div>
        }
      >
        <SceneGridLoader userId={userId} initialSearch={params.search ?? ""} />
      </Suspense>
    </div>
  );
}
