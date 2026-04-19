/**
 * src/lib/types/reward-slots.ts
 *
 * Discriminated-union types for all reward-slot content shapes.
 *
 * v3.0 live cosmetics (3 types): AvatarBorderContent, ColorThemeContent, BadgeContent
 * v4.0 Phase 21 scaffolded (2 types): AnimeSceneContent, CulturalVocabContent
 *
 * Slots with no v3.0 content DO NOT RENDER — Phase 21 fills the scaffolded types
 * without any code changes here (only DB INSERT required).
 *
 * Plan 02's gamification/reward-slots.ts imports RewardSlotDefinition from this file.
 */

// ─── v3.0 Live Cosmetics ─────────────────────────────────────────────────────

export interface AvatarBorderContent {
  type: 'avatar_border';
  css_class: string;
  preview_color: string;
  label: string;
}

export interface ColorThemeContent {
  type: 'color_theme';
  css_vars: Record<string, string>;
  label: string;
}

export interface BadgeContent {
  type: 'badge';
  icon: string;
  label: string;
  description: string;
}

// ─── v4.0 Phase 21 Scaffolded (invisible in v3.0) ───────────────────────────

/** Anime scene cosmetic — media_url is null in v3.0; Phase 21 populates it. */
export interface AnimeSceneContent {
  type: 'anime_scene';
  scene_id: string;
  anime: string;
  title: string;
  description: string;
  media_url: string | null; // null in v3.0 — non-breaking extension hook for Phase 21
}

export interface CulturalVocabContent {
  type: 'cultural_vocab';
  word: string;
  etymology: string;
  explanation: string;
}

// ─── Union + Definition ───────────────────────────────────────────────────────

export type RewardSlotContent =
  | AvatarBorderContent
  | ColorThemeContent
  | BadgeContent
  | AnimeSceneContent
  | CulturalVocabContent;

/**
 * A single reward slot definition — maps a level threshold to typed content.
 *
 * `active: false` means the slot exists in the DB but its content type has
 * no v3.0 renderer; the HUD suppresses it entirely.
 */
export interface RewardSlotDefinition {
  id: string;
  slot_type: RewardSlotContent['type'];
  level_threshold: number;
  content: RewardSlotContent;
  active: boolean;
}
