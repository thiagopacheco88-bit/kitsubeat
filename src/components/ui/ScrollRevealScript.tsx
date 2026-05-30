"use client";
import { useEffect } from "react";

// Mounts a single IntersectionObserver that watches every .fade-in-section
// element on the page and adds .fade-in-visible when they enter the viewport.
// Placed once in the root layout so it works across all pages.
export function ScrollRevealScript() {
  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    let rescanTimer: ReturnType<typeof setTimeout> | null = null;

    // Defer past React 18's concurrent hydration window. Without this, the
    // layout's useEffect fires before the page sub-tree is reconciled, and
    // classList.add("fade-in-visible") on in-viewport elements races with
    // React's attribute reconciliation, producing a hydration mismatch.
    const initTimer = setTimeout(() => {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              (entry.target as HTMLElement).classList.add("fade-in-visible");
              observer!.unobserve(entry.target);
            }
          }
        },
        { rootMargin: "-40px" },
      );

      const observe = () => {
        document.querySelectorAll(".fade-in-section:not(.fade-in-visible)").forEach((el) => {
          observer!.observe(el);
        });
      };

      observe();
      // Re-scan after streaming completes (Suspense fallbacks resolve late)
      rescanTimer = setTimeout(observe, 1500);
    }, 0);

    return () => {
      clearTimeout(initTimer);
      if (observer) observer.disconnect();
      if (rescanTimer) clearTimeout(rescanTimer);
    };
  }, []);

  return null;
}
