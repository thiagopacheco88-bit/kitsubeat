"use client";

import { useEffect, useRef } from "react";

/**
 * StarDisplay — renders 1-3 star icons indicating mastery level.
 *
 * - Filled gold stars for earned, gray outline for unearned.
 * - When animate=true (new star earned): applies star-shine CSS animation
 *   to the newly earned star and fires a confetti burst via canvas-confetti.
 * - disableForReducedMotion respects prefers-reduced-motion.
 *
 * Phase 10 Plan 07: widened from 0|1|2 to 0|1|2|3 (third star gated on
 * Listening Drill ≥ 80% — `ex6_best_accuracy`). The Star 3 celebration REUSES
 * the existing Stars 1/2 confetti + star-shine code path — no new animation,
 * no new CSS, no new SVG. All three stars share the same `text-yellow-400`
 * fill + animate prop wiring (CONTEXT-locked).
 */
export default function StarDisplay({
  stars,
  animate = false,
}: {
  stars: 0 | 1 | 2 | 3;
  animate?: boolean;
}) {
  const prevStarsRef = useRef(stars);
  const newlyEarnedIndex = animate
    ? stars - 1 // index (0-based) of the star just earned
    : -1;

  useEffect(() => {
    if (!animate || stars <= prevStarsRef.current) return;
    prevStarsRef.current = stars;

    // Fire confetti (canvas-confetti is a CJS/ESM package — import dynamically)
    void import("canvas-confetti").then(({ default: confetti }) => {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.4 },
        colors: ["#FFD700", "#FFA500", "#FF6347"],
        disableForReducedMotion: true,
      });
    });
  }, [animate, stars]);

  return (
    <div data-stars={stars} className="flex items-center gap-1" aria-label={`${stars} star${stars !== 1 ? "s" : ""} earned`}>
      {[0, 1, 2].map((i) => {
        const earned = i < stars;
        const isNew = i === newlyEarnedIndex;

        return (
          <span
            key={i}
            className={`inline-block ${isNew ? "star-shine" : ""}`}
            aria-hidden="true"
          >
            {earned ? (
              // Filled star SVG
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5 text-yellow-400"
              >
                <path
                  fillRule="evenodd"
                  d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              // Outline star SVG
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5 text-gray-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                />
              </svg>
            )}
          </span>
        );
      })}
    </div>
  );
}
