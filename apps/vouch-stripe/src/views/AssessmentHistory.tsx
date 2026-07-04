/**
 * AssessmentHistory — Table of recent trust assessments with pass/fail status.
 */

import { Box, Inline, ContextView, Badge, Divider, Button, Link } from '@stripe/ui-extension-sdk/ui';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { useEffect, useState, useCallback } from 'react';
import { fetchAssessmentHistory, type AssessmentHistoryItem } from '../lib/vouch-client';

type BadgeType = 'info' | 'neutral' | 'urgent' | 'warning' | 'negative' | 'positive';

const STATUS_BADGE: Record<string, BadgeType> = {
  proceed: 'positive',
  review: 'warning',
  block: 'negative',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(cents: number | null, currency: string | null): string {
  if (cents === null) return '-';
  const amount = cents / 100;
  const symbol = currency === 'usd' ? '$' : currency?.toUpperCase() || '';
  return `${symbol}${amount.toFixed(2)}`;
}

const AssessmentHistory = ({ environment }: ExtensionContextValue) => {
  const [assessments, setAssessments] = useState<AssessmentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const loadAssessments = useCallback(async () => {
    setLoading(true);
    try {
      const stripeAccountId = (environment as any)?.constants?.STRIPE_ACCOUNT_ID || 'acct_default';
      const result = await fetchAssessmentHistory(stripeAccountId, pageSize, page * pageSize);
      setAssessments(result);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, [environment, page]);

  useEffect(() => { loadAssessments(); }, [loadAssessments]);

  if (loading) {
    return (
      <ContextView title="Assessment History">
        <Box css={{ padding: 'medium' }}>
          <Box css={{ color: 'secondary' }}>Loading assessments...</Box>
        </Box>
      </ContextView>
    );
  }

  if (assessments.length === 0) {
    return (
      <ContextView title="Assessment History">
        <Box css={{ layout: 'column', gap: 'medium' }}>
          <Box css={{ color: 'secondary' }}>
            No assessments recorded yet. Assessments are created when the Bridge API is called for pre-transaction trust checks.
          </Box>
          <Link href="https://percival-labs.ai/vouch/docs/stripe" type="secondary">
            Integration guide
          </Link>
        </Box>
      </ContextView>
    );
  }

  return (
    <ContextView title="Assessment History">
      <Box css={{ layout: 'column', gap: 'small' }}>
        {/* Header */}
        <Inline css={{ gap: 'small' }}>
          <Box css={{ width: '80px' as any, fontSize: '11px' as any, fontWeight: 'semibold', color: 'secondary' }}>
            Date
          </Box>
          <Box css={{ width: '60px' as any, fontSize: '11px' as any, fontWeight: 'semibold', color: 'secondary' }}>
            Score
          </Box>
          <Box css={{ width: '60px' as any, fontSize: '11px' as any, fontWeight: 'semibold', color: 'secondary' }}>
            Amount
          </Box>
          <Box css={{ width: 'fill', fontSize: '11px' as any, fontWeight: 'semibold', color: 'secondary' }}>
            Status
          </Box>
        </Inline>

        <Divider />

        {/* Rows */}
        {assessments.map((a) => {
          const statusBadge = STATUS_BADGE[a.recommendation] ?? 'neutral';

          return (
            <Inline key={a.assessment_id} css={{ gap: 'small' }}>
              <Box css={{ width: '80px' as any, fontSize: '11px' as any, color: 'secondary' }}>
                {formatDate(a.assessed_at)}
              </Box>
              <Box css={{ width: '60px' as any, fontSize: '11px' as any }}>
                {a.score !== null ? a.score : '-'}
              </Box>
              <Box css={{ width: '60px' as any, fontSize: '11px' as any }}>
                {formatCurrency(a.amount_cents, a.currency)}
              </Box>
              <Box css={{ width: 'fill' }}>
                <Badge type={statusBadge}>
                  {a.threshold_met ? 'PASS' : 'FAIL'}
                </Badge>
              </Box>
            </Inline>
          );
        })}

        <Divider />

        {/* Pagination */}
        <Inline css={{ gap: 'small' }}>
          <Button
            type="secondary"
            disabled={page === 0}
            onPress={() => setPage(p => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <Button
            type="secondary"
            disabled={assessments.length < pageSize}
            onPress={() => setPage(p => p + 1)}
          >
            Next
          </Button>
          <Box css={{ color: 'secondary', fontSize: '11px' as any }}>
            Page {page + 1}
          </Box>
        </Inline>
      </Box>
    </ContextView>
  );
};

export default AssessmentHistory;
