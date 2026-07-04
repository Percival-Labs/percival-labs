/**
 * CustomerAgentView — Shows linked agent identity and aggregate trust data.
 * Displayed on the customer detail page in the Stripe Dashboard.
 * Per architecture doc Section 8.2.
 */

import { Box, Inline, ContextView, Badge, Button, Notice, Divider } from '@stripe/ui-extension-sdk/ui';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { useEffect, useState, useCallback } from 'react';
import { fetchTrustScore, type TrustScore } from '../lib/vouch-client';

type BadgeType = 'info' | 'neutral' | 'urgent' | 'warning' | 'negative' | 'positive';

const TIER_BADGE: Record<string, BadgeType> = {
  diamond: 'positive',
  gold: 'info',
  silver: 'neutral',
  bronze: 'warning',
  unranked: 'negative',
  unscored: 'negative',
};

const CustomerAgentView = ({ environment }: ExtensionContextValue) => {
  const [score, setScore] = useState<TrustScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [linked, setLinked] = useState(false);

  const loadAgent = useCallback(async () => {
    setLoading(true);
    try {
      const objectContext = (environment as any)?.objectContext;
      const customerId = objectContext?.id;
      const stripeAccountId = (environment as any)?.constants?.STRIPE_ACCOUNT_ID || 'acct_default';

      if (!customerId) {
        setLoading(false);
        return;
      }

      const result = await fetchTrustScore(customerId, stripeAccountId);
      if (result) {
        setScore(result);
        setLinked(true);
      }
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, [environment]);

  useEffect(() => { loadAgent(); }, [loadAgent]);

  if (loading) {
    return (
      <ContextView title="Linked Agent">
        <Box css={{ padding: 'medium' }}>
          <Box css={{ color: 'secondary' }}>Loading agent data...</Box>
        </Box>
      </ContextView>
    );
  }

  if (!linked || !score) {
    return (
      <ContextView title="Linked Agent">
        <Box css={{ layout: 'column', gap: 'medium' }}>
          <Notice type="attention">
            <Box>This customer is not linked to a Vouch agent identity.</Box>
          </Notice>
          <Box css={{ color: 'secondary', fontSize: '12px' as any }}>
            Link an agent in the Vouch Settings page to enable trust scoring for this customer.
          </Box>
        </Box>
      </ContextView>
    );
  }

  const tierBadge = TIER_BADGE[score.tier] ?? 'neutral';

  return (
    <ContextView title="Linked Agent">
      <Box css={{ layout: 'column', gap: 'medium' }}>
        {/* Agent Identity */}
        <Box css={{ fontSize: '12px' as any, color: 'secondary' }}>
          ID: {score.agent_id.length > 30
            ? `${score.agent_id.slice(0, 15)}...${score.agent_id.slice(-10)}`
            : score.agent_id}
        </Box>

        {/* Score */}
        <Inline css={{ gap: 'small' }}>
          <Badge type={tierBadge}>{score.tier.toUpperCase()}</Badge>
          <Box css={{ fontWeight: 'bold', fontSize: '20px' as any }}>
            {score.composite !== null ? `${score.composite} / 1000` : 'Unscored'}
          </Box>
        </Inline>

        <Divider />

        {/* Transaction Summary */}
        <Box css={{ fontWeight: 'semibold' }}>Transaction History</Box>
        <Box css={{ layout: 'column', gap: 'xsmall' }}>
          <Inline css={{ gap: 'large' }}>
            <Box css={{ color: 'secondary', fontSize: '12px' as any }}>Confidence</Box>
            <Box css={{ fontSize: '12px' as any }}>{(score.confidence * 100).toFixed(0)}%</Box>
          </Inline>
          <Inline css={{ gap: 'large' }}>
            <Box css={{ color: 'secondary', fontSize: '12px' as any }}>Domain</Box>
            <Box css={{ fontSize: '12px' as any }}>{score.domain}</Box>
          </Inline>
        </Box>

        <Divider />

        {/* Actions */}
        <Button
          type="destructive"
          onPress={() => {
            console.log('Unlink agent');
          }}
        >
          Unlink Agent
        </Button>
      </Box>
    </ContextView>
  );
};

export default CustomerAgentView;
