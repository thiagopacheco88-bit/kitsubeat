/**
 * anime-carousel.test.ts
 *
 * TDD RED: Written before implementation exists.
 * Tests auth gate, rate limit, and session persistence logic.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  sessionRatelimit: { limit: vi.fn() },
}));

vi.mock("@/lib/gamification/session-integration", () => ({
  applyGamificationUpdate: vi.fn(),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("saveAnimeCarouselSession — auth boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws Unauthorized when auth() returns null userId", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const { saveAnimeCarouselSession } = await import("../anime-carousel");
    await expect(
      saveAnimeCarouselSession({
        animeSlug: "naruto",
        answers: [
          {
            vocabItemId: "00000000-0000-0000-0000-000000000001",
            exerciseType: "vocab_meaning",
            correct: true,
            responseTimeMs: 1200,
          },
        ],
      })
    ).rejects.toThrow("Unauthorized");
  });
});

describe("saveAnimeCarouselSession — rate limit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws when rate limit is exceeded", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as any);

    const { sessionRatelimit } = await import("@/lib/rate-limit");
    vi.mocked(sessionRatelimit.limit).mockResolvedValue({ success: false } as any);

    const { saveAnimeCarouselSession } = await import("../anime-carousel");
    await expect(
      saveAnimeCarouselSession({
        animeSlug: "naruto",
        answers: [
          {
            vocabItemId: "00000000-0000-0000-0000-000000000001",
            exerciseType: "vocab_meaning",
            correct: true,
            responseTimeMs: 1200,
          },
        ],
      })
    ).rejects.toThrow("Rate limit exceeded.");
  });
});

describe("saveAnimeCarouselSession — happy path", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns xpGained, streakDays, correctCount, totalCount on success", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as any);

    const { sessionRatelimit } = await import("@/lib/rate-limit");
    vi.mocked(sessionRatelimit.limit).mockResolvedValue({ success: true } as any);

    const { applyGamificationUpdate } = await import(
      "@/lib/gamification/session-integration"
    );
    vi.mocked(applyGamificationUpdate).mockResolvedValue({
      xpGained: 50,
      xpTotal: 350,
      previousLevel: 3,
      currentLevel: 4,
      leveledUp: true,
      streakCurrent: 7,
      streakBest: 10,
      graceApplied: false,
      milestoneXp: 0,
      rewardSlotPreview: null,
      pathAdvancedTo: null,
      soundEnabled: true,
      hapticsEnabled: false,
    } as any);

    const { saveAnimeCarouselSession } = await import("../anime-carousel");
    const result = await saveAnimeCarouselSession({
      animeSlug: "naruto",
      answers: [
        {
          vocabItemId: "00000000-0000-0000-0000-000000000001",
          exerciseType: "vocab_meaning",
          correct: true,
          responseTimeMs: 1200,
        },
        {
          vocabItemId: "00000000-0000-0000-0000-000000000002",
          exerciseType: "meaning_vocab",
          correct: false,
          responseTimeMs: 2500,
        },
      ],
    });

    expect(result.xpGained).toBe(50);
    expect(result.streakDays).toBe(7);
    expect(result.correctCount).toBe(1);
    expect(result.totalCount).toBe(2);
  });

  it("calls applyGamificationUpdate with sessionType=short and empty songSlug", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({ userId: "user_456" } as any);

    const { sessionRatelimit } = await import("@/lib/rate-limit");
    vi.mocked(sessionRatelimit.limit).mockResolvedValue({ success: true } as any);

    const { applyGamificationUpdate } = await import(
      "@/lib/gamification/session-integration"
    );
    vi.mocked(applyGamificationUpdate).mockResolvedValue({
      xpGained: 10,
      xpTotal: 110,
      previousLevel: 1,
      currentLevel: 1,
      leveledUp: false,
      streakCurrent: 1,
      streakBest: 1,
      graceApplied: false,
      milestoneXp: 0,
      rewardSlotPreview: null,
      pathAdvancedTo: null,
      soundEnabled: false,
      hapticsEnabled: false,
    } as any);

    const { saveAnimeCarouselSession } = await import("../anime-carousel");
    await saveAnimeCarouselSession({
      animeSlug: "attack-on-titan",
      answers: [
        {
          vocabItemId: "00000000-0000-0000-0000-000000000003",
          exerciseType: "vocab_meaning",
          correct: true,
          responseTimeMs: 800,
        },
      ],
      tz: "America/New_York",
    });

    expect(applyGamificationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_456",
        sessionType: "short",
        songSlug: "",
        newStars: 0,
        previousStars: 0,
        tz: "America/New_York",
      })
    );
  });

  it("rejects empty answers array with Zod parse error", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({ userId: "user_789" } as any);

    const { sessionRatelimit } = await import("@/lib/rate-limit");
    vi.mocked(sessionRatelimit.limit).mockResolvedValue({ success: true } as any);

    const { saveAnimeCarouselSession } = await import("../anime-carousel");
    await expect(
      saveAnimeCarouselSession({
        animeSlug: "naruto",
        answers: [],
      })
    ).rejects.toThrow();
  });
});
