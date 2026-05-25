/**
 * COUNTERS_CHART — the 10 essential Japanese counters.
 *
 * Covers JLPT N5 core: 本, 枚, 匹, 頭, 台, 個, 冊, 杯, 人, 回.
 * All forms (1–10) are hardcoded with the correct phonetic mutations
 * (rendaku, gemination) per standard JLPT N5/N4 reference material.
 *
 * Unlock order is 0-based; mastering counter N unlocks counter N+1.
 */

import type { Counter, CounterCategory } from "./types";

export const COUNTERS_CHART: Counter[] = [
  // ── Objects ─────────────────────────────────────────────────────────────
  {
    id: "hon",
    kanji: "本",
    reading: "hon",
    what: "long/thin objects",
    examples: ["pen", "bottle", "umbrella"],
    category: "objects",
    order: 0,
    forms: {
      1:  "いっぽん",
      2:  "にほん",
      3:  "さんぼん",
      4:  "よんほん",
      5:  "ごほん",
      6:  "ろっぽん",
      7:  "ななほん",
      8:  "はっぽん",
      9:  "きゅうほん",
      10: "じゅっぽん",
    },
    formRomaji: {
      1:  "ippon",
      2:  "nihon",
      3:  "sanbon",
      4:  "yonhon",
      5:  "gohon",
      6:  "roppon",
      7:  "nanahon",
      8:  "happon",
      9:  "kyuhon",
      10: "juppon",
    },
  },
  {
    id: "mai",
    kanji: "枚",
    reading: "mai",
    what: "flat objects",
    examples: ["paper", "plate", "ticket"],
    category: "objects",
    order: 1,
    forms: {
      1:  "いちまい",
      2:  "にまい",
      3:  "さんまい",
      4:  "よんまい",
      5:  "ごまい",
      6:  "ろくまい",
      7:  "ななまい",
      8:  "はちまい",
      9:  "きゅうまい",
      10: "じゅうまい",
    },
    formRomaji: {
      1:  "ichimai",
      2:  "nimai",
      3:  "sanmai",
      4:  "yonmai",
      5:  "gomai",
      6:  "rokumai",
      7:  "nanamai",
      8:  "hachimai",
      9:  "kyumai",
      10: "jumai",
    },
  },
  {
    id: "ko",
    kanji: "個",
    reading: "ko",
    what: "small objects",
    examples: ["egg", "stone", "button"],
    category: "objects",
    order: 2,
    forms: {
      1:  "いっこ",
      2:  "にこ",
      3:  "さんこ",
      4:  "よんこ",
      5:  "ごこ",
      6:  "ろっこ",
      7:  "ななこ",
      8:  "はっこ",
      9:  "きゅうこ",
      10: "じゅっこ",
    },
    formRomaji: {
      1:  "ikko",
      2:  "niko",
      3:  "sanko",
      4:  "yonko",
      5:  "goko",
      6:  "rokko",
      7:  "nanako",
      8:  "hakko",
      9:  "kyuko",
      10: "jukko",
    },
  },
  {
    id: "satsu",
    kanji: "冊",
    reading: "satsu",
    what: "bound books",
    examples: ["book", "notebook", "manga"],
    category: "objects",
    order: 3,
    forms: {
      1:  "いっさつ",
      2:  "にさつ",
      3:  "さんさつ",
      4:  "よんさつ",
      5:  "ごさつ",
      6:  "ろくさつ",
      7:  "ななさつ",
      8:  "はっさつ",
      9:  "きゅうさつ",
      10: "じゅっさつ",
    },
    formRomaji: {
      1:  "issatsu",
      2:  "nisatsu",
      3:  "sansatsu",
      4:  "yonsatsu",
      5:  "gosatsu",
      6:  "rokusatsu",
      7:  "nanasatsu",
      8:  "hassatsu",
      9:  "kyusatsu",
      10: "jussatsu",
    },
  },

  // ── Living things ────────────────────────────────────────────────────────
  {
    id: "hiki",
    kanji: "匹",
    reading: "hiki",
    what: "small animals",
    examples: ["cat", "dog", "fish"],
    category: "living",
    order: 4,
    forms: {
      1:  "いっぴき",
      2:  "にひき",
      3:  "さんびき",
      4:  "よんひき",
      5:  "ごひき",
      6:  "ろっぴき",
      7:  "ななひき",
      8:  "はっぴき",
      9:  "きゅうひき",
      10: "じゅっぴき",
    },
    formRomaji: {
      1:  "ippiki",
      2:  "nihiki",
      3:  "sanbiki",
      4:  "yonhiki",
      5:  "gohiki",
      6:  "roppiki",
      7:  "nanahiki",
      8:  "happiki",
      9:  "kyuhiki",
      10: "juppiki",
    },
  },
  {
    id: "tou",
    kanji: "頭",
    reading: "tou",
    what: "large animals",
    examples: ["horse", "elephant", "cow"],
    category: "living",
    order: 5,
    forms: {
      1:  "いっとう",
      2:  "にとう",
      3:  "さんとう",
      4:  "よんとう",
      5:  "ごとう",
      6:  "ろくとう",
      7:  "ななとう",
      8:  "はっとう",
      9:  "きゅうとう",
      10: "じゅっとう",
    },
    formRomaji: {
      1:  "ittou",
      2:  "nitou",
      3:  "santou",
      4:  "yontou",
      5:  "gotou",
      6:  "rokutou",
      7:  "nanatou",
      8:  "hattou",
      9:  "kyutou",
      10: "juttou",
    },
  },
  {
    id: "nin",
    kanji: "人",
    reading: "nin",
    what: "people",
    examples: ["student", "friend", "person"],
    category: "living",
    order: 6,
    forms: {
      1:  "ひとり",      // special: hitori (not ichinin)
      2:  "ふたり",      // special: futari (not ninin)
      3:  "さんにん",
      4:  "よにん",
      5:  "ごにん",
      6:  "ろくにん",
      7:  "しちにん",
      8:  "はちにん",
      9:  "きゅうにん",
      10: "じゅうにん",
    },
    formRomaji: {
      1:  "hitori",
      2:  "futari",
      3:  "sannin",
      4:  "yonin",
      5:  "gonin",
      6:  "rokunin",
      7:  "shichinin",
      8:  "hachinin",
      9:  "kyunin",
      10: "junin",
    },
  },

  // ── Vessels & Machines ───────────────────────────────────────────────────
  {
    id: "hai",
    kanji: "杯",
    reading: "hai",
    what: "cups / glasses",
    examples: ["cup of tea", "glass of water", "bowl of rice"],
    category: "vessels-machines",
    order: 7,
    forms: {
      1:  "いっぱい",
      2:  "にはい",
      3:  "さんばい",
      4:  "よんはい",
      5:  "ごはい",
      6:  "ろっぱい",
      7:  "ななはい",
      8:  "はっぱい",
      9:  "きゅうはい",
      10: "じゅっぱい",
    },
    formRomaji: {
      1:  "ippai",
      2:  "nihai",
      3:  "sanbai",
      4:  "yonhai",
      5:  "gohai",
      6:  "roppai",
      7:  "nanahai",
      8:  "happai",
      9:  "kyuhai",
      10: "juppai",
    },
  },
  {
    id: "dai",
    kanji: "台",
    reading: "dai",
    what: "machines / vehicles",
    examples: ["car", "computer", "TV"],
    category: "vessels-machines",
    order: 8,
    forms: {
      1:  "いちだい",
      2:  "にだい",
      3:  "さんだい",
      4:  "よんだい",
      5:  "ごだい",
      6:  "ろくだい",
      7:  "ななだい",
      8:  "はちだい",
      9:  "きゅうだい",
      10: "じゅうだい",
    },
    formRomaji: {
      1:  "ichidai",
      2:  "nidai",
      3:  "sandai",
      4:  "yondai",
      5:  "godai",
      6:  "rokudai",
      7:  "nanadai",
      8:  "hachidai",
      9:  "kyudai",
      10: "judai",
    },
  },

  // ── Occurrences ──────────────────────────────────────────────────────────
  {
    id: "kai",
    kanji: "回",
    reading: "kai",
    what: "times / occurrences",
    examples: ["once", "twice", "three times"],
    category: "occurrences",
    order: 9,
    forms: {
      1:  "いっかい",
      2:  "にかい",
      3:  "さんかい",
      4:  "よんかい",
      5:  "ごかい",
      6:  "ろっかい",
      7:  "ななかい",
      8:  "はっかい",
      9:  "きゅうかい",
      10: "じゅっかい",
    },
    formRomaji: {
      1:  "ikkai",
      2:  "nikai",
      3:  "sankai",
      4:  "yonkai",
      5:  "gokai",
      6:  "rokkai",
      7:  "nanakai",
      8:  "hakkai",
      9:  "kyukai",
      10: "jukkai",
    },
  },
];

/** Sorted by unlock order (already is, but explicit for safety). */
export const COUNTERS_ORDERED: Counter[] = [...COUNTERS_CHART].sort(
  (a, b) => a.order - b.order,
);

/** Groups for the landing-page grid. */
export type CounterGroupDef = {
  category: CounterCategory;
  label: string;
  counters: Counter[];
};

export function buildCounterGroups(): CounterGroupDef[] {
  const categoryMeta: Record<CounterCategory, { label: string; order: number }> = {
    objects:           { label: "Objects  (もの)",          order: 0 },
    living:            { label: "Living things  (いきもの)",  order: 1 },
    "vessels-machines":{ label: "Vessels & Machines",        order: 2 },
    occurrences:       { label: "Occurrences  (こと)",        order: 3 },
  };
  const map = new Map<CounterCategory, Counter[]>();
  for (const c of COUNTERS_ORDERED) {
    const list = map.get(c.category) ?? [];
    list.push(c);
    map.set(c.category, list);
  }
  return [...map.entries()]
    .map(([cat, counters]) => ({
      category: cat,
      label: categoryMeta[cat].label,
      counters,
    }))
    .sort(
      (a, b) =>
        categoryMeta[a.category].order - categoryMeta[b.category].order,
    );
}

export const COUNTER_GROUPS: CounterGroupDef[] = buildCounterGroups();

/**
 * Tuning constants — unlock next counter when the current one reaches
 * >= COUNTER_UNLOCK_MIN_STARS on at least COUNTER_UNLOCK_PCT of its 10 forms.
 * (Since mastery is tracked per counter, not per form, we use the single star
 * count directly: unlock when mastery >= COUNTER_UNLOCK_MIN_STARS.)
 */
export const COUNTER_UNLOCK_MIN_STARS = 5;

/** Map kanji numbers for use in reading→meaning question prompts. */
export const NUMBER_KANJI: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10, string> = {
  1: "一", 2: "二", 3: "三", 4: "四", 5: "五",
  6: "六", 7: "七", 8: "八", 9: "九", 10: "十",
};
