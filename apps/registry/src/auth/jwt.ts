// Percival Labs - JWT Token Management
// Lightweight JWT using Hono's built-in jwt helper

const JWT_SECRET = process.env.JWT_SECRET || 'percival-labs-dev-secret-change-in-prod';
const TOKEN_EXPIRY_HOURS = 24 * 7; // 7 days

export interface TokenPayload {
  sub: string;       // publisher ID
  github_id: string;
  display_name: string;
  iat: number;
  exp: number;
}

/**
 * Create a signed JWT token.
 * Uses HMAC-SHA256 via Web Crypto API (available in Bun).
 */
export async function createToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: TokenPayload = {
    ...payload,
    iat: now,
    exp: now + TOKEN_EXPIRY_HOURS * 3600,
  };

  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(fullPayload));
  const signature = await sign(`${header}.${body}`);

  return `${header}.${body}.${signature}`;
}

/**
 * Verify and decode a JWT token.
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expectedSig = await sign(`${header}.${body}`);

  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(atob(body!.replace(/-/g, '+').replace(/_/g, '/'))) as TokenPayload;

    // Check expiry
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

// ── Helpers ──

function base64url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sign(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return base64url(String.fromCharCode(...new Uint8Array(sig)));
}
