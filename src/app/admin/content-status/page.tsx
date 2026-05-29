import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { eq, asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { songs, songVersions } from "@/lib/db/schema";
import ContentStatusTable from "./ContentStatusTable";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ContentStatusPage() {
  const user = await currentUser();
  if (!user) return notFound();
  const admins = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim());
  if (!admins.includes(user.id)) return notFound();

  // Load all songs with their video IDs and availability status
  const rows = await db
    .select({
      id: songs.id,
      slug: songs.slug,
      title: songs.title,
      artist: songs.artist,
      anime: songs.anime,
      is_available: songs.is_available,
      youtube_ids: sql<string[]>`
        ARRAY(
          SELECT sv.youtube_id
          FROM song_versions sv
          WHERE sv.song_id = songs.id AND sv.youtube_id IS NOT NULL
        )
      `,
    })
    .from(songs)
    .orderBy(asc(songs.is_available), asc(songs.slug)); // unavailable first

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
          Admin
        </p>
        <h1 className="mt-1 text-3xl font-bold text-[var(--color-text)]">
          Content Status
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">
          YouTube video availability for all songs. Blocked or removed videos are hidden
          from the public catalog. Use &ldquo;Re-check&rdquo; to query the YouTube oEmbed API
          for a single song, or run{" "}
          <code className="rounded bg-[var(--color-surface)] px-1 py-0.5 text-xs font-mono">
            npm run audit:video-availability:fix
          </code>{" "}
          to scan the entire catalog.
        </p>
      </header>

      <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card-ring)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
          <span className="text-sm font-semibold text-[var(--color-text)]">
            {rows.length} songs total ·{" "}
            <span className="text-[var(--color-error)]">
              {rows.filter((r) => !r.is_available).length} unavailable
            </span>
          </span>
        </div>
        <ContentStatusTable rows={rows} />
      </div>
    </main>
  );
}
