/**
 * Text-to-Speech utilities for Japanese pronunciation.
 *
 * Uses the Web Speech API (SpeechSynthesis) — available in all modern browsers.
 * No external TTS service or API key required; audio is synthesized on-device.
 *
 * Design notes:
 * - `hasJapaneseVoice()` is synchronous — call it on render; voices may not be
 *   loaded yet on Chromium (they load async). Call `onVoicesChanged` to re-check
 *   once voices populate.
 * - `speakJapanese()` is user-initiated only — never call on mount (CONTEXT).
 * - This module is client-only; guarded against SSR with `typeof window` checks.
 */

/** Returns true if the browser has at least one Japanese voice available. */
export function hasJapaneseVoice(): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  return window.speechSynthesis
    .getVoices()
    .some((v) => v.lang.startsWith("ja"));
}

/**
 * Speak the given text in Japanese using the best available Japanese voice.
 * No-ops silently if TTS is unavailable or no Japanese voice is found.
 */
export function speakJapanese(text: string): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const voices = window.speechSynthesis.getVoices();
  const jaVoice = voices.find((v) => v.lang.startsWith("ja"));
  if (!jaVoice) return;

  // Cancel any in-progress utterance before starting a new one.
  window.speechSynthesis.cancel();

  const utt = new SpeechSynthesisUtterance(text);
  utt.voice = jaVoice;
  utt.lang = "ja-JP";
  window.speechSynthesis.speak(utt);
}

/**
 * Subscribe to the browser's `voiceschanged` event.
 * Returns an unsubscribe function.
 *
 * Usage in React:
 * ```ts
 * useEffect(() => {
 *   const unsub = onVoicesChanged(() => setVoiceReady(hasJapaneseVoice()));
 *   return unsub;
 * }, []);
 * ```
 */
export function onVoicesChanged(callback: () => void): () => void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return () => {};
  }
  window.speechSynthesis.addEventListener("voiceschanged", callback);
  return () => {
    window.speechSynthesis.removeEventListener("voiceschanged", callback);
  };
}
