/**
 * KANA_CHART — authoritative kana reference data for the kana trainer.
 *
 * Authoritative source: https://en.wikipedia.org/wiki/Hepburn_romanization (Modified Hepburn)
 *
 * Hardcoded by design (NOT runtime romanization via wanakana — see RESEARCH.md
 * "Don't Hand-Roll"). One pair = one entry: each KanaChar carries both the
 * hiragana and katakana glyphs plus the canonical Hepburn romaji.
 *
 * Includes: 47 base gojūon entries (counts ya-row=3, wa-row=2, n=1 specially),
 * 20 dakuten, 5 handakuten, 33 yōon → 105 entries total.
 *
 * Excluded (deliberately): the archaic ぢゃ/ぢゅ/ぢょ row — modern Japanese
 * drops it; Wikipedia's modern table omits it too.
 */

import type { KanaChar, KanaRow } from "./types";

export const KANA_CHART: KanaChar[] = [
  // === Base gojūon ===

  // a-row (rowOrder 0)
  { hiragana: "あ", katakana: "ア", romaji: "a", rowId: "a", rowKind: "base", rowOrder: 0 },
  { hiragana: "い", katakana: "イ", romaji: "i", rowId: "a", rowKind: "base", rowOrder: 0 },
  { hiragana: "う", katakana: "ウ", romaji: "u", rowId: "a", rowKind: "base", rowOrder: 0 },
  { hiragana: "え", katakana: "エ", romaji: "e", rowId: "a", rowKind: "base", rowOrder: 0 },
  { hiragana: "お", katakana: "オ", romaji: "o", rowId: "a", rowKind: "base", rowOrder: 0 },

  // ka-row (rowOrder 1)
  { hiragana: "か", katakana: "カ", romaji: "ka", rowId: "ka", rowKind: "base", rowOrder: 1 },
  { hiragana: "き", katakana: "キ", romaji: "ki", rowId: "ka", rowKind: "base", rowOrder: 1 },
  { hiragana: "く", katakana: "ク", romaji: "ku", rowId: "ka", rowKind: "base", rowOrder: 1 },
  { hiragana: "け", katakana: "ケ", romaji: "ke", rowId: "ka", rowKind: "base", rowOrder: 1 },
  { hiragana: "こ", katakana: "コ", romaji: "ko", rowId: "ka", rowKind: "base", rowOrder: 1 },

  // sa-row (rowOrder 2) — note: shi (NOT si)
  { hiragana: "さ", katakana: "サ", romaji: "sa", rowId: "sa", rowKind: "base", rowOrder: 2 },
  { hiragana: "し", katakana: "シ", romaji: "shi", rowId: "sa", rowKind: "base", rowOrder: 2 },
  { hiragana: "す", katakana: "ス", romaji: "su", rowId: "sa", rowKind: "base", rowOrder: 2 },
  { hiragana: "せ", katakana: "セ", romaji: "se", rowId: "sa", rowKind: "base", rowOrder: 2 },
  { hiragana: "そ", katakana: "ソ", romaji: "so", rowId: "sa", rowKind: "base", rowOrder: 2 },

  // ta-row (rowOrder 3) — note: chi, tsu
  { hiragana: "た", katakana: "タ", romaji: "ta", rowId: "ta", rowKind: "base", rowOrder: 3 },
  { hiragana: "ち", katakana: "チ", romaji: "chi", rowId: "ta", rowKind: "base", rowOrder: 3 },
  { hiragana: "つ", katakana: "ツ", romaji: "tsu", rowId: "ta", rowKind: "base", rowOrder: 3 },
  { hiragana: "て", katakana: "テ", romaji: "te", rowId: "ta", rowKind: "base", rowOrder: 3 },
  { hiragana: "と", katakana: "ト", romaji: "to", rowId: "ta", rowKind: "base", rowOrder: 3 },

  // na-row (rowOrder 4)
  { hiragana: "な", katakana: "ナ", romaji: "na", rowId: "na", rowKind: "base", rowOrder: 4 },
  { hiragana: "に", katakana: "ニ", romaji: "ni", rowId: "na", rowKind: "base", rowOrder: 4 },
  { hiragana: "ぬ", katakana: "ヌ", romaji: "nu", rowId: "na", rowKind: "base", rowOrder: 4 },
  { hiragana: "ね", katakana: "ネ", romaji: "ne", rowId: "na", rowKind: "base", rowOrder: 4 },
  { hiragana: "の", katakana: "ノ", romaji: "no", rowId: "na", rowKind: "base", rowOrder: 4 },

  // ha-row (rowOrder 5) — note: fu (NOT hu)
  { hiragana: "は", katakana: "ハ", romaji: "ha", rowId: "ha", rowKind: "base", rowOrder: 5 },
  { hiragana: "ひ", katakana: "ヒ", romaji: "hi", rowId: "ha", rowKind: "base", rowOrder: 5 },
  { hiragana: "ふ", katakana: "フ", romaji: "fu", rowId: "ha", rowKind: "base", rowOrder: 5 },
  { hiragana: "へ", katakana: "ヘ", romaji: "he", rowId: "ha", rowKind: "base", rowOrder: 5 },
  { hiragana: "ほ", katakana: "ホ", romaji: "ho", rowId: "ha", rowKind: "base", rowOrder: 5 },

  // ma-row (rowOrder 6)
  { hiragana: "ま", katakana: "マ", romaji: "ma", rowId: "ma", rowKind: "base", rowOrder: 6 },
  { hiragana: "み", katakana: "ミ", romaji: "mi", rowId: "ma", rowKind: "base", rowOrder: 6 },
  { hiragana: "む", katakana: "ム", romaji: "mu", rowId: "ma", rowKind: "base", rowOrder: 6 },
  { hiragana: "め", katakana: "メ", romaji: "me", rowId: "ma", rowKind: "base", rowOrder: 6 },
  { hiragana: "も", katakana: "モ", romaji: "mo", rowId: "ma", rowKind: "base", rowOrder: 6 },

  // ya-row (rowOrder 7) — 3 chars only
  { hiragana: "や", katakana: "ヤ", romaji: "ya", rowId: "ya", rowKind: "base", rowOrder: 7 },
  { hiragana: "ゆ", katakana: "ユ", romaji: "yu", rowId: "ya", rowKind: "base", rowOrder: 7 },
  { hiragana: "よ", katakana: "ヨ", romaji: "yo", rowId: "ya", rowKind: "base", rowOrder: 7 },

  // ra-row (rowOrder 8)
  { hiragana: "ら", katakana: "ラ", romaji: "ra", rowId: "ra", rowKind: "base", rowOrder: 8 },
  { hiragana: "り", katakana: "リ", romaji: "ri", rowId: "ra", rowKind: "base", rowOrder: 8 },
  { hiragana: "る", katakana: "ル", romaji: "ru", rowId: "ra", rowKind: "base", rowOrder: 8 },
  { hiragana: "れ", katakana: "レ", romaji: "re", rowId: "ra", rowKind: "base", rowOrder: 8 },
  { hiragana: "ろ", katakana: "ロ", romaji: "ro", rowId: "ra", rowKind: "base", rowOrder: 8 },

  // wa-row (rowOrder 9) — Hepburn: を = "o"
  { hiragana: "わ", katakana: "ワ", romaji: "wa", rowId: "wa", rowKind: "base", rowOrder: 9 },
  { hiragana: "を", katakana: "ヲ", romaji: "o", rowId: "wa", rowKind: "base", rowOrder: 9 },

  // n-row (rowOrder 10) — singleton
  { hiragana: "ん", katakana: "ン", romaji: "n", rowId: "n", rowKind: "base", rowOrder: 10 },

  // === Dakuten ===

  // ga-row (rowOrder 11)
  { hiragana: "が", katakana: "ガ", romaji: "ga", rowId: "ga", rowKind: "dakuten", rowOrder: 11 },
  { hiragana: "ぎ", katakana: "ギ", romaji: "gi", rowId: "ga", rowKind: "dakuten", rowOrder: 11 },
  { hiragana: "ぐ", katakana: "グ", romaji: "gu", rowId: "ga", rowKind: "dakuten", rowOrder: 11 },
  { hiragana: "げ", katakana: "ゲ", romaji: "ge", rowId: "ga", rowKind: "dakuten", rowOrder: 11 },
  { hiragana: "ご", katakana: "ゴ", romaji: "go", rowId: "ga", rowKind: "dakuten", rowOrder: 11 },

  // za-row (rowOrder 12) — note: ji
  { hiragana: "ざ", katakana: "ザ", romaji: "za", rowId: "za", rowKind: "dakuten", rowOrder: 12 },
  { hiragana: "じ", katakana: "ジ", romaji: "ji", rowId: "za", rowKind: "dakuten", rowOrder: 12 },
  { hiragana: "ず", katakana: "ズ", romaji: "zu", rowId: "za", rowKind: "dakuten", rowOrder: 12 },
  { hiragana: "ぜ", katakana: "ゼ", romaji: "ze", rowId: "za", rowKind: "dakuten", rowOrder: 12 },
  { hiragana: "ぞ", katakana: "ゾ", romaji: "zo", rowId: "za", rowKind: "dakuten", rowOrder: 12 },

  // da-row (rowOrder 13) — homophones with za-row (ji, zu)
  { hiragana: "だ", katakana: "ダ", romaji: "da", rowId: "da", rowKind: "dakuten", rowOrder: 13 },
  { hiragana: "ぢ", katakana: "ヂ", romaji: "ji", rowId: "da", rowKind: "dakuten", rowOrder: 13 },
  { hiragana: "づ", katakana: "ヅ", romaji: "zu", rowId: "da", rowKind: "dakuten", rowOrder: 13 },
  { hiragana: "で", katakana: "デ", romaji: "de", rowId: "da", rowKind: "dakuten", rowOrder: 13 },
  { hiragana: "ど", katakana: "ド", romaji: "do", rowId: "da", rowKind: "dakuten", rowOrder: 13 },

  // ba-row (rowOrder 14)
  { hiragana: "ば", katakana: "バ", romaji: "ba", rowId: "ba", rowKind: "dakuten", rowOrder: 14 },
  { hiragana: "び", katakana: "ビ", romaji: "bi", rowId: "ba", rowKind: "dakuten", rowOrder: 14 },
  { hiragana: "ぶ", katakana: "ブ", romaji: "bu", rowId: "ba", rowKind: "dakuten", rowOrder: 14 },
  { hiragana: "べ", katakana: "ベ", romaji: "be", rowId: "ba", rowKind: "dakuten", rowOrder: 14 },
  { hiragana: "ぼ", katakana: "ボ", romaji: "bo", rowId: "ba", rowKind: "dakuten", rowOrder: 14 },

  // === Handakuten ===

  // pa-row (rowOrder 15)
  { hiragana: "ぱ", katakana: "パ", romaji: "pa", rowId: "pa", rowKind: "handakuten", rowOrder: 15 },
  { hiragana: "ぴ", katakana: "ピ", romaji: "pi", rowId: "pa", rowKind: "handakuten", rowOrder: 15 },
  { hiragana: "ぷ", katakana: "プ", romaji: "pu", rowId: "pa", rowKind: "handakuten", rowOrder: 15 },
  { hiragana: "ぺ", katakana: "ペ", romaji: "pe", rowId: "pa", rowKind: "handakuten", rowOrder: 15 },
  { hiragana: "ぽ", katakana: "ポ", romaji: "po", rowId: "pa", rowKind: "handakuten", rowOrder: 15 },

  // === Yōon (combos) — 2-char strings ===

  // kya-row (rowOrder 16)
  { hiragana: "きゃ", katakana: "キャ", romaji: "kya", rowId: "kya", rowKind: "yoon", rowOrder: 16 },
  { hiragana: "きゅ", katakana: "キュ", romaji: "kyu", rowId: "kya", rowKind: "yoon", rowOrder: 16 },
  { hiragana: "きょ", katakana: "キョ", romaji: "kyo", rowId: "kya", rowKind: "yoon", rowOrder: 16 },

  // sha-row (rowOrder 17)
  { hiragana: "しゃ", katakana: "シャ", romaji: "sha", rowId: "sha", rowKind: "yoon", rowOrder: 17 },
  { hiragana: "しゅ", katakana: "シュ", romaji: "shu", rowId: "sha", rowKind: "yoon", rowOrder: 17 },
  { hiragana: "しょ", katakana: "ショ", romaji: "sho", rowId: "sha", rowKind: "yoon", rowOrder: 17 },

  // cha-row (rowOrder 18)
  { hiragana: "ちゃ", katakana: "チャ", romaji: "cha", rowId: "cha", rowKind: "yoon", rowOrder: 18 },
  { hiragana: "ちゅ", katakana: "チュ", romaji: "chu", rowId: "cha", rowKind: "yoon", rowOrder: 18 },
  { hiragana: "ちょ", katakana: "チョ", romaji: "cho", rowId: "cha", rowKind: "yoon", rowOrder: 18 },

  // nya-row (rowOrder 19)
  { hiragana: "にゃ", katakana: "ニャ", romaji: "nya", rowId: "nya", rowKind: "yoon", rowOrder: 19 },
  { hiragana: "にゅ", katakana: "ニュ", romaji: "nyu", rowId: "nya", rowKind: "yoon", rowOrder: 19 },
  { hiragana: "にょ", katakana: "ニョ", romaji: "nyo", rowId: "nya", rowKind: "yoon", rowOrder: 19 },

  // hya-row (rowOrder 20)
  { hiragana: "ひゃ", katakana: "ヒャ", romaji: "hya", rowId: "hya", rowKind: "yoon", rowOrder: 20 },
  { hiragana: "ひゅ", katakana: "ヒュ", romaji: "hyu", rowId: "hya", rowKind: "yoon", rowOrder: 20 },
  { hiragana: "ひょ", katakana: "ヒョ", romaji: "hyo", rowId: "hya", rowKind: "yoon", rowOrder: 20 },

  // mya-row (rowOrder 21)
  { hiragana: "みゃ", katakana: "ミャ", romaji: "mya", rowId: "mya", rowKind: "yoon", rowOrder: 21 },
  { hiragana: "みゅ", katakana: "ミュ", romaji: "myu", rowId: "mya", rowKind: "yoon", rowOrder: 21 },
  { hiragana: "みょ", katakana: "ミョ", romaji: "myo", rowId: "mya", rowKind: "yoon", rowOrder: 21 },

  // rya-row (rowOrder 22)
  { hiragana: "りゃ", katakana: "リャ", romaji: "rya", rowId: "rya", rowKind: "yoon", rowOrder: 22 },
  { hiragana: "りゅ", katakana: "リュ", romaji: "ryu", rowId: "rya", rowKind: "yoon", rowOrder: 22 },
  { hiragana: "りょ", katakana: "リョ", romaji: "ryo", rowId: "rya", rowKind: "yoon", rowOrder: 22 },

  // gya-row (rowOrder 23)
  { hiragana: "ぎゃ", katakana: "ギャ", romaji: "gya", rowId: "gya", rowKind: "yoon", rowOrder: 23 },
  { hiragana: "ぎゅ", katakana: "ギュ", romaji: "gyu", rowId: "gya", rowKind: "yoon", rowOrder: 23 },
  { hiragana: "ぎょ", katakana: "ギョ", romaji: "gyo", rowId: "gya", rowKind: "yoon", rowOrder: 23 },

  // ja-row (rowOrder 24)
  { hiragana: "じゃ", katakana: "ジャ", romaji: "ja", rowId: "ja", rowKind: "yoon", rowOrder: 24 },
  { hiragana: "じゅ", katakana: "ジュ", romaji: "ju", rowId: "ja", rowKind: "yoon", rowOrder: 24 },
  { hiragana: "じょ", katakana: "ジョ", romaji: "jo", rowId: "ja", rowKind: "yoon", rowOrder: 24 },

  // bya-row (rowOrder 25)
  { hiragana: "びゃ", katakana: "ビャ", romaji: "bya", rowId: "bya", rowKind: "yoon", rowOrder: 25 },
  { hiragana: "びゅ", katakana: "ビュ", romaji: "byu", rowId: "bya", rowKind: "yoon", rowOrder: 25 },
  { hiragana: "びょ", katakana: "ビョ", romaji: "byo", rowId: "bya", rowKind: "yoon", rowOrder: 25 },

  // pya-row (rowOrder 26)
  { hiragana: "ぴゃ", katakana: "ピャ", romaji: "pya", rowId: "pya", rowKind: "yoon", rowOrder: 26 },
  { hiragana: "ぴゅ", katakana: "ピュ", romaji: "pyu", rowId: "pya", rowKind: "yoon", rowOrder: 26 },
  { hiragana: "ぴょ", katakana: "ピョ", romaji: "pyo", rowId: "pya", rowKind: "yoon", rowOrder: 26 },
];

/**
 * Build per-script row groupings from KANA_CHART. Each row's `chars` carry
 * either the hiragana or katakana glyph in BOTH the hiragana and katakana
 * fields collapsed into the active script — but to keep the type stable,
 * we instead expose the original KanaChar (which carries both scripts),
 * and let downstream consumers pick the active glyph via `script`.
 *
 * The label format matches what the row header in the grid will render.
 */
function rowLabel(rowId: string, kind: "base" | "dakuten" | "handakuten" | "yoon"): string {
  switch (kind) {
    case "base":
      return `${rowId}-row`;
    case "dakuten":
      return `${rowId}-row (dakuten)`;
    case "handakuten":
      return `${rowId}-row (handakuten)`;
    case "yoon":
      return `${rowId}-row (yōon)`;
  }
}

function buildRows(): KanaRow[] {
  const byRowId = new Map<string, KanaChar[]>();
  for (const c of KANA_CHART) {
    const list = byRowId.get(c.rowId) ?? [];
    list.push(c);
    byRowId.set(c.rowId, list);
  }
  const rows: KanaRow[] = [];
  for (const [id, chars] of byRowId) {
    const first = chars[0];
    rows.push({
      id,
      kind: first.rowKind,
      label: rowLabel(id, first.rowKind),
      order: first.rowOrder,
      chars,
    });
  }
  rows.sort((a, b) => a.order - b.order);
  return rows;
}

// HIRAGANA_ROWS and KATAKANA_ROWS expose the same row structure; the script
// dimension is selected by consumers via `chars[i].hiragana` vs
// `chars[i].katakana`. They're separate exports so call-sites read clearly
// (e.g. "give me the katakana rows") without a script flag.
export const HIRAGANA_ROWS: KanaRow[] = buildRows();
export const KATAKANA_ROWS: KanaRow[] = buildRows();

/**
 * Tuning constants for row unlock behavior.
 *
 * A row is considered "complete enough" to unlock the next row when at least
 * `ROW_UNLOCK_MASTERY_PCT` of its chars have reached `>= ROW_UNLOCK_MIN_STARS`.
 * Locked here (per CONTEXT "Claude's Discretion") so re-tuning is a 2-line edit.
 */
export const ROW_UNLOCK_MASTERY_PCT = 0.8; // 80% of row chars at >= ROW_UNLOCK_MIN_STARS triggers next-row unlock
export const ROW_UNLOCK_MIN_STARS = 5;
