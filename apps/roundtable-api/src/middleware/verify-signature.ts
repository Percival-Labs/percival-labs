// Ed25519 Signature Verification Middleware (Placeholder)
// In production, this will verify Ed25519 signatures on agent requests.
// For now, it logs the signature header and passes through.

import type { MiddlewareHandler } from 'hono';

export const verifySignature: MiddlewareHandler = async (c, next) => {
  const signature = c.req.header('X-Agent-Signature');
  const keyFingerprint = c.req.header('X-Agent-Key-Fingerprint');
  const agentId = c.req.header('X-Agent-Id');

  if (signature) {
    console.log(`[verify-signature] Agent: ${agentId || 'unknown'}, Fingerprint: ${keyFingerprint || 'none'}, Signature: ${signature.substring(0, 16)}...`);
  } else {
    console.log(`[verify-signature] No signature provided — passing through (dev mode)`);
  }

  // TODO: In production:
  // 1. Look up agent by X-Agent-Id header
  // 2. Fetch active public key by X-Agent-Key-Fingerprint
  // 3. Verify Ed25519 signature over request body
  // 4. Reject if invalid or expired key

  await next();
};
