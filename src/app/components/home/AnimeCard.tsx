/**
 * AnimeCard — Phase 14.2 SPEC §Req 6/7.
 *
 * 130×130 franchise tile: cover-only with bottom vignette + Japanese name eyebrow.
 * Replaces the inline <MediaCard> currently in src/app/page.tsx (deleted by Plan 14.2-10).
 *
 * Server component. Link target is /songs?search={anime} per SPEC §Req 6 (a real
 * /anime/[franchise] route is a future phase).
 *
 * Token discipline (CONTEXT D-12): every color via var(--color-*); no new tokens.
 * Dimensions expressed as inline styles following PathNode.tsx precedent
 * (style={{ height: "84px" }}); px literals in className would trigger
 * kitsubeat-tokens/no-raw-tokens lint rule.
 * rgba(0,0,0,0.75) inside the vignette linear-gradient is the allowlisted
 * gradient-stop literal (mirrors CoverCard/PathNode patterns; D-12 forbids new
 * TOKEN authoring, not gradient-stop rgba literals).
 *
 * M1 invariant (CONTEXT D-13): <CardLink> clickable root; vignette overlay carries
 * pointer-events: none so taps fall through.
 *
 * URL injection mitigation (T-14.2-06-02): encodeURIComponent(anime) applied
 * at href construction. Test 3 asserts Re:Zero → Re%3AZero.
 */
import { CardLink } from "@/components/ui/Card";

interface AnimeCardProps {
  anime: string;
  nameJp?: string;
  songCount: number;
  coverImage?: string | null;
  bannerImage?: string | null;
  /** Override the default /songs?search=… href */
  href?: string;
  /** Override the default "{songCount} songs" subtitle */
  subtitle?: string;
  /** How the cover image fills the card — "cover" (default) or "contain" for logos */
  imageFit?: "cover" | "contain";
}

// Spec dimensions (CONTEXT §Specifics line 259): 130×130 cover-only tile.
// Expressed as inline styles to avoid kitsubeat-tokens/no-raw-tokens px violation.
const ANIME_CARD_SIZE = 130; // px (square)

export function AnimeCard({
  anime,
  nameJp,
  songCount,
  coverImage,
  bannerImage,
  href: hrefProp,
  subtitle,
  imageFit = "cover",
}: AnimeCardProps) {
  const href = hrefProp ?? `/songs?search=${encodeURIComponent(anime)}`;
  const imageSrc = coverImage ?? bannerImage ?? null;
  const displayName = nameJp ?? anime;

  return (
    <CardLink
      href={href}
      variant="flat"
      size="sm"
      className="relative shrink-0 snap-start overflow-hidden rounded-[var(--radius-lg)] p-0 transition-transform duration-200 hover:-translate-y-1 hover:scale-[1.03]"
      style={{ width: `${ANIME_CARD_SIZE}px`, height: `${ANIME_CARD_SIZE}px` }}
      data-testid={`anime-card-${anime}`}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={anime}
          className={`absolute inset-0 w-full h-full ${imageFit === "contain" ? "object-contain p-4" : "object-cover"}`}
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center bg-[var(--color-card-2)] text-3xl font-bold text-[var(--color-text-dim)]"
          aria-hidden="true"
          data-testid="anime-card-placeholder"
        >
          ♪
        </div>
      )}
      {/* Vignette — pointer-events: none so taps fall through (M1) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, transparent 35%, rgba(0,0,0,0.75) 100%)",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />
      {/* Bottom label stack */}
      <div className="absolute inset-x-0 bottom-0 px-2 py-2">
        <p
          className="truncate text-xs font-bold"
          style={{ fontFamily: "var(--font-jp)", color: "white" }}
        >
          {displayName}
        </p>
        <p
          className="truncate text-[var(--color-text-dim)]"
          style={{ fontSize: "10px" }}
          data-testid="anime-card-song-count"
        >
          {subtitle ?? `${songCount} songs`}
        </p>
      </div>
    </CardLink>
  );
}
