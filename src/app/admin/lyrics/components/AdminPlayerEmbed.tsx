"use client";

/**
 * Phase 11.5: Thin admin-side YouTube embed wrapper.
 *
 * Reuses src/app/songs/[slug]/components/PlayerContext.tsx + YouTubeEmbed.tsx.
 * YouTubeEmbed accepts videoId (not youtubeId); we pass the prop under that name.
 * songVersionId and userId are omitted — admin embeds do not record play events.
 */

import { PlayerProvider } from "@/app/songs/[slug]/components/PlayerContext";
import YouTubeEmbed from "@/app/songs/[slug]/components/YouTubeEmbed";
import type { ReactNode } from "react";

interface Props {
  youtubeId: string;
  children: ReactNode;
}

export default function AdminPlayerEmbed({ youtubeId, children }: Props) {
  return (
    <PlayerProvider>
      <div style={{ marginBottom: "16px" }}>
        <YouTubeEmbed videoId={youtubeId} />
      </div>
      {children}
    </PlayerProvider>
  );
}
