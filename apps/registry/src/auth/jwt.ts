// Percival Labs - JWT Token Management
// Uses jose library for secure JWT operations (C2, C3, H1 fixes).
// Replaces hand-rolled HMAC-SHA256 with library-backed implementation:
// - Constant-time signature comparison (C2)
// - Algorithm enforcement on verify (C3)
// - Issuer/audience claims to prevent cross-service token confusion (H1)

import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET environment variable is required. Exiting.');
  process.exit(1);
}

// H1: Enforce minimum secret strength
if (JWT_SECRET.length < 32) {
  console.error('[FATAL] JWT_SECRET must be at least 32 characters. Exiting.');
  process.exit(1);
}

const TOKEN_EXPIRY_HOURS = 24 * 7; // 7 days
const ISSUER = 'percival-registry';
const AUDIENCE = 'percival-registry-app';

function getSecret(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET);
}

export interface TokenPayload {
  sub: string;       // publisher ID
  github_id: string;
  display_name: string;
  iat: number;
  exp: number;
}

/**
 * Create a signed JWT token with issuer/audience claims.
 */
export async function createToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({
    github_id: payload.github_id,
    display_name: payload.display_name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_EXPIRY_HOURS}h`)
    .sign(getSecret());
}

/**
 * Verify and decode a JWT token.
 * Enforces algorithm (HS256), issuer, and audience claims.
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    });

    if (
      typeof payload.sub !== 'string' ||
      typeof payload.github_id !== 'string' ||
      typeof payload.display_name !== 'string'
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      github_id: payload.github_id as string,
      display_name: payload.display_name as string,
      iat: payload.iat ?? 0,
      exp: payload.exp ?? 0,
    };
  } catch {
    return null;
  }
}
