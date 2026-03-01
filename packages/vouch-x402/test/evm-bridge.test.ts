import { describe, test, expect } from 'bun:test';
import { extractPayerAddress } from '../src/evm-bridge';

describe('extractPayerAddress', () => {
  test('extracts from EIP-3009 authorization (exact scheme)', () => {
    const payload = {
      payload: {
        authorization: {
          from: '0x1234567890abcdef1234567890abcdef12345678',
          to: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
        },
      },
    };
    expect(extractPayerAddress(payload)).toBe('0x1234567890abcdef1234567890abcdef12345678');
  });

  test('extracts from Permit2 authorization', () => {
    const payload = {
      payload: {
        permit2Authorization: {
          from: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
        },
      },
    };
    expect(extractPayerAddress(payload)).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
  });

  test('normalizes address to lowercase', () => {
    const payload = {
      payload: {
        authorization: {
          from: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
        },
      },
    };
    expect(extractPayerAddress(payload)).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
  });

  test('returns null for invalid address format', () => {
    const payload = {
      payload: {
        authorization: { from: 'not-a-valid-address' },
      },
    };
    expect(extractPayerAddress(payload)).toBeNull();
  });

  test('returns null for null/undefined payload', () => {
    expect(extractPayerAddress(null)).toBeNull();
    expect(extractPayerAddress(undefined)).toBeNull();
    expect(extractPayerAddress({})).toBeNull();
  });

  test('extracts from top-level payer field as fallback', () => {
    const payload = {
      payload: {
        payer: '0x1111111111111111111111111111111111111111',
      },
    };
    expect(extractPayerAddress(payload)).toBe('0x1111111111111111111111111111111111111111');
  });
});
