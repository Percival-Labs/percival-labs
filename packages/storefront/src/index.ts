// @percival-labs/storefront — Digital asset marketplace toolkit
//
// Build NIP-99 listings, connect to Nostr relays, handle checkout flows.
//
// Quick start:
//   import { buildNip99Event, requestCheckout, computeFileHash } from '@percival-labs/storefront';

// ── Types ──

export type {
  StorefrontConfig,
  AssetCategory,
  StlMetadata,
  AssetListing,
  CheckoutRequest,
  CheckoutResponse,
  PurchaseConfirmation,
  ApiResponse,
  ApiError,
} from './types.js';

// ── NIP-99 Protocol ──

export {
  NIP99_KIND,
  buildNip99Event,
  parseNip99Event,
  getTag,
  getAllTags,
} from './nip99.js';

export type { Nip99Event } from './nip99.js';

// ── Nostr Relay ──

export {
  subscribeToStorefront,
  fetchStorefrontListings,
  fetchListingBySlug,
  publishToRelays,
} from './nostr.js';

export type { RelaySubscription } from './nostr.js';

// ── Checkout ──

export {
  requestCheckout,
  confirmPurchase,
  getDownloadUrl,
  pollForPayment,
} from './checkout.js';

// ── Verification ──

export {
  computeFileHash,
  verifyFileHash,
  computeStreamHash,
} from './verify.js';
