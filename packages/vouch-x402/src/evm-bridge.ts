// Vouch x402 — EVM address extraction from x402 PaymentPayload.
// Handles multiple payment schemes (EIP-3009 exact, Permit2, etc.)

/**
 * Extract the payer's EVM wallet address from an x402 payment payload.
 * The payload structure varies by payment scheme:
 * - Exact (EIP-3009): payload.authorization.from
 * - Permit2: payload.permit2Authorization.from
 *
 * Returns lowercase hex address (0x...) or null if not found.
 */
export function extractPayerAddress(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;

  const p = payload as Record<string, unknown>;

  // x402 wraps the scheme-specific data in a `payload` field
  const inner = (p.payload ?? p) as Record<string, unknown>;

  // EIP-3009 authorization (exact scheme on Base/Ethereum)
  const auth = inner.authorization as Record<string, unknown> | undefined;
  if (auth?.from && typeof auth.from === 'string') {
    return normalizeAddress(auth.from);
  }

  // Permit2 authorization
  const permit2 = inner.permit2Authorization as Record<string, unknown> | undefined;
  if (permit2?.from && typeof permit2.from === 'string') {
    return normalizeAddress(permit2.from);
  }

  // Fallback: check for common top-level fields
  if (inner.payer && typeof inner.payer === 'string') {
    return normalizeAddress(inner.payer);
  }
  if (inner.from && typeof inner.from === 'string') {
    return normalizeAddress(inner.from);
  }

  return null;
}

function normalizeAddress(addr: string): string | null {
  if (/^0x[0-9a-fA-F]{40}$/.test(addr)) {
    return addr.toLowerCase();
  }
  return null;
}
