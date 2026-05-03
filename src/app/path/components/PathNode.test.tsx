// @vitest-environment jsdom
/**
 * src/app/path/components/PathNode.test.tsx
 *
 * Phase 14.1 Plan 09 — Cover-art-as-background PathNode rewrite tests.
 *
 * Tests cover:
 *   1. 3 reachable states (mastered, current, locked)
 *   2. current-takes-precedence over completed
 *   3. M1 invariant (clickable link in every state)
 *   4. Mist overlay pointer-events: none (locked)
 *   5. ka-pulse + ka-aura keyframe class hooks
 *   6. Cover-art img with maxresdefault.jpg
 *   7. Japanese title in cover overlay (font-jp)
 *   8. No fire emoji
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { SongListItem } from "@/lib/db/queries";

// Mock next/link so it renders a plain <a> tag in test environment
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import { PathNode } from "./PathNode";

afterEach(() => cleanup());

const baseSong = {
  slug: "silhouette-kanaboon",
  title: "シルエット",
  anime: "Boruto",
  youtube_id: "ABC123",
  ex1_2_3_best_accuracy: null,
  popularity_rank: 1,
  difficulty_tier: 2,
  grammar_rule_count: 5,
  completion_pct: null,
  avg_track_pct: null,
  learner_count: 100,
  verses_dominated_pct: null,
} as unknown as SongListItem;

describe("PathNode", () => {
  it("mastered state — completed at any accuracy renders ka-aura", () => {
    const { getByTestId, queryByTestId } = render(
      <PathNode
        song={{ ...baseSong, ex1_2_3_best_accuracy: 0.5 }}
        isCurrent={false}
        isCompleted={true}
      />,
    );
    const aura = getByTestId("path-node-aura");
    expect(aura.className).toContain("ka-aura");
    expect(queryByTestId("path-node-play-overlay")).toBeNull();
    const link = getByTestId("path-node-silhouette-kanaboon");
    expect(link.getAttribute("data-state")).toBe("mastered");
  });

  it("mastered state at high accuracy renders the same (no hidden threshold)", () => {
    const { getByTestId } = render(
      <PathNode
        song={{ ...baseSong, ex1_2_3_best_accuracy: 0.95 }}
        isCurrent={false}
        isCompleted={true}
      />,
    );
    expect(getByTestId("path-node-aura").className).toContain("ka-aura");
    const link = getByTestId("path-node-silhouette-kanaboon");
    expect(link.getAttribute("data-state")).toBe("mastered");
  });

  it("current state — renders ka-pulse PLAY overlay, no aura", () => {
    const { getByTestId, queryByTestId } = render(
      <PathNode song={baseSong} isCurrent={true} isCompleted={false} />,
    );
    const overlay = getByTestId("path-node-play-overlay");
    expect(overlay.className).toContain("ka-pulse");
    expect(queryByTestId("path-node-aura")).toBeNull();
    const link = getByTestId("path-node-silhouette-kanaboon");
    expect(link.getAttribute("data-state")).toBe("current");
  });

  it("current-takes-precedence — isCurrent && isCompleted resolves to 'current'", () => {
    // Regression guard for the precedence rule. Without isCurrent winning,
    // a user who completes their current song would lose the "Next Up" pulse
    // and immediately see a mastered halo, breaking the affordance.
    const { getByTestId, queryByTestId } = render(
      <PathNode
        song={{ ...baseSong, ex1_2_3_best_accuracy: 0.95 }}
        isCurrent={true}
        isCompleted={true}
      />,
    );
    const link = getByTestId("path-node-silhouette-kanaboon");
    expect(link.getAttribute("data-state")).toBe("current");
    expect(getByTestId("path-node-play-overlay").className).toContain("ka-pulse");
    expect(queryByTestId("path-node-aura")).toBeNull();
  });

  it("locked state — mist overlay with inline pointer-events: none", () => {
    const { getByTestId, queryByTestId } = render(
      <PathNode song={baseSong} isCurrent={false} isCompleted={false} />,
    );
    const mist = getByTestId("path-node-mist");
    expect(mist.getAttribute("style") ?? "").toMatch(/pointer-events\s*:\s*none/);
    expect(queryByTestId("path-node-aura")).toBeNull();
    expect(queryByTestId("path-node-play-overlay")).toBeNull();
    const link = getByTestId("path-node-silhouette-kanaboon");
    expect(link.getAttribute("data-state")).toBe("locked");
  });

  it("M1 invariant — link has NO disabled attribute in any reachable state", () => {
    const states = [
      { isCurrent: false, isCompleted: false },  // locked
      { isCurrent: true,  isCompleted: false },  // current
      { isCurrent: false, isCompleted: true  },  // mastered
    ];
    for (const s of states) {
      const { getByTestId, unmount } = render(
        <PathNode
          song={baseSong}
          isCurrent={s.isCurrent}
          isCompleted={s.isCompleted}
        />,
      );
      const link = getByTestId("path-node-silhouette-kanaboon");
      expect(link.hasAttribute("disabled")).toBe(false);
      expect(link.getAttribute("style") ?? "").not.toMatch(/pointer-events\s*:\s*none/);
      unmount();
    }
  });

  it("M1 invariant — locked mist overlay has pointer-events: none, but link does NOT", () => {
    const { getByTestId } = render(
      <PathNode song={baseSong} isCurrent={false} isCompleted={false} />,
    );
    const link = getByTestId("path-node-silhouette-kanaboon");
    const mist = getByTestId("path-node-mist");
    expect(link.getAttribute("style") ?? "").not.toMatch(/pointer-events\s*:\s*none/);
    expect(mist.getAttribute("style") ?? "").toMatch(/pointer-events\s*:\s*none/);
  });

  it("cover-art img src uses maxresdefault.jpg", () => {
    const { container } = render(
      <PathNode song={baseSong} isCurrent={false} isCompleted={false} />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toContain("/maxresdefault.jpg");
    expect(img?.getAttribute("src")).toContain("ABC123");
  });

  it("Japanese title is rendered in font-jp on cover overlay", () => {
    const { getByTestId } = render(
      <PathNode song={baseSong} isCurrent={false} isCompleted={false} />,
    );
    const jpTitle = getByTestId("path-node-jp-title");
    // fontFamily was set inline via var(--font-jp)
    expect(jpTitle.getAttribute("style") ?? "").toContain("var(--font-jp)");
    expect(jpTitle.textContent).toContain("シルエット");
  });

  it("never renders the fire emoji", () => {
    const { container } = render(
      <PathNode song={baseSong} isCurrent={true} isCompleted={false} />,
    );
    expect(container.innerHTML).not.toContain("🔥");
    expect(container.innerHTML).not.toContain("\u{1F525}");
  });
});
