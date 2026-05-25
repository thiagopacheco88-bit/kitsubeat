/**
 * Social post history stored in Vercel Blob as social/post-log.json.
 * Keeps the last MAX_ENTRIES posts to avoid repeating content.
 */
import { put, head } from "@vercel/blob";

const BLOB_PATH = "social/post-log.json";
const MAX_ENTRIES = 90;

export type PostLogEntry = {
  date: string; // YYYY-MM-DD UTC
  type: "vocab" | "quiz" | "article";
  id: string; // vocab item uuid or article slug
  platforms: string[];
  postIds?: { x?: string[] }; // platform-specific IDs for metrics lookups
};

export type PostLog = { posted: PostLogEntry[] };

export async function readPostLog(): Promise<PostLog> {
  try {
    const meta = await head(BLOB_PATH);
    const res = await fetch(meta.url);
    if (!res.ok) return { posted: [] };
    return (await res.json()) as PostLog;
  } catch {
    return { posted: [] };
  }
}

export async function appendToPostLog(
  entry: PostLogEntry,
  existing: PostLog
): Promise<void> {
  const updated = [...existing.posted, entry].slice(-MAX_ENTRIES);
  await put(BLOB_PATH, JSON.stringify({ posted: updated }, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}
