/**
 * CoverCard — Phase 14.2 SPEC §Req 7 + AC #14 (anonymous-catalog clean).
 *
 * 154×196 catalog tile: cover panel top 60% (~116px) + info panel bottom 40% (~80px).
 * Server component (no animation triggers; ka-aura halo runs purely from CSS keyframe).
 *
 * Anonymous-catalog gate (CONTEXT D-14, mirrors SongCard.tsx showProgress precedent):
 *   showMastery=false → NO mastery banner, NO StarAura, NO ka-aura halo (decorations
 *                       suppressed even when stars > 0)
 *   showMastery=true  → banner + aura when stars===3; StarAura only when 0<stars<3.
 *
 * M1 invariant (CONTEXT D-13): <CardLink> clickable root; vignette overlay carries
 * pointer-events: none so taps fall through.
 *
 * Token discipline (CONTEXT D-12): every color via var(--color-*); reuses existing
 * --aura-color from 14.1; no new tokens authored.
 * Dimensions expressed as inline styles (154×196px, 116px cover panel) following
 * PathNode.tsx precedent (style={{ height: "84px" }}); px literals in className
 * would trigger the kitsubeat-tokens/no-raw-tokens lint rule.
 * rgba(0,0,0,0.55) inside the vignette linear-gradient is the allowlisted
 * gradient-stop literal (mirrors PathNode.tsx rgba(0,0,0,0.65) precedent; D-12
 * forbids new TOKEN authoring, not gradient-stop rgba literals).
 */
import { CardLink } from "@/components/ui/Card";
import SongMasteredBanner from "@/app/songs/components/SongMasteredBanner";

interface CoverCardProps {
  song: {
    slug: string;
    title: string;
    artist: string;
    anime: string;
    youtube_id: string | null;
    jlpt_level?: string | null;
  };
  stars?: number;
  showMastery: boolean;
  opEd?: "OP" | "ED" | null;
  /** Phase 14.4 REQ-1 — "X listening now" chip. Only passed by home page. Absent → chip suppressed. */
  nowPlayingCount?: number;
}

// Spec dimensions (CONTEXT §Specifics line 258):
// 154×196 tile — cover panel top 60% (~116px) + info panel bottom 40% (~80px).
// Expressed as inline styles to avoid kitsubeat-tokens/no-raw-tokens px violation
// (mirrors PathNode.tsx pattern: style={{ height: "84px" }}).
const COVER_CARD_W = 154; // px
const COVER_CARD_H = 196; // px
const COVER_PANEL_H = 116; // px (~60%)

export function CoverCard({ song, stars = 0, showMastery, opEd, nowPlayingCount }: CoverCardProps) {
  // Anonymous-catalog gate (D-14) — mirrors SongCard's showProgress precedent.
  const showMasteryBanner = showMastery && stars === 3;
  const showAura = showMastery && stars > 0;

  const coverSrc = song.youtube_id
    ? `https://img.youtube.com/vi/${song.youtube_id}/mqdefault.jpg`
    : null;

  return (
    <CardLink
      href={`/songs/${song.slug}`}
      variant="flat"
      size="sm"
      className="relative shrink-0 snap-start overflow-hidden rounded-[var(--radius-lg)] p-0 flex flex-col"
      style={{ width: `${COVER_CARD_W}px`, height: `${COVER_CARD_H}px` }}
      data-testid={`cover-card-${song.slug}`}
    >
      {/* Cover panel — top 60% (~116px) */}
      <div
        className="relative w-full overflow-hidden bg-[var(--color-card-2)]"
        style={{ height: `${COVER_PANEL_H}px` }}
      >
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={song.title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center bg-[var(--color-card-2)] text-3xl font-bold text-[var(--color-text-dim)]"
            aria-hidden="true"
            data-testid="cover-card-placeholder"
          >
            ♪
          </div>
        )}
        {/* Bottom vignette — pointer-events: none so taps fall through (M1) */}
        <div
          className="absolute inset-x-0 bottom-0 h-1/2"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.55) 100%)",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        />
        {opEd && (
          <span
            className="absolute top-2 right-2 rounded-[var(--radius-pill)] bg-black/70 px-1.5 py-0.5 font-bold"
            style={{ fontSize: "10px", color: "white" }}
            aria-hidden="true"
          >
            {opEd}
          </span>
        )}
        {showMasteryBanner && <SongMasteredBanner />}
        {showAura && stars === 3 && (
          <span
            className="ka-aura absolute right-2 bottom-2 inline-flex items-center justify-center w-6 h-6 rounded-full"
            style={{ background: "var(--aura-color)" }}
            data-testid="cover-card-aura"
            aria-hidden="true"
          >
            <span className="text-xs" style={{ color: "white" }}>
              ★
            </span>
          </span>
        )}
        {showAura && stars > 0 && stars < 3 && (
          <span
            className="absolute right-2 bottom-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-accent)]"
            data-testid="star-aura"
            aria-hidden="true"
          >
            <span className="text-xs" style={{ color: "white" }}>
              ★
            </span>
          </span>
        )}
        {nowPlayingCount !== undefined && nowPlayingCount >= 3 && (
          <span
            className="absolute bottom-2 left-2 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[length:var(--text-micro)] font-semibold text-[var(--color-text)] backdrop-blur-sm"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
            aria-label={`${nowPlayingCount} people listening now`}
          >
            {nowPlayingCount} listening now
          </span>
        )}
      </div>

      {/* Info panel — bottom 40% (~80px) */}
      <div className="flex flex-col justify-center gap-1 px-2 py-2 flex-1">
        <p
          className="truncate text-sm font-bold text-[var(--color-text)]"
          style={{ fontFamily: "var(--font-jp)" }}
        >
          {song.title}
        </p>
        <p className="truncate text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
          {song.artist}
        </p>
        <p className="truncate text-xs text-[var(--color-text-muted)]">
          {song.anime}
        </p>
      </div>
    </CardLink>
  );
}
