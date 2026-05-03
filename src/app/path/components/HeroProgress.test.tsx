// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { HeroProgress } from "./HeroProgress";
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
  it("root has data-testid='hero-progress'", () => {
    const { getByTestId } = render(
      <HeroProgress
        state={baseState}
        currentSongTitle="シルエット"
        nextReward={null}
      />,
    );
    expect(getByTestId("hero-progress")).toBeDefined();
  });

  it("renders Now Learning callout with current song title", () => {
    const { getByTestId, container } = render(
      <HeroProgress
        state={baseState}
        currentSongTitle="シルエット"
        nextReward={null}
      />,
    );
    expect(container.textContent).toContain("Now Learning");
    expect(getByTestId("now-learning-title").textContent).toBe("シルエット");
  });

  it("renders Level numeric", () => {
    const { container } = render(
      <HeroProgress
        state={{ ...baseState, level: 4 }}
        currentSongTitle="X"
        nextReward={null}
      />,
    );
    expect(container.textContent).toContain("Level");
    expect(container.textContent).toContain("4");
  });

  it("XP <progress> reflects xpWithinCurrentLevel(xp_total)", () => {
    const { container } = render(
      <HeroProgress
        state={{ ...baseState, xp_total: 180 }}
        currentSongTitle="X"
        nextReward={null}
      />,
    );
    const bar = container.querySelector("progress");
    expect(bar).not.toBeNull();
    expect(bar?.getAttribute("max")).not.toBe(null);
    expect(Number(bar?.getAttribute("value"))).toBeGreaterThanOrEqual(0);
  });

  it("renders next-reward chip when nextReward is non-null", () => {
    const { getByTestId, container } = render(
      <HeroProgress
        state={baseState}
        currentSongTitle="X"
        nextReward={{
          id: "border-cherry",
          label: "Border: Cherry",
          level_threshold: 5,
        }}
      />,
    );
    expect(getByTestId("next-reward-chip")).toBeDefined();
    expect(container.textContent).toContain("Lv 5");
    expect(container.textContent).toContain("Border: Cherry");
  });

  it("omits next-reward chip when nextReward is null", () => {
    const { queryByTestId } = render(
      <HeroProgress
        state={baseState}
        currentSongTitle="X"
        nextReward={null}
      />,
    );
    expect(queryByTestId("next-reward-chip")).toBeNull();
  });

  it("omits Now Learning callout when currentSongTitle is null", () => {
    const { queryByTestId } = render(
      <HeroProgress
        state={baseState}
        currentSongTitle={null}
        nextReward={null}
      />,
    );
    expect(queryByTestId("now-learning-title")).toBeNull();
  });
});
