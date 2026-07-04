// File hash verification for downloaded assets
//
// Uses Web Crypto API (SubtleCrypto) for browser compatibility.
// No Node.js-specific imports — works in browsers, Bun, and Deno.

// ── Hash Computation ──

export async function computeFileHash(file: File | ArrayBuffer): Promise<string> {
  let buffer: ArrayBuffer;

  if (file instanceof ArrayBuffer) {
    buffer = file;
  } else {
    buffer = await file.arrayBuffer();
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return bufferToHex(hashBuffer);
}

// ── Hash Verification ──

// Constant-time string comparison to prevent timing attacks.
// Safe for comparing hex hashes where timing matters.
export function verifyFileHash(computedHash: string, expectedHash: string): boolean {
  const a = computedHash.toLowerCase();
  const b = expectedHash.toLowerCase();

  if (a.length !== b.length) {
    return false;
  }

  // XOR each character code and accumulate — prevents short-circuit evaluation
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return diff === 0;
}

// ── Streaming Hash (for large files) ──

// Compute SHA-256 over a ReadableStream without loading the whole file into memory.
// Uses a TransformStream to feed chunks into SubtleCrypto incrementally.
// Note: SubtleCrypto does not support streaming natively — we accumulate chunks
// then hash. For truly large files, consider streaming via @noble/hashes instead.
export async function computeStreamHash(stream: ReadableStream<Uint8Array>): Promise<string> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  // Concatenate all chunks into a single buffer
  const totalLength = chunks.reduce((sum, c) => sum + c.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', combined.buffer);
  return bufferToHex(hashBuffer);
}

// ── Internal Helpers ──

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
