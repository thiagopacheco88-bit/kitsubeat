CREATE TYPE "public"."difficulty_tier" AS ENUM('basic', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."jlpt_level" AS ENUM('N5', 'N4', 'N3', 'N2', 'N1');--> statement-breakpoint
CREATE TYPE "public"."timing_verified_status" AS ENUM('auto', 'manual');--> statement-breakpoint
CREATE TABLE "songs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"artist" text NOT NULL,
	"anime" text NOT NULL,
	"season_info" text,
	"youtube_id" text,
	"year_launched" integer,
	"genre_tags" text[] DEFAULT '{}' NOT NULL,
	"mood_tags" text[] DEFAULT '{}' NOT NULL,
	"jlpt_level" "jlpt_level",
	"difficulty_tier" "difficulty_tier",
	"lesson" jsonb,
	"lyrics_source" text,
	"content_schema_version" integer DEFAULT 1 NOT NULL,
	"timing_youtube_id" text,
	"timing_data" jsonb,
	"timing_verified" "timing_verified_status" DEFAULT 'auto' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "songs_slug_unique" UNIQUE("slug")
);
