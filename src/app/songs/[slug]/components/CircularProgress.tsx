"use client";

/**
 * CircularProgress — SVG progress ring for song completion percentage.
 *
 * Two-circle design:
 * - Track: gray background circle
 * - Arc: red progress, starts from top (rotated -90deg)
 * - Center text shows pct when size >= 40
 */
export default function CircularProgress({
  pct,
  size = 40,
}: {
  pct: number;
  size?: number;
}) {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, pct)) / 100) * circumference;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: "rotate(-90deg)" }}
      aria-label={`${pct}% complete`}
    >
      {/* Track circle */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="#374151"
        strokeWidth={3}
      />
      {/* Progress arc */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="#ef4444"
        strokeWidth={3}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
      {/* Center text — drawn unrotated */}
      {size >= 40 && (
        <text
          x={cx}
          y={cy}
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize={size * 0.22}
          fill="white"
          style={{ transform: `rotate(90deg)`, transformOrigin: `${cx}px ${cy}px` }}
        >
          {Math.round(pct)}%
        </text>
      )}
    </svg>
  );
}
