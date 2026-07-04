/**
 * Content hashing for idempotent publishing.
 *
 * Previous tooling compared "first 80 chars" of content to detect duplicates.
 * This broke when content had different whitespace or minor edits. SHA-256 of
 * normalized content is deterministic and reliable.
 */

/**
 * Normalize content for hashing:
 * - Trim whitespace
 * - Collapse multiple spaces/newlines
 * - Lowercase (same message with different casing = same intent)
 */
export function normalizeContent(content: string): string {
  return content.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * SHA-256 hash of normalized content. Returns hex string.
 * Uses Node.js crypto (works in both Node and Bun).
 */
export async function contentHash(content: string): Promise<string> {
  const normalized = normalizeContent(content);
  const data = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Synchronous content hash using node:crypto.
 * Fallback for contexts where crypto.subtle isn't available.
 */
export function contentHashSync(content: string): string {
  const { createHash } = require('node:crypto');
  const normalized = normalizeContent(content);
  return createHash('sha256').update(normalized).digest('hex');
}
