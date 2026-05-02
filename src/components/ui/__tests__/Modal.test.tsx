// @vitest-environment jsdom
/**
 * Phase 14 — Modal primitive (Radix Dialog wrapper) rendering tests.
 *
 * Real assertions land in Plan 14-02 (Primitives).
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

afterEach(() => cleanup());

describe("Modal primitive (Phase 14 wave 0 shell)", () => {
  it("shell — verify file is discoverable", () => {
    expect(true).toBe(true);
  });

  // Plan 14-02 fills these (Radix Dialog a11y contract):
  it.todo("opens when Modal.Trigger is clicked");
  it.todo("closes on Modal.Close click");
  it.todo("closes on ESC keypress");
  it.todo("closes on backdrop click");
  it.todo("traps focus inside content while open");
  it.todo("restores focus to trigger on close");
  it.todo("renders with role=dialog + aria-modal=true");
  it.todo("locks body scroll while open");
  it.todo("portals to document.body by default");
});
