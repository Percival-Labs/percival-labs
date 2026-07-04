/**
 * Timestamp utilities — ISO 8601 everywhere, no exceptions.
 *
 * This module exists because our previous tooling used toLocaleTimeString()
 * which outputs "8:48 AM" with no date, making it impossible to distinguish
 * today's events from last week's. Every function here returns full ISO 8601.
 */

/**
 * Convert a Unix epoch (seconds) to ISO 8601 string.
 * Nostr events use seconds, not milliseconds.
 */
export function fromUnixSeconds(epoch: number): string {
  return new Date(epoch * 1000).toISOString();
}

/**
 * Convert an ISO 8601 string to Unix epoch (seconds).
 * For building Nostr filters.
 */
export function toUnixSeconds(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}

/**
 * Current time as ISO 8601.
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Human-readable relative time ("3m ago", "2h ago", "5d ago").
 * Always includes the full ISO timestamp in parentheses.
 */
export function formatAge(isoOrEpoch: string | number): string {
  const ms =
    typeof isoOrEpoch === 'number'
      ? isoOrEpoch * 1000
      : new Date(isoOrEpoch).getTime();
  const diffSec = Math.floor((Date.now() - ms) / 1000);

  let relative: string;
  if (diffSec < 60) relative = `${diffSec}s ago`;
  else if (diffSec < 3600) relative = `${Math.floor(diffSec / 60)}m ago`;
  else if (diffSec < 86400) relative = `${Math.floor(diffSec / 3600)}h ago`;
  else relative = `${Math.floor(diffSec / 86400)}d ago`;

  const iso =
    typeof isoOrEpoch === 'number'
      ? fromUnixSeconds(isoOrEpoch)
      : isoOrEpoch;

  return `${relative} (${iso})`;
}

/**
 * Compare two ISO 8601 timestamps. Returns true if a is after b.
 */
export function isAfter(a: string, b: string): boolean {
  return new Date(a).getTime() > new Date(b).getTime();
}
