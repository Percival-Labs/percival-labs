/**
 * Validator Trust Blend — Reward Function Integration
 *
 * Demonstrates how MCP-T trust attestations integrate into a Bittensor
 * validator's reward function (forward()). This is the key integration
 * pattern: trust scores become weight multipliers in Yuma Consensus.
 *
 * IMPORTANT: This does NOT replace Yuma Consensus. It provides supplementary
 * quality signals that validators can CHOOSE to incorporate. No protocol
 * changes needed. This is a subnet-level validator decision.
 *
 * Integration point:
 *   Miner does work → Validator scores work →
 *     [NEW] Validator queries MCP-T trust attestation →
 *     Blends task_score * trust_weight →
 *     set_weights() on-chain → Yuma Consensus → emissions
 */

import type {
  TrustAttestation,
  TrustBlendConfig,
  BlendedScore,
  NeuronInfo,
} from './types.js';

const DEFAULT_CONFIG: TrustBlendConfig = {
  trustWeight: 0.15, // Trust influences 15% of final score by default
  dimensions: ['behavioral_consistency', 'performance'],
  minConfidence: 0.6,
  decayDays: 90, // 3-month attestation window
};

/**
 * Blend a validator's raw miner scores with MCP-T trust attestations.
 *
 * This is the function that would live inside a Bittensor validator's
 * forward() method, between scoring responses and calling set_weights().
 */
export function blendTrustScores(
  miners: NeuronInfo[],
  rawScores: Map<number, number>, // uid -> raw validator score (0.0-1.0)
  attestations: Map<string, TrustAttestation>, // hotkey -> attestation
  config: TrustBlendConfig = DEFAULT_CONFIG
): BlendedScore[] {
  const results: BlendedScore[] = [];

  for (const miner of miners) {
    const rawScore = rawScores.get(miner.uid) ?? 0;
    const attestation = attestations.get(miner.hotkey);

    if (!attestation || attestation.confidence < config.minConfidence) {
      // No attestation or below confidence threshold — use raw score only
      results.push({
        uid: miner.uid,
        hotkey: miner.hotkey,
        rawScore,
        trustScore: 0,
        blendedScore: rawScore,
        trustApplied: false,
        explanation: attestation
          ? `Trust confidence ${(attestation.confidence * 100).toFixed(0)}% below threshold ${(config.minConfidence * 100).toFixed(0)}%`
          : 'No trust attestation available — using raw score only',
      });
      continue;
    }

    // Check attestation freshness
    const attestationAge =
      (Date.now() - new Date(attestation.timestamp).getTime()) /
      (1000 * 60 * 60 * 24);
    if (attestationAge > config.decayDays) {
      results.push({
        uid: miner.uid,
        hotkey: miner.hotkey,
        rawScore,
        trustScore: attestation.composite,
        blendedScore: rawScore,
        trustApplied: false,
        explanation: `Trust attestation expired (${Math.round(attestationAge)} days old, max ${config.decayDays})`,
      });
      continue;
    }

    // Compute dimension-filtered trust score
    const relevantDimensions = attestation.dimensions.filter((d) =>
      config.dimensions.includes(d.name)
    );

    const trustScore =
      relevantDimensions.length > 0
        ? relevantDimensions.reduce((sum, d) => sum + d.value, 0) /
          relevantDimensions.length
        : attestation.composite;

    // Normalize trust to 0.0-1.0
    const normalizedTrust = trustScore / 1000;

    // Apply decay based on age (linear decay over the window)
    const decayFactor = 1 - attestationAge / config.decayDays;
    const adjustedTrust = normalizedTrust * decayFactor;

    // Blend: (1 - trustWeight) * rawScore + trustWeight * adjustedTrust
    const blended =
      (1 - config.trustWeight) * rawScore +
      config.trustWeight * adjustedTrust;

    const dimensionNames = relevantDimensions.map((d) => d.name).join(', ');

    results.push({
      uid: miner.uid,
      hotkey: miner.hotkey,
      rawScore,
      trustScore: Math.round(trustScore),
      blendedScore: Math.round(blended * 10000) / 10000,
      trustApplied: true,
      explanation:
        `Trust blend applied: ${(config.trustWeight * 100).toFixed(0)}% weight. ` +
        `Dimensions: [${dimensionNames}]. ` +
        `Trust: ${Math.round(trustScore)}/1000 (decay: ${(decayFactor * 100).toFixed(0)}%). ` +
        `Raw ${rawScore.toFixed(4)} → Blended ${blended.toFixed(4)}`,
    });
  }

  return results;
}

/**
 * Generate a Python code snippet showing how to integrate trust blending
 * into a Bittensor validator's forward() method.
 */
export function generateValidatorSnippet(config: TrustBlendConfig): string {
  return `# ── MCP-T Trust Integration for Bittensor Validator ──
# Add this to your validator's forward() method, AFTER scoring
# miners but BEFORE calling set_weights().
#
# This is OPTIONAL. Each validator CHOOSES whether to use trust signals.
# No protocol changes needed. No mandatory adoption.

import httpx  # or aiohttp for async

MCPT_ENDPOINT = "http://localhost:3800/trust/query"  # Bittensor MCP server
TRUST_WEIGHT = ${config.trustWeight}  # How much trust influences final score
MIN_CONFIDENCE = ${config.minConfidence}
DIMENSIONS = ${JSON.stringify(config.dimensions)}

async def blend_trust_scores(self, miner_uids, raw_rewards):
    """Blend MCP-T trust attestations with raw miner scores."""
    blended = raw_rewards.copy()

    for i, uid in enumerate(miner_uids):
        hotkey = self.metagraph.axons[uid].hotkey

        try:
            # Query MCP-T trust attestation
            resp = httpx.post(MCPT_ENDPOINT, json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "trust/query",
                "params": {"subject": hotkey, "netuid": self.config.netuid}
            }, timeout=2.0)

            attestation = resp.json().get("result", {})
            confidence = attestation.get("confidence", 0)

            if confidence < MIN_CONFIDENCE:
                continue  # Below threshold — keep raw score

            # Extract relevant dimensions
            dims = [d for d in attestation.get("dimensions", [])
                    if d["name"] in DIMENSIONS]

            if not dims:
                continue

            trust = sum(d["value"] for d in dims) / len(dims) / 1000

            # Blend: preserve (1-weight) of raw, add weight of trust
            blended[i] = (1 - TRUST_WEIGHT) * raw_rewards[i] + TRUST_WEIGHT * trust

        except Exception:
            pass  # Trust query failed — use raw score (fail-open, not fail-closed)

    return blended

# In your forward() method:
# rewards = get_rewards(self, query=self.step, responses=responses)
# rewards = await self.blend_trust_scores(miner_uids, rewards)  # ← ADD THIS
# self.update_scores(rewards, miner_uids)
`;
}

export { DEFAULT_CONFIG };
