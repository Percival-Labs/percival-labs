'use client';

// Trust badge showing a creator's Vouch score
// Color-coded: green (700+), yellow (400-699), gray (<400)

interface TrustBadgeProps {
  score: number | undefined;
  size?: 'sm' | 'md';
}

function scoreColor(score: number): string {
  if (score >= 700) return '#10b981'; // green
  if (score >= 400) return '#f59e0b'; // amber
  return '#6b7280'; // gray
}

function scoreLabel(score: number): string {
  if (score >= 700) return 'Trusted';
  if (score >= 400) return 'Emerging';
  return 'New';
}

export function TrustBadge({ score, size = 'sm' }: TrustBadgeProps) {
  if (score === undefined || score === null) return null;

  const color = scoreColor(score);
  const label = scoreLabel(score);
  const fontSize = size === 'sm' ? '0.75rem' : '0.875rem';
  const padding = size === 'sm' ? '2px 8px' : '4px 12px';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize,
        padding,
        borderRadius: '9999px',
        border: `1px solid ${color}`,
        color,
        fontWeight: 500,
      }}
      title={`Vouch Trust Score: ${score}`}
    >
      <svg
        width={size === 'sm' ? 12 : 14}
        height={size === 'sm' ? 12 : 14}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      {score} {label}
    </span>
  );
}
