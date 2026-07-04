// GDELT DOC API client for geopolitical event monitoring
// Free, no API key required

import type { GeoEvent } from '../lib/types';

const GDELT_DOC_API = 'https://api.gdeltproject.org/api/v2/doc/doc';

// Keywords mapped to our macro thesis
const WATCH_QUERIES = [
  'Iran strait hormuz oil',
  'helium semiconductor supply',
  'uranium nuclear energy',
  'TSMC semiconductor Arizona',
  'copper mining supply',
  'NATO defense spending',
  'petrodollar yuan oil',
  'tariff trade war',
  'bitcoin reserve',
  'energy crisis LNG',
] as const;

interface GdeltArticle {
  url: string;
  title: string;
  seendate: string;
  domain: string;
  language: string;
  sourcecountry: string;
  tone: number;
}

export async function fetchGeoEvents(hours: number = 24): Promise<GeoEvent[]> {
  const events: GeoEvent[] = [];

  // Run queries in parallel, take top results from each
  const results = await Promise.allSettled(
    WATCH_QUERIES.map(async (query) => {
      const params = new URLSearchParams({
        query,
        mode: 'ArtList',
        maxrecords: '5',
        format: 'json',
        timespan: `${hours}h`,
        sort: 'ToneDesc',
      });

      const res = await fetch(`${GDELT_DOC_API}?${params}`);
      if (!res.ok) return [];

      const data = await res.json() as { articles?: GdeltArticle[] };
      return (data.articles ?? []).map((a): GeoEvent => ({
        type: classifyQuery(query),
        headline: a.title,
        region: a.sourcecountry || 'unknown',
        severity: toneSeverity(a.tone),
        source: a.domain,
        timestamp: a.seendate,
      }));
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      events.push(...result.value);
    }
  }

  // Deduplicate by headline similarity
  return deduplicateEvents(events);
}

function classifyQuery(query: string): string {
  if (query.includes('Iran') || query.includes('strait')) return 'ENERGY_DISRUPTION';
  if (query.includes('helium') || query.includes('semiconductor') || query.includes('TSMC')) return 'SUPPLY_CHAIN_SHOCK';
  if (query.includes('uranium') || query.includes('nuclear')) return 'ENERGY_TRANSITION';
  if (query.includes('copper')) return 'COMMODITY_SUPPLY';
  if (query.includes('NATO') || query.includes('defense')) return 'MILITARY_SPENDING';
  if (query.includes('petrodollar') || query.includes('yuan')) return 'CURRENCY_SHIFT';
  if (query.includes('tariff')) return 'TRADE_SANCTIONS';
  if (query.includes('bitcoin')) return 'CRYPTO_POLICY';
  if (query.includes('LNG') || query.includes('energy crisis')) return 'ENERGY_DISRUPTION';
  return 'GEOPOLITICAL';
}

function toneSeverity(tone: number): number {
  // GDELT tone: negative = alarming, positive = reassuring
  // Scale to 1-5 severity
  if (tone < -5) return 5;
  if (tone < -3) return 4;
  if (tone < -1) return 3;
  if (tone < 1) return 2;
  return 1;
}

function deduplicateEvents(events: GeoEvent[]): GeoEvent[] {
  const seen = new Set<string>();
  return events.filter(e => {
    // Simple dedup on first 50 chars of headline
    const key = e.headline.slice(0, 50).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
