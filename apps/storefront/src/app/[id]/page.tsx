'use client';

// Listing detail page
// Fetches a single listing by ID and displays full details with checkout

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import type { AssetListing } from '@percival-labs/storefront';
import { fetchListing, fetchStorefront } from '@/lib/api';
import { ListingDetail } from '@/components/listing-detail';
import { CheckoutDialog } from '@/components/checkout-dialog';

export default function ListingPage() {
  const params = useParams();
  const listingId = params.id as string;

  const [listing, setListing] = useState<AssetListing | null>(null);
  const [vouchScore, setVouchScore] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    if (!listingId) return;

    setLoading(true);
    setError(null);

    Promise.all([
      fetchListing(listingId),
      fetchStorefront().catch(() => null),
    ])
      .then(([listingData, storefrontData]) => {
        setListing(listingData);
        setVouchScore(storefrontData?.vouchScore);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load listing');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [listingId]);

  const handleSuccess = useCallback(
    (downloadToken: string) => {
      setCheckoutOpen(false);
      window.location.href = `/success?listing=${listingId}&token=${downloadToken}`;
    },
    [listingId],
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '64px', color: '#6b7280' }}>
        Loading listing...
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div style={{ textAlign: 'center', padding: '64px' }}>
        <p style={{ color: '#ef4444', marginBottom: '16px' }}>
          {error ?? 'Listing not found'}
        </p>
        <a
          href="/"
          style={{
            padding: '8px 16px',
            background: '#1e293b',
            border: '1px solid #374151',
            borderRadius: '6px',
            color: '#ffffff',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Back to Store
        </a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <nav style={{ marginBottom: '24px' }}>
        <a
          href="/"
          style={{
            fontSize: '0.875rem',
            color: '#6366f1',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Store
        </a>
      </nav>

      <ListingDetail
        listing={listing}
        vouchScore={vouchScore}
        onBuy={() => setCheckoutOpen(true)}
      />

      <CheckoutDialog
        listingId={listing.id}
        listingTitle={listing.title}
        priceSats={listing.priceSats}
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
