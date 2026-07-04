// NIP-99 Kind 30402 — Classified Listing events for digital asset storefronts
//
// Spec: https://github.com/nostr-protocol/nips/blob/master/99.md
// Kind 30402 = Classified Listing (addressable, replaceable by d-tag)

import type { AssetListing, StlMetadata } from './types.js';

export const NIP99_KIND = 30402;

// ── Event Shape ──

export interface Nip99Event {
  kind: number;
  pubkey: string;
  created_at: number;
  tags: string[][];
  content: string;
}

// ── Build ──

export function buildNip99Event(listing: AssetListing, storefrontSlug: string): Nip99Event {
  const tags: string[][] = [];

  // d tag — unique identifier within creator's namespace (slug)
  tags.push(['d', listing.slug]);

  // Core required tags
  tags.push(['title', listing.title]);
  tags.push(['summary', listing.description.slice(0, 280)]);
  tags.push(['published_at', Math.floor(new Date(listing.createdAt).getTime() / 1000).toString()]);

  // Price — format: "<amount> <currency> <frequency>"
  // NIP-99 price tag: ["price", "<amount>", "<currency>"]
  if (listing.currency === 'sats' || listing.currency === 'both') {
    tags.push(['price', listing.priceSats.toString(), 'SATS']);
  }
  if ((listing.currency === 'usd' || listing.currency === 'both') && listing.priceUsdCents !== undefined) {
    // USD expressed in cents as integer, divide by 100 for display
    tags.push(['price', (listing.priceUsdCents / 100).toFixed(2), 'USD']);
  }

  // File integrity
  tags.push(['sha256', listing.fileHash]);

  // Category as a topic tag
  tags.push(['t', listing.category]);

  // User-defined tags
  for (const tag of listing.tags) {
    tags.push(['t', tag]);
  }

  // Preview images
  for (const url of listing.previewUrls) {
    tags.push(['image', url]);
  }

  // File size (bytes)
  if (listing.fileSizeBytes !== undefined) {
    tags.push(['file-size', listing.fileSizeBytes.toString()]);
  }

  // Vouch-specific extension tags
  tags.push(['vouch-storefront', storefrontSlug]);
  tags.push(['vouch-listing-id', listing.id]);
  tags.push(['vouch-creator', listing.creatorPubkey]);

  // STL-specific metadata extracted from listing.metadata
  if (listing.category === 'stl') {
    const stl = listing.metadata as Partial<StlMetadata>;

    if (stl.dimensionsMm) {
      tags.push(['stl-dimensions', stl.dimensionsMm]);
    }
    if (stl.material) {
      tags.push(['stl-material', stl.material]);
    }
    if (stl.supportsNeeded !== undefined) {
      tags.push(['stl-supports', stl.supportsNeeded ? 'yes' : 'no']);
    }
    if (stl.layerHeight) {
      tags.push(['stl-layer-height', stl.layerHeight]);
    }
    if (stl.infillPercent !== undefined) {
      tags.push(['stl-infill', stl.infillPercent.toString()]);
    }
    if (stl.polygonCount !== undefined) {
      tags.push(['stl-polygons', stl.polygonCount.toString()]);
    }
    if (stl.printTimeEstimate) {
      tags.push(['stl-print-time', stl.printTimeEstimate]);
    }
  }

  // Status (active listings only — delisted/suspended should not be broadcast)
  tags.push(['status', listing.status]);

  return {
    kind: NIP99_KIND,
    pubkey: listing.creatorPubkey,
    created_at: Math.floor(new Date(listing.createdAt).getTime() / 1000),
    tags,
    content: listing.description,
  };
}

// ── Parse ──

export function parseNip99Event(event: Nip99Event): Partial<AssetListing> {
  const slug = getTag(event.tags, 'd') ?? '';
  const title = getTag(event.tags, 'title') ?? '';
  const summary = getTag(event.tags, 'summary') ?? '';
  const fileHash = getTag(event.tags, 'sha256') ?? '';
  const nostrEventId = (event as unknown as Record<string, unknown>)['id'] as string | undefined;
  const listingId = getTag(event.tags, 'vouch-listing-id');
  const creatorPubkey = getTag(event.tags, 'vouch-creator') ?? event.pubkey;
  const storefrontSlug = getTag(event.tags, 'vouch-storefront') ?? '';
  const status = (getTag(event.tags, 'status') ?? 'active') as AssetListing['status'];

  // Parse price tags — may have multiple (SATS + USD)
  let priceSats = 0;
  let priceUsdCents: number | undefined;
  let currency: AssetListing['currency'] = 'sats';

  for (const tag of event.tags) {
    if (tag[0] === 'price') {
      const amount = parseFloat(tag[1] ?? '0');
      const curr = (tag[2] ?? '').toUpperCase();

      if (curr === 'SATS') {
        priceSats = Math.round(amount);
      } else if (curr === 'USD') {
        priceUsdCents = Math.round(amount * 100);
      }
    }
  }

  if (priceSats > 0 && priceUsdCents !== undefined) {
    currency = 'both';
  } else if (priceUsdCents !== undefined) {
    currency = 'usd';
  } else {
    currency = 'sats';
  }

  // All 't' tags — first is category, rest are user tags
  const allTTopics = getAllTags(event.tags, 't');
  const category = (allTTopics[0] ?? 'other') as AssetListing['category'];
  const tags = allTTopics.slice(1);

  // Preview images
  const previewUrls = getAllTags(event.tags, 'image');

  // File size
  const fileSizeBytesRaw = getTag(event.tags, 'file-size');
  const fileSizeBytes = fileSizeBytesRaw !== undefined ? parseInt(fileSizeBytesRaw, 10) : undefined;

  // STL metadata
  const metadata: Record<string, unknown> = {};
  if (category === 'stl') {
    const dimensionsMm = getTag(event.tags, 'stl-dimensions');
    const material = getTag(event.tags, 'stl-material');
    const supportsRaw = getTag(event.tags, 'stl-supports');
    const layerHeight = getTag(event.tags, 'stl-layer-height');
    const infillRaw = getTag(event.tags, 'stl-infill');
    const polygonsRaw = getTag(event.tags, 'stl-polygons');
    const printTimeEstimate = getTag(event.tags, 'stl-print-time');

    if (dimensionsMm) metadata['dimensionsMm'] = dimensionsMm;
    if (material) metadata['material'] = material;
    if (supportsRaw !== undefined) metadata['supportsNeeded'] = supportsRaw === 'yes';
    if (layerHeight) metadata['layerHeight'] = layerHeight;
    if (infillRaw !== undefined) metadata['infillPercent'] = parseInt(infillRaw, 10);
    if (polygonsRaw !== undefined) metadata['polygonCount'] = parseInt(polygonsRaw, 10);
    if (printTimeEstimate) metadata['printTimeEstimate'] = printTimeEstimate;
  }

  // Timestamps
  const createdAt = new Date(event.created_at * 1000).toISOString();

  const partial: Partial<AssetListing> = {
    slug,
    title,
    description: event.content || summary,
    fileHash,
    creatorPubkey,
    category,
    priceSats,
    currency,
    tags,
    previewUrls,
    metadata,
    status,
    createdAt,
    updatedAt: createdAt,
    purchaseCount: 0,
    ratingCount: 0,
  };

  if (nostrEventId) partial['nostrEventId'] = nostrEventId;
  if (listingId) partial['id'] = listingId;
  if (storefrontSlug) partial['storefrontId'] = storefrontSlug;
  if (priceUsdCents !== undefined) partial['priceUsdCents'] = priceUsdCents;
  if (fileSizeBytes !== undefined) partial['fileSizeBytes'] = fileSizeBytes;

  return partial;
}

// ── Tag Helpers ──

export function getTag(tags: string[][], name: string): string | undefined {
  const found = tags.find((t) => t[0] === name);
  return found?.[1];
}

export function getAllTags(tags: string[][], name: string): string[] {
  return tags
    .filter((t) => t[0] === name)
    .map((t) => t[1])
    .filter((v): v is string => v !== undefined);
}
