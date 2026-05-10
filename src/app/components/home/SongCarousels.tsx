/**
 * SongCarousels — Five lazily-streamed home page carousels.
 *
 * Each export is an async Server Component that fetches its own data so they
 * can each be wrapped in <Suspense> on the home page and stream independently.
 * The shared CoverCard + Carousel pattern is identical to Featured Songs.
 */

import { getSongsBySkillLevel, getClassicSongs, getModernSongs } from "@/lib/db/queries";
import { SectionHeader } from "./SectionHeader";
import { Carousel } from "./Carousel";
import { CoverCard } from "./CoverCard";

interface CarouselProps {
  showMastery: boolean;
}

type SongRow = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  anime: string;
  youtube_id: string | null;
  jlpt_level: string | null;
};

function SongCarouselShell({
  titleJp,
  title,
  songs,
  showMastery,
  testId,
}: {
  titleJp: string;
  title: string;
  songs: SongRow[];
  showMastery: boolean;
  testId: string;
}) {
  if (songs.length === 0) return null;
  return (
    <section data-testid={testId} className="pb-8">
      <SectionHeader titleJp={titleJp} title={title} />
      <Carousel testId={`${testId}-carousel`} ariaLabel={title}>
        {songs.map((song) => (
          <CoverCard
            key={song.slug}
            song={song}
            stars={0}
            showMastery={showMastery}
          />
        ))}
      </Carousel>
    </section>
  );
}

export async function BeginnerCarousel({ showMastery }: CarouselProps) {
  const songs = await getSongsBySkillLevel("beginner");
  return (
    <SongCarouselShell
      titleJp="初心者"
      title="Beginner"
      songs={songs}
      showMastery={showMastery}
      testId="beginner-songs"
    />
  );
}

export async function IntermediateCarousel({ showMastery }: CarouselProps) {
  const songs = await getSongsBySkillLevel("intermediate");
  return (
    <SongCarouselShell
      titleJp="中級者"
      title="Intermediate"
      songs={songs}
      showMastery={showMastery}
      testId="intermediate-songs"
    />
  );
}

export async function AdvancedCarousel({ showMastery }: CarouselProps) {
  const songs = await getSongsBySkillLevel("advanced");
  return (
    <SongCarouselShell
      titleJp="上級者"
      title="Advanced"
      songs={songs}
      showMastery={showMastery}
      testId="advanced-songs"
    />
  );
}

export async function ClassicsCarousel({ showMastery }: CarouselProps) {
  const songs = await getClassicSongs();
  return (
    <SongCarouselShell
      titleJp="クラシック"
      title="Classics"
      songs={songs}
      showMastery={showMastery}
      testId="classic-songs"
    />
  );
}

export async function ModernCarousel({ showMastery }: CarouselProps) {
  const songs = await getModernSongs();
  return (
    <SongCarouselShell
      titleJp="最新"
      title="Modern"
      songs={songs}
      showMastery={showMastery}
      testId="modern-songs"
    />
  );
}
