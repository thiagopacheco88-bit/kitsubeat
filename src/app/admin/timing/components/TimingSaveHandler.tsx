"use client";

import { useState } from "react";
import type { WordTiming } from "@/lib/timing-types";
import TimingEditor from "./TimingEditor";

interface TimingSaveHandlerProps {
  songId: string;
  timingVerified: "auto" | "manual";
  audioUrl: string;
  words: WordTiming[];
}

export default function TimingSaveHandler({
  songId,
  timingVerified: initialVerified,
  audioUrl,
  words,
}: TimingSaveHandlerProps) {
  const [timingVerified, setTimingVerified] = useState(initialVerified);

  async function handleSave(
    updatedWords: WordTiming[],
    verified: "auto" | "manual" = timingVerified
  ) {
    setTimingVerified(verified);
    const res = await fetch(`/api/admin/timing/${songId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ words: updatedWords, timing_verified: verified }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? `HTTP ${res.status}`);
    }
  }

  return (
    <TimingEditor
      audioUrl={audioUrl}
      words={words}
      songId={songId}
      onSave={handleSave}
    />
  );
}
