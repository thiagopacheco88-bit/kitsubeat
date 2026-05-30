"use client";
import { useEffect } from "react";

// Mounts a single IntersectionObserver that watches every .fade-in-section
// element on the page and adds .fade-in-visible when they enter the viewport.
// Placed once in the root layout so it works across all pages.
export function ScrollRevealScript() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("fade-in-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "-40px" },
    );

    const observe = () => {
      document.querySelectorAll(".fade-in-section:not(.fade-in-visible)").forEach((el) => {
        observer.observe(el);
      });
    };

    observe();

    // Re-scan after streaming completes (Suspense fallbacks resolve late)
    const timeout = setTimeout(observe, 1500);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, []);

  return null;
}
