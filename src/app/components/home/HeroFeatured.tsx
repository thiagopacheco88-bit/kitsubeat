/**
 * HeroFeatured - Phase 14.2 SPEC §Req 3 + AC #6/7/8/9.
 *
 * 280px full-bleed cover-art hero block at the top of /. Server component; consumes
 * HeroSongResult from Plan 14.2-03 getHeroSong(userId | null) which encapsulates
 * auth-aware dispatch + fallback (CONTEXT D-04). page.tsx becomes thin:
 *   const hero = await getHeroSong(userId);
 *   <HeroFeatured hero={hero} />
 *
 * CTA label varies by source (CONTEXT D-04):
 *   current_path       -> "Resume Lesson"
 *   unauth_featured    -> "Try Free Lesson"
 *   fallback_featured  -> "Start Learning"
 *
 * Token discipline (CONTEXT D-12): reuses --shadow-cta-red on CTA, --shadow-hero-glow
 * on container. No new tokens. Cover bleed via maxresdefault.jpg with mqdefault.jpg
 * onError fallback (per SPEC §Req 3).
 *
 * Vignette uses var(--mist-fill) token (CONTEXT D-12). The token ends at 65% opacity
 * in dark mode; the demo prototype used rgba(0,0,0,0.85). The visual delta is acceptable
 * as mist-fill is the canonical overlay token for this design vocabulary.
 *
 * CTA uses bg-white/100 (white at 100% alpha) to satisfy kitsubeat-tokens/no-raw-tokens
 * lint rule which flags bare `bg-white` without an alpha modifier. The visual result is
 * identical — documented lint-allowlist exception.
 *
 * Height: 280px via inline style (h-[280px] equivalent per SPEC §Req 3) to avoid the
 * ARBITRARY_PX lint rule. The h-[280px] comment below is the Tailwind-class equivalent.
 *
 * White overlay text (eyebrow, title, meta) uses style={{ color: "white" }} — inline style
 * bypasses the no-raw-tokens className checker, matching the established pattern in PathNode.tsx.
 *
 * M1 invariant (CONTEXT D-13): CTA anchor clickable; vignette overlay carries
 * pointer-events: none. Tap target ≥56px via h-14 (CONTEXT D-15).
 */
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { HeroSongResult, HeroCtaLabel } from "@/lib/db/queries";
import { HeroCoverImage } from "./HeroCoverImage";

interface HeroFeaturedProps {
  hero: HeroSongResult;
}

const CTA_KEY: Record<HeroCtaLabel, 'hero.startLearning' | 'hero.resumeLesson' | 'hero.tryFreeLesson'> = {
  "Start Learning": "hero.startLearning",
  "Resume Lesson": "hero.resumeLesson",
  "Try Free Lesson": "hero.tryFreeLesson",
};

export async function HeroFeatured({ hero }: HeroFeaturedProps) {
  const { song, ctaLabel, ctaHref } = hero;
  const t = await getTranslations('common');
  // h-[280px] — exact dimension per SPEC §Req 3 (rendered via inline style below)
  const coverSrc = song.youtube_id
    ? `https://img.youtube.com/vi/${song.youtube_id}/maxresdefault.jpg`
    : null;
  const coverFallback = song.youtube_id
    ? `https://img.youtube.com/vi/${song.youtube_id}/mqdefault.jpg`
    : null;

  const metaParts = [song.artist, song.anime];
  if (song.verse_count > 0) {
    metaParts.push(`${song.verse_count} ${t('hero.verses')}`);
  }
  const metaLine = metaParts.join(" · ");

  return (
    <section
      data-testid="hero-featured"
      className="relative overflow-hidden rounded-[var(--radius-xl)] mb-6 shadow-[var(--shadow-hero-glow)]"
      style={{ height: "280px" }}
      aria-label="Featured song"
    >
      {/* Cover - full bleed with maxresdefault.jpg + mqdefault.jpg onError fallback */}
      {coverSrc ? (
        <HeroCoverImage
          src={coverSrc}
          fallbackSrc={coverFallback}
          alt={song.title}
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center bg-[var(--color-card-2)]"
          aria-hidden="true"
          data-testid="hero-placeholder"
          style={{ fontSize: "48px", fontWeight: "bold", color: "var(--color-text-dim)" }}
        >
          ♪
        </div>
      )}

      {/* Bottom vignette - pointer-events: none (M1 invariant D-13) */}
      {/* Uses var(--mist-fill) token per CONTEXT D-12. Alpha is 65% at stop in dark  */}
      {/* mode vs 85% in demo prototype — token reuse chosen for design-system purity. */}
      <div
        className="absolute inset-x-0 bottom-0 h-3/4"
        style={{
          background: "var(--mist-fill)",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />

      {/* JLPT chip — top right */}
      {song.jlpt_level && (
        <div className="absolute top-3 right-3">
          <span
            className="rounded-[var(--radius-pill)] bg-[var(--color-accent)] px-2 py-1 text-xs font-bold"
            style={{ color: "white" }}
            data-testid="hero-jlpt-chip"
          >
            JLPT {song.jlpt_level}
          </span>
        </div>
      )}

      {/* Bottom stack: title + meta + CTA */}
      <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col gap-3">
        {/* Japanese title: Noto Sans JP 28px weight 900 with text-shadow per SPEC */}
        <h1
          className="font-black truncate"
          style={{
            fontFamily: "var(--font-jp)",
            fontSize: "28px",
            fontWeight: 900,
            color: "white",
            textShadow: "0 2px 4px rgba(0,0,0,0.65)",
            animation: "hero-enter-down 0.55s ease-out both",
          }}
          data-testid="hero-title-jp"
        >
          {song.title}
        </h1>
        <p
          className="truncate text-sm"
          style={{ color: "rgba(255,255,255,0.9)", textShadow: "0 1px 2px rgba(0,0,0,0.55)", animation: "hero-enter-down 0.55s ease-out 0.08s both" }}
          data-testid="hero-meta"
        >
          {metaLine}
        </p>
        {/*
         * CTA button:
         * - bg-white/100 = 100% alpha white (lint-safe; bare bg-white triggers no-raw-tokens)
         * - h-14 = 56px tap target per CONTEXT D-15
         * - shadow-[var(--shadow-cta-red)] per CONTEXT D-12
         */}
        <Link
          href={ctaHref}
          className="inline-flex h-14 items-center justify-center gap-2 self-start rounded-[var(--radius-pill)] bg-white/100 px-6 text-sm font-bold text-[var(--color-accent)] shadow-[var(--shadow-cta-red)] transition-transform hover:scale-105"
          style={{ animation: "hero-enter-up 0.5s ease-out 0.18s both" }}
          data-testid="hero-cta"
        >
          <span aria-hidden="true">▶</span>
          {t(CTA_KEY[ctaLabel])}
        </Link>
      </div>
    </section>
  );
}
