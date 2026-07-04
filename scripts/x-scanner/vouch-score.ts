/**
 * X Scanner -- Internal Vouch Score
 *
 * Computes a 0-100 quality score per tick based on:
 *   - Discovery rate (25): tweets found per query
 *   - Classification quality (25): reply/quote vs skip ratio
 *   - Draft generation (20): successful drafts / opportunities
 *   - Discord delivery (15): successfully posted to Discord
 *   - Dedup effectiveness (15): new tweets / total tweets
 */

import { recordAgentScore } from '../shared/vouch-score-utils.js';
import { log } from './logger.js';

// -- Score Input ------------------------------------------------------------

export interface XScannerScoreInput {
  /** Total tweets found across all queries */
  tweetsFound: number;
  /** Number of queries executed */
  queriesSearched: number;
  /** Tweets classified as reply or quote_tweet */
  opportunities: number;
  /** Total tweets classified (all types) */
  totalClassified: number;
  /** Drafts successfully generated */
  draftsGenerated: number;
  /** Successfully posted to Discord */
  discordPosted: number;
  /** Errors encountered */
  errorCount: number;
}

// -- Compute ----------------------------------------------------------------

export function computeXScannerScore(input: XScannerScoreInput): {
  score: number;
  dimensions: Record<string, number>;
} {
  const dimensions: Record<string, number> = {};

  // Discovery rate (+25): tweets per query (diminishing returns past 5/query)
  if (input.queriesSearched > 0) {
    const perQuery = input.tweetsFound / input.queriesSearched;
    dimensions.discoveryRate = Math.round(25 * Math.min(1, perQuery / 5));
  } else {
    dimensions.discoveryRate = 0;
  }

  // Classification quality (+25): reply/quote ratio vs skips
  // More actionable tweets = keywords are well-tuned
  if (input.totalClassified > 0) {
    const actionableRatio = input.opportunities / input.totalClassified;
    // Sweet spot is ~30-50% actionable. Too high means undiscriminating.
    const quality = actionableRatio <= 0.5
      ? actionableRatio / 0.5
      : 1 - (actionableRatio - 0.5) * 0.5;
    dimensions.classificationQuality = Math.round(25 * Math.max(0, quality));
  } else if (input.tweetsFound === 0) {
    dimensions.classificationQuality = 12; // No tweets = neutral
  } else {
    dimensions.classificationQuality = 0;
  }

  // Draft generation (+20): successful drafts per opportunity
  if (input.opportunities > 0) {
    dimensions.draftGeneration = Math.round(
      20 * Math.min(1, input.draftsGenerated / input.opportunities),
    );
  } else {
    dimensions.draftGeneration = 20; // No opportunities = nothing to draft
  }

  // Discord delivery (+15): posted / opportunities
  if (input.opportunities > 0) {
    dimensions.discordDelivery = Math.round(
      15 * (input.discordPosted / input.opportunities),
    );
  } else {
    dimensions.discordDelivery = 15; // Nothing to post = full marks
  }

  // Dedup effectiveness (+15): inverse of error rate
  if (input.tweetsFound > 0 || input.queriesSearched > 0) {
    const errorPenalty = Math.min(1, input.errorCount / Math.max(input.queriesSearched, 1));
    dimensions.dedupEffectiveness = Math.round(15 * (1 - errorPenalty));
  } else {
    dimensions.dedupEffectiveness = 15;
  }

  const score = Object.values(dimensions).reduce((a, b) => a + b, 0);

  return { score: Math.min(100, Math.max(0, score)), dimensions };
}

// -- Record -----------------------------------------------------------------

export function recordXScannerScore(
  reportPath: string,
  input: XScannerScoreInput,
): void {
  const { score, dimensions } = computeXScannerScore(input);
  recordAgentScore(reportPath, score, dimensions);
  log('info', 'vouch-score', `Recorded score ${score}/100`, dimensions);
}
