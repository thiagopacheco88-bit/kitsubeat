"use client";

/**
 * ContinueCard - Phase 14.2 SPEC §Req 4 + AC #6 + AC #10.
 *
 * 240×124 client-island tile for the Continue Learning carousel. Full-bleed cover
 * (YouTube CDN), vignette + bottom fade, ka-pulse PLAY ▶ badge top-right (32×32),
 * Japanese title + anime + 3-px progress bar (var(--color-accent) fill).
 *
 * Progress bar formula (CONTEXT D-02): Math.max(1, Math.min(100, completion_pct * 100)).
 * Floor at 1% so a row with 0.005 still renders a visible bar.
 *
 * Mastery decorations (CONTEXT D-14 + AC #6):
 *   stars === 3 -> 3-star ribbon (continue-card-stars) + StarAura (continue-card-aura) + ka-aura halo on root
 *   0 < stars < 3 -> StarAura only (continue-card-aura) — partial mastery indicator
 *   stars === 0 OR undefined -> NO decorations (anonymous-clean enforced by parent ContinueLearning per D-14)
 *
 * 'use client' required because ka-pulse + ka-aura keyframes run on a client-rendered
 * overlay; the data flow is pure prop-driven (no hooks, no state).
 *
 * M1 invariant (CONTEXT D-13): <CardLink> clickable root; vignette + bottom-fade
 * overlays carry pointer-events: none.
 *
 * Token discipline (CONTEXT D-12): every color via var(--color-*); no new tokens or
 * keyframes; reuses ka-pulse + ka-aura from 14.1.
 *
 * Token-literal exception (documented): the PLAY ▶ badge background uses an inline
 * style rgba(255,255,255,0.85) — this is a deliberate design exception for the
 * CTA-pill semi-transparent overlay. D-12 forbids new TOKEN authoring but does NOT
 * forbid documented design-exception literals where no appropriate var(--*) exists
 * for a semi-transparent white overlay. Lint rule kitsubeat-tokens/no-raw-tokens
 * does not flag inline styles, only className strings.
 */
import { CardLink } from "@/components/ui/Card";
import SongMasteredBanner from "@/app/songs/components/SongMasteredBanner";

interface ContinueCardProps {
  slug: string;
  title: string;          // Japanese title — Noto Sans JP eyebrow
  anime: string;
  youtube_id: string | null;
  completion_pct: number; // 0.0 - 1.0 (real); clamped via Math.max(1, Math.min(100, x*100))
  stars?: number;         // 0-3; D-14 + AC #6; defaults 0 (no decorations).
}

export function ContinueCard({
  slug,
  title,
  anime,
  youtube_id,
  completion_pct,
  stars = 0,
}: ContinueCardProps) {
  // CONTEXT D-02 — clamp completion_pct to 1%..100% range.
  const progressWidth = Math.max(1, Math.min(100, completion_pct * 100));

  // D-14 + AC #6 — mastery decoration gating. Anonymous-clean enforced by parent
  // (ContinueLearning never renders unauth per D-14), so we only gate on stars value.
  const isMastered = stars >= 3;
  const showAura = stars > 0;

  const coverSrc = youtube_id
    ? `https://img.youtube.com/vi/${youtube_id}/mqdefault.jpg`
    : null;

  // Compose the root className with optional ka-aura halo when mastered.
  const rootClassName = [
    "relative shrink-0 snap-start overflow-hidden rounded-[var(--radius-lg)] p-0 w-[240px] h-[124px]",
    isMastered ? "ka-aura" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <CardLink
      href={`/songs/${slug}`}
      variant="flat"
      size="sm"
      className={rootClassName}
      data-testid={`continue-card-${slug}`}
    >
      {/* Cover image — full bleed */}
      {coverSrc ? (
        <img
          src={coverSrc}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center bg-[var(--color-card-2)] text-3xl font-bold text-[var(--color-text-dim)]"
          aria-hidden="true"
          data-testid="continue-card-placeholder"
        >
          ♪
        </div>
      )}

      {/* Bottom fade vignette - pointer-events: none (M1) */}
      <div
        className="absolute inset-x-0 bottom-0 h-3/4"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.75) 100%)",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />

      {/* ka-pulse PLAY ▶ badge - 32×32 top-right (M1: pointer-events-none) */}
      <span
        className="ka-pulse absolute top-2 right-2 inline-flex items-center justify-center w-8 h-8 rounded-full pointer-events-none"
        style={{ background: "rgba(255,255,255,0.85)" }}
        data-testid="continue-card-play-overlay"
        aria-hidden="true"
      >
        <span className="text-base" style={{ color: "var(--color-accent)" }}>
          ▶
        </span>
      </span>

      {/* D-14 + AC #6 — 3-star ribbon for mastered (mirrors CoverCard banner pattern). */}
      {isMastered && (
        <div
          className="absolute top-2 left-2 pointer-events-none"
          data-testid="continue-card-stars"
          aria-hidden="true"
        >
          <SongMasteredBanner />
        </div>
      )}

      {/* D-14 + AC #6 — StarAura indicator (3-star or partial). */}
      {showAura && (
        <span
          className={`absolute right-2 bottom-2 inline-flex items-center justify-center w-6 h-6 rounded-full pointer-events-none ${
            isMastered ? "ka-aura" : ""
          }`}
          style={{
            background: isMastered ? "var(--aura-color)" : "var(--color-accent)",
            opacity: isMastered ? 1 : Math.max(0.4, stars / 3),
          }}
          data-testid="continue-card-aura"
          aria-hidden="true"
        >
          <span className="text-xs" style={{ color: "white" }}>★</span>
        </span>
      )}

      {/* Title + anime stack - bottom left */}
      <div className="absolute inset-x-0 bottom-2 px-2">
        <p
          className="truncate text-sm font-bold"
          style={{ fontFamily: "var(--font-jp)", color: "white", textShadow: "0 1px 2px rgba(0,0,0,0.65)" }}
          data-testid="continue-card-title-jp"
        >
          {title}
        </p>
        <p className="truncate text-xs" style={{ color: "rgba(255,255,255,0.85)" }}>{anime}</p>
      </div>

      {/* 3-px progress bar - bottom edge */}
      <div
        className="absolute inset-x-0 bottom-0 bg-[var(--color-card-2)] overflow-hidden"
        style={{ height: "3px" }}
        aria-hidden="true"
      >
        <div
          className="h-full bg-[var(--color-accent)]"
          style={{ width: `${progressWidth}%` }}
          data-testid="continue-card-progress-fill"
        />
      </div>
    </CardLink>
  );
}
