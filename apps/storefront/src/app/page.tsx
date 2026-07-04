'use client';

// Homepage: responsive grid of listings with filters and pagination

import { useState, useEffect, useCallback } from 'react';
import type { AssetListing } from '@percival-labs/storefront';
import { fetchListings, fetchStorefront, type ListingsFilter, type StorefrontInfo } from '@/lib/api';
import { ListingCard } from '@/components/listing-card';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'stl', label: '3D Models (STL)' },
  { value: 'svg', label: 'SVG' },
  { value: 'gcode', label: 'G-Code' },
  { value: 'digital_art', label: 'Digital Art' },
  { value: 'ebook', label: 'eBooks' },
  { value: 'other', label: 'Other' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

const PAGE_SIZE = 12;

export default function HomePage() {
  const [storefront, setStorefront] = useState<StorefrontInfo | null>(null);
  const [listings, setListings] = useState<AssetListing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<ListingsFilter['sort']>('newest');
  const [page, setPage] = useState(1);

  // Load storefront info
  useEffect(() => {
    fetchStorefront()
      .then(setStorefront)
      .catch(() => {
        // Storefront info is optional for display
      });
  }, []);

  // Load listings
  const loadListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchListings({
        category: category || undefined,
        search: search || undefined,
        sort,
        page,
        limit: PAGE_SIZE,
      });
      setListings(result.listings);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listings');
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [category, search, sort, page]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  // Reset to page 1 when filters change
  const handleFilterChange = useCallback(
    (setter: (v: string) => void) => (value: string) => {
      setter(value);
      setPage(1);
    },
    [],
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const navigateToListing = useCallback((id: string) => {
    window.location.href = `/${id}`;
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Storefront header */}
      <div style={{ marginBottom: '32px' }}>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: '#ffffff',
            margin: 0,
          }}
        >
          {storefront?.name ?? 'Digital Asset Storefront'}
        </h1>
        {storefront?.description && (
          <p
            style={{
              fontSize: '1rem',
              color: '#9ca3af',
              marginTop: '8px',
            }}
          >
            {storefront.description}
          </p>
        )}
      </div>

      {/* Filters bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '24px',
          alignItems: 'center',
        }}
      >
        {/* Search */}
        <input
          type="text"
          placeholder="Search listings..."
          value={search}
          onChange={(e) => handleFilterChange(setSearch)(e.target.value)}
          style={{
            flex: '1 1 200px',
            padding: '10px 14px',
            background: '#111827',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '0.875rem',
            outline: 'none',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
          onBlur={(e) => (e.currentTarget.style.borderColor = '#1e293b')}
        />

        {/* Category */}
        <select
          value={category}
          onChange={(e) => handleFilterChange(setCategory)(e.target.value)}
          style={{
            padding: '10px 14px',
            background: '#111827',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) =>
            handleFilterChange(
              (v) => setSort(v as ListingsFilter['sort']),
            )(e.target.value)
          }
          style={{
            padding: '10px 14px',
            background: '#111827',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
          Loading listings...
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px',
            color: '#ef4444',
          }}
        >
          <p style={{ marginBottom: '12px' }}>{error}</p>
          <button
            type="button"
            onClick={loadListings}
            style={{
              padding: '8px 16px',
              background: '#1e293b',
              border: '1px solid #374151',
              borderRadius: '6px',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && listings.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px', color: '#6b7280' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No listings found</p>
          <p style={{ fontSize: '0.875rem' }}>
            {search || category
              ? 'Try adjusting your filters.'
              : 'This storefront has no listings yet.'}
          </p>
        </div>
      )}

      {/* Listings grid */}
      {!loading && !error && listings.length > 0 && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px',
            }}
          >
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                vouchScore={storefront?.vouchScore}
                onClick={navigateToListing}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                marginTop: '40px',
              }}
            >
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={{
                  padding: '8px 16px',
                  background: page <= 1 ? '#0a0e17' : '#1e293b',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  color: page <= 1 ? '#374151' : '#ffffff',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Previous
              </button>

              <span style={{ fontSize: '0.875rem', color: '#9ca3af', padding: '0 12px' }}>
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={{
                  padding: '8px 16px',
                  background: page >= totalPages ? '#0a0e17' : '#1e293b',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  color: page >= totalPages ? '#374151' : '#ffffff',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Next
              </button>
            </div>
          )}

          {/* Results count */}
          <p
            style={{
              textAlign: 'center',
              fontSize: '0.75rem',
              color: '#6b7280',
              marginTop: '12px',
            }}
          >
            {total} listing{total !== 1 ? 's' : ''} found
          </p>
        </>
      )}
    </div>
  );
}
