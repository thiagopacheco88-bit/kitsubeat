"use client";

/**
 * Phase 11.5 D-11: YouTube video swap modal.
 *
 * Admin enters a new YouTube URL + selects which pipeline steps to re-run
 * (defaults: audio, whisper, lesson) + writes a reason for the audit log.
 *
 * On confirm: calls swapVideo server action, which validates URL, inserts
 * song_video_history row, sets pipeline_status='rerun_in_progress', and
 * spawns scripts/seed/swap-video-pipeline.ts as a detached child process.
 */

import { useState } from "react";
import { swapVideo } from "../actions/swap-video";

type StepName = "audio" | "whisper" | "lesson" | "lyrics" | "insert";

interface Props {
  songVersionId: string;
  slug: string;
  /** Optional: current youtube ID used to pre-fill the retry path */
  currentYoutubeId?: string | null;
  /** Called after a successful swap start — tells parent to activate poller */
  onStarted: () => void;
  /** Called when the modal should close (cancel or after success) */
  onClose: () => void;
  /** D-12: if provided, this is a retry call with a resume step */
  isRetry?: boolean;
  resumeFrom?: string | null;
}

const ALL_STEPS: StepName[] = ["audio", "whisper", "lesson", "lyrics", "insert"];
// D-11: default steps per CONTEXT.md
const DEFAULT_STEPS: Set<StepName> = new Set(["audio", "whisper", "lesson"]);

export default function SwapVideoModal({
  songVersionId,
  slug,
  currentYoutubeId,
  onStarted,
  onClose,
  isRetry = false,
  resumeFrom = null,
}: Props) {
  // For retry, pre-fill the current URL so admin doesn't have to re-enter it
  const [url, setUrl] = useState(
    isRetry && currentYoutubeId
      ? `https://www.youtube.com/watch?v=${currentYoutubeId}`
      : ""
  );
  const [steps, setSteps] = useState<Set<StepName>>(new Set(DEFAULT_STEPS));
  const [reason, setReason] = useState(
    isRetry ? `Retry from ${resumeFrom ?? "start"}` : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleStep(s: StepName) {
    setSteps((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const r = await swapVideo({
      songVersionId,
      slug,
      newYoutubeUrl: url,
      steps: Array.from(steps),
      reason,
      isRetry,
      resumeFrom: resumeFrom ?? undefined,
    });
    setSubmitting(false);
    if (r.ok) {
      onStarted();
      onClose();
    } else {
      setError(
        r.error === "invalid_url"
          ? "Invalid YouTube URL — must be a youtube.com or youtu.be link with an 11-char video ID."
          : r.error === "pipeline_already_in_progress"
          ? "Pipeline is already running for this song. Wait for it to finish."
          : r.error === "song_not_found"
          ? "Song version not found in database."
          : r.error
      );
    }
  }

  return (
    <div
      data-testid="swap-video-modal"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          padding: "24px",
          borderRadius: "8px",
          maxWidth: "560px",
          width: "100%",
        }}
      >
        <h2
          style={{
            margin: "0 0 8px 0",
            fontSize: "18px",
            fontWeight: 700,
            color: "#111827",
          }}
        >
          {isRetry ? `Retry pipeline from ${resumeFrom ?? "start"}` : "Swap YouTube video"}
        </h2>
        <p
          style={{ margin: "0 0 16px 0", fontSize: "12px", color: "#6b7280" }}
        >
          {isRetry
            ? "Triggers a pipeline retry from the failed step. Song will be hidden from the public catalog while rerunning."
            : "Triggers a full pipeline rerun. Song will be hidden from the public catalog while rerunning (D-13)."}
        </p>

        <label
          style={{
            display: "block",
            fontSize: "12px",
            color: "#6b7280",
            marginBottom: "4px",
          }}
        >
          New YouTube URL
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          data-testid="swap-url-input"
          placeholder="https://www.youtube.com/watch?v=..."
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "8px 10px",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            marginBottom: "12px",
            fontSize: "13px",
          }}
        />

        <fieldset
          style={{
            marginBottom: "12px",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            padding: "8px 12px",
          }}
        >
          <legend
            style={{ fontSize: "11px", color: "#6b7280", padding: "0 4px" }}
          >
            Pipeline steps to re-run (D-11)
          </legend>
          {ALL_STEPS.map((s) => (
            <label
              key={s}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                marginRight: "12px",
                fontSize: "13px",
                color: "#374151",
              }}
            >
              <input
                type="checkbox"
                checked={steps.has(s)}
                onChange={() => toggleStep(s)}
                data-testid={`swap-step-${s}`}
              />
              {s}
            </label>
          ))}
        </fieldset>

        <label
          style={{
            display: "block",
            fontSize: "12px",
            color: "#6b7280",
            marginBottom: "4px",
          }}
        >
          Reason (audit log — SPEC #21)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          data-testid="swap-reason"
          rows={2}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "8px 10px",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            marginBottom: "12px",
            fontSize: "13px",
          }}
          placeholder="Why are you swapping the video?"
        />

        {error && (
          <p
            data-testid="swap-error"
            style={{ color: "#dc2626", fontSize: "12px", margin: "0 0 8px 0" }}
          >
            {error}
          </p>
        )}

        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              border: "1px solid #e5e7eb",
              borderRadius: "4px",
              background: "#fff",
              color: "#6b7280",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !url || steps.size === 0}
            data-testid="swap-submit"
            style={{
              padding: "8px 16px",
              border: "1px solid #6366f1",
              borderRadius: "4px",
              background: submitting ? "#f3f4f6" : "#6366f1",
              color: submitting ? "#6b7280" : "#fff",
              cursor:
                submitting || !url || steps.size === 0
                  ? "not-allowed"
                  : "pointer",
              fontWeight: 600,
            }}
          >
            {submitting
              ? "Starting..."
              : isRetry
              ? "Retry pipeline"
              : "Start swap"}
          </button>
        </div>
      </div>
    </div>
  );
}
