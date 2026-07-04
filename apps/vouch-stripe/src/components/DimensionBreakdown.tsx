/**
 * DimensionBreakdown — Shows each trust dimension as a horizontal bar display.
 */

import { Box, Inline } from '@stripe/ui-extension-sdk/ui';
import type { DimensionScore } from '../lib/vouch-client';

interface DimensionBreakdownProps {
  dimensions: Record<string, DimensionScore>;
  compact?: boolean;
}

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

function DimensionBar({ name, dim, compact }: { name: string; dim: DimensionScore; compact?: boolean }) {
  const pct = Math.round((dim.value / 1000) * 100);
  const label = name.charAt(0).toUpperCase() + name.slice(1);

  return (
    <Inline css={{ gap: 'small' }}>
      <Box css={{
        width: compact ? '75px' as any : '100px' as any,
        fontSize: compact ? '10px' as any : '12px' as any,
        color: 'secondary',
      }}>
        {label}
      </Box>
      <Box css={{ width: 'fill', maxWidth: compact ? '80px' as any : '140px' as any }}>
        <Box css={{
          background: 'container',
          height: compact ? '6px' as any : '8px' as any,
        }}>
          <Box css={{
            background: 'container',
            height: compact ? '6px' as any : '8px' as any,
            width: `${pct}%` as any,
          }} />
        </Box>
      </Box>
      <Box css={{
        fontSize: compact ? '10px' as any : '12px' as any,
        minWidth: compact ? '30px' as any : '40px' as any,
      }}>
        {dim.value}
      </Box>
      {!compact && (
        <Box css={{ fontSize: '10px' as any, color: 'secondary', minWidth: '30px' as any }}>
          ({(dim.confidence * 100).toFixed(0)}%)
        </Box>
      )}
    </Inline>
  );
}

export function DimensionBreakdown({ dimensions, compact }: DimensionBreakdownProps) {
  const orderedDimensions = DIMENSION_ORDER.filter(d => d in dimensions);

  if (orderedDimensions.length === 0) {
    return (
      <Box css={{ color: 'secondary', fontSize: '12px' as any }}>
        No dimensional data available.
      </Box>
    );
  }

  return (
    <Box css={{ layout: 'column', gap: 'xxsmall' }}>
      {orderedDimensions.map(dimName => (
        <DimensionBar
          key={dimName}
          name={dimName}
          dim={dimensions[dimName]}
          compact={compact}
        />
      ))}
    </Box>
  );
}
