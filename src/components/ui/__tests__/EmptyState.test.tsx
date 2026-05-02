// @vitest-environment jsdom
/**
 * Phase 14 — EmptyState primitive (icon + heading + body + CTA composition) tests.
 *
 * Real assertions land in Plan 14-02 (Primitives) + Plan 14-04 (24 surface compositions).
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

afterEach(() => cleanup());

describe("EmptyState primitive (Phase 14 wave 0 shell)", () => {
  it("shell — verify file is discoverable", () => {
    expect(true).toBe(true);
  });

  // Plan 14-02 fills these (default + error variant + CTA composition):
  it.todo("renders default variant with icon + heading + body");
  it.todo("renders optional CTA prop as Button primitive");
  it.todo("renders error variant with retry button");
  it.todo("error variant fires onRetry handler when retry clicked");
  it.todo("forwards aria-label to root for screen readers");
});
