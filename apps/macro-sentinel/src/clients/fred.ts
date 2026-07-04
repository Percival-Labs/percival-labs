import { config } from '../lib/config';

// FRED series IDs for macro indicators
const SERIES = {
  VIXCLS: 'CBOE Volatility Index',
  DGS10: '10-Year Treasury Yield',
  DTWEXBGS: 'Trade Weighted Dollar Index',
  DCOILWTICO: 'WTI Crude Oil',
  GOLDAMGBD228NLBM: 'Gold (London Fix)',
  T10YIE: '10-Year Breakeven Inflation',
  BAMLH0A0HYM2: 'High Yield OAS Spread',
  SOFR: 'Secured Overnight Financing Rate',
  ICSA: 'Initial Jobless Claims',
} as const;

type SeriesId = keyof typeof SERIES;

interface FredObservation {
  date: string;
  value: string;
}

export async function getLatestValue(seriesId: SeriesId): Promise<{ date: string; value: number } | null> {
  if (!config.fred.apiKey) {
    console.warn('FRED_API_KEY not set, skipping FRED data');
    return null;
  }

  const url = `${config.fred.baseUrl}/series/observations?series_id=${seriesId}&api_key=${config.fred.apiKey}&file_type=json&sort_order=desc&limit=1`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json() as { observations: FredObservation[] };
  const obs = data.observations?.[0];
  if (!obs || obs.value === '.') return null;

  return { date: obs.date, value: Number(obs.value) };
}

export async function getMacroSnapshot(): Promise<Record<string, { date: string; value: number } | null>> {
  const entries = await Promise.all(
    (Object.keys(SERIES) as SeriesId[]).map(async (id) => {
      const val = await getLatestValue(id);
      return [id, val] as const;
    })
  );
  return Object.fromEntries(entries);
}

export { SERIES };
