/**
 * Hand-curated TV lesson rebuild for sign-flow.
 *
 * The TV WhisperX (Demucs-stemmed) produced 4 clean vocal segments. We map
 * each segment to the full-lesson verse range visible in its transcript,
 * then project each verse's TV timing by linear interpolation of its
 * full-lesson timestamp within the segment.
 *
 * Segment 1 (1.35-23.74s):  full v1, v2, v3        (English intro)
 * Segment 2 (26.15-47.63s): full v8, v9, v10, v11  (first JP block)
 * Segment 3 (47.63-71.65s): full v12-v16           (mid JP block)
 * Segment 4 (71.65-84.98s): full v17, v18, v19     (chorus tail)
 *
 * The intermediate (Can you hear me?) chorus parrots and the second-half
 * verses (v22+) are not in the TV cut — TV stops at ~85s.
 */
import { readFileSync, writeFileSync } from "fs";
import { LessonSchema } from "../types/lesson.js";

type Verse = {
  verse_number: number;
  start_time_ms: number;
  end_time_ms: number;
  tokens: Array<{ surface: string }>;
};
type Lesson = {
  verses: Verse[];
  vocabulary: Array<{ surface: string; example_from_song?: string }>;
};

const FULL_PATH = "data/lessons-cache/sign-flow.json";
const TV_OUT = "data/lessons-cache-tv/sign-flow.json";

interface Segment {
  tvStart: number;
  tvEnd: number;
  verses: number[];
}
const SEGMENTS: Segment[] = [
  { tvStart: 1.35, tvEnd: 23.74, verses: [1, 2, 3] },
  { tvStart: 26.15, tvEnd: 47.63, verses: [8, 9, 10, 11] },
  { tvStart: 47.63, tvEnd: 71.65, verses: [12, 13, 14, 15, 16] },
  { tvStart: 71.65, tvEnd: 84.98, verses: [17, 18, 19] },
];

const full = JSON.parse(readFileSync(FULL_PATH, "utf-8")) as Lesson;
const fullByNum = new Map(full.verses.map((v) => [v.verse_number, v]));

const tvVerses: Verse[] = [];
for (const seg of SEGMENTS) {
  const segVerses = seg.verses.map((vno) => fullByNum.get(vno)!).filter(Boolean);
  if (segVerses.length === 0) continue;
  const fullStart = segVerses[0].start_time_ms / 1000;
  const fullEnd = segVerses[segVerses.length - 1].end_time_ms / 1000;
  const fullDur = fullEnd - fullStart;
  const tvDur = seg.tvEnd - seg.tvStart;
  const scale = fullDur > 0 ? tvDur / fullDur : 1;
  for (const v of segVerses) {
    const fullVStart = v.start_time_ms / 1000;
    const fullVEnd = v.end_time_ms / 1000;
    const tvVStart = seg.tvStart + (fullVStart - fullStart) * scale;
    const tvVEnd = seg.tvStart + (fullVEnd - fullStart) * scale;
    tvVerses.push({
      ...v,
      start_time_ms: Math.round(tvVStart * 1000),
      end_time_ms: Math.round(tvVEnd * 1000),
    });
  }
}

tvVerses.forEach((v, i) => (v.verse_number = i + 1));

const detectedText = tvVerses.map((v) => v.tokens.map((t) => t.surface).join("")).join("");
const tvVocab = full.vocabulary.filter((vo) => detectedText.includes(vo.surface));

const tvLesson: Lesson = { ...full, verses: tvVerses, vocabulary: tvVocab };
const parsed = LessonSchema.safeParse(tvLesson);
if (!parsed.success) {
  console.error("schema invalid:");
  parsed.error.errors.slice(0, 5).forEach((e) => console.error(` ${e.path.join(".")}: ${e.message}`));
  process.exit(1);
}

writeFileSync(TV_OUT, JSON.stringify(tvLesson, null, 2), "utf-8");
console.log(`wrote ${TV_OUT} — ${tvVerses.length} verses, ${tvVocab.length} vocab`);
tvVerses.forEach((v) =>
  console.log(`  v${v.verse_number} ${(v.start_time_ms / 1000).toFixed(2)}-${(v.end_time_ms / 1000).toFixed(2)}s ${v.tokens.map((t) => t.surface).join("").slice(0, 40)}`)
);
