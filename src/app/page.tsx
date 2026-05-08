/**
 * /  —  Phase 14.2 home redesign.
 *
 * 5-section CA-hybrid narrative replacing the flat 5-carousel catalog:
 *   1. HeroFeatured (always — auth-aware via getHeroSong)
 *   2. Continue Learning (auth-only — wrapper handles the gate)
 *   3. Foundations (always)
 *   4. Browse by Anime (always)
 *   5. Featured Songs (always)
 *
 * SPEC §Req 6 + AC #13 — exact DOM order with stable data-testid selectors.
 * CONTEXT D-14 — CoverCard receives showMastery={isSignedIn} for anonymous-clean.
 *
 * force-dynamic preserved (CONTEXT line 224) — auth-aware fetch needs fresh
 * per-request render. Beginner / Recent / TopArtists queries dropped from
 * imports per SPEC §Req 6 (no longer consumed on /).
 */
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

  // Resolve first-names for ticker rows (unstable_cache 1h per user, D-09)
  const masteryEvents: MasteryEvent[] = await Promise.all(
    masteryEventsRaw.map(async (ev) => ({
      ...ev,
      firstName: await getTickerFirstName(ev.user_id),
    }))
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      {/* Section 1 — HeroFeatured (always) */}
      <HeroFeatured hero={hero} />

      {/* Section 2 — Continue Learning (auth-only; wrapper returns null when unauth or empty) */}
      {isSignedIn && <ContinueLearning userId={userId} />}

      {/* Section 2.5 — Recently Mastered ticker (opt-in users; renders null when empty) */}
      <RecentlyMasteredTicker events={masteryEvents} />

      {/* Section 3 — Foundations (always) */}
      <Foundations />

      {/* Section 4 — Browse by Anime */}
      <section data-testid="browse-by-anime" className="pb-8">
        <SectionHeader
          titleJp="アニメ"
          title="Browse by Anime"
          viewAll="/anime-list"
          viewAllLabel="Browse Anime"
        />
        <Carousel testId="browse-by-anime-carousel" ariaLabel="Browse by anime">
          {topFranchises.map((franchise) => (
            // Per revision: confirmed mapping count->songCount, English-as-eyebrow for v1.
            // anime_metadata.name_jp does not exist in current schema; defer JOIN to 14.4.
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

      {/* Section 5 — Featured Songs */}
      <section data-testid="featured-songs" className="pb-12">
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
              nowPlayingCount={nowPlayingCounts.get(song.id)}
            />
          ))}
        </Carousel>
      </section>
    </div>
  );
}
