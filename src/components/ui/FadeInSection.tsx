"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface FadeInSectionProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
  delay?: number;
  [key: string]: unknown;
}

/**
 * Fade-in wrapper driven by React state, not direct DOM mutation.
 *
 * Using dataset.visible (direct DOM mutation) outside React's control
 * causes a hydration/reconciliation mismatch in Next.js App Router —
 * React finds an attribute in the DOM it never rendered.
 *
 * This component tracks visibility via useState so React always knows
 * the current state: server renders opacity:0, client adds .fade-in-visible
 * after the IntersectionObserver fires.
 */
export function FadeInSection({
  children,
  className,
  as = "div",
  delay,
  ...rest
}: FadeInSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "-40px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const Tag = as;
  const cls = [
    "fade-in-section",
    visible && "fade-in-visible",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const style = delay ? { transitionDelay: `${delay}s` } : undefined;

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className={cls} style={style} {...(rest as any)}>
      {children}
    </Tag>
  );
}
