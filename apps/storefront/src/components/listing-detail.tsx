'use client';

// Full listing detail view with image gallery and metadata table

import { useState } from 'react';
import type { AssetListing, StlMetadata } from '@percival-labs/storefront';
import { formatSats, satsToUsdApprox, formatDate } from '@/lib/format';
import { TrustBadge } from './trust-badge';

interface ListingDetailProps {
  listing: AssetListing;
  vouchScore?: number;
  onBuy: () => void;
}

function ImageGallery({ urls, title }: { urls: string[]; title: string }) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (urls.length === 0) {
    return (
      <div
        style={{
          aspectRatio: '16/10',
          background: '#0a0e17',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #1e293b',
        }}
      >
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#374151"
          strokeWidth="1.5"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          aspectRatio: '16/10',
          background: '#0a0e17',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid #1e293b',
        }}
      >
        <img
          src={urls[activeIdx]}
          alt={`${title} preview ${activeIdx + 1}`}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>
      {urls.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', overflowX: 'auto' }}>
          {urls.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIdx(i)}
              style={{
                width: '64px',
                height: '48px',
                borderRadius: '6px',
                overflow: 'hidden',
                border: i === activeIdx ? '2px solid #6366f1' : '2px solid #1e293b',
                background: '#0a0e17',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
              }}
            >
              <img
                src={url}
                alt={`Thumbnail ${i + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MetadataTable({ listing }: { listing: AssetListing }) {
  const stl = listing.metadata as StlMetadata | undefined;
  const rows: [string, string][] = [
    ['Category', listing.category.toUpperCase()],
    ['File Size', listing.fileSizeBytes ? formatFileSize(listing.fileSizeBytes) : 'N/A'],
    ['Listed', formatDate(listing.createdAt)],
  ];

  // STL-specific metadata
  if (stl?.dimensionsMm) rows.push(['Dimensions', stl.dimensionsMm]);
  if (stl?.printTimeEstimate) rows.push(['Print Time', stl.printTimeEstimate]);
  if (stl?.material) rows.push(['Material', stl.material]);
  if (stl?.supportsNeeded !== undefined)
    rows.push(['Supports Needed', stl.supportsNeeded ? 'Yes' : 'No']);
  if (stl?.layerHeight) rows.push(['Layer Height', stl.layerHeight]);
  if (stl?.infillPercent !== undefined)
    rows.push(['Infill', `${stl.infillPercent}%`]);
  if (stl?.polygonCount !== undefined)
    rows.push(['Polygons', stl.polygonCount.toLocaleString()]);

  return (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.875rem',
      }}
    >
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label} style={{ borderBottom: '1px solid #1e293b' }}>
            <td style={{ padding: '8px 0', color: '#9ca3af', width: '40%' }}>
              {label}
            </td>
            <td style={{ padding: '8px 0', color: '#e5e7eb' }}>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function ListingDetail({ listing, vouchScore, onBuy }: ListingDetailProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '32px',
        maxWidth: '1000px',
        margin: '0 auto',
      }}
    >
      {/* Gallery (top on mobile, left on desktop) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
          gap: '32px',
        }}
      >
        <div>
          <ImageGallery urls={listing.previewUrls} title={listing.title} />
        </div>

        {/* Info panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Title + badge */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
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
                {listing.category}
              </span>
              <TrustBadge score={vouchScore} size="md" />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              {listing.title}
            </h1>
          </div>

          {/* Price */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
              {formatSats(listing.priceSats)}
            </span>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              ~{satsToUsdApprox(listing.priceSats)}
            </span>
          </div>

          {/* Buy button */}
          <button
            type="button"
            onClick={onBuy}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: '#6366f1',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#4f46e5')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#6366f1')}
          >
            Buy Now
          </button>

          {/* Tags */}
          {listing.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {listing.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: '0.75rem',
                    color: '#9ca3af',
                    background: '#1e293b',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Metadata table */}
          <MetadataTable listing={listing} />
        </div>
      </div>

      {/* Description */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff', marginBottom: '12px' }}>
          Description
        </h2>
        <div
          style={{
            color: '#e5e7eb',
            lineHeight: 1.7,
            fontSize: '0.9rem',
            whiteSpace: 'pre-wrap',
          }}
        >
          {listing.description}
        </div>
      </div>
    </div>
  );
}
