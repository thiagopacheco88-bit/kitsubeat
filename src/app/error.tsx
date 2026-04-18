"use client";

import { useEffect } from "react";

export default function RouteError({
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
        }),
        keepalive: true,
      });
    } catch (err) {
      console.error("[error-boundary] telemetry post failed", err);
    }
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-gray-100">
      <h1 className="mb-2 text-lg font-semibold text-red-400">
        Something broke.
      </h1>
      <p className="mb-4 text-sm text-gray-400">
        The error has been reported. You can retry or go back.
      </p>
      <pre className="mb-4 max-h-72 overflow-auto rounded-md border border-gray-800 bg-gray-900 p-3 text-xs text-gray-300 whitespace-pre-wrap">
        {error.message}
        {error.digest ? `\n\ndigest: ${error.digest}` : ""}
        {error.stack ? `\n\n${error.stack}` : ""}
      </pre>
      <button
        onClick={reset}
        className="rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  );
}
