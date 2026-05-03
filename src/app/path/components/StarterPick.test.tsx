// @vitest-environment jsdom
/**
 * src/app/path/components/StarterPick.test.tsx
 *
 * Phase 14.1 D-01 — StarterPick EmptyState fallback when candidates is empty.
 *
 * Three render tests:
 *   1. candidates=[] → EmptyState renders with correct heading + CTA to /songs
 *   2. candidates=[oneRow] → one card renders, no EmptyState
 *   3. candidates=[r1,r2,r3] → three cards render (happy path regression)
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { StarterSongRow } from "@/lib/gamification/starter-songs";

// Mock server actions and router before importing the component
vi.mock("@/app/actions/gamification", () => ({
  setStarterSong: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import { StarterPick } from "./StarterPick";

afterEach(() => cleanup());

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCandidate(slug: string): StarterSongRow {
  return {
    slug,
    title: `Title ${slug}`,
    anime: `Anime ${slug}`,
    jlpt_level: "N4",
    youtube_id: "dQw4w9WgXcQ",
    thumbnail_url: `https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg`,
  };
}

const SLUG_1 = "under-the-tree-sim";
const SLUG_2 = "misa-no-uta-aya-hirano";
const SLUG_3 = "yume-wo-kanaete-doraemon-mao";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("StarterPick — EmptyState fallback (Phase 14.1 D-01)", () => {
  it("Test 1: renders EmptyState with correct heading and CTA to /songs when candidates is empty", () => {
    render(<StarterPick candidates={[]} userId="u1" />);

    // EmptyState heading should be visible
    expect(
      screen.getByText("More starter songs coming soon")
    ).toBeInTheDocument();

    // CTA link should point to /songs
    const ctaLink = screen.getByRole("link", { name: "Explore the catalog" });
    expect(ctaLink).toHaveAttribute("href", "/songs");

    // No starter-pick cards should be present
    expect(
      screen.queryByTestId(`starter-pick-${SLUG_1}`)
    ).not.toBeInTheDocument();
  });

  it("Test 2: renders 1 card and no EmptyState when candidates has one row", () => {
    render(<StarterPick candidates={[makeCandidate(SLUG_1)]} userId="u1" />);

    // Exactly one Start-here button
    expect(screen.getByTestId(`starter-pick-${SLUG_1}`)).toBeInTheDocument();

    // No EmptyState heading
    expect(
      screen.queryByText("More starter songs coming soon")
    ).not.toBeInTheDocument();
  });

  it("Test 3: renders 3 cards for the full happy path (regression guard)", () => {
    render(
      <StarterPick
        candidates={[
          makeCandidate(SLUG_1),
          makeCandidate(SLUG_2),
          makeCandidate(SLUG_3),
        ]}
        userId="u1"
      />
    );

    expect(screen.getByTestId(`starter-pick-${SLUG_1}`)).toBeInTheDocument();
    expect(screen.getByTestId(`starter-pick-${SLUG_2}`)).toBeInTheDocument();
    expect(screen.getByTestId(`starter-pick-${SLUG_3}`)).toBeInTheDocument();

    // No EmptyState
    expect(
      screen.queryByText("More starter songs coming soon")
    ).not.toBeInTheDocument();
  });
});
