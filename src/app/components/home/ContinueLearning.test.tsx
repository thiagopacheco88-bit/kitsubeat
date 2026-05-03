// @vitest-environment jsdom
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import React from "react";

afterEach(() => cleanup());

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/lib/user-prefs", () => ({
  PLACEHOLDER_USER_ID: "test-user-e2e",
  getCurrentUserId: vi.fn(),
}));

const mockGetContinueLearning = vi.fn();
vi.mock("@/lib/db/queries", () => ({
  getContinueLearning: (...args: unknown[]) => mockGetContinueLearning(...args),
}));

// Import AFTER mocks
const { ContinueLearning } = await import("./ContinueLearning");

const sampleRows = [
  { slug: "song-a", title: "歌A", artist: "Artist A", anime: "Anime A", youtube_id: "AAAAAAAAAAA", jlpt_level: "N3", completion_pct: 0.66, updated_at: new Date("2026-05-03T10:00:00Z"), stars: 3 },
  { slug: "song-b", title: "歌B", artist: "Artist B", anime: "Anime B", youtube_id: "BBBBBBBBBBB", jlpt_level: "N4", completion_pct: 0.33, updated_at: new Date("2026-05-03T09:00:00Z"), stars: 2 },
  { slug: "song-c", title: "歌C", artist: "Artist C", anime: "Anime C", youtube_id: "CCCCCCCCCCC", jlpt_level: "N5", completion_pct: 0.10, updated_at: new Date("2026-05-03T08:00:00Z"), stars: 0 },
];

describe("ContinueLearning - empty/auth gate (D-14, AC #9)", () => {
  it("Test 1: userId=PLACEHOLDER -> returns null + does NOT call getContinueLearning (D-14 anonymous-clean)", async () => {
    mockGetContinueLearning.mockClear();
    const node = await ContinueLearning({ userId: "test-user-e2e" });
    expect(node).toBeNull();
    expect(mockGetContinueLearning).not.toHaveBeenCalled();
  });

  it("Test 2: empty rows array -> returns null + section omitted from DOM (AC #9)", async () => {
    mockGetContinueLearning.mockResolvedValueOnce([]);
    const node = await ContinueLearning({ userId: "user_real_123" });
    expect(node).toBeNull();
    expect(mockGetContinueLearning).toHaveBeenCalledWith("user_real_123", 3);
  });

  it("Test 3: populated rows -> renders [data-testid='continue-learning'] + SectionHeader + 3 cards", async () => {
    mockGetContinueLearning.mockResolvedValueOnce(sampleRows);
    const node = await ContinueLearning({ userId: "user_real_123" });
    const { getByTestId, getAllByText } = render(node as React.ReactElement);

    const root = getByTestId("continue-learning");
    expect(root).toBeInTheDocument();

    // SectionHeader rendered (titleJp + title both present)
    expect(getAllByText("続ける").length).toBeGreaterThan(0);
    expect(getAllByText("Continue Learning").length).toBeGreaterThan(0);

    // 3 ContinueCards rendered (each by slug-keyed testid)
    expect(getByTestId("continue-card-song-a")).toBeInTheDocument();
    expect(getByTestId("continue-card-song-b")).toBeInTheDocument();
    expect(getByTestId("continue-card-song-c")).toBeInTheDocument();
  });

  it("Test 4: cards rendered in updated_at DESC order (D-03)", async () => {
    mockGetContinueLearning.mockResolvedValueOnce(sampleRows);
    const node = await ContinueLearning({ userId: "user_real_123" });
    const { container } = render(node as React.ReactElement);

    // Query in DOM order
    const cards = container.querySelectorAll('[data-testid^="continue-card-"]');
    expect(cards.length).toBe(3);
    expect(cards[0].getAttribute("data-testid")).toBe("continue-card-song-a"); // newest first
    expect(cards[1].getAttribute("data-testid")).toBe("continue-card-song-b");
    expect(cards[2].getAttribute("data-testid")).toBe("continue-card-song-c"); // oldest last
  });

  it("Test 5: stars prop is threaded to each ContinueCard (D-14)", async () => {
    // sampleRows seeds stars=3, stars=2, stars=0 across the 3 rows.
    mockGetContinueLearning.mockResolvedValueOnce(sampleRows);
    const node = await ContinueLearning({ userId: "user_real_123" });
    const { getByTestId } = render(node as React.ReactElement);

    // song-a: stars=3 -> ribbon + aura present
    const aRoot = getByTestId("continue-card-song-a");
    expect(aRoot.querySelector('[data-testid="continue-card-stars"]')).not.toBeNull();
    expect(aRoot.querySelector('[data-testid="continue-card-aura"]')).not.toBeNull();

    // song-b: stars=2 -> aura only, no ribbon
    const bRoot = getByTestId("continue-card-song-b");
    expect(bRoot.querySelector('[data-testid="continue-card-stars"]')).toBeNull();
    expect(bRoot.querySelector('[data-testid="continue-card-aura"]')).not.toBeNull();

    // song-c: stars=0 -> nothing
    const cRoot = getByTestId("continue-card-song-c");
    expect(cRoot.querySelector('[data-testid="continue-card-stars"]')).toBeNull();
    expect(cRoot.querySelector('[data-testid="continue-card-aura"]')).toBeNull();
  });
});
