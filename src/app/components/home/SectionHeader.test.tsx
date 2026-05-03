// @vitest-environment jsdom
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SectionHeader } from "./SectionHeader";

afterEach(() => cleanup());

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [k: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("SectionHeader", () => {
  it("Test 1: renders both titleJp and title text content", () => {
    const { getByText } = render(
      <SectionHeader titleJp="続ける" title="Continue Learning" />,
    );
    expect(getByText("続ける")).toBeInTheDocument();
    expect(getByText("Continue Learning")).toBeInTheDocument();
  });

  it("Test 2: titleJp element uses var(--font-jp) inline style", () => {
    const { getByTestId } = render(
      <SectionHeader titleJp="続ける" title="Continue Learning" />,
    );
    const jp = getByTestId("section-header-title-jp");
    expect(jp.style.fontFamily).toBe("var(--font-jp)");
  });

  it("Test 3: viewAll absent — no View all link rendered", () => {
    const { queryByText } = render(
      <SectionHeader titleJp="基礎" title="Foundations" />,
    );
    expect(queryByText(/View all/i)).toBeNull();
  });

  it("Test 4: viewAll present — renders <a href> with View all text", () => {
    const { getByText } = render(
      <SectionHeader titleJp="特集" title="Featured Songs" viewAll="/songs" />,
    );
    const link = getByText(/View all/i).closest("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe("/songs");
  });

  it("Test 5: testId prop renders as data-testid on root", () => {
    const { container } = render(
      <SectionHeader titleJp="X" title="Y" testId="my-section-header" />,
    );
    const root = container.querySelector('[data-testid="my-section-header"]');
    expect(root).not.toBeNull();
  });
});
