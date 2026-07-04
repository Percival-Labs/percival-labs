import { describe, test, expect } from 'bun:test';
import { phaseFromUint8, memoTypeFromUint8 } from '../src/config';

describe('phaseFromUint8', () => {
  test('maps known phases', () => {
    expect(phaseFromUint8(0)).toBe('request');
    expect(phaseFromUint8(1)).toBe('negotiation');
    expect(phaseFromUint8(2)).toBe('transaction');
    expect(phaseFromUint8(3)).toBe('evaluation');
    expect(phaseFromUint8(4)).toBe('completed');
  });

  test('returns unknown for unmapped values', () => {
    expect(phaseFromUint8(99)).toBe('unknown_99');
  });
});

describe('memoTypeFromUint8', () => {
  test('maps known memo types', () => {
    expect(memoTypeFromUint8(0)).toBe('request');
    expect(memoTypeFromUint8(1)).toBe('negotiation');
    expect(memoTypeFromUint8(2)).toBe('transaction');
    expect(memoTypeFromUint8(3)).toBe('deliverable');
    expect(memoTypeFromUint8(4)).toBe('evaluation');
    expect(memoTypeFromUint8(5)).toBe('general');
  });

  test('returns unknown for unmapped values', () => {
    expect(memoTypeFromUint8(255)).toBe('unknown_255');
  });
});
