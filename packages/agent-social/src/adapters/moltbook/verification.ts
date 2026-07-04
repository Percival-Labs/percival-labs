/**
 * Moltbook verification challenge extraction.
 *
 * The bug: Moltbook returns verification challenges in two different shapes
 * depending on whether it's a top-level post or a threaded reply.
 *
 * Shape A (top-level posts):
 *   { verification_code: "abc", challenge_text: "What is...", expires_at: "..." }
 *
 * Shape B (threaded replies):
 *   { success: true, comment: { id: "...", verification: { verification_code: "abc", challenge_text: "..." } } }
 *
 * Our old code only checked Shape A, so threaded replies silently failed verification
 * and comments stayed in "pending" state forever. This module handles both.
 */

import type { VerificationChallenge } from '../../types.js';

/**
 * Extract a verification challenge from any Moltbook API response shape.
 *
 * Returns null if no challenge is present (already verified, or no challenge required).
 */
export function extractChallenge(response: unknown): VerificationChallenge | null {
  if (!response || typeof response !== 'object') return null;

  const res = response as Record<string, unknown>;

  // Shape A: Top-level verification fields
  if (typeof res.verification_code === 'string' && typeof res.challenge_text === 'string') {
    return {
      verification_code: res.verification_code,
      challenge_text: res.challenge_text,
      expires_at: typeof res.expires_at === 'string' ? res.expires_at : undefined,
    };
  }

  // Shape B: Nested under comment.verification
  const comment = res.comment as Record<string, unknown> | undefined;
  if (comment && typeof comment === 'object') {
    const verification = comment.verification as Record<string, unknown> | undefined;
    if (verification && typeof verification === 'object') {
      if (
        typeof verification.verification_code === 'string' &&
        typeof verification.challenge_text === 'string'
      ) {
        return {
          verification_code: verification.verification_code,
          challenge_text: verification.challenge_text,
          expires_at:
            typeof verification.expires_at === 'string'
              ? verification.expires_at
              : undefined,
        };
      }
    }
  }

  // Shape C: Under data.verification (some endpoints wrap in data)
  const data = res.data as Record<string, unknown> | undefined;
  if (data && typeof data === 'object') {
    // Recurse into data
    const fromData = extractChallenge(data);
    if (fromData) return fromData;
  }

  return null;
}

/**
 * Check if a response indicates the comment was already verified.
 * Useful to distinguish "no challenge needed" from "challenge failed".
 */
export function isVerified(response: unknown): boolean {
  if (!response || typeof response !== 'object') return false;

  const res = response as Record<string, unknown>;

  // Direct verified field
  if (res.verified === true) return true;

  // Comment with verification status
  const comment = res.comment as Record<string, unknown> | undefined;
  if (comment?.verified === true) return true;
  if (comment?.status === 'verified') return true;

  // Success with comment ID and no verification challenge
  if (res.success === true && comment?.id && !extractChallenge(response)) {
    return true;
  }

  return false;
}
