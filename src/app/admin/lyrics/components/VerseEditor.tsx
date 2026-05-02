"use client";

import { useEffect, useRef, useState } from "react";
import AdminPlayerEmbed from "./AdminPlayerEmbed";
import VerseRow from "./VerseRow";
import SaveStatus from "./SaveStatus";
import PublishButton from "./PublishButton";
import SwapVideoModal from "./SwapVideoModal";
import PipelineStatusPoller from "./PipelineStatusPoller";
import FlagControls from "./FlagControls";
import RegenerateLessonsModal from "./RegenerateLessonsModal";
import { detectOverlap } from "@/lib/admin/timing-overlap";
import { useAdminLyricsStore } from "@/lib/admin/lyrics-store";
import { saveDraft } from "../actions/save-draft";
import type { Verse } from "@/lib/types/lesson";

interface VocabRowMap {
  [vocabId: string]: {
    id: string;
    dictionary_form: string;
    reading: string;
    kanji_breakdown: unknown;
  };
}

export interface SongMeta {
  title: string;
  artist: string | null;
  anime: string | null;
}

interface Props {
  songVersionId: string;
  editorId: string; // passed from RSC (Clerk currentUser.id)
  slug: string;
  title: string;
  youtubeId: string | null;
  lyricsOffsetMs: number;
  verses: Verse[];
  baseVersionId: string; // required for stale detect at publish (Plan 07)
  baseVersionNumber: number | null;
  vocabMap: VocabRowMap;
  /** Song metadata for the AI fill prompt builder (D-06). */
  songMeta: SongMeta;
  /** Server-first draft hydration (D-17). Null when no draft row exists yet. */
  initialDraftFromServer: {
    verses: Verse[];
    dirtyVerseNumbers: number[];
    updatedAt: string;
  } | null;
  /** Phase 11.5 D-10: pipeline status from RSC — avoids first-render flash in poller */
  initialPipelineStatus?: "idle" | "rerun_in_progress" | "rerun_failed";
  initialPipelineStep?: string | null;
  /** Phase 11.5 Plan 09 SPEC #22: quality flag props for FlagControls */
  songId?: string;
  initialQualityStatus?: "active" | "flagged_wrong_song" | "flagged_unfixable";
  initialQualityNotes?: string | null;
}

const AUTOSAVE_DEBOUNCE_MS = 5000;

function localStorageKey(songVersionId: string, editorId: string) {
  return `lyrics-draft:${songVersionId}:${editorId}`;
}

export default function VerseEditor(props: Props) {
  // Phase 11.5 D-11: swap modal state
  const [showSwap, setShowSwap] = useState(false);
  // D-12: retry state — when set, SwapVideoModal opens in retry mode
  const [retryStep, setRetryStep] = useState<string | null>(null);
  // Phase 11.5 Plan 10 SPEC #23: regenerate lessons modal state
  const [showRegen, setShowRegen] = useState(false);

  const verses = useAdminLyricsStore((s) => s.verses);
  const dirtyVerseNumbers = useAdminLyricsStore((s) => s.dirtyVerseNumbers);
  const init = useAdminLyricsStore((s) => s.init);
  const updateVerse = useAdminLyricsStore((s) => s.updateVerse);
  const insertVerseAction = useAdminLyricsStore((s) => s.insertVerse);
  const deleteVerseAction = useAdminLyricsStore((s) => s.deleteVerse);
  const markSaving = useAdminLyricsStore((s) => s.markSaving);
  const markSaved = useAdminLyricsStore((s) => s.markSaved);
  const markError = useAdminLyricsStore((s) => s.markError);

  // Mount: initialize the store using server-first / localStorage-fallback handshake (D-17)
  useEffect(() => {
    let initialVerses: Verse[] = props.verses;
    let initialDirty: number[] = [];

    if (props.initialDraftFromServer) {
      // Server draft takes precedence — most recent admin edits from any device
      initialVerses = props.initialDraftFromServer.verses;
      initialDirty = props.initialDraftFromServer.dirtyVerseNumbers;
    } else if (typeof window !== "undefined") {
      // Fall back to localStorage — covers the case where the server save failed
      // but localStorage captured the edit (DRAFT-T-01)
      try {
        const raw = localStorage.getItem(
          localStorageKey(props.songVersionId, props.editorId)
        );
        if (raw) {
          const parsed = JSON.parse(raw) as {
            verses: Verse[];
            dirtyVerseNumbers: number[];
          };
          initialVerses = parsed.verses;
          initialDirty = parsed.dirtyVerseNumbers ?? [];
        }
      } catch {
        // localStorage corrupt — fall back to props.verses (server-published baseline)
      }
    }

    init({
      songVersionId: props.songVersionId,
      editorId: props.editorId,
      baseVersionId: props.baseVersionId,
      baseVersionNumber: props.baseVersionNumber,
      verses: initialVerses,
    });

    // If we restored from localStorage or server draft, mark those verses dirty
    if (initialDirty.length > 0) {
      for (const n of initialDirty) {
        updateVerse(n, {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.songVersionId, props.editorId]);

  // Auto-save effect: debounce 5s after any verse or dirty change, then write server + localStorage
  const lastSavedHashRef = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (dirtyVerseNumbers.length === 0) return;
    const hash = JSON.stringify({ v: verses, d: dirtyVerseNumbers });
    if (hash === lastSavedHashRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      markSaving();
      try {
        await saveDraft({
          songVersionId: props.songVersionId,
          baseVersionId: props.baseVersionId,
          verses,
          dirtyVerseNumbers,
        });
        // Write localStorage AFTER server success (D-17: server-first)
        if (typeof window !== "undefined") {
          localStorage.setItem(
            localStorageKey(props.songVersionId, props.editorId),
            JSON.stringify({
              verses,
              dirtyVerseNumbers,
              updatedAt: new Date().toISOString(),
            })
          );
        }
        lastSavedHashRef.current = hash;
        markSaved();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "save failed";
        markError(msg);
        // Still write localStorage so user's work isn't lost (D-17 fallback path — DRAFT-T-01)
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(
              localStorageKey(props.songVersionId, props.editorId),
              JSON.stringify({
                verses,
                dirtyVerseNumbers,
                updatedAt: new Date().toISOString(),
                serverFailed: true,
              })
            );
          } catch {
            /* localStorage full or disabled */
          }
        }
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    verses,
    dirtyVerseNumbers,
    props.songVersionId,
    props.editorId,
    props.baseVersionId,
    markSaving,
    markSaved,
    markError,
  ]);

  const warnings = detectOverlap(verses);
  const warningByVerseNumber = new Map(warnings.map((w) => [w.verseNumber, w]));

  return (
    <AdminPlayerEmbed youtubeId={props.youtubeId ?? ""}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>
          {verses.length} verses &middot; base version #
          {props.baseVersionNumber ?? "—"}
          {warnings.length > 0 && (
            <span style={{ color: "#92400e", marginLeft: "12px" }}>
              &#9888; {warnings.length} timing warning(s)
            </span>
          )}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <SaveStatus />
          {/* Phase 11.5 Plan 08: Swap video trigger */}
          <button
            type="button"
            onClick={() => { setRetryStep(null); setShowSwap(true); }}
            data-testid="open-swap-modal"
            style={{
              padding: "6px 14px",
              fontSize: "12px",
              border: "1px solid #e5e7eb",
              borderRadius: "4px",
              background: "#fff",
              color: "#374151",
              cursor: "pointer",
            }}
          >
            Swap video
          </button>
          {/* Phase 11.5 Plan 10 SPEC #23: Regenerate Lessons trigger */}
          <button
            type="button"
            onClick={() => setShowRegen(true)}
            disabled={dirtyVerseNumbers.length === 0}
            data-testid="open-regenerate-modal"
            style={{
              padding: "6px 14px",
              fontSize: "12px",
              border: "1px solid #e5e7eb",
              borderRadius: "4px",
              background: dirtyVerseNumbers.length === 0 ? "#f3f4f6" : "#fff",
              color: dirtyVerseNumbers.length === 0 ? "#6b7280" : "#374151",
              cursor: dirtyVerseNumbers.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            Regenerate ({dirtyVerseNumbers.length})
          </button>
          <PublishButton slug={props.slug} />
        </div>
      </div>

      <div
        style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}
      >
        <button
          type="button"
          onClick={() => insertVerseAction(null)}
          data-testid="insert-before-first"
          style={{
            padding: "4px 8px",
            fontSize: "12px",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            background: "#fff",
            color: "#6366f1",
            cursor: "pointer",
          }}
        >
          + Insert before first
        </button>
      </div>

      {verses.length === 0 ? (
        <p
          style={{
            color: "#6b7280",
            padding: "24px",
            background: "#f9fafb",
            borderRadius: "6px",
          }}
        >
          No verses yet. Click &ldquo;+ Insert&rdquo; to add one.
        </p>
      ) : (
        verses.map((verse, idx) => (
          <div key={`v-${verse.verse_number}-${idx}`}>
            <VerseRow
              verse={verse}
              vocabMap={props.vocabMap}
              warning={warningByVerseNumber.get(verse.verse_number) ?? null}
              songMeta={props.songMeta}
              onChange={(patch) => updateVerse(verse.verse_number, patch)}
              onDelete={() => {
                if (
                  confirm(
                    `Delete verse ${verse.verse_number}? This cannot be undone after publish.`
                  )
                ) {
                  deleteVerseAction(verse.verse_number);
                }
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                margin: "4px 0",
              }}
            >
              <button
                type="button"
                onClick={() => insertVerseAction(verse.verse_number)}
                data-testid={`insert-after-${verse.verse_number}`}
                style={{
                  padding: "2px 8px",
                  fontSize: "11px",
                  border: "1px dashed #e5e7eb",
                  borderRadius: "4px",
                  background: "transparent",
                  color: "#6b7280",
                  cursor: "pointer",
                }}
                aria-label={`Insert verse after ${verse.verse_number}`}
              >
                + Insert after {verse.verse_number}
              </button>
            </div>
          </div>
        ))
      )}
      {/* Phase 11.5 Plan 08: pipeline status poller (D-10/D-22) */}
      <PipelineStatusPoller
        songVersionId={props.songVersionId}
        initialStatus={props.initialPipelineStatus ?? "idle"}
        initialStep={props.initialPipelineStep ?? null}
        onRetry={(failedStep) => {
          // D-12: open swap modal in retry mode, pre-set to resume from failed step
          setRetryStep(failedStep);
          setShowSwap(true);
        }}
      />

      {/* Phase 11.5 Plan 08: swap video modal */}
      {showSwap && (
        <SwapVideoModal
          songVersionId={props.songVersionId}
          slug={props.slug}
          currentYoutubeId={props.youtubeId}
          isRetry={retryStep !== null}
          resumeFrom={retryStep}
          onClose={() => setShowSwap(false)}
          onStarted={() => {
            // Poller will pick up the new status on next interval
          }}
        />
      )}

      {/* Phase 11.5 Plan 09 SPEC #22: quality flag controls */}
      {props.songId && (
        <FlagControls
          songId={props.songId}
          slug={props.slug}
          initialStatus={props.initialQualityStatus ?? "active"}
          initialNotes={props.initialQualityNotes ?? null}
        />
      )}

      {/* Phase 11.5 Plan 10 SPEC #23: regenerate lessons modal */}
      {showRegen && (
        <RegenerateLessonsModal
          songVersionId={props.songVersionId}
          slug={props.slug}
          songTitle={props.title}
          songArtist={props.songMeta.artist}
          songAnime={props.songMeta.anime}
          baseVersionId={props.baseVersionId}
          verses={verses}
          dirtyVerseNumbers={dirtyVerseNumbers}
          onClose={() => setShowRegen(false)}
        />
      )}
    </AdminPlayerEmbed>
  );
}
