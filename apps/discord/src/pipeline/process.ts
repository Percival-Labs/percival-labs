// Percival Labs -- Article Processor (Fan-out Agent Lenses)
// Runs 3 parallel Anthropic API calls against article content:
//   1. Summarizer -- 5 bullet points
//   2. Strategist -- relevance to PL goals
//   3. Signal detector -- time-sensitive insights

import Anthropic from '@anthropic-ai/sdk';
import { formatGoalsContext } from '../config';
import { sandboxContent } from '@percival/shared';
import type { ParsedArticle, LensResult } from '../types';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

/**
 * Process an article through 3 parallel agent lenses.
 * Returns an array of LensResult (summary, strategy, signal).
 */
export async function processArticle(article: ParsedArticle): Promise<LensResult[]> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Sandbox the article content before passing to any LLM
  const sandboxed = sandboxContent(article.content, {
    label: 'article',
    maxLength: 50_000,
  });

  const results = await Promise.all([
    runSummarizer(client, sandboxed),
    runStrategist(client, article.title, sandboxed),
    runSignalDetector(client, article.title, sandboxed),
  ]);

  return results;
}

async function runSummarizer(
  client: Anthropic,
  sandboxedContent: string,
): Promise<LensResult> {
  const start = Date.now();

  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 1024,
    system: 'You are a concise article summarizer for Percival Labs.',
    messages: [
      {
        role: 'user',
        content: `Summarize this article in exactly 5 bullet points. Be specific and include key data points.\n\n${sandboxedContent}`,
      },
    ],
  });

  const durationMs = Date.now() - start;
  const output = extractTextContent(response);

  return {
    lens: 'summary',
    output,
    model: HAIKU_MODEL,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    durationMs,
  };
}

async function runStrategist(
  client: Anthropic,
  title: string,
  sandboxedContent: string,
): Promise<LensResult> {
  const start = Date.now();
  const goalsContext = formatGoalsContext();

  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 1024,
    system: `You are a strategic analyst for Percival Labs.\n\n${goalsContext}`,
    messages: [
      {
        role: 'user',
        content: `Analyze how this article is relevant to Percival Labs' goals. What can we apply? What should we build or change?\n\nTitle: ${title}\n\n${sandboxedContent}`,
      },
    ],
  });

  const durationMs = Date.now() - start;
  const output = extractTextContent(response);

  return {
    lens: 'strategy',
    output,
    model: HAIKU_MODEL,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    durationMs,
  };
}

async function runSignalDetector(
  client: Anthropic,
  title: string,
  sandboxedContent: string,
): Promise<LensResult> {
  const start = Date.now();

  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 512,
    system: 'You detect time-sensitive signals and high-value insights. Only flag genuinely urgent or high-alpha items.',
    messages: [
      {
        role: 'user',
        content: `Is there anything time-sensitive, urgent, or uniquely valuable in this article? If YES, explain what and why it matters now. If NO, respond with exactly 'NO_SIGNAL'.\n\nTitle: ${title}\n\n${sandboxedContent}`,
      },
    ],
  });

  const durationMs = Date.now() - start;
  const rawOutput = extractTextContent(response);

  // If no signal detected, mark output as null indicator
  const isNoSignal = rawOutput.trim() === 'NO_SIGNAL';

  return {
    lens: 'signal',
    output: isNoSignal ? '' : rawOutput,
    model: HAIKU_MODEL,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    durationMs,
  };
}

/** Extract text from Anthropic message response content blocks. */
function extractTextContent(response: Anthropic.Message): string {
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('\n');
}
