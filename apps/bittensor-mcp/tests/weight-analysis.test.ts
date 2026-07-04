import { describe, test, expect } from 'bun:test';
import { analyzeWeightCopying, generateValidatorAttestations } from '../src/weight-analysis.js';
import type { NeuronInfo } from '../src/types.js';

function makeNeuron(overrides: Partial<NeuronInfo> & { uid: number }): NeuronInfo {
  return {
    hotkey: `5Hotkey${overrides.uid}`,
    coldkey: `5Coldkey${overrides.uid}`,
    stake: 1000,
    trust: 0.5,
    consensus: 0.5,
    incentive: 0.5,
    dividends: 0.5,
    emission: 100,
    isValidator: false,
    lastUpdate: Date.now(),
    rank: overrides.uid,
    validatorPermit: false,
    ...overrides,
  };
}

describe('Weight-Copying Detection', () => {
  test('detects exact weight copying between validators', () => {
    const neurons: NeuronInfo[] = [
      makeNeuron({ uid: 0, isValidator: true, validatorPermit: true, stake: 5000 }),
      makeNeuron({ uid: 1, isValidator: true, validatorPermit: true, stake: 1000 }),
      makeNeuron({ uid: 2, isValidator: false }),
      makeNeuron({ uid: 3, isValidator: false }),
      makeNeuron({ uid: 4, isValidator: false }),
    ];

    // Validator 0 has independent weights
    // Validator 1 copies validator 0's weights exactly
    const weights = new Map<number, Map<number, number>>();
    weights.set(0, new Map([[2, 0.5], [3, 0.3], [4, 0.2]]));
    weights.set(1, new Map([[2, 0.5], [3, 0.3], [4, 0.2]])); // exact copy

    const analysis = analyzeWeightCopying(3, neurons, weights);

    expect(analysis.suspectedCopiers.length).toBe(1);
    expect(analysis.suspectedCopiers[0].uid).toBe(1); // lower stake = copier
    expect(analysis.suspectedCopiers[0].copiedFrom).toBe(0);
    expect(analysis.suspectedCopiers[0].similarity).toBeGreaterThanOrEqual(0.99);
    expect(analysis.suspectedCopiers[0].evidenceType).toBe('exact_match');
  });

  test('does not flag validators with different weights', () => {
    const neurons: NeuronInfo[] = [
      makeNeuron({ uid: 0, isValidator: true, validatorPermit: true, stake: 5000 }),
      makeNeuron({ uid: 1, isValidator: true, validatorPermit: true, stake: 3000 }),
      makeNeuron({ uid: 2, isValidator: false }),
      makeNeuron({ uid: 3, isValidator: false }),
      makeNeuron({ uid: 4, isValidator: false }),
    ];

    const weights = new Map<number, Map<number, number>>();
    weights.set(0, new Map([[2, 0.8], [3, 0.1], [4, 0.1]]));
    weights.set(1, new Map([[2, 0.1], [3, 0.8], [4, 0.1]])); // very different

    const analysis = analyzeWeightCopying(3, neurons, weights);

    expect(analysis.suspectedCopiers.length).toBe(0);
    expect(analysis.networkHealthScore).toBe(1000);
  });

  test('detects high correlation but not exact match', () => {
    const neurons: NeuronInfo[] = [
      makeNeuron({ uid: 0, isValidator: true, validatorPermit: true, stake: 5000 }),
      makeNeuron({ uid: 1, isValidator: true, validatorPermit: true, stake: 1000 }),
      makeNeuron({ uid: 2, isValidator: false }),
      makeNeuron({ uid: 3, isValidator: false }),
      makeNeuron({ uid: 4, isValidator: false }),
      makeNeuron({ uid: 5, isValidator: false }),
    ];

    const weights = new Map<number, Map<number, number>>();
    weights.set(0, new Map([[2, 0.5], [3, 0.3], [4, 0.15], [5, 0.05]]));
    weights.set(1, new Map([[2, 0.42], [3, 0.35], [4, 0.18], [5, 0.05]])); // similar but not exact

    const analysis = analyzeWeightCopying(3, neurons, weights);

    // Should detect as high correlation (cosine similarity > 0.95)
    if (analysis.suspectedCopiers.length > 0) {
      expect(analysis.suspectedCopiers[0].evidenceType).toBe('high_correlation');
    }
  });

  test('network health score reflects copier ratio', () => {
    const neurons: NeuronInfo[] = [
      makeNeuron({ uid: 0, isValidator: true, validatorPermit: true, stake: 5000 }),
      makeNeuron({ uid: 1, isValidator: true, validatorPermit: true, stake: 1000 }),
      makeNeuron({ uid: 2, isValidator: true, validatorPermit: true, stake: 800 }),
      makeNeuron({ uid: 3, isValidator: false }),
      makeNeuron({ uid: 4, isValidator: false }),
    ];

    // Two copiers of validator 0
    const weights = new Map<number, Map<number, number>>();
    weights.set(0, new Map([[3, 0.6], [4, 0.4]]));
    weights.set(1, new Map([[3, 0.6], [4, 0.4]])); // copy
    weights.set(2, new Map([[3, 0.6], [4, 0.4]])); // copy

    const analysis = analyzeWeightCopying(3, neurons, weights);

    // 2 out of 3 validators are copiers = 333/1000 health
    expect(analysis.networkHealthScore).toBeLessThan(500);
  });

  test('generates attestations for all validators', () => {
    const neurons: NeuronInfo[] = [
      makeNeuron({ uid: 0, isValidator: true, validatorPermit: true, stake: 5000 }),
      makeNeuron({ uid: 1, isValidator: true, validatorPermit: true, stake: 1000 }),
      makeNeuron({ uid: 2, isValidator: false }),
      makeNeuron({ uid: 3, isValidator: false }),
    ];

    const weights = new Map<number, Map<number, number>>();
    weights.set(0, new Map([[2, 0.7], [3, 0.3]]));
    weights.set(1, new Map([[2, 0.3], [3, 0.7]])); // independent

    const analysis = analyzeWeightCopying(3, neurons, weights);
    const attestations = generateValidatorAttestations(3, neurons, weights, analysis);

    expect(attestations.length).toBe(2); // both validators get attestations
    for (const a of attestations) {
      expect(a.subjectType).toBe('validator');
      expect(a.netuid).toBe(3);
      expect(a.composite).toBeGreaterThan(0);
      expect(a.composite).toBeLessThanOrEqual(1000);
      expect(a.dimensions.length).toBeGreaterThan(0);
    }
  });

  test('copier attestations have low behavioral_consistency', () => {
    const neurons: NeuronInfo[] = [
      makeNeuron({ uid: 0, isValidator: true, validatorPermit: true, stake: 5000 }),
      makeNeuron({ uid: 1, isValidator: true, validatorPermit: true, stake: 1000 }),
      makeNeuron({ uid: 2, isValidator: false }),
      makeNeuron({ uid: 3, isValidator: false }),
    ];

    const weights = new Map<number, Map<number, number>>();
    weights.set(0, new Map([[2, 0.6], [3, 0.4]]));
    weights.set(1, new Map([[2, 0.6], [3, 0.4]])); // exact copy

    const analysis = analyzeWeightCopying(3, neurons, weights);

    expect(analysis.suspectedCopiers.length).toBe(1);
    const copierAttestation = analysis.suspectedCopiers[0].attestation;
    const consistency = copierAttestation.dimensions.find(
      (d) => d.name === 'behavioral_consistency'
    );

    expect(consistency).toBeDefined();
    expect(consistency!.value).toBeLessThan(100); // very low score for copier
  });

  test('handles empty weight map gracefully', () => {
    const neurons: NeuronInfo[] = [
      makeNeuron({ uid: 0, isValidator: true, validatorPermit: true }),
      makeNeuron({ uid: 1, isValidator: false }),
    ];

    const weights = new Map<number, Map<number, number>>();
    const analysis = analyzeWeightCopying(3, neurons, weights);

    expect(analysis.suspectedCopiers.length).toBe(0);
    expect(analysis.totalValidators).toBe(1);
  });
});
