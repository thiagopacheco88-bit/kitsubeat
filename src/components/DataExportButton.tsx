"use client";

/**
 * DataExportButton — Phase 18 DSAR data export trigger.
 *
 * Fetches /api/user/data-export (Clerk-authenticated) and triggers
 * a browser download of the returned JSON bundle.
 *
 * States: idle → loading (aria-busy="true") → success (download starts)
 *       → error (role="alert" with contact details)
 *
 * T-18-05-02: endpoint is Clerk-authenticated; downloaded file lands in
 * user's own filesystem. Cache-Control: private, no-store set by API route.
 *
 * REQ-PRIV-UK-DSAR-04
 */

import { useState } from "react";
import { Button } from "@/components/ui/Button";

// Inline spinner SVG — no lucide-react dep (project uses inline SVG per ThemeToggle pattern)
function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

type ExportState = "idle" | "loading" | "error";

export function DataExportButton() {
  const [exportState, setExportState] = useState<ExportState>("idle");

  async function handleExport() {
    setExportState("loading");
    try {
      const res = await fetch("/api/user/data-export");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // Trigger browser download
      const anchor = document.createElement("a");
      anchor.href = url;
      // Use Content-Disposition filename from API or a fallback
      const disposition = res.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="([^"]+)"/);
      anchor.download = filenameMatch?.[1] ?? "kitsubeat-data.json";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setExportState("idle");
    } catch {
      setExportState("error");
    }
  }

  return (
    <div>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleExport}
        disabled={exportState === "loading"}
        aria-busy={exportState === "loading" ? "true" : undefined}
      >
        {exportState === "loading" ? (
          <>
            <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" aria-label="Downloading" />
            Downloading&hellip;
          </>
        ) : (
          "Download my data"
        )}
      </Button>
      {exportState === "error" && (
        <p
          role="alert"
          aria-live="assertive"
          className="mt-2 text-sm text-[var(--color-accent)]"
        >
          Download failed. Try again or contact support@kitsubeat.com.
        </p>
      )}
    </div>
  );
}
