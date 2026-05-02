// @vitest-environment jsdom
/**
 * Phase 14 — Card primitive variant rendering tests.
 *
 * Real assertions land in Plan 14-02 (Primitives).
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

afterEach(() => cleanup());

describe("Card primitive (Phase 14 wave 0 shell)", () => {
  it("shell — verify file is discoverable", () => {
    expect(true).toBe(true);
  });

  // Plan 14-02 fills these (3 variants + CardLink polymorphic shape):
  it.todo("renders flat variant with --color-card background");
  it.todo("renders elevated variant with shadow-card-ring-strong");
  it.todo("renders hero variant with shadow-hero-glow");
  it.todo("CardLink renders an <a> with the same shape");
  it.todo("forwards arbitrary HTML attributes (data-*, aria-*)");
  it.todo("merges custom className without duplicating tokens");
});
