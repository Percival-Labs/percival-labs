// API client for fetching storefront data from the Vouch API
//
// All public endpoints (browsing) require no authentication.
// Checkout/download endpoints accept an optional auth header for future NIP-98 support.

import type {
  AssetListing,
  CheckoutResponse,
  PurchaseConfirmation,
} from '@percival-labs/storefront';
import config from './config';

// ── Internal Helpers ──

async function apiFetch<T>(
  path: string,
  opts?: { method?: string; body?: unknown; auth?: string },
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (opts?.auth) {
    headers['Authorization'] = opts.auth;
  }

  const res = await fetch(`${config.apiUrl}${path}`, {
    method: opts?.method ?? 'GET',
    headers,
    ...(opts?.body !== undefined && { body: JSON.stringify(opts.body) }),
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = (await res.json()) as { message?: string; error?: string };
      message = err.message ?? err.error ?? message;
    } catch {
      // use status
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ── Public Listing Endpoints ──

export interface ListingsFilter {
  category?: string;
  search?: string;
  sort?: 'newest' | 'popular' | 'price_asc' | 'price_desc';
  page?: number;
  limit?: number;
}

export interface ListingsPage {
  listings: AssetListing[];
  total: number;
  page: number;
  pageSize: number;
}

export async function fetchListings(
  filters?: ListingsFilter,
): Promise<ListingsPage> {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.sort) params.set('sort', filters.sort);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));

  const qs = params.toString();
  const path = `/v1/public/storefronts/${config.storefrontSlug}/listings${qs ? `?${qs}` : ''}`;

  return apiFetch<ListingsPage>(path);
}

export async function fetchListing(id: string): Promise<AssetListing> {
  const path = `/v1/public/storefronts/${config.storefrontSlug}/listings/${id}`;
  return apiFetch<AssetListing>(path);
}

// ── Storefront Info ──

export interface StorefrontInfo {
  id: string;
  slug: string;
  name: string;
  description?: string;
  creatorPubkey: string;
  vouchScore?: number;
}

export async function fetchStorefront(): Promise<StorefrontInfo> {
  const path = `/v1/public/storefronts/${config.storefrontSlug}`;
  return apiFetch<StorefrontInfo>(path);
}

// ── Checkout ──

export async function startCheckout(
  listingId: string,
  method: 'lightning' | 'strike',
  auth?: string,
): Promise<CheckoutResponse> {
  const path = `/v1/storefronts/${config.storefrontSlug}/listings/${listingId}/checkout`;
  return apiFetch<CheckoutResponse>(path, {
    method: 'POST',
    body: { method },
    auth,
  });
}

export async function confirmPayment(
  listingId: string,
  paymentHash: string,
  auth?: string,
): Promise<PurchaseConfirmation> {
  const path = `/v1/storefronts/${config.storefrontSlug}/listings/${listingId}/confirm`;
  return apiFetch<PurchaseConfirmation>(path, {
    method: 'POST',
    body: { paymentHash },
    auth,
  });
}

// ── Download ──

export interface DownloadInfo {
  downloadUrl: string;
  remainingDownloads: number;
  maxDownloads: number;
  expiresAt: string;
  fileHash: string;
}

export async function getDownloadInfo(
  listingId: string,
  downloadToken: string,
  auth?: string,
): Promise<DownloadInfo> {
  const params = new URLSearchParams({ token: downloadToken });
  const path = `/v1/storefronts/${config.storefrontSlug}/listings/${listingId}/download?${params.toString()}`;
  return apiFetch<DownloadInfo>(path, { auth });
}
