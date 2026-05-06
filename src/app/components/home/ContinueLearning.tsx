/**
 * ContinueLearning - Phase 14.2 SPEC §Req 4 + AC #9 + CONTEXT D-14.
 *
 * Async server-component wrapper for the Continue Learning carousel. Renders nothing
 * (entire section omitted from DOM, NOT an empty placeholder per AC #9) when:
 *   - userId is the placeholder (unauth visitor — D-14 anonymous-catalog clean)
 *   - getContinueLearning returns 0 rows (auth user with no in-progress songs)
 *
 * When rows exist: composes SectionHeader (続ける / Continue Learning) + Carousel of
 * ContinueCards in updated_at DESC order (per CONTEXT D-03 sort).
 *
 * page.tsx (Plan 14.2-10) renders <ContinueLearning userId={userId} /> unconditionally
 * for auth users; the wrapper handles all empty-state logic internally.
 */
import { getContinueLearning } from "@/lib/db/queries";
import { PLACEHOLDER_USER_ID } from "@/lib/user-prefs";
import { SectionHeader } from "./SectionHeader";
import { Carousel } from "./Carousel";
import { ContinueCard } from "./ContinueCard";

interface ContinueLearningProps {
  userId: string;
}

export async function ContinueLearning({ userId }: ContinueLearningProps) {
  // D-14 — anonymous-catalog clean: short-circuit BEFORE the DB call.
  if (userId === PLACEHOLDER_USER_ID) {
    return null;
  }

  const rows = await getContinueLearning(userId, 3);

  // SPEC AC #9 — section OMITTED from DOM when empty (not rendered as placeholder).
  if (rows.length === 0) {
    return null;
  }

  return (
    <section data-testid="continue-learning" className="pb-8">
      <SectionHeader
        titleJp="続ける"
        title="Continue Learning"
        viewAll="/path"
        viewAllLabel="Open Path"
      />
      <Carousel testId="continue-learning-carousel" ariaLabel="Continue learning">
        {rows.map((row) => (
          <ContinueCard
            key={row.slug}
            slug={row.slug}
            title={row.title}
            anime={row.anime ?? ""}
            youtube_id={row.youtube_id}
            completion_pct={row.completion_pct}
            stars={row.stars}
          />
        ))}
      </Carousel>
    </section>
  );
}
