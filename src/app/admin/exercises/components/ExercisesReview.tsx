"use client";

import { useMemo, useState } from "react";
import type { VocabAdminRow } from "../page";
import VocabExerciseCard from "./VocabExerciseCard";

interface Props {
  songVersionId: string;
  songLabel: string;
  rows: VocabAdminRow[];
  totalVerses: number;
}

type Filter = "all" | "flagged" | "no_image";

export default function ExercisesReview({ songLabel, rows, totalVerses }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const flaggedCount = rows.filter((r) => r.admin_flagged).length;
  const noImageCount = rows.filter((r) => !r.image_url).length;

  const visible = useMemo(() => {
    let list = rows;
    if (filter === "flagged") list = list.filter((r) => r.admin_flagged);
    if (filter === "no_image") list = list.filter((r) => !r.image_url);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((r) =>
        r.surface.toLowerCase().includes(q) ||
        r.romaji.toLowerCase().includes(q) ||
        r.meaning_en.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, filter, query]);

  const filterBtn = (label: string, value: Filter, count?: number) => (
    <button
      type="button"
      onClick={() => setFilter(value)}
      style={{
        padding: "6px 14px",
        fontSize: "12px",
        fontWeight: 600,
        borderRadius: "var(--radius-full, 999px)",
        border: `1px solid ${filter === value ? "var(--color-accent)" : "var(--color-border)"}`,
        background: filter === value ? "var(--color-accent)" : "none",
        color: filter === value ? "#fff" : "var(--color-text-muted)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "5px",
      }}
    >
      {label}
      {count !== undefined && (
        <span style={{
          padding: "1px 5px",
          borderRadius: "999px",
          fontSize: "10px",
          fontWeight: 700,
          background: filter === value ? "rgba(255,255,255,0.25)" : "var(--color-card-2)",
          color: filter === value ? "#fff" : "var(--color-text-muted)",
        }}>
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Stats bar */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "16px",
        padding: "14px 18px",
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--color-border)",
        background: "var(--color-card)",
        fontSize: "13px",
        color: "var(--color-text-muted)",
      }}>
        <span style={{ fontWeight: 700, color: "var(--color-text)" }}>{songLabel}</span>
        <span>{rows.length} vocab items</span>
        <span>{totalVerses} verses</span>
        {flaggedCount > 0 && (
          <span style={{ color: "#ef4444", fontWeight: 600 }}>🚩 {flaggedCount} flagged</span>
        )}
        {noImageCount > 0 && (
          <span style={{ color: "var(--color-text-dim)" }}>⚠ {noImageCount} without image</span>
        )}
      </div>

      {/* Filters + search */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
        {filterBtn("All", "all", rows.length)}
        {filterBtn("Flagged", "flagged", flaggedCount)}
        {filterBtn("No Image", "no_image", noImageCount)}
        <div style={{ flex: 1, minWidth: "180px" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vocab…"
            style={{
              width: "100%",
              padding: "7px 10px",
              fontSize: "13px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              background: "var(--color-card-2)",
              color: "var(--color-text)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Vocab cards */}
      {visible.length === 0 ? (
        <div style={{
          padding: "48px 24px",
          textAlign: "center",
          fontSize: "14px",
          color: "var(--color-text-muted)",
          borderRadius: "var(--radius-xl)",
          border: "1px dashed var(--color-border)",
          background: "var(--color-card)",
        }}>
          {filter !== "all" || query ? "No vocab items match this filter." : "No vocab items found."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {visible.map((row) => (
            <VocabExerciseCard key={row.vocab_item_id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
