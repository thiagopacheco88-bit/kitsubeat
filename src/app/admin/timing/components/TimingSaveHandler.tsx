"use client";

/**
 * TimingSaveHandler — thin client wrapper that provides the onSave callback to TimingEditor.
 *
 * Server component (TimingEditorPage) can't pass functions as props to client components,
 * so this wrapper owns the save logic and passes it down via render prop.
 */

import { useState } from "react";
import type { WordTiming } from "@/lib/timing-types";

interface TimingSaveHandlerProps {
  songId: string;
  timingVerified: "auto" | "manual";
  children: (
    onSave: (words: WordTiming[], verified?: "auto" | "manual") => Promise<void>
  ) => React.ReactNode;
}

export default function TimingSaveHandler({
  songId,
  timingVerified: initialVerified,
  children,
}: TimingSaveHandlerProps) {
  const [timingVerified, setTimingVerified] = useState(initialVerified);

  async function handleSave(
    words: WordTiming[],
    verified: "auto" | "manual" = timingVerified
  ) {
    setTimingVerified(verified);
    const res = await fetch(`/api/admin/timing/${songId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ words, timing_verified: verified }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? `HTTP ${res.status}`);
    }
  }

  return <>{children(handleSave)}</>;
}
