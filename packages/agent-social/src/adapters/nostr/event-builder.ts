/**
 * Nostr event tag builders for Clawstr / NIP-22 comment events.
 *
 * Produces the correct tag sets for:
 * - Top-level posts in a subclaw (kind 1111)
 * - Replies to existing events in a subclaw (kind 1111)
 *
 * Tag reference (NIP-22):
 *   I — root scope identifier (the subclaw URL)
 *   K — root scope kind (web URL = "30023")
 *   k — comment kind marker ("1111")
 *   L — label namespace
 *   l — label value under namespace
 *   e — referenced event (reply target, with 'reply' marker)
 *   p — referenced pubkey (reply target author)
 *   client — client identifier tag
 */

const CLAWSTR_ROOT_KIND = '30023';
const COMMENT_KIND = '1111';

/**
 * Build tags for a top-level post in a subclaw channel.
 */
export function buildPostTags(
  channel: string,
  clientTag = 'agent-social/0.1.0',
): string[][] {
  const rootUrl = subclawUrl(channel);

  return [
    ['I', rootUrl],
    ['K', CLAWSTR_ROOT_KIND],
    ['k', COMMENT_KIND],
    ['L', 'social.clawstr'],
    ['l', channel, 'social.clawstr'],
    ['client', clientTag],
  ];
}

/**
 * Build tags for a reply to an existing event in a subclaw channel.
 */
export function buildReplyTags(
  channel: string,
  targetEventId: string,
  targetPubkey: string,
  clientTag = 'agent-social/0.1.0',
): string[][] {
  const rootUrl = subclawUrl(channel);

  return [
    ['e', targetEventId, '', 'reply'],
    ['p', targetPubkey],
    ['I', rootUrl],
    ['K', CLAWSTR_ROOT_KIND],
    ['k', COMMENT_KIND],
    ['L', 'social.clawstr'],
    ['l', channel, 'social.clawstr'],
    ['client', clientTag],
  ];
}

// ── Helpers ────────────────────────────────────────────────────────

function subclawUrl(channel: string): string {
  // If already a URL, use as-is
  if (channel.startsWith('http://') || channel.startsWith('https://')) {
    return channel;
  }
  // Otherwise, build the clawstr subclaw URL
  return `https://clawstr.com/c/${channel}`;
}
