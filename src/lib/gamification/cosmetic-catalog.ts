/**
 * src/lib/gamification/cosmetic-catalog.ts
 *
 * Human-readable catalog mapping slot_id → render metadata for HUD rendering.
 *
 * PURPOSE: Fast client-render lookups without a DB round-trip. The 5 entries
 * here intentionally mirror the 5 cosmetic rows seeded by Plan 01's DB seed
 * script (drizzle/seeds/gamification-cosmetics.ts). If those seed rows change,
 * this catalog must be updated too.
 *
 * Used by: /path HUD, /profile HUD (Plan 06).
 */

import type { RewardSlotContent } from '../types/reward-slots';

// ─── Catalog constant ─────────────────────────────────────────────────────────

/**
 * Five v3.0 cosmetic entries keyed by slot_id.
 * Matches the rows Plan 01 seeds to the reward_slots DB table.
 */
export const COSMETIC_CATALOG = {
  avatar_border_kitsune_fire: {
    css_class: 'ring-4 ring-orange-500',
    label: 'Kitsune Fire',
  },
  color_theme_ember: {
    css_vars: { '--color-accent': '#ff6b35' },
    label: 'Ember',
  },
  avatar_border_night_fox: {
    css_class: 'ring-4 ring-indigo-400',
    label: 'Night Fox',
  },
  badge_scholar_fox: {
    icon: '📚',
    label: 'Scholar Fox',
  },
  color_theme_sakura: {
    css_vars: { '--color-accent': '#f472b6' },
    label: 'Sakura',
  },
} as const;

export type CosmeticSlotId = keyof typeof COSMETIC_CATALOG;

// ─── Render helper ────────────────────────────────────────────────────────────

/**
 * Returns the render hint string and label for a given slot's content.
 *
 * For avatar_border: returns the Tailwind ring class list.
 * For color_theme: returns CSS variable declarations (e.g. "--color-accent:#ff6b35").
 * For badge: returns the icon string.
 * For v4.0 scaffolded types (anime_scene, cultural_vocab): returns empty strings —
 *   the HUD should gate on `active: false` before calling this, but we handle
 *   gracefully regardless.
 */
export function getCosmeticRenderData(
  slotId: string,
  content: RewardSlotContent
): { render_hint: string; label: string } {
  switch (content.type) {
    case 'avatar_border':
      return {
        render_hint: content.css_class,
        label: content.label,
      };

    case 'color_theme':
      return {
        render_hint: Object.entries(content.css_vars)
          .map(([k, v]) => `${k}:${v}`)
          .join(';'),
        label: content.label,
      };

    case 'badge':
      return {
        render_hint: content.icon,
        label: content.label,
      };

    // v4.0 Phase 21 scaffolded — no renderer in v3.0
    case 'anime_scene':
      return { render_hint: '', label: content.title };

    case 'cultural_vocab':
      return { render_hint: '', label: content.word };

    default: {
      // Exhaustiveness check — TypeScript will catch unhandled variants at compile time
      const _exhaustive: never = content;
      void _exhaustive;
      return { render_hint: '', label: slotId };
    }
  }
}
