import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Digital Asset Storefront -- Powered by Vouch',
  description:
    'Browse and purchase verified digital assets. Powered by Vouch trust staking.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <header
          style={{
            borderBottom: '1px solid #1e293b',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <a
            href="/"
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6366f1"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Storefront
          </a>
          <span
            style={{
              fontSize: '0.7rem',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Powered by{' '}
            <a
              href="https://percivallabs.com/vouch"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#6366f1', fontWeight: 500 }}
            >
              Vouch
            </a>
          </span>
        </header>

        {/* Main content */}
        <main style={{ flex: 1, padding: '24px' }}>{children}</main>

        {/* Footer */}
        <footer
          style={{
            borderTop: '1px solid #1e293b',
            padding: '16px 24px',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: '#6b7280',
          }}
        >
          Digital Asset Storefront -- Powered by{' '}
          <a
            href="https://percivallabs.com/vouch"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#6366f1' }}
          >
            Vouch
          </a>
        </footer>
      </body>
    </html>
  );
}
