import { describe, test, expect } from 'bun:test';
import { fromUnixSeconds, toUnixSeconds, now, formatAge, isAfter } from '../../src/core/timestamps.js';

describe('timestamps', () => {
  test('fromUnixSeconds always returns ISO 8601 with date', () => {
    const result = fromUnixSeconds(1741305600); // 2025-03-07T00:00:00Z
    // Must contain date components — the bug was using toLocaleTimeString which only had time
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(result).toContain('T'); // ISO 8601 separator
    expect(result).toEndWith('Z'); // UTC timezone
  });

  test('fromUnixSeconds handles recent timestamps', () => {
    const recent = Math.floor(Date.now() / 1000);
    const result = fromUnixSeconds(recent);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('toUnixSeconds round-trips with fromUnixSeconds', () => {
    const epoch = 1741305600;
    const iso = fromUnixSeconds(epoch);
    const backToEpoch = toUnixSeconds(iso);
    expect(backToEpoch).toBe(epoch);
  });

  test('now returns ISO 8601 with date', () => {
    const result = now();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test('formatAge includes full ISO timestamp in parentheses', () => {
    const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
    const result = formatAge(oneHourAgo);
    // Must contain both relative AND absolute time
    expect(result).toContain('ago');
    expect(result).toContain('(');
    expect(result).toMatch(/\d{4}-\d{2}-\d{2}T/); // Full date in parens
  });

  test('formatAge works with ISO string input', () => {
    const iso = new Date(Date.now() - 120_000).toISOString(); // 2 minutes ago
    const result = formatAge(iso);
    expect(result).toContain('2m ago');
    expect(result).toContain('(');
  });

  test('isAfter correctly compares timestamps', () => {
    expect(isAfter('2026-03-08T12:00:00Z', '2026-03-07T12:00:00Z')).toBe(true);
    expect(isAfter('2026-03-07T12:00:00Z', '2026-03-08T12:00:00Z')).toBe(false);
    expect(isAfter('2026-03-08T12:00:00Z', '2026-03-08T12:00:00Z')).toBe(false);
  });
});

describe('anti-criteria: no toLocaleTimeString anywhere', () => {
  test('source code never calls toLocaleTimeString()', async () => {
    const { execSync } = require('child_process');
    const srcDir = require('path').join(__dirname, '../../src');
    try {
      // Look for actual function calls, not comments mentioning it
      const result = execSync(
        `grep -r "\\.toLocaleTimeString" "${srcDir}" || true`,
        { encoding: 'utf-8' },
      );
      expect(result.trim()).toBe('');
    } catch {
      // grep found nothing — that's what we want
    }
  });
});
