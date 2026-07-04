// Virtuals ACP Indexer — Contract configuration and ABI fragments
// Only includes event definitions needed for indexing (not full ABIs).

import { type Abi } from 'viem';

// ── Contract Addresses (Base Mainnet) ──

// ACP V2 coordinator (proxy) — used to resolve sub-contract addresses
export const ACP_V2_ADDRESS = '0xa6C9BA866992cfD7fd6460ba912bfa405adA9df0' as const;
export const ACP_V1_ADDRESS = '0x6a1FE26D54ab0d3E1e3168f2e0c0cDa5cC0A0A4A' as const;
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;

// Sub-contracts where events are actually emitted (resolved from ACP V2 proxy)
export const JOB_MANAGER_ADDRESS = '0x9c690c267f20C385f8A053F62bC8C7E2d4b83744' as const;
export const MEMO_MANAGER_ADDRESS = '0x9c6C5A7125934CC6A711A7Bf44f3cDcCcf91F30c' as const;
export const ACCOUNT_MANAGER_ADDRESS = '0x14daB2B846A4c07B3f52c37e3fd7265c2BCdf485' as const;

export const BASE_CHAIN_ID = 8453;
export const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

// USDC has 6 decimals
export const USDC_DECIMALS = 6;

// Sync config
export const BLOCKS_PER_BATCH = 2000; // PAYG active — full batch size
export const SYNC_INTERVAL_MS = 15_000; // 15 seconds (~7.5 Base blocks)

// First JobManager event on Base mainnet (block 37,159,105)
export const ACP_V2_DEPLOY_BLOCK = 37_150_000;

// ── ABI Fragments (events only) ──

export const JOB_MANAGER_EVENTS: Abi = [
  {
    type: 'event',
    name: 'JobCreated',
    inputs: [
      { name: 'jobId', type: 'uint256', indexed: true },
      { name: 'accountId', type: 'uint256', indexed: true },
      { name: 'client', type: 'address', indexed: true },
      { name: 'provider', type: 'address', indexed: false },
      { name: 'evaluator', type: 'address', indexed: false },
      { name: 'expiredAt', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'JobPhaseUpdated',
    inputs: [
      { name: 'jobId', type: 'uint256', indexed: true },
      { name: 'oldPhase', type: 'uint8', indexed: false },
      { name: 'newPhase', type: 'uint8', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'BudgetSet',
    inputs: [
      { name: 'jobId', type: 'uint256', indexed: true },
      { name: 'newBudget', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'JobPaymentTokenSet',
    inputs: [
      { name: 'jobId', type: 'uint256', indexed: true },
      { name: 'paymentToken', type: 'address', indexed: true },
      { name: 'newBudget', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'X402PaymentReceived',
    inputs: [
      { name: 'jobId', type: 'uint256', indexed: true },
    ],
  },
] as const;

export const MEMO_MANAGER_EVENTS: Abi = [
  {
    type: 'event',
    name: 'NewMemo',
    inputs: [
      { name: 'memoId', type: 'uint256', indexed: true },
      { name: 'jobId', type: 'uint256', indexed: true },
      { name: 'sender', type: 'address', indexed: true },
      { name: 'memoType', type: 'uint8', indexed: false },
      { name: 'nextPhase', type: 'uint8', indexed: false },
      { name: 'content', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MemoSigned',
    inputs: [
      { name: 'memoId', type: 'uint256', indexed: true },
      { name: 'approver', type: 'address', indexed: true },
      { name: 'approved', type: 'bool', indexed: false },
      { name: 'reason', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MemoStateUpdated',
    inputs: [
      { name: 'memoId', type: 'uint256', indexed: true },
      { name: 'oldState', type: 'uint8', indexed: false },
      { name: 'newState', type: 'uint8', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PayableMemoExecuted',
    inputs: [
      { name: 'memoId', type: 'uint256', indexed: true },
      { name: 'jobId', type: 'uint256', indexed: true },
      { name: 'executor', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PayableFundsRefunded',
    inputs: [
      { name: 'memoId', type: 'uint256', indexed: true },
      { name: 'jobId', type: 'uint256', indexed: true },
      { name: 'sender', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;

// ── Phase mappings (uint8 → string) ──

const PHASE_MAP: Record<number, string> = {
  0: 'request',
  1: 'negotiation',
  2: 'transaction',
  3: 'evaluation',
  4: 'completed',
  5: 'rejected',
  6: 'expired',
};

export function phaseFromUint8(phase: number): string {
  return PHASE_MAP[phase] ?? `unknown_${phase}`;
}

// ── Memo type mappings ──

const MEMO_TYPE_MAP: Record<number, string> = {
  0: 'message',
  1: 'context_url',
  2: 'image_url',
  3: 'voice_url',
  4: 'object_url',
  5: 'txhash',
  6: 'payable_request',
  7: 'payable_transfer',
  8: 'payable_transfer_escrow',
  9: 'notification',
  10: 'payable_notification',
};

export function memoTypeFromUint8(memoType: number): string {
  return MEMO_TYPE_MAP[memoType] ?? `unknown_${memoType}`;
}
