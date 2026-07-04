// Virtuals ACP Indexer — Trust score computation
// Computes a 0-1000 trust score from on-chain agent statistics.
//
// Weight distribution:
//   Completion rate   30%  — completed / (completed + failed)
//   Volume            20%  — log scale of total earned USDC
//   Counterparty div  20%  — unique clients relative to total jobs
//   Consistency       15%  — tenure consistency (active over time)
//   Tenure            15%  — days since first seen

interface AgentStats {
  totalJobsClient: number;
  totalJobsProvider: number;
  totalJobsEvaluator: number;
  completedAsProvider: number;
  failedAsProvider: number;
  totalEarnedUsdc: string;
  totalSpentUsdc: string;
  uniqueClients: number;
  uniqueProviders: number;
  firstSeenAt: Date | null;
  lastActiveAt: Date | null;
}

const WEIGHTS = {
  completion: 0.30,
  volume: 0.20,
  diversity: 0.20,
  consistency: 0.15,
  tenure: 0.15,
} as const;

// Minimum jobs before a full score is computed
const MIN_JOBS_FOR_FULL_SCORE = 3;

// Volume benchmarks (USDC earned)
const VOLUME_FLOOR = 1;        // $1
const VOLUME_CEILING = 10_000; // $10K (log scale cap)

// Tenure benchmarks (days)
const TENURE_CEILING_DAYS = 180; // 6 months for max tenure score

export function computeAcpTrustScore(stats: AgentStats): number {
  const totalProviderJobs = stats.completedAsProvider + stats.failedAsProvider;
  const totalAllJobs = stats.totalJobsClient + stats.totalJobsProvider + stats.totalJobsEvaluator;

  // No activity at all → 0
  if (totalAllJobs === 0) return 0;

  // ── Completion Rate (0-1) ──
  let completionScore = 0;
  if (totalProviderJobs > 0) {
    completionScore = stats.completedAsProvider / totalProviderJobs;
  } else if (stats.totalJobsClient > 0) {
    // Pure client — give moderate completion score (they haven't failed)
    completionScore = 0.6;
  }

  // ── Volume (0-1, log scale) ──
  const earned = parseFloat(stats.totalEarnedUsdc) || 0;
  let volumeScore = 0;
  if (earned >= VOLUME_FLOOR) {
    volumeScore = Math.min(
      1,
      Math.log10(earned / VOLUME_FLOOR) / Math.log10(VOLUME_CEILING / VOLUME_FLOOR),
    );
  }

  // ── Counterparty Diversity (0-1) ──
  let diversityScore = 0;
  if (stats.totalJobsProvider > 0 && stats.uniqueClients > 0) {
    // Unique clients / total provider jobs, capped at 1
    diversityScore = Math.min(1, stats.uniqueClients / Math.max(stats.totalJobsProvider, 1));
  } else if (stats.totalJobsClient > 0 && stats.uniqueProviders > 0) {
    diversityScore = Math.min(1, stats.uniqueProviders / Math.max(stats.totalJobsClient, 1));
  }

  // ── Consistency (0-1) ──
  // Measures how recently active relative to tenure
  let consistencyScore = 0;
  if (stats.firstSeenAt && stats.lastActiveAt) {
    const tenureMs = Date.now() - new Date(stats.firstSeenAt).getTime();
    const recencyMs = Date.now() - new Date(stats.lastActiveAt).getTime();
    if (tenureMs > 0) {
      // Ratio of active period to total tenure — higher = more consistent
      const activeRatio = 1 - (recencyMs / tenureMs);
      consistencyScore = Math.max(0, Math.min(1, activeRatio));
    }
  }

  // ── Tenure (0-1) ──
  let tenureScore = 0;
  if (stats.firstSeenAt) {
    const tenureDays = (Date.now() - new Date(stats.firstSeenAt).getTime()) / (1000 * 60 * 60 * 24);
    tenureScore = Math.min(1, tenureDays / TENURE_CEILING_DAYS);
  }

  // ── Weighted total ──
  const rawScore =
    completionScore * WEIGHTS.completion +
    volumeScore * WEIGHTS.volume +
    diversityScore * WEIGHTS.diversity +
    consistencyScore * WEIGHTS.consistency +
    tenureScore * WEIGHTS.tenure;

  let score = Math.round(rawScore * 1000);

  // Provisional penalty: agents with < MIN_JOBS get score capped at 400
  if (totalAllJobs < MIN_JOBS_FOR_FULL_SCORE) {
    score = Math.min(score, 400);
  }

  return Math.max(0, Math.min(1000, score));
}
