/**
 * /[locale]/songs — Locale-aware songs page (PT-BR and ES routes).
 *
 * English stays at /songs (src/app/songs/page.tsx — UNCHANGED).
 * /pt-BR/songs and /es/songs resolve here via the [locale] segment.
 *
 * Renders translated heading/subheading via getTranslations('songs').
 * SongGridLoader is reused unchanged — it contains its own client-side
 * language filter chips with useTranslations('songs') (Plan 04).
 *
 * BLAST RADIUS: new file only — src/app/songs/page.tsx (EN canonical) UNCHANGED.
 */
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { getCurrentUserId } from "@/lib/user-prefs";
import { SongGridLoader } from "@/app/songs/components/SongGridLoader";

export const dynamic = "force-dynamic";

export default async function LocaleSongsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string }>;
}) {
  const { locale } = await params;
  // MUST be first — enables static rendering for locale segment
  setRequestLocale(locale);

  const t = await getTranslations("songs");
  const userId = await getCurrentUserId();
  const sp = await searchParams;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      <header className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
          {t("eyebrow")}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-[var(--color-text)]">
          {t("heading")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]">
          {t("subheading")}
        </p>
      </header>
      <Suspense
        fallback={
          <div className="flex flex-col gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 rounded-[var(--radius-lg)] bg-[var(--color-card-2)]" />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="h-4 w-3/4 rounded bg-[var(--color-card-2)]" />
                    <div className="h-3 w-1/2 rounded bg-[var(--color-card-2)]" />
                    <div className="flex gap-2">
                      <div className="h-4 w-10 rounded-full bg-[var(--color-card-2)]" />
                      <div className="h-4 w-14 rounded-full bg-[var(--color-card-2)]" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        }
      >
        <SongGridLoader userId={userId} initialSearch={sp.search ?? ""} view="all" />
      </Suspense>
    </div>
  );
}
