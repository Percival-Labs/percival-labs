// scripts/x/types.ts — Unified X Queue Schema

export type PostType = "tweet" | "thread" | "qrt";

export interface QueuePhase {
  label: string;
  type: PostType;
  content: string | string[]; // string for tweet/qrt, string[] for thread
  quoteTweetId?: string; // QRT only
  delayMinutes?: number; // delay after previous phase completes (default: 0)
  chainToPrevious?: boolean; // reply to previous phase's last tweet (default: true)
  // Execution state (set by processor):
  posted?: boolean;
  postedAt?: string;
  tweetIds?: string[];
  scheduledAt?: string; // computed absolute time
  error?: string;
  retries?: number;
}

export interface QueueCampaign {
  id: string; // e.g. "agents-of-chaos-2026-02-24"
  label: string;
  scheduled: string; // ISO timestamp for phase 0
  phases: QueuePhase[];
  replyTo?: string; // --continue use case
  notes?: string;
  status?: "pending" | "active" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
}

/** Old queue format for backward compatibility */
export interface LegacyQueueItem {
  scheduled: string;
  content: string[];
  posted?: boolean;
  postedAt?: string;
  label?: string;
  replyTo?: string;
}
