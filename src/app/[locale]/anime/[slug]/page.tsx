/**
 * /[locale]/anime/[slug] — Locale-aware anime carousel page (PT-BR and ES routes).
 *
 * Full component (not re-export) because:
 * 1. setRequestLocale() must be called for next-intl in sub-components
 * 2. locale is passed to AnimeVocabCarouselWrapper for localized meaning display
 */
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getAnimeVocabBySlug } from "@/lib/db/queries";
import AnimeVocabCarouselWrapper from "@/app/anime/components/AnimeVocabCarouselWrapper";

export default async function LocaleAnimeCarouselPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const { userId } = await auth();
  const { animeMeta, words } = await getAnimeVocabBySlug(slug, userId);

  if (!animeMeta && words.length === 0) {
    notFound();
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--color-text)]">
          {animeMeta?.title_english ?? slug}
        </h1>
        <p className="mt-1 text-[var(--color-text-muted)]">
          {words.length} vocabulary words
        </p>
      </div>
      <AnimeVocabCarouselWrapper
        words={words}
        animeMeta={animeMeta}
        animeSlug={slug}
        locale={locale}
        userId={userId}
      />
    </main>
  );
}
