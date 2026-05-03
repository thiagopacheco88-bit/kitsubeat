"use client";

/**
 * Phase 11.5: Thin admin-side YouTube embed wrapper.
 *
 * Layout: sticky player on the left (~480px) + scrollable children on the right,
 * so the admin can watch the video and edit verses simultaneously without
 * scrolling the player out of view.
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
      <div
        style={{
          display: "flex",
          gap: "16px",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            position: "sticky",
            // Clear the global sticky header (~50px) with breathing room
            // so the player isn't covered when the page is scrolled.
            top: "80px",
            // Offset the initial position so the video aligns with verse 1
            // (past the action row + "Insert before first" row above the list).
            marginTop: "80px",
            flex: "0 0 480px",
            alignSelf: "flex-start",
          }}
        >
          <YouTubeEmbed videoId={youtubeId} />
        </div>
        <div style={{ flex: "1 1 0", minWidth: 0 }}>{children}</div>
      </div>
    </PlayerProvider>
  );
}
