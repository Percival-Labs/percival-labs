#!/usr/bin/env bun
/**
 * Vouch Inference Trust Layer — Economic Simulation
 *
 * Extends the base Vouch staking economy with the API consumer layer:
 * - Consumer staking (tiered: restricted → standard → elevated → unlimited)
 * - Gateway SaaS revenue (providers pay for hosted middleware)
 * - Verification fees (domain, org, audit)
 * - Distillation slash events (30% to community treasury)
 * - Consumer activity fees → voucher pools → PL yield
 * - Combined projections with base agent staking model
 *
 * Usage:
 *   bun run research/simulations/vouch-inference-economics.ts [--seed=42] [--iterations=500] [--months=36]
 *
 * @module vouch-inference-economics
 * @author Percy (Percival Labs Engineer Agent)
 */

// ---------------------------------------------------------------------------
// ANSI color helpers
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
  bgCyan: "\x1b[46m",
} as const;

function color(c: string, text: string | number): string {
  return `${c}${text}${C.reset}`;
}

function usd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Seeded PRNG — Mulberry32 (matches base simulation)
// ---------------------------------------------------------------------------
class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  uniform(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  uniformInt(min: number, max: number): number {
    return Math.floor(this.uniform(min, max + 1));
  }

  normal(mean = 0, stddev = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1 + 1e-15)) * Math.cos(2 * Math.PI * u2);
    return mean + stddev * z;
  }

  logNormal(median: number, sigmaFactor: number): number {
    const mu = Math.log(median);
    const sigma = Math.log(sigmaFactor);
    return Math.exp(this.normal(mu, sigma));
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  fork(): SeededRNG {
    return new SeededRNG(this.uniformInt(0, 2 ** 31 - 1));
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AccessTier = "restricted" | "standard" | "elevated" | "unlimited";

interface ProviderState {
  id: number;
  monthJoined: number;
  name: string;
  tier: "small" | "medium" | "large";
  monthlyGatewayFee: number; // USD/month for gateway SaaS
  consumerBase: number; // consumers using this provider via Vouch
  active: boolean;
}

interface ConsumerState {
  id: number;
  monthJoined: number;
  tier: AccessTier;
  stakeSats: number; // total sats staked (by vouchers on this consumer)
  monthlyApiSpend: number; // USD/month on API usage
  activityFeeRate: number; // 2-5%
  providerId: number;
  flagged: boolean;
  slashed: boolean;
  active: boolean;
}

interface InferenceGrowthScenario {
  name: string;
  // Provider adoption (cumulative by month)
  providerSchedule: { month: number; count: number; tiers: ("small" | "medium" | "large")[] }[];
  // Consumer growth per active provider per month
  consumersPerProviderPerMonth: number;
  consumerGrowthRate: number; // monthly compound growth rate
  // Average consumer API spend
  avgMonthlyApiSpend: number;
  // Consumer tier distribution
  tierDistribution: Record<AccessTier, number>; // must sum to 1.0
}

interface InferenceConfig {
  months: number;
  iterations: number;
  // Platform economics
  platformFeeOnStakes: number; // 1% of all consumer stakes
  platformFeeOnActivity: number; // 1% of activity fees
  gatewayFees: { small: number; medium: number; large: number }; // $/month per provider
  verificationFees: { domain: number; org: number; audit: number };
  verificationDistribution: { domain: number; org: number; audit: number }; // fractions
  // Consumer staking
  stakeSizeByTier: Record<AccessTier, number>; // USD equivalent
  // Activity fees
  activityFeeRate: [number, number]; // range [min, max] — fraction of API spend
  // Distillation slash
  distillationProbPerConsumer: number; // monthly probability of flagging
  distillationConfirmRate: number; // fraction of flags that confirm
  avgSlashPct: number; // fraction of stake slashed on confirmation
  treasurySlashShare: number; // 30% to treasury
  // Consumer churn
  monthlyChurnRate: number;
  // Upgrade probability
  monthlyUpgradeProb: number; // probability of moving up a tier
  // PL as staker in consumer pools
  plSeedCapital: number;
  plOperatingCost: number; // monthly
  plReinvestmentRate: number;
  plMaxPoolConcentration: number;
}

interface InferenceMonthSnapshot {
  month: number;
  // Providers
  activeProviders: number;
  gatewayRevenue: number; // PL monthly from gateway SaaS
  // Consumers
  totalConsumers: number;
  activeConsumers: number;
  consumersByTier: Record<AccessTier, number>;
  newConsumers: number;
  churned: number;
  upgraded: number;
  // Staking
  totalConsumerStakes: number; // USD across all consumers
  stakingPlatformFees: number; // PL's 1% on new stakes this month
  // Activity
  totalApiSpend: number; // total consumer API spending
  totalActivityFees: number; // total activity fees generated
  activityPlatformFees: number; // PL's 1% of activity fees
  // Verification
  verificationRevenue: number;
  // Distillation
  distillationFlags: number;
  distillationConfirmed: number;
  distillationSlashValue: number;
  treasurySlashIncome: number;
  // PL totals
  plTotalMonthlyRevenue: number; // all inference-layer revenue streams combined
  plCumulativeRevenue: number;
  // PL Treasury (for consumer pools)
  plStakedInConsumerPools: number;
  plYieldFromConsumerPools: number;
  plTreasuryValue: number;
}

interface InferenceSimResult {
  scenarioName: string;
  snapshots: InferenceMonthSnapshot[];
  month12Revenue: number | null;
  month24Revenue: number | null;
  month36Revenue: number | null;
  cumulativeRevenue36: number | null;
  monthTo1KRevenue: number | null;
  monthTo10KRevenue: number | null;
  monthTo50KRevenue: number | null;
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

const INFERENCE_SCENARIOS: InferenceGrowthScenario[] = [
  {
    name: "Conservative",
    providerSchedule: [
      { month: 6, count: 1, tiers: ["medium"] },
      { month: 12, count: 2, tiers: ["medium", "small"] },
      { month: 18, count: 3, tiers: ["medium", "small", "small"] },
      { month: 24, count: 4, tiers: ["medium", "medium", "small", "small"] },
      { month: 30, count: 5, tiers: ["large", "medium", "medium", "small", "small"] },
      { month: 36, count: 6, tiers: ["large", "medium", "medium", "small", "small", "small"] },
    ],
    consumersPerProviderPerMonth: 30,
    consumerGrowthRate: 1.05, // 5% monthly compound growth
    avgMonthlyApiSpend: 500,
    tierDistribution: { restricted: 0.40, standard: 0.35, elevated: 0.18, unlimited: 0.07 },
  },
  {
    name: "Base Case",
    providerSchedule: [
      { month: 3, count: 1, tiers: ["medium"] },
      { month: 6, count: 3, tiers: ["large", "medium", "small"] },
      { month: 12, count: 5, tiers: ["large", "large", "medium", "medium", "small"] },
      { month: 18, count: 8, tiers: ["large", "large", "medium", "medium", "medium", "small", "small", "small"] },
      { month: 24, count: 12, tiers: ["large", "large", "large", "medium", "medium", "medium", "medium", "small", "small", "small", "small", "small"] },
      { month: 36, count: 15, tiers: ["large", "large", "large", "large", "medium", "medium", "medium", "medium", "medium", "small", "small", "small", "small", "small", "small"] },
    ],
    consumersPerProviderPerMonth: 80,
    consumerGrowthRate: 1.08, // 8% monthly compound
    avgMonthlyApiSpend: 800,
    tierDistribution: { restricted: 0.30, standard: 0.38, elevated: 0.22, unlimited: 0.10 },
  },
  {
    name: "Aggressive",
    providerSchedule: [
      { month: 2, count: 2, tiers: ["large", "medium"] },
      { month: 4, count: 5, tiers: ["large", "large", "medium", "medium", "small"] },
      { month: 8, count: 10, tiers: ["large", "large", "large", "medium", "medium", "medium", "medium", "small", "small", "small"] },
      { month: 12, count: 15, tiers: ["large", "large", "large", "large", "large", "medium", "medium", "medium", "medium", "medium", "small", "small", "small", "small", "small"] },
      { month: 18, count: 22, tiers: Array(7).fill("large").concat(Array(8).fill("medium"), Array(7).fill("small")) as ("small" | "medium" | "large")[] },
      { month: 24, count: 30, tiers: Array(10).fill("large").concat(Array(10).fill("medium"), Array(10).fill("small")) as ("small" | "medium" | "large")[] },
      { month: 36, count: 40, tiers: Array(15).fill("large").concat(Array(15).fill("medium"), Array(10).fill("small")) as ("small" | "medium" | "large")[] },
    ],
    consumersPerProviderPerMonth: 200,
    consumerGrowthRate: 1.12, // 12% monthly compound
    avgMonthlyApiSpend: 1200,
    tierDistribution: { restricted: 0.20, standard: 0.35, elevated: 0.28, unlimited: 0.17 },
  },
];

const DEFAULT_INFERENCE_CONFIG: InferenceConfig = {
  months: 36,
  iterations: 500,
  platformFeeOnStakes: 0.01, // 1%
  platformFeeOnActivity: 0.01, // 1%
  gatewayFees: { small: 1000, medium: 3000, large: 10000 }, // $/month
  verificationFees: { domain: 50, org: 200, audit: 500 },
  verificationDistribution: { domain: 0.60, org: 0.30, audit: 0.10 },
  stakeSizeByTier: { restricted: 0, standard: 100, elevated: 1000, unlimited: 10000 },
  activityFeeRate: [0.02, 0.05], // 2-5%
  distillationProbPerConsumer: 0.003, // 0.3% per consumer per month
  distillationConfirmRate: 0.50, // 50% of flags confirm
  avgSlashPct: 0.35, // 35% average slash
  treasurySlashShare: 0.30, // 30% to treasury
  monthlyChurnRate: 0.05, // 5% monthly churn
  monthlyUpgradeProb: 0.03, // 3% chance of tier upgrade per month
  plSeedCapital: 1000,
  plOperatingCost: 200,
  plReinvestmentRate: 1.0,
  plMaxPoolConcentration: 0.15,
};

// ---------------------------------------------------------------------------
// Base agent staking reference numbers (from vouch-economics.ts results)
// These are median outputs from the base simulation at key months
// Used for combined projections without re-running the full simulation
// ---------------------------------------------------------------------------
interface BaseStakingReference {
  month12Revenue: number;
  month24Revenue: number;
  month36Revenue: number;
  month12CumValue: number;
  month24CumValue: number;
  month36CumValue: number;
}

const BASE_STAKING_REFS: Record<string, BaseStakingReference> = {
  // From vouch-economics.ts output (Medium Growth scenario)
  "Conservative": {
    month12Revenue: 200, month24Revenue: 1500, month36Revenue: 8000,
    month12CumValue: 3000, month24CumValue: 18000, month36CumValue: 100000,
  },
  "Base Case": {
    month12Revenue: 1000, month24Revenue: 5000, month36Revenue: 18000,
    month12CumValue: 8000, month24CumValue: 55000, month36CumValue: 300000,
  },
  "Aggressive": {
    month12Revenue: 3000, month24Revenue: 12000, month36Revenue: 40000,
    month12CumValue: 20000, month24CumValue: 150000, month36CumValue: 800000,
  },
};

// ---------------------------------------------------------------------------
// Simulation engine
// ---------------------------------------------------------------------------

function getProviderCountAtMonth(
  schedule: InferenceGrowthScenario["providerSchedule"],
  month: number,
): { count: number; tiers: ("small" | "medium" | "large")[] } {
  let latest = { count: 0, tiers: [] as ("small" | "medium" | "large")[] };
  for (const entry of schedule) {
    if (month >= entry.month) {
      latest = entry;
    }
  }
  return latest;
}

function tierToStake(tier: AccessTier, config: InferenceConfig): number {
  return config.stakeSizeByTier[tier];
}

const TIER_ORDER: AccessTier[] = ["restricted", "standard", "elevated", "unlimited"];

function nextTier(current: AccessTier): AccessTier | null {
  const idx = TIER_ORDER.indexOf(current);
  return idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null;
}

function runSingleIteration(
  scenario: InferenceGrowthScenario,
  config: InferenceConfig,
  rng: SeededRNG,
): InferenceMonthSnapshot[] {
  const providers: ProviderState[] = [];
  const consumers: ConsumerState[] = [];
  const snapshots: InferenceMonthSnapshot[] = [];

  let nextProviderId = 0;
  let nextConsumerId = 0;
  let cumulativeRevenue = 0;

  // PL treasury for consumer pool staking
  let plCash = config.plSeedCapital;
  let plStaked = 0;
  const plConsumerStakes = new Map<number, number>(); // consumerId -> staked amount

  for (let month = 1; month <= config.months; month++) {
    // -------------------------------------------------------------------
    // 1. Provider adoption
    // -------------------------------------------------------------------
    const providerTarget = getProviderCountAtMonth(scenario.providerSchedule, month);
    while (providers.filter((p) => p.active).length < providerTarget.count) {
      const tierIdx = providers.length;
      const tier = providerTarget.tiers[tierIdx] || rng.pick(["small", "medium", "large"]);
      const gatewayFee = config.gatewayFees[tier] * rng.uniform(0.8, 1.2);
      providers.push({
        id: nextProviderId++,
        monthJoined: month,
        name: `Provider-${nextProviderId}`,
        tier,
        monthlyGatewayFee: gatewayFee,
        consumerBase: 0,
        active: true,
      });
    }

    const activeProviders = providers.filter((p) => p.active);

    // -------------------------------------------------------------------
    // 2. Gateway SaaS revenue
    // -------------------------------------------------------------------
    let gatewayRevenue = 0;
    for (const provider of activeProviders) {
      gatewayRevenue += provider.monthlyGatewayFee;
    }

    // -------------------------------------------------------------------
    // 3. New consumers join
    // -------------------------------------------------------------------
    const growthMultiplier = Math.pow(scenario.consumerGrowthRate, Math.max(0, month - 6));
    let newConsumers = 0;
    let stakingPlatformFees = 0;
    let verificationRevenue = 0;

    for (const provider of activeProviders) {
      const providerAge = month - provider.monthJoined;
      if (providerAge < 0) continue;

      // Ramp: new providers start slow
      const rampFactor = Math.min(1.0, providerAge / 6);
      const baseNew = scenario.consumersPerProviderPerMonth * rampFactor * growthMultiplier;
      const monthlyNew = Math.max(0, Math.round(baseNew * rng.uniform(0.7, 1.3)));

      for (let i = 0; i < monthlyNew; i++) {
        // Assign tier based on distribution
        const roll = rng.next();
        let cumProb = 0;
        let assignedTier: AccessTier = "restricted";
        for (const tier of TIER_ORDER) {
          cumProb += scenario.tierDistribution[tier];
          if (roll < cumProb) {
            assignedTier = tier;
            break;
          }
        }

        const stakeSize = tierToStake(assignedTier, config);
        const apiSpend = scenario.avgMonthlyApiSpend * rng.logNormal(1.0, 1.5);
        const activityRate = rng.uniform(config.activityFeeRate[0], config.activityFeeRate[1]);

        consumers.push({
          id: nextConsumerId++,
          monthJoined: month,
          tier: assignedTier,
          stakeSats: stakeSize,
          monthlyApiSpend: apiSpend,
          activityFeeRate: activityRate,
          providerId: provider.id,
          flagged: false,
          slashed: false,
          active: true,
        });

        // Platform fee on staking (1% of stake)
        if (stakeSize > 0) {
          stakingPlatformFees += stakeSize * config.platformFeeOnStakes;
        }

        // Verification fee (most new consumers verify)
        if (assignedTier !== "restricted") {
          const vRoll = rng.next();
          if (vRoll < config.verificationDistribution.domain) {
            verificationRevenue += config.verificationFees.domain;
          } else if (vRoll < config.verificationDistribution.domain + config.verificationDistribution.org) {
            verificationRevenue += config.verificationFees.org;
          } else {
            verificationRevenue += config.verificationFees.audit;
          }
        }

        newConsumers++;
        provider.consumerBase++;
      }
    }

    // -------------------------------------------------------------------
    // 4. Consumer activity & activity fees
    // -------------------------------------------------------------------
    const activeConsumers = consumers.filter((c) => c.active);
    let totalApiSpend = 0;
    let totalActivityFees = 0;
    let activityPlatformFees = 0;

    for (const consumer of activeConsumers) {
      // API spend evolves slightly each month
      consumer.monthlyApiSpend *= 1.0 + rng.normal(0.01, 0.10);
      consumer.monthlyApiSpend = Math.max(10, consumer.monthlyApiSpend);

      totalApiSpend += consumer.monthlyApiSpend;
      const activityFee = consumer.monthlyApiSpend * consumer.activityFeeRate;
      totalActivityFees += activityFee;
      activityPlatformFees += activityFee * config.platformFeeOnActivity;
    }

    // -------------------------------------------------------------------
    // 5. Consumer tier upgrades
    // -------------------------------------------------------------------
    let upgraded = 0;
    for (const consumer of activeConsumers) {
      if (consumer.tier === "unlimited") continue;
      const age = month - consumer.monthJoined;
      if (age < 3) continue; // minimum 3 months before upgrade

      if (rng.chance(config.monthlyUpgradeProb)) {
        const newTier = nextTier(consumer.tier);
        if (newTier) {
          const oldStake = tierToStake(consumer.tier, config);
          const newStake = tierToStake(newTier, config);
          const additionalStake = newStake - oldStake;
          consumer.tier = newTier;
          consumer.stakeSats = newStake;
          if (additionalStake > 0) {
            stakingPlatformFees += additionalStake * config.platformFeeOnStakes;
          }
          upgraded++;
        }
      }
    }

    // -------------------------------------------------------------------
    // 6. Distillation detection & slashing
    // -------------------------------------------------------------------
    let flags = 0;
    let confirmed = 0;
    let totalSlashValue = 0;
    let treasuryIncome = 0;

    for (const consumer of activeConsumers) {
      if (consumer.slashed || consumer.tier === "restricted") continue;

      if (rng.chance(config.distillationProbPerConsumer)) {
        consumer.flagged = true;
        flags++;

        if (rng.chance(config.distillationConfirmRate)) {
          confirmed++;
          const slashAmount = consumer.stakeSats * config.avgSlashPct;
          totalSlashValue += slashAmount;
          treasuryIncome += slashAmount * config.treasurySlashShare;
          consumer.slashed = true;
          consumer.active = false;
          consumer.stakeSats = Math.max(0, consumer.stakeSats - slashAmount);
        }
      }
    }

    // -------------------------------------------------------------------
    // 7. Consumer churn
    // -------------------------------------------------------------------
    let churned = 0;
    for (const consumer of activeConsumers) {
      if (!consumer.active) continue;
      if (rng.chance(config.monthlyChurnRate)) {
        consumer.active = false;
        churned++;
      }
    }

    // -------------------------------------------------------------------
    // 8. PL staking in consumer pools
    // -------------------------------------------------------------------
    let plYieldFromPools = 0;

    // Earn yield from existing stakes
    for (const [consumerId, stakedAmount] of plConsumerStakes) {
      const consumer = consumers[consumerId];
      if (!consumer || !consumer.active) {
        // Consumer churned or slashed — recover remaining stake
        plCash += stakedAmount * 0.9; // 10% loss on forced exit
        plStaked -= stakedAmount;
        plConsumerStakes.delete(consumerId);
        continue;
      }

      // PL's share of activity fee yield (proportional to pool share)
      const poolTotal = consumer.stakeSats;
      if (poolTotal <= 0) continue;
      const plShare = stakedAmount / poolTotal;
      const activityFee = consumer.monthlyApiSpend * consumer.activityFeeRate;
      const netYield = activityFee * (1 - config.platformFeeOnActivity); // after platform fee
      const plYield = netYield * plShare;
      plYieldFromPools += plYield;

      // Compound yield into stake
      const newStakeAmount = stakedAmount + plYield;
      plConsumerStakes.set(consumerId, newStakeAmount);
      plStaked += plYield;
    }

    // Collect revenue
    plCash += gatewayRevenue + stakingPlatformFees + activityPlatformFees +
      verificationRevenue + treasuryIncome;

    // Pay operating costs
    plCash -= config.plOperatingCost;

    // Reinvest: stake into high-tier consumer pools
    const availableForInvestment = Math.max(0, plCash * config.plReinvestmentRate * 0.5);
    if (availableForInvestment > 100) {
      // Find eligible consumers (elevated or unlimited, active, not already staked)
      const eligibleConsumers = activeConsumers.filter(
        (c) =>
          c.active &&
          !c.slashed &&
          (c.tier === "elevated" || c.tier === "unlimited") &&
          (!plConsumerStakes.has(c.id) ||
            (plConsumerStakes.get(c.id)! / c.stakeSats) < config.plMaxPoolConcentration),
      );

      if (eligibleConsumers.length > 0) {
        const perConsumer = Math.min(
          availableForInvestment / Math.min(eligibleConsumers.length, 10),
          availableForInvestment * config.plMaxPoolConcentration,
        );

        let invested = 0;
        const shuffled = [...eligibleConsumers].sort(() => rng.next() - 0.5);
        for (const consumer of shuffled.slice(0, 10)) {
          if (invested >= availableForInvestment) break;
          const amount = Math.min(perConsumer, availableForInvestment - invested);
          const existing = plConsumerStakes.get(consumer.id) || 0;
          plConsumerStakes.set(consumer.id, existing + amount);
          plCash -= amount;
          plStaked += amount;
          invested += amount;
        }
      }
    }

    // -------------------------------------------------------------------
    // 9. Snapshot
    // -------------------------------------------------------------------
    const totalConsumerStakes = consumers.filter((c) => c.active).reduce((sum, c) => sum + c.stakeSats, 0);
    const consumersByTier: Record<AccessTier, number> = { restricted: 0, standard: 0, elevated: 0, unlimited: 0 };
    for (const c of consumers.filter((c) => c.active)) {
      consumersByTier[c.tier]++;
    }

    const plTotalMonthlyRevenue =
      gatewayRevenue +
      stakingPlatformFees +
      activityPlatformFees +
      verificationRevenue +
      treasuryIncome +
      plYieldFromPools;

    cumulativeRevenue += plTotalMonthlyRevenue;

    snapshots.push({
      month,
      activeProviders: activeProviders.length,
      gatewayRevenue,
      totalConsumers: consumers.length,
      activeConsumers: consumers.filter((c) => c.active).length,
      consumersByTier,
      newConsumers,
      churned,
      upgraded,
      totalConsumerStakes,
      stakingPlatformFees,
      totalApiSpend,
      totalActivityFees,
      activityPlatformFees,
      verificationRevenue,
      distillationFlags: flags,
      distillationConfirmed: confirmed,
      distillationSlashValue: totalSlashValue,
      treasurySlashIncome: treasuryIncome,
      plTotalMonthlyRevenue,
      plCumulativeRevenue: cumulativeRevenue,
      plStakedInConsumerPools: plStaked,
      plYieldFromConsumerPools: plYieldFromPools,
      plTreasuryValue: plCash + plStaked,
    });
  }

  return snapshots;
}

function medianOf(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(p * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)];
}

function runScenario(
  scenario: InferenceGrowthScenario,
  config: InferenceConfig,
  seed: number,
): InferenceSimResult {
  const rng = new SeededRNG(seed);
  const allIterations: InferenceMonthSnapshot[][] = [];

  for (let i = 0; i < config.iterations; i++) {
    const iterRng = rng.fork();
    allIterations.push(runSingleIteration(scenario, config, iterRng));
  }

  // Aggregate: median across iterations for each month
  const medianSnapshots: InferenceMonthSnapshot[] = [];
  for (let m = 0; m < config.months; m++) {
    const monthData = allIterations.map((iter) => iter[m]);

    medianSnapshots.push({
      month: m + 1,
      activeProviders: Math.round(medianOf(monthData.map((s) => s.activeProviders))),
      gatewayRevenue: medianOf(monthData.map((s) => s.gatewayRevenue)),
      totalConsumers: Math.round(medianOf(monthData.map((s) => s.totalConsumers))),
      activeConsumers: Math.round(medianOf(monthData.map((s) => s.activeConsumers))),
      consumersByTier: {
        restricted: Math.round(medianOf(monthData.map((s) => s.consumersByTier.restricted))),
        standard: Math.round(medianOf(monthData.map((s) => s.consumersByTier.standard))),
        elevated: Math.round(medianOf(monthData.map((s) => s.consumersByTier.elevated))),
        unlimited: Math.round(medianOf(monthData.map((s) => s.consumersByTier.unlimited))),
      },
      newConsumers: Math.round(medianOf(monthData.map((s) => s.newConsumers))),
      churned: Math.round(medianOf(monthData.map((s) => s.churned))),
      upgraded: Math.round(medianOf(monthData.map((s) => s.upgraded))),
      totalConsumerStakes: medianOf(monthData.map((s) => s.totalConsumerStakes)),
      stakingPlatformFees: medianOf(monthData.map((s) => s.stakingPlatformFees)),
      totalApiSpend: medianOf(monthData.map((s) => s.totalApiSpend)),
      totalActivityFees: medianOf(monthData.map((s) => s.totalActivityFees)),
      activityPlatformFees: medianOf(monthData.map((s) => s.activityPlatformFees)),
      verificationRevenue: medianOf(monthData.map((s) => s.verificationRevenue)),
      distillationFlags: Math.round(medianOf(monthData.map((s) => s.distillationFlags))),
      distillationConfirmed: Math.round(medianOf(monthData.map((s) => s.distillationConfirmed))),
      distillationSlashValue: medianOf(monthData.map((s) => s.distillationSlashValue)),
      treasurySlashIncome: medianOf(monthData.map((s) => s.treasurySlashIncome)),
      plTotalMonthlyRevenue: medianOf(monthData.map((s) => s.plTotalMonthlyRevenue)),
      plCumulativeRevenue: medianOf(monthData.map((s) => s.plCumulativeRevenue)),
      plStakedInConsumerPools: medianOf(monthData.map((s) => s.plStakedInConsumerPools)),
      plYieldFromConsumerPools: medianOf(monthData.map((s) => s.plYieldFromConsumerPools)),
      plTreasuryValue: medianOf(monthData.map((s) => s.plTreasuryValue)),
    });
  }

  // Milestone detection
  const month12 = medianSnapshots[11]?.plTotalMonthlyRevenue ?? null;
  const month24 = medianSnapshots[23]?.plTotalMonthlyRevenue ?? null;
  const month36 = medianSnapshots[35]?.plTotalMonthlyRevenue ?? null;
  const cum36 = medianSnapshots[35]?.plCumulativeRevenue ?? null;

  function findMilestoneMonth(threshold: number): number | null {
    const revenues = allIterations.map((iter) => {
      for (const snap of iter) {
        if (snap.plTotalMonthlyRevenue >= threshold) return snap.month;
      }
      return Infinity;
    });
    const median = medianOf(revenues);
    return median === Infinity ? null : Math.round(median);
  }

  return {
    scenarioName: scenario.name,
    snapshots: medianSnapshots,
    month12Revenue: month12,
    month24Revenue: month24,
    month36Revenue: month36,
    cumulativeRevenue36: cum36,
    monthTo1KRevenue: findMilestoneMonth(1000),
    monthTo10KRevenue: findMilestoneMonth(10000),
    monthTo50KRevenue: findMilestoneMonth(50000),
  };
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

function printHeader(title: string): void {
  const bar = "═".repeat(74);
  console.log(`\n${C.bold}${C.bgCyan}${C.white} ${title.padEnd(73)}${C.reset}`);
  console.log(color(C.cyan, bar));
}

function printSubHeader(title: string): void {
  console.log(`\n${C.bold}${C.cyan}── ${title} ${"─".repeat(Math.max(0, 68 - title.length))}${C.reset}`);
}

function printScenarioResults(result: InferenceSimResult): void {
  printHeader(`INFERENCE LAYER: ${result.scenarioName.toUpperCase()}`);

  // Key milestones
  printSubHeader("Revenue Milestones");
  console.log(`  $1K/mo reached:   ${result.monthTo1KRevenue ? `Month ${result.monthTo1KRevenue}` : "Not reached"}`);
  console.log(`  $10K/mo reached:  ${result.monthTo10KRevenue ? `Month ${result.monthTo10KRevenue}` : "Not reached"}`);
  console.log(`  $50K/mo reached:  ${result.monthTo50KRevenue ? `Month ${result.monthTo50KRevenue}` : "Not reached"}`);

  // Monthly snapshots at key months
  const keyMonths = [6, 12, 18, 24, 30, 36];
  printSubHeader("Growth Timeline (Median)");
  console.log(
    `  ${"Month".padEnd(8)}${"Providers".padEnd(12)}${"Consumers".padEnd(12)}${"API Spend".padEnd(14)}${"PL Revenue".padEnd(14)}${"Cumulative".padEnd(14)}`,
  );
  console.log(`  ${"─".repeat(72)}`);

  for (const m of keyMonths) {
    const snap = result.snapshots[m - 1];
    if (!snap) continue;
    console.log(
      `  ${String(m).padEnd(8)}${String(snap.activeProviders).padEnd(12)}${String(snap.activeConsumers).padEnd(12)}${usd(snap.totalApiSpend).padEnd(14)}${color(C.green, usd(snap.plTotalMonthlyRevenue).padEnd(14))}${usd(snap.plCumulativeRevenue).padEnd(14)}`,
    );
  }

  // Revenue breakdown at month 24
  const m24 = result.snapshots[23];
  if (m24) {
    printSubHeader("Revenue Breakdown — Month 24");
    const streams = [
      { name: "Gateway SaaS", value: m24.gatewayRevenue },
      { name: "Staking platform fees", value: m24.stakingPlatformFees },
      { name: "Activity platform fees", value: m24.activityPlatformFees },
      { name: "Verification fees", value: m24.verificationRevenue },
      { name: "Slash treasury income", value: m24.treasurySlashIncome },
      { name: "PL yield (consumer pools)", value: m24.plYieldFromConsumerPools },
    ];
    const total = streams.reduce((s, r) => s + r.value, 0);
    for (const stream of streams) {
      const bar = "█".repeat(Math.round((stream.value / total) * 40));
      const share = total > 0 ? pct(stream.value / total) : "0%";
      console.log(`  ${stream.name.padEnd(28)} ${color(C.green, usd(stream.value).padEnd(10))} ${share.padEnd(7)} ${color(C.blue, bar)}`);
    }
    console.log(`  ${"─".repeat(50)}`);
    console.log(`  ${"TOTAL".padEnd(28)} ${color(C.bold + C.green, usd(total))}`);
  }

  // Consumer tier distribution at month 24
  if (m24) {
    printSubHeader("Consumer Tiers — Month 24");
    const tiers: { name: string; count: number; stake: number }[] = [
      { name: "Restricted (free)", count: m24.consumersByTier.restricted, stake: 0 },
      { name: "Standard ($100)", count: m24.consumersByTier.standard, stake: 100 },
      { name: "Elevated ($1K)", count: m24.consumersByTier.elevated, stake: 1000 },
      { name: "Unlimited ($10K)", count: m24.consumersByTier.unlimited, stake: 10000 },
    ];
    const totalActive = m24.activeConsumers;
    for (const tier of tiers) {
      const share = totalActive > 0 ? pct(tier.count / totalActive) : "0%";
      const stakeTotal = tier.count * tier.stake;
      console.log(`  ${tier.name.padEnd(24)} ${String(tier.count).padEnd(8)} ${share.padEnd(7)} Staked: ${usd(stakeTotal)}`);
    }
    console.log(`  Total staked: ${color(C.yellow, usd(m24.totalConsumerStakes))}`);
  }

  // PL Treasury
  const m36 = result.snapshots[35];
  if (m36) {
    printSubHeader("PL Treasury — Month 36");
    console.log(`  Total value:   ${color(C.green, usd(m36.plTreasuryValue))}`);
    console.log(`  Staked:        ${usd(m36.plStakedInConsumerPools)}`);
    console.log(`  Cumulative:    ${usd(m36.plCumulativeRevenue)}`);
  }
}

function printCombinedProjections(results: InferenceSimResult[]): void {
  printHeader("COMBINED PROJECTIONS: AGENT STAKING + INFERENCE LAYER");

  console.log(
    `\n  ${"Scenario".padEnd(16)}${"Inference M12".padEnd(16)}${"Base M12".padEnd(14)}${"Combined M12".padEnd(16)}${"Inference M24".padEnd(16)}${"Base M24".padEnd(14)}${"Combined M24".padEnd(16)}${"Inference M36".padEnd(16)}${"Base M36".padEnd(14)}${"Combined M36".padEnd(16)}`,
  );
  console.log(`  ${"─".repeat(140)}`);

  for (const result of results) {
    const base = BASE_STAKING_REFS[result.scenarioName];
    if (!base) continue;

    const infM12 = result.month12Revenue ?? 0;
    const infM24 = result.month24Revenue ?? 0;
    const infM36 = result.month36Revenue ?? 0;

    console.log(
      `  ${result.scenarioName.padEnd(16)}${usd(infM12).padEnd(16)}${usd(base.month12Revenue).padEnd(14)}${color(C.green, usd(infM12 + base.month12Revenue).padEnd(16))}${usd(infM24).padEnd(16)}${usd(base.month24Revenue).padEnd(14)}${color(C.green, usd(infM24 + base.month24Revenue).padEnd(16))}${usd(infM36).padEnd(16)}${usd(base.month36Revenue).padEnd(14)}${color(C.green, usd(infM36 + base.month36Revenue).padEnd(16))}`,
    );
  }

  printSubHeader("Cumulative Value at Month 36");
  for (const result of results) {
    const base = BASE_STAKING_REFS[result.scenarioName];
    if (!base) continue;

    const infCum = result.cumulativeRevenue36 ?? 0;
    const combined = infCum + base.month36CumValue;
    console.log(
      `  ${result.scenarioName.padEnd(16)} Inference: ${usd(infCum).padEnd(14)} Base: ${usd(base.month36CumValue).padEnd(14)} ${color(C.bold + C.green, `Combined: ${usd(combined)}`)}`,
    );
  }

  printSubHeader("Key Insight: Revenue Mix Shift");
  console.log(`
  The inference layer fundamentally changes PL's revenue profile:

  ${C.bold}Before (agent staking only):${C.reset}
    - Revenue scales linearly with agent count
    - Small stakes ($200 median), high volume needed
    - 1% platform fee on small activity fees
    - Insurance kicks in Month 18

  ${C.bold}After (+ inference layer):${C.reset}
    - Gateway SaaS = predictable B2B recurring revenue
    - Consumer stakes 5-50x larger than agent stakes ($100-$10K)
    - Provider relationships = enterprise contracts (sticky)
    - Slash events = windfall income (rare but significant)
    - Network effects: more providers → more consumers → more vouching → more staking

  ${C.bold}The inference layer is the enterprise revenue engine.${C.reset}
  ${C.bold}Agent staking is the community economy. They compound together.${C.reset}
  `);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  // Parse CLI args
  const args = process.argv.slice(2);
  let seed = 42;
  let iterations = 500;
  let months = 36;

  for (const arg of args) {
    if (arg.startsWith("--seed=")) seed = parseInt(arg.split("=")[1], 10);
    if (arg.startsWith("--iterations=")) iterations = parseInt(arg.split("=")[1], 10);
    if (arg.startsWith("--months=")) months = parseInt(arg.split("=")[1], 10);
  }

  const config: InferenceConfig = {
    ...DEFAULT_INFERENCE_CONFIG,
    months,
    iterations,
  };

  console.log(`\n${C.bold}${C.bgMagenta}${C.white} VOUCH INFERENCE TRUST LAYER — ECONOMIC SIMULATION ${C.reset}`);
  console.log(color(C.dim, `  Seed: ${seed} | Iterations: ${iterations} | Months: ${months}`));
  console.log(color(C.dim, `  Platform fee: ${pct(config.platformFeeOnStakes)} on stakes, ${pct(config.platformFeeOnActivity)} on activity`));
  console.log(color(C.dim, `  Gateway SaaS: Small ${usd(config.gatewayFees.small)}/mo, Medium ${usd(config.gatewayFees.medium)}/mo, Large ${usd(config.gatewayFees.large)}/mo`));
  console.log(color(C.dim, `  PL seed capital: ${usd(config.plSeedCapital)}, operating cost: ${usd(config.plOperatingCost)}/mo`));

  const results: InferenceSimResult[] = [];

  for (const scenario of INFERENCE_SCENARIOS) {
    const result = runScenario(scenario, config, seed);
    results.push(result);
    printScenarioResults(result);
  }

  printCombinedProjections(results);

  // Enterprise Engram projection
  printHeader("ENTERPRISE ENGRAM — WHAT THE FULL STACK LOOKS LIKE");
  console.log(`
  ${C.bold}Revenue Streams (ordered by predictability):${C.reset}

  1. ${C.green}Gateway SaaS${C.reset}         — Recurring, predictable, B2B contracts
  2. ${C.green}Engram Enterprise${C.reset}     — Annual licenses for org-wide intent encoding
  3. ${C.green}Activity fees${C.reset}         — Scales with total ecosystem API volume
  4. ${C.green}Staking fees${C.reset}          — Scales with consumer onboarding
  5. ${C.green}Verification fees${C.reset}     — One-time per consumer, scales with growth
  6. ${C.green}Insurance premiums${C.reset}    — Phase 2 (Month 18+)
  7. ${C.green}PL staking yield${C.reset}      — Compound growth from treasury reinvestment
  8. ${C.green}Slash income${C.reset}          — Stochastic but net-positive (fraud deterrent works)

  ${C.bold}Enterprise Engram adds (not modeled yet):${C.reset}
  - Annual license: $10K-$100K per org (team + enterprise tiers)
  - Private Vouch relay hosting: $2K-$10K/month per org
  - Compliance dashboard: bundled with enterprise license
  - Professional services: $200-$500/hr for integration

  ${C.bold}${C.yellow}Conservative M24 total (inference + agent staking):${C.reset}  ${color(C.green, usd((results[0].month24Revenue ?? 0) + BASE_STAKING_REFS["Conservative"].month24Revenue))}${C.reset}/mo
  ${C.bold}${C.yellow}Base Case M24 total:${C.reset}                                  ${color(C.green, usd((results[1].month24Revenue ?? 0) + BASE_STAKING_REFS["Base Case"].month24Revenue))}${C.reset}/mo
  ${C.bold}${C.yellow}Aggressive M24 total:${C.reset}                                 ${color(C.green, usd((results[2].month24Revenue ?? 0) + BASE_STAKING_REFS["Aggressive"].month24Revenue))}${C.reset}/mo
  `);
}

main();
