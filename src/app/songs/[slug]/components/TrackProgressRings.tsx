/**
 * Phase 11.6 D-12: Three side-by-side progress rings (Vocab/Grammar/Kanji).
 * Inline SVG with stroke-dasharray fill — bundle-budget-friendly per CONTEXT.
 * Reads pre-computed numeric pcts from props; no client fetch.
 *
 * SPEC-REQ-11: Rings fill proportional to track pct. Gray <80%, gold ≥80%.
 * SPEC-REQ-16: Kanji ring hidden when hasKanjiBearingVocab=false (all-kana song).
 *
 * Threat T-11.6-07-03 mitigation: Math.min(100, Math.max(0, pct)) clamps
 * pathological values (NaN, Infinity, negatives) before any SVG math.
 */

interface TrackProgressRingProps {
  pct: number;
  label: "Vocab" | "Grammar" | "Kanji";
  size?: number;
  stroke?: number;
}

function TrackProgressRing({ pct, label, size = 64, stroke = 8 }: TrackProgressRingProps) {
  // Clamp pct to [0, 100] — mitigates NaN/Infinity from numeric column edge cases
  const clamped = Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const isClosed = pct >= 80;
  const ringColor = isClosed ? "#FBBF24" : "#9CA3AF"; // amber-400 / gray-400

  return (
    <div
      className="flex flex-col items-center gap-1"
      data-testid={`track-ring-${label.toLowerCase()}`}
    >
      <svg
        width={size}
        height={size}
        className={isClosed ? "drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]" : ""}
        aria-label={`${label} ${Math.round(clamped)}%`}
        role="img"
      >
        {/* Background track ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1F2937"
          strokeWidth={stroke}
        />
        {/* Progress fill ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 600ms ease-out, stroke 300ms" }}
        />
        {/* Percentage label centered inside ring */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={Math.round(size * 0.2)}
          fill={isClosed ? "#FBBF24" : "#9CA3AF"}
          fontWeight="600"
        >
          {Math.round(clamped)}%
        </text>
      </svg>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function TrackProgressRings({
  vocab,
  grammar,
  kanji,
  hasKanjiBearingVocab = true,
}: {
  vocab: number;
  grammar: number;
  kanji: number;
  hasKanjiBearingVocab?: boolean;
}) {
  return (
    <div
      className={`my-6 grid gap-4 ${hasKanjiBearingVocab ? "grid-cols-3" : "grid-cols-2"}`}
    >
      <div className="flex justify-center">
        <TrackProgressRing pct={vocab} label="Vocab" />
      </div>
      <div className="flex justify-center">
        <TrackProgressRing pct={grammar} label="Grammar" />
      </div>
      {hasKanjiBearingVocab && (
        <div className="flex justify-center">
          <TrackProgressRing pct={kanji} label="Kanji" />
        </div>
      )}
    </div>
  );
}
