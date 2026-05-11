"use client";

import { useState, useRef } from "react";
import type { GrammarExerciseItem } from "@/app/api/admin/exercises/grammar-rule/[ruleId]/route";

const LEVEL_COLOR: Record<string, { bg: string; fg: string; label: string }> = {
  beginner:     { bg: "rgba(34,197,94,0.12)",  fg: "#22c55e", label: "Beginner" },
  intermediate: { bg: "rgba(59,130,246,0.12)", fg: "#3b82f6", label: "Intermediate" },
  advanced:     { bg: "rgba(239,68,68,0.12)",  fg: "#ef4444", label: "Advanced" },
};

const TYPE_LABEL: Record<string, string> = {
  mcq_fill_blank: "MCQ Fill-blank",
  write_romaji:   "Write Romaji",
};

interface CountByLevel {
  beginner: number;
  intermediate: number;
  advanced: number;
}

export interface GrammarRuleMeta {
  rule_id: string;
  name: string;
  jlpt_reference: string;
  explanation_en: string;
  conjugation_path: string | null;
  counts: CountByLevel;
}

interface Props {
  rule: GrammarRuleMeta;
  displayOrder: number;
}

function ExerciseCard({ ex }: { ex: GrammarExerciseItem }) {
  const level = LEVEL_COLOR[ex.level] ?? { bg: "rgba(148,163,184,0.12)", fg: "#94a3b8", label: ex.level };

  // Build the prompt with the blank shown as ___
  const tokens = ex.prompt_jp_furigana.split(" ");
  const highlighted = tokens
    .map((t, i) => (i === ex.blank_token_index ? `【${ex.correct_answer}】` : t))
    .join(" ");

  return (
    <div style={{
      padding: "12px 14px",
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--color-border)",
      background: "var(--color-card)",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    }}>
      {/* Level + type badges */}
      <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "10px", fontWeight: 700, background: level.bg, color: level.fg }}>
          {level.label}
        </span>
        <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "10px", fontWeight: 600, background: "var(--color-card-2)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}>
          {TYPE_LABEL[ex.exercise_type] ?? ex.exercise_type}
        </span>
      </div>

      {/* Prompt */}
      <div>
        <p style={{ fontSize: "14px", color: "var(--color-text)", lineHeight: "1.5" }}>
          {ex.prompt_jp_furigana.split(" ").map((token, i) =>
            i === ex.blank_token_index
              ? <span key={i} style={{ display: "inline-block", minWidth: "40px", borderBottom: "2px solid var(--color-text-muted)", margin: "0 2px", textAlign: "center" }}>____</span>
              : <span key={i}>{token} </span>
          )}
        </p>
        {ex.prompt_romaji && (
          <p style={{ marginTop: "2px", fontSize: "11px", color: "var(--color-text-muted)", fontStyle: "italic" }}>{ex.prompt_romaji}</p>
        )}
        <p style={{ marginTop: "3px", fontSize: "12px", color: "var(--color-text-dim)" }}>{ex.prompt_translation}</p>
      </div>

      {/* Answer + distractors */}
      <div>
        <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-dim)", marginBottom: "5px" }}>Options</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          <span style={{ padding: "3px 10px", borderRadius: "var(--radius-md)", fontSize: "13px", fontWeight: 700, background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
            ✓ {ex.correct_answer}
          </span>
          {ex.distractors.map((d, i) => (
            <span key={i} style={{ padding: "3px 10px", borderRadius: "var(--radius-md)", fontSize: "13px", background: "var(--color-card-2)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}>
              {d}
            </span>
          ))}
        </div>
      </div>

      {/* Answered sentence */}
      <p style={{ fontSize: "12px", color: "var(--color-text-dim)", borderLeft: "2px solid var(--color-border)", paddingLeft: "8px" }}>
        {highlighted}
      </p>

      {ex.hint && (
        <p style={{ fontSize: "11px", color: "var(--color-text-muted)", fontStyle: "italic" }}>
          💡 {ex.hint}
        </p>
      )}
    </div>
  );
}

export default function GrammarRuleRow({ rule, displayOrder }: Props) {
  const [open, setOpen] = useState(false);
  const [exercises, setExercises] = useState<GrammarExerciseItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const fetchedRef = useRef(false);

  const totalCount = rule.counts.beginner + rule.counts.intermediate + rule.counts.advanced;

  async function handleToggle() {
    const willOpen = !open;
    setOpen(willOpen);

    if (willOpen && !fetchedRef.current) {
      fetchedRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/exercises/grammar-rule/${rule.rule_id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as { exercises: GrammarExerciseItem[] };
        setExercises(data.exercises);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load exercises");
        fetchedRef.current = false; // allow retry
      } finally {
        setLoading(false);
      }
    }
  }

  const visibleExercises = exercises
    ? levelFilter === "all"
      ? exercises
      : exercises.filter((e) => e.level === levelFilter)
    : [];

  return (
    <div style={{
      borderRadius: "var(--radius-xl)",
      border: "1px solid var(--color-border)",
      background: "var(--color-card)",
      overflow: "hidden",
    }}>
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={handleToggle}
        style={{
          width: "100%",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {/* Order badge */}
        <span style={{
          minWidth: "24px",
          height: "24px",
          borderRadius: "50%",
          background: "var(--color-card-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "11px",
          fontWeight: 700,
          color: "var(--color-text-dim)",
          flexShrink: 0,
        }}>
          {displayOrder}
        </span>

        {/* Name + JLPT */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-text)" }}>{rule.name}</span>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "1px 6px", borderRadius: "999px", background: "rgba(168,85,247,0.12)", color: "#a855f7" }}>
              {rule.jlpt_reference}
            </span>
            {rule.conjugation_path && (
              <span style={{ fontSize: "11px", color: "var(--color-text-dim)", fontFamily: "monospace" }}>
                {rule.conjugation_path}
              </span>
            )}
          </div>
          <p style={{ marginTop: "2px", fontSize: "12px", color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {rule.explanation_en}
          </p>
        </div>

        {/* Exercise count badges */}
        <div style={{ display: "flex", gap: "5px", flexShrink: 0 }}>
          {(["beginner", "intermediate", "advanced"] as const).map((lvl) => {
            const count = rule.counts[lvl];
            const c = LEVEL_COLOR[lvl];
            return count > 0 ? (
              <span key={lvl} title={`${c.label}: ${count} exercises`} style={{
                padding: "2px 7px",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 700,
                background: c.bg,
                color: c.fg,
              }}>
                {count}
              </span>
            ) : null;
          })}
          {totalCount === 0 && (
            <span style={{ fontSize: "11px", color: "var(--color-text-dim)" }}>no exercises</span>
          )}
        </div>

        {/* Chevron */}
        <span style={{
          fontSize: "12px",
          color: "var(--color-text-dim)",
          transition: "transform 0.2s",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          flexShrink: 0,
        }}>
          ▼
        </span>
      </button>

      {/* Expandable body */}
      {open && (
        <div style={{
          borderTop: "1px solid var(--color-border)",
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}>
          {/* Level filter tabs */}
          {!loading && exercises && exercises.length > 0 && (
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              {(["all", "beginner", "intermediate", "advanced"] as const).map((lvl) => {
                const count = lvl === "all" ? totalCount : rule.counts[lvl as keyof CountByLevel];
                if (lvl !== "all" && count === 0) return null;
                const isActive = levelFilter === lvl;
                const c = lvl !== "all" ? LEVEL_COLOR[lvl] : null;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLevelFilter(lvl)}
                    style={{
                      padding: "4px 12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      borderRadius: "999px",
                      border: `1px solid ${isActive ? (c?.fg ?? "var(--color-accent)") : "var(--color-border)"}`,
                      background: isActive ? (c?.bg ?? "rgba(239,68,68,0.1)") : "none",
                      color: isActive ? (c?.fg ?? "var(--color-accent)") : "var(--color-text-muted)",
                      cursor: "pointer",
                    }}
                  >
                    {lvl === "all" ? "All" : LEVEL_COLOR[lvl].label} {count > 0 && `(${count})`}
                  </button>
                );
              })}
            </div>
          )}

          {/* Shared-across-songs note */}
          <p style={{ fontSize: "11px", color: "var(--color-text-dim)", display: "flex", alignItems: "center", gap: "4px" }}>
            <span>ℹ</span> Exercise bank is shared across all songs using this rule.
          </p>

          {/* Loading state */}
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "20px 0", color: "var(--color-text-muted)", fontSize: "13px" }}>
              <span style={{ display: "inline-block", width: "16px", height: "16px", border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
              Loading exercises…
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", fontSize: "13px", color: "#ef4444", display: "flex", gap: "8px", alignItems: "center" }}>
              <span>⚠</span> {error}
              <button type="button" onClick={() => { fetchedRef.current = false; handleToggle(); }} style={{ marginLeft: "auto", fontSize: "12px", color: "#ef4444", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && exercises && exercises.length === 0 && (
            <p style={{ padding: "16px 0", textAlign: "center", fontSize: "13px", color: "var(--color-text-muted)" }}>
              No exercises in the bank yet. They're generated on first user session.
            </p>
          )}

          {/* Exercise list */}
          {!loading && !error && visibleExercises.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "10px" }}>
              {visibleExercises.map((ex) => (
                <ExerciseCard key={ex.id} ex={ex} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
