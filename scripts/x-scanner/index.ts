/**
 * X Scanner -- Main Daemon
 *
 * Scans X/Twitter for engagement opportunities on a 2-hour tick.
 * Classifies tweets via Gateway, posts actionable ones to Discord.
 * Circuit breaker: 3 consecutive failures triggers 30min backoff.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { SCHEDULE, STATIC_QUERIES, WATCHLIST, GATEWAY, PATHS } from './config.js';
import { log } from './logger.js';
import { searchTweets, type Tweet } from './search.js';
import { draftResponse } from './drafter.js';
import { postOpportunity, type Opportunity } from './discord.js';
import { recordXScannerScore } from './vouch-score.js';
import { syncWatchlist } from './watchlist-sync.js';

// -- Local Pre-Filter (saves Gateway calls) -------------------------------

/** Spam indicators that don't need Gateway classification */
const SPAM_PATTERNS = [
  /\b(?:airdrop|presale|whitelist|ICO|IDO|launchpad)\b/i,
  /\b(?:100x|1000x|moonshot|moon soon|ape in|DYOR|NFA)\b/i,
  /🚀{2,}/, // multiple rocket emojis
  /\$[A-Z]{2,8}\b/, // token tickers ($AGENT, $FET, etc.)
  /#(?:crypto|web3|defi|nft|blockchain)\b/i,
  /(?:join|check out|don't miss).*(?:telegram|discord\.gg|t\.me)\b/i,
];

/** Minimum engagement threshold — zero-engagement tweets from unknown accounts are noise */
const MIN_ENGAGEMENT = 0; // likes + replies + retweets

function passesLocalFilter(tweet: Tweet): boolean {
  const text = tweet.text;

  // Check spam patterns
  let spamHits = 0;
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) spamHits++;
  }
  // 2+ spam signals = drop
  if (spamHits >= 2) return false;

  // Single spam signal + zero engagement = drop
  const engagement = tweet.likeCount + tweet.replyCount + tweet.retweetCount;
  if (spamHits >= 1 && engagement <= MIN_ENGAGEMENT) return false;

  return true;
}

// -- State ----------------------------------------------------------------

let tickCounter = 0;
let consecutiveFailures = 0;
let circuitBreakerUntil = 0;
let shutdownRequested = false;
let tickTimer: ReturnType<typeof setTimeout> | null = null;

// -- Report ---------------------------------------------------------------

interface TickReport {
  agent: string;
  timestamp: string;
  status: string;
  tick: number;
  queriesSearched: string[];
  tweetsFound: number;
  opportunities: number;
  discordPosted: number;
  errors: string[];
}

function writeReport(report: TickReport): void {
  try {
    writeFileSync(PATHS.reportFile, JSON.stringify(report, null, 2));
  } catch {
    log('warn', 'main', 'Failed to write report file');
  }
}

// -- Tick Logic -----------------------------------------------------------

async function tick(): Promise<void> {
  if (shutdownRequested) return;

  // Circuit breaker check
  if (Date.now() < circuitBreakerUntil) {
    const remainingMs = circuitBreakerUntil - Date.now();
    const remainingMin = Math.ceil(remainingMs / 60_000);
    log('warn', 'main', `Circuit breaker active, skipping tick (${remainingMin}m remaining)`);
    return;
  }

  tickCounter += 1;
  log('info', 'main', `--- Tick #${tickCounter} ---`);

  // Sync watchlist from Discord #watchlist channel
  await syncWatchlist();

  const report: TickReport = {
    agent: 'x-scanner',
    timestamp: new Date().toISOString(),
    status: 'running',
    tick: tickCounter,
    queriesSearched: [],
    tweetsFound: 0,
    opportunities: 0,
    discordPosted: 0,
    errors: [],
  };

  try {
    // Build query list: watchlist users (always) + rotating static queries
    const queries: string[] = [];

    // Load watchlist — every watched user gets a query every tick
    try {
      if (existsSync(WATCHLIST.filePath)) {
        const wl = JSON.parse(readFileSync(WATCHLIST.filePath, 'utf-8'));
        const xHandles = (wl.x || []) as Array<{ handle: string }>;
        for (const entry of xHandles) {
          queries.push(`from:${entry.handle} -is:retweet`);
        }
        log('info', 'main', `Watchlist: ${xHandles.length} X handles loaded`);
      }
    } catch (err) {
      log('warn', 'main', 'Failed to load watchlist', { error: (err as Error).message });
    }

    // Add rotating static queries to fill remaining slots
    const staticSlots = Math.max(1, SCHEDULE.queriesPerTick - queries.length);
    const startIdx = ((tickCounter - 1) * staticSlots) % STATIC_QUERIES.length;
    for (let i = 0; i < staticSlots; i++) {
      const idx = (startIdx + i) % STATIC_QUERIES.length;
      queries.push(STATIC_QUERIES[idx]);
    }

    report.queriesSearched = queries;

    // Search each query
    const allTweets: Tweet[] = [];

    for (const query of queries) {
      if (shutdownRequested) break;

      try {
        const tweets = await searchTweets(query);
        allTweets.push(...tweets);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log('error', 'main', `Search failed for query`, { query: query.slice(0, 60), error: msg });
        report.errors.push(`search: ${msg.slice(0, 100)}`);
      }
    }

    report.tweetsFound = allTweets.length;
    log('info', 'main', `Found ${allTweets.length} new tweets across ${queries.length} queries`);

    // Pre-filter obvious spam locally before burning Gateway calls
    const filteredTweets = allTweets.filter((t) => passesLocalFilter(t));
    const filtered = allTweets.length - filteredTweets.length;
    if (filtered > 0) {
      log('info', 'main', `Local filter removed ${filtered} low-signal tweets`);
    }

    // Classify and draft for each tweet
    for (const tweet of filteredTweets) {
      if (shutdownRequested) break;

      const draft = await draftResponse(tweet);

      const opp: Opportunity = {
        tweet,
        classification: draft?.classification ?? 'skip',
        draftResponse: draft?.draftResponse ?? '',
        reasoning: draft?.reasoning ?? 'Gateway unavailable',
      };

      // If Gateway can't classify, DROP — don't flood the channel
      if (!draft) {
        log('debug', 'main', `Dropping unclassified tweet by @${tweet.authorUsername} (Gateway unavailable)`);
        continue;
      }

      if (opp.classification === 'reply' || opp.classification === 'quote_tweet') {
        report.opportunities += 1;

        const posted = await postOpportunity(opp);
        if (posted) {
          report.discordPosted += 1;
        }
      } else {
        // Still log non-actionable ones
        await postOpportunity(opp);
      }
    }

    // Success — reset circuit breaker
    consecutiveFailures = 0;
    report.status = 'ok';

    log('info', 'main', `Tick #${tickCounter} complete`, {
      found: report.tweetsFound,
      opportunities: report.opportunities,
      posted: report.discordPosted,
    });

    // Vouch score after successful tick
    recordXScannerScore(PATHS.reportFile, {
      tweetsFound: report.tweetsFound,
      queriesSearched: report.queriesSearched.length,
      opportunities: report.opportunities,
      totalClassified: report.tweetsFound,
      draftsGenerated: report.opportunities, // Each opportunity got a draft
      discordPosted: report.discordPosted,
      errorCount: report.errors.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log('error', 'main', `Tick #${tickCounter} failed`, { error: msg });
    report.errors.push(msg.slice(0, 200));
    report.status = 'error';

    consecutiveFailures += 1;
    if (consecutiveFailures >= GATEWAY.circuitBreakerThreshold) {
      circuitBreakerUntil = Date.now() + GATEWAY.circuitBreakerCooldownMs;
      log('warn', 'main', `Circuit breaker tripped after ${consecutiveFailures} consecutive failures`, {
        cooldownMs: GATEWAY.circuitBreakerCooldownMs,
      });
    }
  }

  writeReport(report);
}

// -- Lifecycle ------------------------------------------------------------

function scheduleNextTick(): void {
  if (shutdownRequested) return;

  tickTimer = setTimeout(async () => {
    await tick();
    scheduleNextTick();
  }, SCHEDULE.tickIntervalMs);
}

function shutdown(signal: string): void {
  if (shutdownRequested) return;
  shutdownRequested = true;

  log('info', 'main', `Received ${signal}, shutting down gracefully`);

  if (tickTimer) {
    clearTimeout(tickTimer);
    tickTimer = null;
  }

  // Write final report
  writeReport({
    agent: 'x-scanner',
    timestamp: new Date().toISOString(),
    status: 'stopped',
    tick: tickCounter,
    queriesSearched: [],
    tweetsFound: 0,
    opportunities: 0,
    discordPosted: 0,
    errors: [`Shutdown via ${signal}`],
  });

  log('info', 'main', 'X Scanner stopped');
  process.exit(0);
}

// -- Main -----------------------------------------------------------------

async function main(): Promise<void> {
  log('info', 'main', 'X Scanner starting', {
    tickIntervalMs: SCHEDULE.tickIntervalMs,
    queriesPerTick: SCHEDULE.queriesPerTick,
    staticQueries: STATIC_QUERIES.length,
  });

  // Register shutdown handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Run first tick immediately
  await tick();

  // Schedule subsequent ticks
  scheduleNextTick();

  log('info', 'main', 'X Scanner running, next tick in 2 hours');
}

main().catch((err) => {
  log('error', 'main', 'Fatal error', { error: String(err) });
  process.exit(1);
});
