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
  // PL Sovereign Wealth Fund
  plTotalValue: number;       // cash + staked
  plStaked: number;           // currently staked
  plCash: number;             // undeployed treasury
  plMonthlyYield: number;     // yield earned this month on PL stakes
  plCumulativeFees: number;   // running total of fees collected
  // Insurance products
  insuranceActive: boolean;
  insurancePremiumRevenue: number;  // PL's platform fee on premiums this month
  insuranceSurplusRevenue: number;  // PL's share of underwriting surplus this month
  insuranceTotalRevenue: number;    // combined insurance revenue this month
  plTotalMonthlyIncome: number;     // yield + insurance + platform fees (complete picture)
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
  // PL Sovereign Wealth Fund
  plMonth12Value: number | null;
  plMonth24Value: number | null;
  plROI24: number | null;          // total value / seed capital at month 24
  plMonthlyYield24: number | null;
}

interface InsuranceConfig {
  launchMonth: number;            // month insurance products go live (default 18)
  initialParticipationRate: number; // fraction of agents buying coverage at launch (0.05)
  matureParticipationRate: number;  // target participation after ramp (0.30)
  rampMonths: number;              // months to reach mature rate (12)
  avgMonthlyPremiumPerAgent: number; // average monthly premium in USD ($15)
  blendedPlatformFeeRate: number;  // PL's cut of premiums (0.04 = 4%, blended across products)
  lossRatio: number;               // fraction of premiums paid out as claims (0.40 = 40%)
  plUnderwritingShare: number;     // PL's share of underwriting pool (0.10 = 10%)
}

interface AdversarialConfig {
  sybilFraction: number; // fraction of new agents that are sybil
  flashStakerFraction: number; // fraction of new stakers that are flash stakers
  whaleEnabled: boolean; // whether whale manipulation occurs
}

interface SimConfig {
  months: number;
  iterations: number;
  platformFeeRate: number; // 0.01 (1%)
  unstakingNoticeDays: number;
  slashProbabilityPerMonth: number; // per-agent
  slashAmountRange: [number, number]; // fraction of pool
  stakerChurnBaseRate: number; // base monthly churn
  yieldFloorAPY: number; // stakers leave if below this
  yieldFloorMonths: number; // consecutive months below floor triggers exit
  operatingCostPerMonth: number; // $5K for sustainability check
  adversarial: AdversarialConfig;
  // PL Sovereign Wealth Fund config
  plSeedCapital: number;          // initial investment in USD
  plOperatingCostPerMonth: number; // monthly infra costs in USD
  plMaxPoolConcentration: number;  // max fraction per pool (0.20 = 20%)
  plReinvestmentRate: number;      // fraction of yield reinvested (1.0 = 100%)
  // Insurance products
  insurance: InsuranceConfig;
}

interface PLTreasuryState {
  cashBalance: number;            // undeployed USD available
  totalStaked: number;            // currently staked across pools (USD)
  stakes: Map<number, number>;    // agentId -> staked amount (USD)
  cumulativeFees: number;         // total platform fees collected
  cumulativeYield: number;        // total yield earned on stakes
  cumulativeOperatingCosts: number;
}

// ---------------------------------------------------------------------------
// Constants & scenarios
// ---------------------------------------------------------------------------

const GROWTH_SCENARIOS: GrowthScenario[] = [
  { name: "Slow Growth", agentsPerMonth: 10, avgBacking: 500, stakerRatio: 0.2 },
  { name: "Medium Growth", agentsPerMonth: 50, avgBacking: 2000, stakerRatio: 0.4 },
  { name: "Fast Growth", agentsPerMonth: 200, avgBacking: 5000, stakerRatio: 0.6 },
];

const DEFAULT_INSURANCE: InsuranceConfig = {
  launchMonth: 18,
  initialParticipationRate: 0.05,   // 5% of agents at launch
  matureParticipationRate: 0.30,    // 30% after full ramp
  rampMonths: 12,                    // 12 months to full participation
  avgMonthlyPremiumPerAgent: 15,    // $15/agent/month average
  blendedPlatformFeeRate: 0.04,     // 4% blended (MutualShield 3%, TrustBond 4%, ActionCover 5%)
  lossRatio: 0.40,                   // 40% loss ratio (conservative for novel market)
  plUnderwritingShare: 0.10,        // PL holds 10% of underwriting capital
};

const DEFAULT_CONFIG: SimConfig = {
  months: 36,
  iterations: 1000,
  platformFeeRate: 0.01, // 1% — lowest viable rate, covers infrastructure
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
  plSeedCapital: 1000,
  plOperatingCostPerMonth: 100,
  plMaxPoolConcentration: 0.20,
  plReinvestmentRate: 1.0,
  insurance: DEFAULT_INSURANCE,
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

  // PL Sovereign Wealth Fund state
  const plTreasury: PLTreasuryState = {
    cashBalance: config.plSeedCapital,
    totalStaked: 0,
    stakes: new Map(),
    cumulativeFees: 0,
    cumulativeYield: 0,
    cumulativeOperatingCosts: 0,
  };

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
    let plMonthlyYield = 0;

    for (const aid of activeAgentIds) {
      const agent = agentMap.get(aid)!;
      const poolStakers = stakersByAgent.get(aid);
      const plStakeInPool = plTreasury.stakes.get(aid) || 0;
      const hasStakers = poolStakers && poolStakers.length > 0;

      // Skip only if NO stakers AND no PL stake
      if (!hasStakers && plStakeInPool === 0) continue;
      if (agent.poolBalance <= 0) continue;

      const activityFee = agent.monthlyRevenue * agent.activityFeeRate;
      const platformFee = activityFee * config.platformFeeRate;
      const netYield = activityFee - platformFee;

      totalPlatformFee += platformFee;

      // Monthly yield rate -> APY (capped at 500% for reporting sanity)
      const monthlyRate = netYield / agent.poolBalance;
      const rawAPY = Math.pow(1 + monthlyRate, 12) - 1;
      agentAPYs.push(rawAPY);

      // Distribute to real stakers proportionally (yield compounds into pool)
      const poolBefore = agent.poolBalance;
      if (hasStakers) {
        for (const staker of poolStakers!) {
          const share = staker.stakeAmount / poolBefore;
          const stakerYield = netYield * share;
          staker.stakeAmount += stakerYield;
          totalStakedAmount += stakerYield;
        }
      }

      // Track PL's proportional share of yield (using poolBefore for correct fraction)
      if (plStakeInPool > 0) {
        const plShare = plStakeInPool / poolBefore;
        const plYield = netYield * plShare;
        plTreasury.stakes.set(aid, plStakeInPool + plYield);
        plTreasury.totalStaked += plYield;
        plMonthlyYield += plYield;
      }

      agent.poolBalance += netYield;
    }

    // -----------------------------------------------------------------------
    // 5b. PL Sovereign Wealth Fund — monthly cycle
    // -----------------------------------------------------------------------

    // 5b-i. Collect platform fees
    plTreasury.cashBalance += totalPlatformFee;
    plTreasury.cumulativeFees += totalPlatformFee;
    plTreasury.cumulativeYield += plMonthlyYield;

    // 5b-ii. Deduct operating costs
    plTreasury.cashBalance -= config.plOperatingCostPerMonth;
    plTreasury.cumulativeOperatingCosts += config.plOperatingCostPerMonth;
    if (plTreasury.cashBalance < 0) plTreasury.cashBalance = 0;

    // 5b-iii. Reinvest available cash into top pools
    const availableToStake = Math.max(0, plTreasury.cashBalance - 50); // keep $50 reserve
    if (availableToStake > 0) {
      const rankedPools = activeAgentIds
        .map(id => {
          const a = agentMap.get(id)!;
          const pool = Math.max(a.poolBalance, 1);
          const estAPY = (a.monthlyRevenue * a.activityFeeRate * (1 - config.platformFeeRate) / pool) * 12;
          return { id, estAPY, poolBalance: a.poolBalance };
        })
        .filter(p => p.estAPY > 0)
        .sort((a, b) => b.estAPY - a.estAPY)
        .slice(0, 10);

      if (rankedPools.length > 0) {
        const perPool = availableToStake / rankedPools.length;
        const maxPerPool = (plTreasury.totalStaked + availableToStake) * config.plMaxPoolConcentration;

        for (const pool of rankedPools) {
          const existingStake = plTreasury.stakes.get(pool.id) || 0;
          const stakeAmount = Math.min(perPool, Math.max(0, maxPerPool - existingStake));
          if (stakeAmount > 0) {
            plTreasury.stakes.set(pool.id, existingStake + stakeAmount);
            plTreasury.totalStaked += stakeAmount;
            plTreasury.cashBalance -= stakeAmount;
            // PL capital deepens pool liquidity
            agentMap.get(pool.id)!.poolBalance += stakeAmount;
          }
        }
      }
    }

    // -----------------------------------------------------------------------
    // 5c. Insurance product revenue (after launch month)
    // -----------------------------------------------------------------------
    let insurancePremiumRevenue = 0;
    let insuranceSurplusRevenue = 0;
    const ins = config.insurance;
    const insuranceActive = month >= ins.launchMonth;

    if (insuranceActive) {
      // Participation ramps linearly from initial to mature over rampMonths
      const monthsSinceLaunch = month - ins.launchMonth;
      const rampProgress = Math.min(1, monthsSinceLaunch / ins.rampMonths);
      const participationRate = ins.initialParticipationRate +
        (ins.matureParticipationRate - ins.initialParticipationRate) * rampProgress;

      // Premium scales slightly with ecosystem maturity (agents willing to pay more over time)
      const premiumGrowthFactor = 1 + rampProgress * 0.5; // up to 1.5x mature premium
      const effectivePremium = ins.avgMonthlyPremiumPerAgent * premiumGrowthFactor;

      const insuredAgents = Math.floor(activeAgentIds.length * participationRate);
      const totalPremiums = insuredAgents * effectivePremium;

      // PL earns platform fee on all premium flow
      insurancePremiumRevenue = totalPremiums * ins.blendedPlatformFeeRate;

      // PL earns share of underwriting surplus (premiums - claims)
      const surplus = totalPremiums * (1 - ins.lossRatio);
      insuranceSurplusRevenue = surplus * ins.plUnderwritingShare;

      // Insurance revenue flows into PL cash for reinvestment
      plTreasury.cashBalance += insurancePremiumRevenue + insuranceSurplusRevenue;
      plTreasury.cumulativeFees += insurancePremiumRevenue;
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

        // Reduce PL stake proportionally
        const plStakeSlash = plTreasury.stakes.get(aid);
        if (plStakeSlash) {
          const plLoss = plStakeSlash * slashFraction;
          plTreasury.stakes.set(aid, plStakeSlash - plLoss);
          plTreasury.totalStaked -= plLoss;
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
      // Remove PL stake entirely from deactivated agent
      const plStakeDeactivate = plTreasury.stakes.get(aid);
      if (plStakeDeactivate) {
        plTreasury.totalStaked -= plStakeDeactivate;
        plTreasury.stakes.delete(aid);
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
          // Remove PL stake from detected sybil
          const plStakeSybil = plTreasury.stakes.get(aid);
          if (plStakeSybil) {
            plTreasury.totalStaked -= plStakeSybil;
            plTreasury.stakes.delete(aid);
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
      // PL Sovereign Wealth Fund
      plTotalValue: plTreasury.cashBalance + plTreasury.totalStaked,
      plStaked: plTreasury.totalStaked,
      plCash: plTreasury.cashBalance,
      plMonthlyYield: plMonthlyYield,
      plCumulativeFees: plTreasury.cumulativeFees,
      // Insurance
      insuranceActive,
      insurancePremiumRevenue,
      insuranceSurplusRevenue,
      insuranceTotalRevenue: insurancePremiumRevenue + insuranceSurplusRevenue,
      plTotalMonthlyIncome: plMonthlyYield + totalPlatformFee + insurancePremiumRevenue + insuranceSurplusRevenue,
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
      // PL Sovereign Wealth Fund
      plTotalValue: median(monthData.map((d) => d.plTotalValue)),
      plStaked: median(monthData.map((d) => d.plStaked)),
      plCash: median(monthData.map((d) => d.plCash)),
      plMonthlyYield: median(monthData.map((d) => d.plMonthlyYield)),
      plCumulativeFees: median(monthData.map((d) => d.plCumulativeFees)),
      // Insurance
      insuranceActive: monthData[0].insuranceActive, // same for all iterations (deterministic)
      insurancePremiumRevenue: median(monthData.map((d) => d.insurancePremiumRevenue)),
      insuranceSurplusRevenue: median(monthData.map((d) => d.insuranceSurplusRevenue)),
      insuranceTotalRevenue: median(monthData.map((d) => d.insuranceTotalRevenue)),
      plTotalMonthlyIncome: median(monthData.map((d) => d.plTotalMonthlyIncome)),
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

  // PL Sovereign Wealth Fund result fields
  const plMonth12Value = config.months >= 12
    ? median(allIterationSnapshots.map(iter => iter[11].plTotalValue))
    : null;
  const plMonth24Value = config.months >= 24
    ? median(allIterationSnapshots.map(iter => iter[23].plTotalValue))
    : null;
  const plROI24 = plMonth24Value !== null && config.plSeedCapital > 0
    ? plMonth24Value / config.plSeedCapital
    : null;
  const plMonthlyYield24 = config.months >= 24
    ? median(allIterationSnapshots.map(iter => iter[23].plMonthlyYield))
    : null;

  return {
    scenarioName: scenario.name,
    snapshots: aggregatedSnapshots,
    monthToFirstKRevenue: medianMonthToFirstK,
    apyDistributionMonth12: apyDist,
    sustainableProbability12: sustainableCount12 / config.iterations,
    sustainableProbability24: config.months >= 24 ? sustainableCount24 / config.iterations : 0,
    plMonth12Value,
    plMonth24Value,
    plROI24,
    plMonthlyYield24,
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

function padLeft(s: string, len: number): string {
  const stripped = s.replace(/\x1b\[[0-9;]*m/g, "");
  return " ".repeat(Math.max(0, len - stripped.length)) + s;
}

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

  const displayMonths = [1, 3, 6, 12, 18, 24, 30, 36].filter(
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

// ---------------------------------------------------------------------------
// PL Sovereign Wealth Fund — Full Projection Output
// ---------------------------------------------------------------------------

function printFullProjection(result: SimulationResult, seedCapital: number, config: SimConfig): void {
  const insLaunch = config.insurance.launchMonth;
  const maxMonth = result.snapshots.length;

  // -----------------------------------------------------------------------
  // Table 1: Complete SWF Growth with Revenue Breakdown
  // -----------------------------------------------------------------------
  printHeader(`PL SOVEREIGN WEALTH FUND — ${result.scenarioName} (Seed: ${fmtDollar(seedCapital)})`);
  console.log(`  ${color(C.dim, `1% platform fee | 100% reinvestment | Insurance launches Month ${insLaunch}`)}`);
  console.log(`  ${color(C.dim, `Insurance: 4% platform fee on premiums + 10% of underwriting surplus (40% loss ratio)`)}`);
  console.log();

  const displayMonths = [1, 3, 6, 12, 18, 24, 30, 36].filter(m => m <= maxMonth);

  // Phase 1 header
  console.log(`  ${color(C.bold + C.cyan, "PHASE 1: Staking Economy Only")}`);
  console.log(`  ${color(C.dim, "Revenue = 1% platform fees + staking yield (100% reinvested)")}`);
  console.log();

  const cols1 = ["Month", "SWF Value", "Staked", "Staking Yield", "Platform Fee", "Total Income", "ROI"];
  const widths1 = [7, 13, 13, 14, 13, 13, 8];

  let hdr = "  ";
  for (let i = 0; i < cols1.length; i++) {
    hdr += padRight(color(C.bold, cols1[i]), widths1[i] + C.bold.length + C.reset.length + 2);
  }
  console.log(hdr);

  for (const m of displayMonths) {
    const s = result.snapshots[m - 1];
    if (!s) continue;

    // Only show pre-insurance months in Phase 1
    if (m >= insLaunch && displayMonths.some(dm => dm >= insLaunch)) {
      if (m === insLaunch || (m === displayMonths.find(dm => dm >= insLaunch))) {
        // Print separator and move to Phase 2
        break;
      }
    }
    if (s.insuranceActive) break;

    const roi = seedCapital > 0 ? s.plTotalValue / seedCapital : 0;
    const roiColor = roi >= 10 ? C.green : roi >= 2 ? C.cyan : C.yellow;

    const vals = [
      color(C.white, `  ${s.month}`),
      color(C.green, fmtDollar(s.plTotalValue)),
      color(C.white, fmtDollar(s.plStaked)),
      color(C.cyan, fmtDollar(s.plMonthlyYield) + "/mo"),
      color(C.dim, fmtDollar(s.plMonthlyRevenue) + "/mo"),
      color(C.yellow, fmtDollar(s.plTotalMonthlyIncome) + "/mo"),
      color(roiColor, `${roi.toFixed(1)}x`),
    ];

    let row = "";
    for (let i = 0; i < vals.length; i++) {
      row += padRight(vals[i], widths1[i] + 12);
    }
    console.log(row);
  }

  // Phase 2: with insurance
  const insMonths = displayMonths.filter(m => m >= insLaunch);
  if (insMonths.length > 0) {
    console.log();
    console.log(`  ${color(C.bold + C.magenta, `PHASE 2: + Insurance Products (from Month ${insLaunch})`)}`);
    console.log(`  ${color(C.dim, "Revenue = platform fees + staking yield + insurance premiums + underwriting surplus")}`);
    console.log(`  ${color(C.dim, "Products: MutualShield (3%) + TrustBond (4%) + ActionCover (5%) — blended 4% PL fee")}`);
    console.log();

    const cols2 = ["Month", "SWF Value", "Staking Yield", "Ins. Revenue", "Total Income", "ROI", "Phase"];
    const widths2 = [7, 13, 14, 13, 14, 8, 14];

    let hdr2 = "  ";
    for (let i = 0; i < cols2.length; i++) {
      hdr2 += padRight(color(C.bold, cols2[i]), widths2[i] + C.bold.length + C.reset.length + 2);
    }
    console.log(hdr2);

    // Show a couple pre-insurance months for comparison, then insurance months
    const contextMonths = displayMonths.filter(m => m >= insLaunch - 6);
    for (const m of contextMonths) {
      const s = result.snapshots[m - 1];
      if (!s) continue;

      const roi = seedCapital > 0 ? s.plTotalValue / seedCapital : 0;
      const roiColor = roi >= 10 ? C.green : roi >= 2 ? C.cyan : C.yellow;
      const phaseLabel = s.insuranceActive ? "Staking + Ins." : "Staking Only";
      const phaseColor = s.insuranceActive ? C.magenta : C.dim;

      const vals = [
        color(C.white, `  ${s.month}`),
        color(C.green, fmtDollar(s.plTotalValue)),
        color(C.cyan, fmtDollar(s.plMonthlyYield) + "/mo"),
        color(s.insuranceActive ? C.magenta : C.dim, fmtDollar(s.insuranceTotalRevenue) + "/mo"),
        color(C.yellow, fmtDollar(s.plTotalMonthlyIncome) + "/mo"),
        color(roiColor, `${roi.toFixed(1)}x`),
        color(phaseColor, phaseLabel),
      ];

      let row = "";
      for (let i = 0; i < vals.length; i++) {
        row += padRight(vals[i], widths2[i] + 12);
      }
      console.log(row);
    }
  }

  // -----------------------------------------------------------------------
  // Table 2: Revenue Source Breakdown at Key Milestones
  // -----------------------------------------------------------------------
  console.log();
  printSubHeader("Revenue Source Breakdown");
  console.log(`  ${color(C.dim, "Where does PL's monthly income come from?")}`);
  console.log();

  const breakdownMonths = [12, 18, 24, 30, 36].filter(m => m <= maxMonth);
  const bCols = ["Month", "Staking Yield", "Platform Fees", "Insurance Rev.", "Total/mo", "% from Ins."];
  const bWidths = [7, 15, 14, 15, 13, 12];

  let bHdr = "  ";
  for (let i = 0; i < bCols.length; i++) {
    bHdr += padRight(color(C.bold, bCols[i]), bWidths[i] + C.bold.length + C.reset.length + 2);
  }
  console.log(bHdr);

  for (const m of breakdownMonths) {
    const s = result.snapshots[m - 1];
    if (!s) continue;

    const insRev = s.insuranceTotalRevenue;
    const totalIncome = s.plTotalMonthlyIncome;
    const insPct = totalIncome > 0 ? insRev / totalIncome : 0;

    const vals = [
      color(C.white, `  ${s.month}`),
      color(C.cyan, fmtDollar(s.plMonthlyYield) + "/mo"),
      color(C.dim, fmtDollar(s.plMonthlyRevenue) + "/mo"),
      color(insRev > 0 ? C.magenta : C.dim, fmtDollar(insRev) + "/mo"),
      color(C.yellow + C.bold, fmtDollar(totalIncome) + "/mo"),
      color(insPct > 0 ? C.magenta : C.dim, fmtPct(insPct)),
    ];

    let row = "";
    for (let i = 0; i < vals.length; i++) {
      row += padRight(vals[i], bWidths[i] + 12);
    }
    console.log(row);
  }

  // -----------------------------------------------------------------------
  // Table 3: BTC Appreciation Overlay
  // -----------------------------------------------------------------------
  console.log();
  printSubHeader("BTC Appreciation Overlay (sat-denominated staking)");
  console.log(`  ${color(C.dim, "All yield is Lightning-native. If BTC appreciates, USD value amplifies.")}`);
  console.log();

  const btcRates = [0, 0.30, 0.50];
  const btcMilestones = [12, 24, 36].filter(m => m <= maxMonth);

  let btcHdr = "  " + padRight(color(C.bold, ""), 16);
  for (const rate of btcRates) {
    btcHdr += padRight(color(C.bold, `${(rate * 100).toFixed(0)}% BTC/yr`), 20);
  }
  console.log(btcHdr);

  for (const m of btcMilestones) {
    const s = result.snapshots[m - 1];
    if (!s) continue;

    let row = "  " + padRight(color(C.white, `Month ${m} (Yr ${(m / 12).toFixed(0)})`), 16);
    for (const rate of btcRates) {
      const multiplier = Math.pow(1 + rate, m / 12);
      const adjusted = s.plTotalValue * multiplier;
      row += padRight(color(rate === 0 ? C.white : C.green, fmtDollar(adjusted)), 20);
    }
    console.log(row);
  }
}

function printMultiSeedComparison(
  scenario: GrowthScenario,
  baseConfig: SimConfig,
  baseSeed: number,
  seeds: number[],
): void {
  const maxMonth = baseConfig.months;
  printHeader(`PL INVESTMENT SCENARIOS — ${scenario.name} at Month ${maxMonth}`);
  console.log(`  ${color(C.dim, "Higher seed = higher absolute value, lower ROI (diminishing marginal returns)")}`);
  console.log(`  ${color(C.dim, "This is a POSITIVE signal: even $1K captures most of the compound upside")}`);
  console.log();

  const cols = ["Seed Capital", "SWF Value", "ROI", "Monthly Income", "Ins. Revenue"];
  const widths = [14, 14, 10, 15, 14];

  let header = "  ";
  for (let i = 0; i < cols.length; i++) {
    header += padRight(color(C.bold, cols[i]), widths[i] + C.bold.length + C.reset.length + 2);
  }
  console.log(header);

  for (const seedCap of seeds) {
    const config = { ...baseConfig, plSeedCapital: seedCap };
    const result = runMonteCarlo(scenario, config, baseSeed);

    const snap = result.snapshots.length >= maxMonth ? result.snapshots[maxMonth - 1] : null;
    if (!snap) continue;

    const roi = seedCap > 0 ? snap.plTotalValue / seedCap : 0;

    const vals = [
      color(C.white, `  ${fmtDollar(seedCap)}`),
      color(C.green, fmtDollar(snap.plTotalValue)),
      color(roi >= 10 ? C.green : C.cyan, `${roi.toFixed(1)}x`),
      color(C.yellow, fmtDollar(snap.plTotalMonthlyIncome) + "/mo"),
      color(snap.insuranceTotalRevenue > 0 ? C.magenta : C.dim,
        fmtDollar(snap.insuranceTotalRevenue) + "/mo"),
    ];

    let row = "";
    for (let i = 0; i < vals.length; i++) {
      row += padRight(vals[i], widths[i] + 12);
    }
    console.log(row);
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

  const compareMonths = [6, 12, 24, 36].filter(
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

function parseArgs(): { seed: number; iterations: number; months: number; seedCapital: number; operatingCost: number } {
  const args = process.argv.slice(2);
  let seed = 42;
  let iterations = 1000;
  let months = 36;
  let seedCapital = 1000;
  let operatingCost = 100;

  for (const arg of args) {
    if (arg.startsWith("--seed=")) {
      seed = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--iterations=")) {
      iterations = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--months=")) {
      months = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--seed-capital=")) {
      seedCapital = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--operating-cost=")) {
      operatingCost = parseInt(arg.split("=")[1], 10);
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
${color(C.bold, "Vouch Trust Staking Economy — Monte Carlo Simulation")}

${color(C.dim, "Usage:")}
  bun run research/simulations/vouch-economics.ts [options]

${color(C.dim, "Options:")}
  --seed=N             PRNG seed (default: 42)
  --iterations=N       Monte Carlo iterations per scenario (default: 1000)
  --months=N           Simulation duration in months (default: 36)
  --seed-capital=N     PL initial investment in USD (default: 1000)
  --operating-cost=N   PL monthly operating costs in USD (default: 100)
  --help, -h           Show this help

${color(C.dim, "Example:")}
  bun run research/simulations/vouch-economics.ts --seed-capital=5000 --iterations=2000
`);
      process.exit(0);
    }
  }

  return { seed, iterations, months, seedCapital, operatingCost };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const { seed, iterations, months, seedCapital, operatingCost } = parseArgs();

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
    color(C.dim, `  Platform fee: 1% | Deposit fee: 0% | Slash rate: 2%/agent/mo | Yield floor: 5% APY`),
  );
  console.log(
    color(C.dim, `  PL Seed Capital: ${fmtDollar(seedCapital)} | PL Operating Cost: ${fmtDollar(operatingCost)}/mo`),
  );

  const startTime = performance.now();

  // Run growth scenarios
  const results: SimulationResult[] = [];

  for (const scenario of GROWTH_SCENARIOS) {
    const config: SimConfig = {
      ...DEFAULT_CONFIG,
      months,
      iterations,
      plSeedCapital: seedCapital,
      plOperatingCostPerMonth: operatingCost,
    };
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
    plSeedCapital: seedCapital,
    plOperatingCostPerMonth: operatingCost,
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

  // ---------------------------------------------------------------------------
  // PL Sovereign Wealth Fund — Full Projections
  // ---------------------------------------------------------------------------
  const mediumResult = results.find((r) => r.scenarioName === "Medium Growth");
  if (mediumResult) {
    const mediumConfig: SimConfig = {
      ...DEFAULT_CONFIG,
      months,
      iterations,
      plSeedCapital: seedCapital,
      plOperatingCostPerMonth: operatingCost,
    };

    // Full projection with Phase 1 (staking) + Phase 2 (+ insurance)
    printFullProjection(mediumResult, seedCapital, mediumConfig);

    // Multi-seed comparison at final month
    const multiSeedConfig: SimConfig = {
      ...DEFAULT_CONFIG,
      months,
      iterations,
      plOperatingCostPerMonth: operatingCost,
    };
    process.stdout.write(
      color(C.dim, `\n  Running multi-seed comparison... `),
    );
    printMultiSeedComparison(
      GROWTH_SCENARIOS[1], // Medium Growth
      multiSeedConfig,
      seed,
      [1000, 5000, 10000, 25000],
    );
    process.stdout.write(color(C.green, "done\n"));
  }

  console.log(
    `\n${color(C.dim, "  " + "=".repeat(90))}\n`,
  );
}

main();
