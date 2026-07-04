// Client-side checkout flow for storefront purchases
//
// Handles: checkout initiation, payment confirmation, download URL retrieval.
// Works with both Lightning (bolt11) and Strike payment methods.

import type { CheckoutResponse, PurchaseConfirmation } from './types.js';

// ── Internal Helpers ──

async function apiRequest<T>(
  url: string,
  method: 'GET' | 'POST',
  authHeader?: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  const res = await fetch(url, {
    method,
    headers,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = (await res.json()) as { message?: string; error?: string };
      message = err.message ?? err.error ?? message;
    } catch {
      // ignore parse error, use status message
    }
    throw new Error(`Storefront API error: ${message}`);
  }

  return res.json() as Promise<T>;
}

// ── Checkout Initiation ──

export async function requestCheckout(
  apiUrl: string,
  storefrontId: string,
  listingId: string,
  method: 'lightning' | 'strike',
  authHeader?: string,
): Promise<CheckoutResponse> {
  const url = `${apiUrl}/v1/storefronts/${storefrontId}/listings/${listingId}/checkout`;
  return apiRequest<CheckoutResponse>(url, 'POST', authHeader, { method });
}

// ── Purchase Confirmation (Lightning) ──

// Called after payment is detected on-chain. Exchanges paymentHash for download token.
export async function confirmPurchase(
  apiUrl: string,
  storefrontId: string,
  listingId: string,
  paymentHash: string,
  authHeader?: string,
): Promise<PurchaseConfirmation> {
  const url = `${apiUrl}/v1/storefronts/${storefrontId}/listings/${listingId}/confirm`;
  return apiRequest<PurchaseConfirmation>(url, 'POST', authHeader, { paymentHash });
}

// ── Download URL Retrieval ──

export async function getDownloadUrl(
  apiUrl: string,
  storefrontId: string,
  listingId: string,
  downloadToken: string,
  authHeader?: string,
): Promise<string> {
  const params = new URLSearchParams({ token: downloadToken });
  const url = `${apiUrl}/v1/storefronts/${storefrontId}/listings/${listingId}/download?${params.toString()}`;

  const result = await apiRequest<{ downloadUrl: string }>(url, 'GET', authHeader);
  return result.downloadUrl;
}

// ── Lightning Polling ──

// Poll for payment confirmation with exponential backoff.
// Returns PurchaseConfirmation once the invoice is settled.
export async function pollForPayment(
  apiUrl: string,
  storefrontId: string,
  listingId: string,
  paymentHash: string,
  opts?: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    authHeader?: string;
  },
): Promise<PurchaseConfirmation> {
  const maxAttempts = opts?.maxAttempts ?? 60;  // 60 attempts ~= 5 min at 5s intervals
  const initialDelay = opts?.initialDelayMs ?? 2000;
  const maxDelay = opts?.maxDelayMs ?? 10000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const confirmation = await confirmPurchase(
        apiUrl,
        storefrontId,
        listingId,
        paymentHash,
        opts?.authHeader,
      );
      return confirmation;
    } catch (err) {
      const isNotYetPaid =
        err instanceof Error &&
        (err.message.includes('pending') ||
          err.message.includes('not yet') ||
          err.message.includes('404') ||
          err.message.includes('402'));

      if (!isNotYetPaid || attempt === maxAttempts - 1) {
        throw err;
      }

      // Exponential backoff capped at maxDelay
      const delay = Math.min(initialDelay * Math.pow(1.5, attempt), maxDelay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Payment confirmation timed out');
}
