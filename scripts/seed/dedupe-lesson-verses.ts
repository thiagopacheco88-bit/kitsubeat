/**
 * dedupe-lesson-verses.ts — NEUTRALIZED.
 *
 * This script previously keyed dedup on concatenated-surface tokens, which
 * collapsed legitimate chorus repetitions (verses with identical text that
 * play 2+ times in a song). Running it over the 130-song catalog on 2026-04-19
 * (commit 43c0dac) flattened ~350 chorus repeats and broke in-app lyric sync
 * on kitsubeat.vercel.app (reported by user for /songs/sign-flow and
 * /songs/guren-does).
 *
 * Do NOT run this script. If apply-verse-patch.ts produces duplicates from
 * repeat invocations, fix idempotency in apply-verse-patch.ts directly.
 * To re-align verse order and restore chorus repetitions against WhisperX
 * synced_lrc, use:
 *   npx tsx scripts/seed/restore-verse-order.ts
 */

console.error(
  "[dedupe-lesson-verses] DISABLED — this script collapses chorus repetitions.\n" +
    "Use scripts/seed/restore-verse-order.ts to realign verse order against\n" +
    "synced_lrc (which preserves repeats). Fix apply-verse-patch.ts idempotency\n" +
    "if you're trying to clean up re-apply duplicates."
);
process.exit(1);
