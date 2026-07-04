/**
 * Scout -- Data Source Adapters
 *
 * Each adapter fetches from a public API and returns standardized items.
 * No API keys required for basic operation. GITHUB_TOKEN optional.
 */

import { REPOS, NPM_PACKAGES, CIRCUIT_BREAKER, THRESHOLDS, type RepoConfig } from './config.js';
import { log } from './logger.js';

// -- Types ----------------------------------------------------------------

export interface SignalItem {
  id: string;
  title: string;
  metric: number;
  previous?: number;
  delta?: number;
  url?: string;
}

export interface SourceResult {
  source: string;
  items: SignalItem[];
}

// -- Circuit Breaker State ------------------------------------------------

interface BreakerState {
  failures: number;
  lastFailure: number;
  backoffUntil: number;
}

const breakers = new Map<string, BreakerState>();

function getBreaker(key: string): BreakerState {
  if (!breakers.has(key)) {
    breakers.set(key, { failures: 0, lastFailure: 0, backoffUntil: 0 });
  }
  return breakers.get(key)!;
}

function recordFailure(key: string): void {
  const b = getBreaker(key);
  b.failures++;
  b.lastFailure = Date.now();
  if (b.failures >= CIRCUIT_BREAKER.maxFailures) {
    b.backoffUntil = Date.now() + CIRCUIT_BREAKER.backoffMs;
    log('warn', 'breaker', `Circuit open for ${key} — backing off 30min`, {
      failures: b.failures,
    });
  }
}

function recordSuccess(key: string): void {
  const b = getBreaker(key);
  b.failures = 0;
  b.backoffUntil = 0;
}

function isOpen(key: string): boolean {
  const b = getBreaker(key);
  if (b.backoffUntil > 0 && Date.now() < b.backoffUntil) {
    return true;
  }
  // Reset if backoff period has elapsed
  if (b.backoffUntil > 0 && Date.now() >= b.backoffUntil) {
    b.failures = 0;
    b.backoffUntil = 0;
  }
  return false;
}

// -- GitHub Rate Limit Tracking -------------------------------------------

let githubRateLimitRemaining = 60; // Conservative default for unauthenticated

function updateRateLimit(headers: Headers): void {
  const remaining = headers.get('x-ratelimit-remaining');
  if (remaining !== null) {
    githubRateLimitRemaining = parseInt(remaining, 10);
  }
}

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'PL-Scout/1.0',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// -- Previous Values (in-memory, resets on restart) -----------------------

export interface RepoSnapshot {
  stars: number;
  forks: number;
  openIssues: number;
  latestRelease: string | null;
  latestReleaseUrl: string | null;
}

export interface NpmSnapshot {
  weeklyDownloads: number;
}

const previousRepos = new Map<string, RepoSnapshot>();
const previousNpm = new Map<string, NpmSnapshot>();

// Track consecutive increases for trend detection
const npmTrends = new Map<string, number>();

// -- Exported State Accessors ---------------------------------------------

export function getRepoSnapshots(): Map<string, RepoSnapshot> {
  return previousRepos;
}

export function getNpmSnapshots(): Map<string, NpmSnapshot> {
  return previousNpm;
}

// -- GitHub Adapter -------------------------------------------------------

async function fetchRepo(config: RepoConfig): Promise<SignalItem[]> {
  const key = `github:${config.owner}/${config.repo}`;
  if (isOpen(key)) {
    log('debug', 'github', `Skipping ${config.alias} — circuit open`);
    return [];
  }

  if (githubRateLimitRemaining < THRESHOLDS.rateLimitFloor) {
    log('warn', 'github', `Rate limit low (${githubRateLimitRemaining}), skipping ${config.alias}`);
    return [];
  }

  const items: SignalItem[] = [];
  const repoUrl = `https://api.github.com/repos/${config.owner}/${config.repo}`;

  try {
    // Fetch repo metadata
    const repoRes = await fetch(repoUrl, {
      headers: githubHeaders(),
      signal: AbortSignal.timeout(10_000),
    });
    updateRateLimit(repoRes.headers);

    if (!repoRes.ok) {
      throw new Error(`GitHub API ${repoRes.status}: ${repoRes.statusText}`);
    }

    const repo = (await repoRes.json()) as {
      stargazers_count: number;
      forks_count: number;
      open_issues_count: number;
      html_url: string;
    };

    const current: RepoSnapshot = {
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      latestRelease: null,
      latestReleaseUrl: null,
    };

    // Fetch latest release (separate call)
    if (githubRateLimitRemaining >= THRESHOLDS.rateLimitFloor) {
      try {
        const relRes = await fetch(`${repoUrl}/releases?per_page=1`, {
          headers: githubHeaders(),
          signal: AbortSignal.timeout(10_000),
        });
        updateRateLimit(relRes.headers);

        if (relRes.ok) {
          const releases = (await relRes.json()) as Array<{
            tag_name: string;
            html_url: string;
          }>;
          if (releases.length > 0) {
            current.latestRelease = releases[0].tag_name;
            current.latestReleaseUrl = releases[0].html_url;
          }
        }
      } catch {
        // Release fetch is optional; don't fail the whole repo
        log('debug', 'github', `Release fetch failed for ${config.alias}`);
      }
    }

    // Compare with previous
    const prev = previousRepos.get(config.alias);

    // Star count item
    items.push({
      id: `${config.alias}:stars`,
      title: `${config.alias} stars`,
      metric: current.stars,
      previous: prev?.stars,
      delta: prev ? current.stars - prev.stars : undefined,
      url: repo.html_url,
    });

    // Fork count item
    items.push({
      id: `${config.alias}:forks`,
      title: `${config.alias} forks`,
      metric: current.forks,
      previous: prev?.forks,
      delta: prev ? current.forks - prev.forks : undefined,
      url: repo.html_url,
    });

    // New release detection
    if (prev && current.latestRelease && current.latestRelease !== prev.latestRelease) {
      items.push({
        id: `${config.alias}:release:${current.latestRelease}`,
        title: `${config.alias} new release ${current.latestRelease}`,
        metric: 1,
        url: current.latestReleaseUrl || repo.html_url,
      });
    }

    // Store current as previous for next tick
    previousRepos.set(config.alias, current);
    recordSuccess(key);
  } catch (err) {
    recordFailure(key);
    log('error', 'github', `Failed to fetch ${config.alias}`, {
      error: (err as Error).message,
    });
  }

  return items;
}

export async function fetchAllRepos(): Promise<SourceResult> {
  const allItems: SignalItem[] = [];

  // Fetch repos sequentially to be kind to rate limits
  for (const config of REPOS) {
    const items = await fetchRepo(config);
    allItems.push(...items);
  }

  return { source: 'github', items: allItems };
}

// -- npm Adapter ----------------------------------------------------------

async function fetchNpmPackage(pkg: string): Promise<SignalItem[]> {
  const key = `npm:${pkg}`;
  if (isOpen(key)) {
    log('debug', 'npm', `Skipping ${pkg} — circuit open`);
    return [];
  }

  const items: SignalItem[] = [];
  const url = `https://api.npmjs.org/downloads/point/last-week/${pkg}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      throw new Error(`npm API ${res.status}: ${res.statusText}`);
    }

    const data = (await res.json()) as { downloads: number; package: string };
    const current: NpmSnapshot = { weeklyDownloads: data.downloads };
    const prev = previousNpm.get(pkg);

    // Track trend
    if (prev) {
      const trend = npmTrends.get(pkg) || 0;
      if (current.weeklyDownloads > prev.weeklyDownloads) {
        npmTrends.set(pkg, trend + 1);
      } else {
        npmTrends.set(pkg, 0);
      }
    }

    items.push({
      id: `npm:${pkg}:downloads`,
      title: `${pkg} weekly downloads`,
      metric: current.weeklyDownloads,
      previous: prev?.weeklyDownloads,
      delta: prev ? current.weeklyDownloads - prev.weeklyDownloads : undefined,
    });

    previousNpm.set(pkg, current);
    recordSuccess(key);
  } catch (err) {
    recordFailure(key);
    log('error', 'npm', `Failed to fetch ${pkg}`, {
      error: (err as Error).message,
    });
  }

  return items;
}

export async function fetchAllNpm(): Promise<SourceResult> {
  const allItems: SignalItem[] = [];

  for (const pkg of NPM_PACKAGES) {
    const items = await fetchNpmPackage(pkg);
    allItems.push(...items);
    // Small delay to be polite to npm API
    await new Promise((r) => setTimeout(r, 200));
  }

  return { source: 'npm', items: allItems };
}

// -- npm Trend Accessor ---------------------------------------------------

export function getNpmTrend(pkg: string): number {
  return npmTrends.get(pkg) || 0;
}
