/**
 * X Scanner -- Twitter API v2 Search
 *
 * Uses client credentials (OAuth 2.0 App-Only) to search recent tweets.
 * Bearer token cached in memory. Dedup via rolling seen-tweet IDs on disk.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { X_API, PATHS, DEDUP } from './config.js';
import { log } from './logger.js';

// -- Types ----------------------------------------------------------------

export interface Tweet {
  id: string;
  text: string;
  authorUsername: string;
  url: string;
  createdAt: string;
  likeCount: number;
  replyCount: number;
  retweetCount: number;
}

interface TwitterSearchResponse {
  data?: Array<{
    id: string;
    text: string;
    author_id: string;
    created_at?: string;
    public_metrics?: {
      like_count: number;
      reply_count: number;
      retweet_count: number;
      quote_count: number;
    };
  }>;
  includes?: {
    users?: Array<{
      id: string;
      username: string;
    }>;
  };
  meta?: {
    result_count: number;
  };
}

// -- Bearer Token ---------------------------------------------------------

let cachedBearerToken: string | null = null;

async function getBearerToken(): Promise<string> {
  // Check if already cached
  if (cachedBearerToken) return cachedBearerToken;

  // Check for direct bearer token env var
  if (process.env.TWITTER_BEARER_TOKEN) {
    cachedBearerToken = process.env.TWITTER_BEARER_TOKEN;
    return cachedBearerToken;
  }

  // Generate via OAuth 2.0 client credentials
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error(
      'Missing Twitter credentials: set TWITTER_BEARER_TOKEN or both TWITTER_API_KEY + TWITTER_API_SECRET',
    );
  }

  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

  const res = await fetch(X_API.tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Twitter OAuth2 token request failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { access_token: string; token_type: string };
  cachedBearerToken = data.access_token;
  log('info', 'search', 'Bearer token obtained via client credentials');
  return cachedBearerToken;
}

// -- Dedup ----------------------------------------------------------------

let seenIds: Set<string> | null = null;

function loadSeenIds(): Set<string> {
  if (seenIds !== null) return seenIds;

  if (existsSync(PATHS.seenTweets)) {
    try {
      const raw = JSON.parse(readFileSync(PATHS.seenTweets, 'utf-8'));
      if (Array.isArray(raw)) {
        seenIds = new Set(raw.slice(-DEDUP.maxSeenIds));
        return seenIds;
      }
    } catch {
      // Reset on corrupt file
    }
  }

  seenIds = new Set();
  return seenIds;
}

function saveSeenIds(): void {
  const ids = loadSeenIds();
  // Keep only the most recent maxSeenIds
  const arr = Array.from(ids).slice(-DEDUP.maxSeenIds);
  try {
    writeFileSync(PATHS.seenTweets, JSON.stringify(arr, null, 2));
  } catch {
    log('warn', 'search', 'Failed to save seen tweet IDs');
  }
}

function markSeen(tweetId: string): void {
  const ids = loadSeenIds();
  ids.add(tweetId);
  // Trim if over limit
  if (ids.size > DEDUP.maxSeenIds) {
    const arr = Array.from(ids);
    const trimmed = arr.slice(arr.length - DEDUP.maxSeenIds);
    seenIds = new Set(trimmed);
  }
}

function isSeen(tweetId: string): boolean {
  return loadSeenIds().has(tweetId);
}

// -- Search ---------------------------------------------------------------

/**
 * Search Twitter for recent tweets matching a query.
 * Returns only unseen tweets (deduped against rolling window).
 */
export async function searchTweets(query: string): Promise<Tweet[]> {
  const bearer = await getBearerToken();

  const params = new URLSearchParams({
    query,
    max_results: String(X_API.maxResultsPerQuery),
    'tweet.fields': X_API.tweetFields,
    expansions: X_API.expansions,
    'user.fields': X_API.userFields,
  });

  const url = `${X_API.searchUrl}?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${bearer}`,
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');

    // If 401, invalidate cached token so next call re-fetches
    if (res.status === 401) {
      cachedBearerToken = null;
      log('warn', 'search', 'Bearer token expired, will re-fetch next call');
    }

    throw new Error(`Twitter search failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as TwitterSearchResponse;

  if (!data.data || data.data.length === 0) {
    log('debug', 'search', `No results for query: ${query}`);
    return [];
  }

  // Build author lookup
  const authorMap = new Map<string, string>();
  if (data.includes?.users) {
    for (const user of data.includes.users) {
      authorMap.set(user.id, user.username);
    }
  }

  // Filter out already-seen tweets
  const tweets: Tweet[] = [];
  for (const t of data.data) {
    if (isSeen(t.id)) continue;

    const username = authorMap.get(t.author_id) || 'unknown';
    tweets.push({
      id: t.id,
      text: t.text,
      authorUsername: username,
      url: `https://x.com/${username}/status/${t.id}`,
      createdAt: t.created_at || new Date().toISOString(),
      likeCount: t.public_metrics?.like_count ?? 0,
      replyCount: t.public_metrics?.reply_count ?? 0,
      retweetCount: t.public_metrics?.retweet_count ?? 0,
    });

    markSeen(t.id);
  }

  // Persist seen IDs after processing
  saveSeenIds();

  log('info', 'search', `Query returned ${data.data.length} tweets, ${tweets.length} new`, {
    query: query.slice(0, 60),
  });

  return tweets;
}
