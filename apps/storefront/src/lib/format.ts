// Formatting helpers for prices, dates, and display values

const BTC_USD_FALLBACK = 85000; // rough fallback, updated by live rate

export function formatSats(sats: number): string {
  return sats.toLocaleString() + ' sats';
}

export function satsToUsdApprox(sats: number, btcPrice = BTC_USD_FALLBACK): string {
  const usd = (sats / 100_000_000) * btcPrice;
  if (usd < 0.01) return '<$0.01';
  return '$' + usd.toFixed(2);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '\u2026';
}
