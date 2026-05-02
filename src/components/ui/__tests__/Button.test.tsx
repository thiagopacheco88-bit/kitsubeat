// @vitest-environment jsdom
/**
 * Phase 14 — Button primitive variant rendering tests.
 *
 * Real assertions land in Plan 14-02 (Primitives).
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

afterEach(() => cleanup());

describe("Button primitive (Phase 14 wave 0 shell)", () => {
  it("shell — verify file is discoverable", () => {
    expect(true).toBe(true);
  });

  // Plan 14-02 fills these in (3 variants x 3 sizes = 9 combinations):
  it.todo("renders primary variant with shadow-button-red");
  it.todo("renders secondary variant with border");
  it.todo("renders ghost variant with no background");
  it.todo("renders sm size (h-9 px-3)");
  it.todo("renders md size (h-11 px-4)");
  it.todo("renders lg size (h-12 px-6)");
  it.todo("forwards onClick handler");
  it.todo("respects disabled prop");
  it.todo("merges custom className without duplicating tokens");
});
