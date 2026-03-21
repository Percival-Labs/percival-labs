/**
 * Scout -- Signal Analysis
 *
 * Scores significance of changes, deduplicates across ticks,
 * and detects trends.
 */

import { THRESHOLDS } from './config.js';
import { getNpmTrend, type SignalItem, type SourceResult } from './sources.js';
import { log } from './logger.js';

// -- Types ----------------------------------------------------------------

export type Significance = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Signal {
  source: string;
  significance: Significance;
  subject: string;
  event: string;
  detail: string;
  url?: string;
}

// -- Dedup: track reported release IDs (capped to prevent unbounded growth)

const MAX_REPORTED_IDS = 500;
const reportedIds = new Set<string>();

function trackReportedId(id: string): void {
  reportedIds.add(id);
  if (reportedIds.size > MAX_REPORTED_IDS) {
    // Prune oldest half (Sets iterate in insertion order)
    const toDelete = Math.floor(MAX_REPORTED_IDS / 2);
    let count = 0;
    for (const entry of reportedIds) {
      if (count++ >= toDelete) break;
      reportedIds.delete(entry);
    }
  }
}

// -- Analysis Logic -------------------------------------------------------

function analyzeGitHubItem(item: SignalItem): Signal | null {
  // New release detection
  if (item.id.includes(':release:')) {
    if (reportedIds.has(item.id)) return null; // Already reported
    trackReportedId(item.id);
    return {
      source: 'github',
      significance: 'HIGH',
      subject: item.id.split(':')[0],
      event: 'new_release',
      detail: item.title,
      url: item.url,
    };
  }

  // Star changes (only if we have previous data)
  if (item.id.endsWith(':stars') && item.previous !== undefined && item.delta !== undefined) {
    if (item.delta === 0) return null;

    const growthRate = item.previous > 0 ? item.delta / item.previous : 0;
    const absDelta = Math.abs(item.delta);

    // HIGH: significant percentage growth OR large absolute delta
    if (growthRate >= THRESHOLDS.starGrowthHigh || absDelta >= THRESHOLDS.starDeltaHigh) {
      return {
        source: 'github',
        significance: 'HIGH',
        subject: item.id.split(':')[0],
        event: 'star_surge',
        detail: `Stars ${item.previous} -> ${item.metric} (${item.delta > 0 ? '+' : ''}${item.delta}, ${(growthRate * 100).toFixed(2)}%)`,
        url: item.url,
      };
    }

    // MEDIUM: moderate percentage growth OR moderate absolute delta
    if (growthRate >= THRESHOLDS.starGrowthMedium || absDelta >= THRESHOLDS.starDeltaMedium) {
      return {
        source: 'github',
        significance: 'MEDIUM',
        subject: item.id.split(':')[0],
        event: 'star_growth',
        detail: `Stars ${item.previous} -> ${item.metric} (${item.delta > 0 ? '+' : ''}${item.delta}, ${(growthRate * 100).toFixed(2)}%)`,
        url: item.url,
      };
    }

    // LOW: any non-zero change (positive or negative -- drops matter too)
    if (absDelta >= THRESHOLDS.starDeltaLow) {
      return {
        source: 'github',
        significance: 'LOW',
        subject: item.id.split(':')[0],
        event: item.delta > 0 ? 'star_change' : 'star_decline',
        detail: `Stars ${item.previous} -> ${item.metric} (${item.delta > 0 ? '+' : ''}${item.delta})`,
        url: item.url,
      };
    }
  }

  // Fork changes
  if (item.id.endsWith(':forks') && item.previous !== undefined && item.delta !== undefined) {
    if (item.delta === 0) return null;

    const growthRate = item.previous > 0 ? Math.abs(item.delta) / item.previous : 0;

    if (growthRate >= THRESHOLDS.starGrowthMedium || Math.abs(item.delta) >= THRESHOLDS.starDeltaMedium) {
      return {
        source: 'github',
        significance: 'MEDIUM',
        subject: item.id.split(':')[0],
        event: item.delta > 0 ? 'fork_growth' : 'fork_decline',
        detail: `Forks ${item.previous} -> ${item.metric} (${item.delta > 0 ? '+' : ''}${item.delta})`,
        url: item.url,
      };
    }

    // LOW: any fork change
    if (Math.abs(item.delta) >= 1) {
      return {
        source: 'github',
        significance: 'LOW',
        subject: item.id.split(':')[0],
        event: item.delta > 0 ? 'fork_change' : 'fork_decline',
        detail: `Forks ${item.previous} -> ${item.metric} (${item.delta > 0 ? '+' : ''}${item.delta})`,
        url: item.url,
      };
    }
  }

  return null;
}

function analyzeNpmItem(item: SignalItem): Signal | null {
  if (item.previous === undefined || item.delta === undefined) return null;
  if (item.delta === 0) return null;

  const pkg = item.id.replace('npm:', '').replace(':downloads', '');
  const growthRate = item.previous > 0 ? item.delta / item.previous : 0;
  const absDelta = Math.abs(item.delta);

  // Trending detection
  const trend = getNpmTrend(pkg);
  const trendSuffix = trend >= THRESHOLDS.trendingCount ? ' [TRENDING]' : '';

  // HIGH: large percentage swing OR large absolute delta OR trending + significant growth
  if (Math.abs(growthRate) >= THRESHOLDS.npmGrowthHigh || absDelta >= THRESHOLDS.npmDeltaMedium * 4) {
    return {
      source: 'npm',
      significance: 'HIGH',
      subject: pkg,
      event: growthRate > 0 ? 'download_spike' : 'download_crash',
      detail: `Downloads ${item.previous.toLocaleString()} -> ${item.metric.toLocaleString()} (${growthRate > 0 ? '+' : ''}${(growthRate * 100).toFixed(1)}%)${trendSuffix}`,
    };
  }

  // Also HIGH if trending AND moderate growth
  if (trend >= THRESHOLDS.trendingCount && Math.abs(growthRate) >= THRESHOLDS.npmGrowthMedium) {
    return {
      source: 'npm',
      significance: 'HIGH',
      subject: pkg,
      event: growthRate > 0 ? 'download_spike_trending' : 'download_crash_trending',
      detail: `Downloads ${item.previous.toLocaleString()} -> ${item.metric.toLocaleString()} (${growthRate > 0 ? '+' : ''}${(growthRate * 100).toFixed(1)}%)${trendSuffix}`,
    };
  }

  // MEDIUM: moderate percentage change OR large absolute delta
  if (Math.abs(growthRate) >= THRESHOLDS.npmGrowthMedium || absDelta >= THRESHOLDS.npmDeltaMedium) {
    return {
      source: 'npm',
      significance: 'MEDIUM',
      subject: pkg,
      event: growthRate > 0 ? 'download_increase' : 'download_decrease',
      detail: `Downloads ${item.previous.toLocaleString()} -> ${item.metric.toLocaleString()} (${growthRate > 0 ? '+' : ''}${(growthRate * 100).toFixed(1)}%)${trendSuffix}`,
    };
  }

  // LOW: any measurable change (was gated behind trending -- now catches all movement)
  if (Math.abs(growthRate) >= THRESHOLDS.npmGrowthLow) {
    return {
      source: 'npm',
      significance: 'LOW',
      subject: pkg,
      event: growthRate > 0 ? 'download_change' : 'download_dip',
      detail: `Downloads ${item.previous.toLocaleString()} -> ${item.metric.toLocaleString()} (${growthRate > 0 ? '+' : ''}${(growthRate * 100).toFixed(1)}%)${trendSuffix}`,
    };
  }

  return null;
}

// -- Main Analysis --------------------------------------------------------

export function analyzeResults(results: SourceResult[]): Signal[] {
  const signals: Signal[] = [];

  for (const result of results) {
    for (const item of result.items) {
      let signal: Signal | null = null;

      if (result.source === 'github') {
        signal = analyzeGitHubItem(item);
      } else if (result.source === 'npm') {
        signal = analyzeNpmItem(item);
      }

      if (signal) {
        signals.push(signal);
      }
    }
  }

  // Sort by significance: HIGH first, then MEDIUM, then LOW
  const order: Record<Significance, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  signals.sort((a, b) => order[a.significance] - order[b.significance]);

  if (signals.length > 0) {
    log('info', 'analysis', `Generated ${signals.length} signals`, {
      high: signals.filter((s) => s.significance === 'HIGH').length,
      medium: signals.filter((s) => s.significance === 'MEDIUM').length,
      low: signals.filter((s) => s.significance === 'LOW').length,
    });
  }

  return signals;
}
