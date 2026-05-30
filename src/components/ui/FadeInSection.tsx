import type { ReactNode } from "react";

interface FadeInSectionProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

// Pure Server Component — just stamps the CSS class on the wrapper div.
// The IntersectionObserver that adds .fade-in-visible is wired up globally
// in src/app/layout.tsx via <ScrollRevealScript />.
export function FadeInSection({ children, delay = 0, className }: FadeInSectionProps) {
  const style = delay > 0 ? { transitionDelay: `${delay}s` } : undefined;
  return (
    <div
      data-fade-wrapper="1"
      className={`fade-in-section${className ? ` ${className}` : ""}`}
      style={style}
      suppressHydrationWarning
    >
      {children}
    </div>
  );
}
