/**
 * /  —  Phase 14.2 home redesign + lazy carousel streaming.
 *
 * Above-fold sections (Hero, Continue Learning, Ticker, Foundations, Browse by
 * Anime, Featured Songs) are fetched eagerly in Promise.all so the page feels
 * instant. Below-fold skill + era carousels are each independent async Server
 * Components wrapped in <Suspense>, so they stream in one by one without
 * blocking the visible content.
 *
 * SPEC §Req 6 + AC #13 — stable data-testid selectors preserved.
 * CONTEXT D-14 — CoverCard receives showMastery={isSignedIn}.
 */
import { Suspense } from "react";
import {
  getHeroSong,
  getFeaturedSongs,
  getTopAnimeFranchises,
  getNowPlayingCounts,
  getRecentMasteryEvents,
  getTickerFirstName,
} from "@/lib/db/queries";
import { getCurrentUserId, PLACEHOLDER_USER_ID } from "@/lib/user-prefs";
import { HeroFeatured } from "./components/home/HeroFeatured";
import { ContinueLearning } from "./components/home/ContinueLearning";
import { Foundations } from "./components/home/Foundations";
import { SectionHeader } from "./components/home/SectionHeader";
import { Carousel } from "./components/home/Carousel";
import { CoverCard } from "./components/home/CoverCard";
import { AnimeCard } from "./components/home/AnimeCard";
import { RecentlyMasteredTicker, type MasteryEvent } from "./components/home/RecentlyMasteredTicker";
import { StreakSaverToast } from "./components/home/StreakSaverToast";
import { CarouselSkeleton } from "./components/home/CarouselSkeleton";
import {
  BeginnerCarousel,
  IntermediateCarousel,
  AdvancedCarousel,
  ClassicsCarousel,
  ModernCarousel,
} from "./components/home/SongCarousels";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const userId = await getCurrentUserId();
  const isSignedIn = userId !== PLACEHOLDER_USER_ID;

  const [hero, topFranchises, featured, nowPlayingCounts, masteryEventsRaw] = await Promise.all([
    getHeroSong(isSignedIn ? userId : null),
    getTopAnimeFranchises(20),
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
        <div className="fade-in-section">
          <ContinueLearning userId={userId} />
        </div>
      )}

      {/* Section 2.5 — Recently Mastered ticker */}
      <div className="fade-in-section">
        <RecentlyMasteredTicker events={masteryEvents} />
      </div>

      {/* Section 3 — Foundations */}
      <div className="fade-in-section">
        <Foundations />
      </div>

      {/* Section 4 — Browse by Anime */}
      <div className="fade-in-section">
        <section data-testid="browse-by-anime" className="pb-8">
          <SectionHeader
            titleJp="アニメ"
            title="Browse by Anime"
            viewAll="/anime-list"
            viewAllLabel="Browse Anime"
          />
          <Carousel testId="browse-by-anime-carousel" ariaLabel="Browse by anime">
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
        </section>
      </div>

      {/* Streak-saver toast */}
      {isSignedIn && userRow?.streakSaverPending && (
        <StreakSaverToast
          userId={userId}
          streakSavedTo={userRow.streakCurrent ?? 0}
          isPending={true}
        />
      )}

      {/* Section 5 — Featured Songs */}
      <div className="fade-in-section">
        <section data-testid="featured-songs" className="pb-8">
          <SectionHeader
            titleJp="特集"
            title="Featured Songs"
            viewAll="/songs"
            viewAllLabel="Browse Songs"
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
        </section>
      </div>

      {/* ── Below-fold carousels — streamed independently via Suspense ── */}

      <div className="fade-in-section">
        <Suspense fallback={<CarouselSkeleton />}>
          <BeginnerCarousel showMastery={isSignedIn} />
        </Suspense>
      </div>

      <div className="fade-in-section">
        <Suspense fallback={<CarouselSkeleton />}>
          <IntermediateCarousel showMastery={isSignedIn} />
        </Suspense>
      </div>

      <div className="fade-in-section">
        <Suspense fallback={<CarouselSkeleton />}>
          <AdvancedCarousel showMastery={isSignedIn} />
        </Suspense>
      </div>

      <div className="fade-in-section">
        <Suspense fallback={<CarouselSkeleton />}>
          <ClassicsCarousel showMastery={isSignedIn} />
        </Suspense>
      </div>

      <div className="fade-in-section">
        <Suspense fallback={<CarouselSkeleton />}>
          <ModernCarousel showMastery={isSignedIn} />
        </Suspense>
      </div>
    </div>
  );
}
