// @vitest-environment jsdom
/**
 * Phase 14 — Badge primitive variant rendering tests.
 *
 * Real assertions land in Plan 14-02 (Primitives).
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

afterEach(() => cleanup());

describe("Badge primitive (Phase 14 wave 0 shell)", () => {
  it("shell — verify file is discoverable", () => {
    expect(true).toBe(true);
  });

  // Plan 14-02 fills these (4 variants × prop validation):
  it.todo("renders jlpt variant with level prop (n5..n1) → matching --color-jlpt-* token");
  it.todo("renders grammar variant with category prop (noun..other) → matching --color-grammar-* token");
  it.todo("renders mono variant with monospace eyebrow styling");
  it.todo("renders accent variant with --color-accent");
  it.todo("jlpt variant uses 12% alpha bg + 25% alpha ring per SPEC §A.2");
  it.todo("rejects invalid level / category props at type check (compile-time test)");
});
