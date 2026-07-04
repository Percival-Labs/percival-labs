import { describe, test, expect } from 'bun:test';
import { blendTrustScores, generateValidatorSnippet, DEFAULT_CONFIG } from '../src/trust-blend.js';
import type { NeuronInfo, TrustAttestation } from '../src/types.js';

function makeNeuron(uid: number, hotkey: string): NeuronInfo {
  return {
    uid,
    hotkey,
    coldkey: `cold_${uid}`,
    stake: 100,
    trust: 0.5,
    consensus: 0.5,
    incentive: 0.5,
    dividends: 0,
    emission: 50,
    isValidator: false,
    lastUpdate: Date.now(),
    rank: uid,
    validatorPermit: false,
  };
}

function makeAttestation(hotkey: string, composite: number, confidence: number = 0.8): TrustAttestation {
  return {
    subject: hotkey,
    subjectType: 'miner',
    netuid: 39,
    timestamp: new Date().toISOString(),
    dimensions: [
      { name: 'behavioral_consistency', value: composite, confidence },
      { name: 'performance', value: composite, confidence },
    ],
    composite,
    confidence,
    provider: 'test',
    methodology: 'test',
  };
}

describe('Trust Blend', () => {
  test('blends trust scores with raw scores', () => {
    const miners = [makeNeuron(0, 'miner_a'), makeNeuron(1, 'miner_b')];
    const rawScores = new Map([[0, 0.8], [1, 0.3]]);
    const attestations = new Map([
      ['miner_a', makeAttestation('miner_a', 900)],
      ['miner_b', makeAttestation('miner_b', 200)],
    ]);

    const results = blendTrustScores(miners, rawScores, attestations);

    expect(results.length).toBe(2);

    const minerA = results.find(r => r.hotkey === 'miner_a')!;
    const minerB = results.find(r => r.hotkey === 'miner_b')!;

    // Miner A: high raw + high trust = should stay high or go slightly up
    expect(minerA.trustApplied).toBe(true);
    expect(minerA.blendedScore).toBeGreaterThan(0.7);

    // Miner B: low raw + low trust = should stay low or go lower
    expect(minerB.trustApplied).toBe(true);
    expect(minerB.blendedScore).toBeLessThan(0.35);
  });

  test('falls back to raw score when no attestation exists', () => {
    const miners = [makeNeuron(0, 'miner_a')];
    const rawScores = new Map([[0, 0.6]]);
    const attestations = new Map<string, TrustAttestation>();

    const results = blendTrustScores(miners, rawScores, attestations);

    expect(results[0].trustApplied).toBe(false);
    expect(results[0].blendedScore).toBe(0.6);
    expect(results[0].explanation).toContain('No trust attestation');
  });

  test('skips low-confidence attestations', () => {
    const miners = [makeNeuron(0, 'miner_a')];
    const rawScores = new Map([[0, 0.5]]);
    const attestations = new Map([
      ['miner_a', makeAttestation('miner_a', 900, 0.3)], // below threshold
    ]);

    const results = blendTrustScores(miners, rawScores, attestations);

    expect(results[0].trustApplied).toBe(false);
    expect(results[0].blendedScore).toBe(0.5);
    expect(results[0].explanation).toContain('below threshold');
  });

  test('skips expired attestations', () => {
    const miners = [makeNeuron(0, 'miner_a')];
    const rawScores = new Map([[0, 0.5]]);

    const oldAttestation = makeAttestation('miner_a', 900);
    // Set timestamp to 100 days ago (beyond 90-day default window)
    oldAttestation.timestamp = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();

    const attestations = new Map([['miner_a', oldAttestation]]);
    const results = blendTrustScores(miners, rawScores, attestations);

    expect(results[0].trustApplied).toBe(false);
    expect(results[0].explanation).toContain('expired');
  });

  test('respects custom trust weight', () => {
    const miners = [makeNeuron(0, 'miner_a')];
    const rawScores = new Map([[0, 0.5]]);
    const attestations = new Map([
      ['miner_a', makeAttestation('miner_a', 1000)], // perfect trust
    ]);

    // With 50% trust weight
    const high = blendTrustScores(miners, rawScores, attestations, {
      ...DEFAULT_CONFIG,
      trustWeight: 0.5,
    });

    // With 0% trust weight
    const none = blendTrustScores(miners, rawScores, attestations, {
      ...DEFAULT_CONFIG,
      trustWeight: 0,
    });

    expect(high[0].blendedScore).toBeGreaterThan(none[0].blendedScore);
    expect(none[0].blendedScore).toBe(0.5); // raw score unchanged
  });

  test('generates valid Python snippet', () => {
    const snippet = generateValidatorSnippet(DEFAULT_CONFIG);

    expect(snippet).toContain('def blend_trust_scores');
    expect(snippet).toContain('trust/query');
    expect(snippet).toContain('TRUST_WEIGHT');
    expect(snippet).toContain('fail-open');
    expect(snippet).toContain('No protocol changes');
  });
});
