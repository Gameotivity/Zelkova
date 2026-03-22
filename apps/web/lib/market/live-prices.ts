import { z } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TickerData {
  symbol: string;
  lastPrice: number;
  priceChange: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
  openPrice: number;
  weightedAvgPrice: number;
  bidPrice: number;
  askPrice: number;
  openTime: number;
  closeTime: number;
}

export interface CandleData {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteVolume: number;
  trades: number;
}

export interface OrderBookEntry {
  price: number;
  quantity: number;
}

export interface OrderBookData {
  lastUpdateId: number;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

export interface LivePriceError {
  code: "FETCH_ERROR" | "PARSE_ERROR" | "VALIDATION_ERROR";
  message: string;
}

export type LivePriceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: LivePriceError };

// ---------------------------------------------------------------------------
// Constants — multiple API sources for reliability
// ---------------------------------------------------------------------------

const API_SOURCES = [
  "https://api.binance.us/api/v3",
  "https://api1.binance.com/api/v3",
  "https://api3.binance.com/api/v3",
  "https://api.binance.com/api/v3",
] as const;

const MAJOR_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT",
  "XRPUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT",
] as const;

export type MajorSymbol = (typeof MAJOR_SYMBOLS)[number];

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const binanceTickerSchema = z.object({
  symbol: z.string(),
  lastPrice: z.string(),
  priceChange: z.string(),
  priceChangePercent: z.string(),
  highPrice: z.string(),
  lowPrice: z.string(),
  volume: z.string(),
  quoteVolume: z.string(),
  openPrice: z.string(),
  weightedAvgPrice: z.string(),
  bidPrice: z.string(),
  askPrice: z.string(),
  openTime: z.number(),
  closeTime: z.number(),
});

const binanceTickerArraySchema = z.array(binanceTickerSchema);

const binanceKlineSchema = z.tuple([
  z.number(), z.string(), z.string(), z.string(), z.string(), z.string(),
  z.number(), z.string(), z.number(), z.string(), z.string(), z.string(),
]);

const binanceKlineArraySchema = z.array(binanceKlineSchema);

const binanceDepthSchema = z.object({
  lastUpdateId: z.number(),
  bids: z.array(z.tuple([z.string(), z.string()])),
  asks: z.array(z.tuple([z.string(), z.string()])),
});

// ---------------------------------------------------------------------------
// Input validation schemas (exported for route handler use)
// ---------------------------------------------------------------------------

export const candleQuerySchema = z.object({
  pair: z.string().min(1).max(20),
  interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("1h"),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
});

export const depthQuerySchema = z.object({
  pair: z.string().min(1).max(20),
  limit: z.coerce.number().int().min(5).max(5000).default(20),
});

export const tickerQuerySchema = z.object({
  pair: z.string().min(1).max(20).optional(),
});

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 10_000;
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ---------------------------------------------------------------------------
// Fetch with fallback across multiple sources
// ---------------------------------------------------------------------------

async function fetchWithFallback(
  endpoint: string,
  params?: Record<string, string>
): Promise<LivePriceResult<unknown>> {
  const errors: string[] = [];

  for (const base of API_SOURCES) {
    const url = new URL(`${base}${endpoint}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    try {
      const res = await fetch(url.toString(), {
        next: { revalidate: 10 },
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const json: unknown = await res.json();
        return { ok: true, data: json };
      }
      errors.push(`${base}: HTTP ${res.status}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown";
      errors.push(`${base}: ${msg}`);
    }
  }

  // All sources failed — try CoinGecko as last resort for tickers
  if (endpoint === "/ticker/24hr") {
    const cgResult = await fetchFromCoinGecko();
    if (cgResult) return { ok: true, data: cgResult };
  }

  return {
    ok: false,
    error: {
      code: "FETCH_ERROR",
      message: `All sources failed: ${errors.join("; ")}`,
    },
  };
}

// ---------------------------------------------------------------------------
// CoinGecko fallback for tickers
// ---------------------------------------------------------------------------

const CG_ID_MAP: Record<string, string> = {
  BTCUSDT: "bitcoin", ETHUSDT: "ethereum", SOLUSDT: "solana",
  BNBUSDT: "binancecoin", XRPUSDT: "ripple", ADAUSDT: "cardano",
  DOGEUSDT: "dogecoin", AVAXUSDT: "avalanche-2",
};

async function fetchFromCoinGecko(): Promise<unknown[] | null> {
  try {
    const ids = Object.values(CG_ID_MAP).join(",");
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&sparkline=false&price_change_percentage=24h`,
      { next: { revalidate: 30 }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const idToSymbol = Object.fromEntries(
      Object.entries(CG_ID_MAP).map(([sym, id]) => [id, sym])
    );

    interface CoinGeckoMarket {
      id: string;
      current_price: number;
      price_change_24h: number;
      price_change_percentage_24h: number;
      high_24h: number;
      low_24h: number;
      total_volume: number;
      market_cap: number;
    }

    return (data as CoinGeckoMarket[]).map((coin) => ({
      symbol: idToSymbol[coin.id] || coin.id.toUpperCase(),
      lastPrice: String(coin.current_price),
      priceChange: String(coin.price_change_24h || 0),
      priceChangePercent: String(coin.price_change_percentage_24h || 0),
      highPrice: String(coin.high_24h || coin.current_price),
      lowPrice: String(coin.low_24h || coin.current_price),
      volume: String(coin.total_volume || 0),
      quoteVolume: String(coin.market_cap || 0),
      openPrice: String(coin.current_price - (coin.price_change_24h || 0)),
      weightedAvgPrice: String(coin.current_price),
      bidPrice: String(coin.current_price),
      askPrice: String(coin.current_price),
      openTime: Date.now() - 86400000,
      closeTime: Date.now(),
    }));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Transform helpers
// ---------------------------------------------------------------------------

function parseTicker(
  raw: z.infer<typeof binanceTickerSchema>
): TickerData {
  return {
    symbol: raw.symbol,
    lastPrice: parseFloat(raw.lastPrice),
    priceChange: parseFloat(raw.priceChange),
    priceChangePercent: parseFloat(raw.priceChangePercent),
    highPrice: parseFloat(raw.highPrice),
    lowPrice: parseFloat(raw.lowPrice),
    volume: parseFloat(raw.volume),
    quoteVolume: parseFloat(raw.quoteVolume),
    openPrice: parseFloat(raw.openPrice),
    weightedAvgPrice: parseFloat(raw.weightedAvgPrice),
    bidPrice: parseFloat(raw.bidPrice),
    askPrice: parseFloat(raw.askPrice),
    openTime: raw.openTime,
    closeTime: raw.closeTime,
  };
}

function parseCandle(
  raw: z.infer<typeof binanceKlineSchema>
): CandleData {
  return {
    openTime: raw[0],
    open: parseFloat(raw[1]),
    high: parseFloat(raw[2]),
    low: parseFloat(raw[3]),
    close: parseFloat(raw[4]),
    volume: parseFloat(raw[5]),
    closeTime: raw[6],
    quoteVolume: parseFloat(raw[7]),
    trades: raw[8],
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchMajorTickers(): Promise<
  LivePriceResult<TickerData[]>
> {
  const cacheKey = "tickers:major";
  const cached = getCached<TickerData[]>(cacheKey);
  if (cached) return { ok: true, data: cached };

  const symbols = JSON.stringify(MAJOR_SYMBOLS);
  const result = await fetchWithFallback("/ticker/24hr", { symbols });
  if (!result.ok) return result;

  const parsed = binanceTickerArraySchema.safeParse(result.data);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "PARSE_ERROR",
        message: `Ticker validation failed: ${parsed.error.message}`,
      },
    };
  }

  const tickers = parsed.data.map(parseTicker);
  setCache(cacheKey, tickers);
  return { ok: true, data: tickers };
}

export async function fetchTicker(
  symbol: string
): Promise<LivePriceResult<TickerData>> {
  const upper = symbol.toUpperCase();
  const cacheKey = `ticker:${upper}`;
  const cached = getCached<TickerData>(cacheKey);
  if (cached) return { ok: true, data: cached };

  const result = await fetchWithFallback("/ticker/24hr", { symbol: upper });
  if (!result.ok) return result;

  const parsed = binanceTickerSchema.safeParse(result.data);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "PARSE_ERROR",
        message: `Ticker validation failed: ${parsed.error.message}`,
      },
    };
  }

  const ticker = parseTicker(parsed.data);
  setCache(cacheKey, ticker);
  return { ok: true, data: ticker };
}

export async function fetchLiveCandles(
  symbol: string,
  interval: string,
  limit: number
): Promise<LivePriceResult<CandleData[]>> {
  const upper = symbol.toUpperCase();
  const cacheKey = `candles:${upper}:${interval}:${limit}`;
  const cached = getCached<CandleData[]>(cacheKey);
  if (cached) return { ok: true, data: cached };

  const result = await fetchWithFallback("/klines", {
    symbol: upper,
    interval,
    limit: String(limit),
  });
  if (!result.ok) return result;

  const parsed = binanceKlineArraySchema.safeParse(result.data);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "PARSE_ERROR",
        message: `Kline validation failed: ${parsed.error.message}`,
      },
    };
  }

  const candles = parsed.data.map(parseCandle);
  setCache(cacheKey, candles);
  return { ok: true, data: candles };
}

export async function fetchOrderBook(
  symbol: string,
  limit: number
): Promise<LivePriceResult<OrderBookData>> {
  const upper = symbol.toUpperCase();
  const cacheKey = `depth:${upper}:${limit}`;
  const cached = getCached<OrderBookData>(cacheKey);
  if (cached) return { ok: true, data: cached };

  const result = await fetchWithFallback("/depth", {
    symbol: upper,
    limit: String(limit),
  });
  if (!result.ok) return result;

  const parsed = binanceDepthSchema.safeParse(result.data);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "PARSE_ERROR",
        message: `Depth validation failed: ${parsed.error.message}`,
      },
    };
  }

  const book: OrderBookData = {
    lastUpdateId: parsed.data.lastUpdateId,
    bids: parsed.data.bids.map(([p, q]) => ({
      price: parseFloat(p),
      quantity: parseFloat(q),
    })),
    asks: parsed.data.asks.map(([p, q]) => ({
      price: parseFloat(p),
      quantity: parseFloat(q),
    })),
  };

  setCache(cacheKey, book);
  return { ok: true, data: book };
}
