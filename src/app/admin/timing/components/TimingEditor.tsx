"use client";

/**
 * TimingEditor — waveform-based word timing correction tool.
 *
 * Uses wavesurfer.js v7 with RegionsPlugin to render one draggable/resizable
 * region per word over the audio waveform.
 *
 * Pattern: see .planning/phases/01-content-pipeline/01-RESEARCH.md Pattern 5
 */

import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import type { WordTiming } from "@/lib/timing-types";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface TimingEditorProps {
  audioUrl: string;
  words: WordTiming[];
  songId: string;
  onSave: (words: WordTiming[], verified: "auto" | "manual") => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Region color helpers
// ─────────────────────────────────────────────────────────────────────────────

function regionColor(word: WordTiming): string {
  if (word.low_confidence) {
    return "rgba(239,68,68,0.25)"; // red — low-confidence, flagged for review
  }
  return "rgba(99,102,241,0.15)"; // indigo — default
}

// ─────────────────────────────────────────────────────────────────────────────
// TimingEditor component
// ─────────────────────────────────────────────────────────────────────────────

export default function TimingEditor({
  audioUrl,
  words: initialWords,
  songId,
  onSave,
}: TimingEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);

  const [timings, setTimings] = useState<WordTiming[]>(initialWords);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [status, setStatus] = useState<"auto" | "manual">("auto");
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<"idle" | "success" | "error">("idle");
  const [isReady, setIsReady] = useState(false);

  // RegionsPlugin must be memoized — one instance per mount
  const regions = useMemo(() => RegionsPlugin.create(), []);

  // ─────────────────────────────────────────────────────────────────────────
  // Initialize WaveSurfer
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      url: audioUrl,
      plugins: [regions],
      height: 100,
      waveColor: "#a5b4fc",
      progressColor: "#6366f1",
      cursorColor: "#312e81",
      minPxPerSec: zoom,
    });

    wsRef.current = ws;

    // Once loaded — add one region per word
    ws.on("ready", () => {
      setDuration(ws.getDuration());
      setIsReady(true);

      timings.forEach((word, i) => {
        regions.addRegion({
          id: word.id ?? String(i),
          start: word.start,
          end: word.end,
          content: word.word,
          drag: true,
          resize: true,
          color: regionColor(word),
        });
      });
    });

    ws.on("audioprocess", (t: number) => setCurrentTime(t));
    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("finish", () => setIsPlaying(false));

    regions.on("region-updated", (region) => {
      setTimings((prev) =>
        prev.map((w, i) =>
          (w.id ?? String(i)) === region.id
            ? { ...w, start: region.start, end: region.end }
            : w
        )
      );
    });

    return () => {
      ws.destroy();
      wsRef.current = null;
    };
    // Intentionally omitting `timings` from deps — we only seed regions once on ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  // ─────────────────────────────────────────────────────────────────────────
  // Zoom: update minPxPerSec when slider changes
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (wsRef.current && isReady) {
      wsRef.current.zoom(zoom);
    }
  }, [zoom, isReady]);

  // ─────────────────────────────────────────────────────────────────────────
  // Keyboard shortcuts
  // ─────────────────────────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const ws = wsRef.current;
      if (!ws) return;

      if (e.code === "Space") {
        e.preventDefault();
        ws.playPause();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        const offset = e.shiftKey ? 0.1 : 1;
        ws.setTime(Math.max(0, ws.getCurrentTime() - offset));
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        const offset = e.shiftKey ? 0.1 : 1;
        ws.setTime(Math.min(ws.getDuration(), ws.getCurrentTime() + offset));
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // ─────────────────────────────────────────────────────────────────────────
  // Save handler
  // ─────────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    setSaveResult("idle");
    try {
      await onSave(timings, status);
      setSaveResult("success");
      setTimeout(() => setSaveResult("idle"), 3000);
    } catch {
      setSaveResult("error");
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  function formatTime(t: number): string {
    const m = Math.floor(t / 60);
    const s = (t % 60).toFixed(2).padStart(5, "0");
    return `${m}:${s}`;
  }

  const lowConfidenceCount = timings.filter((w) => w.low_confidence).length;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Waveform container */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          overflow: "hidden",
          marginBottom: "16px",
          background: "#f8fafc",
        }}
      >
        <div ref={containerRef} style={{ minHeight: "100px" }} />
        {!isReady && (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              color: "#6b7280",
              fontSize: "13px",
            }}
          >
            Loading waveform…
          </div>
        )}
      </div>

      {/* Controls row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        {/* Play/Pause */}
        <button
          onClick={() => wsRef.current?.playPause()}
          style={{
            padding: "8px 20px",
            background: "#6366f1",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 600,
          }}
          title="Space"
        >
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>

        {/* Time display */}
        <span style={{ fontSize: "13px", color: "#374151", fontVariantNumeric: "tabular-nums" }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Zoom slider */}
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#374151" }}>
          Zoom:
          <input
            type="range"
            min={50}
            max={500}
            step={10}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ width: "120px" }}
          />
          <span style={{ width: "36px", textAlign: "right" }}>{zoom}px</span>
        </label>

        {/* Status selector */}
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#374151" }}>
          Status:
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "auto" | "manual")}
            style={{
              padding: "4px 8px",
              borderRadius: "4px",
              border: "1px solid #d1d5db",
              fontSize: "13px",
            }}
          >
            <option value="auto">auto (unreviewed)</option>
            <option value="manual">manual (reviewed)</option>
          </select>
        </label>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "8px 20px",
            background: saving ? "#9ca3af" : "#10b981",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: saving ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          {saving ? "Saving…" : "Save Timings"}
        </button>

        {/* Save result toast */}
        {saveResult === "success" && (
          <span style={{ color: "#10b981", fontSize: "13px" }}>Saved successfully</span>
        )}
        {saveResult === "error" && (
          <span style={{ color: "#dc2626", fontSize: "13px" }}>Save failed — check console</span>
        )}
      </div>

      {/* Stats row */}
      <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "8px" }}>
        {timings.length} words total
        {lowConfidenceCount > 0 && (
          <span style={{ color: "#ef4444", marginLeft: "12px" }}>
            {lowConfidenceCount} low-confidence (shown in red)
          </span>
        )}
        <span style={{ marginLeft: "12px" }}>
          Keyboard: Space = play/pause · ← → = ±1s · Shift+← → = ±0.1s
        </span>
      </div>

      {/* Placeholder if no audio file */}
      {audioUrl.includes("{slug}") && (
        <div
          style={{
            background: "#fef3c7",
            border: "1px solid #fcd34d",
            borderRadius: "6px",
            padding: "10px 14px",
            fontSize: "13px",
            color: "#92400e",
          }}
        >
          Audio file not found at the expected path. Run the WhisperX extraction script first
          to generate <code>public/audio/{"{slug}"}.mp3</code>.
        </div>
      )}
    </div>
  );
}
