/**
 * GET /api/review/known-count?songId=<uuid>
 *
 * Returns vocabulary coverage counts for a given song + current user:
 *   { total, known, mastered, learning }
 *
 * "known" = state IN (1,2,3) — NOT state >= 2 (RESEARCH.md Pitfall 1).
 * DISTINCT on vocab_item_id avoids tv+full double-count (RESEARCH.md Pitfall 2).
 *
 * Cache-Control: private, no-store — prevents CDN/SW serving stale counts after
 * a session updates mastery state (RESEARCH.md Pattern 1).
 *
 * TODO(Phase 10 auth): replace PLACEHOLDER_USER_ID with Clerk auth()
 */

import { getKnownWordCountForSong } from "@/lib/db/queries";

// UUID v4 pattern — basic shape validation, not a full RFC check.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Mirrors the placeholder pattern used across the codebase pre-Clerk auth.
// Phase 10 will swap this for `const { userId } = await auth()`.
const PLACEHOLDER_USER_ID = "test-user-e2e";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const songId = searchParams.get("songId");

  if (!songId || !UUID_RE.test(songId)) {
    return Response.json(
      { error: "songId is required and must be a valid UUID" },
      { status: 400 }
    );
  }

  try {
    const data = await getKnownWordCountForSong(PLACEHOLDER_USER_ID, songId);
    return Response.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    console.error("[/api/review/known-count] DB error:", err);
    return Response.json({ error: "internal" }, { status: 500 });
  }
}
