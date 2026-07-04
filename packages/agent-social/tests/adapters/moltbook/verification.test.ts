import { describe, test, expect } from 'bun:test';
import {
  extractChallenge,
  isVerified,
} from '../../../src/adapters/moltbook/verification.js';

describe('extractChallenge', () => {
  // This is THE bug that caused all our threaded replies to stay "pending"

  test('Shape A: top-level verification fields', () => {
    const response = {
      verification_code: 'abc123',
      challenge_text: 'What is forty plus twelve?',
      expires_at: '2026-03-08T12:00:00Z',
    };

    const challenge = extractChallenge(response);
    expect(challenge).not.toBeNull();
    expect(challenge!.verification_code).toBe('abc123');
    expect(challenge!.challenge_text).toBe('What is forty plus twelve?');
    expect(challenge!.expires_at).toBe('2026-03-08T12:00:00Z');
  });

  test('Shape B: nested under comment.verification (THE BUG)', () => {
    // This is the exact response shape that our old code missed.
    // Threaded replies return verification nested inside comment.verification,
    // not at the top level.
    const response = {
      success: true,
      comment: {
        id: 'comment-123',
        content: 'Great point about trust...',
        verification: {
          verification_code: 'xyz789',
          challenge_text: 'What is twenty three minus five?',
        },
      },
    };

    const challenge = extractChallenge(response);
    expect(challenge).not.toBeNull();
    expect(challenge!.verification_code).toBe('xyz789');
    expect(challenge!.challenge_text).toBe(
      'What is twenty three minus five?',
    );
  });

  test('Shape C: nested under data.verification_code', () => {
    const response = {
      data: {
        verification_code: 'nested-data',
        challenge_text: 'What is ten plus ten?',
      },
    };

    const challenge = extractChallenge(response);
    expect(challenge).not.toBeNull();
    expect(challenge!.verification_code).toBe('nested-data');
  });

  test('returns null when no challenge present', () => {
    expect(extractChallenge({})).toBeNull();
    expect(extractChallenge({ success: true })).toBeNull();
    expect(extractChallenge(null)).toBeNull();
    expect(extractChallenge(undefined)).toBeNull();
    expect(extractChallenge('string')).toBeNull();
  });

  test('returns null when partial fields present', () => {
    // Has verification_code but no challenge_text
    expect(
      extractChallenge({ verification_code: 'abc' }),
    ).toBeNull();
  });
});

describe('isVerified', () => {
  test('detects direct verified: true', () => {
    expect(isVerified({ verified: true })).toBe(true);
  });

  test('detects comment.verified: true', () => {
    expect(
      isVerified({ comment: { id: '123', verified: true } }),
    ).toBe(true);
  });

  test('detects comment.status: verified', () => {
    expect(
      isVerified({ comment: { id: '123', status: 'verified' } }),
    ).toBe(true);
  });

  test('success with comment ID and no challenge = verified', () => {
    expect(
      isVerified({ success: true, comment: { id: '123' } }),
    ).toBe(true);
  });

  test('success with comment + challenge = NOT verified (needs solving)', () => {
    expect(
      isVerified({
        success: true,
        comment: {
          id: '123',
          verification: {
            verification_code: 'abc',
            challenge_text: 'What is 2+2?',
          },
        },
      }),
    ).toBe(false);
  });

  test('returns false for non-objects', () => {
    expect(isVerified(null)).toBe(false);
    expect(isVerified(undefined)).toBe(false);
    expect(isVerified('string')).toBe(false);
  });
});
