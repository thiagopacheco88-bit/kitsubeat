"use client";

import { useAdminLyricsStore } from "@/lib/admin/lyrics-store";

export default function SaveStatus() {
  const status = useAdminLyricsStore((s) => s.saveStatus);
  const error = useAdminLyricsStore((s) => s.saveError);
  const lastSavedAt = useAdminLyricsStore((s) => s.lastSavedAt);

  let label = "";
  let color = "#6b7280";
  switch (status) {
    case "idle":
      label = lastSavedAt
        ? `saved ${Math.round((Date.now() - lastSavedAt) / 1000)}s ago`
        : "no edits";
      break;
    case "saving":
      label = "saving…";
      color = "#92400e";
      break;
    case "saved":
      label = "saved ✓";
      color = "#10b981";
      break;
    case "error":
      label = `save failed: ${error ?? "unknown"} (kept in localStorage)`;
      color = "#dc2626";
      break;
  }

  return (
    <span data-testid="save-status" style={{ fontSize: "12px", color }}>
      {label}
    </span>
  );
}
