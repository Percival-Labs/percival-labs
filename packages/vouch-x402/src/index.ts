// @percival-labs/vouch-x402 — Trust-gate x402 payments with Vouch agent reputation scores.
//
// Usage:
//   import { createVouchX402 } from '@percival-labs/vouch-x402';
//
//   const vouch = createVouchX402({ minScore: 300 });
//   resourceServer.onBeforeVerify(vouch.beforeVerify);
//   httpServer.onProtectedRequest(vouch.protectedRequest);

export { createVouchX402 } from './hooks';
export type { VouchX402Hooks } from './hooks';
export { VouchScoreClient } from './client';
export { ScoreCache } from './cache';
export { extractPayerAddress } from './evm-bridge';

export type {
  VouchX402Config,
  VouchScoreResponse,
  VouchTrustResult,
  VouchTrustCheckEvent,
  TrustDimension,
  TrustAction,
  FallbackMode,
  Badge,
  Tier,
} from './types';
