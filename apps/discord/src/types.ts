// Percival Labs — Discord Bot Types

export interface ArticleInput {
  url: string;
  messageId: string;
  channelId: string;
  authorId: string;
  timestamp: string;
}

export interface ParsedArticle {
  url: string;
  title: string;
  content: string;       // Readability-extracted text
  byline: string | null;
  siteName: string | null;
  excerpt: string | null;
  wordCount: number;
}

export interface LensResult {
  lens: 'summary' | 'strategy' | 'signal';
  output: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

export interface ScoredArticle {
  score: number;          // 1-10
  route: 'morning' | 'night' | 'archive';
  reasoning: string;
}

export interface ProcessedArticle {
  id: string;
  url: string;
  title: string;
  content: string;
  summary: string;
  applyAnalysis: string;
  signalAnalysis: string | null;  // null if no signal detected
  score: number;
  route: 'morning' | 'night' | 'archive';
  discordMessageId: string;
  sourceChannel: string;
  processedAt: string;
}

export interface ChannelMap {
  drop: string;          // Channel IDs
  tldr: string;
  applyThis: string;
  signals: string;
  morningBrief: string;
  nightReads: string;
  archive: string;
}

export interface OpsChannelMap {
  tasks: string;       // Channel IDs
  proposals: string;
  results: string;
  activity: string;
  xContent: string;
}

// Score emoji mapping (1-10)
export const SCORE_EMOJI: Record<number, string> = {
  1: '1\u20E3', 2: '2\u20E3', 3: '3\u20E3', 4: '4\u20E3', 5: '5\u20E3',
  6: '6\u20E3', 7: '7\u20E3', 8: '8\u20E3', 9: '9\u20E3', 10: '\uD83D\uDD1F',
};
