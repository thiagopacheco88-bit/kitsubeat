/**
 * src/lib/sfx.ts
 *
 * Phase 12 Plan 06 — Sound effect and haptic helpers for gamification events.
 *
 * Audio: uses HTMLAudioElement (no external audio library — RESEARCH F2).
 * Haptic: uses navigator.vibrate(); silent no-op on iOS (not supported).
 *
 * All helpers are client-only (guard typeof window). Safe to import from
 * client components.
 */

let levelUpAudio: HTMLAudioElement | null = null;

/**
 * Preloads the level-up sound so it plays instantly on trigger.
 * No-op on server (typeof window check).
 */
export function preloadLevelUpSFX(): void {
  if (typeof window === "undefined") return;
  if (!levelUpAudio) {
    levelUpAudio = new Audio("/sounds/level-up.mp3");
    levelUpAudio.preload = "auto";
  }
}

/**
 * Plays the level-up fanfare. Gated on `enabled` so toggling sound_enabled
 * in /profile settings silences it immediately.
 *
 * Autoplay failure is caught and silently discarded (browser policy — will
 * succeed on user-gesture-initiated paths like the "Continue" → session-end
 * flow; may fail on programmatic triggers in some browsers).
 */
export function playLevelUpSFX(enabled: boolean): void {
  if (!enabled) return;
  preloadLevelUpSFX();
  if (!levelUpAudio) return;
  levelUpAudio.currentTime = 0;
  levelUpAudio.play().catch(() => {
    /* autoplay blocked — silent degrade */
  });
}

/**
 * Triggers a haptic pulse via navigator.vibrate().
 * Silent no-op on iOS Safari (API not supported) and when `enabled` is false.
 *
 * @param pattern - millisecond pattern passed to navigator.vibrate()
 */
export function triggerHaptic(
  enabled: boolean,
  pattern: number | number[] = [80, 40, 80]
): void {
  if (!enabled) return;
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* iOS Safari edge case — silent */
  }
}
