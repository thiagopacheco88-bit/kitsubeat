/**
 * Phase 14.2 SPEC AC #5 — / reduced-motion: ka-pulse + ka-aura collapse to 0s.
 *
 * Asserts all NEW consumption sites of the 14.1 keyframes on the / route:
 *   ka-pulse  — ContinueCard PLAY overlay (continue-card-play-overlay)
 *   ka-aura   — ContinueCard mastery aura (continue-card-aura)
 *   ka-aura   — CoverCard mastery aura (cover-card-aura)
 *
 * The lantern-flame ka-flicker assertion is covered by path-reduced-motion.spec.ts
 * (cross-surface — LanternStreak is now in global layout.tsx).
 *
 * NOTE: Assertions on ContinueCard elements are conditional because they require
 * an authenticated user with in-progress songs. When run without the auth bypass
 * configured (PLAYWRIGHT_AUTH=true KB_E2E_AUTH_BYPASS=<id>), these assertions skip
 * gracefully with a note — matching the pattern of path-reduced-motion.spec.ts.
 *
 * The CoverCard assertion uses locator presence to guard against empty catalog state.
 *
 * Per revision Edit 2: uses the fixture-provided page + context so Plan 14.2-01b
 * auth bypass propagates. NEVER creates a new Playwright context manually — that would
 * bypass fixture auth wiring. Uses page.emulateMedia({ reducedMotion: "reduce" })
 * instead of the path-reduced-motion.spec.ts approach of creating a fresh context.
 *
 * Run with auth:
 *   PLAYWRIGHT_AUTH=true KB_E2E_AUTH_BYPASS=test-user-1 \
 *     npx playwright test tests/e2e/home-reduced-motion.spec.ts
 */
import { authenticatedTest as test, expect } from "../support/auth-fixtures";

test.describe("/ reduced-motion — ka-* keyframes resolve to 0s (AC #5)", () => {
  test("ka-pulse + ka-aura collapse to 0s under prefers-reduced-motion", async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Per revision Edit 2: emulate reduced-motion on the fixture-provided context.
    // Using page.emulateMedia avoids creating a fresh context, which would bypass auth fixture wiring.
    await page.emulateMedia({ reducedMotion: "reduce" });

    await context.addCookies([
      {
        name: "kb_theme",
        value: "dark",
        url: "http://localhost:7000",
        sameSite: "Lax",
      },
    ]);

    // Inject mastered hiragana state via localStorage so KanaCheckpointNode
    // renders with data-state="mastered" + the .ka-aura halo class.
    await page.addInitScript(() => {
      const hiraganaGlyphs =
        "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん".split(
          "",
        );
      const masteredHiragana = Object.fromEntries(
        hiraganaGlyphs.map((g) => [
          g,
          {
            masteryLevel: 3,
            successesAt: [Date.now()],
            lastSeenAt: Date.now(),
          },
        ]),
      );
      // kb-kana-progress is the zustand-persist key (verified from path-reduced-motion.spec.ts context)
      window.localStorage.setItem(
        "kb-kana-progress",
        JSON.stringify({
          state: {
            hiragana: masteredHiragana,
            katakana: {},
            sessionsCompleted: 5,
          },
          version: 0,
        }),
      );
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // (1) ka-pulse on ContinueCard PLAY overlay
    //     Conditional: only present when user has in-progress songs (auth + seeded rows).
    const playOverlays = page.locator('[data-testid="continue-card-play-overlay"]');
    const playCount = await playOverlays.count();
    if (playCount > 0) {
      const playDuration = await playOverlays.first().evaluate(
        (el) => window.getComputedStyle(el).animationDuration,
      );
      expect(
        playDuration,
        "ka-pulse [data-testid=continue-card-play-overlay] should have animationDuration 0s under prefers-reduced-motion",
      ).toBe("0s");
    } else {
      console.log(
        "[reduced-motion] ka-pulse: no ContinueCard play overlay visible — assertion skipped (requires auth + in-progress songs)",
      );
    }

    // (2) ka-aura on ContinueCard mastery aura (stars=3 row renders the aura element)
    const continueAuras = page.locator('[data-testid="continue-card-aura"]');
    const continueAuraCount = await continueAuras.count();
    if (continueAuraCount > 0) {
      const continueAuraDuration = await continueAuras.first().evaluate(
        (el) => window.getComputedStyle(el).animationDuration,
      );
      expect(
        continueAuraDuration,
        "ka-aura [data-testid=continue-card-aura] should have animationDuration 0s under prefers-reduced-motion",
      ).toBe("0s");
    } else {
      console.log(
        "[reduced-motion] ka-aura (ContinueCard): no continue-card-aura visible — assertion skipped (requires auth + stars=3 song)",
      );
    }

    // (3) ka-aura on CoverCard mastery aura (stars=3 featured song renders the aura element)
    const coverAuras = page.locator('[data-testid="cover-card-aura"]');
    const coverAuraCount = await coverAuras.count();
    if (coverAuraCount > 0) {
      const coverAuraDuration = await coverAuras.first().evaluate(
        (el) => window.getComputedStyle(el).animationDuration,
      );
      expect(
        coverAuraDuration,
        "ka-aura [data-testid=cover-card-aura] should have animationDuration 0s under prefers-reduced-motion",
      ).toBe("0s");
    } else {
      console.log(
        "[reduced-motion] ka-aura (CoverCard): no cover-card-aura visible — assertion skipped (requires auth + stars=3 featured song)",
      );
    }

    // (4) ka-aura on KanaCheckpointNode mastered aura — seeded via localStorage above.
    //     Conditional: KanaCheckpointNode only renders on / Foundations section.
    const kanaAuras = page.locator(
      '[data-testid^="kana-checkpoint-"][data-state="mastered"] .ka-aura',
    );
    const kanaAuraCount = await kanaAuras.count();
    if (kanaAuraCount > 0) {
      const kanaAuraDuration = await kanaAuras.first().evaluate(
        (el) => window.getComputedStyle(el).animationDuration,
      );
      expect(
        kanaAuraDuration,
        "ka-aura .ka-aura on kana-checkpoint mastered should have animationDuration 0s under prefers-reduced-motion",
      ).toBe("0s");
    } else {
      console.log(
        "[reduced-motion] ka-aura (KanaCheckpointNode): no mastered .ka-aura visible after localStorage seed — assertion skipped",
      );
    }

    // Per revision Edit 2: do NOT close the fixture-provided page/context.
    // Playwright fixture lifecycle manages cleanup.
  });
});
