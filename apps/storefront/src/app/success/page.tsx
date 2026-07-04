'use client';

// Post-purchase success page
// Shows download button, file verification info, and remaining downloads

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DownloadButton } from '@/components/download-button';

function SuccessContent() {
  const params = useSearchParams();
  const listingId = params.get('listing') ?? '';
  const downloadToken = params.get('token') ?? '';

  if (!listingId || !downloadToken) {
    return (
      <div style={{ textAlign: 'center', padding: '64px' }}>
        <p style={{ color: '#ef4444', marginBottom: '16px' }}>
          Missing purchase information. Please check your confirmation email or
          try your purchase again.
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
    <div
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        textAlign: 'center',
        padding: '48px 24px',
      }}
    >
      {/* Success icon */}
      <div style={{ marginBottom: '24px' }}>
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ margin: '0 auto' }}
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>

      <h1
        style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          color: '#ffffff',
          marginBottom: '8px',
        }}
      >
        Purchase Complete
      </h1>
      <p
        style={{
          fontSize: '1rem',
          color: '#9ca3af',
          marginBottom: '40px',
        }}
      >
        Your file is ready to download. Keep your download link safe — downloads
        are limited.
      </p>

      <DownloadButton listingId={listingId} downloadToken={downloadToken} />

      {/* Info box */}
      <div
        style={{
          marginTop: '40px',
          background: '#111827',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'left',
        }}
      >
        <h3
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#ffffff',
            marginBottom: '8px',
          }}
        >
          File Verification
        </h3>
        <p style={{ fontSize: '0.8rem', color: '#9ca3af', lineHeight: 1.6 }}>
          After downloading, you can verify the file integrity by comparing the
          SHA-256 hash shown above against the downloaded file. On macOS/Linux,
          run: <code style={{ color: '#e5e7eb' }}>shasum -a 256 filename</code>
        </p>
      </div>

      {/* Back link */}
      <div style={{ marginTop: '32px' }}>
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
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: 'center', padding: '64px', color: '#6b7280' }}>
          Loading...
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
