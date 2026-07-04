'use client';

// Grid card for displaying a listing on the homepage

import type { AssetListing } from '@percival-labs/storefront';
import { formatSats, satsToUsdApprox, truncate } from '@/lib/format';
import { TrustBadge } from './trust-badge';

interface ListingCardProps {
  listing: AssetListing;
  vouchScore?: number;
  onClick: (id: string) => void;
}

const categoryLabels: Record<string, string> = {
  stl: '3D Model',
  svg: 'SVG',
  gcode: 'G-Code',
  digital_art: 'Digital Art',
  ebook: 'eBook',
  other: 'Other',
};

function StarRating({ rating, count }: { rating?: number; count: number }) {
  if (!rating || count === 0) return null;

  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const fill = i <= Math.round(rating) ? '#f59e0b' : '#374151';
    stars.push(
      <svg
        key={i}
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill={fill}
        stroke="none"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>,
    );
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
      {stars}
      <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: '4px' }}>
        ({count})
      </span>
    </span>
  );
}

export function ListingCard({ listing, vouchScore, onClick }: ListingCardProps) {
  const previewSrc = listing.previewUrls?.[0] ?? null;

  return (
    <button
      type="button"
      onClick={() => onClick(listing.id)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#111827',
        border: '1px solid #1e293b',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.2s, transform 0.15s',
        textAlign: 'left',
        width: '100%',
        padding: 0,
        color: 'inherit',
        font: 'inherit',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#6366f1';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#1e293b';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Preview image */}
      <div
        style={{
          aspectRatio: '4/3',
          background: '#0a0e17',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {previewSrc ? (
          <img
            src={previewSrc}
            alt={listing.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#374151"
            strokeWidth="1.5"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Category badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#6366f1',
              background: 'rgba(99,102,241,0.1)',
              padding: '2px 8px',
              borderRadius: '4px',
            }}
          >
            {categoryLabels[listing.category] ?? listing.category}
          </span>
          {vouchScore !== undefined && <TrustBadge score={vouchScore} size="sm" />}
        </div>

        {/* Title */}
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>
          {truncate(listing.title, 60)}
        </h3>

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b' }}>
            {formatSats(listing.priceSats)}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            ~{satsToUsdApprox(listing.priceSats)}
          </span>
        </div>

        {/* Rating + purchases */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: 'auto' }}>
          <StarRating rating={listing.avgRating} count={listing.ratingCount} />
          {listing.purchaseCount > 0 && (
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              {listing.purchaseCount} sold
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
