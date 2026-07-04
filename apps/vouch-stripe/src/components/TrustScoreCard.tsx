/**
 * TrustScoreCard — Reusable component showing composite score (0-1000)
 * with color coding (red/yellow/green), confidence indicator, and trend arrow.
 */

import { Box, Inline, Badge } from '@stripe/ui-extension-sdk/ui';

type BadgeType = 'info' | 'neutral' | 'urgent' | 'warning' | 'negative' | 'positive';

interface TrustScoreCardProps {
  composite: number | null;
  tier: string;
  confidence: number;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    delta_30d: number;
  };
  compact?: boolean;
}

const TIER_BADGE: Record<string, BadgeType> = {
  diamond: 'positive',
  gold: 'info',
  silver: 'neutral',
  bronze: 'warning',
  unranked: 'negative',
  unscored: 'negative',
};

const TREND_ARROW: Record<string, string> = {
  up: '\u2191',
  down: '\u2193',
  stable: '\u2192',
};

export function TrustScoreCard({ composite, tier, confidence, trend, compact }: TrustScoreCardProps) {
  const tierBadge = TIER_BADGE[tier] ?? 'neutral';

  if (composite === null) {
    return (
      <Box css={{ layout: 'column', gap: 'xsmall' }}>
        <Inline css={{ gap: 'small', alignY: 'center' }}>
          <Box css={{ fontWeight: 'bold', fontSize: compact ? '16px' as any : '28px' as any, color: 'secondary' }}>
            --
          </Box>
          <Badge type="negative">UNSCORED</Badge>
        </Inline>
      </Box>
    );
  }

  return (
    <Box css={{ layout: 'column', gap: 'xsmall' }}>
      <Inline css={{ gap: 'small', alignY: 'center' }}>
        <Box css={{ fontWeight: 'bold', fontSize: compact ? '16px' as any : '28px' as any }}>
          {composite}
        </Box>
        <Box css={{ color: 'secondary', fontSize: compact ? '12px' as any : '16px' as any }}>
          /1000
        </Box>
        <Badge type={tierBadge}>{tier.toUpperCase()}</Badge>
      </Inline>

      <Inline css={{ gap: 'large' }}>
        <Box css={{ color: 'secondary', fontSize: '11px' as any }}>
          Confidence: {(confidence * 100).toFixed(0)}%
        </Box>
        {trend && (
          <Box css={{ fontSize: '11px' as any }}>
            {TREND_ARROW[trend.direction] || ''}{' '}
            {trend.delta_30d >= 0 ? '+' : ''}{trend.delta_30d} (30d)
          </Box>
        )}
      </Inline>
    </Box>
  );
}
