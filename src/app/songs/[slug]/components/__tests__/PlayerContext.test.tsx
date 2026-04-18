// @vitest-environment jsdom
// React 19 requires this flag to enable act() support outside of Testing
// Library. Without it, every render/state-update logs a noisy warning to
// stderr even though the tests pass.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

/**
 * PlayerContext — Phase 10 Plan 02 unit tests.
 *
 * Covers the imperative API surface (`seekTo`, `play`, `pause`, `seekAndPlay`,
 * `_registerApi`, `isReady`) that Plan 10-04's ListeningDrillCard will consume.
 *
 * Harness: a tiny `<Probe>` component captures the context value into a ref on
 * each render so the test can invoke the imperative verbs imperatively (outside
 * a user-event flow). YouTubeEmbed is replaced by `_registerApi(spies)` — the
 * real embed is not mounted because:
 *   - the YT IFrame API is network-dependent and cross-origin;
 *   - the contract under test is the *context wiring*, not YouTube integration.
 *
 * Existing Phase 08.1-05 e2e player-sync specs exercise the real iframe path.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  PlayerProvider,
  usePlayer,
  type PlayerImperativeApi,
} from "../PlayerContext";

// The PlayerProvider sets `embedState` to "loading" on mount. YouTubeEmbed
// normally calls `setEmbedState("ready")` on YT onReady. For `isReady` to flip
// true in tests we mirror that call after registering the api spies.

let root: Root | null = null;
let host: HTMLDivElement | null = null;
let ctxRef: ReturnType<typeof usePlayer> | null = null;

function Probe() {
  const ctx = usePlayer();
  // Capture the latest context value on every render so the test can poke
  // through `ctxRef` without re-rendering.
  ctxRef = ctx;
  // Return nothing visible; we only need the subscription.
  return null;
}

function renderProvider() {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root!.render(
      <PlayerProvider>
        <Probe />
      </PlayerProvider>
    );
  });
}

beforeEach(() => {
  ctxRef = null;
  vi.useFakeTimers();
  renderProvider();
});

afterEach(() => {
  vi.useRealTimers();
  act(() => {
    root?.unmount();
  });
  root = null;
  if (host && host.parentNode) host.parentNode.removeChild(host);
  host = null;
});

function getCtx() {
  if (!ctxRef) throw new Error("Probe did not capture context");
  return ctxRef;
}

function makeSpies(): PlayerImperativeApi & {
  seekTo: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
} {
  return {
    seekTo: vi.fn<(ms: number) => void>(),
    play: vi.fn<() => void>(),
    pause: vi.fn<() => void>(),
  };
}

describe("PlayerContext — initial state", () => {
  it("embedState starts 'loading', isReady=false", () => {
    const ctx = getCtx();
    expect(ctx.embedState).toBe("loading");
    expect(ctx.isReady).toBe(false);
  });

  it("seekTo / play / pause are no-ops before registration (do not throw)", () => {
    const ctx = getCtx();
    // Silence the dev warnings so the test output stays clean.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => ctx.seekTo(5000)).not.toThrow();
    expect(() => ctx.play()).not.toThrow();
    expect(() => ctx.pause()).not.toThrow();
    warn.mockRestore();
  });
});

describe("PlayerContext — _registerApi dispatch", () => {
  it("seekTo(5000) dispatches api.seekTo(5000)", () => {
    const spies = makeSpies();
    act(() => {
      getCtx()._registerApi(spies);
      getCtx().setEmbedState("ready");
    });
    act(() => {
      getCtx().seekTo(5000);
    });
    expect(spies.seekTo).toHaveBeenCalledTimes(1);
    expect(spies.seekTo).toHaveBeenCalledWith(5000);
  });

  it("play() dispatches api.play()", () => {
    const spies = makeSpies();
    act(() => {
      getCtx()._registerApi(spies);
      getCtx().setEmbedState("ready");
    });
    act(() => {
      getCtx().play();
    });
    expect(spies.play).toHaveBeenCalledTimes(1);
  });

  it("pause() dispatches api.pause()", () => {
    const spies = makeSpies();
    act(() => {
      getCtx()._registerApi(spies);
      getCtx().setEmbedState("ready");
    });
    act(() => {
      getCtx().pause();
    });
    expect(spies.pause).toHaveBeenCalledTimes(1);
  });

  it("isReady flips true once api registered AND embedState='ready'", () => {
    expect(getCtx().isReady).toBe(false);
    act(() => {
      getCtx()._registerApi(makeSpies());
    });
    // api registered but embedState still "loading" → not yet ready
    expect(getCtx().isReady).toBe(false);
    act(() => {
      getCtx().setEmbedState("ready");
    });
    expect(getCtx().isReady).toBe(true);
  });

  it("_registerApi(null) after registration: calls become no-ops again", () => {
    const spies = makeSpies();
    act(() => {
      getCtx()._registerApi(spies);
      getCtx().setEmbedState("ready");
    });
    act(() => {
      getCtx()._registerApi(null);
    });
    expect(getCtx().isReady).toBe(false);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    act(() => {
      getCtx().seekTo(1000);
      getCtx().play();
      getCtx().pause();
    });
    expect(spies.seekTo).not.toHaveBeenCalled();
    expect(spies.play).not.toHaveBeenCalled();
    expect(spies.pause).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("PlayerContext — seekAndPlay debounce (Pitfall 2)", () => {
  it("coalesces 10 rapid calls to at most one trailing-edge execution", () => {
    const spies = makeSpies();
    act(() => {
      getCtx()._registerApi(spies);
      getCtx().setEmbedState("ready");
    });
    act(() => {
      for (let i = 0; i < 10; i++) {
        // 40ms apart = 10 calls span 360ms < 400ms debounce window
        getCtx().seekAndPlay(1000 + i * 100);
        vi.advanceTimersByTime(40);
      }
    });
    // Before debounce fires: 0 calls on the wrapped api
    expect(spies.seekTo).not.toHaveBeenCalled();
    expect(spies.pause).not.toHaveBeenCalled();

    // Fire the 400ms debounce timer
    act(() => {
      vi.advanceTimersByTime(400);
    });

    // Exactly one trailing execution: pause → seekTo(last ms) — play is queued
    // 50ms after seek so it has NOT fired yet
    expect(spies.pause).toHaveBeenCalledTimes(1);
    expect(spies.seekTo).toHaveBeenCalledTimes(1);
    // Last ms passed was 1000 + 9*100 = 1900
    expect(spies.seekTo).toHaveBeenCalledWith(1900);
    expect(spies.play).not.toHaveBeenCalled();

    // Advance past the 50ms seek→play gap
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(spies.play).toHaveBeenCalledTimes(1);

    // Hard upper bound the plan asks to assert — no runaway retries
    expect(spies.seekTo.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it("two calls spaced beyond the 400ms window execute independently", () => {
    const spies = makeSpies();
    act(() => {
      getCtx()._registerApi(spies);
      getCtx().setEmbedState("ready");
    });

    act(() => {
      getCtx().seekAndPlay(1000);
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(spies.seekTo).toHaveBeenCalledWith(1000);

    act(() => {
      getCtx().seekAndPlay(5000);
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(spies.seekTo).toHaveBeenCalledWith(5000);
    expect(spies.seekTo).toHaveBeenCalledTimes(2);
  });

  it("seekAndPlay before registration is a silent no-op", () => {
    // No api registered yet. Debounce timer should fire but the inner api
    // dispatch must short-circuit.
    act(() => {
      getCtx().seekAndPlay(1000);
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    // Nothing to assert against (api is null) — just confirm no throw and the
    // ctx remains usable.
    expect(getCtx().isReady).toBe(false);
  });
});

