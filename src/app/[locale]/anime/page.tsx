/**
 * /[locale]/anime — Locale-aware anime index page (PT-BR and ES routes).
 *
 * English stays at /anime (src/app/anime/page.tsx — UNCHANGED).
 * /pt-BR/anime and /es/anime resolve here via the [locale] segment.
 *
 * Full component (not re-export) because setRequestLocale() must be called
 * for next-intl to work correctly in sub-components.
 */
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getAnimeCatalog } from "@/lib/db/queries";
import AnimeIndexGrid from "@/app/anime/components/AnimeIndexGrid";

export default async function LocaleAnimePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, animes] = await Promise.all([
    getTranslations("common"),
    getAnimeCatalog(),
  ]);

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--color-text)]">
          {t("anime.heading")}
        </h1>
        <p className="mt-2 text-[var(--color-text-muted)]">
          {t("anime.subheading")}
        </p>
      </div>
      <AnimeIndexGrid animes={animes} />
    </main>
  );
}
