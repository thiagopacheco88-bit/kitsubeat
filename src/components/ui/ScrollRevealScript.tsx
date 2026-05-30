"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Mounts an IntersectionObserver that watches every .fade-in-section element
// on the current page. Re-runs on SPA navigation so elements on the new page
// are observed (without pathname dependency, navigating from /onboarding → /
// leaves the home-page sections permanently invisible at opacity: 0).
export function ScrollRevealScript() {
  const pathname = usePathname();

  useEffect(() => {
    let rescanTimer: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.visible = "1";
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "-40px" },
    );

    const observe = () => {
      document.querySelectorAll(".fade-in-section:not([data-visible])").forEach((el) => {
        observer.observe(el);
      });
    };

    const initTimer = setTimeout(() => {
      observe();
      // Re-scan after streaming completes (Suspense fallbacks resolve late)
      rescanTimer = setTimeout(observe, 1500);
    }, 0);

    return () => {
      clearTimeout(initTimer);
      if (rescanTimer) clearTimeout(rescanTimer);
      observer.disconnect();
      // Remove data-visible so the next render (SPA nav or router-cache reconciliation)
      // doesn't find stale attributes that the server HTML didn't include, which would
      // cause a React hydration mismatch on the new route.
      document
        .querySelectorAll<HTMLElement>(".fade-in-section[data-visible]")
        .forEach((el) => delete el.dataset.visible);
    };
  }, [pathname]);

  return null;
}
