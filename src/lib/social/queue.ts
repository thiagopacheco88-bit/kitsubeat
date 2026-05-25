/**
 * Reads pre-generated social posts from src/data/social-queue.json.
 * The queue is generated offline (scripts/generate-social-queue.ts)
 * so the cron never needs to call the Anthropic API.
 */
import queueData from "@/data/social-queue.json";

export type QueueEntry = {
  date: string;
  type: "vocab" | "quiz" | "article";
  tweets: string[];
};

export function getQueueEntryForDate(dateKey: string): QueueEntry | null {
  return (queueData.queue as QueueEntry[]).find(e => e.date === dateKey) ?? null;
}
