/**
 * Hyperliquid data fetcher for the worker service.
 *
 * Uses HL REST API directly (no SDK dependency needed for read-only queries).
 * This avoids importing the web app's SDK which has Next.js-specific code.
 */

const HL_API = process.env.NEXT_PUBLIC_HL_TESTNET === 'true'
  ? 'https://api.hyperliquid-testnet.xyz'
  : 'https://api.hyperliquid.xyz';

interface HLMidPrices {
  [coin: string]: string;
}

interface HLCandle {
  t: number;  // open time
  T: number;  // close time
  s: string;  // coin
  i: string;  // interval
  o: string;  // open
  c: string;  // close
  h: string;  // high
  l: string;  // low
  v: string;  // volume
  n: number;  // num trades
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Fetch all mid prices from Hyperliquid */
export async function fetchAllMids(): Promise<HLMidPrices> {
  const res = await fetch(`${HL_API}/info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'allMids' }),
  });

  if (!res.ok) throw new Error(`HL allMids failed: ${res.status}`);
  return res.json() as Promise<HLMidPrices>;
}

/** Fetch mid price for a single coin */
export async function fetchMidPrice(coin: string): Promise<number> {
  const mids = await fetchAllMids();
  const mid = mids[coin];
  if (!mid) throw new Error(`No mid price for ${coin}`);
  return Number(mid);
}

/** Fetch candles from Hyperliquid */
export async function fetchCandles(
  coin: string,
  interval: string,
  limit = 100,
): Promise<Candle[]> {
  const now = Date.now();
  const intervalMs = getIntervalMs(interval);
  const startTime = now - intervalMs * limit;

  const res = await fetch(`${HL_API}/info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'candleSnapshot',
      req: { coin, interval, startTime, endTime: now },
    }),
  });

  if (!res.ok) throw new Error(`HL candles failed: ${res.status}`);
  const raw = await res.json() as HLCandle[];

  return raw.slice(-limit).map((c) => ({
    time: c.t,
    open: Number(c.o),
    high: Number(c.h),
    low: Number(c.l),
    close: Number(c.c),
    volume: Number(c.v),
  }));
}

function getIntervalMs(interval: string): number {
  switch (interval) {
    case '1m': return 60_000;
    case '5m': return 300_000;
    case '15m': return 900_000;
    case '1h': return 3_600_000;
    case '4h': return 14_400_000;
    case '1d': return 86_400_000;
    default: return 3_600_000;
  }
}
