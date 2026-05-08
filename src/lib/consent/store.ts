/**
 * Cookie consent Zustand store.
 *
 * Tracks the user's consent decision in client-side memory so UI components
 * (PostHog gate, CookieConsentBanner) can react without a server round-trip.
 *
 * Persistence: the browser `kb_consent` cookie is the persistence layer
 * (written by recordConsent() server action). No Zustand persist middleware
 * is used — initialise state from SSR cookie prop passed to CookieConsentBanner.
 */
import { create } from "zustand";

type ConsentState = "unknown" | "granted" | "rejected";

interface ConsentStore {
  /** Current consent state; "unknown" means the user has not yet decided. */
  state: ConsentState;
  /** Mark consent as granted — enables analytics (PostHog). */
  setGranted: () => void;
  /** Mark consent as rejected — keeps non-essential scripts blocked. */
  setRejected: () => void;
}

export const useConsentStore = create<ConsentStore>((set) => ({
  state: "unknown",
  setGranted: () => set({ state: "granted" }),
  setRejected: () => set({ state: "rejected" }),
}));
