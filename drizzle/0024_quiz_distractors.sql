-- Add quiz_distractors column to vocabulary_items
-- Stores vetted wrong answers for short-form video quizzes.
-- Shape: [{ r: "romaji", e: "English meaning" }]
-- Source: videos/word-banks/<series>.json `wrong` arrays

ALTER TABLE "vocabulary_items" ADD COLUMN "quiz_distractors" jsonb;
