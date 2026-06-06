# KitsuBeat Vocabulary Word Banks

Pre-validated word banks for all quiz video series. Each entry includes the correct answer,
3 validated wrong options (no synonyms), and TTS fields.

---

## Series Overview

| Series | File | Parts | Words | Status |
|--------|------|-------|-------|--------|
| One Piece | `one-piece.json` | Parts 2–15 | 70 | ✅ Ready |
| Naruto | `naruto.json` | Parts 1–12 | 60 | ✅ Ready |
| Dragon Ball | `dragon-ball.json` | Parts 1–10 | 50 | ✅ Ready |
| Demon Slayer | `demon-slayer.json` | Parts 1–7 | 35 | ✅ Ready |
| Attack on Titan | `attack-on-titan.json` | Parts 1–6 | 30 | ✅ Ready |
| My Hero Academia | `my-hero-academia.json` | Parts 1–8 | 40 | ✅ Ready |
| **Total** | | **58 parts** | **285 words** | |

Combined with One Piece Part 1 (already rendered): **286 words across 59 parts**.

---

## How to Use

### Making a new video from the bank

1. Pick a series + part number from the JSON
2. Copy the 5 word entries for that part
3. Paste into `index.html` — update the 5 `<div class="scene">` blocks:
   - `.question-text` ← `q` field
   - `.opt-romaji` ← `romaji` field (correct) + 3 `wrong[].r` fields
   - `.kanji-char` ← `jp` field
   - `.kanji-romaji` ← `romaji — en` fields
4. Update `QUESTIONS` array in `<script>` — only `correct` + `wrongs` IDs change
5. Update `generate-audio.js` WORDS array:
   - `jp` ← `hiragana` field (never use kanji — ElevenLabs reads kanji as Mandarin)
   - `en` ← `en` field + period
6. Run: `node generate-audio.js && npx hyperframes render`
7. Mark part as `rendered` in `catalog.json`

### Word entry schema

```json
{
  "id": "umi",
  "q": "How do you say \"Sea\" in Japanese?",
  "jp": "海",
  "hiragana": "うみ",
  "romaji": "umi",
  "en": "Sea",
  "tier": "N5",
  "wrong": [
    {"r": "sora", "e": "Sky"},
    {"r": "shima", "e": "Island"},
    {"r": "kawa", "e": "River"}
  ]
}
```

---

## Difficulty Mix Rule

Every part must include: **2×N5** + **2×N4** + **1×N3** (or harder).

This ensures each video is accessible to beginners (who know N5 words from anime exposure)
while still teaching intermediates something new.

---

## Cross-Series Conflicts

Some common words appear as correct answers in more than one series.
This is intentional — seeing the same word across different anime reinforces learning.
If you prefer strict uniqueness, check this list before producing:

| Word | Appears in |
|------|-----------|
| 夢 yume (dream) | One Piece P3, MHA P7 |
| 笑顔 egao (smiling face) | One Piece P11, MHA P8 |
| 勇気 yūki (courage) | One Piece P11, Dragon Ball P10, MHA P7 |
| 心 kokoro (heart) | One Piece P8, MHA P8 |
| 絆 kizuna (bond) | One Piece P9, MHA P7 |
| 覚醒 kakusei (awakening) | Dragon Ball P6, MHA P4 |
| 成長 seichō (growth) | Dragon Ball P8, MHA P4 |
| 限界 genkai (limit) | Dragon Ball P1, MHA P3 |
| 突破 toppa (breakthrough) | Dragon Ball P1, MHA P7 |
| 弱点 jakuten (weakness) | Dragon Ball P8, MHA P6 |
| 爆発 bakuhatsu (explosion) | Dragon Ball P8, MHA P5 |
| 運命 unmei (fate) | One Piece P4, Dragon Ball P10 |
| 魂 tamashii (soul) | One Piece P8, Dragon Ball P3 |
| 英雄 eiyū (hero) | Naruto P8, AOT P5 |
| 憎しみ nikushimi (hatred) | Naruto P4, AOT P3 |
| 記憶 kioku (memory) | AOT P2, AOT P6 (internal dup — remove one) |
| 友達 tomodachi (friend) | Naruto P8, MHA P8 |
| 覚悟 kakugo (resolve) | One Piece P10, (also wrong ans in P11) |

**Recommendation:** Keep duplicates — spaced repetition across series accelerates retention.

---

## Total Projected Catalog

| Series | Parts (est.) | Target words |
|--------|-------------|-------------|
| One Piece | 15 | 75 |
| Naruto | 12 | 60 |
| Dragon Ball | 10 | 50 |
| My Hero Academia | 8 | 40 |
| Demon Slayer | 7 | 35 |
| Attack on Titan | 6 | 30 |
| Others (Bleach, HxH, etc.) | 12 | 60 |
| **Total** | **70** | **350** |

At 5 words/video × 70 parts = **350 unique vocabulary items across ~70 social media posts**.
With overlaps removed and future series added, hitting **100 posts** is very achievable.
