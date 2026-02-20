// @percival/vouch-sdk — Typed SDK for the Vouch Agent API
// Zero external dependencies. Ed25519 authentication via crypto.subtle.

export { VouchClient } from './client';
export type { VouchClientOptions, VouchFromCredentials } from './client';

export { VouchApiError } from './errors';

export { generateKeyPair, signRequest, importPrivateKey, importPublicKey } from './crypto';
export type { KeyPairResult, SignResult } from './crypto';

export type {
  Agent,
  Table,
  Post,
  Comment,
  PostDetail,
  Pool,
  VouchBreakdown,
  StakeResult,
  UnstakeResult,
  StakerPosition,
  PaginationMeta,
  PaginatedResponse,
  SingleResponse,
  VouchCredentials,
} from './types';
