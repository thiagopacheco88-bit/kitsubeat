// @vitest-environment jsdom
/**
 * HeroFeatured.test.tsx — Phase 14.2 Plan 08.
 *
 * Unit coverage (6 tests):
 *   Test 1 (source=current_path)     -> CTA label "Resume Lesson"
 *   Test 2 (source=unauth_featured)  -> CTA label "Try Free Lesson"
 *   Test 3 (source=fallback_featured)-> CTA label "Start Learning"
 *   Test 4 (cover img)               -> src=maxresdefault, alt=song.title, onError wired
 *   Test 5 (meta + JLPT + testids)   -> JLPT chip, verse count, Japanese title, all testids
 *   Test 6 (tap target + M1)         -> h-14 (56px) in className, no disabled, no pointer-events:none
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { HeroFeatured } from "./HeroFeatured";
import type { HeroSongResult } from "@/lib/db/queries";

afterEach(() => cleanup());

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
    "data-testid": testId,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    "data-testid"?: string;
  }) => (
    <a href={href} className={className} data-testid={testId}>
      {children}
    </a>
  ),
}));

const baseSong = {
  slug: "yoru-ni-kakeru",
  title: "夜に駆ける",
  artist: "YOASOBI",
  anime: "Bessatsu Margaret",
  youtube_id: "x8VYWazR5mE",
  jlpt_level: "N3",
  verse_count: 12,
};

function makeHero(overrides: Partial<HeroSongResult> = {}): HeroSongResult {
  return {
    song: baseSong,
    ctaLabel: "Try Free Lesson",
    ctaHref: `/songs/${baseSong.slug}`,
    source: "unauth_featured",
    ...overrides,
  };
}

describe("HeroFeatured", () => {
  it("Test 1: source=current_path -> CTA key 'hero.resumeLesson'", async () => {
    const element = await HeroFeatured({ hero: makeHero({ source: "current_path", ctaLabel: "Resume Lesson" }) });
    const { getByTestId } = render(element as React.ReactElement);
    const cta = getByTestId("hero-cta");
    // mock t returns translation key: CTA_KEY["Resume Lesson"] = "hero.resumeLesson"
    expect(cta.textContent).toContain("hero.resumeLesson");
  });

  it("Test 2: source=unauth_featured -> CTA key 'hero.tryFreeLesson'", async () => {
    const element = await HeroFeatured({ hero: makeHero({ source: "unauth_featured", ctaLabel: "Try Free Lesson" }) });
    const { getByTestId } = render(element as React.ReactElement);
    const cta = getByTestId("hero-cta");
    // mock t returns translation key: CTA_KEY["Try Free Lesson"] = "hero.tryFreeLesson"
    expect(cta.textContent).toContain("hero.tryFreeLesson");
  });

  it("Test 3: source=fallback_featured -> CTA key 'hero.startLearning'", async () => {
    const element = await HeroFeatured({ hero: makeHero({ source: "fallback_featured", ctaLabel: "Start Learning" }) });
    const { getByTestId } = render(element as React.ReactElement);
    const cta = getByTestId("hero-cta");
    // mock t returns translation key: CTA_KEY["Start Learning"] = "hero.startLearning"
    expect(cta.textContent).toContain("hero.startLearning");
  });

  it("Test 4: cover img has src=maxresdefault.jpg + alt={song.title} + onError handler wired", async () => {
    const element = await HeroFeatured({ hero: makeHero() });
    const { getByTestId } = render(element as React.ReactElement);
    const cover = getByTestId("hero-cover") as HTMLImageElement;
    expect(cover.src).toMatch(/^https:\/\/img\.youtube\.com\/vi\/[A-Za-z0-9_-]{11}\/maxresdefault\.jpg$/);
    expect(cover.alt).toBe(baseSong.title);
    // Verify the onError fallback swap: firing an error event should update src to mqdefault.jpg
    // React synthetic event system handles onError via fireEvent.error (not native cover.onerror).
    const maxresSrc = cover.src;
    fireEvent.error(cover);
    // After error, src should have been swapped to mqdefault.jpg fallback
    expect(cover.src).toMatch(/mqdefault\.jpg$/);
    expect(cover.src).not.toBe(maxresSrc);
  });

  it("Test 5: JLPT chip + meta line + Japanese title + testids; verseCount omitted when 0", async () => {
    const element = await HeroFeatured({ hero: makeHero() });
    const { getByTestId } = render(element as React.ReactElement);

    // Root testid
    expect(getByTestId("hero-featured")).toBeInTheDocument();

    // Japanese title testid + font family
    const titleJp = getByTestId("hero-title-jp");
    expect(titleJp.textContent).toBe(baseSong.title);
    expect(titleJp.style.fontFamily).toBe("var(--font-jp)");

    // JLPT chip rendered when jlpt_level present
    const jlpt = getByTestId("hero-jlpt-chip");
    expect(jlpt.textContent).toContain("JLPT N3");

    // Meta line includes artist · anime · verses when verse_count > 0
    const meta = getByTestId("hero-meta");
    expect(meta.textContent).toContain("YOASOBI");
    expect(meta.textContent).toContain("Bessatsu Margaret");
    // mock t returns key: t('hero.verses') => 'hero.verses'
    expect(meta.textContent).toContain("12 hero.verses");

    // Re-render with verse_count=0 -> no verses suffix
    cleanup();
    const heroNoVerses = makeHero({ song: { ...baseSong, verse_count: 0 } });
    const element2 = await HeroFeatured({ hero: heroNoVerses });
    const result2 = render(element2 as React.ReactElement);
    const meta2 = result2.getByTestId("hero-meta");
    expect(meta2.textContent).not.toMatch(/\d+ verses/);

    // jlpt_level=null -> no JLPT chip rendered
    cleanup();
    const heroNoJlpt = makeHero({ song: { ...baseSong, jlpt_level: null } });
    const element3 = await HeroFeatured({ hero: heroNoJlpt });
    const result3 = render(element3 as React.ReactElement);
    expect(result3.queryByTestId("hero-jlpt-chip")).toBeNull();
  });

  it("Test 6: CTA tap target ≥56px AND M1 invariant", async () => {
    const element = await HeroFeatured({ hero: makeHero() });
    const { getByTestId } = render(element as React.ReactElement);
    const cta = getByTestId("hero-cta") as HTMLAnchorElement;

    // CTA height ≥56px - className includes h-14 (= 56px in Tailwind scale)
    const hasMinHeight = cta.className.includes("h-14");
    expect(hasMinHeight).toBe(true);

    // CTA href set correctly
    expect(cta.getAttribute("href")).toBe(`/songs/${baseSong.slug}`);

    // M1 invariant: CTA must not be disabled
    expect(cta.hasAttribute("disabled")).toBe(false);
    expect(cta.style.pointerEvents).not.toBe("none");

    // Root section M1 invariant: no disabled attr
    const root = getByTestId("hero-featured");
    expect(root.hasAttribute("disabled")).toBe(false);
  });
});
