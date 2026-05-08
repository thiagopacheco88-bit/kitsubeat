// Phase 14.4 Wave 0 stub — filled in by plan 02
import { describe, it, expect } from "vitest";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

describeIfTestDb("getNowPlayingCounts", () => {
  it.todo("includes anon plays (null user_id) toward chip count");
  it.todo("includes plays from users with social_activity_enabled=true");
  it.todo("excludes plays from users with social_activity_enabled=false");
  it.todo("excludes plays older than 30 minutes");
  it.todo("returns empty Map when no plays qualify");
  it.todo("suppresses songs with fewer than 3 distinct plays (HAVING >=3)");
});
