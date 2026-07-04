/**
 * TrustOverviewDrawer — Lightweight summary visible on every dashboard page.
 * Shows linked agent count, assessment count, and dispute rate by trust band.
 * Per architecture doc Section 8.4.
 */

import { Box, Inline, ContextView, Divider, Link } from '@stripe/ui-extension-sdk/ui';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { useEffect, useState, useCallback } from 'react';
import { fetchAnalytics, fetchAssessmentHistory, type AnalyticsReport, type AssessmentHistoryItem } from '../lib/vouch-client';

function DisputeBar({ tier, rate, maxRate }: { tier: string; rate: number; maxRate: number }) {
  const pct = maxRate > 0 ? Math.round((rate / maxRate) * 100) : 0;

  return (
    <Inline css={{ gap: 'small' }}>
      <Box css={{ width: '70px' as any, fontSize: '12px' as any, color: 'secondary' }}>
        {tier}
      </Box>
      <Box css={{ width: 'fill', maxWidth: '120px' as any }}>
        <Box css={{
          background: 'container',
          height: '8px' as any,
        }}>
          <Box css={{
            background: 'container',
            height: '8px' as any,
            width: `${Math.max(pct, 2)}%` as any,
          }} />
        </Box>
      </Box>
      <Box css={{ fontSize: '12px' as any, minWidth: '45px' as any }}>
        {(rate * 100).toFixed(1)}%
      </Box>
    </Inline>
  );
}

const TrustOverviewDrawer = ({ environment }: ExtensionContextValue) => {
  const stripeAccountId = (environment as any)?.constants?.STRIPE_ACCOUNT_ID || 'acct_1TDWLI42J0XT4dfT';
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [recentAssessments, setRecentAssessments] = useState<AssessmentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsResult, assessmentsResult] = await Promise.all([
        fetchAnalytics(stripeAccountId),
        fetchAssessmentHistory(stripeAccountId, 5, 0),
      ]);
      setReport(analyticsResult);
      setRecentAssessments(assessmentsResult);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, [stripeAccountId]);

  useEffect(() => { loadReport(); }, [loadReport]);

  if (loading) {
    return (
      <ContextView title="Vouch Overview">
        <Box css={{ padding: 'medium' }}>
          <Box css={{ color: 'secondary' }}>Loading analytics...</Box>
        </Box>
      </ContextView>
    );
  }

  if (!report) {
    return (
      <ContextView title="Vouch Overview">
        <Box css={{ layout: 'column', gap: 'medium' }}>
          <Box css={{ color: 'secondary', fontSize: '12px' as any }}>
            No data yet. Start by linking agents and processing transactions.
          </Box>
          <Link href="https://percival-labs.ai/vouch" type="secondary">
            Get started with Vouch
          </Link>
        </Box>
      </ContextView>
    );
  }

  const maxRate = Math.max(...report.score_bands.map(b => b.dispute_rate), 0.01);

  return (
    <ContextView title="Vouch Overview">
      <Box css={{ layout: 'column', gap: 'medium' }}>
        {/* Summary Stats */}
        <Box css={{ layout: 'column', gap: 'xsmall' }}>
          <Inline css={{ gap: 'large' }}>
            <Box css={{ fontWeight: 'bold', fontSize: '20px' as any }}>
              {report.total_agent_transactions}
            </Box>
            <Box css={{ color: 'secondary' }}>Agent Transactions</Box>
          </Inline>
          <Inline css={{ gap: 'large' }}>
            <Box css={{ fontWeight: 'bold', fontSize: '20px' as any }}>
              {report.total_disputes}
            </Box>
            <Box css={{ color: 'secondary' }}>
              Disputes ({(report.overall_dispute_rate * 100).toFixed(1)}%)
            </Box>
          </Inline>
        </Box>

        <Divider />

        {/* Dispute Rate by Trust Band */}
        <Box css={{ fontWeight: 'semibold' }}>Dispute Rate by Trust Band</Box>
        <Box css={{ layout: 'column', gap: 'xxsmall' }}>
          {report.score_bands
            .slice()
            .reverse()
            .map(band => (
              <DisputeBar
                key={band.range}
                tier={band.tier.split('/')[0]}
                rate={band.dispute_rate}
                maxRate={maxRate}
              />
            ))}
        </Box>

        <Divider />

        {/* Insight */}
        <Box css={{ color: 'secondary', fontSize: '11px' as any }}>
          {report.insight}
        </Box>

        {/* Recent Assessments */}
        {recentAssessments.length > 0 && (
          <>
            <Divider />
            <Box css={{ fontWeight: 'semibold' }}>Recent Assessments</Box>
            <Box css={{ layout: 'column', gap: 'xxsmall' }}>
              {recentAssessments.map(a => (
                <Inline key={a.assessment_id} css={{ gap: 'small' }}>
                  <Box css={{ width: '60px' as any, fontSize: '11px' as any, color: 'secondary' }}>
                    {a.assessed_at ? new Date(a.assessed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                  </Box>
                  <Box css={{ width: '40px' as any, fontSize: '11px' as any }}>
                    {a.score ?? '-'}
                  </Box>
                  <Box css={{ width: 'fill', fontSize: '11px' as any, color: a.threshold_met ? 'info' : 'warning' as any }}>
                    {a.threshold_met ? 'PASS' : 'FAIL'}
                  </Box>
                </Inline>
              ))}
            </Box>
          </>
        )}
      </Box>
    </ContextView>
  );
};

export default TrustOverviewDrawer;
