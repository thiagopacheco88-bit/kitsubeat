import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import { songs } from "../../src/lib/db/schema.js";
import { eq } from "drizzle-orm";

const db = getDb();

await db.update(songs).set({ popularity_rank: 1 }).where(eq(songs.slug, "blue-bird-ikimonogakari"));
await db.update(songs).set({ popularity_rank: 3 }).where(eq(songs.slug, "crossing-field-lisa"));

console.log("Done — Blue Bird is now rank 1, crossing field is rank 3.");
process.exit(0);
