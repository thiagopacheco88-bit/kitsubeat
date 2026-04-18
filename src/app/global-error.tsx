"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    try {
      void fetch("/api/client-errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          at: new Date().toISOString(),
          url: typeof window !== "undefined" ? window.location.href : undefined,
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent : undefined,
          digest: error.digest,
          message: error.message,
          stack: error.stack,
          scope: "global",
        }),
        keepalive: true,
      });
    } catch (err) {
      console.error("[error-boundary] telemetry post failed", err);
    }
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: "#0a0a0a", color: "#e5e5e5", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
        <h1 style={{ color: "#f87171", fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          Something broke.
        </h1>
        <p style={{ color: "#a3a3a3", fontSize: "0.875rem", marginBottom: "1rem" }}>
          The error has been reported.
        </p>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            background: "#171717",
            border: "1px solid #262626",
            borderRadius: "6px",
            padding: "0.75rem",
            fontSize: "0.75rem",
            maxHeight: "60vh",
            overflow: "auto",
          }}
        >
          {error.message}
          {error.digest ? `\n\ndigest: ${error.digest}` : ""}
          {error.stack ? `\n\n${error.stack}` : ""}
        </pre>
        <button
          onClick={reset}
          style={{
            marginTop: "1rem",
            background: "#dc2626",
            color: "white",
            padding: "0.375rem 1rem",
            borderRadius: "6px",
            border: "none",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
