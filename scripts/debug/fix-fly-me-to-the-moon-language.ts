/**
 * One-off fix: set fly-me-to-the-moon-claire language to "en".
 * The song has 100% English lyrics (no CJK chars) and was incorrectly
 * stored as "ja", causing it to appear in the beginner carousel.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/debug/fix-fly-me-to-the-moon-language.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { eq } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";
import { songs } from "../../src/lib/db/schema.js";

const db = getDb();
const SLUG = "fly-me-to-the-moon-claire";

const [before] = await db
  .select({ slug: songs.slug, language: songs.language })
  .from(songs)
  .where(eq(songs.slug, SLUG));

if (!before) {
  console.error(`Song not found: ${SLUG}`);
  process.exit(1);
}

console.log("Before:", before);

await db
  .update(songs)
  .set({ language: "en" })
  .where(eq(songs.slug, SLUG));

const [after] = await db
  .select({ slug: songs.slug, language: songs.language })
  .from(songs)
  .where(eq(songs.slug, SLUG));

console.log("After: ", after);
console.log("Done — song will be filtered from all learning carousels.");
