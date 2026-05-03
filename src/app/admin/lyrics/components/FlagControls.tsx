"use client";

import { useState } from "react";
import { flagSong, clearFlag } from "../actions/flag-song";

interface Props {
  songId: string;
  slug: string;
  initialStatus: "active" | "flagged_wrong_song" | "flagged_unfixable";
  initialNotes: string | null;
}

export default function FlagControls({
  songId,
  slug,
  initialStatus,
  initialNotes,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function applyFlag() {
    setSubmitting(true);
    setFeedback(null);
    if (status === "active") {
      const r = await clearFlag({ songId, slug });
      setFeedback(
        r.ok
          ? "Flag cleared — song restored to public catalog."
          : `Failed: ${(r as { ok: false; error: string }).error}`
      );
    } else {
      const r = await flagSong({ songId, slug, status, notes });
      setFeedback(
        r.ok
          ? `Flagged as ${status} — hidden from public catalog.`
          : `Failed: ${(r as { ok: false; error: string }).error}`
      );
    }
    setSubmitting(false);
  }

  // Amber tints work on both light + dark via translucent rgba(); the saturated
  // brand amber #f59e0b stays readable as both heading + button-fill on either bg.
  const amber = "#f59e0b";
  const amberTint = "rgba(245, 158, 11, 0.12)";
  const amberRing = "rgba(245, 158, 11, 0.40)";

  return (
    <div
      data-testid="flag-controls"
      style={{
        marginTop: "16px",
        padding: "12px",
        border: `1px solid ${amberRing}`,
        borderRadius: "6px",
        background: amberTint,
      }}
    >
      <h3
        style={{ margin: "0 0 8px 0", fontSize: "13px", fontWeight: 700, color: amber }}
      >
        Quality Flag
      </h3>
      <p style={{ margin: "0 0 8px 0", fontSize: "11px", color: "var(--color-text-muted)" }}>
        Flagging hides the song from the public catalog. Cleared songs are restored.
      </p>

      <fieldset style={{ border: "none", padding: 0, marginBottom: "8px" }}>
        {(["active", "flagged_wrong_song", "flagged_unfixable"] as const).map((s) => (
          <label
            key={s}
            style={{
              display: "block",
              fontSize: "13px",
              color: "var(--color-text)",
              marginBottom: "2px",
            }}
          >
            <input
              type="radio"
              name="quality-status"
              checked={status === s}
              onChange={() => setStatus(s)}
              data-testid={`flag-radio-${s}`}
              style={{ marginRight: "6px" }}
            />
            {s.replace(/_/g, " ")}
          </label>
        ))}
      </fieldset>

      {status !== "active" && (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Notes (why is this flagged?)"
          data-testid="flag-notes"
          style={{
            width: "100%",
            padding: "6px 8px",
            border: `1px solid ${amberRing}`,
            borderRadius: "4px",
            fontSize: "12px",
            marginBottom: "8px",
            boxSizing: "border-box",
            color: "var(--color-text)",
            background: "var(--color-card)",
          }}
        />
      )}

      <button
        type="button"
        onClick={applyFlag}
        disabled={submitting}
        data-testid="flag-apply"
        style={{
          padding: "6px 12px",
          fontSize: "12px",
          border: `1px solid ${amber}`,
          borderRadius: "4px",
          background: submitting ? "var(--color-card-2)" : amber,
          color: submitting ? "var(--color-text-muted)" : "#fff",
          cursor: submitting ? "not-allowed" : "pointer",
          fontWeight: 600,
        }}
      >
        {submitting ? "Saving…" : status === "active" ? "Clear flag" : "Apply flag"}
      </button>

      {feedback && (
        <p
          data-testid="flag-feedback"
          style={{ margin: "8px 0 0 0", fontSize: "11px", color: amber }}
        >
          {feedback}
        </p>
      )}
    </div>
  );
}
