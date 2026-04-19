import Link from "next/link";
import Image from "next/image";
import {
  getFeaturedSongs,
  getTopAnimeFranchises,
  getBeginnerSongs,
  getRecentSongs,
  getTopArtists,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, topFranchises, beginner, recent, topArtists] =
    await Promise.all([
      getFeaturedSongs(12),
      getTopAnimeFranchises(20),
      getBeginnerSongs(12),
      getRecentSongs(12),
      getTopArtists(12),
    ]);

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* Hero */}
      <section className="py-20">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Learn Japanese through{" "}
            <span className="text-red-500">anime songs</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-gray-400">
            Understand every word in your favorite anime openings and endings
            with color-coded grammar, furigana, translations, and vocabulary
            breakdowns.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/anime-list"
              className="inline-block rounded-lg border border-gray-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Browse by Anime
            </Link>
            <Link
              href="/songs"
              className="inline-block rounded-lg border border-gray-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              All Songs
            </Link>
          </div>
          <p className="mt-5 text-sm text-gray-500">
            New to Japanese?{" "}
            <Link
              href="/kana"
              className="font-medium text-gray-300 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              Learn Hiragana &amp; Katakana &rarr;
            </Link>
          </p>
        </div>
      </section>

      {/* Running fox divider */}
      <div className="pointer-events-none flex justify-center py-4">
        <Image
          src="/logo-horizontal.png"
          alt=""
          width={480}
          height={240}
          className="w-[480px] h-auto"
          unoptimized
          aria-hidden
        />
      </div>

      {topFranchises.length > 0 && (
        <Carousel title="Browse by Anime" viewAllHref="/anime-list">
          {topFranchises.map((anime) => (
            <MediaCard
              key={anime.anime}
              href={`/songs?search=${encodeURIComponent(anime.anime)}`}
              title={anime.anime}
              subtitle={`${anime.count} song${anime.count !== 1 ? "s" : ""}`}
              youtubeId={anime.youtube_id}
              bannerImage={anime.banner_image ?? anime.cover_image}
            />
          ))}
        </Carousel>
      )}

      {featured.length > 0 && (
        <Carousel title="Featured Songs" viewAllHref="/songs">
          {featured.map((song) => (
            <MediaCard
              key={song.id}
              href={`/songs/${song.slug}`}
              title={song.title}
              subtitle={song.artist}
              youtubeId={song.youtube_id}
            />
          ))}
        </Carousel>
      )}

      {beginner.length > 0 && (
        <Carousel
          title="Beginner-Friendly (N5/N4)"
          viewAllHref="/songs"
        >
          {beginner.map((song) => (
            <MediaCard
              key={song.id}
              href={`/songs/${song.slug}`}
              title={song.title}
              subtitle={song.artist}
              youtubeId={song.youtube_id}
            />
          ))}
        </Carousel>
      )}

      {recent.length > 0 && (
        <Carousel title="Recently Added" viewAllHref="/songs">
          {recent.map((song) => (
            <MediaCard
              key={song.id}
              href={`/songs/${song.slug}`}
              title={song.title}
              subtitle={song.artist}
              youtubeId={song.youtube_id}
            />
          ))}
        </Carousel>
      )}

      {topArtists.length > 0 && (
        <Carousel title="Top Artists" viewAllHref="/songs">
          {topArtists.map((a) => (
            <MediaCard
              key={a.artist}
              href={`/songs?search=${encodeURIComponent(a.artist)}`}
              title={a.artist}
              subtitle={`${a.count} song${a.count !== 1 ? "s" : ""}`}
              youtubeId={a.youtube_id}
            />
          ))}
        </Carousel>
      )}
    </div>
  );
}

function Carousel({
  title,
  viewAllHref,
  children,
}: {
  title: string;
  viewAllHref: string;
  children: React.ReactNode;
}) {
  return (
    <section className="pb-12">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <Link
          href={viewAllHref}
          className="text-sm text-gray-400 transition-colors hover:text-white"
        >
          View all &rarr;
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin snap-x snap-mandatory">
        {children}
      </div>
    </section>
  );
}

function MediaCard({
  href,
  title,
  subtitle,
  youtubeId,
  bannerImage,
}: {
  href: string;
  title: string;
  subtitle: string;
  youtubeId: string | null;
  bannerImage?: string | null;
}) {
  const imageSrc = bannerImage
    ? bannerImage
    : youtubeId
    ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`
    : null;

  return (
    <Link
      href={href}
      className="group relative shrink-0 snap-start overflow-hidden rounded-lg border border-gray-800 bg-gray-900 transition-colors hover:border-gray-600"
      style={{ width: "220px" }}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-gray-800">
        {imageSrc ? (
          <>
            <img
              src={imageSrc}
              alt={title}
              className="h-full w-full object-cover opacity-60 transition-all group-hover:opacity-80 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent" />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-950 text-3xl font-bold text-gray-700">
            ♪
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h3 className="truncate text-sm font-semibold text-white">{title}</h3>
        <p className="truncate text-xs text-gray-400">{subtitle}</p>
      </div>
    </Link>
  );
}
