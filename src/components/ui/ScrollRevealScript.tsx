"use client";
import { useEffect } from "react";

// Mounts a single IntersectionObserver that watches every .fade-in-section
// element on the page and adds .fade-in-visible when they enter the viewport.
// Placed once in the root layout so it works across all pages.
export function ScrollRevealScript() {
  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    let rescanTimer: ReturnType<typeof setTimeout> | null = null;

    // Use data-visible attribute instead of className so React's hydration
    // reconciler never sees a mismatch — React doesn't own data-* attributes
    // set via direct DOM mutation.
    const initTimer = setTimeout(() => {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              (entry.target as HTMLElement).dataset.visible = "1";
              observer!.unobserve(entry.target);
            }
          }
        },
        { rootMargin: "-40px" },
      );

      const observe = () => {
        document.querySelectorAll(".fade-in-section:not([data-visible])").forEach((el) => {
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
