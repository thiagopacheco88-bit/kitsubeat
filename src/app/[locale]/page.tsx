/**
 * /[locale]/  — Locale-aware home page for PT-BR and ES routes.
 *
 * English stays at the root / (no prefix, localePrefix: 'as-needed').
 * /pt-BR and /es resolve here via the [locale] segment.
 *
 * This page mirrors src/app/page.tsx exactly but with:
 *   1. setRequestLocale(locale) — MUST be first for static rendering
 *   2. Locale-aware lang attribute (set by [locale]/layout.tsx)
 *
 * BLAST RADIUS: new file only — src/app/page.tsx (EN canonical) UNCHANGED.
 */
import { Suspense } from "react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  getHeroSong,
  getFeaturedSongs,
  getTopAnimeFranchises,
  getAnimeCatalog,
  getNowPlayingCounts,
  getRecentMasteryEvents,
  getTickerFirstName,
} from "@/lib/db/queries";
import { getCurrentUserId, PLACEHOLDER_USER_ID } from "@/lib/user-prefs";
import { HeroFeatured } from "@/app/components/home/HeroFeatured";
import { ContinueLearning } from "@/app/components/home/ContinueLearning";
import { Foundations } from "@/app/components/home/Foundations";
import { SectionHeader } from "@/app/components/home/SectionHeader";
import { Carousel } from "@/app/components/home/Carousel";
import { CoverCard } from "@/app/components/home/CoverCard";
import { AnimeCard } from "@/app/components/home/AnimeCard";
import { RecentlyMasteredTicker, type MasteryEvent } from "@/app/components/home/RecentlyMasteredTicker";
import { StreakSaverToast } from "@/app/components/home/StreakSaverToast";
import { CarouselSkeleton } from "@/app/components/home/CarouselSkeleton";
import {
  BeginnerCarousel,
  IntermediateCarousel,
  AdvancedCarousel,
  ClassicsCarousel,
  ModernCarousel,
} from "@/app/components/home/SongCarousels";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // MUST be first — enables static rendering for locale segment
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'common' });

  const userId = await getCurrentUserId();
  const isSignedIn = userId !== PLACEHOLDER_USER_ID;

  const [hero, topFranchises, animeCatalog, featured, nowPlayingCounts, masteryEventsRaw] = await Promise.all([
    getHeroSong(isSignedIn ? userId : null),
    getTopAnimeFranchises(20),
    getAnimeCatalog(),
    getFeaturedSongs(12),
    getNowPlayingCounts(),
    getRecentMasteryEvents(10),
  ]);

  const masteryEvents: MasteryEvent[] = await Promise.all(
    masteryEventsRaw.map(async (ev) => ({
      ...ev,
      firstName: await getTickerFirstName(ev.user_id),
    }))
  );

  const userRow = isSignedIn
    ? await db
        .select({
          streakSaverPending: users.streak_saver_pending,
          streakCurrent: users.streakCurrent,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
        .then((r) => r[0] ?? null)
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      {/* Section 1 — HeroFeatured (always) */}
      <HeroFeatured hero={hero} />

      {/* Section 2 — Continue Learning (auth-only) */}
      {isSignedIn && (
        <FadeInSection>
          <ContinueLearning userId={userId} title={t('home.continueLearning')} viewAllLabel={t('home.openPath')} />
        </FadeInSection>
      )}

      {/* Section 2.5 — Recently Mastered ticker */}
      <FadeInSection>
        <RecentlyMasteredTicker events={masteryEvents} />
      </FadeInSection>

      {/* Section 3 — Foundations */}
      <FadeInSection>
        <Foundations title={t('home.foundations')} viewAllLabel={t('home.openKana')} />
      </FadeInSection>

      {/* Section 4 — Anime Vocabulary */}
      <FadeInSection as="section" data-testid="anime-vocabulary" className="pb-8">
        <SectionHeader
          titleJp="語彙"
          title={t('home.animeVocabulary')}
          viewAll="/anime"
          viewAllLabel={t('home.browseVocab')}
        />
        <Carousel testId="anime-vocabulary-carousel" ariaLabel="Anime vocabulary">
          {animeCatalog.map((entry) => (
            <AnimeCard
              key={entry.anime_slug}
              anime={entry.title_english ?? entry.anime_slug}
              songCount={0}
              subtitle={`${entry.word_count} words`}
              coverImage={entry.cover_image}
              href={`/anime/${entry.anime_slug}`}
              imageFit={entry.anime_slug === "anime-core" ? "contain" : "cover"}
            />
          ))}
        </Carousel>
      </FadeInSection>

      {/* Section 5 — Anime Songs */}
      <FadeInSection as="section" data-testid="browse-by-anime" className="pb-8">
        <SectionHeader
          titleJp="アニメ"
          title={t('home.animeSongs')}
          viewAll="/songs"
          viewAllLabel={t('home.browseSongs')}
        />
        <Carousel testId="browse-by-anime-carousel" ariaLabel="Browse anime songs">
          {topFranchises.map((franchise) => (
            <AnimeCard
              key={franchise.anime}
              anime={franchise.anime}
              nameJp={franchise.anime}
              songCount={franchise.count}
              coverImage={franchise.cover_image}
              bannerImage={franchise.banner_image}
            />
          ))}
        </Carousel>
      </FadeInSection>

      {/* Streak-saver toast */}
      {isSignedIn && userRow?.streakSaverPending && (
        <StreakSaverToast
          userId={userId}
          streakSavedTo={userRow.streakCurrent ?? 0}
          isPending={true}
        />
      )}

      {/* Section 6 — Featured Songs */}
      <FadeInSection as="section" data-testid="featured-songs" className="pb-8">
        <SectionHeader
          titleJp="特集"
          title={t('home.featuredSongs')}
          viewAll="/songs"
          viewAllLabel={t('home.browseSongs')}
        />
        <Carousel testId="featured-songs-carousel" ariaLabel="Featured songs">
          {featured.map((song) => (
            <CoverCard
              key={song.slug}
              song={{
                slug: song.slug,
                title: song.title,
                artist: song.artist,
                anime: song.anime,
                youtube_id: song.youtube_id,
                jlpt_level: song.jlpt_level,
              }}
              stars={0}
              showMastery={isSignedIn}
              nowPlayingCount={nowPlayingCounts[song.id]}
            />
          ))}
        </Carousel>
      </FadeInSection>

      {/* Below-fold carousels — streamed independently via Suspense */}
      <FadeInSection>
        <Suspense fallback={<CarouselSkeleton />}>
          <BeginnerCarousel showMastery={isSignedIn} title={t('home.beginner')} />
        </Suspense>
      </FadeInSection>

      <FadeInSection>
        <Suspense fallback={<CarouselSkeleton />}>
          <IntermediateCarousel showMastery={isSignedIn} title={t('home.intermediate')} />
        </Suspense>
      </FadeInSection>

      <FadeInSection>
        <Suspense fallback={<CarouselSkeleton />}>
          <AdvancedCarousel showMastery={isSignedIn} title={t('home.advanced')} />
        </Suspense>
      </FadeInSection>

      <FadeInSection>
        <Suspense fallback={<CarouselSkeleton />}>
          <ClassicsCarousel showMastery={isSignedIn} title={t('home.classics')} />
        </Suspense>
      </FadeInSection>

      <FadeInSection>
        <Suspense fallback={<CarouselSkeleton />}>
          <ModernCarousel showMastery={isSignedIn} title={t('home.modern')} />
        </Suspense>
      </FadeInSection>
    </div>
  );
}
