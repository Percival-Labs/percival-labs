// Percival Labs — URL Validator (SSRF Defense)
// Validates URLs before fetch operations to prevent Server-Side Request Forgery attacks.

import { resolve } from 'node:dns/promises';

export class UrlValidationError extends Error {
  constructor(message: string, public readonly url: string) {
    super(message);
    this.name = 'UrlValidationError';
  }
}

// Private/internal IP ranges (RFC 1918, RFC 3927, RFC 5737, loopback, etc.)
const PRIVATE_IP_PATTERNS = [
  /^127\./,                          // Loopback
  /^10\./,                           // Class A private
  /^172\.(1[6-9]|2\d|3[01])\./,     // Class B private
  /^192\.168\./,                     // Class C private
  /^169\.254\./,                     // Link-local
  /^0\./,                            // "This" network
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // Shared address space (CGN)
  /^192\.0\.[02]\./,                 // Documentation / IANA
  /^198\.(1[89])\./,                 // Benchmark testing
  /^203\.0\.113\./,                  // Documentation (TEST-NET-3)
  /^(22[4-9]|23\d)\./,              // Multicast
  /^(24\d|25[0-5])\./,              // Reserved/broadcast
];

// IPv6 private prefixes
const PRIVATE_IPV6_PATTERNS = [
  /^::1$/,                   // Loopback
  /^fe80:/i,                 // Link-local
  /^fc[0-9a-f]{2}:/i,       // Unique local
  /^fd[0-9a-f]{2}:/i,       // Unique local
  /^::$/,                    // Unspecified
  /^::ffff:(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/i, // IPv4-mapped
];

// Docker/internal service hostnames that should never be accessed via SSRF
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'agents',
  'registry',
  'verifier',
  'website',
  'vouch',
  'vouch-api',
  'vouch-db',
  'metadata',                   // Cloud metadata services
  'metadata.google.internal',
]);

export interface ValidateUrlOptions {
  allowedSchemes?: string[];
  maxRedirects?: number;
  timeoutMs?: number;
  allowInternal?: boolean;      // For explicitly trusted internal calls
}

const DEFAULT_OPTIONS: Required<ValidateUrlOptions> = {
  allowedSchemes: ['https', 'http'],
  maxRedirects: 3,
  timeoutMs: 10_000,
  allowInternal: false,
};

function isPrivateIPv4(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some(pattern => pattern.test(ip));
}

function isPrivateIPv6(ip: string): boolean {
  return PRIVATE_IPV6_PATTERNS.some(pattern => pattern.test(ip));
}

/**
 * Validate a URL for safe external fetching.
 * Throws UrlValidationError if the URL targets a private/internal resource.
 */
export async function validateUrl(
  rawUrl: string,
  options: ValidateUrlOptions = {},
): Promise<URL> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Parse URL
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UrlValidationError(`Invalid URL format`, rawUrl);
  }

  // Check scheme
  if (!opts.allowedSchemes.includes(parsed.protocol.replace(':', ''))) {
    throw new UrlValidationError(
      `Scheme "${parsed.protocol}" not allowed. Allowed: ${opts.allowedSchemes.join(', ')}`,
      rawUrl,
    );
  }

  // Check for blocked hostnames
  const hostname = parsed.hostname.toLowerCase();
  if (!opts.allowInternal && BLOCKED_HOSTNAMES.has(hostname)) {
    throw new UrlValidationError(
      `Hostname "${hostname}" is blocked (internal service)`,
      rawUrl,
    );
  }

  // Block hostnames without TLD (likely Docker service names)
  if (!opts.allowInternal && !hostname.includes('.') && hostname !== 'localhost') {
    throw new UrlValidationError(
      `Hostname "${hostname}" has no TLD (likely internal service)`,
      rawUrl,
    );
  }

  // Check if hostname is a raw IP
  const ipv4Match = hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/);
  if (ipv4Match && isPrivateIPv4(hostname)) {
    throw new UrlValidationError(
      `IP address "${hostname}" is in a private range`,
      rawUrl,
    );
  }

  // IPv6 in brackets
  const ipv6Match = hostname.match(/^\[(.+)\]$/);
  if (ipv6Match && isPrivateIPv6(ipv6Match[1]!)) {
    throw new UrlValidationError(
      `IPv6 address "${hostname}" is in a private range`,
      rawUrl,
    );
  }

  // DNS resolution check (prevents DNS rebinding attacks)
  if (!ipv4Match && !ipv6Match) {
    try {
      const addresses = await resolve(hostname);
      for (const addr of addresses) {
        if (isPrivateIPv4(addr)) {
          throw new UrlValidationError(
            `Hostname "${hostname}" resolves to private IP ${addr}`,
            rawUrl,
          );
        }
      }
    } catch (err) {
      if (err instanceof UrlValidationError) throw err;
      // DNS resolution failure — block by default for safety
      throw new UrlValidationError(
        `DNS resolution failed for "${hostname}": ${err instanceof Error ? err.message : String(err)}`,
        rawUrl,
      );
    }
  }

  return parsed;
}
