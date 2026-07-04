/**
 * Layer 2: Card Trust Policy
 *
 * Trust-based spending recommendations for agent-held Issuing cards.
 * Appears on the card detail page in the Stripe Dashboard.
 */

import { Box, Inline, ContextView, Badge, Button, Notice, Divider } from '@stripe/ui-extension-sdk/ui';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { useEffect, useState, useCallback } from 'react';
import { fetchTrustScoreByAgent, recommendedSpendLimit, DEFAULT_POLICIES, type TrustScore } from '../lib/vouch-client';

type BadgeType = 'info' | 'neutral' | 'urgent' | 'warning' | 'negative' | 'positive';

const TIER_BADGE: Record<string, BadgeType> = {
  diamond: 'positive',
  gold: 'info',
  silver: 'neutral',
  bronze: 'warning',
  unranked: 'negative',
  unscored: 'negative',
};

const CardTrustPolicyView = ({ environment }: ExtensionContextValue) => {
  const [score, setScore] = useState<TrustScore | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTrust = useCallback(async () => {
    setLoading(true);
    // In production: GET /v1/issuing/cards/{id} -> metadata.agent_pubkey
    setLoading(false);
  }, [environment]);

  useEffect(() => { loadTrust(); }, [loadTrust]);

  if (loading) {
    return (
      <ContextView title="Card Trust Policy">
        <Box css={{ color: 'secondary' }}>Loading trust data...</Box>
      </ContextView>
    );
  }

  if (!score || score.composite === null) {
    return (
      <ContextView title="Card Trust Policy">
        <Notice type="attention">
          <Box>Add agent_pubkey to this card's metadata to enable trust-based spending limits.</Box>
        </Notice>
      </ContextView>
    );
  }

  const recommendation = recommendedSpendLimit(score);
  const tierBadge = TIER_BADGE[score.tier] ?? 'neutral';

  return (
    <ContextView title="Card Trust Policy">
      <Box css={{ layout: 'column', gap: 'medium' }}>
        {/* Score */}
        <Inline css={{ gap: 'small' }}>
          <Box css={{ fontWeight: 'bold', fontSize: '24px' as any }}>{score.composite}</Box>
          <Box css={{ color: 'secondary' }}>/1000</Box>
          <Badge type={tierBadge}>{score.tier.toUpperCase()}</Badge>
        </Inline>

        <Divider />

        {/* Recommendation */}
        <Box css={{ fontWeight: 'semibold' }}>Recommended Daily Limit</Box>
        <Box css={{ fontWeight: 'bold', fontSize: '24px' as any }}>
          ${recommendation.limit.toLocaleString()}
        </Box>
        <Box css={{ color: 'secondary', fontSize: '12px' as any }}>{recommendation.reason}</Box>

        <Divider />

        {/* Policy Tiers */}
        <Box css={{ fontWeight: 'semibold' }}>Policy Tiers</Box>
        <Box css={{ layout: 'column', gap: 'xxsmall' }}>
          {Object.entries(DEFAULT_POLICIES).map(([tier, policy]) => (
            <Inline key={tier} css={{ gap: 'large' }}>
              <Box css={{ fontSize: '12px' as any }}>
                {tier.charAt(0).toUpperCase() + tier.slice(1)} ({policy.minScore}+)
              </Box>
              <Box css={{ fontSize: '12px' as any }}>
                ${policy.maxSpendPerDay.toLocaleString()}/day
              </Box>
            </Inline>
          ))}
        </Box>

        {/* Apply */}
        <Button
          type="primary"
          onPress={() => {
            console.log('Apply limit:', recommendation.limit);
          }}
        >
          Apply ${recommendation.limit}/day Limit
        </Button>

        {score.composite !== null && score.composite < 200 && (
          <Notice type="attention">
            <Box>Consider revoking this card. Trust score is too low for active spending.</Box>
          </Notice>
        )}
      </Box>
    </ContextView>
  );
};

export default CardTrustPolicyView;
