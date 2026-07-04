/**
 * X Scanner -- Response Drafter via Vouch Gateway
 *
 * Classifies engagement opportunities and drafts responses in Alan's voice.
 * Tracks daily usage against maxDailyCalls. Resets at midnight PST.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { GATEWAY, PATHS } from './config.js';
import { log } from './logger.js';
import type { Tweet } from './search.js';

// -- Types ----------------------------------------------------------------

export type Classification = 'reply' | 'quote_tweet' | 'like_only' | 'skip';

export interface DraftResult {
  classification: Classification;
  draftResponse: string;
  reasoning: string;
}

interface GatewayUsage {
  date: string; // YYYY-MM-DD in PST
  calls: number;
}

interface GatewayChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

// -- Usage Tracking -------------------------------------------------------

function getPSTDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

function loadUsage(): GatewayUsage {
  const today = getPSTDate();

  if (existsSync(PATHS.gatewayUsage)) {
    try {
      const raw = JSON.parse(readFileSync(PATHS.gatewayUsage, 'utf-8')) as GatewayUsage;
      if (raw.date === today) return raw;
    } catch {
      // Reset on corrupt file
    }
  }

  return { date: today, calls: 0 };
}

function saveUsage(usage: GatewayUsage): void {
  try {
    writeFileSync(PATHS.gatewayUsage, JSON.stringify(usage, null, 2));
  } catch {
    log('warn', 'drafter', 'Failed to persist gateway usage');
  }
}

function canCallGateway(): boolean {
  const usage = loadUsage();
  return usage.calls < GATEWAY.maxDailyCalls;
}

function recordCall(): void {
  const usage = loadUsage();
  usage.calls += 1;
  saveUsage(usage);
}

// -- System Prompt --------------------------------------------------------

const SYSTEM_PROMPT = `You classify X/Twitter engagement opportunities and draft responses for Alan Carroll.

Alan's voice:
- Direct, practical, anti-guru carpenter who builds AI infrastructure
- No hype, no jargon, never says "game-changing" or "revolutionary"
- Personal experience over abstract claims
- Helpful, not promotional. Show genuine interest in what the person is building.
- Conversational, like a skilled tradesman talking shop
- Under 280 characters for replies

Classify each tweet as one of:
- reply: Worth a direct reply. The person asked a question, shared a struggle, or is in a conversation Alan can genuinely add value to.
- quote_tweet: The tweet makes a point Alan can build on with his own take. Needs more than 280 chars.
- like_only: Interesting but Alan has nothing meaningful to add.
- skip: Spam, self-promotion, or not actually relevant.

Respond with ONLY valid JSON (no markdown, no backticks):
{"classification": "reply|quote_tweet|like_only|skip", "draftResponse": "the draft text or empty string", "reasoning": "one sentence why"}`;

// -- Drafter --------------------------------------------------------------

/**
 * Draft a response for a tweet via the Vouch Gateway.
 * Returns null if daily limit is exceeded or Gateway is unreachable.
 */
export async function draftResponse(tweet: Tweet): Promise<DraftResult | null> {
  if (!canCallGateway()) {
    log('warn', 'drafter', 'Daily Gateway call limit reached', {
      limit: GATEWAY.maxDailyCalls,
    });
    return null;
  }

  const gatewayKey = process.env.EGG_GATEWAY_KEY || '';
  if (!gatewayKey) {
    log('warn', 'drafter', 'EGG_GATEWAY_KEY not set, skipping draft');
    return null;
  }

  const userMessage = `Tweet by @${tweet.authorUsername}:
"${tweet.text}"

Likes: ${tweet.likeCount} | Replies: ${tweet.replyCount} | Retweets: ${tweet.retweetCount}`;

  try {
    const res = await fetch(`${GATEWAY.baseUrl}/auto/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Vouch-Auth': `AgentKey ${gatewayKey}`,
      },
      body: JSON.stringify({
        model: GATEWAY.model,
        max_tokens: GATEWAY.maxTokens,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      log('error', 'drafter', `Gateway request failed (${res.status})`, {
        body: body.slice(0, 200),
      });
      return null;
    }

    recordCall();

    const data = (await res.json()) as GatewayChatResponse;
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      log('warn', 'drafter', 'Gateway returned empty content');
      return null;
    }

    // Parse the JSON response
    const parsed = JSON.parse(content) as DraftResult;

    // Validate classification
    const validClassifications: Classification[] = ['reply', 'quote_tweet', 'like_only', 'skip'];
    if (!validClassifications.includes(parsed.classification)) {
      log('warn', 'drafter', 'Invalid classification from Gateway', {
        raw: content.slice(0, 200),
      });
      return null;
    }

    log('info', 'drafter', `Classified @${tweet.authorUsername} as ${parsed.classification}`, {
      reasoning: parsed.reasoning,
    });

    return {
      classification: parsed.classification,
      draftResponse: parsed.draftResponse || '',
      reasoning: parsed.reasoning || '',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // JSON parse errors mean the Gateway returned non-JSON
    if (message.includes('JSON')) {
      log('warn', 'drafter', 'Gateway returned non-JSON response', { error: message });
    } else {
      log('error', 'drafter', 'Gateway call failed', { error: message });
    }

    return null;
  }
}
