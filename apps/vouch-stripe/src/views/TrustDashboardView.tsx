/**
 * TrustDashboardView — Home overview showing Vouch trust layers and quick stats.
 */

import { Box, Inline, ContextView, Notice, Divider, Link } from '@stripe/ui-extension-sdk/ui';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { useEffect, useState, useCallback } from 'react';
import { fetchAnalytics, type AnalyticsReport } from '../lib/vouch-client';

const TrustDashboardView = ({ environment }: ExtensionContextValue) => {
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const stripeAccountId = (environment as any)?.constants?.STRIPE_ACCOUNT_ID || 'acct_default';
      const result = await fetchAnalytics(stripeAccountId);
      setReport(result);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, [environment]);

  useEffect(() => { loadReport(); }, [loadReport]);

  return (
    <ContextView title="Vouch Trust Dashboard">
      <Box css={{ layout: 'column', gap: 'medium' }}>
        <Notice type="neutral">
          <Box>Vouch monitors agent-initiated transactions and provides MCP-T trust scoring.</Box>
        </Notice>

        {/* Stats */}
        {loading ? (
          <Box css={{ color: 'secondary' }}>Loading analytics...</Box>
        ) : report ? (
          <Box css={{ layout: 'column', gap: 'xsmall' }}>
            <Inline css={{ gap: 'large' }}>
              <Box css={{ color: 'secondary', fontSize: '12px' as any }}>Agent Transactions</Box>
              <Box css={{ fontWeight: 'semibold' }}>{report.total_agent_transactions}</Box>
            </Inline>
            <Inline css={{ gap: 'large' }}>
              <Box css={{ color: 'secondary', fontSize: '12px' as any }}>Disputes</Box>
              <Box css={{ fontWeight: 'semibold' }}>{report.total_disputes}</Box>
            </Inline>
            <Inline css={{ gap: 'large' }}>
              <Box css={{ color: 'secondary', fontSize: '12px' as any }}>Dispute Rate</Box>
              <Box css={{ fontWeight: 'semibold' }}>{(report.overall_dispute_rate * 100).toFixed(1)}%</Box>
            </Inline>
          </Box>
        ) : (
          <Box css={{ color: 'secondary', fontSize: '12px' as any }}>
            No data yet. Link agents and process transactions to see analytics.
          </Box>
        )}

        <Divider />

        {/* Links */}
        <Link href="https://github.com/Percival-Labs/mcp-t" type="secondary">
          MCP-T Open Standard
        </Link>
        <Link href="https://percival-labs.ai/vouch" type="secondary">
          Vouch Protocol Documentation
        </Link>
      </Box>
    </ContextView>
  );
};

export default TrustDashboardView;
