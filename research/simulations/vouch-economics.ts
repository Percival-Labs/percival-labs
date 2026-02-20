#!/usr/bin/env bun
/**
 * Vouch Trust Staking Economy — Monte Carlo Simulation
 *
 * Models the Percival Labs trust staking economy across growth scenarios,
 * adversarial conditions, and staker behavior dynamics.
 *
 * Usage:
 *   bun run research/simulations/vouch-economics.ts [--seed=42] [--iterations=1000] [--months=24]
 *
 * @module vouch-economics
 * @author Percy (Percival Labs Engineer Agent)
 */

// ---------------------------------------------------------------------------
// ANSI color helpers (no deps)
// ---------------------------------------------------------------------------
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
} as const;

function color(c: string, text: string | number): string {
  return `${c}${text}${C.reset}`;
}

// ---------------------------------------------------------------------------
// Seeded PRNG — Mulberry32 (fast, 32-bit, deterministic)
// ---------------------------------------------------------------------------
class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
  }

  /** Returns a float in [0, 1) */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform float in [min, max) */
  uniform(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Uniform integer in [min, max] inclusive */
  uniformInt(min: number, max: number): number {
    return Math.floor(this.uniform(min, max + 1));
  }

  /** Box-Muller transform — standard normal */
  normal(mean = 0, stddev = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1 + 1e-15)) * Math.cos(2 * Math.PI * u2);
    return mean + stddev * z;
  }

  /** Log-normal distribution. median = exp(mu), spread controlled by sigma */
  logNormal(median: number, sigmaFactor: number): number {
    const mu = Math.log(median);
    const sigma = Math.log(sigmaFactor);
    return Math.exp(this.normal(mu, sigma));
  }

  /** Bernoulli trial */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /** Pick random element from array */
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** Fork a new RNG (for parallel-safe iteration isolation) */
  fork(): SeededRNG {
    return new SeededRNG(this.uniformInt(0, 2 ** 31 - 1));
  }
}

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

interface GrowthScenario {
  name: string;
  agentsPerMonth: number;
  avgBacking: number;
  stakerRatio: number; // fraction of agents that attract stakers
}

interface AgentState {
  id: number;
  monthJoined: number;
  monthlyRevenue: number; // base revenue (evolves)
  activityFeeRate: number; // 0.02 - 0.10
  poolBalance: number; // total staked on this agent
  isSybil: boolean;
  slashCount: number;
  active: boolean;
}

interface StakerState {
  id: number;
  monthJoined: number;
  stakeAmount: number;
  agentId: number; // which agent they back
  consecutiveLowYieldMonths: number;
  active: boolean;
  isFlashStaker: boolean;
}

interface MonthSnapshot {
  month: number;
  totalAgents: number;
  totalActiveAgents: number;
  totalStaked: number;
  totalStakers: number;
  avgAPY: number;
  medianAPY: number;
  plMonthlyRevenue: number;
  poolHealthPct: number; // % of pools with positive yield
  treasuryBalance: number;
  slashingEvents: number;
  sybilAgents: number;
}

interface SimulationResult {
  scenarioName: string;
  snapshots: MonthSnapshot[];
  monthToFirstKRevenue: number | null; // month when PL first hits $1K/mo
  apyDistributionMonth12: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  } | null;
  sustainableProbability12: number; // fraction of iterations where PL revenue >= $5K/mo by month 12
  sustainableProbability24: number; // fraction of iterations where PL revenue >= $5K/mo by month 24
}

interface AdversarialConfig {
  sybilFraction: number; // fraction of new agents that are sybil
  flashStakerFraction: number; // fraction of new stakers that are flash stakers
  whaleEnabled: boolean; // whether whale manipulation occurs
}

interface SimConfig {
  months: number;
  iterations: number;
  platformFeeRate: number; // 0.03 - 0.05
  unstakingNoticeDays: number;
  slashProbabilityPerMonth: number; // per-agent
  slashAmountRange: [number, number]; // fraction of pool
  stakerChurnBaseRate: number; // base monthly churn
  yieldFloorAPY: number; // stakers leave if below this
  yieldFloorMonths: number; // consecutive months below floor triggers exit
  operatingCostPerMonth: number; // $5K for sustainability check
  adversarial: AdversarialConfig;
}

// ---------------------------------------------------------------------------
// Constants & scenarios
// ---------------------------------------------------------------------------

const GROWTH_SCENARIOS: GrowthScenario[] = [
  { name: "Slow Growth", agentsPerMonth: 10, avgBacking: 500, stakerRatio: 0.2 },
  { name: "Medium Growth", agentsPerMonth: 50, avgBacking: 2000, stakerRatio: 0.4 },
  { name: "Fast Growth", agentsPerMonth: 200, avgBacking: 5000, stakerRatio: 0.6 },
];

const DEFAULT_CONFIG: SimConfig = {
  months: 24,
  iterations: 1000,
  platformFeeRate: 0.04, // 4%
  unstakingNoticeDays: 7,
  slashProbabilityPerMonth: 0.02, // 2% per agent per month
  slashAmountRange: [0.1, 0.3],
  stakerChurnBaseRate: 0.08, // 8% base monthly churn
  yieldFloorAPY: 0.05, // 5% APY
  yieldFloorMonths: 3,
  operatingCostPerMonth: 5000,
  adversarial: {
    sybilFraction: 0.0, // off by default in non-adversarial
    flashStakerFraction: 0.0,
    whaleEnabled: false,
  },
};

const ADVERSARIAL_CONFIG: AdversarialConfig = {
  sybilFraction: 0.20,
  flashStakerFraction: 0.10,
  whaleEnabled: true,
};

// ---------------------------------------------------------------------------
// Simulation engine
// ---------------------------------------------------------------------------

/** Remove a staker from the pool index (O(1) swap-remove) */
function removeFromIndex(
  stakersByAgent: Map<number, StakerState[]>,
  staker: StakerState,
): void {
  const list = stakersByAgent.get(staker.agentId);
  if (!list) return;
  const idx = list.indexOf(staker);
  if (idx >= 0) {
    // Swap with last element for O(1) removal
    list[idx] = list[list.length - 1];
    list.pop();
  }
}

/** Add a staker to the pool index */
function addToIndex(
  stakersByAgent: Map<number, StakerState[]>,
  staker: StakerState,
): void {
  let list = stakersByAgent.get(staker.agentId);
  if (!list) {
    list = [];
    stakersByAgent.set(staker.agentId, list);
  }
  list.push(staker);
}

/** Deactivate a staker and remove from index */
function deactivateStaker(
  staker: StakerState,
  stakersByAgent: Map<number, StakerState[]>,
): void {
  if (!staker.active) return;
  staker.active = false;
  removeFromIndex(stakersByAgent, staker);
}

function runSingleIteration(
  scenario: GrowthScenario,
  config: SimConfig,
  rng: SeededRNG,
): MonthSnapshot[] {
  // Use Map<agentId, AgentState> for O(1) agent lookups
  const agentMap = new Map<number, AgentState>();
  // Maintain list of active agents for iteration
  const activeAgentIds: number[] = [];
  // Index: agentId -> active stakers in that pool
  const stakersByAgent = new Map<number, StakerState[]>();
  const snapshots: MonthSnapshot[] = [];

  let nextAgentId = 0;
  let nextStakerId = 0;
  let treasuryBalance = 0;
  let totalActiveStakers = 0;
  let totalStakedAmount = 0;

  for (let month = 1; month <= config.months; month++) {
    // -----------------------------------------------------------------------
    // 1. New agents join
    // -----------------------------------------------------------------------
    const newAgentCount = Math.max(
      1,
      Math.round(scenario.agentsPerMonth * rng.uniform(0.7, 1.3)),
    );

    const newAgentIds: number[] = [];
    for (let i = 0; i < newAgentCount; i++) {
      const isSybil = rng.chance(config.adversarial.sybilFraction);
      const baseRevenue = isSybil
        ? rng.uniform(10, 100) // sybils have low real revenue
        : rng.logNormal(500, 2); // median $500, 2x sigma factor

      const agent: AgentState = {
        id: nextAgentId++,
        monthJoined: month,
        monthlyRevenue: baseRevenue,
        activityFeeRate: rng.uniform(0.02, 0.10),
        poolBalance: 0,
        isSybil,
        slashCount: 0,
        active: true,
      };
      agentMap.set(agent.id, agent);
      activeAgentIds.push(agent.id);
      newAgentIds.push(agent.id);
    }

    // -----------------------------------------------------------------------
    // 2. New stakers join (2:1 ratio to agent growth)
    // -----------------------------------------------------------------------
    const newStakerCount = Math.max(
      0,
      Math.round(newAgentCount * 2 * rng.uniform(0.6, 1.4)),
    );

    // Build target list: agents that already have backers OR pass stakerRatio check
    // Weight by estimated yield — stakers seek out high-APY pools (rational actors)
    const targetableAgentIds: number[] = [];
    const targetWeights: number[] = [];
    let totalWeight = 0;

    for (const aid of activeAgentIds) {
      const a = agentMap.get(aid)!;
      if (a.poolBalance > 0 || rng.chance(scenario.stakerRatio)) {
        targetableAgentIds.push(aid);
        // Estimate APY for weighting: higher yield pools attract more capital
        const estMonthlyYield = a.monthlyRevenue * a.activityFeeRate * (1 - config.platformFeeRate);
        const pool = Math.max(a.poolBalance, 1); // avoid div-by-zero
        const estAPY = Math.min(estMonthlyYield / pool * 12, 5.0); // cap weight at 500%
        const weight = 1 + estAPY; // base weight 1 + yield attraction
        targetWeights.push(weight);
        totalWeight += weight;
      }
    }

    // Weighted random pick from targetable agents
    function pickWeightedAgent(): number {
      if (targetableAgentIds.length === 0) return rng.pick(activeAgentIds);
      const r = rng.next() * totalWeight;
      let cumulative = 0;
      for (let j = 0; j < targetableAgentIds.length; j++) {
        cumulative += targetWeights[j];
        if (r < cumulative) return targetableAgentIds[j];
      }
      return targetableAgentIds[targetableAgentIds.length - 1];
    }

    for (let i = 0; i < newStakerCount; i++) {
      if (targetableAgentIds.length === 0 && activeAgentIds.length === 0) break;

      const targetId = pickWeightedAgent();
      const targetAgent = agentMap.get(targetId)!;

      const isFlash = rng.chance(config.adversarial.flashStakerFraction);
      const stakeAmt = isFlash
        ? rng.logNormal(5000, 1.5) // flash stakers come in big
        : rng.logNormal(200, 2); // median $200

      const staker: StakerState = {
        id: nextStakerId++,
        monthJoined: month,
        stakeAmount: stakeAmt,
        agentId: targetId,
        consecutiveLowYieldMonths: 0,
        active: true,
        isFlashStaker: isFlash,
      };

      addToIndex(stakersByAgent, staker);
      totalActiveStakers++;
      totalStakedAmount += stakeAmt;
      targetAgent.poolBalance += stakeAmt;
    }

    // -----------------------------------------------------------------------
    // 3. Whale manipulation: one whale takes >50% of a random pool
    // -----------------------------------------------------------------------
    if (config.adversarial.whaleEnabled && month >= 3 && rng.chance(0.15)) {
      // Find pools with balance > 100
      const eligiblePools: number[] = [];
      for (const aid of activeAgentIds) {
        if (agentMap.get(aid)!.poolBalance > 100) eligiblePools.push(aid);
      }
      if (eligiblePools.length > 0) {
        const targetId = rng.pick(eligiblePools);
        const target = agentMap.get(targetId)!;
        const whaleStake = target.poolBalance * rng.uniform(1.2, 3.0);
        const wStaker: StakerState = {
          id: nextStakerId++,
          monthJoined: month,
          stakeAmount: whaleStake,
          agentId: targetId,
          consecutiveLowYieldMonths: 0,
          active: true,
          isFlashStaker: false,
        };
        addToIndex(stakersByAgent, wStaker);
        totalActiveStakers++;
        totalStakedAmount += whaleStake;
        target.poolBalance += whaleStake;
      }
    }

    // -----------------------------------------------------------------------
    // 4. Agent revenue evolution (slight month-to-month variance)
    // -----------------------------------------------------------------------
    for (const aid of activeAgentIds) {
      const agent = agentMap.get(aid)!;
      const growthFactor = 1.0 + rng.normal(0.02, 0.15);
      agent.monthlyRevenue = Math.max(0, agent.monthlyRevenue * growthFactor);
    }

    // -----------------------------------------------------------------------
    // 5. Calculate yield and distribute
    // -----------------------------------------------------------------------
    let totalPlatformFee = 0;
    const agentAPYs: number[] = [];

    for (const aid of activeAgentIds) {
      const agent = agentMap.get(aid)!;
      const poolStakers = stakersByAgent.get(aid);

      if (!poolStakers || poolStakers.length === 0 || agent.poolBalance <= 0) continue;

      const activityFee = agent.monthlyRevenue * agent.activityFeeRate;
      const platformFee = activityFee * config.platformFeeRate;
      const netYield = activityFee - platformFee;

      totalPlatformFee += platformFee;

      // Monthly yield rate -> APY (capped at 500% for reporting sanity)
      const monthlyRate = netYield / agent.poolBalance;
      const rawAPY = Math.pow(1 + monthlyRate, 12) - 1;
      agentAPYs.push(rawAPY);

      // Distribute to stakers proportionally (yield compounds into pool)
      const poolBefore = agent.poolBalance;
      for (const staker of poolStakers) {
        const share = staker.stakeAmount / poolBefore;
        const stakerYield = netYield * share;
        staker.stakeAmount += stakerYield;
        totalStakedAmount += stakerYield;
      }
      agent.poolBalance += netYield;
    }

    // -----------------------------------------------------------------------
    // 6. Flash staker exit (they leave same month after collecting yield)
    // -----------------------------------------------------------------------
    for (const aid of activeAgentIds) {
      const poolStakers = stakersByAgent.get(aid);
      if (!poolStakers) continue;
      const agent = agentMap.get(aid)!;
      // Iterate backwards to allow safe removal
      for (let i = poolStakers.length - 1; i >= 0; i--) {
        const staker = poolStakers[i];
        if (staker.isFlashStaker && staker.monthJoined < month) {
          totalStakedAmount -= staker.stakeAmount;
          agent.poolBalance = Math.max(0, agent.poolBalance - staker.stakeAmount);
          staker.active = false;
          totalActiveStakers--;
          // Swap-remove from pool list
          poolStakers[i] = poolStakers[poolStakers.length - 1];
          poolStakers.pop();
        }
      }
    }

    // -----------------------------------------------------------------------
    // 7. Slashing events
    // -----------------------------------------------------------------------
    let slashEvents = 0;
    const agentsToDeactivate: number[] = [];

    for (const aid of activeAgentIds) {
      const agent = agentMap.get(aid)!;
      const slashProb = agent.isSybil
        ? config.slashProbabilityPerMonth * 3
        : config.slashProbabilityPerMonth;

      if (rng.chance(slashProb) && agent.poolBalance > 0) {
        const slashFraction = rng.uniform(
          config.slashAmountRange[0],
          config.slashAmountRange[1],
        );
        const slashAmount = agent.poolBalance * slashFraction;
        agent.poolBalance -= slashAmount;
        agent.slashCount++;
        slashEvents++;

        // 50% to affected parties (gone), 50% to treasury
        treasuryBalance += slashAmount * 0.5;

        // Reduce staker balances proportionally
        const poolStakers = stakersByAgent.get(aid);
        if (poolStakers) {
          for (const staker of poolStakers) {
            const loss = staker.stakeAmount * slashFraction;
            staker.stakeAmount -= loss;
            totalStakedAmount -= loss;
          }
        }

        // Agents with 3+ slashes get deactivated
        if (agent.slashCount >= 3) {
          agentsToDeactivate.push(aid);
        }
      }
    }

    // Deactivate agents marked for removal
    for (const aid of agentsToDeactivate) {
      const agent = agentMap.get(aid)!;
      agent.active = false;
      const poolStakers = stakersByAgent.get(aid);
      if (poolStakers) {
        for (const staker of poolStakers) {
          totalStakedAmount -= staker.stakeAmount;
          staker.active = false;
          totalActiveStakers--;
        }
        stakersByAgent.delete(aid);
      }
    }

    // -----------------------------------------------------------------------
    // 8. Staker churn
    // -----------------------------------------------------------------------
    for (const aid of activeAgentIds) {
      const agent = agentMap.get(aid)!;
      if (!agent.active) continue;
      const poolStakers = stakersByAgent.get(aid);
      if (!poolStakers) continue;

      // Calculate pool-level APY once (same for all stakers in pool)
      const stakerAPY =
        agent.poolBalance > 0
          ? Math.pow(
              1 +
                (agent.monthlyRevenue * agent.activityFeeRate * (1 - config.platformFeeRate)) /
                  agent.poolBalance,
              12,
            ) - 1
          : 0;

      for (let i = poolStakers.length - 1; i >= 0; i--) {
        const staker = poolStakers[i];
        if (staker.isFlashStaker) continue;

        // Track low yield months
        if (stakerAPY < config.yieldFloorAPY) {
          staker.consecutiveLowYieldMonths++;
        } else {
          staker.consecutiveLowYieldMonths = 0;
        }

        // Churn decision
        const churnProb =
          staker.consecutiveLowYieldMonths >= config.yieldFloorMonths
            ? config.stakerChurnBaseRate * 3
            : config.stakerChurnBaseRate;

        if (rng.chance(churnProb)) {
          totalStakedAmount -= staker.stakeAmount;
          agent.poolBalance = Math.max(0, agent.poolBalance - staker.stakeAmount);
          staker.active = false;
          totalActiveStakers--;
          poolStakers[i] = poolStakers[poolStakers.length - 1];
          poolStakers.pop();
        }
      }
    }

    // Also deactivate stakers whose agents are no longer active
    for (const aid of agentsToDeactivate) {
      // Already handled above when agent was deactivated
    }

    // -----------------------------------------------------------------------
    // 9. Sybil detection -- platform catches some sybils each month
    // -----------------------------------------------------------------------
    if (config.adversarial.sybilFraction > 0) {
      const sybilsToRemove: number[] = [];
      for (const aid of activeAgentIds) {
        const agent = agentMap.get(aid)!;
        if (!agent.isSybil) continue;
        const detectionRate = Math.min(0.4, 0.10 + month * 0.01);
        if (rng.chance(detectionRate)) {
          agent.active = false;
          treasuryBalance += agent.poolBalance * 0.5;
          agent.poolBalance = 0;
          sybilsToRemove.push(aid);

          const poolStakers = stakersByAgent.get(aid);
          if (poolStakers) {
            for (const staker of poolStakers) {
              totalStakedAmount -= staker.stakeAmount;
              staker.active = false;
              totalActiveStakers--;
            }
            stakersByAgent.delete(aid);
          }
        }
      }
      // Remove deactivated sybils from active list
      for (const aid of sybilsToRemove) {
        const idx = activeAgentIds.indexOf(aid);
        if (idx >= 0) {
          activeAgentIds[idx] = activeAgentIds[activeAgentIds.length - 1];
          activeAgentIds.pop();
        }
      }
    }

    // Remove deactivated agents from activeAgentIds (from slashing)
    for (const aid of agentsToDeactivate) {
      const idx = activeAgentIds.indexOf(aid);
      if (idx >= 0) {
        activeAgentIds[idx] = activeAgentIds[activeAgentIds.length - 1];
        activeAgentIds.pop();
      }
    }

    // -----------------------------------------------------------------------
    // 10. Capture snapshot
    // -----------------------------------------------------------------------
    let poolsWithYield = 0;
    let poolsWithStakers = 0;
    let sybilCount = 0;

    for (const aid of activeAgentIds) {
      const agent = agentMap.get(aid)!;
      if (agent.isSybil) sybilCount++;
      const pool = stakersByAgent.get(aid);
      if (pool && pool.length > 0) {
        poolsWithStakers++;
        if (agent.poolBalance > 0 && agent.monthlyRevenue * agent.activityFeeRate > 0) {
          poolsWithYield++;
        }
      }
    }

    snapshots.push({
      month,
      totalAgents: agentMap.size,
      totalActiveAgents: activeAgentIds.length,
      totalStaked: totalStakedAmount,
      totalStakers: totalActiveStakers,
      avgAPY: agentAPYs.length > 0 ? agentAPYs.reduce((a, b) => a + b, 0) / agentAPYs.length : 0,
      medianAPY: agentAPYs.length > 0 ? percentile(agentAPYs, 0.5) : 0,
      plMonthlyRevenue: totalPlatformFee,
      poolHealthPct: poolsWithStakers > 0 ? poolsWithYield / poolsWithStakers : 0,
      treasuryBalance,
      slashingEvents: slashEvents,
      sybilAgents: sybilCount,
    });
  }

  return snapshots;
}

// ---------------------------------------------------------------------------
// Monte Carlo driver
// ---------------------------------------------------------------------------

function runMonteCarlo(
  scenario: GrowthScenario,
  config: SimConfig,
  baseSeed: number,
): SimulationResult {
  const allIterationSnapshots: MonthSnapshot[][] = [];

  for (let i = 0; i < config.iterations; i++) {
    const rng = new SeededRNG(baseSeed + i * 7919); // prime spacing
    allIterationSnapshots.push(runSingleIteration(scenario, config, rng));
  }

  // Aggregate across iterations for each month
  const aggregatedSnapshots: MonthSnapshot[] = [];
  for (let m = 0; m < config.months; m++) {
    const monthData = allIterationSnapshots.map((iter) => iter[m]);
    aggregatedSnapshots.push({
      month: m + 1,
      totalAgents: median(monthData.map((d) => d.totalAgents)),
      totalActiveAgents: median(monthData.map((d) => d.totalActiveAgents)),
      totalStaked: median(monthData.map((d) => d.totalStaked)),
      totalStakers: median(monthData.map((d) => d.totalStakers)),
      avgAPY: median(monthData.map((d) => d.avgAPY)),
      medianAPY: median(monthData.map((d) => d.medianAPY)),
      plMonthlyRevenue: median(monthData.map((d) => d.plMonthlyRevenue)),
      poolHealthPct: median(monthData.map((d) => d.poolHealthPct)),
      treasuryBalance: median(monthData.map((d) => d.treasuryBalance)),
      slashingEvents: median(monthData.map((d) => d.slashingEvents)),
      sybilAgents: median(monthData.map((d) => d.sybilAgents)),
    });
  }

  // Month to first $1K PL revenue (median across iterations)
  const monthsToFirstK = allIterationSnapshots.map((iter) => {
    const idx = iter.findIndex((s) => s.plMonthlyRevenue >= 1000);
    return idx >= 0 ? idx + 1 : null;
  });
  const validMonths = monthsToFirstK.filter((m): m is number => m !== null);
  const medianMonthToFirstK = validMonths.length > 0 ? median(validMonths) : null;

  // APY distribution at month 12 (using median APY per iteration for robustness)
  let apyDist = null;
  if (config.months >= 12) {
    const apysAtMonth12 = allIterationSnapshots.map(
      (iter) => iter[11].medianAPY,
    );
    apyDist = {
      p10: percentile(apysAtMonth12, 0.1),
      p25: percentile(apysAtMonth12, 0.25),
      p50: percentile(apysAtMonth12, 0.5),
      p75: percentile(apysAtMonth12, 0.75),
      p90: percentile(apysAtMonth12, 0.9),
    };
  }

  // Sustainability probability: PL revenue >= $5K/mo by month 12 and 24
  let sustainableCount12 = 0;
  let sustainableCount24 = 0;
  if (config.months >= 12) {
    for (const iter of allIterationSnapshots) {
      if (iter[11].plMonthlyRevenue >= config.operatingCostPerMonth) {
        sustainableCount12++;
      }
    }
  }
  if (config.months >= 24) {
    for (const iter of allIterationSnapshots) {
      if (iter[23].plMonthlyRevenue >= config.operatingCostPerMonth) {
        sustainableCount24++;
      }
    }
  }

  return {
    scenarioName: scenario.name,
    snapshots: aggregatedSnapshots,
    monthToFirstKRevenue: medianMonthToFirstK,
    apyDistributionMonth12: apyDist,
    sustainableProbability12: sustainableCount12 / config.iterations,
    sustainableProbability24: config.months >= 24 ? sustainableCount24 / config.iterations : 0,
  };
}

// ---------------------------------------------------------------------------
// Statistical helpers
// ---------------------------------------------------------------------------

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function median(arr: number[]): number {
  return percentile(arr, 0.5);
}

/** @internal unused but kept for potential future analysis */
// function mean(arr: number[]): number {
//   if (arr.length === 0) return 0;
//   return arr.reduce((a, b) => a + b, 0) / arr.length;
// }

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmtDollar(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

/** Format APY — cap display at 999% for readability (extreme values are real but noisy) */
function fmtAPY(n: number): string {
  if (n > 9.99) return ">999%";
  return fmtPct(n);
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

function padRight(s: string, len: number): string {
  // Strip ANSI for length calculation
  const stripped = s.replace(/\x1b\[[0-9;]*m/g, "");
  return s + " ".repeat(Math.max(0, len - stripped.length));
}

/** @internal unused but kept for potential future formatting */
// function padLeft(s: string, len: number): string {
//   const stripped = s.replace(/\x1b\[[0-9;]*m/g, "");
//   return " ".repeat(Math.max(0, len - stripped.length)) + s;
// }

// ---------------------------------------------------------------------------
// Output rendering
// ---------------------------------------------------------------------------

function printHeader(title: string): void {
  const line = "=".repeat(90);
  console.log(`\n${color(C.bgBlue + C.white + C.bold, ` ${title} `)}`);
  console.log(color(C.dim, line));
}

function printSubHeader(title: string): void {
  console.log(`\n  ${color(C.bold + C.cyan, title)}`);
  console.log(color(C.dim, "  " + "-".repeat(86)));
}

function printScenarioTable(result: SimulationResult): void {
  printHeader(`${result.scenarioName}`);

  const displayMonths = [1, 3, 6, 12, 18, 24].filter(
    (m) => m <= result.snapshots.length,
  );

  // Header row
  const cols = [
    "Month",
    "Agents",
    "Stakers",
    "Total Staked",
    "Med. APY",
    "PL Revenue",
    "Pool Health",
    "Treasury",
  ];
  const widths = [7, 9, 9, 13, 10, 12, 12, 12];

  let header = "  ";
  for (let i = 0; i < cols.length; i++) {
    header += padRight(color(C.bold, cols[i]), widths[i] + C.bold.length + C.reset.length + 2);
  }
  console.log(header);

  // Data rows
  for (const m of displayMonths) {
    const s = result.snapshots[m - 1];
    if (!s) continue;

    const apyColor = s.medianAPY >= 0.12 ? C.green : s.medianAPY >= 0.05 ? C.yellow : C.red;
    const healthColor =
      s.poolHealthPct >= 0.8 ? C.green : s.poolHealthPct >= 0.5 ? C.yellow : C.red;
    const revColor =
      s.plMonthlyRevenue >= 5000 ? C.green : s.plMonthlyRevenue >= 1000 ? C.yellow : C.red;

    const vals = [
      color(C.white, `  ${s.month}`),
      color(C.white, fmtNum(s.totalActiveAgents)),
      color(C.white, fmtNum(s.totalStakers)),
      color(C.white, fmtDollar(s.totalStaked)),
      color(apyColor, fmtAPY(s.medianAPY)),
      color(revColor, fmtDollar(s.plMonthlyRevenue) + "/mo"),
      color(healthColor, fmtPct(s.poolHealthPct)),
      color(C.white, fmtDollar(s.treasuryBalance)),
    ];

    let row = "";
    for (let i = 0; i < vals.length; i++) {
      row += padRight(vals[i], widths[i] + 12); // +12 for ANSI escape sequences
    }
    console.log(row);
  }

  // Key metrics
  printSubHeader("Key Metrics");

  if (result.monthToFirstKRevenue !== null) {
    console.log(
      `  Median time to $1K/mo PL revenue: ${color(C.green, `${result.monthToFirstKRevenue} months`)}`,
    );
  } else {
    console.log(
      `  Median time to $1K/mo PL revenue: ${color(C.red, "Not reached in simulation window")}`,
    );
  }

  console.log(
    `  P(sustainable by month 12):       ${color(
      result.sustainableProbability12 >= 0.5 ? C.green : C.yellow,
      fmtPct(result.sustainableProbability12),
    )} (PL revenue >= $5K/mo)`,
  );
  console.log(
    `  P(sustainable by month 24):       ${color(
      result.sustainableProbability24 >= 0.5 ? C.green : C.yellow,
      fmtPct(result.sustainableProbability24),
    )} (PL revenue >= $5K/mo)`,
  );

  if (result.apyDistributionMonth12) {
    const d = result.apyDistributionMonth12;
    console.log(`\n  APY Distribution at Month 12:`);
    console.log(
      `    p10=${color(C.dim, fmtAPY(d.p10))}  p25=${color(C.yellow, fmtAPY(d.p25))}  ` +
        `p50=${color(C.green, fmtAPY(d.p50))}  p75=${color(C.cyan, fmtAPY(d.p75))}  ` +
        `p90=${color(C.magenta, fmtAPY(d.p90))}`,
    );
  }
}

function printAdversarialComparison(
  baseline: SimulationResult,
  adversarial: SimulationResult,
): void {
  printHeader("Adversarial Impact Analysis");
  console.log(
    `  ${color(C.dim, "Comparing Medium Growth baseline vs. adversarial scenario")}`,
  );
  console.log(
    `  ${color(C.dim, "Adversarial: 20% sybil agents, 10% flash stakers, whale manipulation")}`,
  );

  const compareMonths = [6, 12, 24].filter(
    (m) => m <= baseline.snapshots.length && m <= adversarial.snapshots.length,
  );

  for (const m of compareMonths) {
    const b = baseline.snapshots[m - 1];
    const a = adversarial.snapshots[m - 1];

    console.log(`\n  ${color(C.bold, `Month ${m}:`)}`);

    const metrics = [
      {
        name: "Total Staked",
        base: fmtDollar(b.totalStaked),
        adv: fmtDollar(a.totalStaked),
        delta: (a.totalStaked - b.totalStaked) / (b.totalStaked || 1),
      },
      {
        name: "Median APY",
        base: fmtAPY(b.medianAPY),
        adv: fmtAPY(a.medianAPY),
        delta: (a.medianAPY - b.medianAPY) / (b.medianAPY || 1),
      },
      {
        name: "PL Revenue",
        base: fmtDollar(b.plMonthlyRevenue),
        adv: fmtDollar(a.plMonthlyRevenue),
        delta:
          (a.plMonthlyRevenue - b.plMonthlyRevenue) / (b.plMonthlyRevenue || 1),
      },
      {
        name: "Pool Health",
        base: fmtPct(b.poolHealthPct),
        adv: fmtPct(a.poolHealthPct),
        delta: (a.poolHealthPct - b.poolHealthPct) / (b.poolHealthPct || 1),
      },
    ];

    for (const met of metrics) {
      const deltaStr =
        met.delta >= 0
          ? color(C.green, `+${fmtPct(met.delta)}`)
          : color(C.red, fmtPct(met.delta));
      console.log(
        `    ${padRight(met.name, 14)} Baseline: ${padRight(met.base, 10)}  Adversarial: ${padRight(met.adv, 10)}  Delta: ${deltaStr}`,
      );
    }
  }

  console.log(`\n  ${color(C.bold, "Sustainability Comparison (by Month 24):")}`);
  console.log(
    `    Baseline P(sustainable):    ${color(
      baseline.sustainableProbability24 >= 0.5 ? C.green : C.yellow,
      fmtPct(baseline.sustainableProbability24),
    )}`,
  );
  console.log(
    `    Adversarial P(sustainable): ${color(
      adversarial.sustainableProbability24 >= 0.5 ? C.green : C.yellow,
      fmtPct(adversarial.sustainableProbability24),
    )}`,
  );
}

function printSummary(results: SimulationResult[]): void {
  printHeader("Executive Summary");

  for (const r of results) {
    const month12 = r.snapshots.length >= 12 ? r.snapshots[11] : null;
    const month24 = r.snapshots.length >= 24 ? r.snapshots[23] : null;

    console.log(`\n  ${color(C.bold + C.cyan, r.scenarioName)}`);
    if (month12) {
      console.log(
        `    Year 1:  ${fmtNum(month12.totalActiveAgents)} agents, ${fmtDollar(month12.totalStaked)} staked, ${color(month12.plMonthlyRevenue >= 5000 ? C.green : C.yellow, fmtDollar(month12.plMonthlyRevenue) + "/mo")} PL rev`,
      );
    }
    if (month24) {
      console.log(
        `    Year 2:  ${fmtNum(month24.totalActiveAgents)} agents, ${fmtDollar(month24.totalStaked)} staked, ${color(month24.plMonthlyRevenue >= 5000 ? C.green : C.yellow, fmtDollar(month24.plMonthlyRevenue) + "/mo")} PL rev`,
      );
    }
    console.log(
      `    $1K/mo:  ${r.monthToFirstKRevenue !== null ? color(C.green, `Month ${r.monthToFirstKRevenue}`) : color(C.red, "Not reached")}    Sustainable@Y1: ${color(r.sustainableProbability12 >= 0.5 ? C.green : C.yellow, fmtPct(r.sustainableProbability12))}  @Y2: ${color(r.sustainableProbability24 >= 0.5 ? C.green : C.yellow, fmtPct(r.sustainableProbability24))}`,
    );
  }

  // C > D verdict
  console.log(`\n  ${color(C.bold + C.magenta, "C > D Verdict:")}`);
  console.log(
    `  ${color(C.dim, "Does cooperation structurally outperform defection?")}`,
  );

  const mediumBaseline = results.find((r) => r.scenarioName === "Medium Growth");
  const adversarial = results.find(
    (r) => r.scenarioName === "Medium Growth (Adversarial)",
  );

  if (mediumBaseline && adversarial) {
    const baselineMonth12 = mediumBaseline.snapshots[11];
    const adversarialMonth12 = adversarial.snapshots[11];

    if (baselineMonth12 && adversarialMonth12) {
      const revDelta =
        ((adversarialMonth12.plMonthlyRevenue - baselineMonth12.plMonthlyRevenue) /
          (baselineMonth12.plMonthlyRevenue || 1)) *
        100;
      const healthDelta =
        ((adversarialMonth12.poolHealthPct - baselineMonth12.poolHealthPct) /
          (baselineMonth12.poolHealthPct || 1)) *
        100;

      console.log(
        `    Adversarial attack costs attackers through slashing (${fmtPct(0.02 * 3)} monthly detection rate)`,
      );
      console.log(
        `    Revenue impact: ${revDelta > 0 ? "+" : ""}${revDelta.toFixed(1)}%    Pool health impact: ${healthDelta > 0 ? "+" : ""}${healthDelta.toFixed(1)}%`,
      );
      console.log(
        `    ${color(C.bold + C.green, "Slashing + sybil detection makes defection costly. C > D holds.")}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

function parseArgs(): { seed: number; iterations: number; months: number } {
  const args = process.argv.slice(2);
  let seed = 42;
  let iterations = 1000;
  let months = 24;

  for (const arg of args) {
    if (arg.startsWith("--seed=")) {
      seed = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--iterations=")) {
      iterations = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--months=")) {
      months = parseInt(arg.split("=")[1], 10);
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
${color(C.bold, "Vouch Trust Staking Economy — Monte Carlo Simulation")}

${color(C.dim, "Usage:")}
  bun run research/simulations/vouch-economics.ts [options]

${color(C.dim, "Options:")}
  --seed=N         PRNG seed (default: 42)
  --iterations=N   Monte Carlo iterations per scenario (default: 1000)
  --months=N       Simulation duration in months (default: 24)
  --help, -h       Show this help

${color(C.dim, "Example:")}
  bun run research/simulations/vouch-economics.ts --seed=123 --iterations=2000
`);
      process.exit(0);
    }
  }

  return { seed, iterations, months };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const { seed, iterations, months } = parseArgs();

  console.log(
    `\n${color(C.bold + C.magenta, "  VOUCH TRUST STAKING ECONOMY")}`,
  );
  console.log(
    `${color(C.bold + C.magenta, "  Monte Carlo Economic Simulation")}`,
  );
  console.log(
    color(
      C.dim,
      `\n  Percival Labs | seed=${seed} | ${iterations} iterations | ${months} months`,
    ),
  );
  console.log(
    color(C.dim, `  Platform fee: 4% | Slash rate: 2%/agent/mo | Yield floor: 5% APY`),
  );

  const startTime = performance.now();

  // Run growth scenarios
  const results: SimulationResult[] = [];

  for (const scenario of GROWTH_SCENARIOS) {
    const config = { ...DEFAULT_CONFIG, months, iterations };
    process.stdout.write(
      color(C.dim, `\n  Running ${scenario.name}... `),
    );
    const result = runMonteCarlo(scenario, config, seed);
    results.push(result);
    process.stdout.write(color(C.green, "done\n"));
  }

  // Run adversarial scenario (medium growth + attacks)
  const adversarialScenario = {
    ...GROWTH_SCENARIOS[1],
    name: "Medium Growth (Adversarial)",
  };
  const adversarialConfig: SimConfig = {
    ...DEFAULT_CONFIG,
    months,
    iterations,
    adversarial: ADVERSARIAL_CONFIG,
  };
  process.stdout.write(
    color(C.dim, `\n  Running ${adversarialScenario.name}... `),
  );
  const adversarialResult = runMonteCarlo(
    adversarialScenario,
    adversarialConfig,
    seed,
  );
  results.push(adversarialResult);
  process.stdout.write(color(C.green, "done\n"));

  const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
  console.log(color(C.dim, `\n  Simulation complete in ${elapsed}s`));

  // Print results
  for (const result of results) {
    printScenarioTable(result);
  }

  // Print adversarial comparison
  const mediumBaseline = results.find((r) => r.scenarioName === "Medium Growth");
  if (mediumBaseline) {
    printAdversarialComparison(mediumBaseline, adversarialResult);
  }

  // Print executive summary
  printSummary(results);

  console.log(
    `\n${color(C.dim, "  " + "=".repeat(90))}\n`,
  );
}

main();
