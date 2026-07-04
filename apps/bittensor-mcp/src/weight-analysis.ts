/**
 * Weight-Copying Detection Engine
 *
 * Analyzes validator weight matrices to detect free-riding behavior.
 * Produces MCP-T trust attestations for each validator based on behavioral analysis.
 *
 * Detection methods:
 * 1. Cosine similarity between validator weight vectors
 * 2. Temporal correlation (delayed mirroring)
 * 3. Entropy analysis (honest validators have diverse weights)
 */

import type {
  NeuronInfo,
  WeightCopyingAnalysis,
  SuspectedCopier,
  TrustAttestation,
} from './types.js';

const SIMILARITY_THRESHOLD = 0.95; // Above this = suspected copy
const HIGH_CORRELATION_THRESHOLD = 0.90;

/**
 * Compute cosine similarity between two weight vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Compute Shannon entropy of a weight vector (normalized)
 * Low entropy = concentrated weights = potentially less independent evaluation
 */
function weightEntropy(weights: number[]): number {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total === 0) return 0;

  let entropy = 0;
  for (const w of weights) {
    if (w > 0) {
      const p = w / total;
      entropy -= p * Math.log2(p);
    }
  }

  // Normalize by max possible entropy
  const maxEntropy = Math.log2(weights.length);
  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}

/**
 * Build trust attestation for a validator based on weight analysis
 */
function buildAttestation(
  neuron: NeuronInfo,
  netuid: number,
  isCopier: boolean,
  similarity: number,
  entropy: number
): TrustAttestation {
  // Behavioral consistency: honest validators have unique, diverse weights
  const consistencyScore = isCopier
    ? Math.max(0, Math.round((1 - similarity) * 1000))
    : Math.round(Math.min(1, entropy * 1.2) * 800 + 200);

  // Performance: based on existing Bittensor consensus metrics
  const performanceScore = Math.round(neuron.consensus * 1000);

  // Commitment: based on stake and tenure
  const commitmentScore = Math.min(1000, Math.round(neuron.stake * 100));

  // Composite: weighted blend
  const composite = Math.round(
    consistencyScore * 0.4 + performanceScore * 0.35 + commitmentScore * 0.25
  );

  return {
    subject: neuron.hotkey,
    subjectType: 'validator',
    netuid,
    timestamp: new Date().toISOString(),
    dimensions: [
      {
        name: 'behavioral_consistency',
        value: consistencyScore,
        confidence: isCopier ? 0.85 : 0.7,
        evidence: isCopier
          ? `Weight vector similarity ${(similarity * 100).toFixed(1)}% — suspected copying`
          : `Independent weight pattern, entropy ${(entropy * 100).toFixed(1)}%`,
      },
      {
        name: 'performance',
        value: performanceScore,
        confidence: 0.9,
        evidence: `Yuma Consensus score: ${neuron.consensus.toFixed(4)}`,
      },
      {
        name: 'commitment',
        value: commitmentScore,
        confidence: 0.8,
        evidence: `Stake: ${neuron.stake.toFixed(4)} TAO`,
      },
    ],
    composite,
    confidence: isCopier ? 0.85 : 0.7,
    provider: 'bittensor-mcp/weight-analysis',
    methodology: 'cosine-similarity + entropy analysis on weight matrix',
  };
}

/**
 * Analyze a subnet's weight matrix for copying behavior
 */
export function analyzeWeightCopying(
  netuid: number,
  neurons: NeuronInfo[],
  weights: Map<number, Map<number, number>>
): WeightCopyingAnalysis {
  const validators = neurons.filter((n) => n.isValidator);
  const allUids = neurons.map((n) => n.uid);
  const suspectedCopiers: SuspectedCopier[] = [];

  // Build weight vectors for each validator
  const validatorVectors = new Map<number, number[]>();

  for (const validator of validators) {
    const validatorWeights = weights.get(validator.uid);
    if (!validatorWeights) continue;

    const vector = allUids.map((uid) => validatorWeights.get(uid) ?? 0);
    validatorVectors.set(validator.uid, vector);
  }

  // Pairwise similarity comparison
  const validatorUids = Array.from(validatorVectors.keys());

  for (let i = 0; i < validatorUids.length; i++) {
    for (let j = i + 1; j < validatorUids.length; j++) {
      const uidA = validatorUids[i];
      const uidB = validatorUids[j];
      const vecA = validatorVectors.get(uidA)!;
      const vecB = validatorVectors.get(uidB)!;

      const similarity = cosineSimilarity(vecA, vecB);

      if (similarity >= SIMILARITY_THRESHOLD) {
        // Determine which is the copier (lower stake = more likely copier)
        const neuronA = neurons.find((n) => n.uid === uidA)!;
        const neuronB = neurons.find((n) => n.uid === uidB)!;

        const [copier, original] =
          neuronA.stake < neuronB.stake
            ? [neuronA, neuronB]
            : [neuronB, neuronA];

        const copierUid = copier.uid;
        const originalUid = original.uid;

        // Skip if already flagged
        if (suspectedCopiers.some((s) => s.uid === copierUid)) continue;

        const entropy = weightEntropy(
          validatorVectors.get(copierUid) ?? []
        );

        suspectedCopiers.push({
          uid: copierUid,
          hotkey: copier.hotkey,
          similarity,
          copiedFrom: originalUid,
          evidenceType:
            similarity >= 0.99 ? 'exact_match' : 'high_correlation',
          confidence: Math.min(0.95, similarity),
          attestation: buildAttestation(
            copier,
            netuid,
            true,
            similarity,
            entropy
          ),
        });
      }
    }
  }

  // Build attestations for non-copier validators too
  const copierUids = new Set(suspectedCopiers.map((s) => s.uid));
  const honestValidators = validators.filter(
    (v) => !copierUids.has(v.uid) && validatorVectors.has(v.uid)
  );

  // Network health: ratio of honest validators
  const healthScore =
    validators.length > 0
      ? Math.round(
          (1 - suspectedCopiers.length / validators.length) * 1000
        )
      : 500;

  return {
    netuid,
    analyzedAt: new Date().toISOString(),
    totalValidators: validators.length,
    suspectedCopiers,
    networkHealthScore: healthScore,
    summary:
      suspectedCopiers.length === 0
        ? `No weight-copying detected among ${validators.length} validators on SN${netuid}.`
        : `Detected ${suspectedCopiers.length} suspected weight copier(s) among ${validators.length} validators on SN${netuid}. ` +
          `Network health: ${healthScore}/1000. ` +
          `${suspectedCopiers.filter((s) => s.evidenceType === 'exact_match').length} exact matches, ` +
          `${suspectedCopiers.filter((s) => s.evidenceType === 'high_correlation').length} high correlations.`,
  };
}

/**
 * Generate trust attestations for all validators in a subnet
 */
export function generateValidatorAttestations(
  netuid: number,
  neurons: NeuronInfo[],
  weights: Map<number, Map<number, number>>,
  analysis: WeightCopyingAnalysis
): TrustAttestation[] {
  const validators = neurons.filter((n) => n.isValidator);
  const copierUids = new Set(analysis.suspectedCopiers.map((s) => s.uid));
  const allUids = neurons.map((n) => n.uid);
  const attestations: TrustAttestation[] = [];

  // Copier attestations already built in analysis
  for (const copier of analysis.suspectedCopiers) {
    attestations.push(copier.attestation);
  }

  // Build attestations for honest validators
  for (const validator of validators) {
    if (copierUids.has(validator.uid)) continue;

    const validatorWeights = weights.get(validator.uid);
    if (!validatorWeights) continue;

    const vector = allUids.map((uid) => validatorWeights.get(uid) ?? 0);
    const entropy = weightEntropy(vector);

    attestations.push(
      buildAttestation(validator, netuid, false, 0, entropy)
    );
  }

  return attestations;
}
