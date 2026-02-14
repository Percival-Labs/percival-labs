// Percival Labs -- Article Scorer + Router
// Scores articles 1-10 for relevance and routes to morning/night/archive.

import Anthropic from '@anthropic-ai/sdk';
import { formatGoalsContext } from '../config';
import type { ParsedArticle, ScoredArticle } from '../types';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

/**
 * Score an article's relevance to Percival Labs on a 1-10 scale.
 * Routes based on score: 7-10 = morning, 4-6 = night, 1-3 = archive.
 */
export async function scoreArticle(
  article: ParsedArticle,
  summary: string,
): Promise<ScoredArticle> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const goalsContext = formatGoalsContext();

  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 256,
    system: `You score articles for Percival Labs on a 1-10 scale.\n\n${goalsContext}`,
    messages: [
      {
        role: 'user',
        content: `Score this article's relevance to Percival Labs. Respond with ONLY a JSON object: {"score": N, "reasoning": "..."}\n\nTitle: ${article.title}\nSummary: ${summary}`,
      },
    ],
  });

  const rawOutput = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('');

  return parseScoreResponse(rawOutput);
}

/** Parse score JSON from LLM response. Falls back to score 5 / night on failure. */
function parseScoreResponse(raw: string): ScoredArticle {
  try {
    // Extract JSON from response (handle markdown code fences)
    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      return fallbackScore(raw);
    }

    const parsed = JSON.parse(jsonMatch[0]) as { score?: number; reasoning?: string };

    if (typeof parsed.score !== 'number' || typeof parsed.reasoning !== 'string') {
      return fallbackScore(raw);
    }

    // Clamp score to 1-10
    const score = Math.max(1, Math.min(10, Math.round(parsed.score)));
    const route = scoreToRoute(score);

    return {
      score,
      route,
      reasoning: parsed.reasoning,
    };
  } catch {
    return fallbackScore(raw);
  }
}

function fallbackScore(raw: string): ScoredArticle {
  return {
    score: 5,
    route: 'night',
    reasoning: `Score parsing failed. Raw response: ${raw.slice(0, 200)}`,
  };
}

function scoreToRoute(score: number): 'morning' | 'night' | 'archive' {
  if (score >= 7) return 'morning';
  if (score >= 4) return 'night';
  return 'archive';
}
