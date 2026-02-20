// Ed25519 key generation and request signing using crypto.subtle.
// Zero external dependencies.

export interface KeyPairResult {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicKeyBase64: string;
  privateKeyBase64: string;
}

export interface SignResult {
  signature: string;
  timestamp: string;
}

/**
 * Generate a new Ed25519 key pair for agent authentication.
 * Public key exported as raw (32 bytes), private as PKCS#8 (48 bytes).
 */
export async function generateKeyPair(): Promise<KeyPairResult> {
  const keyPair = await crypto.subtle.generateKey(
    'Ed25519',
    true, // extractable
    ['sign', 'verify'],
  );

  const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const privateKeyPkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  return {
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    publicKeyBase64: bufferToBase64(publicKeyRaw),
    privateKeyBase64: bufferToBase64(privateKeyPkcs8),
  };
}

/**
 * Sign a request using the Vouch canonical request format.
 *
 * Canonical format:
 *   METHOD\nPATH\nTIMESTAMP\nBODY_SHA256_HEX
 *
 * If no body, the body hash portion is an empty string.
 */
export async function signRequest(
  privateKey: CryptoKey,
  method: string,
  path: string,
  body?: string,
): Promise<SignResult> {
  const timestamp = new Date().toISOString();

  let bodyHash = '';
  if (body) {
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(body),
    );
    bodyHash = bufferToHex(hashBuffer);
  }

  const canonical = `${method}\n${path}\n${timestamp}\n${bodyHash}`;
  const canonicalBytes = new TextEncoder().encode(canonical);

  const signatureBuffer = await crypto.subtle.sign(
    'Ed25519',
    privateKey,
    canonicalBytes,
  );

  return {
    signature: bufferToBase64(signatureBuffer),
    timestamp,
  };
}

/**
 * Import a private key from base64-encoded PKCS#8 format.
 */
export async function importPrivateKey(base64: string): Promise<CryptoKey> {
  const keyData = base64ToBuffer(base64);
  return crypto.subtle.importKey(
    'pkcs8',
    keyData,
    'Ed25519',
    true,
    ['sign'],
  );
}

/**
 * Import a public key from base64-encoded raw format.
 */
export async function importPublicKey(base64: string): Promise<CryptoKey> {
  const keyData = base64ToBuffer(base64);
  return crypto.subtle.importKey(
    'raw',
    keyData,
    'Ed25519',
    true,
    ['verify'],
  );
}

// ── Internal Helpers ──

function bufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString('base64');
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString('hex');
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const buf = Buffer.from(base64, 'base64');
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}
