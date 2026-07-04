/**
 * PaymentTrustView — Primary view on payment detail page.
 * Shows composite trust score, dimensional breakdown, threshold assessment.
 * Per architecture doc Section 8.1.
 */

import { Box, Inline, ContextView, Badge, Notice, Divider, Link } from '@stripe/ui-extension-sdk/ui';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { useEffect, useState, useCallback } from 'react';
import { fetchTrustScoreByAgent, type TrustScore, type DimensionScore } from '../lib/vouch-client';

type BadgeType = 'info' | 'neutral' | 'urgent' | 'warning' | 'negative' | 'positive';

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

const DIMENSION_ORDER = [
  'verification',
  'performance',
  'consistency',
  'security',
  'compliance',
  'community',
  'commitment',
  'transparency',
  'tenure',
];

function DimensionBar({ name, dim }: { name: string; dim: DimensionScore }) {
  const pct = Math.round((dim.value / 1000) * 100);
  const label = name.charAt(0).toUpperCase() + name.slice(1);
  return (
    <Inline css={{ gap: 'small' }}>
      <Box css={{ color: 'secondary', width: 'fill', maxWidth: '120px' as any, fontSize: '12px' as any }}>
        {label}
      </Box>
      <Box css={{ width: 'fill', maxWidth: '140px' as any }}>
        <Box css={{
          background: 'container',
          height: '8px' as any,
        }}>
          <Box css={{
            background: 'container',
            height: '8px' as any,
            width: `${pct}%` as any,
          }} />
        </Box>
      </Box>
      <Box css={{ fontSize: '12px' as any, minWidth: '40px' as any }}>{dim.value}</Box>
    </Inline>
  );
}

const PaymentTrustView = ({ environment }: ExtensionContextValue) => {
  const [score, setScore] = useState<TrustScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrust = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const objectContext = (environment as any)?.objectContext;
      const metadata = objectContext?.metadata;
      const agentId = metadata?.vouch_agent_id;

      if (!agentId) {
        setScore(null);
        setLoading(false);
        return;
      }

      const result = await fetchTrustScoreByAgent(agentId);
      setScore(result);
    } catch {
      setError('Failed to load trust score');
    } finally {
      setLoading(false);
    }
  }, [environment]);

  useEffect(() => { loadTrust(); }, [loadTrust]);

  if (loading) {
    return (
      <ContextView title="Vouch Trust Score">
        <Box css={{ padding: 'medium' }}>
          <Box css={{ color: 'secondary' }}>Checking agent trust...</Box>
        </Box>
      </ContextView>
    );
  }

  if (error) {
    return (
      <ContextView title="Vouch Trust Score">
        <Notice type="negative">
          <Box>{error}</Box>
        </Notice>
      </ContextView>
    );
  }

  if (!score || score.composite === null) {
    return (
      <ContextView title="Vouch Trust Score">
        <Box css={{ layout: 'column', gap: 'medium' }}>
          <Notice type="attention">
            <Box>This payment was not initiated by a Vouch-scored agent, or no agent ID was found in the payment metadata.</Box>
          </Notice>
          <Box css={{ color: 'secondary', fontSize: '12px' as any }}>
            To enable trust scoring, add vouch_agent_id to the PaymentIntent metadata.
          </Box>
          <Link href="https://vouch.percival-labs.ai" type="secondary">
            Register an agent on Vouch
          </Link>
        </Box>
      </ContextView>
    );
  }

  const tierBadge = TIER_BADGE[score.tier] ?? 'neutral';
  const trendArrow = score.trend ? TREND_ARROW[score.trend.direction] || '' : '';
  const delta30d = score.trend?.delta_30d ?? 0;

  return (
    <ContextView title="Vouch Trust Score">
      <Box css={{ layout: 'column', gap: 'medium' }}>
        {/* Score Header */}
        <Inline css={{ gap: 'small' }}>
          <Box css={{ fontWeight: 'bold', fontSize: '28px' as any }}>{score.composite}</Box>
          <Box css={{ color: 'secondary', fontSize: '16px' as any }}>/1000</Box>
          <Badge type={tierBadge}>{score.tier.toUpperCase()}</Badge>
        </Inline>

        {/* Confidence and Domain */}
        <Inline css={{ gap: 'large' }}>
          <Box css={{ color: 'secondary', fontSize: '12px' as any }}>
            Confidence: {(score.confidence * 100).toFixed(0)}%
          </Box>
          <Box css={{ color: 'secondary', fontSize: '12px' as any }}>
            Domain: {score.domain}
          </Box>
        </Inline>

        {/* Trend */}
        {score.trend && (
          <Inline css={{ gap: 'small' }}>
            <Box css={{ fontSize: '14px' as any }}>
              {trendArrow} {delta30d >= 0 ? '+' : ''}{delta30d} (30d)
            </Box>
          </Inline>
        )}

        <Divider />

        {/* Dimensions */}
        <Box css={{ fontWeight: 'semibold' }}>Dimensions</Box>
        {score.dimensions && (
          <Box css={{ layout: 'column', gap: 'xxsmall' }}>
            {DIMENSION_ORDER
              .filter(d => score.dimensions && d in score.dimensions)
              .map(dimName => (
                <DimensionBar
                  key={dimName}
                  name={dimName}
                  dim={score.dimensions![dimName]}
                />
              ))}
          </Box>
        )}

        <Divider />

        {/* Threshold Assessment */}
        <Box css={{ fontWeight: 'semibold' }}>Assessment</Box>
        {score.composite >= 400 ? (
          <Notice type="positive">
            <Box>Above threshold (400)</Box>
          </Notice>
        ) : (
          <Notice type="negative">
            <Box>Score {score.composite} is below the minimum threshold of 400. Review this transaction carefully.</Box>
          </Notice>
        )}

        {/* Validity */}
        <Box css={{ color: 'secondary', fontSize: '11px' as any }}>
          Score valid until {new Date(score.validity.expires_at).toLocaleString()}
        </Box>

        {/* Full Profile Link */}
        <Link href={`https://vouch.percival-labs.ai/agents/${score.agent_id}`} type="secondary">
          View full profile on Vouch
        </Link>
      </Box>
    </ContextView>
  );
};

export default PaymentTrustView;
