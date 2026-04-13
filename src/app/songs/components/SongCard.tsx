import Link from "next/link";
import type { SongListItem } from "@/lib/db/queries";
import { JLPT_COLOR_CLASS } from "@/lib/types/lesson";

function formatSeasonInfo(info: string | null): string | null {
  if (!info) return null;
  // Extract just "OP 1" or "ED 3" from "Naruto Shippuden OP 1"
  const match = info.match(/(OP|ED)\s*(\d+)/i);
  if (match) return `${match[1].toUpperCase()} ${match[2]}`;
  return null;
}

export default function SongCard({ song }: { song: SongListItem }) {
  const thumbnailId = song.youtube_id_short ?? song.youtube_id;
  const thumbnail = thumbnailId
    ? `https://img.youtube.com/vi/${thumbnailId}/mqdefault.jpg`
    : null;
  const opEd = formatSeasonInfo(song.season_info);

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
        </div>
      )}
      <div className="p-4">
        <h3 className="truncate text-sm font-semibold text-white">
          {song.title}
        </h3>
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
