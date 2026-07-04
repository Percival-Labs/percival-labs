// ── Storefront Configuration ──

export interface StorefrontConfig {
  creatorPubkey: string;
  storefrontSlug: string;
  apiUrl: string;
  relayUrls: string[];
  theme?: {
    primaryColor?: string;
    name?: string;
    logoUrl?: string;
  };
}

// ── Asset Categories ──

export type AssetCategory =
  | 'stl'
  | 'svg'
  | 'gcode'
  | 'digital_art'
  | 'ebook'
  | 'other';

// ── STL-Specific Metadata ──

export interface StlMetadata {
  dimensionsMm?: string;
  printTimeEstimate?: string;
  material?: string;
  supportsNeeded?: boolean;
  layerHeight?: string;
  infillPercent?: number;
  polygonCount?: number;
}

// ── Asset Listing ──

export interface AssetListing {
  id: string;
  storefrontId: string;
  creatorPubkey: string;
  nostrEventId?: string;
  title: string;
  slug: string;
  description: string;
  priceSats: number;
  priceUsdCents?: number;
  currency: 'sats' | 'usd' | 'both';
  category: AssetCategory;
  fileHash: string;
  fileUrl: string;
  fileSizeBytes?: number;
  previewUrls: string[];
  metadata: Record<string, unknown>;
  tags: string[];
  purchaseCount: number;
  avgRating?: number;
  ratingCount: number;
  status: 'active' | 'delisted' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

// ── Checkout Flow ──

export interface CheckoutRequest {
  listingId: string;
  method: 'lightning' | 'strike';
}

export interface CheckoutResponse {
  invoice?: string;          // bolt11 for lightning
  paymentHash?: string;      // for lightning polling
  strikePaymentUrl?: string; // for strike redirect
  strikePaymentId?: string;
  expiresAt: string;
}

export interface PurchaseConfirmation {
  purchaseId: string;
  downloadToken: string;
  downloadUrl: string;
  expiresAt: string;
}

// ── API Response Shapes ──

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}
