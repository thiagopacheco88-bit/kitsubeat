/**
 * 14-seed-reward-slots.ts — Seed the v3.0 cosmetic catalog into reward_slot_definitions.
 *
 * Idempotent: uses ON CONFLICT (id) DO UPDATE so re-running is safe.
 * Seed rows represent the Phase 12 cosmetic unlocks tied to user level thresholds.
 *
 * Streak-milestone rewards (7/30/100-day) are XP-economy grants, NOT reward_slot_definitions
 * rows (per RESEARCH Section 5 note). They are NOT seeded here.
 *
 * v4.0 Phase 21 cultural-content slots (anime scenes, character-name etymology, etc.)
 * will be added via additional INSERT rows into this same table — no code changes needed.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

interface AvatarBorderContent {
  type: "avatar_border";
  css_class: string;
  preview_color: string;
  label: string;
}

interface ColorThemeContent {
  type: "color_theme";
  css_vars: Record<string, string>;
  label: string;
}

interface BadgeContent {
  type: "badge";
  icon: string;
  label: string;
  description: string;
}

type RewardSlotContent = AvatarBorderContent | ColorThemeContent | BadgeContent;

interface RewardSlotRow {
  id: string;
  slot_type: string;
  level_threshold: number;
  content: RewardSlotContent;
}

// v3.0 cosmetic catalog — themed to anime aesthetics, not generic tier-scaling
const REWARD_SLOTS: RewardSlotRow[] = [
  {
    id: "avatar_border_kitsune_fire",
    slot_type: "avatar_border",
    level_threshold: 3,
    content: {
      type: "avatar_border",
      css_class: "ring-4 ring-orange-500",
      preview_color: "#f97316",
      label: "Kitsune Fire",
    },
  },
  {
    id: "color_theme_ember",
    slot_type: "color_theme",
    level_threshold: 7,
    content: {
      type: "color_theme",
      css_vars: { "--color-accent": "#ff6b35" },
      label: "Ember",
    },
  },
  {
    id: "avatar_border_night_fox",
    slot_type: "avatar_border",
    level_threshold: 10,
    content: {
      type: "avatar_border",
      css_class: "ring-4 ring-indigo-400",
      preview_color: "#818cf8",
      label: "Night Fox",
    },
  },
  {
    id: "badge_scholar_fox",
    slot_type: "badge",
    level_threshold: 15,
    content: {
      type: "badge",
      icon: "📚",
      label: "Scholar Fox",
      description: "Reached level 15 — diligent study",
    },
  },
  {
    id: "color_theme_sakura",
    slot_type: "color_theme",
    level_threshold: 20,
    content: {
      type: "color_theme",
      css_vars: { "--color-accent": "#f472b6" },
      label: "Sakura",
    },
  },
];

async function main() {
  console.log("Seeding reward_slot_definitions...\n");

  for (const row of REWARD_SLOTS) {
    const contentJson = JSON.stringify(row.content);
    // Use neon tagged template literal with explicit interpolations
    await sql`
      INSERT INTO reward_slot_definitions (id, slot_type, level_threshold, content, active)
      VALUES (${row.id}, ${row.slot_type}, ${row.level_threshold}, ${contentJson}::jsonb, true)
      ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        level_threshold = EXCLUDED.level_threshold,
        active = EXCLUDED.active
    `;
    console.log(
      `  [${row.level_threshold.toString().padStart(2)}] ${row.id.padEnd(30)} (${row.slot_type})`
    );
  }

  console.log(`\nSeeded ${REWARD_SLOTS.length} reward slot definitions.`);
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
