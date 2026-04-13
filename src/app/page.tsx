import Link from "next/link";
import Image from "next/image";
import { getFeaturedSongs, getTopAnime } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, topAnime] = await Promise.all([
    getFeaturedSongs(6),
    getTopAnime(20),
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
              href="/songs"
              className="inline-block rounded-lg border border-gray-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Browse by Anime
            </Link>
            <Link
              href="/songs?view=all"
              className="inline-block rounded-lg border border-gray-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              All Songs
            </Link>
          </div>
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

      {/* Browse by Anime */}
      {topAnime.length > 0 && (
        <section className="pb-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              Browse by Anime
            </h2>
            <Link
              href="/songs"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="relative">
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin snap-x snap-mandatory">
              {topAnime.map((anime) => (
                <Link
                  key={anime.anime}
                  href={`/songs?search=${encodeURIComponent(anime.anime)}`}
                  className="group relative shrink-0 snap-start overflow-hidden rounded-lg border border-gray-800 bg-gray-900 transition-colors hover:border-gray-600"
                  style={{ width: "220px" }}
                >
                  {anime.youtube_id && (
                    <div className="aspect-video w-full overflow-hidden bg-gray-800">
                      <img
                        src={`https://img.youtube.com/vi/${anime.youtube_id}/mqdefault.jpg`}
                        alt={anime.anime}
                        className="h-full w-full object-cover opacity-60 transition-all group-hover:opacity-80 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {anime.anime}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {anime.count} song{anime.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Songs */}
      {featured.length > 0 && (
        <section className="pb-16">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              Featured Songs
            </h2>
            <Link
              href="/songs?view=all"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="relative">
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin snap-x snap-mandatory">
              {featured.map((song) => (
                <Link
                  key={song.id}
                  href={`/songs/${song.slug}`}
                  className="group relative shrink-0 snap-start overflow-hidden rounded-lg border border-gray-800 bg-gray-900 transition-colors hover:border-gray-600"
                  style={{ width: "220px" }}
                >
                  {song.youtube_id && (
                    <div className="aspect-video w-full overflow-hidden bg-gray-800">
                      <img
                        src={`https://img.youtube.com/vi/${song.youtube_id}/mqdefault.jpg`}
                        alt={song.title}
                        className="h-full w-full object-cover opacity-60 transition-all group-hover:opacity-80 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {song.title}
                    </h3>
                    <p className="text-xs text-gray-400 truncate">
                      {song.artist}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
