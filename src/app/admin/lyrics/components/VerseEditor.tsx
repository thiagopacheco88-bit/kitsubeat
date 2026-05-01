"use client";

import { useState } from "react";
import AdminPlayerEmbed from "./AdminPlayerEmbed";
import VerseRow from "./VerseRow";
import { detectOverlap } from "@/lib/admin/timing-overlap";
import type { Verse } from "@/lib/types/lesson";

interface VocabRowMap {
  [vocabId: string]: {
    id: string;
    dictionary_form: string;
    reading: string;
    kanji_breakdown: unknown;
  };
}

interface Props {
  songVersionId: string;
  slug: string;
  title: string;
  youtubeId: string | null;
  lyricsOffsetMs: number;
  verses: Verse[];
  baseVersionId: string | null;
  baseVersionNumber: number | null;
  vocabMap: VocabRowMap;
}

export default function VerseEditor(props: Props) {
  // Local state for v1; Plan 05 replaces this with zustand store
  const [draft, setDraft] = useState<Verse[]>(props.verses);

  const warnings = detectOverlap(draft);
  const warningByVerseNumber = new Map(warnings.map((w) => [w.verseNumber, w]));

  function handleVerseChange(verseNumber: number, patch: Partial<Verse>) {
    setDraft((prev) =>
      prev.map((v) =>
        v.verse_number === verseNumber ? { ...v, ...patch } : v
      )
    );
    // Plan 05 wires this to the zustand store + auto-save
  }

  function handleInsertAfter(afterVerseNumber: number | null) {
    setDraft((prev) => {
      const idx =
        afterVerseNumber === null
          ? -1
          : prev.findIndex((v) => v.verse_number === afterVerseNumber);
      const maxNum = prev.length > 0 ? Math.max(...prev.map((v) => v.verse_number)) : 0;
      const newVerse: Verse = {
        verse_number: maxNum + 1,
        start_time_ms: 0,
        end_time_ms: 0,
        tokens: [],
        translations: { en: "" },
        literal_meaning: "",
        cultural_context: "",
      };
      const next = [...prev];
      next.splice(idx + 1, 0, newVerse);
      return next;
    });
  }

  function handleDelete(verseNumber: number) {
    if (
      !confirm(
        `Delete verse ${verseNumber}? This cannot be undone after publish.`
      )
    )
      return;
    setDraft((prev) => prev.filter((v) => v.verse_number !== verseNumber));
  }

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
          {draft.length} verses &middot; base version #
          {props.baseVersionNumber ?? "—"}
          {warnings.length > 0 && (
            <span style={{ color: "#92400e", marginLeft: "12px" }}>
              &#9888; {warnings.length} timing warning(s)
            </span>
          )}
        </p>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={() => handleInsertAfter(null)}
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
      </div>

      {draft.length === 0 ? (
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
        draft.map((verse, idx) => (
          <div key={`v-${verse.verse_number}-${idx}`}>
            <VerseRow
              verse={verse}
              vocabMap={props.vocabMap}
              warning={warningByVerseNumber.get(verse.verse_number) ?? null}
              onChange={(patch) => handleVerseChange(verse.verse_number, patch)}
              onDelete={() => handleDelete(verse.verse_number)}
            />
            <div
              style={{ display: "flex", justifyContent: "center", margin: "4px 0" }}
            >
              <button
                type="button"
                onClick={() => handleInsertAfter(verse.verse_number)}
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
    </AdminPlayerEmbed>
  );
}
