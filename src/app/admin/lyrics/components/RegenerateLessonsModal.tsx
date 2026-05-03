"use client";

/**
 * Phase 11.5 SPEC #23 + D-07: Regenerate Lessons modal.
 *
 * Shows the N dirty verses, time estimate, and a confirm button.
 * On confirm: calls regenerateLessons server action (loops claude-cli per verse).
 * Post-run: shows per-verse status (regenerated / failed / skipped).
 * On success: calls markPublished() — the regen publish consumed the dirty draft
 * AND created a new lyrics_versions row. The submitted verses stay on screen as
 * the new baseline.
 *
 * Modal cannot be closed during a running regen (prevents abandonment).
 * REGEN-T-01: Admin is aware via per-verse progress + time estimate.
 */

import { useState } from "react";
import { useAdminLyricsStore } from "@/lib/admin/lyrics-store";
import { regenerateLessons } from "../actions/regenerate";
import type { Verse } from "@/lib/types/lesson";

interface Props {
  songVersionId: string;
  slug: string;
  songTitle: string;
  songArtist: string | null;
  songAnime: string | null;
  baseVersionId: string;
  verses: Verse[];               // current draft verses (full set)
  dirtyVerseNumbers: number[];   // candidate set
  onClose: () => void;
}

interface PerVerseResult {
  verseNumber: number;
  status: "pending" | "regenerated" | "failed" | "skipped";
  detail?: string;
}

/** Derive displayable surface text from a verse's tokens array */
function verseSurface(v: Verse | undefined): string {
  if (!v) return "";
  return v.tokens.map((t) => t.surface).join("") || "";
}

export default function RegenerateLessonsModal(props: Props) {
  const markPublished = useAdminLyricsStore((s) => s.markPublished);
  const [confirming, setConfirming] = useState(true);
  const [results, setResults] = useState<PerVerseResult[]>(
    props.dirtyVerseNumbers.map((n) => ({ verseNumber: n, status: "pending" }))
  );
  const [globalStatus, setGlobalStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [globalError, setGlobalError] = useState<string | null>(null);

  async function handleConfirm() {
    setConfirming(false);
    setGlobalStatus("running");
    setGlobalError(null);

    const r = await regenerateLessons({
      songVersionId: props.songVersionId,
      slug: props.slug,
      songTitle: props.songTitle,
      songArtist: props.songArtist,
      songAnime: props.songAnime,
      baseVersionId: props.baseVersionId,
      verses: props.verses,
      verseNumbersToRegen: props.dirtyVerseNumbers,
    });

    // Map per-verse results back to UI state
    const merged: PerVerseResult[] = props.dirtyVerseNumbers.map((n) => {
      const found = r.perVerseResults.find((p) => p.verseNumber === n);
      if (!found) return { verseNumber: n, status: "pending" };
      if (found.status === "regenerated") return { verseNumber: n, status: "regenerated" };
      if (found.status === "failed") return { verseNumber: n, status: "failed", detail: found.error };
      return { verseNumber: n, status: "skipped", detail: found.reason };
    });
    setResults(merged);

    if (r.ok) {
      setGlobalStatus("done");
      // Regen-publish consumed the dirty draft AND created a new lyrics_version
      // row. Advance the base pointers; keep verses on screen so the editor
      // doesn't blank out — they're the new published baseline now.
      markPublished({
        newVersionId: r.regenVersionId,
        newVersionNumber: r.regenVersionNumber,
      });
    } else {
      setGlobalStatus("error");
      setGlobalError(r.globalError ?? "unknown");
    }
  }

  const isRunning = globalStatus === "running";

  return (
    <div
      data-testid="regenerate-modal"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={!isRunning && confirming ? props.onClose : undefined}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          padding: "24px",
          borderRadius: "8px",
          maxWidth: "560px",
          width: "100%",
          maxHeight: "80vh",
          overflow: "auto",
        }}
      >
        <h2 style={{ margin: "0 0 12px 0", fontSize: "18px", fontWeight: 700, color: "#111827" }}>
          Regenerate Lessons
        </h2>

        {confirming ? (
          <>
            <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#374151" }}>
              {props.dirtyVerseNumbers.length} verse(s) will be regenerated using AI.
              Each verse calls Claude CLI separately. Estimated time:{" "}
              ~{props.dirtyVerseNumbers.length * 30}&ndash;{props.dirtyVerseNumbers.length * 60}s.
            </p>
            <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "#6b7280" }}>
              On success, a new <code>source=&apos;regen&apos;</code> version will be published and the
              public song page will reflect the regenerated content.
            </p>
            <ul style={{ margin: "0 0 16px 0", paddingLeft: "16px", fontSize: "12px", color: "#374151" }}>
              {props.dirtyVerseNumbers.map((n) => {
                const v = props.verses.find((x) => x.verse_number === n);
                const preview = verseSurface(v).slice(0, 60) || "(empty)";
                return (
                  <li key={n} data-testid={`regen-verse-${n}`}>
                    verse {n}: <code>{preview}</code>
                  </li>
                );
              })}
            </ul>
            {props.dirtyVerseNumbers.length === 0 && (
              <p style={{ color: "#dc2626", fontSize: "12px" }}>
                No edited verses since last regen. Edit a verse first or close this modal.
              </p>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                onClick={props.onClose}
                data-testid="regen-cancel"
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
                onClick={handleConfirm}
                disabled={props.dirtyVerseNumbers.length === 0}
                data-testid="regen-confirm"
                style={{
                  padding: "8px 16px",
                  border: "1px solid #6366f1",
                  borderRadius: "4px",
                  background: props.dirtyVerseNumbers.length === 0 ? "#f3f4f6" : "#6366f1",
                  color: props.dirtyVerseNumbers.length === 0 ? "#6b7280" : "#fff",
                  cursor: props.dirtyVerseNumbers.length === 0 ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}
              >
                Regenerate {props.dirtyVerseNumbers.length} verse
                {props.dirtyVerseNumbers.length === 1 ? "" : "s"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#374151" }}>
              Status:{" "}
              <strong data-testid="regen-status">
                {globalStatus === "running" ? "running..." : globalStatus}
              </strong>
            </p>
            <ul style={{ margin: "0 0 16px 0", paddingLeft: "16px", fontSize: "12px" }}>
              {results.map((r) => (
                <li
                  key={r.verseNumber}
                  data-testid={`regen-result-${r.verseNumber}`}
                  style={{
                    color:
                      r.status === "failed"
                        ? "#dc2626"
                        : r.status === "regenerated"
                        ? "#10b981"
                        : "#6b7280",
                  }}
                >
                  verse {r.verseNumber}: {r.status}
                  {r.detail ? ` — ${r.detail}` : ""}
                </li>
              ))}
            </ul>
            {globalError && (
              <p
                data-testid="regen-global-error"
                style={{ color: "#dc2626", fontSize: "12px" }}
              >
                {globalError}
              </p>
            )}
            {!isRunning && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={props.onClose}
                  data-testid="regen-close"
                  style={{
                    padding: "8px 16px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "4px",
                    background: "#fff",
                    color: "#6b7280",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
