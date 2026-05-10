"use client";

import { useState, useTransition } from "react";
import { updateVocabFlag } from "../actions";
import ImagePicker from "./ImagePicker";
import type { VocabAdminRow } from "../page";

const JLPT_COLORS: Record<string, { bg: string; fg: string }> = {
  N5: { bg: "rgba(34,197,94,0.12)", fg: "#22c55e" },
  N4: { bg: "rgba(59,130,246,0.12)", fg: "#3b82f6" },
  N3: { bg: "rgba(168,85,247,0.12)", fg: "#a855f7" },
  N2: { bg: "rgba(245,158,11,0.12)", fg: "#f59e0b" },
  N1: { bg: "rgba(239,68,68,0.12)", fg: "#ef4444" },
};

const EXERCISE_LABELS: Record<string, string> = {
  vocab_meaning: "Word → Meaning",
  meaning_vocab: "Meaning → Word",
  reading_match: "Reading Match",
  vocab_typed: "Typed Input",
};

interface Props {
  row: VocabAdminRow;
}

export default function VocabExerciseCard({ row }: Props) {
  const [imageUrl, setImageUrl] = useState(row.image_url);
  const [flagged, setFlagged] = useState(row.admin_flagged);
  const [flagNote, setFlagNote] = useState(row.admin_flag_note ?? "");
  const [editingFlag, setEditingFlag] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [flagError, setFlagError] = useState<string | null>(null);

  const jlptColor = JLPT_COLORS[row.jlpt_level] ?? { bg: "rgba(148,163,184,0.12)", fg: "#94a3b8" };

  function saveFlag(newFlagged: boolean, newNote: string) {
    setFlagError(null);
    startTransition(async () => {
      try {
        await updateVocabFlag(row.vocab_item_id, newFlagged, newNote || null);
        setFlagged(newFlagged);
        setFlagNote(newNote);
        setEditingFlag(false);
      } catch {
        setFlagError("Failed to save flag");
      }
    });
  }

  const cardStyle: React.CSSProperties = {
    borderRadius: "var(--radius-xl)",
    border: `1px solid ${flagged ? "rgba(239,68,68,0.4)" : "var(--color-border)"}`,
    background: flagged ? "rgba(239,68,68,0.04)" : "var(--color-card)",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    transition: "border-color 0.15s",
  };

  return (
    <>
      <div style={cardStyle}>
        {/* Top row: verse badge + surface/reading + JLPT + flag button */}
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          {/* Verse badge */}
          <div style={{
            minWidth: "40px",
            textAlign: "center",
            padding: "4px 6px",
            borderRadius: "var(--radius-md)",
            background: "var(--color-card-2)",
            fontSize: "10px",
            fontWeight: 700,
            color: "var(--color-text-muted)",
            flexShrink: 0,
            lineHeight: "1.2",
          }}>
            {row.first_verse !== null ? (
              <>
                <div style={{ fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>verse</div>
                <div style={{ fontSize: "13px", color: "var(--color-text)" }}>{row.first_verse}</div>
              </>
            ) : "—"}
          </div>

          {/* Surface + readings */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-text)" }}>{row.surface}</span>
              <span style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>{row.reading}</span>
              <span style={{ fontSize: "13px", color: "var(--color-text-dim)" }}>{row.romaji}</span>
            </div>
            <div style={{ marginTop: "2px", fontSize: "13px", color: "var(--color-text)" }}>
              {row.meaning_en}
              <span style={{ marginLeft: "6px", fontSize: "11px", color: "var(--color-text-dim)" }}>({row.part_of_speech})</span>
            </div>
            {row.example_from_song && (
              <div style={{ marginTop: "4px", fontSize: "12px", color: "var(--color-text-muted)", fontStyle: "italic" }}>
                "{row.example_from_song}"
              </div>
            )}
          </div>

          {/* JLPT badge */}
          <div style={{
            padding: "3px 8px",
            borderRadius: "var(--radius-full, 999px)",
            fontSize: "11px",
            fontWeight: 700,
            background: jlptColor.bg,
            color: jlptColor.fg,
            flexShrink: 0,
          }}>
            {row.jlpt_level}
          </div>

          {/* Flag toggle */}
          <button
            type="button"
            onClick={() => flagged ? saveFlag(false, "") : setEditingFlag(true)}
            title={flagged ? "Remove flag" : "Flag issue"}
            disabled={isPending}
            style={{
              padding: "4px 8px",
              fontSize: "12px",
              borderRadius: "var(--radius-md)",
              border: `1px solid ${flagged ? "rgba(239,68,68,0.4)" : "var(--color-border)"}`,
              background: flagged ? "rgba(239,68,68,0.1)" : "none",
              color: flagged ? "#ef4444" : "var(--color-text-muted)",
              cursor: isPending ? "not-allowed" : "pointer",
              flexShrink: 0,
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {flagged ? "🚩 Flagged" : "⚑ Flag"}
          </button>
        </div>

        {/* Flag note editor */}
        {editingFlag && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "10px", background: "rgba(239,68,68,0.06)", borderRadius: "var(--radius-md)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "#ef4444" }}>Flag this vocab item</p>
            <textarea
              value={flagNote}
              onChange={(e) => setFlagNote(e.target.value)}
              placeholder="Describe the issue (optional)…"
              rows={2}
              style={{
                width: "100%",
                padding: "6px 8px",
                fontSize: "12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                background: "var(--color-card)",
                color: "var(--color-text)",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {flagError && <p style={{ fontSize: "12px", color: "#ef4444" }}>{flagError}</p>}
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" onClick={() => setEditingFlag(false)} style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", background: "none", color: "var(--color-text-muted)", cursor: "pointer" }}>
                Cancel
              </button>
              <button type="button" onClick={() => saveFlag(true, flagNote)} disabled={isPending} style={{ padding: "4px 10px", fontSize: "12px", fontWeight: 600, borderRadius: "var(--radius-md)", border: "none", background: "#ef4444", color: "#fff", cursor: isPending ? "not-allowed" : "pointer" }}>
                {isPending ? "Saving…" : "Save Flag"}
              </button>
            </div>
          </div>
        )}

        {/* Flag note display when flagged and not editing */}
        {flagged && !editingFlag && flagNote && (
          <div style={{ padding: "8px 10px", background: "rgba(239,68,68,0.06)", borderRadius: "var(--radius-md)", border: "1px solid rgba(239,68,68,0.2)", fontSize: "12px", color: "#ef4444" }}>
            <span style={{ fontWeight: 600 }}>Note: </span>{flagNote}
            <button type="button" onClick={() => setEditingFlag(true)} style={{ marginLeft: "8px", fontSize: "11px", color: "#ef4444", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
              Edit
            </button>
          </div>
        )}

        {/* Bottom row: image + exercise types */}
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          {/* Image */}
          <div style={{ flexShrink: 0 }}>
            {imageUrl ? (
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                title="Change image"
                style={{ padding: 0, border: "2px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden", cursor: "pointer", background: "none", display: "block" }}
              >
                <img
                  src={imageUrl}
                  alt={row.meaning_en}
                  style={{ width: "64px", height: "64px", objectFit: "cover", display: "block" }}
                />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                title="Add image"
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "var(--radius-md)",
                  border: "1px dashed var(--color-border-strong)",
                  background: "var(--color-card-2)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "2px",
                  color: "var(--color-text-dim)",
                  fontSize: "10px",
                }}
              >
                <span style={{ fontSize: "18px" }}>+</span>
                <span>Image</span>
              </button>
            )}
          </div>

          {/* Exercise types */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-dim)", marginBottom: "6px" }}>
              Exercise types
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {row.exercise_types.map((type) => (
                <span
                  key={type}
                  style={{
                    padding: "3px 8px",
                    fontSize: "11px",
                    fontWeight: 600,
                    borderRadius: "var(--radius-full, 999px)",
                    background: "var(--color-card-2)",
                    color: "var(--color-text-muted)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  {EXERCISE_LABELS[type] ?? type}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showPicker && (
        <ImagePicker
          vocabItemId={row.vocab_item_id}
          currentUrl={imageUrl}
          surface={row.surface}
          meaning={row.meaning_en}
          onClose={() => setShowPicker(false)}
          onSaved={(url) => setImageUrl(url)}
        />
      )}
    </>
  );
}
