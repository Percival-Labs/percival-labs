'use client';

// Download button that fetches the signed download URL using a purchase token.
// Shows remaining downloads and expected file hash for verification.

import { useState, useCallback } from 'react';
import { getDownloadInfo, type DownloadInfo } from '@/lib/api';

interface DownloadButtonProps {
  listingId: string;
  downloadToken: string;
}

export function DownloadButton({ listingId, downloadToken }: DownloadButtonProps) {
  const [info, setInfo] = useState<DownloadInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const downloadInfo = await getDownloadInfo(listingId, downloadToken);
      setInfo(downloadInfo);

      // Trigger the download
      window.open(downloadInfo.downloadUrl, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get download link');
    } finally {
      setLoading(false);
    }
  }, [listingId, downloadToken]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        alignItems: 'center',
      }}
    >
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        style={{
          padding: '16px 32px',
          background: loading ? '#374151' : '#10b981',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1.1rem',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
          minWidth: '240px',
        }}
        onMouseEnter={(e) => {
          if (!loading) e.currentTarget.style.background = '#059669';
        }}
        onMouseLeave={(e) => {
          if (!loading) e.currentTarget.style.background = '#10b981';
        }}
      >
        {loading ? 'Preparing download...' : 'Download File'}
      </button>

      {error && (
        <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</p>
      )}

      {info && (
        <div
          style={{
            background: '#111827',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '16px',
            width: '100%',
            maxWidth: '400px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
              Downloads remaining
            </span>
            <span style={{ fontSize: '0.875rem', color: '#e5e7eb', fontWeight: 500 }}>
              {info.remainingDownloads} / {info.maxDownloads}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
              Expires
            </span>
            <span style={{ fontSize: '0.875rem', color: '#e5e7eb' }}>
              {new Date(info.expiresAt).toLocaleString()}
            </span>
          </div>

          {info.fileHash && (
            <div>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>
                SHA-256 (verify after download)
              </p>
              <code
                style={{
                  fontSize: '0.7rem',
                  color: '#9ca3af',
                  background: '#0a0e17',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  display: 'block',
                  wordBreak: 'break-all',
                  fontFamily: 'monospace',
                }}
              >
                {info.fileHash}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
