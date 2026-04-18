import Link from "next/link";
import type { SongListItem } from "@/lib/db/queries";
import { deriveStars, deriveBonusBadge } from "@/lib/db/schema";
import { JLPT_COLOR_CLASS } from "@/lib/types/lesson";
import CircularProgress from "@/app/songs/[slug]/components/CircularProgress";
import StarDisplay from "@/app/songs/[slug]/components/StarDisplay";
import SongMasteredBanner from "./SongMasteredBanner";
import BonusBadgeIcon from "./BonusBadgeIcon";

function formatSeasonInfo(info: string | null): string | null {
  if (!info) return null;
  // Extract just "OP 1" or "ED 3" from "Naruto Shippuden OP 1"
  const match = info.match(/(OP|ED)\s*(\d+)/i);
  if (match) return `${match[1].toUpperCase()} ${match[2]}`;
  return null;
}

interface SongCardProps {
  song: SongListItem;
}

/**
 * SongCard — single catalog tile for a song.
 *
 * Phase 10 Plan 07 — derivations happen at render time from the accuracy
 * fields threaded through SongListItem (Task 2):
 *   - `stars` = deriveStars({ ex1_2_3, ex4, ex6 })   [0 | 1 | 2 | 3]
 *   - `bonus` = deriveBonusBadge({ ex5, ex7 })       [boolean]
 *
 * For unauthenticated callers (getAllSongs called without userId) all five
 * accuracy fields are null → stars = 0, bonus = false → no ribbon, no badge.
 * This is the CONTEXT-locked "don't show mastery decorations to signed-out
 * users" contract.
 */
export default function SongCard({ song }: SongCardProps) {
  const thumbnailId = song.youtube_id;
  const thumbnail = thumbnailId
    ? `https://img.youtube.com/vi/${thumbnailId}/mqdefault.jpg`
    : null;
  const opEd = formatSeasonInfo(song.season_info);

  // Phase 10 Plan 07 — render-time derivation from the five accuracy fields
  // joined by getAllSongs. Nullable fields default to 0 inside derive helpers.
  const stars = deriveStars({
    ex1_2_3_best_accuracy: song.ex1_2_3_best_accuracy,
    ex4_best_accuracy: song.ex4_best_accuracy,
    ex6_best_accuracy: song.ex6_best_accuracy,
  });
  const bonus = deriveBonusBadge({
    ex5_best_accuracy: song.ex5_best_accuracy,
    ex7_best_accuracy: song.ex7_best_accuracy,
  });
  const completionPct = (song.completion_pct ?? 0) as number;

  // Show progress only if the user has started (pct > 0 or stars > 0).
  const showProgress = completionPct > 0 || stars > 0;
  // Mastery decorations gate — never surface them when the user hasn't
  // started. stars === 3 implies ex1_2_3 / ex4 / ex6 all >= 0.8 (showProgress
  // is implied) but the explicit guard documents the CONTEXT-locked rule.
  const showMasteryBanner = showProgress && stars === 3;
  const showBonusBadge = showProgress && bonus;

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
          {/* Phase 10 Plan 07 — "Mastered" ribbon for 3-star songs. Sits in
              the top-right of the thumbnail; rendered BEFORE the OP-ED pill
              so its diagonal ribbon has visual priority for returning users
              scanning the catalog. */}
          {showMasteryBanner && <SongMasteredBanner />}
          {opEd && (
            <span className="absolute top-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
              {opEd}
            </span>
          )}
          {/* Circular progress ring — bottom-right overlay */}
          {showProgress && (
            <div className="absolute bottom-2 right-2">
              <CircularProgress pct={completionPct} size={40} />
            </div>
          )}
        </div>
      )}
      <div className="p-4">
        <h3 className="truncate text-sm font-semibold text-white">
          {song.title}
        </h3>
        {/* Stars below title — hidden when 0 stars and 0% progress.
            Phase 10 Plan 07 — BonusBadgeIcon sits inline trailing the stars
            so the bonus is visually adjacent to the primary mastery signal
            but stays secondary (smaller, muted color). */}
        {showProgress && (
          <div className="mt-1 flex items-center gap-1.5">
            <StarDisplay stars={stars} animate={false} />
            {showBonusBadge && <BonusBadgeIcon />}
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
