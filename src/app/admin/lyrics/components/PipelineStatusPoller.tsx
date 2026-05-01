"use client";

/**
 * Phase 11.5 D-10/D-22: Pipeline status poller.
 *
 * Polls /api/admin/song/[id]/pipeline-status every 3s using plain fetch + setInterval
 * (D-22 fallback: no TanStack Query). Renders a status banner when pipeline is not idle.
 *
 * Surfaces:
 *   - Current step name (e.g., "audio", "whisper", "lesson")
 *   - Started-at timestamp
 *   - Quality status (flagged_wrong_song, flagged_unfixable)
 *   - Retry button when pipeline_status = 'rerun_failed' (D-12)
 */

import { useEffect, useState } from "react";

interface Props {
  songVersionId: string;
  /** Initial values from RSC — avoids first-render flash */
  initialStatus: "idle" | "rerun_in_progress" | "rerun_failed";
  initialStep: string | null;
  /**
   * Called when admin clicks "Retry from <step>".
   * Parent (VerseEditor) opens the SwapVideoModal in retry mode.
   */
  onRetry: (resumeFrom: string | null) => void;
}

interface PollResponse {
  pipeline_status: "idle" | "rerun_in_progress" | "rerun_failed";
  pipeline_step: string | null;
  pipeline_started_at: string | null;
  quality_status: "active" | "flagged_wrong_song" | "flagged_unfixable";
  quality_notes: string | null;
}

/** D-22: 3 s interval (plan spec: 3–5 s; 3 s chosen for responsiveness) */
const POLL_INTERVAL_MS = 3000;

export default function PipelineStatusPoller({
  songVersionId,
  initialStatus,
  initialStep,
  onRetry,
}: Props) {
  const [state, setState] = useState<PollResponse>({
    pipeline_status: initialStatus,
    pipeline_step: initialStep,
    pipeline_started_at: null,
    quality_status: "active",
    quality_notes: null,
  });

  useEffect(() => {
    // Don't poll when idle — nothing to show and no need to hit the DB
    if (state.pipeline_status === "idle") return;

    let cancelled = false;

    async function poll() {
      try {
        const r = await fetch(
          `/api/admin/song/${songVersionId}/pipeline-status`
        );
        if (!r.ok) return; // network blip — keep polling
        const data = (await r.json()) as PollResponse;
        if (cancelled) return;
        setState(data);
      } catch {
        // network blip — keep polling silently
      }
    }

    // Poll immediately, then on interval
    void poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  // Re-run effect when status changes (e.g., idle→in_progress→failed)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songVersionId, state.pipeline_status]);

  // Hide when truly idle and quality is fine — no banner needed
  if (state.pipeline_status === "idle" && state.quality_status === "active") {
    return null;
  }

  const statusColor =
    state.pipeline_status === "rerun_failed" ? "#fecaca" : "#fef3c7";
  const borderColor =
    state.pipeline_status === "rerun_failed" ? "#f87171" : "#fcd34d";
  const textColor =
    state.pipeline_status === "rerun_failed" ? "#991b1b" : "#92400e";

  return (
    <div
      data-testid="pipeline-status"
      style={{
        marginTop: "12px",
        padding: "10px 14px",
        border: `1px solid ${borderColor}`,
        background: statusColor,
        borderRadius: "4px",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "12px",
          color: textColor,
          fontWeight: 600,
        }}
      >
        Pipeline:{" "}
        {state.pipeline_status === "rerun_in_progress"
          ? `Running`
          : state.pipeline_status === "rerun_failed"
          ? `Failed`
          : state.pipeline_status}
        {state.pipeline_step
          ? ` — step: ${state.pipeline_step}`
          : ""}
      </p>

      {state.pipeline_started_at && (
        <p
          style={{
            margin: "4px 0 0 0",
            fontSize: "11px",
            color: textColor,
          }}
        >
          Started: {new Date(state.pipeline_started_at).toLocaleString()}
        </p>
      )}

      {state.quality_status !== "active" && (
        <p
          style={{
            margin: "4px 0 0 0",
            fontSize: "11px",
            color: "#dc2626",
            fontWeight: 600,
          }}
        >
          Quality: {state.quality_status}
          {state.quality_notes && (
            <span style={{ fontWeight: 400, display: "block", marginTop: "2px" }}>
              {state.quality_notes}
            </span>
          )}
        </p>
      )}

      {state.pipeline_status === "rerun_failed" && (
        <button
          type="button"
          onClick={() => onRetry(state.pipeline_step)}
          data-testid="pipeline-retry"
          style={{
            marginTop: "8px",
            padding: "4px 10px",
            fontSize: "12px",
            border: "1px solid #6366f1",
            borderRadius: "4px",
            background: "#6366f1",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Retry from {state.pipeline_step ?? "start"}
        </button>
      )}
    </div>
  );
}
