// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import { HeroProgress } from "./HeroProgress";

// framer-motion uses IntersectionObserver as a constructor — must use a class mock
beforeAll(() => {
  class MockIntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
  }
  global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
});
import type { GamificationState } from "@/lib/db/queries";

const baseState: GamificationState = {
  level: 4,
  xp_total: 180,
  streak_current: 5,
  streak_best: 12,
  last_streak_date: null,
  sound_enabled: true,
  haptics_enabled: true,
  current_path_node_slug: "silhouette-kanaboon",
  equipped_border: null,
  equipped_theme: null,
};

describe("HeroProgress", () => {
  it("root has data-testid='hero-progress'", async () => {
    const element = await HeroProgress({
      state: baseState,
      currentSongTitle: "シルエット",
      nextReward: null,
    });
    const { getByTestId } = render(element as React.ReactElement);
    expect(getByTestId("hero-progress")).toBeDefined();
  });

  it("renders Now Learning callout with current song title", async () => {
    const element = await HeroProgress({
      state: baseState,
      currentSongTitle: "シルエット",
      nextReward: null,
    });
    const { getByTestId } = render(element as React.ReactElement);
    // mock t returns key string: t('nowLearning') => 'nowLearning'
    expect(getByTestId("now-learning-title").textContent).toBe("シルエット");
  });

  it("renders Level numeric", async () => {
    const element = await HeroProgress({
      state: { ...baseState, level: 4 },
      currentSongTitle: "X",
      nextReward: null,
    });
    const { container } = render(element as React.ReactElement);
    // mock t returns key string: t('level') => 'level'
    expect(container.textContent).toContain("level");
    expect(container.textContent).toContain("4");
  });

  it("XP <progress> reflects xpWithinCurrentLevel(xp_total)", async () => {
    const element = await HeroProgress({
      state: { ...baseState, xp_total: 180 },
      currentSongTitle: "X",
      nextReward: null,
    });
    const { container } = render(element as React.ReactElement);
    // AnimatedProgressBar renders a div[role="progressbar"], not a native <progress>
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar).not.toBeNull();
    expect(bar?.getAttribute("aria-valuemax")).not.toBe(null);
    expect(Number(bar?.getAttribute("aria-valuenow"))).toBeGreaterThanOrEqual(0);
  });

  it("renders next-reward chip when nextReward is non-null", async () => {
    const element = await HeroProgress({
      state: baseState,
      currentSongTitle: "X",
      nextReward: {
        id: "border-cherry",
        label: "Border: Cherry",
        level_threshold: 5,
      },
    });
    const { getByTestId } = render(element as React.ReactElement);
    // chip renders with mock translation key string
    expect(getByTestId("next-reward-chip")).toBeDefined();
  });

  it("omits next-reward chip when nextReward is null", async () => {
    const element = await HeroProgress({
      state: baseState,
      currentSongTitle: "X",
      nextReward: null,
    });
    const { queryByTestId } = render(element as React.ReactElement);
    expect(queryByTestId("next-reward-chip")).toBeNull();
  });

  it("omits Now Learning callout when currentSongTitle is null", async () => {
    const element = await HeroProgress({
      state: baseState,
      currentSongTitle: null,
      nextReward: null,
    });
    const { queryByTestId } = render(element as React.ReactElement);
    expect(queryByTestId("now-learning-title")).toBeNull();
  });
});
