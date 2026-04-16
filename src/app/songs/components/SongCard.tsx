import Link from "next/link";
import type { SongListItem } from "@/lib/db/queries";
import { JLPT_COLOR_CLASS } from "@/lib/types/lesson";
import CircularProgress from "@/app/songs/[slug]/components/CircularProgress";
import StarDisplay from "@/app/songs/[slug]/components/StarDisplay";

function formatSeasonInfo(info: string | null): string | null {
  if (!info) return null;
  // Extract just "OP 1" or "ED 3" from "Naruto Shippuden OP 1"
  const match = info.match(/(OP|ED)\s*(\d+)/i);
  if (match) return `${match[1].toUpperCase()} ${match[2]}`;
  return null;
}

interface SongCardProps {
  song: SongListItem;
  // TODO: fetch user progress batch when Clerk auth is integrated
  progress?: { completionPct: number; stars: 0 | 1 | 2 } | null;
}

export default function SongCard({ song, progress = null }: SongCardProps) {
  const thumbnailId = song.youtube_id;
  const thumbnail = thumbnailId
    ? `https://img.youtube.com/vi/${thumbnailId}/mqdefault.jpg`
    : null;
  const opEd = formatSeasonInfo(song.season_info);

  // Show progress only if the user has started (pct > 0 or stars > 0)
  const showProgress =
    progress !== null &&
    progress !== undefined &&
    (progress.completionPct > 0 || progress.stars > 0);

  return (
    <Link
      href={`/songs/${song.slug}`}
      className="group block overflow-hidden rounded-lg border border-gray-800 bg-gray-900 transition-colors hover:border-gray-600"
    >
      {thumbnail && (
        <div className="relative aspect-video w-full overflow-hidden bg-gray-800">
          <img
            src={thumbnail}
            alt={song.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
          {opEd && (
            <span className="absolute top-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
              {opEd}
            </span>
          )}
          {/* Circular progress ring — bottom-right overlay */}
          {showProgress && (
            <div className="absolute bottom-2 right-2">
              <CircularProgress pct={progress!.completionPct} size={40} />
            </div>
          )}
        </div>
      )}
      <div className="p-4">
        <h3 className="truncate text-sm font-semibold text-white">
          {song.title}
        </h3>
        {/* Stars below title — hidden when 0 stars and 0% progress */}
        {showProgress && (
          <div className="mt-1">
            <StarDisplay stars={progress!.stars} animate={false} />
          </div>
        )}
        <p className="mt-1 truncate text-xs text-gray-400">{song.artist}</p>
        <p className="mt-0.5 truncate text-xs text-gray-500">{song.anime}</p>
        <div className="mt-3 flex items-center gap-2">
          {song.jlpt_level && (
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${JLPT_COLOR_CLASS[song.jlpt_level] ?? "bg-gray-600"}`}
            >
              {song.jlpt_level}
            </span>
          )}
          {song.difficulty_tier && (
            <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400">
              {song.difficulty_tier}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
